import express from 'express';
import multer from 'multer';
import cors from 'cors';
import { TranslationService } from '../services/TranslationService.js';
import { LanguageConfigManager } from '../config/languages.js';
export class ApiServer {
    app;
    translationService;
    constructor(webhookConfig) {
        this.app = express();
        this.translationService = new TranslationService(webhookConfig);
        this.setupMiddleware();
        this.setupRoutes();
    }
    setupMiddleware() {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(express.urlencoded({ extended: true }));
    }
    setupRoutes() {
        // Configure multer for file uploads
        const upload = multer({
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 50 * 1024 * 1024 // 50MB limit
            },
            fileFilter: (req, file, cb) => {
                if (file.mimetype === 'application/zip' || file.originalname.endsWith('.idml')) {
                    cb(null, true);
                }
                else {
                    cb(new Error('Only IDML files are allowed'));
                }
            }
        });
        // Health check endpoint
        this.app.get('/health', (req, res) => {
            res.json({ status: 'healthy', timestamp: new Date().toISOString() });
        });
        // Get supported languages
        this.app.get('/languages', (req, res) => {
            const allLanguages = LanguageConfigManager.getAllSupportedLanguages();
            const rtlLanguages = LanguageConfigManager.getRTLLanguages();
            const ltrLanguages = LanguageConfigManager.getLTRLanguages();
            res.json({
                success: true,
                languages: {
                    all: allLanguages,
                    rtl: rtlLanguages,
                    ltr: ltrLanguages
                },
                total: allLanguages.length
            });
        });
        // Extract text boxes from IDML file
        this.app.post('/extract', upload.single('idml'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No IDML file uploaded' });
                }
                const textBoxes = await this.translationService.extractTextOnly(req.file.buffer);
                res.json({
                    success: true,
                    filename: req.file.originalname,
                    textBoxCount: textBoxes.length,
                    textBoxes
                });
            }
            catch (error) {
                console.error('Error extracting text:', error);
                res.status(500).json({
                    error: 'Failed to extract text from IDML file',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Submit IDML file for translation (sends to Google Doc workflow)
        this.app.post('/submit', upload.single('idml'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No IDML file uploaded' });
                }
                const { sourceLanguage, targetLanguage } = req.body;
                if (!sourceLanguage || !targetLanguage) {
                    return res.status(400).json({
                        error: 'sourceLanguage and targetLanguage are required'
                    });
                }
                const result = await this.translationService.submitIdmlForTranslation(req.file.buffer, sourceLanguage, targetLanguage, req.file.originalname);
                res.json({
                    success: true,
                    translationId: result.translationId,
                    textBoxCount: result.textBoxCount,
                    message: 'Translation submitted successfully. Text has been sent for human translation.',
                    report: result.report,
                    warnings: result.warnings
                });
            }
            catch (error) {
                console.error('Error submitting translation:', error);
                res.status(500).json({
                    error: 'Failed to submit translation request',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Check translation status
        this.app.get('/status/:translationId', async (req, res) => {
            try {
                const { translationId } = req.params;
                const { language } = req.query;
                if (!language || typeof language !== 'string') {
                    return res.status(400).json({
                        error: 'language query parameter is required'
                    });
                }
                const status = await this.translationService.checkTranslationStatus(translationId, language);
                res.json({
                    success: true,
                    translationId,
                    status: status.status,
                    translatedTextBoxes: status.translatedTextBoxes,
                    error: status.error
                });
            }
            catch (error) {
                console.error('Error checking translation status:', error);
                res.status(500).json({
                    error: 'Failed to check translation status',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Get completed translation and download updated IDML file
        this.app.post('/download/:translationId', upload.single('idml'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'Original IDML file required' });
                }
                const { translationId } = req.params;
                const { language } = req.body;
                if (!language) {
                    return res.status(400).json({
                        error: 'language parameter is required'
                    });
                }
                const result = await this.translationService.getCompletedTranslation(req.file.buffer, translationId, language, req.file.originalname);
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="translated_${req.file.originalname}"`);
                res.send(result.translatedFile);
            }
            catch (error) {
                console.error('Error downloading translated file:', error);
                res.status(500).json({
                    error: 'Failed to generate translated IDML file',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Full workflow: submit and wait for translation completion (for automation)
        this.app.post('/translate', upload.single('idml'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No IDML file uploaded' });
                }
                const { sourceLanguage, targetLanguage } = req.body;
                if (!sourceLanguage || !targetLanguage) {
                    return res.status(400).json({
                        error: 'Source and target languages are required'
                    });
                }
                const result = await this.translationService.translateIdmlFile(req.file.buffer, sourceLanguage, targetLanguage, req.file.originalname);
                // Set headers for file download
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace('.idml', '_translated.idml')}"`);
                res.setHeader('X-Translation-Report', JSON.stringify(result.report));
                res.send(result.translatedFile);
            }
            catch (error) {
                console.error('Error translating file:', error);
                res.status(500).json({
                    error: 'Failed to translate IDML file',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
        // Update IDML file with provided translations
        this.app.post('/update', upload.single('idml'), async (req, res) => {
            try {
                if (!req.file) {
                    return res.status(400).json({ error: 'No IDML file uploaded' });
                }
                const { translations } = req.body;
                if (!translations || !Array.isArray(translations)) {
                    return res.status(400).json({
                        error: 'Translations array is required'
                    });
                }
                const updatedFile = await this.translationService.updateIdmlWithTranslations(req.file.buffer, translations);
                // Set headers for file download
                res.setHeader('Content-Type', 'application/zip');
                res.setHeader('Content-Disposition', `attachment; filename="${req.file.originalname.replace('.idml', '_updated.idml')}"`);
                res.send(updatedFile);
            }
            catch (error) {
                console.error('Error updating file:', error);
                res.status(500).json({
                    error: 'Failed to update IDML file',
                    details: error instanceof Error ? error.message : 'Unknown error'
                });
            }
        });
    }
    start(port = 3000) {
        this.app.listen(port, () => {
            console.log(`🚀 Translation API server running on port ${port}`);
            console.log(`📝 API endpoints:`);
            console.log(`   GET  /health - Health check`);
            console.log(`   GET  /languages - Get supported languages`);
            console.log(`   POST /extract - Extract text from IDML`);
            console.log(`   POST /submit - Submit IDML for translation (to Google Doc)`);
            console.log(`   GET  /status/:translationId?language=lang - Check translation status`);
            console.log(`   POST /download/:translationId - Download translated IDML file`);
            console.log(`   POST /translate - Full workflow: submit + wait + download`);
            console.log(`   POST /update - Update IDML with provided translations`);
        });
    }
    getApp() {
        return this.app;
    }
}
//# sourceMappingURL=server.js.map