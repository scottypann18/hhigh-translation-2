import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';
import { v4 as uuidv4 } from 'uuid';
import { TextBox, IdmlDocument } from '../types/index.js';
import { LanguageConfigManager } from '../config/languages.js';

const parseXML = promisify(parseString);

export class IdmlParserXML {
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
        continue;
      }

      const story = Array.isArray(storyData) ? storyData[0] : storyData;
      const storyElement = story.Story ? story.Story[0] : story;
      const storyId = storyFile.replace('Stories/', '').replace('.xml', '');

      // Check for XMLElement structures (XML-tagged InDesign documents)
      if (storyElement?.XMLElement) {
        const xmlElements = Array.isArray(storyElement.XMLElement) 
          ? storyElement.XMLElement 
          : [storyElement.XMLElement];
        
        for (const xmlElement of xmlElements) {
          const textContent = this.extractTextFromXMLElement(xmlElement);
          
          if (textContent.trim()) {
            textBoxes.push({
              id: storyId,
              content: textContent,
              storyId: storyId
            });
          }
        }
      }
    }

    return textBoxes;
  }

  /**
   * Recursively extract text from XMLElement structures
   */
  private extractTextFromXMLElement(xmlElement: any): string {
    let text = '';

    // Check for ParagraphStyleRange within XMLElement
    if (xmlElement.ParagraphStyleRange) {
      const paragraphs = Array.isArray(xmlElement.ParagraphStyleRange)
        ? xmlElement.ParagraphStyleRange
        : [xmlElement.ParagraphStyleRange];
      
      text += this.extractTextContent(paragraphs);
    }

    // Check for CharacterStyleRange within XMLElement
    if (xmlElement.CharacterStyleRange) {
      const characters = Array.isArray(xmlElement.CharacterStyleRange)
        ? xmlElement.CharacterStyleRange
        : [xmlElement.CharacterStyleRange];
      
      text += this.extractTextContentFromCharacters(characters);
    }

    // Check for nested XMLElements
    if (xmlElement.XMLElement) {
      const nestedElements = Array.isArray(xmlElement.XMLElement)
        ? xmlElement.XMLElement
        : [xmlElement.XMLElement];
      
      for (const nested of nestedElements) {
        text += this.extractTextFromXMLElement(nested);
      }
    }

    return text;
  }

  private extractTextContent(paragraphs: any[]): string {
    let text = '';
    
    for (const para of paragraphs) {
      if (para.CharacterStyleRange) {
        const charRanges = Array.isArray(para.CharacterStyleRange) 
          ? para.CharacterStyleRange 
          : [para.CharacterStyleRange];
        
        for (const charRange of charRanges) {
          if (charRange.Content) {
            const content = Array.isArray(charRange.Content) 
              ? charRange.Content.join('') 
              : charRange.Content;
            text += content;
          }
        }
      }
      text += '\n';
    }
    
    return text;
  }

  private extractTextContentFromCharacters(characters: any[]): string {
    let text = '';
    
    for (const charRange of characters) {
      if (charRange.Content) {
        const content = Array.isArray(charRange.Content) 
          ? charRange.Content.join('') 
          : charRange.Content;
        text += content;
      }
    }
    
    return text;
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

  private async extractMetadata(): Promise<any> {
    if (!this.zip) throw new Error('No IDML file loaded');

    const metadataFile = this.zip.files['META-INF/metadata.xml'];
    if (!metadataFile) return {};

    const content = await metadataFile.async('text');
    return await parseXML(content);
  }

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

    // Update story files with new text content, direction, and font size scaling
    await this.updateStoryFilesWithLanguage(newZip, textBoxes, targetLanguage);

    // Generate the updated IDML file
    return await newZip.generateAsync({ type: 'nodebuffer' });
  }

  private async updateStoryFilesWithLanguage(zip: JSZip, textBoxes: TextBox[], targetLanguage: string): Promise<void> {
    const storyFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('Stories/Story_') && name.endsWith('.xml')
    );

    const textDirection = LanguageConfigManager.getTextDirection(targetLanguage);
    const expansionFactor = LanguageConfigManager.getExpansionFactor(targetLanguage);
    const fontSizeScale = 1 / expansionFactor;

    for (const storyFile of storyFiles) {
      const storyId = storyFile.replace('Stories/', '').replace('.xml', '');
      const relevantTextBoxes = textBoxes.filter(tb => tb.storyId === storyId);

      if (relevantTextBoxes.length > 0) {
        const file = zip.files[storyFile];
        const content = await file.async('text');
        const updatedContent = await this.updateXMLStoryContentWithDirection(
          content, 
          relevantTextBoxes, 
          textDirection,
          fontSizeScale
        );
        zip.file(storyFile, updatedContent);
      }
    }
  }

  private async updateXMLStoryContentWithDirection(
    originalContent: string, 
    textBoxes: TextBox[], 
    textDirection: 'LeftToRightDirection' | 'RightToLeftDirection',
    fontSizeScale: number = 1.0
  ): Promise<string> {
    const parsed = await parseXML(originalContent) as any;

    // Handle namespaced XML structure (idPkg:Story)
    const storyData = parsed['idPkg:Story'] || parsed.idPkg?.Story;
    
    if (!storyData) {
      return originalContent;
    }

    const story = Array.isArray(storyData) ? storyData[0] : storyData;
    const storyElement = story.Story ? story.Story[0] : story;

    // Update story direction at the story level
    if (storyElement.StoryPreference?.[0]) {
      storyElement.StoryPreference[0].$.StoryDirection = textDirection;
    }

    // Update XMLElement structures with new content
    if (storyElement?.XMLElement) {
      for (const textBox of textBoxes) {
        this.updateTextInXMLElement(storyElement.XMLElement, textBox.content, fontSizeScale);
      }
    }

    // Convert back to XML
    const xml2js = await import('xml2js');
    const builder = new xml2js.Builder();
    return builder.buildObject(parsed);
  }

  private updateTextInXMLElement(xmlElements: any, newContent: string, fontSizeScale: number = 1.0): void {
    const elements = Array.isArray(xmlElements) ? xmlElements : [xmlElements];
    
    let contentInserted = false;

    for (const xmlElement of elements) {
      // Look for ParagraphStyleRange within XMLElement
      if (xmlElement.ParagraphStyleRange) {
        const paragraphs = Array.isArray(xmlElement.ParagraphStyleRange)
          ? xmlElement.ParagraphStyleRange
          : [xmlElement.ParagraphStyleRange];
        
        for (let i = 0; i < paragraphs.length; i++) {
          const para = paragraphs[i];
          
          if (para.CharacterStyleRange) {
            const charRanges = Array.isArray(para.CharacterStyleRange) 
              ? para.CharacterStyleRange 
              : [para.CharacterStyleRange];
            
            for (let j = 0; j < charRanges.length; j++) {
              const charRange = charRanges[j];
              
              // Apply font size scaling
              if (fontSizeScale !== 1.0 && charRange.$) {
                const currentSize = parseFloat(charRange.$.PointSize || '12');
                const newSize = currentSize * fontSizeScale;
                charRange.$.PointSize = newSize.toFixed(2);
              }
              
              // Insert content in the first character range only
              if (!contentInserted) {
                charRange.Content = [newContent];
                contentInserted = true;
              } else {
                charRange.Content = [''];
              }
            }
          }
        }
      }

      // Recursively update nested XMLElements
      if (xmlElement.XMLElement && !contentInserted) {
        this.updateTextInXMLElement(xmlElement.XMLElement, newContent, fontSizeScale);
      }
    }
  }
}
