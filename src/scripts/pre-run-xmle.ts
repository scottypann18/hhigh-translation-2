#!/usr/bin/env tsx
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { IdmlParserXML } from '../services/IdmlParserXML.js';

// Load environment variables
dotenv.config();

async function preRunXML() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('❌ Error: Please provide an IDML file path');
    console.error('Usage: npm run pre-run-xmle -- <file>');
    console.error('Example: npm run pre-run-xmle -- input/HHIGH.idml');
    process.exit(1);
  }

  const [filePath] = args;

  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`📄 Analyzing XML-structured IDML: ${path.basename(filePath)}`);
    
    const idmlParser = new IdmlParserXML();
    const idmlBuffer = fs.readFileSync(filePath);
    
    await idmlParser.loadIdmlFile(idmlBuffer);
    const document = await idmlParser.parseDocument();
    
    console.log(`\n📊 Total text boxes: ${document.textBoxes.length}`);

  } catch (error) {
    console.error('❌ Error analyzing file:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

preRunXML();
