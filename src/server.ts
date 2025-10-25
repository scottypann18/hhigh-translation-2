import express from 'express';
import multer from 'multer';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { promises as fs } from 'fs';
import { TranslationService } from './services/TranslationService.js';
import { WebhookService } from './services/WebhookService.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = parseInt(process.env.PORT || '3000', 10);

// Configure multer for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    if (path.extname(file.originalname).toLowerCase() === '.idml') {
      cb(null, true);
    } else {
      cb(new Error('Only IDML files are allowed'));
    }
  }
});

// Middleware
app.use(express.json());

// Initialize services
const translationService = new TranslationService({
  submitUrl: process.env.TRANSLATION_SUBMIT_WEBHOOK_URL || '',
  statusUrl: process.env.TRANSLATION_DOWNLOAD_WEBHOOK_URL || '',
  timeout: parseInt(process.env.WEBHOOK_TIMEOUT || '600000', 10)
});

// API endpoint for analyzing IDML files (pre-run)
app.post('/api/analyze', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Use the translation service to parse the file
    const { IdmlParser } = await import('./services/IdmlParser.js');
    const { IdmlParserXML } = await import('./services/IdmlParserXML.js');
    
    const standardParser = new IdmlParser();
    const xmlParser = new IdmlParserXML();

    // Parse with both parsers
    await standardParser.loadIdmlFile(req.file.buffer);
    const standardDocument = await standardParser.parseDocument();
    
    await xmlParser.loadIdmlFile(req.file.buffer);
    const xmlDocument = await xmlParser.parseDocument();
    
    // Count unique text boxes
    const existingIds = new Set(standardDocument.textBoxes.map(tb => tb.id));
    let xmlCount = 0;
    
    for (const xmlTextBox of xmlDocument.textBoxes) {
      if (!existingIds.has(xmlTextBox.id)) {
        xmlCount++;
      }
    }

    res.json({
      filename: req.file.originalname,
      standardCount: standardDocument.textBoxes.length,
      xmlCount: xmlCount,
      totalCount: standardDocument.textBoxes.length + xmlCount
    });

  } catch (error: any) {
    console.error('Analyze error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to analyze file'
    });
  }
});

// API endpoint for submitting translations
app.post('/api/submit', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const { sourceLang, targetLang, startIndex, endIndex } = req.body;

    if (!sourceLang || !targetLang) {
      return res.status(400).json({ error: 'Source and target languages are required' });
    }

    if (sourceLang === targetLang) {
      return res.status(400).json({ error: 'Source and target languages must be different' });
    }

    // Parse optional indices
    const start = startIndex ? parseInt(startIndex, 10) : undefined;
    const end = endIndex ? parseInt(endIndex, 10) : undefined;

        // Submit for translation
    const response = await translationService.submitIdmlForTranslation(
      req.file.buffer,
      sourceLang,
      targetLang,
      req.file.originalname,
      start,
      end
    );

    // The webhook response should include googleDocId and googleDocUrl
    // These come from the Make.com webhook
    const report = response.report as any;
    
    res.json({
      googleDocId: report.googleDocId || 'pending',
      googleDocUrl: report.googleDocUrl || '',
      textBoxCount: response.textBoxCount,
      standardCount: report.standardCount || 0,
      xmlCount: report.xmlCount || 0,
      filename: req.file.originalname,
      targetLang,
      range: start !== undefined || end !== undefined ? { start, end } : null,
      warnings: response.warnings
    });

  } catch (error: any) {
    console.error('Submit error:', error);
    res.status(500).json({ 
      error: error.message || 'Failed to submit translation'
    });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    submitWebhook: !!process.env.TRANSLATION_SUBMIT_WEBHOOK_URL,
    downloadWebhook: !!process.env.TRANSLATION_DOWNLOAD_WEBHOOK_URL
  });
});

// Serve static files from public directory (after API routes)
app.use(express.static(path.join(__dirname, '../public')));

// Start server
app.listen(port, '0.0.0.0', () => {
  console.log(`\n🚀 IDML Translation Frontend`);
  console.log(`\n📍 Server running at: http://0.0.0.0:${port}`);
  console.log(`\n✅ Environment configured:`);
  console.log(`   Submit webhook: ${process.env.TRANSLATION_SUBMIT_WEBHOOK_URL ? '✓' : '✗'}`);
  console.log(`   Download webhook: ${process.env.TRANSLATION_DOWNLOAD_WEBHOOK_URL ? '✓' : '✗'}`);
  console.log(`\n💡 Open http://localhost:${port} in your browser to get started\n`);
});

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Server shutting down...');
  process.exit(0);
});
