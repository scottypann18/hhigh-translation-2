#!/usr/bin/env tsx
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { TranslationService } from '../services/TranslationService.js';
import { WebhookConfig } from '../types/index.js';

// Load environment variables
dotenv.config();

function getWebhookConfig(): WebhookConfig {
  // For extraction, we don't need real webhooks, just dummy config
  return {
    submitUrl: 'http://localhost:3000/dummy',
    statusUrl: 'http://localhost:3000/dummy'
  };
}

async function extractText() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.log('Usage: npm run extract -- <idml-file> [output-file]');
    console.log('');
    console.log('Examples:');
    console.log('  npm run extract -- input/document.idml');
    console.log('  npm run extract -- input/brochure.idml output/text-boxes.json');
    process.exit(1);
  }

  const [filePath, outputPath] = args;

  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    console.log('📖 Extracting text from IDML file...');
    console.log(`📄 File: ${filePath}`);
    
    const webhookConfig = getWebhookConfig();
    const service = new TranslationService(webhookConfig);
    
    const idmlBuffer = fs.readFileSync(filePath);
    const textBoxes = await service.extractTextOnly(idmlBuffer);

    console.log(`✅ Extraction completed!`);
    console.log(`📊 Found ${textBoxes.length} text boxes`);

    // Prepare extraction report
    const report = {
      filename: path.basename(filePath),
      extractedAt: new Date().toISOString(),
      totalTextBoxes: textBoxes.length,
      totalCharacters: textBoxes.reduce((sum, tb) => sum + tb.content.length, 0),
      textBoxes: textBoxes.map(tb => ({
        id: tb.id,
        storyId: tb.storyId,
        content: tb.content,
        characterCount: tb.content.length,
        position: tb.position
      }))
    };

    // Determine output file path
    const finalOutputPath = outputPath || `${filePath}.extracted.json`;
    
    // Ensure output directory exists
    const outputDir = path.dirname(finalOutputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Save extraction results
    fs.writeFileSync(finalOutputPath, JSON.stringify(report, null, 2));
    console.log(`💾 Results saved to: ${finalOutputPath}`);

    // Show summary
    console.log('\n📈 Summary:');
    console.log(`   Total text boxes: ${textBoxes.length}`);
    console.log(`   Total characters: ${report.totalCharacters}`);
    console.log(`   Average per text box: ${Math.round(report.totalCharacters / textBoxes.length)} characters`);

    // Show sample content
    if (textBoxes.length > 0) {
      console.log('\n📝 Sample content:');
      textBoxes.slice(0, 3).forEach((tb, index) => {
        const preview = tb.content.length > 60 
          ? tb.content.substring(0, 60) + '...'
          : tb.content;
        console.log(`   ${index + 1}. "${preview}"`);
      });
      
      if (textBoxes.length > 3) {
        console.log(`   ... and ${textBoxes.length - 3} more text boxes`);
      }
    }

    console.log('\n🎯 Next steps:');
    console.log(`   1. Review extracted text in: ${finalOutputPath}`);
    console.log(`   2. Choose source and target languages`);
    console.log(`   3. Submit for translation: npm run submit -- ${filePath} <source-lang> <target-lang>`);

  } catch (error) {
    console.error('❌ Error extracting text:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

extractText();
