# AI Telegram Bot with PDF Generation

A complete Telegram bot that uses AI to generate resumes and booking PDFs with conversation storage.

## Features

- 💼 Generate professional resumes from raw text
- 🏨 Generate BAPS Utara booking requests from raw text
- 💬 AI chat using NVIDIA OpenAI API (with Ollama fallback)
- 📊 **Conversation storage** with PostgreSQL
- 🔄 **15-day automatic data retention** for privacy
- 📈 **Basic analytics** for usage tracking

## Database Features

- **User tracking**: Captures user info from Telegram (name, username, language)
- **Conversation history**: Stores conversations by intent type
- **Message previews**: Stores first 500 chars of each message
- **AI context**: Maintains conversation context for better responses
- **PDF generation tracking**: Stores extracted resume/booking data
- **Daily stats**: Aggregated analytics for dashboard

## Tech Stack

- **Runtime**: Node.js + Express
- **AI**: NVIDIA OpenAI API / Ollama
- **PDF**: PDFKit
- **Database**: PostgreSQL (Render Free Tier)
- **Deployment**: Render

## Project Structure

```
├── server.js                    # Main bot server with DB integration
├── database/
│   ├── connection.js            # PostgreSQL connection pool
│   ├── migrations.js            # Database schema migrations
│   ├── cleanup.js               # 15-day retention cleanup
│   └── index.js                 # DB exports
├── models/
│   ├── User.js                  # User model
│   ├── Conversation.js          # Conversation model
│   ├── Message.js               # Message model
│   ├── PDFGeneration.js          # PDF generation tracking
│   ├── DailyStats.js            # Daily statistics
│   └── index.js                 # Model exports
├── services/
│   ├── contextService.js        # AI context building
│   ├── analyticsService.js      # Analytics and stats
│   └── index.js                 # Service exports
├── extractResume.js             # Resume data extraction
├── extractBooking.js            # Booking data extraction
├── generateResumePDF.js         # Resume PDF generator
├── generateBookingPDF.js        # Booking PDF generator
├── render.yaml                  # Render deployment (with PostgreSQL)
├── Procfile                     # Render release command
└── package.json                 # Dependencies
```

## Database Schema

### users
- `id` (BIGINT, PK) - Telegram user ID
- `username`, `first_name`, `last_name`, `language_code`
- `created_at`, `updated_at`, `last_seen_at`

### conversations
- `id` (UUID, PK)
- `user_id` (FK), `chat_id`, `intent_type`
- `status`, `message_count`, `summary`
- `context_window` (JSONB) - Last 10 messages for AI
- Timestamps

### messages
- `id` (UUID, PK)
- `conversation_id` (FK), `user_id` (FK)
- `telegram_message_id`, `role`, `intent_detected`
- `content_preview` (500 chars), `ai_response_preview` (500 chars)
- Timestamps

### pdf_generations
- `id` (UUID, PK)
- `conversation_id` (FK), `user_id` (FK)
- `pdf_type` ('resume' | 'booking')
- `extracted_data` (JSONB) - Extracted structured data
- `filename`, `created_at`

### daily_stats
- `date` (PK)
- `new_users`, `active_users`, `total_messages`
- `resume_pdfs`, `booking_pdfs`, `general_chats`

## Deployment to Render

### Prerequisites

1. **GitHub Repository** - Push your code to GitHub
2. **Render Account** - Sign up at https://render.com
3. **NVIDIA API Key** - Get from https://build.nvidia.com/explore/discover
4. **Telegram Bot Token** - Get from @BotFather

### Quick Deploy (Recommended)

1. Fork this repo to GitHub
2. Go to https://dashboard.render.com/blueprints
3. Click "New Blueprint Instance"
4. Connect your GitHub repo
5. Render will automatically:
   - Create PostgreSQL database
   - Create web service
   - Set `DATABASE_URL` environment variable

### Manual Deploy

1. Go to https://dashboard.render.com
2. Create PostgreSQL: New → PostgreSQL → Free tier
3. Copy the connection string
4. Create Web Service: New → Web Service
5. Connect your GitHub repo
6. Add environment variables:
   - `TELEGRAM_TOKEN`
   - `NVIDIA_API_KEY`
   - `SERVER_URL` (your service URL)
   - `DATABASE_URL` (from step 2)
7. Deploy!

### Post-Deployment Setup

Visit to set webhook:
```
https://your-app.onrender.com/setup-webhook
```

## Local Development

### 1. Install PostgreSQL

**macOS:**
```bash
brew install postgresql
brew services start postgresql
```

**Ubuntu/Debian:**
```bash
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Create Database

```bash
psql postgres
CREATE DATABASE telegram_bot;
CREATE USER telegram_user WITH ENCRYPTED PASSWORD 'your_password';
GRANT ALL PRIVILEGES ON DATABASE telegram_bot TO telegram_user;
\q
```

### 3. Configure .env

```bash
cp .env.example .env
# Edit .env with your values
```

```env
TELEGRAM_TOKEN=your_token
NVIDIA_API_KEY=your_key
DATABASE_URL=postgresql://telegram_user:your_password@localhost:5432/telegram_bot
SERVER_URL=http://localhost:3000
```

### 4. Run

```bash
npm install
npm run db:migrate  # Run migrations
npm start           # Start server
```

## NPM Scripts

```bash
npm start           # Start the bot
npm run db:migrate  # Run database migrations
npm run db:cleanup  # Run 15-day cleanup manually
npm run db:stats    # Show basic statistics
npm run db:reset    # Drop all tables (careful!)
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/` | GET | Health check |
| `/health` | GET | Detailed health with DB status |
| `/stats` | GET | Basic statistics |
| `/admin/stats` | GET | Full dashboard data |
| `/setup-webhook` | GET | Setup Telegram webhook |
| `/webhook` | POST | Telegram webhook handler |
| `/admin/cleanup` | POST | Trigger 15-day cleanup |

## Data Retention

- **Messages**: 15 days
- **Conversations**: 15 days
- **PDF generation records**: 15 days
- **User records**: Retained (last_seen updated)
- **Daily stats**: Retained indefinitely

Cleanup runs automatically. Manual trigger: `POST /admin/cleanup`

## Privacy

- Only stores essential metadata (no full Telegram payloads)
- Message content limited to 500 character previews
- Extracted data stored for PDF generation history
- 15-day automatic deletion

## License

ISC
