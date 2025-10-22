import { IdmlParser } from './IdmlParser.js';
import { WebhookService } from './WebhookService.js';
import { TranslationRequest, TranslationStatusResponse, TextBox, WebhookConfig } from '../types/index.js';
import { LanguageConfigManager } from '../config/languages.js';

export class TranslationService {
  private idmlParser: IdmlParser;
  private webhookService: WebhookService;

  constructor(webhookConfig: WebhookConfig) {
    this.idmlParser = new IdmlParser();
    this.webhookService = new WebhookService(webhookConfig);
  }

  /**
   * Submit IDML file for translation (sends to Google Doc workflow)
   */
  async submitIdmlForTranslation(
    idmlBuffer: Buffer,
    sourceLanguage: string,
    targetLanguage: string,
    filename: string,
    startIndex?: number,
    endIndex?: number
  ): Promise<{ textBoxCount: number; report: any; warnings: string[] }> {
    
    // Validate languages
    const warnings: string[] = [];
    
    if (!LanguageConfigManager.isLanguageSupported(sourceLanguage)) {
      warnings.push(`⚠️ Source language '${sourceLanguage}' is not in supported language list`);
    }
    
    if (!LanguageConfigManager.isLanguageSupported(targetLanguage)) {
      warnings.push(`⚠️ Target language '${targetLanguage}' is not in supported language list`);
    }
    
    const isTargetRTL = LanguageConfigManager.isRTLLanguage(targetLanguage);
    const expectedExpansion = LanguageConfigManager.getExpansionFactor(targetLanguage);
    
    if (isTargetRTL) {
      warnings.push(`ℹ️ Target language '${targetLanguage}' is RTL - text direction will be automatically set`);
    }
    
    if (expectedExpansion > 1.2) {
      warnings.push(`ℹ️ Expected text expansion: ${Math.round(expectedExpansion * 100)}% - check for potential overflow`);
    }
    
    // Parse the IDML file and extract text boxes
    await this.idmlParser.loadIdmlFile(idmlBuffer);
    const document = await this.idmlParser.parseDocument();
    
    if (document.textBoxes.length === 0) {
      throw new Error('No text boxes found in the IDML file');
    }

    // Filter text boxes by index range if specified
    let textBoxesToSubmit = document.textBoxes;
    if (startIndex !== undefined || endIndex !== undefined) {
      const start = startIndex ?? 0;
      const end = endIndex !== undefined ? endIndex + 1 : document.textBoxes.length;
      textBoxesToSubmit = document.textBoxes.slice(start, end);
      
      if (textBoxesToSubmit.length === 0) {
        throw new Error(`No text boxes found in range ${start} to ${endIndex ?? 'end'}`);
      }
      
      warnings.push(`ℹ️ Submitting ${textBoxesToSubmit.length} text boxes (indices ${start}-${end - 1}) out of ${document.textBoxes.length} total`);
    }

    // Prepare translation request
    const translationRequest: TranslationRequest = {
      id: filename, // Use filename as identifier
      textBoxes: textBoxesToSubmit,
      sourceLanguage,
      targetLanguage,
      metadata: {
        filename,
        documentMetadata: document.metadata
      }
    };

    // Submit for translation (goes to Google Doc)
    const submissionResponse = await this.webhookService.submitForTranslation(translationRequest);

    if (submissionResponse.status !== 'accepted') {
      throw new Error(`Translation submission failed: ${submissionResponse.error}`);
    }

    // Generate report
    const report = {
      originalTextBoxCount: document.textBoxes.length,
      submittedTextBoxCount: textBoxesToSubmit.length,
      sourceLanguage,
      targetLanguage,
      filename,
      submittedAt: new Date().toISOString(),
      ...(startIndex !== undefined && { startIndex }),
      ...(endIndex !== undefined && { endIndex })
    };

    return {
      textBoxCount: textBoxesToSubmit.length,
      report,
      warnings
    };
  }

  /**
   * Check if translation is ready from Google Doc
   * @param googleDocId - The Google Doc ID containing the translations
   * @param targetLanguage - The target language code
   */
  async checkTranslationStatus(googleDocId: string, targetLanguage: string): Promise<TranslationStatusResponse> {
    return await this.webhookService.checkTranslationStatus(googleDocId, targetLanguage);
  }

  /**
   * Get completed translation and create updated IDML file
   * Fetches translations from Google Doc via webhook
   * @param originalIdmlBuffer - The original IDML file buffer
   * @param googleDocId - The Google Doc ID containing the translations
   * @param targetLanguage - The target language code
   */
  async getCompletedTranslation(
    originalIdmlBuffer: Buffer,
    googleDocId: string,
    targetLanguage: string
  ): Promise<{ translatedFile: Buffer; report: any }> {
    
    // Fetch translation from Google Doc
    const translationResponse = await this.webhookService.checkTranslationStatus(googleDocId, targetLanguage);

    // Parse original IDML file
    await this.idmlParser.loadIdmlFile(originalIdmlBuffer);
    const document = await this.idmlParser.parseDocument();

    // Update text boxes with translated content
    const updatedTextBoxes = this.mergeTranslations(document.textBoxes, translationResponse);

    // Generate updated IDML file with correct text direction
    const updatedIdmlBuffer = await this.idmlParser.updateTextBoxesWithLanguage(updatedTextBoxes, targetLanguage);

    // Generate report
    const report = {
      originalTextBoxCount: document.textBoxes.length,
      translatedTextBoxCount: translationResponse.translatedTextBoxes.length,
      targetLanguage,
      googleDocId,
      completedAt: new Date().toISOString()
    };

    return {
      translatedFile: updatedIdmlBuffer,
      report
    };
  }

  private mergeTranslations(originalTextBoxes: TextBox[], translationResponse: TranslationStatusResponse): TextBox[] {
    const translationMap = new Map<string, string>();
    
    // Create a map of text box ID to translated content
    for (const translated of translationResponse.translatedTextBoxes) {
      translationMap.set(translated.id, translated.translatedContent);
    }

    // Update original text boxes with translations
    return originalTextBoxes.map(textBox => {
      const translatedContent = translationMap.get(textBox.id);
      if (translatedContent) {
        return {
          ...textBox,
          content: translatedContent
        };
      }
      return textBox;
    });
  }

  async extractTextOnly(idmlBuffer: Buffer): Promise<TextBox[]> {
    await this.idmlParser.loadIdmlFile(idmlBuffer);
    const document = await this.idmlParser.parseDocument();
    return document.textBoxes;
  }

  async updateIdmlWithTranslations(
    originalIdmlBuffer: Buffer,
    translations: Array<{ id: string; translatedContent: string }>
  ): Promise<Buffer> {
    await this.idmlParser.loadIdmlFile(originalIdmlBuffer);
    const document = await this.idmlParser.parseDocument();
    
    // Create translation map
    const translationMap = new Map<string, string>();
    for (const translation of translations) {
      translationMap.set(translation.id, translation.translatedContent);
    }

    // Update text boxes
    const updatedTextBoxes = document.textBoxes.map(textBox => {
      const translatedContent = translationMap.get(textBox.id);
      if (translatedContent) {
        return { ...textBox, content: translatedContent };
      }
      return textBox;
    });

    return await this.idmlParser.updateTextBoxes(updatedTextBoxes);
  }
}
