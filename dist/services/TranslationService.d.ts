import { TranslationStatusResponse, TextBox, WebhookConfig } from '../types/index.js';
export declare class TranslationService {
    private idmlParser;
    private webhookService;
    constructor(webhookConfig: WebhookConfig);
    /**
     * Submit IDML file for translation (sends to Google Doc workflow)
     */
    submitIdmlForTranslation(idmlBuffer: Buffer, sourceLanguage: string, targetLanguage: string, filename: string): Promise<{
        textBoxCount: number;
        report: any;
        warnings: string[];
    }>;
    /**
     * Check if translation is ready from Google Doc
     * @param googleDocId - The Google Doc ID containing the translations
     * @param targetLanguage - The target language code
     */
    checkTranslationStatus(googleDocId: string, targetLanguage: string): Promise<TranslationStatusResponse>;
    /**
     * Get completed translation and create updated IDML file
     * Fetches translations from Google Doc via webhook
     * @param originalIdmlBuffer - The original IDML file buffer
     * @param googleDocId - The Google Doc ID containing the translations
     * @param targetLanguage - The target language code
     */
    getCompletedTranslation(originalIdmlBuffer: Buffer, googleDocId: string, targetLanguage: string): Promise<{
        translatedFile: Buffer;
        report: any;
    }>;
    /**
     * Full workflow: submit and wait for completion (for automation)
     * Note: This requires polling the Google Doc or you'll need to implement a delay mechanism
     */
    translateIdmlFile(idmlBuffer: Buffer, sourceLanguage: string, targetLanguage: string, filename: string, googleDocId: string): Promise<{
        translatedFile: Buffer;
        report: any;
    }>;
    private mergeTranslations;
    extractTextOnly(idmlBuffer: Buffer): Promise<TextBox[]>;
    updateIdmlWithTranslations(originalIdmlBuffer: Buffer, translations: Array<{
        id: string;
        translatedContent: string;
    }>): Promise<Buffer>;
}
//# sourceMappingURL=TranslationService.d.ts.map