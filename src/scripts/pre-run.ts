#!/usr/bin/env tsx
import dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';
import { IdmlParser } from '../services/IdmlParser.js';
import { IdmlParserXML } from '../services/IdmlParserXML.js';

// Load environment variables
dotenv.config();

async function preRun() {
  const args = process.argv.slice(2);
  
  if (args.length < 1) {
    console.error('❌ Error: Please provide an IDML file path');
    console.error('Usage: npm run pre-run -- <file>');
    console.error('Example: npm run pre-run -- input/fly.idml');
    process.exit(1);
  }

  const [filePath] = args;

  try {
    // Validate file exists
    if (!fs.existsSync(filePath)) {
      console.error(`❌ File not found: ${filePath}`);
      process.exit(1);
    }

    console.log(`📄 Analyzing: ${path.basename(filePath)}`);
    
    const idmlParser = new IdmlParser();
    const idmlParserXML = new IdmlParserXML();
    const idmlBuffer = fs.readFileSync(filePath);
    
    // Parse with both parsers
    await idmlParser.loadIdmlFile(idmlBuffer);
    const standardDocument = await idmlParser.parseDocument();
    
    await idmlParserXML.loadIdmlFile(idmlBuffer);
    const xmlDocument = await idmlParserXML.parseDocument();
    
    // Combine text boxes from both parsers, removing duplicates by ID
    const allTextBoxes = [...standardDocument.textBoxes];
    const existingIds = new Set(standardDocument.textBoxes.map(tb => tb.id));
    
    for (const xmlTextBox of xmlDocument.textBoxes) {
      if (!existingIds.has(xmlTextBox.id)) {
        allTextBoxes.push(xmlTextBox);
      }
    }
    
    console.log(`\n📊 Found ${standardDocument.textBoxes.length} standard text boxes + ${xmlDocument.textBoxes.length} XML text boxes = ${allTextBoxes.length} total`);

  } catch (error) {
    console.error('❌ Error analyzing file:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

preRun();
