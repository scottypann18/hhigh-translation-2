import { TextBox, IdmlDocument } from '../types/index.js';
export declare class IdmlParser {
    private zip;
    loadIdmlFile(buffer: Buffer): Promise<void>;
    parseDocument(): Promise<IdmlDocument>;
    private extractTextBoxes;
    private parseTextFrame;
    private extractTextFromFrame;
    private extractTextContent;
    private extractTextContentFromCharacters;
    private extractPosition;
    private extractSpreads;
    private extractStories;
    private extractMetadata;
    /**
     * Update text boxes and set story direction based on target language
     */
    updateTextBoxesWithLanguage(textBoxes: TextBox[], targetLanguage: string): Promise<Buffer>;
    updateTextBoxes(textBoxes: TextBox[]): Promise<Buffer>;
    private updateStoryFiles;
    private updateStoryFilesWithLanguage;
    private updateStoryContent;
    private updateTextInParagraphs;
    private updateStoryContentWithDirection;
}
//# sourceMappingURL=IdmlParser.d.ts.map