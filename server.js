require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

const { testConnection, runMigrations } = require('./database');
const { User, Conversation, Message, PDFGeneration, DailyStats } = require('./models');
const { ContextService, AnalyticsService } = require('./services');

const app = express();
app.use(express.json());

const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const SERVER_URL = process.env.SERVER_URL || 'https://your-domain.com';

const openai = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

const telegramAPI = (method) => `https://api.telegram.org/bot${TELEGRAM_TOKEN}/${method}`;

async function sendMessage(chatId, text, parseMode = 'Markdown') {
  try {
    await axios.post(telegramAPI('sendMessage'), {
      chat_id: chatId,
      text: text,
      parse_mode: parseMode
    });
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
  }
}

async function sendDocument(chatId, buffer, filename = 'document.pdf') {
  try {
    const FormData = require('form-data');
    const formData = new FormData();
    formData.append('chat_id', chatId);
    formData.append('document', buffer, { filename });

    await axios.post(telegramAPI('sendDocument'), formData, {
      headers: formData.getHeaders()
    });
  } catch (error) {
    console.error('Error sending document:', error.response?.data || error.message);
  }
}

async function askOllama(prompt) {
  try {
    const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
      model: OLLAMA_MODEL,
      prompt: prompt,
      stream: false
    });
    return response.data.response;
  } catch (error) {
    console.error('Ollama error:', error.message);
    throw new Error(`Ollama failed: ${error.message}`);
  }
}

async function askNVIDIA(prompt) {
  if (!NVIDIA_API_KEY) {
    throw new Error('NVIDIA API key not configured');
  }

  try {
    const completion = await openai.chat.completions.create({
      model: "openai/gpt-oss-20b",
      messages: [{ role: "user", content: prompt }],
      temperature: 0.5,
      max_tokens: 4096,
      stream: false
    });
    
    return completion.choices[0].message.content;
  } catch (error) {
    console.error('NVIDIA API error:', error.message);
    throw new Error(`NVIDIA API failed: ${error.message}`);
  }
}

async function askAI(prompt, context = '') {
  if (NVIDIA_API_KEY) {
    try {
      return await askNVIDIA(prompt);
    } catch (nvidiaError) {
      console.log('NVIDIA failed, trying Ollama...');
    }
  }

  try {
    return await askOllama(prompt);
  } catch (ollamaError) {
    throw new Error(`Both NVIDIA and Ollama failed. NVIDIA: ${NVIDIA_API_KEY ? 'configured' : 'not configured'}. Ollama: ${ollamaError.message}`);
  }
}

async function extractAndGenerateResume(userText, conversationId, userId, chatId) {
  const extractedData = await require('./extractResume')(userText);
  console.log('✅ Resume data extracted:', JSON.stringify(extractedData, null, 2));
  
  await require('./models/Message').create({
    conversationId,
    userId,
    telegramMessageId: null,
    role: 'assistant',
    intentDetected: 'resume',
    content: null,
    aiResponse: 'Resume data extracted successfully'
  });
  
  await PDFGeneration.createResume({
    conversationId,
    userId,
    extractedData: extractedData.resume
  });
  
  await DailyStats.incrementResumePDF();
  
  const pdfBuffer = await require('./generateResumePDF')(extractedData);
  
  return pdfBuffer;
}

async function extractAndGenerateBooking(userText, conversationId, userId, chatId) {
  const extractedData = await require('./extractBooking')(userText);
  console.log('✅ Booking data extracted:', JSON.stringify(extractedData, null, 2));
  
  await require('./models/Message').create({
    conversationId,
    userId,
    telegramMessageId: null,
    role: 'assistant',
    intentDetected: 'booking',
    content: null,
    aiResponse: 'Booking data extracted successfully'
  });
  
  await PDFGeneration.createBooking({
    conversationId,
    userId,
    extractedData: extractedData.booking
  });
  
  await DailyStats.incrementBookingPDF();
  
  const pdfBuffer = await require('./generateBookingPDF')(extractedData);
  
  return pdfBuffer;
}

function detectIntent(text) {
  const lowerText = text.toLowerCase();
  
  const resumeKeywords = ['resume', 'cv', 'curriculum', 'bio data', 'make resume', 'create resume', 'generate resume'];
  const bookingKeywords = ['booking', 'book', 'utara', 'baps', 'hotel', 'room', 'stay', 'guest', 'arrival', 'departure'];
  
  for (const keyword of resumeKeywords) {
    if (lowerText.includes(keyword)) return 'resume';
  }
  
  for (const keyword of bookingKeywords) {
    if (lowerText.includes(keyword)) return 'booking';
  }
  
  return 'general';
}

