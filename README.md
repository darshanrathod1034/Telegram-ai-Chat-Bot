# AI Telegram Bot with PDF Generation

A complete Telegram bot that uses AI (Ollama local LLM or Gemini API) to:
- 💼 Generate professional resumes from raw text
- 🏨 Generate BAPS Utara booking requests from raw text
- 💬 General AI chat .

## Features

- **Telegram Webhook Integration** - Receives messages from Telegram
- **Dual AI Provider Support** - Use Ollama (local) or Gemini API (cloud)
- **Resume PDF Generation** - Converts text to professional resume PDF
- **Booking PDF Generation** - Creates BAPS Utara booking request PDFs
- **Intent Detection** - Automatically detects if user wants resume, booking, or chat

## Prerequisites

1. **Node.js** - Install from https://nodejs.org
2. **Telegram Bot Token** - Get from @BotFather
3. **Ollama** (optional) - For local AI: https://ollama.ai
4. **Gemini API Key** (optional) - For cloud AI: https://aistudio.google.com/app/apikey

## Installation

```bash
# Install dependencies
npm install
```

## Configuration

Edit `.env` file:

```env
# Required: Your Telegram Bot Token from @BotFather
TELEGRAM_TOKEN=your_actual_token_here

# Optional: Gemini API Key (leave blank to use Ollama only)
GEMINI_API_KEY=your_gemini_api_key

# Ollama settings (for local LLM)
OLLAMA_MODEL=qwen2.5-coder
OLLAMA_BASE_URL=http://localhost:11434

# Your server URL (required for webhooks)
# Use ngrok for local testing: https://ngrok.com/
SERVER_URL=https://your-domain.com

PORT=3000
```

## Setup

### 1. Start Ollama (if using local LLM)

```bash
ollama serve
ollama pull qwen2.5-coder  # or any model you prefer
```

### 2. Start the server

```bash
npm start
```

### 3. Set up Telegram Webhook

For the bot to receive messages, you need to set the webhook:

**Option A: Using the setup endpoint**
Visit: `https://your-server.com/setup-webhook`

**Option B: Using Telegram API**
```bash
curl -X POST "https://api.telegram.org/bot<YOUR_TOKEN>/setWebhook" \
  -d "url=https://your-server.com/webhook"
```

**For local testing with ngrok:**
```bash
# Start ngrok
ngrok http 3000

# Copy the ngrok URL and set it in .env as SERVER_URL
# Then visit /setup-webhook
```

## Usage

### Start the bot

```bash
npm start
```

### Bot Commands

- `/start` - Welcome message
- `/help` - Help information

### How it works

1. **Send resume details** - The bot extracts info and generates a PDF resume
2. **Send booking details** - The bot creates a BAPS Utara booking PDF
3. **Any other message** - Chat with AI (Ollama or Gemini)

### Example Resume Input:
```
Name: John Doe
Email: john@example.com
Phone: 1234567890
Education: B.Sc Computer Science, MIT, 2020
Experience: Software Developer at Tech Corp, 2020-Present
Skills: JavaScript, Python, Node.js
```

### Example Booking Input:
```
Name : Upadhyay Dharmesh
Places : Gandhidham
Mobile Number : 9999999999
Arrival Date : 29/06/2025 6:30 AM
Departure Date : 30/06/2025 10:00 PM
Gent's : 01
Ladies : 02
Room (Non-Ac)
Sant Reference: Sadhu Achalmunidas
```

## Project Structure

```
├── server.js                 # Main Express server
├── extractResume.js          # Resume text extraction (Ollama)
├── extractBooking.js         # Booking text extraction (Ollama)
├── generateResumePDF.js      # Resume PDF generator
├── generateBookingPDF.js     # Booking PDF generator
├── .env                      # Environment variables
└── package.json              # Dependencies
```

## Troubleshooting

### "Connection refused" for Ollama
- Make sure Ollama is running: `ollama serve`
- Or use Gemini API by setting `GEMINI_API_KEY` in `.env`

### Webhook not working
- Make sure your server URL is publicly accessible
- Use ngrok for local testing
- Check Telegram bot privacy settings

### PDF not sending
- Make sure file size is under Telegram's 50MB limit
- Check console for errors

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Server health |
| `/webhook` | POST | Telegram webhook |
| `/setup-webhook` | GET | Set Telegram webhook |
| `/remove-webhook` | GET | Remove webhook |

## Customization

### Change the AI Model

In `.env`:
```env
OLLAMA_MODEL=llama3
# or
OLLAMA_MODEL=mistral
```

### Add more PDF templates

Add new functions in separate files following the existing pattern:
1. Create `extractXXX.js` - Extract data using Ollama
2. Create `generateXXXPDF.js` - Generate PDF
3. Import and use in `server.js`

## License

ISC
#
