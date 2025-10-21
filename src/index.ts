#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { LanguageConfigManager } from './config/languages.js';

// Load environment variables
dotenv.config();

function showHelp() {
  console.log('🌐 IDML Translation Service');
  console.log('============================');
  console.log('');
  console.log('A TypeScript tool for extracting text from InDesign IDML files,');
  console.log('sending it to translation webhooks, and creating updated IDML files');
  console.log('with proper RTL/LTR text direction support.');
  console.log('');
  console.log('📋 Available Commands:');
  console.log('');
  console.log('1. Extract text from IDML:');
  console.log('   npm run extract -- <idml-file>');
  console.log('   Example: npm run extract -- input/document.idml');
  console.log('');
  console.log('2. Submit for translation:');
  console.log('   npm run submit -- <idml-file> <source-lang> <target-lang>');
  console.log('   Example: npm run submit -- input/document.idml en fa');
  console.log('');
  console.log('3. Check translation status:');
  console.log('   npm run check-status -- <translation-id> <target-lang>');
  console.log('   Example: npm run check-status -- abc123-def456 fa');
  console.log('');
  console.log('4. Download completed translation:');
  console.log('   npm run download -- <original-file> <translation-id> <target-lang>');
  console.log('   Example: npm run download -- input/document.idml abc123-def456 fa');
  console.log('');
  console.log('🌍 Supported Languages:');
  console.log('');
  
  const rtlLanguages = LanguageConfigManager.getRTLLanguages();
  const ltrLanguages = LanguageConfigManager.getLTRLanguages();
  
  console.log('📝 Left-to-Right (LTR) Languages:');
  ltrLanguages.forEach(lang => {
    console.log(`   ${lang.code.padEnd(4)} - ${lang.name}`);
  });
  
  console.log('');
  console.log('📝 Right-to-Left (RTL) Languages:');
  rtlLanguages.forEach(lang => {
    console.log(`   ${lang.code.padEnd(4)} - ${lang.name}`);
  });
  
  console.log('');
  console.log('⚙️  Configuration:');
  console.log('   Create a .env file with your webhook configuration:');
  console.log('   TRANSLATION_SUBMIT_WEBHOOK_URL=https://your-service.com/submit');
  console.log('   TRANSLATION_STATUS_WEBHOOK_URL=https://your-service.com/status');
  console.log('   WEBHOOK_AUTH_HEADER=Bearer your-token (optional)');
  console.log('   WEBHOOK_API_KEY=your-api-key (optional)');
  console.log('');
  console.log('📁 Folder Structure:');
  console.log('   input/  - Place your original IDML files here');
  console.log('   output/ - Translated IDML files will be saved here');
  console.log('');
  console.log('� Quick Start:');
  console.log('   1. Place an IDML file in the input/ folder');
  console.log('   2. npm run extract -- input/yourfile.idml');
  console.log('   3. npm run submit -- input/yourfile.idml en fa');
  console.log('   4. Wait for translation completion');
  console.log('   5. npm run download -- input/yourfile.idml <translation-id> fa');
}

async function main() {
  const args = process.argv.slice(2);
  
  if (args.length === 0 || args.includes('--help') || args.includes('-h')) {
    showHelp();
    return;
  }
  
  // Check if environment is configured
  const submitUrl = process.env.TRANSLATION_SUBMIT_WEBHOOK_URL;
  const statusUrl = process.env.TRANSLATION_STATUS_WEBHOOK_URL;
  
  if (!submitUrl || !statusUrl) {
    console.log('⚠️  Environment not configured');
    console.log('Please create a .env file with your webhook URLs.');
    console.log('See .env.example for reference.');
    console.log('');
    showHelp();
    return;
  }
  
  console.log('✅ Environment configured - use npm run scripts for operations');
  showHelp();
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Process interrupted');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Process terminated');
  process.exit(0);
});

main().catch(error => {
  console.error('❌ Error:', error);
  process.exit(1);
});
