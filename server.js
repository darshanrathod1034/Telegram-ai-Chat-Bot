require('dotenv').config();
const express = require('express');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const OpenAI = require('openai');

// Import our existing modules
const { extractResumeData } = require('./extractResume');
const { generateResumePDFBuffer } = require('./generateResumePDF');
const { extractBookingData } = require('./extractBooking');
const { generateBookingPDFBuffer } = require('./generateBookingPDF');
const { console } = require('inspector');

const app = express();
app.use(express.json());

// ============ CONFIGURATION ============
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN || 'YOUR_TELEGRAM_BOT_TOKEN';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const SERVER_URL = process.env.SERVER_URL || 'https://your-domain.com';

// Initialize OpenAI with NVIDIA API
const openai = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

// ============ TELEGRAM API HELPERS ============
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
    const formData = new (require('form-data'))();
    formData.append('chat_id', chatId);
    formData.append('document', buffer, { filename });

    await axios.post(telegramAPI('sendDocument'), formData, {
      headers: formData.getHeaders()
    });
  } catch (error) {
    console.error('Error sending document:', error.response?.data || error.message);
  }
}

async function sendPhoto(chatId, buffer, caption = '') {
  try {
    const formData = new (require('form-data'))();
    formData.append('chat_id', chatId);
    formData.append('photo', buffer, { filename: 'image.jpg' });
    if (caption) formData.append('caption', caption);

    await axios.post(telegramAPI('sendPhoto'), formData, {
      headers: formData.getHeaders()
    });
  } catch (error) {
    console.error('Error sending photo:', error.response?.data || error.message);
  }
}

// ============ AI PROVIDERS ============

// Option 1: Use Ollama (local LLM)
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

// Option 2: Use NVIDIA OpenAI API
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

// Main AI function - tries NVIDIA first, falls back to Ollama
async function askAI(prompt, preferProvider = 'nvidia') {
  // Try NVIDIA first (user preference)
  if (NVIDIA_API_KEY) {
    try {
      return await askNVIDIA(prompt);
    } catch (nvidiaError) {
      console.log('NVIDIA failed, trying Ollama...');
    }
  }

  // Fallback to Ollama
  try {
    return await askOllama(prompt);
  } catch (ollamaError) {
    throw new Error(`Both NVIDIA and Ollama failed. NVIDIA: ${NVIDIA_API_KEY ? 'configured' : 'not configured'}. Ollama: ${ollamaError.message}`);
  }
}

// ============ PDF GENERATION FUNCTIONS ============

async function generateResumePDF(data) {
  const buffer = await generateResumePDFBuffer(data);
  return buffer;
}

async function generateBookingPDF(data) {
  const buffer = await generateBookingPDFBuffer(data);
  return buffer;
}

// ============ INTENT DETECTION ============

function detectIntent(text) {
  const lowerText = text.toLowerCase();
  
  // Resume detection keywords
  const resumeKeywords = ['resume', 'cv', 'curriculum', 'bio data', 'make resume', 'create resume', 'generate resume'];
  
  // Booking detection keywords  
  const bookingKeywords = ['booking', 'book', 'utara', 'baps', 'hotel', 'room', 'stay', 'guest', 'arrival', 'departure'];
  
  // Check for resume
  for (const keyword of resumeKeywords) {
    if (lowerText.includes(keyword)) {
      return 'resume';
    }
  }
  
  // Check for booking
  for (const keyword of bookingKeywords) {
    if (lowerText.includes(keyword)) {
      return 'booking';
    }
  }
  
  return 'general';
}

// ============ WEBHOOK HANDLER ============

