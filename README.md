# IDML Translation Tool

A TypeScript-based tool for extracting text from Adobe InDesign IDML files, sending it for human translation in Google Docs via webhooks and make.com, and creating translated IDML files with proper RTL/LTR support. Note there is no UI it is designed to run using the CLI.

## Features

- 📄 Extract text from IDML files
- 🌐 Support for 14+ languages with automatic RTL/LTR detection
- 🔄 Webhook integration for translation workflow
- 📝 Automatic text direction setting for RTL languages
- 🎨 Preserves InDesign formatting and structure

## Setup

1. Install dependencies:
```bash
npm install
```

2. Configure your webhooks in `.env`:
```bash
TRANSLATION_SUBMIT_WEBHOOK_URL=https://your-make-scenario.com/submit
TRANSLATION_DOWNLOAD_WEBHOOK_URL=https://your-make-scenario.com/status
```

3. Build the project:
```bash
npm run build

```
4. To see avaible commmands and quick start
```bash
npm start

```
## Workflow

### 1. Check Text Box Count (Pre-Run)

Before submitting, check how many text boxes are in your IDML file:

```bash
npm run pre-run -- input/document.idml
```

This will show:
```
📄 Analyzing: document.idml

📊 Total text boxes: 457
```

For large files (100+ text boxes), consider submitting in batches to avoid timeouts.

### 2. Submit IDML for Translation

Extract text and send to your webhook (which sends to Google Docs for human translation):

```bash
npm run submit -- input/document.idml en fa
```

- `input/document.idml` - Path to your IDML file
- `en` - Source language code
- `fa` - Target language code (Persian/Farsi in this example)

**For large files, submit in batches:**

```bash
npm run submit -- input/document.idml en fa 0 49
npm run submit -- input/document.idml en fa 50 99
npm run submit -- input/document.idml en fa 100 149
```

This submits text boxes 0-49, 50-99, and 100-149 respectively.

### 3. Download Translated IDML

Once translation is complete in Google Docs, create the translated IDML using the Google Doc ID:

```bash
npm run download -- input/document.idml 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms fa
```

- `input/document.idml` - Path to your original IDML file
- `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms` - Google Doc ID (from the URL)
- `fa` - Target language code

This will:
- Fetch translations from your Google Doc via webhook
- Apply translations to the IDML structure
- Set correct text direction (RTL for fa/ar/he/ur)
- Save to `output/document_fa.idml` (uses original filename + language code)

## Supported Languages

### Left-to-Right (LTR)
- English (en), Spanish (es), French (fr), German (de)
- Portuguese (pt), Italian (it), Russian (ru)
- Chinese (zh), Japanese (ja), Korean (ko)

### Right-to-Left (RTL)
- Arabic (ar), Persian/Farsi (fa), Hebrew (he), Urdu (ur)

### Example webhook response:
```json
{
  "id": "1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms",
  "status": "completed",
  "translatedTextBoxes": [
    {
      "id": "textbox-1",
      "translatedContent": "ترجمه شده متن",
      "language": "fa"
    }
  ]
}
```

## Notes

- Text extraction works with Type Tool text boxes
- RTL languages automatically get proper text direction
- Font recommendations available for each language
- Text expansion factors help predict layout changes
