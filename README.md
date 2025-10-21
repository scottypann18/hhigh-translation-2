# IDML Translation Tool

A TypeScript-based tool for extracting text from Adobe InDesign IDML files, sending it for human translation via webhooks, and creating translated IDML files with proper RTL/LTR support.

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
TRANSLATION_STATUS_WEBHOOK_URL=https://your-make-scenario.com/status
```

3. Build the project:
```bash
npm run build
```

## Workflow

### 1. Submit IDML for Translation

Extract text and send to your webhook (which sends to Google Docs for human translation):

```bash
npm run submit -- input/document.idml en fa
```

- `input/document.idml` - Path to your IDML file
- `en` - Source language code
- `fa` - Target language code (Persian/Farsi in this example)

### 2. Download Translated IDML

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
- Save to `output/hhigh_fa.idml` (filename is auto-generated as `hhigh_[language].idml`)

## Supported Languages

### Left-to-Right (LTR)
- English (en), Spanish (es), French (fr), German (de)
- Portuguese (pt), Italian (it), Russian (ru)
- Chinese (zh), Japanese (ja), Korean (ko)

### Right-to-Left (RTL)
- Arabic (ar), Persian/Farsi (fa), Hebrew (he), Urdu (ur)

## Webhook Requirements

### Submit Webhook (TRANSLATION_SUBMIT_WEBHOOK_URL)
Receives the text boxes and should send them to Google Docs for human translation.

### Status Webhook (TRANSLATION_STATUS_WEBHOOK_URL)
Receives a Google Doc ID and language, should extract translations from the Google Doc.

Query parameters sent:
- `docId` - The Google Doc ID
- `language` - The target language code

Example webhook response:
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

## Scripts

- `npm run extract -- <file>` - Extract text only (no submission)
- `npm run submit -- <file> <from> <to>` - Submit for translation
- `npm run download -- <file> <doc-id> <lang>` - Download completed translation and create IDML
- `npm run debug-idml -- <file>` - Debug IDML structure

## Example Complete Workflow

```bash
# 1. Submit document for Persian translation
npm run submit -- input/hhigh.idml en fa

# 2. Wait for human translators to complete work in Google Docs
#    (Your Make.com scenario handles this)
#    Copy the Google Doc ID from the URL

# 3. Download the translated file using the Google Doc ID
npm run download -- input/hhigh.idml 1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms fa

# 4. Output is automatically saved to: output/hhigh_fa.idml
# 5. Open output/hhigh_fa.idml in Adobe InDesign
```

## Notes

- Text extraction works with Type Tool text boxes
- RTL languages automatically get proper text direction
- Font recommendations available for each language
- Text expansion factors help predict layout changes
