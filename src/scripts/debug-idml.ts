#!/usr/bin/env tsx
import dotenv from 'dotenv';
import * as fs from 'fs';
import JSZip from 'jszip';
import { parseString } from 'xml2js';
import { promisify } from 'util';

// Load environment variables
dotenv.config();

const parseXML = promisify(parseString);

async function debugIdmlStructure() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: npm run debug-idml -- <idml-file>');
    console.log('Example: npm run debug-idml -- input/test_hhigh.idml');
    process.exit(1);
  }

  const [filePath] = args;

  try {
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    console.log('🔍 Debugging IDML structure...');
    console.log(`📄 File: ${filePath}`);
    
    const idmlBuffer = fs.readFileSync(filePath);
    const zip = new JSZip();
    await zip.loadAsync(idmlBuffer);

    console.log('\n📂 Files in IDML:');
    Object.keys(zip.files).forEach(filename => {
      if (!zip.files[filename].dir) {
        console.log(`   ${filename}`);
      }
    });

    // Look for story files
    const storyFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('Stories/Story_') && name.endsWith('.xml')
    );

    console.log(`\n📖 Found ${storyFiles.length} story files:`);
    storyFiles.forEach(file => console.log(`   ${file}`));

    // Examine each story file
    for (const storyFile of storyFiles) {
      console.log(`\n🔍 Examining ${storyFile}:`);
      
      const file = zip.files[storyFile];
      const content = await file.async('text');
      
      console.log('\n📝 Raw XML (first 500 characters):');
      console.log(content.substring(0, 500) + '...');
      
      try {
        const parsed = await parseXML(content) as any;
        
        console.log('\n🏗️ Parsed structure:');
        console.log('Keys in parsed object:', Object.keys(parsed));
        
        // Handle namespaced structure
        const storyData = parsed['idPkg:Story'] || parsed.idPkg?.Story;
        
        if (storyData) {
          console.log('✅ Found story data');
          const story = Array.isArray(storyData) ? storyData[0] : storyData;
          const storyElement = story.Story ? story.Story[0] : story;
          
          console.log('Story element keys:', Object.keys(storyElement));
          
          if (storyElement.ParagraphStyleRange) {
            console.log('✅ Found ParagraphStyleRange:', storyElement.ParagraphStyleRange.length, 'items');
            
            // Show first paragraph in detail
            if (storyElement.ParagraphStyleRange.length > 0) {
              const firstPara = storyElement.ParagraphStyleRange[0];
              console.log('First paragraph structure:', JSON.stringify(firstPara, null, 2));
            }
          } else {
            console.log('❌ No ParagraphStyleRange found');
          }
          
          if (storyElement.CharacterStyleRange) {
            console.log('✅ Found CharacterStyleRange:', storyElement.CharacterStyleRange.length, 'items');
            
            // Show first character range in detail
            if (storyElement.CharacterStyleRange.length > 0) {
              const firstChar = storyElement.CharacterStyleRange[0];
              console.log('First character range structure:', JSON.stringify(firstChar, null, 2));
            }
          }
          
          if (storyElement.Content) {
            console.log('✅ Found direct Content:', storyElement.Content);
          }
          
          // Check for other common text containers
          ['Table', 'Cell', 'TextColumn', 'TextThread'].forEach(key => {
            if (storyElement[key]) {
              console.log(`✅ Found ${key}:`, storyElement[key]);
            }
          });
        } else {
          console.log('❌ No story data found');
        }
        
      } catch (parseError) {
        console.error('❌ Error parsing XML:', parseError);
      }
      
      console.log('\n' + '='.repeat(60));
    }

    // Also check spreads and design map for text frame references
    console.log('\n🗺️ Checking Spreads for text frame references...');
    
    const spreadFiles = Object.keys(zip.files).filter(name => 
      name.startsWith('Spreads/Spread_') && name.endsWith('.xml')
    );

    for (const spreadFile of spreadFiles) {
      console.log(`\n📄 ${spreadFile}:`);
      const file = zip.files[spreadFile];
      const content = await file.async('text');
      
      // Look for TextFrame references
      const textFrameMatches = content.match(/TextFrame[^>]*>/g);
      if (textFrameMatches) {
        console.log('TextFrame references found:', textFrameMatches.length);
        textFrameMatches.slice(0, 3).forEach((match, index) => {
          console.log(`   ${index + 1}: ${match}`);
        });
      }
      
      // Look for Story references  
      const storyMatches = content.match(/ParentStory="[^"]*"/g);
      if (storyMatches) {
        console.log('Story references found:', storyMatches.length);
        storyMatches.forEach(match => console.log(`   ${match}`));
      }
    }

  } catch (error) {
    console.error('❌ Error debugging IDML:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

debugIdmlStructure();
