import axios from 'axios';
import { AppError } from '../utils/errors.js';
export class WebhookService {
    config;
    constructor(config) {
        this.config = {
            timeout: 30000,
            ...config
        };
    }
    /**
     * Submit text for translation - sends to Google Doc workflow
     */
    async submitForTranslation(request) {
        try {
            const headers = {
                'Content-Type': 'application/json',
            };
            if (this.config.authHeader) {
                headers['Authorization'] = this.config.authHeader;
            }
            if (this.config.apiKey) {
                headers['X-API-Key'] = this.config.apiKey;
            }
            console.log(`Submitting translation request to: ${this.config.submitUrl}`);
            const response = await axios.post(this.config.submitUrl, request, {
                headers,
                timeout: this.config.timeout ?? 30000,
                validateStatus: (status) => status < 500, // Don't throw on 4xx errors
            });
            console.log(`Response status: ${response.status}`);
            console.log(`Response data:`, JSON.stringify(response.data, null, 2));
            if (response.status >= 400) {
                throw new AppError(`Translation submission failed: ${response.status} ${response.statusText}`, 'WEBHOOK_ERROR');
            }
            // Handle Make.com or other webhook responses that might not follow our exact format
            // If the response is successful but doesn't have the expected structure, create a default response
            const responseData = {
                id: response.data?.id || request.id,
                status: response.status === 200 ? 'accepted' : 'rejected',
                message: response.data?.message || `Webhook responded with status ${response.status}`,
                ...(response.data || {})
            };
            return responseData;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || error.message;
                throw new AppError(`Failed to submit translation request: ${message}`, 'WEBHOOK_ERROR');
            }
            throw error;
        }
    }
    /**
     * Get translation from Google Doc
     * @param googleDocId - The Google Doc ID containing the translations
     * @param targetLanguage - The target language code
     */
    async checkTranslationStatus(googleDocId, targetLanguage) {
        try {
            const headers = {};
            if (this.config.authHeader) {
                headers['Authorization'] = this.config.authHeader;
            }
            if (this.config.apiKey) {
                headers['X-API-Key'] = this.config.apiKey;
            }
            // Add Google Doc ID and language as query parameters
            const url = `${this.config.statusUrl}?docId=${encodeURIComponent(googleDocId)}&language=${encodeURIComponent(targetLanguage)}`;
            console.log(`Fetching translation from Google Doc: ${url}`);
            const response = await axios.get(url, {
                headers,
                timeout: this.config.timeout ?? 30000,
                validateStatus: (status) => status < 500,
            });
            console.log('\n=== WEBHOOK RESPONSE DEBUG ===');
            console.log('Status:', response.status);
            console.log('Data Type:', typeof response.data);
            console.log('Data:', JSON.stringify(response.data, null, 2));
            console.log('=== END DEBUG ===\n');
            if (response.status >= 400) {
                throw new AppError(`Failed to fetch translation: ${response.status} ${response.statusText}`, 'WEBHOOK_ERROR');
            }
            // Parse Make.com format and convert to expected format
            const makeData = response.data;
            // Convert Make.com format to TranslationStatusResponse
            const translatedTextBoxes = makeData.map((item) => {
                const textboxData = item.textbox[0]; // Get first textbox entry
                return {
                    id: textboxData.uuid,
                    translatedContent: textboxData.text,
                    language: targetLanguage
                };
            });
            const translationResponse = {
                id: googleDocId,
                status: 'completed',
                translatedTextBoxes
            };
            console.log('\n=== PARSED RESPONSE ===');
            console.log(JSON.stringify(translationResponse, null, 2));
            console.log('=== END PARSED ===\n');
            return translationResponse;
        }
        catch (error) {
            if (axios.isAxiosError(error)) {
                const message = error.response?.data?.message || error.message;
                throw new AppError(`Failed to check translation status: ${message}`, 'WEBHOOK_ERROR');
            }
            throw error;
        }
    }
    /**
     * Poll for translation completion using filename (useful for automation)
     */
    async waitForTranslationCompletion(filename, targetLanguage, maxAttempts = 60, intervalMs = 5000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            console.log(`Checking translation status (attempt ${attempt}/${maxAttempts})...`);
            const status = await this.checkTranslationStatus(filename, targetLanguage);
            if (status.status === 'completed') {
                console.log('Translation completed!');
                return status;
            }
            if (status.status === 'failed') {
                throw new AppError(`Translation failed: ${status.error || 'Unknown error'}`, 'TRANSLATION_FAILED');
            }
            if (attempt < maxAttempts) {
                console.log(`Translation still pending, waiting ${intervalMs}ms before next check...`);
                await new Promise(resolve => setTimeout(resolve, intervalMs));
            }
        }
        throw new AppError(`Translation did not complete within ${maxAttempts} attempts`, 'TRANSLATION_TIMEOUT');
    }
}
//# sourceMappingURL=WebhookService.js.map