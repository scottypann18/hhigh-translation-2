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
    filename: string
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
    
    // Step 1: Parse the IDML file and extract text boxes
    console.log('Parsing IDML file...');
    await this.idmlParser.loadIdmlFile(idmlBuffer);
    const document = await this.idmlParser.parseDocument();
    
    if (document.textBoxes.length === 0) {
      throw new Error('No text boxes found in the IDML file');
    }

    console.log(`Found ${document.textBoxes.length} text boxes to translate`);

    // Step 2: Prepare translation request
    const translationRequest: TranslationRequest = {
      id: filename, // Use filename as identifier
      textBoxes: document.textBoxes,
      sourceLanguage,
      targetLanguage,
      metadata: {
        filename,
        documentMetadata: document.metadata
      }
    };

    // Step 3: Submit for translation (goes to Google Doc)
    console.log('Submitting text boxes for translation...');
    const submissionResponse = await this.webhookService.submitForTranslation(translationRequest);

    if (submissionResponse.status !== 'accepted') {
      throw new Error(`Translation submission failed: ${submissionResponse.error}`);
    }

    // Step 4: Generate report
    const report = {
      originalTextBoxCount: document.textBoxes.length,
      sourceLanguage,
      targetLanguage,
      filename,
      submittedAt: new Date().toISOString()
    };

    return {
      textBoxCount: document.textBoxes.length,
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
    
    // Step 1: Fetch translation from Google Doc
    console.log('Fetching translation from Google Doc...');
    const translationResponse = await this.webhookService.checkTranslationStatus(googleDocId, targetLanguage);

    if (translationResponse.status !== 'completed') {
      throw new Error(`Translation not completed. Status: ${translationResponse.status}`);
    }

    // Step 2: Parse original IDML file
    console.log('Parsing original IDML file...');
    await this.idmlParser.loadIdmlFile(originalIdmlBuffer);
    const document = await this.idmlParser.parseDocument();

    // Step 3: Update text boxes with translated content
    const updatedTextBoxes = this.mergeTranslations(document.textBoxes, translationResponse);

    // Step 4: Generate updated IDML file with correct text direction
    console.log('Generating updated IDML file with language-specific formatting...');
    const updatedIdmlBuffer = await this.idmlParser.updateTextBoxesWithLanguage(updatedTextBoxes, targetLanguage);

    // Step 5: Generate report
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

  /**
   * Full workflow: submit and wait for completion (for automation)
   * Note: This requires polling the Google Doc or you'll need to implement a delay mechanism
   */
  async translateIdmlFile(
    idmlBuffer: Buffer,
    sourceLanguage: string,
    targetLanguage: string,
    filename: string,
    googleDocId: string
  ): Promise<{ translatedFile: Buffer; report: any }> {
    
    // Submit for translation
    const submission = await this.submitIdmlForTranslation(idmlBuffer, sourceLanguage, targetLanguage, filename);
    
    // Wait for completion (polling the Google Doc)
    console.log(`Waiting for translation completion in Google Doc: ${googleDocId}`);
    const translationResponse = await this.webhookService.waitForTranslationCompletion(
      googleDocId, 
      targetLanguage
    );

    // Parse original IDML and create updated version
    await this.idmlParser.loadIdmlFile(idmlBuffer);
    const document = await this.idmlParser.parseDocument();
    const updatedTextBoxes = this.mergeTranslations(document.textBoxes, translationResponse);
    const updatedIdmlBuffer = await this.idmlParser.updateTextBoxesWithLanguage(updatedTextBoxes, targetLanguage);

    const report = {
      ...submission.report,
      translatedTextBoxCount: translationResponse.translatedTextBoxes.length,
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

    console.log('\n=== MERGE DEBUG ===');
    console.log('Translation Map Keys:', Array.from(translationMap.keys()));
    console.log('Original TextBox IDs:', originalTextBoxes.map(tb => tb.id));
    console.log('=== END MERGE DEBUG ===\n');

    // Update original text boxes with translations
    return originalTextBoxes.map(textBox => {
      const translatedContent = translationMap.get(textBox.id);
      console.log(`Matching ${textBox.id}: ${translatedContent ? 'FOUND' : 'NOT FOUND'}`);
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
