#!/usr/bin/env tsx
import dotenv from 'dotenv';
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

async function checkStatus() {
  const args = process.argv.slice(2);
  
  if (args.length < 2) {
    console.log('Usage: npm run check-status -- <filename> <target-language>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run check-status -- test_hhigh.idml fa');
    console.log('  npm run check-status -- document.idml ar');
    console.log('');
    console.log('Supported languages:');
    const languages = LanguageConfigManager.getAllSupportedLanguages();
    languages.forEach(lang => {
      const direction = lang.direction === 'RightToLeftDirection' ? 'RTL' : 'LTR';
      console.log(`  ${lang.code.padEnd(4)} - ${lang.name} (${direction})`);
    });
    process.exit(1);
  }

  const [filename, targetLanguage] = args;

  try {
    // Validate language
    if (!LanguageConfigManager.isLanguageSupported(targetLanguage)) {
      console.error(`❌ Unsupported target language: ${targetLanguage}`);
      process.exit(1);
    }

    console.log('🔍 Checking translation status...');
    console.log(`📄 Filename: ${filename}`);
    console.log(`🌐 Target Language: ${targetLanguage}`);
    
    const webhookConfig = getWebhookConfig();
    const service = new TranslationService(webhookConfig);
    
    const status = await service.checkTranslationStatus(filename, targetLanguage);

    console.log(`\n📊 Status: ${status.status}`);
    
    switch (status.status) {
      case 'pending':
        console.log('⏳ Translation is still in progress...');
        console.log('   Human translators are working on your document.');
        break;
        
      case 'completed':
        console.log('✅ Translation completed!');
        console.log(`📝 Translated text boxes: ${status.translatedTextBoxes.length}`);
        console.log('\n🎯 Ready to download:');
        console.log(`   npm run download -- input/${filename} ${targetLanguage}`);
        
        // Show sample of translations
        if (status.translatedTextBoxes.length > 0) {
          console.log('\n📖 Sample translations:');
          status.translatedTextBoxes.slice(0, 3).forEach((tb, index) => {
            const preview = tb.translatedContent.length > 50 
              ? tb.translatedContent.substring(0, 50) + '...'
              : tb.translatedContent;
            console.log(`   ${index + 1}. "${preview}"`);
          });
          
          if (status.translatedTextBoxes.length > 3) {
            console.log(`   ... and ${status.translatedTextBoxes.length - 3} more`);
          }
        }
        break;
        
      case 'failed':
        console.log('❌ Translation failed');
        if (status.error) {
          console.log(`   Error: ${status.error}`);
        }
        break;
        
      default:
        console.log(`❓ Unknown status: ${status.status}`);
    }

  } catch (error) {
    console.error('❌ Error checking translation status:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

checkStatus();
