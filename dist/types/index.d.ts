export interface TextBox {
    id: string;
    content: string;
    storyId: string;
    characterStyleRange?: any;
    paragraphStyleRange?: any;
    position?: {
        x: number;
        y: number;
        width: number;
        height: number;
    } | undefined;
}
export interface TranslationRequest {
    id: string;
    textBoxes: TextBox[];
    sourceLanguage: string;
    targetLanguage: string;
    metadata?: Record<string, any>;
}
export interface TranslationSubmissionResponse {
    id: string;
    status: 'accepted' | 'rejected';
    message?: string;
    error?: string;
}
export interface TranslationStatusResponse {
    id: string;
    status: 'pending' | 'completed' | 'failed';
    translatedTextBoxes: Array<{
        id: string;
        translatedContent: string;
        language: string;
    }>;
    error?: string;
}
export interface WebhookConfig {
    submitUrl: string;
    statusUrl: string;
    authHeader?: string | undefined;
    apiKey?: string | undefined;
    timeout?: number | undefined;
}
export interface IdmlDocument {
    filename: string;
    textBoxes: TextBox[];
    spreads: any[];
    stories: any[];
    metadata: Record<string, any>;
}
//# sourceMappingURL=index.d.ts.map