async function handleUserMessage(message, user, res) {
  const { id: chatId, type: chatType } = message.chat;
  const { id: userId, username, first_name, last_name, language_code } = message.from;
  const userText = message.text;
  const telegramMessageId = message.message_id;

  console.log(`\n📩 Message from ${first_name} (${chatId}): ${userText}`);

  if (userText === '/start') {
    await sendMessage(chatId, 
      `Welcome to AI Bot! 🤖\n\n` +
      `I can help you with:\n` +
      `• 💼 Creating professional resumes\n` +
      `• 🏨 Booking BAPS Utara (Hotel)\n` +
      `• 💬 General conversations\n\n` +
      `Just send me your details and I'll help you!`
    );
    return res.send('OK');
  }

  if (userText === '/help') {
    await sendMessage(chatId,
      `📖 *Help*\n\n` +
      `*For Resume:*\n` +
      `Send your resume details (name, education, experience, skills, etc.)\n\n` +
      `*For BAPS Utara Booking:*\n` +
      `Send booking details:\n` +
      `- Name\n` +
      `- Places\n` +
      `- Mobile Number\n` +
      `- Arrival Date & Time\n` +
      `- Departure Date & Time\n` +
      `- Number of Gents/Ladies\n` +
      `- Room Type\n` +
      `- Reference\n\n` +
      `*For Chat:*\n` +
      `Just ask me anything!`
    );
    return res.send('OK');
  }

  const intent = detectIntent(userText);

  await axios.post(telegramAPI('sendChatAction'), {
    chat_id: chatId,
    action: 'typing'
  });

  let conversationId = null;
  let conversation = null;

  if (intent !== 'general') {
    conversation = await Conversation.getOrCreateActive(userId, chatId, intent);
    conversationId = conversation.id;
  }

  await Message.createUserMessage({
    conversationId,
    userId,
    telegramMessageId,
    content: userText,
    intentDetected: intent
  });

  await DailyStats.incrementMessage();
  await DailyStats.incrementGeneralChat();

  if (conversation) {
    await Conversation.incrementMessageCount(conversationId);
  }

  if (intent === 'resume') {
    await sendMessage(chatId, `📄 I understand you want to create a resume. Processing your details...`);
    
    try {
      const pdfBuffer = await extractAndGenerateResume(userText, conversationId, userId, chatId);
      await sendMessage(chatId, `✅ Resume data extracted! Now generating PDF...`);
      await sendDocument(chatId, pdfBuffer, 'resume.pdf');
      await sendMessage(chatId, `✅ Your resume is ready! 📄`);
    } catch (error) {
      console.error('Resume error:', error);
      await sendMessage(chatId, `❌ Sorry, I couldn't process your resume request. Error: ${error.message}`);
    }
    
  } else if (intent === 'booking') {
    await sendMessage(chatId, `🏨 I understand you want to make a BAPS Utara booking. Processing your details...`);
    
    try {
      const pdfBuffer = await extractAndGenerateBooking(userText, conversationId, userId, chatId);
      await sendMessage(chatId, `✅ Booking details extracted! Now generating PDF...`);
      await sendDocument(chatId, pdfBuffer, 'booking-request.pdf');
      await sendMessage(chatId, `✅ Your booking request is ready! 🏨`);
    } catch (error) {
      console.error('Booking error:', error);
      await sendMessage(chatId, `❌ Sorry, I couldn't process your booking request. Error: ${error.message}`);
    }
    
  } else {
    const contextString = await ContextService.buildContextString(userId, chatId);
    
    let systemPrompt = `You are a helpful AI assistant. Always greet the user with "Jay Swaminarayan 🙏". Respond to the user's message in a friendly and concise manner.`;
    
    if (contextString) {
      systemPrompt += `\n\nPrevious conversation:\n${contextString}`;
    }
    
    const fullPrompt = `${systemPrompt}\n\nUser: ${userText}\n\nAssistant:`;
    
    try {
      const response = await askAI(fullPrompt);
      
      await Message.createAssistantMessage({
        conversationId: conversationId,
        userId,
        aiResponse: response
      });
      
      if (conversationId) {
        await Conversation.addMessageToContext(conversationId, {
          role: 'assistant',
          content: response ? response.substring(0, 500) : ''
        });
      }
      
      await sendMessage(chatId, response);
    } catch (error) {
      await sendMessage(chatId, 
        `Sorry, I couldn't process your request. ` +
        `Make sure NVIDIA API is configured or Ollama is running.\n\n` +
        `Error: ${error.message}`
      );
    }
  }

  return res.send('OK');
}

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    
    if (!message || !message.text) {
      return res.send('OK');
    }

    const { id: userId, username, first_name, last_name, language_code } = message.from;
    
    try {
      const { user } = await User.findOrCreate({
        id: userId,
        username,
        first_name,
        last_name,
        language_code
      });

      await DailyStats.incrementNewUser();
      
      await handleUserMessage(message, user, res);
    } catch (dbError) {
      console.log('Database not available, proceeding without storage:', dbError.message);
      await handleUserMessage(message, null, res);
    }
  } catch (error) {
    console.error('Webhook error:', error);
    res.send('OK');
  }
});

