export const SUPPORTED_LANGUAGES = [
    // Left-to-Right Languages
    {
        code: 'en',
        name: 'English',
        direction: 'LeftToRightDirection',
        expansionFactor: 1.0
    },
    {
        code: 'es',
        name: 'Spanish',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Arial', 'Times New Roman', 'Calibri'],
        expansionFactor: 1.15
    },
    {
        code: 'fr',
        name: 'French',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Arial', 'Times New Roman', 'Calibri'],
        expansionFactor: 1.10
    },
    {
        code: 'de',
        name: 'German',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Arial', 'Times New Roman', 'Calibri'],
        expansionFactor: 1.20
    },
    {
        code: 'pt',
        name: 'Portuguese',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Arial', 'Times New Roman', 'Calibri'],
        expansionFactor: 1.15
    },
    {
        code: 'it',
        name: 'Italian',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Arial', 'Times New Roman', 'Calibri'],
        expansionFactor: 1.10
    },
    {
        code: 'ru',
        name: 'Russian',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Arial Unicode MS', 'Times New Roman', 'Calibri'],
        expansionFactor: 1.15
    },
    {
        code: 'zh',
        name: 'Chinese (Simplified)',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['SimSun', 'Microsoft YaHei', 'Arial Unicode MS'],
        expansionFactor: 0.8
    },
    {
        code: 'ja',
        name: 'Japanese',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['MS Gothic', 'Hiragino Sans', 'Arial Unicode MS'],
        expansionFactor: 0.9
    },
    {
        code: 'ko',
        name: 'Korean',
        direction: 'LeftToRightDirection',
        fontRecommendations: ['Malgun Gothic', 'Dotum', 'Arial Unicode MS'],
        expansionFactor: 0.85
    },
    // Right-to-Left Languages
    {
        code: 'ar',
        name: 'Arabic',
        direction: 'RightToLeftDirection',
        fontRecommendations: ['Tahoma', 'Arial Unicode MS', 'Times New Roman'],
        expansionFactor: 1.25
    },
    {
        code: 'fa',
        name: 'Persian (Farsi)',
        direction: 'RightToLeftDirection',
        fontRecommendations: ['Tahoma', 'Nazanin', 'Arial Unicode MS'],
        expansionFactor: 1.30
    },
    {
        code: 'he',
        name: 'Hebrew',
        direction: 'RightToLeftDirection',
        fontRecommendations: ['Tahoma', 'Arial Unicode MS', 'Times New Roman'],
        expansionFactor: 1.10
    },
    {
        code: 'ur',
        name: 'Urdu',
        direction: 'RightToLeftDirection',
        fontRecommendations: ['Tahoma', 'Arial Unicode MS', 'Jameel Noori Nastaleeq'],
        expansionFactor: 1.35
    }
];
export class LanguageConfigManager {
    static languageMap = new Map();
    static {
        // Initialize the language map
        SUPPORTED_LANGUAGES.forEach(lang => {
            this.languageMap.set(lang.code.toLowerCase(), lang);
        });
    }
    /**
     * Get language configuration by language code
     */
    static getLanguageConfig(languageCode) {
        return this.languageMap.get(languageCode.toLowerCase());
    }
    /**
     * Check if a language is supported
     */
    static isLanguageSupported(languageCode) {
        return this.languageMap.has(languageCode.toLowerCase());
    }
    /**
     * Get text direction for a language
     */
    static getTextDirection(languageCode) {
        const config = this.getLanguageConfig(languageCode);
        return config?.direction || 'LeftToRightDirection';
    }
    /**
     * Check if language is RTL
     */
    static isRTLLanguage(languageCode) {
        return this.getTextDirection(languageCode) === 'RightToLeftDirection';
    }
    /**
     * Get recommended fonts for a language
     */
    static getRecommendedFonts(languageCode) {
        const config = this.getLanguageConfig(languageCode);
        return config?.fontRecommendations || ['Arial', 'Times New Roman'];
    }
    /**
     * Get typical text expansion factor
     */
    static getExpansionFactor(languageCode) {
        const config = this.getLanguageConfig(languageCode);
        return config?.expansionFactor || 1.0;
    }
    /**
     * Get all supported languages
     */
    static getAllSupportedLanguages() {
        return SUPPORTED_LANGUAGES;
    }
    /**
     * Get RTL languages only
     */
    static getRTLLanguages() {
        return SUPPORTED_LANGUAGES.filter(lang => lang.direction === 'RightToLeftDirection');
    }
    /**
     * Get LTR languages only
     */
    static getLTRLanguages() {
        return SUPPORTED_LANGUAGES.filter(lang => lang.direction === 'LeftToRightDirection');
    }
}
//# sourceMappingURL=languages.js.map