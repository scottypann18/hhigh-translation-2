import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { LanguageConfigManager } from '../config/languages.js';
const parseXML = promisify(parseString);
export class IdmlParser {
    zip = null;
    async loadIdmlFile(buffer) {
        this.zip = await JSZip.loadAsync(buffer);
    }
    async parseDocument() {
        if (!this.zip) {
            throw new Error('No IDML file loaded. Call loadIdmlFile first.');
        }
        const textBoxes = await this.extractTextBoxes();
        const spreads = await this.extractSpreads();
        const stories = await this.extractStories();
        const metadata = await this.extractMetadata();
        return {
            filename: '',
            textBoxes,
            spreads,
            stories,
            metadata
        };
    }
    async extractTextBoxes() {
        if (!this.zip)
            throw new Error('No IDML file loaded');
        const textBoxes = [];
        // Get all story files
        const storyFiles = Object.keys(this.zip.files).filter(name => name.startsWith('Stories/Story_') && name.endsWith('.xml'));
        for (const storyFile of storyFiles) {
            const file = this.zip.files[storyFile];
            const content = await file.async('text');
            const parsed = await parseXML(content);
            // Handle namespaced XML structure (idPkg:Story)
            const storyData = parsed['idPkg:Story'] || parsed.idPkg?.Story;
            if (!storyData) {
                console.warn(`No story data found in ${storyFile}`);
                continue;
            }
            const story = Array.isArray(storyData) ? storyData[0] : storyData;
            const storyElement = story.Story ? story.Story[0] : story;
            const storyId = storyFile.replace('Stories/', '').replace('.xml', '');
            // Check for ParagraphStyleRange (most common for text content)
            if (storyElement?.ParagraphStyleRange) {
                const paragraphs = storyElement.ParagraphStyleRange;
                const content = this.extractTextContent(paragraphs);
                if (content.trim()) {
                    textBoxes.push({
                        id: storyId, // Use storyId as the stable identifier
                        content,
                        storyId: storyId,
                        paragraphStyleRange: paragraphs
                    });
                }
            }
            // Check for CharacterStyleRange (alternative text structure)
            if (storyElement?.CharacterStyleRange) {
                const characters = storyElement.CharacterStyleRange;
                const content = this.extractTextContentFromCharacters(characters);
                if (content.trim()) {
                    textBoxes.push({
                        id: storyId, // Use storyId as the stable identifier
                        content,
                        storyId: storyId,
                        characterStyleRange: characters
                    });
                }
            }
            // Check for direct Content elements
            if (storyElement?.Content) {
                const content = Array.isArray(storyElement.Content)
                    ? storyElement.Content.join(' ')
                    : storyElement.Content;
                if (content && content.trim()) {
                    textBoxes.push({
                        id: storyId, // Use storyId as the stable identifier
                        content: content.trim(),
                        storyId: storyId
                    });
                }
            }
        }
        return textBoxes;
    }
    parseTextFrame(frame, storyId) {
        const content = this.extractTextFromFrame(frame);
        if (!content.trim())
            return null;
        const cleanStoryId = storyId.replace('Stories/', '').replace('.xml', '');
        return {
            id: cleanStoryId, // Use storyId as the stable identifier
            content,
            storyId: cleanStoryId,
            position: this.extractPosition(frame)
        };
    }
    extractTextFromFrame(frame) {
        let text = '';
        if (frame.ParagraphStyleRange) {
            text += this.extractTextContent(frame.ParagraphStyleRange);
        }
        if (frame.CharacterStyleRange) {
            text += this.extractTextContent(frame.CharacterStyleRange);
        }
        return text;
    }
    extractTextContent(elements) {
        let text = '';
        if (!Array.isArray(elements)) {
            elements = [elements];
        }
        for (const element of elements) {
            if (element.CharacterStyleRange) {
                text += this.extractTextContent(element.CharacterStyleRange);
            }
            if (element.Content) {
                for (const content of element.Content) {
                    if (typeof content === 'string') {
                        text += content;
                    }
                    else if (content._) {
                        text += content._;
                    }
                }
            }
            if (element._) {
                text += element._;
            }
        }
        return text;
    }
    extractTextContentFromCharacters(characters) {
        let text = '';
        for (const char of characters) {
            if (char.Content) {
                for (const content of char.Content) {
                    if (typeof content === 'string') {
                        text += content;
                    }
                    else if (content._) {
                        text += content._;
                    }
                    else if (typeof content === 'object' && content.toString) {
                        text += content.toString();
                    }
                }
            }
            if (char._) {
                text += char._;
            }
            // Handle nested text structures
            if (char.ParagraphStyleRange) {
                text += this.extractTextContent(char.ParagraphStyleRange);
            }
        }
        return text;
    }
    extractPosition(frame) {
        // Extract geometric bounds if available
        if (frame.$.GeometricBounds) {
            const bounds = frame.$.GeometricBounds.split(' ').map(Number);
            if (bounds.length === 4) {
                return {
                    y: bounds[0],
                    x: bounds[1],
                    height: bounds[2] - bounds[0],
                    width: bounds[3] - bounds[1]
                };
            }
        }
        return undefined;
    }
    async extractSpreads() {
        if (!this.zip)
            throw new Error('No IDML file loaded');
        const spreads = [];
        const spreadFiles = Object.keys(this.zip.files).filter(name => name.startsWith('Spreads/Spread_') && name.endsWith('.xml'));
        for (const spreadFile of spreadFiles) {
            const file = this.zip.files[spreadFile];
            const content = await file.async('text');
            const parsed = await parseXML(content);
            spreads.push(parsed);
        }
        return spreads;
    }
    async extractStories() {
        if (!this.zip)
            throw new Error('No IDML file loaded');
        const stories = [];
        const storyFiles = Object.keys(this.zip.files).filter(name => name.startsWith('Stories/Story_') && name.endsWith('.xml'));
        for (const storyFile of storyFiles) {
            const file = this.zip.files[storyFile];
            const content = await file.async('text');
            const parsed = await parseXML(content);
            stories.push({
                filename: storyFile,
                content: parsed
            });
        }
        return stories;
    }
    async extractMetadata() {
        if (!this.zip)
            throw new Error('No IDML file loaded');
        const metadata = {};
        // Extract designmap.xml if it exists
        if (this.zip.files['designmap.xml']) {
            const file = this.zip.files['designmap.xml'];
            const content = await file.async('text');
            const parsed = await parseXML(content);
            metadata.designmap = parsed;
        }
        // Extract mimetype
        if (this.zip.files['mimetype']) {
            const file = this.zip.files['mimetype'];
            const content = await file.async('text');
            metadata.mimetype = content;
        }
        return metadata;
    }
    /**
     * Update text boxes and set story direction based on target language
     */
    async updateTextBoxesWithLanguage(textBoxes, targetLanguage) {
        if (!this.zip)
            throw new Error('No IDML file loaded');
        // Create a new zip with updated content
        const newZip = new JSZip();
        // Copy all files from original zip
        for (const [filename, file] of Object.entries(this.zip.files)) {
            if (!file.dir) {
                const content = await file.async('arraybuffer');
                newZip.file(filename, content);
            }
        }
        // Update story files with new text content and direction
        await this.updateStoryFilesWithLanguage(newZip, textBoxes, targetLanguage);
        // Generate the updated IDML file
        return await newZip.generateAsync({ type: 'nodebuffer' });
    }
    async updateTextBoxes(textBoxes) {
        if (!this.zip)
            throw new Error('No IDML file loaded');
        // Create a new zip with updated content
        const newZip = new JSZip();
        // Copy all files from original zip
        for (const [filename, file] of Object.entries(this.zip.files)) {
            if (!file.dir) {
                const content = await file.async('arraybuffer');
                newZip.file(filename, content);
            }
        }
        // Update story files with new text content
        await this.updateStoryFiles(newZip, textBoxes);
        // Generate the updated IDML file
        return await newZip.generateAsync({ type: 'nodebuffer' });
    }
    async updateStoryFiles(zip, textBoxes) {
        const storyFiles = Object.keys(zip.files).filter(name => name.startsWith('Stories/Story_') && name.endsWith('.xml'));
        for (const storyFile of storyFiles) {
            const storyId = storyFile.replace('Stories/', '').replace('.xml', '');
            const relevantTextBoxes = textBoxes.filter(tb => tb.storyId === storyId);
            if (relevantTextBoxes.length > 0) {
                const file = zip.files[storyFile];
                const content = await file.async('text');
                const updatedContent = await this.updateStoryContent(content, relevantTextBoxes);
                zip.file(storyFile, updatedContent);
            }
        }
    }
    async updateStoryFilesWithLanguage(zip, textBoxes, targetLanguage) {
        const storyFiles = Object.keys(zip.files).filter(name => name.startsWith('Stories/Story_') && name.endsWith('.xml'));
        // Get the text direction for the target language
        const textDirection = LanguageConfigManager.getTextDirection(targetLanguage);
        for (const storyFile of storyFiles) {
            const storyId = storyFile.replace('Stories/', '').replace('.xml', '');
            const relevantTextBoxes = textBoxes.filter(tb => tb.storyId === storyId);
            if (relevantTextBoxes.length > 0) {
                const file = zip.files[storyFile];
                const content = await file.async('text');
                // Update both content and direction
                const updatedContent = await this.updateStoryContentWithDirection(content, relevantTextBoxes, textDirection);
                zip.file(storyFile, updatedContent);
            }
        }
    }
    async updateStoryContent(originalContent, textBoxes) {
        const parsed = await parseXML(originalContent);
        // Update the content in the parsed XML
        if (parsed.idPkg?.Story?.[0]?.ParagraphStyleRange) {
            for (const textBox of textBoxes) {
                this.updateTextInParagraphs(parsed.idPkg.Story[0].ParagraphStyleRange, textBox.content);
            }
        }
        // Convert back to XML
        const xml2js = await import('xml2js');
        const builder = new xml2js.Builder();
        return builder.buildObject(parsed);
    }
    updateTextInParagraphs(paragraphs, newContent) {
        // This is a simplified update - you may need more sophisticated logic
        // depending on your specific IDML structure
        if (paragraphs && paragraphs.length > 0) {
            if (paragraphs[0].CharacterStyleRange?.[0]?.Content) {
                paragraphs[0].CharacterStyleRange[0].Content = [newContent];
            }
        }
    }
    async updateStoryContentWithDirection(originalContent, textBoxes, textDirection) {
        const parsed = await parseXML(originalContent);
        // Update story direction at the story level
        if (parsed.idPkg?.Story?.[0]?.StoryPreference?.[0]) {
            parsed.idPkg.Story[0].StoryPreference[0].$.StoryDirection = textDirection;
        }
        // Update the content in the parsed XML
        if (parsed.idPkg?.Story?.[0]?.ParagraphStyleRange) {
            for (const textBox of textBoxes) {
                this.updateTextInParagraphs(parsed.idPkg.Story[0].ParagraphStyleRange, textBox.content);
            }
        }
        // Convert back to XML
        const xml2js = await import('xml2js');
        const builder = new xml2js.Builder();
        return builder.buildObject(parsed);
    }
}
//# sourceMappingURL=IdmlParser.js.map