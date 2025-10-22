#!/usr/bin/env tsx
import dotenv from 'dotenv';
import { LanguageConfigManager } from './config/languages.js';

// Load environment variables
dotenv.config();

function showHelp() {
  console.log('📋 Available Commands:');
  console.log('');
  console.log('1. Submit for translation:');
  console.log('   npm run submit -- <idml-file> <source-lang> <target-lang>');
  console.log('   Example: npm run submit -- input/document.idml en fa');
  console.log('');
  console.log('2. Download completed translation:');
  console.log('   npm run download -- <original-file> <google-doc-id> <target-lang>');
  console.log('   Example: npm run download -- input/document.idml 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms fa');
  console.log('');
  console.log('📁 Folder Structure:');
  console.log('   input/  - Place your original IDML files here');
  console.log('   output/ - Translated IDML files will be saved here');
  console.log('');
  console.log('🚀 Quick Start:');
  console.log('   1. Place an IDML file in the input/ folder');
  console.log('   2. npm run submit -- input/yourfile.idml en fa');
  console.log('   3. Complete translation in Google Doc');
  console.log('   4. npm run download -- input/yourfile.idml <google-doc-id> fa');
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
