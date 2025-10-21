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

async function submitTranslation() {
  const args = process.argv.slice(2);
  
  if (args.length < 3) {
    console.log('Usage: npm run submit -- <idml-file> <source-language> <target-language>');
    console.log('');
    console.log('Examples:');
    console.log('  npm run submit -- input/document.idml en fa');
    console.log('  npm run submit -- input/brochure.idml en ar');
    console.log('');
    console.log('Supported languages:');
    const languages = LanguageConfigManager.getAllSupportedLanguages();
    languages.forEach(lang => {
      const direction = lang.direction === 'RightToLeftDirection' ? 'RTL' : 'LTR';
      console.log(`  ${lang.code.padEnd(4)} - ${lang.name} (${direction})`);
    });
    process.exit(1);
  }

  const [filePath, sourceLanguage, targetLanguage] = args;

  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    // Validate languages
    if (!LanguageConfigManager.isLanguageSupported(sourceLanguage)) {
      console.error(`❌ Unsupported source language: ${sourceLanguage}`);
      process.exit(1);
    }

    if (!LanguageConfigManager.isLanguageSupported(targetLanguage)) {
      console.error(`❌ Unsupported target language: ${targetLanguage}`);
      process.exit(1);
    }

    console.log('🔄 Submitting IDML file for translation...');
    console.log(`📄 File: ${filePath}`);
    console.log(`🌐 ${sourceLanguage} → ${targetLanguage}`);
    
    const webhookConfig = getWebhookConfig();
    const service = new TranslationService(webhookConfig);
    
    const idmlBuffer = fs.readFileSync(filePath);
    const filename = path.basename(filePath);
    
    const result = await service.submitIdmlForTranslation(
      idmlBuffer,
      sourceLanguage,
      targetLanguage,
      filename
    );

    console.log('✅ Translation submitted successfully!');
    console.log(`📊 Text boxes sent: ${result.textBoxCount}`);
    console.log(`📄 Filename: ${filename}`);
    console.log(`🌐 Target language: ${targetLanguage}`);
    
    if (result.warnings && result.warnings.length > 0) {
      console.log('\n⚠️  Warnings:');
      result.warnings.forEach(warning => console.log(`   ${warning}`));
    }
    
    console.log('\n📝 Next steps:');
    console.log(`   1. Wait for human translators to complete the work in Google Docs`);
    console.log(`   2. Download translations: npm run download -- ${filePath} ${targetLanguage}`);

  } catch (error) {
    console.error('❌ Error submitting translation:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

submitTranslation();
