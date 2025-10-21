import { TranslationRequest, TranslationSubmissionResponse, TranslationStatusResponse, WebhookConfig } from '../types/index.js';
export declare class WebhookService {
    private config;
    constructor(config: WebhookConfig);
    /**
     * Submit text for translation - sends to Google Doc workflow
     */
    submitForTranslation(request: TranslationRequest): Promise<TranslationSubmissionResponse>;
    /**
     * Get translation from Google Doc
     * @param googleDocId - The Google Doc ID containing the translations
     * @param targetLanguage - The target language code
     */
    checkTranslationStatus(googleDocId: string, targetLanguage: string): Promise<TranslationStatusResponse>;
    /**
     * Poll for translation completion using filename (useful for automation)
     */
    waitForTranslationCompletion(filename: string, targetLanguage: string, maxAttempts?: number, intervalMs?: number): Promise<TranslationStatusResponse>;
}
//# sourceMappingURL=WebhookService.d.ts.map