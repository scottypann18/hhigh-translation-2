# IDML Translation Tool - Web Interface

A simple web frontend for submitting IDML files for translation.

## Quick Start

1. **Install dependencies** (if not already done):
   ```bash
   npm install
   ```

2. **Start the web server**:
   ```bash
   npm run server
   ```

3. **Open your browser**:
   Navigate to `http://localhost:3000`

## Features

### Web Interface
- 📤 **File Upload**: Drag and drop or select IDML files
- 🌍 **Language Selection**: Choose from 16+ supported languages
- 📊 **Batch Processing**: Optional start/end index for large files
- ✅ **Real-time Feedback**: See submission status and Google Doc link
- 📋 **Copy Download Command**: Easy access to the download command

### Supported Languages
- English (en, en-US, en-GB)
- Spanish (es), French (fr), German (de)
- Portuguese (pt), Italian (it), Russian (ru)
- Chinese (zh), Japanese (ja), Korean (ko)
- Arabic (ar), Persian (fa), Hebrew (he), Urdu (ur)

### Automatic Features
- ✨ **Dual Parser Detection**: Automatically extracts both standard and XML-structured text boxes
- 🔄 **Text Direction**: Automatically applies RTL/LTR based on language
- 📏 **Font Scaling**: Automatically adjusts font size based on language expansion factors
- ⚠️ **Smart Warnings**: Alerts for RTL languages and high expansion factors

## Usage

### Submit via Web Interface

1. Select your IDML file from the `input/` folder
2. Choose source language (e.g., "English")
3. Choose target language (e.g., "Persian")
4. (Optional) Specify text box range for large files
5. Click "Submit for Translation"
6. Copy the Google Doc ID from the response
7. Complete translation in Google Docs
8. Use the download command shown in the result

### Submit via CLI (Alternative)

You can still use the command-line interface:

```bash
npm run submit -- input/document.idml en fa
```

### Download Translated File

After completing translation in Google Docs, download the translated IDML:

```bash
npm run download -- input/document.idml <google-doc-id> fa
```

## API Endpoints

### POST `/api/submit`
Submit an IDML file for translation.

**Request:**
- Content-Type: `multipart/form-data`
- Fields:
  - `file`: IDML file
  - `sourceLang`: Source language code
  - `targetLang`: Target language code
  - `startIndex` (optional): Start index for batch processing
  - `endIndex` (optional): End index for batch processing

**Response:**
```json
{
  "googleDocId": "1BxiMVs...",
  "googleDocUrl": "https://docs.google.com/...",
  "textBoxCount": 310,
  "standardCount": 7,
  "xmlCount": 303,
  "filename": "HHIGH.idml",
  "targetLang": "fa",
  "warnings": [...]
}
```

### GET `/api/health`
Check server status and configuration.

**Response:**
```json
{
  "status": "ok",
  "submitWebhook": true,
  "downloadWebhook": true
}
```

## Environment Variables

Make sure your `.env` file contains:

```env
TRANSLATION_SUBMIT_WEBHOOK_URL=https://hook.us1.make.com/...
TRANSLATION_DOWNLOAD_WEBHOOK_URL=https://hook.us1.make.com/...
WEBHOOK_TIMEOUT=600000
PORT=3000
```

## Architecture

```
public/
├── index.html      # Main web interface
├── style.css       # Styling
└── script.js       # Client-side logic

src/
├── server.ts       # Express server
└── services/       # Translation services
```

## Workflow

1. **Upload IDML** → Web interface sends to Express server
2. **Parse File** → Dual parsers extract all text boxes
3. **Submit to Webhook** → Creates Google Doc with text boxes
4. **Translate** → Complete translation in Google Docs
5. **Download** → Use CLI to download translated IDML

## Technical Details

- **Server**: Express.js with TypeScript
- **File Upload**: Multer (50MB limit)
- **Parsing**: JSZip + xml2js
- **Frontend**: Vanilla JavaScript (no framework)
- **Styling**: Modern CSS with CSS variables

## Troubleshooting

**Port already in use:**
```bash
# Change port in .env
PORT=3001
```

**File upload fails:**
- Check file is valid IDML (InDesign file)
- Ensure file size is under 50MB
- Verify webhook URLs are configured in `.env`

**Submission succeeds but no Google Doc:**
- Check Make.com webhook is running
- Verify webhook URL is correct
- Check webhook timeout (default: 10 minutes)

## Development

**Run in development mode with auto-reload:**
```bash
npm run server
```

**Build and run production:**
```bash
npm run server:build
```

**Test CLI scripts:**
```bash
npm run pre-run -- input/document.idml
npm run submit -- input/document.idml en fa
npm run download -- input/document.idml <doc-id> fa
```
