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
    console.error('❌ Error: see README for download script instructions');
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

    // Save report
    const reportPath = `${outputPath}.report.json`;
    fs.writeFileSync(reportPath, JSON.stringify(result.report, null, 2));

    console.log('✅ Translation downloaded successfully!');

  } catch (error) {
    console.error('❌ Error downloading translation:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

downloadTranslation();
