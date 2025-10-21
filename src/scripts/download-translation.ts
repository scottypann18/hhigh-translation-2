#!/usr/bin/env tsx
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { TranslationService } from '../services/TranslationService.js';
import { WebhookConfig } from '../types/index.js';
import { LanguageConfigManager } from '../config/languages.js';

// Load environment variables
dotenv.config();

function getWebhookConfig(): WebhookConfig {
  const submitUrl = process.env.TRANSLATION_SUBMIT_WEBHOOK_URL;
  const statusUrl = process.env.TRANSLATION_STATUS_WEBHOOK_URL;

  if (!submitUrl || !statusUrl) {
    console.error('❌ Missing required environment variables:');
    console.error('   TRANSLATION_SUBMIT_WEBHOOK_URL - URL to submit translation requests');
    console.error('   TRANSLATION_STATUS_WEBHOOK_URL - URL to check translation status');
    process.exit(1);
  }

  return {
    submitUrl,
    statusUrl,
    timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '30000'),
    authHeader: process.env.WEBHOOK_AUTH_HEADER,
    apiKey: process.env.WEBHOOK_API_KEY
  };
}

async function downloadTranslation() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: npm run download -- <original-idml-file> <google-doc-id> <target-language>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run download -- input/document.idml 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms fa');
    console.log('  npm run download -- input/brochure.idml 1Ab2Cd3Ef4Gh5Ij6Kl7Mn8Op9Qr0St1Uv2Wx3Yz ar');
    console.log('');
    console.log('The Google Doc ID is the long string in the URL:');
    console.log('  https://docs.google.com/document/d/[GOOGLE_DOC_ID]/edit');
    console.log('');
    console.log('Supported languages:');
    const languages = LanguageConfigManager.getAllSupportedLanguages();
    languages.forEach(lang => {
      const direction = lang.direction === 'RightToLeftDirection' ? 'RTL' : 'LTR';
      console.log(`  ${lang.code.padEnd(4)} - ${lang.name} (${direction})`);
    });
    process.exit(1);
  }

  const [originalFilePath, googleDocId, targetLanguage] = args;

  try {
    // Validate original file exists
    if (!fs.existsSync(originalFilePath)) {
      console.error(`❌ Original file not found: ${originalFilePath}`);
      process.exit(1);
    }

    // Validate language
    if (!LanguageConfigManager.isLanguageSupported(targetLanguage)) {
      console.error(`❌ Unsupported target language: ${targetLanguage}`);
      process.exit(1);
    }

    console.log('📥 Downloading completed translation...');
    console.log(`📄 Original file: ${originalFilePath}`);
    console.log(`📄 Google Doc ID: ${googleDocId}`);
    console.log(`🌐 Target Language: ${targetLanguage}`);
    
    const webhookConfig = getWebhookConfig();
    const service = new TranslationService(webhookConfig);
    
    const originalIdmlBuffer = fs.readFileSync(originalFilePath);
    const filename = path.basename(originalFilePath);
    
    const result = await service.getCompletedTranslation(
      originalIdmlBuffer,
      googleDocId,
      targetLanguage
    );

    // Generate output filename as output/hhigh_[language].idml
    const outputFilename = `hhigh_${targetLanguage}.idml`;
    const outputPath = path.join('output', outputFilename);
    
    // Ensure output directory exists
    const outputDir = path.dirname(outputPath);
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Write translated file
    fs.writeFileSync(outputPath, result.translatedFile);

    console.log('✅ Translation downloaded successfully!');
    console.log(`💾 Saved to: ${outputPath}`);
    console.log(`📊 Translated text boxes: ${result.report.translatedTextBoxCount}`);
    
    // Show language-specific information
    const languageConfig = LanguageConfigManager.getLanguageConfig(targetLanguage);
    if (languageConfig) {
      console.log(`\n🌐 Language: ${languageConfig.name}`);
      console.log(`📝 Direction: ${languageConfig.direction === 'RightToLeftDirection' ? 'Right-to-Left' : 'Left-to-Right'}`);
      
      if (languageConfig.fontRecommendations) {
        console.log(`🔤 Recommended fonts: ${languageConfig.fontRecommendations.join(', ')}`);
      }
      
      if (languageConfig.expansionFactor && languageConfig.expansionFactor !== 1.0) {
        const percentage = Math.round(languageConfig.expansionFactor * 100);
        console.log(`📏 Expected text length: ${percentage}% of original`);
      }
    }

    // Save report
    const reportPath = `${outputPath}.report.json`;
    fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2));
    console.log(`📄 Translation report saved to: ${reportPath}`);

    console.log('\n🎯 Next steps:');
    console.log(`   1. Open ${outputPath} in Adobe InDesign`);
    console.log(`   2. Check text formatting and font assignments`);
    if (languageConfig?.direction === 'RightToLeftDirection') {
      console.log(`   3. Verify RTL text direction is correctly applied`);
      console.log(`   4. Adjust text box sizes if text has expanded`);
    }
    console.log(`   5. Review layout and make any necessary adjustments`);

  } catch (error) {
    console.error('❌ Error downloading translation:', error instanceof Error ? error.message : error);
    
    // Provide helpful error context
    if (error instanceof Error) {
      if (error.message.includes('not completed')) {
        console.log('\n💡 Tip: Translation may not be ready yet');
        console.log('   Wait for translators to complete their work, then try again');
      } else if (error.message.includes('webhook')) {
        console.log('\n💡 Tip: Check your webhook configuration in .env file');
      }
    }
    
    process.exit(1);
  }
}

downloadTranslation();