app.post('/callback-query', async (req, res) => {
  try {
    const callbackQuery = req.body.callback_query;
    
    if (!callbackQuery) {
      return res.send('OK');
    }

    const { id: queryId, data, from, message } = callbackQuery;
    const chatId = message.chat.id;
    const userId = from.id;

    console.log(`Callback query from ${from.first_name}: ${data}`);

    await axios.post(telegramAPI('answerCallbackQuery'), {
      callback_query_id: queryId,
      text: 'Processing...'
    });

    res.send('OK');
  } catch (error) {
    console.error('Callback query error:', error);
    res.send('OK');
  }
});

app.get('/setup-webhook', async (req, res) => {
  try {
    const webhookUrl = `${SERVER_URL}/webhook`;
    
    const response = await axios.post(telegramAPI('setWebhook'), {
      url: webhookUrl
    });
    
    res.json({
      success: true,
      message: 'Webhook set successfully',
      webhookUrl: webhookUrl,
      response: response.data
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

app.get('/remove-webhook', async (req, res) => {
  try {
    const response = await axios.post(telegramAPI('deleteWebhook'));
    res.json({
      success: true,
      message: 'Webhook removed',
      response: response.data
    });
  } catch (error) {
    res.json({
      success: false,
      error: error.response?.data || error.message
    });
  }
});

app.get('/stats', async (req, res) => {
  try {
    const stats = await AnalyticsService.getBasicStats();
    res.json({ success: true, stats });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/admin/stats', async (req, res) => {
  try {
    const dashboardData = await AnalyticsService.getDashboardData();
    res.json({ success: true, data: dashboardData });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.post('/admin/cleanup', async (req, res) => {
  try {
    const { cleanupOldData } = require('./database/cleanup');
    const result = await cleanupOldData();
    res.json({ success: true, result });
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

app.get('/health', async (req, res) => {
  let dbStatus = 'not configured';
  
  try {
    if (process.env.DATABASE_URL) {
      const connected = await testConnection();
      dbStatus = connected ? 'connected' : 'disconnected';
    }
  } catch (error) {
    dbStatus = 'error';
  }

  res.json({ 
    status: 'healthy',
    bot: 'AI Telegram Bot',
    database: dbStatus,
    features: ['Resume PDF Generation', 'BAPS Utara Booking PDF', 'AI Chat'],
    providers: {
      nvidia: NVIDIA_API_KEY ? 'configured' : 'not configured',
      ollama: OLLAMA_MODEL
    }
  });
});

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    bot: 'AI Telegram Bot',
    features: ['Resume PDF Generation', 'BAPS Utara Booking PDF', 'AI Chat', 'Conversation Storage'],
    providers: {
      nvidia: NVIDIA_API_KEY ? 'configured' : 'not configured',
      ollama: OLLAMA_MODEL
    },
    database: process.env.DATABASE_URL ? 'configured' : 'not configured'
  });
});

const PORT = process.env.PORT || 3000;

const startServer = async () => {
  if (process.env.DATABASE_URL) {
    try {
      console.log('🔌 Testing database connection...');
      const connected = await testConnection();
      
      if (connected) {
        console.log('✅ Database connected successfully');
        console.log('🚀 Running migrations...');
        await runMigrations();
        console.log('✅ Migrations completed');
      }
    } catch (error) {
      console.log('⚠️  Database connection failed:', error.message);
      console.log('📝 Bot will run without database storage');
    }
  } else {
    console.log('⚠️  DATABASE_URL not configured');
    console.log('📝 Bot will run without database storage');
  }

  app.listen(PORT, () => {
    console.log(`
╔═══════════════════════════════════════════════════════╗
║     🤖 AI Telegram Bot Server Running                ║
╠═══════════════════════════════════════════════════════╣
║  Port: ${PORT}
║  Telegram: /webhook endpoint ready
║  NVIDIA API: ${NVIDIA_API_KEY ? '✅ Configured' : '❌ Not configured'}
║  Ollama: ${OLLAMA_MODEL} (fallback)
║  Database: ${process.env.DATABASE_URL ? '✅ Connected' : '❌ Not configured'}
╚═══════════════════════════════════════════════════════╝

📋 To set webhook, visit:
   ${SERVER_URL}/setup-webhook

📊 Stats endpoint: ${SERVER_URL}/stats

💬 To chat, send a message to your Telegram bot!
    `);
  });
};

startServer();

module.exports = app;
