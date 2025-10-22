import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { TextBox, IdmlDocument } from '../types/index.js';
import { LanguageConfigManager } from '../config/languages.js';

const parseXML = promisify(parseString);

export class IdmlParser {
  private zip: JSZip | null = null;

  async loadIdmlFile(buffer: Buffer): Promise<void> {
    this.zip = await JSZip.loadAsync(buffer);
  }

  async parseDocument(): Promise<IdmlDocument> {
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

  private async extractTextBoxes(): Promise<TextBox[]> {
    if (!this.zip) throw new Error('No IDML file loaded');

    const textBoxes: TextBox[] = [];
    
    // Get all story files
    const storyFiles = Object.keys(this.zip.files).filter(name => 
      name.startsWith('Stories/Story_') && name.endsWith('.xml')
    );

    for (const storyFile of storyFiles) {
      const file = this.zip.files[storyFile];
      const content = await file.async('text');
      const parsed = await parseXML(content) as any;

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

  private parseTextFrame(frame: any, storyId: string): TextBox | null {
    const content = this.extractTextFromFrame(frame);
    
    if (!content.trim()) return null;

    const cleanStoryId = storyId.replace('Stories/', '').replace('.xml', '');
    return {
      id: cleanStoryId, // Use storyId as the stable identifier
      content,
      storyId: cleanStoryId,
      position: this.extractPosition(frame)
    };
  }

  private extractTextFromFrame(frame: any): string {
    let text = '';
    
    if (frame.ParagraphStyleRange) {
      text += this.extractTextContent(frame.ParagraphStyleRange);
    }
    
    if (frame.CharacterStyleRange) {
      text += this.extractTextContent(frame.CharacterStyleRange);
    }

    return text;
  }

  private extractTextContent(elements: any[]): string {
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
          } else if (content._) {
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

  private extractTextContentFromCharacters(characters: any[]): string {
    let text = '';
    
    for (const char of characters) {
      if (char.Content) {
        for (const content of char.Content) {
          if (typeof content === 'string') {
            text += content;
          } else if (content._) {
            text += content._;
          } else if (typeof content === 'object' && content.toString) {
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

  private extractPosition(frame: any): { x: number; y: number; width: number; height: number } | undefined {
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

  private async extractSpreads(): Promise<any[]> {
    if (!this.zip) throw new Error('No IDML file loaded');

    const spreads: any[] = [];
    const spreadFiles = Object.keys(this.zip.files).filter(name => 
      name.startsWith('Spreads/Spread_') && name.endsWith('.xml')
    );

    for (const spreadFile of spreadFiles) {
      const file = this.zip.files[spreadFile];
      const content = await file.async('text');
      const parsed = await parseXML(content);
      spreads.push(parsed);
    }

    return spreads;
  }

  private async extractStories(): Promise<any[]> {
    if (!this.zip) throw new Error('No IDML file loaded');

    const stories: any[] = [];
    const storyFiles = Object.keys(this.zip.files).filter(name => 
      name.startsWith('Stories/Story_') && name.endsWith('.xml')
    );

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

  private async extractMetadata(): Promise<Record<string, any>> {
    if (!this.zip) throw new Error('No IDML file loaded');

    const metadata: Record<string, any> = {};

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
  async updateTextBoxesWithLanguage(textBoxes: TextBox[], targetLanguage: string): Promise<Buffer> {
    if (!this.zip) throw new Error('No IDML file loaded');

    // Create a new zip with updated content
    const newZip = new JSZip();

    // Copy all files from original zip
    for (const [filename, file] of Object.entries(this.zip.files)) {
      if (!file.dir) {
        const content = await file.async('arraybuffer');
        newZip.file(filename, content);
      }
    }

    // Get the expansion factor for the target language
    // Update story files with new text content, direction, and font size scaling
    await this.updateStoryFilesWithLanguage(newZip, textBoxes, targetLanguage);

    // Generate the updated IDML file
    return await newZip.generateAsync({ type: 'nodebuffer' });
  }

  async updateTextBoxes(textBoxes: TextBox[]): Promise<Buffer> {
    if (!this.zip) throw new Error('No IDML file loaded');

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

  private async updateStoryFiles(zip: JSZip, textBoxes: TextBox[]): Promise<void> {
    const storyFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('Stories/Story_') && name.endsWith('.xml')
    );

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

  private async updateStoryFilesWithLanguage(zip: JSZip, textBoxes: TextBox[], targetLanguage: string): Promise<void> {
    const storyFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('Stories/Story_') && name.endsWith('.xml')
    );

    console.log(`\n=== updateStoryFilesWithLanguage DEBUG ===`);
    console.log(`Story files found: ${storyFiles.length}`);
    console.log(`TextBoxes to update: ${textBoxes.length}`);
    console.log(`TextBox IDs:`, textBoxes.map(tb => `${tb.id} (storyId: ${tb.storyId})`));

    // Get the text direction and expansion factor for the target language
    const textDirection = LanguageConfigManager.getTextDirection(targetLanguage);
    const expansionFactor = LanguageConfigManager.getExpansionFactor(targetLanguage);
    
    // Calculate font size scaling: if text expands 115%, reduce font to ~87% (1/1.15)
    const fontSizeScale = 1 / expansionFactor;
    console.log(`Font size scaling for ${targetLanguage}: ${(fontSizeScale * 100).toFixed(1)}% (expansion: ${(expansionFactor * 100).toFixed(0)}%)`);

    for (const storyFile of storyFiles) {
      const storyId = storyFile.replace('Stories/', '').replace('.xml', '');
      const relevantTextBoxes = textBoxes.filter(tb => tb.storyId === storyId);

      console.log(`\nProcessing ${storyFile}:`);
      console.log(`  Story ID: ${storyId}`);
      console.log(`  Relevant textboxes: ${relevantTextBoxes.length}`);

      if (relevantTextBoxes.length > 0) {
        const file = zip.files[storyFile];
        const content = await file.async('text');
        
        console.log(`  Original content preview: ${content.substring(content.indexOf('<Content>'), content.indexOf('</Content>') + 10)}`);
        
        // Update content, direction, and font size
        const updatedContent = await this.updateStoryContentWithDirection(
          content, 
          relevantTextBoxes, 
          textDirection,
          fontSizeScale
        );
        
        console.log(`  Updated content preview: ${updatedContent.substring(updatedContent.indexOf('<Content>'), updatedContent.indexOf('</Content>') + 10)}`);
        
        zip.file(storyFile, updatedContent);
        console.log(`  ✓ Story file updated in zip`);
      } else {
        console.log(`  ✗ No matching textboxes for this story`);
      }
    }
    console.log(`=== END updateStoryFilesWithLanguage DEBUG ===\n`);
  }

  private async updateStoryContent(originalContent: string, textBoxes: TextBox[]): Promise<string> {
    const parsed = await parseXML(originalContent) as any;

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

  private updateTextInParagraphs(paragraphs: any[], newContent: string, fontSizeScale: number = 1.0): void {
    // Replace all text content in all paragraphs with the new content
    console.log(`\n=== updateTextInParagraphs DEBUG ===`);
    console.log(`New content to insert: ${newContent.substring(0, 50)}...`);
    console.log(`Font size scale: ${(fontSizeScale * 100).toFixed(1)}%`);
    console.log(`Paragraphs array exists: ${!!paragraphs}`);
    console.log(`Paragraphs length: ${paragraphs?.length}`);
    
    if (!paragraphs || paragraphs.length === 0) {
      console.warn('No paragraphs found to update');
      return;
    }

    // Clear all existing content and put the new content in the first paragraph
    for (let i = 0; i < paragraphs.length; i++) {
      const para = paragraphs[i];
      console.log(`Paragraph ${i}:`, para.CharacterStyleRange ? `Has ${para.CharacterStyleRange.length} CharacterStyleRanges` : 'No CharacterStyleRange');
      
      if (para.CharacterStyleRange) {
        for (let j = 0; j < para.CharacterStyleRange.length; j++) {
          const charRange = para.CharacterStyleRange[j];
          console.log(`  CharRange ${j} before:`, charRange.Content);
          
          // Apply font size scaling if not 1.0
          if (fontSizeScale !== 1.0 && charRange.$) {
            const currentSize = parseFloat(charRange.$.PointSize || '12');
            const newSize = currentSize * fontSizeScale;
            charRange.$.PointSize = newSize.toFixed(2);
            console.log(`  Font size adjusted: ${currentSize.toFixed(2)}pt → ${newSize.toFixed(2)}pt`);
          }
          
          if (i === 0 && j === 0) {
            // Put all the new content in the first character range of the first paragraph
            charRange.Content = [newContent];
            console.log(`  CharRange ${j} after (NEW CONTENT):`, charRange.Content[0].substring(0, 50));
          } else {
            // Clear content from all other character ranges
            charRange.Content = [''];
            console.log(`  CharRange ${j} after (CLEARED)`);
          }
        }
      }
    }
    console.log(`=== END updateTextInParagraphs DEBUG ===\n`);
  }

  private async updateStoryContentWithDirection(
    originalContent: string, 
    textBoxes: TextBox[], 
    textDirection: 'LeftToRightDirection' | 'RightToLeftDirection',
    fontSizeScale: number = 1.0
  ): Promise<string> {
    const parsed = await parseXML(originalContent) as any;

    // The root is idPkg:Story
    const root = parsed['idPkg:Story'];
    
    if (!root) {
      console.error('Could not find idPkg:Story element in XML');
      return originalContent;
    }

    // The actual Story element is nested inside
    const story = root.Story?.[0] || root;
    
    if (!story) {
      console.error('Could not find Story element');
      return originalContent;
    }

    // Update story direction at the story level
    if (story.StoryPreference?.[0]) {
      story.StoryPreference[0].$.StoryDirection = textDirection;
      console.log(`Set story direction to: ${textDirection}`);
    }

    // Update the content in the parsed XML
    if (story.ParagraphStyleRange) {
      for (const textBox of textBoxes) {
        console.log(`Updating story with translated content: ${textBox.content.substring(0, 50)}...`);
        this.updateTextInParagraphs(story.ParagraphStyleRange, textBox.content, fontSizeScale);
      }
    } else {
      console.error('No ParagraphStyleRange found in story');
    }

    // Convert back to XML
    const xml2js = await import('xml2js');
    const builder = new xml2js.Builder();
    return builder.buildObject(parsed);
  }
}