app.post('/webhook', async (req, res) => {
  try {
    const message = req.body.message;
    
    if (!message || !message.text) {
      return res.send('OK');
    }
    console.log("log req.body", req.body);
    const chatId = message.chat.id;
    const userText = message.text;
    const userName = message.from.first_name || 'User';

    console.log(`\n📩 Message from ${userName} (${chatId}): ${userText}`);

    // Check for special commands
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

    // Detect what user wants
    const intent = detectIntent(userText);
    
    // Show typing indicator
    await axios.post(telegramAPI('sendChatAction'), {
      chat_id: chatId,
      action: 'typing'
    });

    if (intent === 'resume') {
      // Handle resume request
      await sendMessage(chatId, `📄 I understand you want to create a resume. Processing your details...`);
      
      try {
        const extractedData = await extractResumeData(userText);
        console.log('✅ Resume data extracted:', JSON.stringify(extractedData, null, 2));
        
        await sendMessage(chatId, `✅ Resume data extracted! Now generating PDF...`);
        
        const pdfBuffer = await generateResumePDF(extractedData);
        
        await sendDocument(chatId, pdfBuffer, 'resume.pdf');
        await sendMessage(chatId, `✅ Your resume is ready! 📄`);
        
      } catch (error) {
        console.error('Resume error:', error);
        await sendMessage(chatId, `❌ Sorry, I couldn't process your resume request. Error: ${error.message}`);
      }
      
    } else if (intent === 'booking') {
      // Handle booking request
      await sendMessage(chatId, `🏨 I understand you want to make a BAPS Utara booking. Processing your details...`);
      
      try {
        const extractedData = await extractBookingData(userText);
        console.log('✅ Booking data extracted:', JSON.stringify(extractedData, null, 2));
        
        await sendMessage(chatId, `✅ Booking details extracted! Now generating PDF...`);
        
        const pdfBuffer = await generateBookingPDF(extractedData);
        
        await sendDocument(chatId, pdfBuffer, 'booking-request.pdf');
        await sendMessage(chatId, `✅ Your booking request is ready! 🏨`);
        
      } catch (error) {
        console.error('Booking error:', error);
        await sendMessage(chatId, `❌ Sorry, I couldn't process your booking request. Error: ${error.message}`);
      }
      
    } else {
      // General chat - use AI
      const systemPrompt = `You are a helpful AI assistant. Respond to the user's message in a friendly and concise manner. and always greet the user with "Jay Swaminarayan 🙏"`;
      const fullPrompt = `${systemPrompt}\n\nUser: ${userText}\n\nAssistant:`;
      
      try {
        const response = await askAI(fullPrompt);
        await sendMessage(chatId, response);
      } catch (error) {
        await sendMessage(chatId, 
          `Sorry, I couldn't process your request. ` +
          `Make sure NVIDIA API is configured or Ollama is running.\n\n` +
          `Error: ${error.message}`
        );
      }
    }

    res.send('OK');
  } catch (error) {
    console.error('Webhook error:', error);
    res.send('OK'); // Always respond OK to Telegram
  }
});

// ============ SETUP WEBHOOK ============

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

// ============ HEALTH CHECK ============

app.get('/', (req, res) => {
  res.json({
    status: 'running',
    bot: 'AI Telegram Bot',
    features: ['Resume PDF Generation', 'BAPS Utara Booking PDF', 'AI Chat'],
    providers: {
      nvidia: NVIDIA_API_KEY ? 'configured' : 'not configured',
      ollama: OLLAMA_MODEL
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// ============ START SERVER ============

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`
╔═══════════════════════════════════════════╗
║     🤖 AI Telegram Bot Server Running     ║
╠═══════════════════════════════════════════╣
║  Port: ${PORT}
║  Telegram: /webhook endpoint ready
║  NVIDIA API: ${NVIDIA_API_KEY ? '✅ Configured' : '❌ Not configured'}
║  Ollama: ${OLLAMA_MODEL} (fallback)
╚═══════════════════════════════════════════╝

📋 To set webhook, visit:
   ${SERVER_URL}/setup-webhook

💬 To chat, send a message to your Telegram bot!
  `);
});

module.exports = app;

