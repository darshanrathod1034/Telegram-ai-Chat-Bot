const axios = require('axios');
const OpenAI = require('openai');

const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'qwen2.5-coder';
const OLLAMA_BASE_URL = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;

// Initialize OpenAI with NVIDIA API
const openai = new OpenAI({
  apiKey: NVIDIA_API_KEY,
  baseURL: 'https://integrate.api.nvidia.com/v1',
});

/**
 * Extracts booking data using Ollama (local LLM)
 */
async function extractWithOllama(rawText) {
  const prompt = `Please extract the following information from the given hotel booking request text and return ONLY valid JSON (no additional text):

{
  "booking": {
    "guest_name": "string",
    "places": "string",
    "mobile_number": "string",
    "arrival_date": "string",
    "arrival_time": "string",
    "departure_date": "string",
    "departure_time": "string",
    "gentlemen_count": "number",
    "ladies_count": "number",
    "room_type": "string",
    "reference": "string"
  }
}

Raw Booking Request Text:
${rawText}

Extracted JSON:`;

  const response = await axios.post(`${OLLAMA_BASE_URL}/api/generate`, {
    model: OLLAMA_MODEL,
    prompt: prompt,
    stream: false
  });
  
  let jsonString = response.data.response.trim();
  
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/^```\n/, "").replace(/\n```$/, "");
  }
  
  return JSON.parse(jsonString);
}

/**
 * Extracts booking data using NVIDIA OpenAI API
 */
async function extractWithNVIDIA(rawText) {
  const prompt = `Please extract the following information from the given hotel booking request text and return ONLY valid JSON (no additional text):

{
  "booking": {
    "guest_name": "string",
    "places": "string",
    "mobile_number": "string",
    "arrival_date": "string",
    "arrival_time": "string",
    "departure_date": "string",
    "departure_time": "string",
    "gentlemen_count": "number",
    "ladies_count": "number",
    "room_type": "string",
    "reference": "string"
  }
}

Raw Booking Request Text:
${rawText}

Extracted JSON (just the JSON, no explanation):`;

  const completion = await openai.chat.completions.create({
    model: "openai/gpt-oss-20b",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.1,
    max_tokens: 2048,
    stream: false
  });
  
  let jsonString = completion.choices[0].message.content.trim();
  
  if (jsonString.startsWith("```json")) {
    jsonString = jsonString.replace(/^```json\n/, "").replace(/\n```$/, "");
  } else if (jsonString.startsWith("```")) {
    jsonString = jsonString.replace(/^```\n/, "").replace(/\n```$/, "");
  }
  
  return JSON.parse(jsonString);
}

/**
 * Extracts structured hotel booking data from raw text
 * Uses NVIDIA by default, falls back to Ollama
 * @param {string} rawText - The raw booking request text from user input
 * @param {Object} options - Configuration options
 * @param {string} options.provider - 'nvidia' or 'ollama' (default: 'nvidia')
 * @returns {Promise<Object>} - Structured JSON object with extracted booking data
 */
async function extractBookingData(rawText, options = {}) {
  const { provider = 'nvidia' } = options;

  try {
    // Try NVIDIA first (default)
    if (provider === 'nvidia' && NVIDIA_API_KEY) {
      return await extractWithNVIDIA(rawText);
    }
    
    // Fallback to Ollama
    return await extractWithOllama(rawText);
  } catch (error) {
    console.error('Extraction error:', error.message);
    
    // If primary fails, try fallback
    if (provider === 'nvidia' && NVIDIA_API_KEY) {
      try {
        console.log('NVIDIA failed, trying Ollama...');
        return await extractWithOllama(rawText);
      } catch (ollamaError) {
        throw new Error(`Both NVIDIA and Ollama failed: ${ollamaError.message}`);
      }
    } else {
      throw new Error(`Extraction failed: ${error.message}`);
    }
  }
}

/**
 * Wrapper function that returns JSON string
 * @param {string} rawText - The raw booking request text
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - JSON string with extracted data
 */
async function extractBookingDataAsString(rawText, options = {}) {
  const data = await extractBookingData(rawText, options);
  return JSON.stringify(data, null, 4);
}

// Example usage
async function main() {
  const rawBookingText = `
Name : Upadhyay. Dharmesh .Ramesh bhai
Places : Gandhidham
Mobile Number : 9999999999
Arrival Date :29/06/2025 6:30 AM
Departure Date : 30/06/2025  10: 00 pm
Gent's : 01
Ladies : 02
Room (Non-Ac)
Sant Reference: Sadhu Achalmunidas
  `;

  try {
    console.log("Extracting booking data using NVIDIA API (default)...\n");
    
    const result = await extractBookingDataAsString(rawBookingText);
    console.log(result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Export functions for use in other modules
module.exports = {
  extractBookingData,
  extractBookingDataAsString,
};

// Run if called directly
if (require.main === module) {
  main();
}
