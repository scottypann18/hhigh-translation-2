export interface LanguageConfig {
    code: string;
    name: string;
    direction: 'LeftToRightDirection' | 'RightToLeftDirection';
    fontRecommendations?: string[];
    expansionFactor?: number;
}
export declare const SUPPORTED_LANGUAGES: LanguageConfig[];
export declare class LanguageConfigManager {
    private static languageMap;
    /**
     * Get language configuration by language code
     */
    static getLanguageConfig(languageCode: string): LanguageConfig | undefined;
    /**
     * Check if a language is supported
     */
    static isLanguageSupported(languageCode: string): boolean;
    /**
     * Get text direction for a language
     */
    static getTextDirection(languageCode: string): 'LeftToRightDirection' | 'RightToLeftDirection';
    /**
     * Check if language is RTL
     */
    static isRTLLanguage(languageCode: string): boolean;
    /**
     * Get recommended fonts for a language
     */
    static getRecommendedFonts(languageCode: string): string[];
    /**
     * Get typical text expansion factor
     */
    static getExpansionFactor(languageCode: string): number;
    /**
     * Get all supported languages
     */
    static getAllSupportedLanguages(): LanguageConfig[];
    /**
     * Get RTL languages only
     */
    static getRTLLanguages(): LanguageConfig[];
    /**
     * Get LTR languages only
     */
    static getLTRLanguages(): LanguageConfig[];
}
//# sourceMappingURL=languages.d.ts.map