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
 * Extracts resume data using Ollama (local LLM)
 */
async function extractWithOllama(rawText) {
  const prompt = `Please extract the following information from the given resume text and return ONLY valid JSON (no additional text):

{
  "resume": {
    "contact": {
      "name": "string",
      "email": "string", 
      "phone": "string",
      "address": "string"
    },
    "objective": "string",
    "education": [
      {
        "degree": "string",
        "major": "string",
        "university": "string",
        "year": "string"
      }
    ],
    "work_experience": [
      {
        "title": "string",
        "company": "string",
        "location": "string",
        "year": "string",
        "responsibilities": ["string"]
      }
    ],
    "skills": ["string"],
    "certifications": [
      {
        "name": "string",
        "issuing_organization": "string",
        "year": "string"
      }
    ]
  }
}

Raw Resume Text:
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
 * Extracts resume data using NVIDIA OpenAI API
 */
async function extractWithNVIDIA(rawText) {
  const prompt = `Please extract the following information from the given resume text and return ONLY valid JSON (no additional text):

{
  "resume": {
    "contact": {
      "name": "string",
      "email": "string", 
      "phone": "string",
      "address": "string"
    },
    "objective": "string",
    "education": [
      {
        "degree": "string",
        "major": "string",
        "university": "string",
        "year": "string"
      }
    ],
    "work_experience": [
      {
        "title": "string",
        "company": "string",
        "location": "string",
        "year": "string",
        "responsibilities": ["string"]
      }
    ],
    "skills": ["string"],
    "certifications": [
      {
        "name": "string",
        "issuing_organization": "string",
        "year": "string"
      }
    ]
  }
}

Raw Resume Text:
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
 * Extracts structured resume data from raw text
 * Uses NVIDIA by default, falls back to Ollama
 * @param {string} rawText - The raw resume text from user input
 * @param {Object} options - Configuration options
 * @param {string} options.provider - 'nvidia' or 'ollama' (default: 'nvidia')
 * @returns {Promise<Object>} - Structured JSON object with extracted resume data
 */
async function extractResumeData(rawText, options = {}) {
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
 * @param {string} rawText - The raw resume text
 * @param {Object} options - Configuration options
 * @returns {Promise<string>} - JSON string with extracted data
 */
async function extractResumeDataAsString(rawText, options = {}) {
  const data = await extractResumeData(rawText, options);
  return JSON.stringify(data, null, 4);
}

// Example usage
async function main() {
  const rawResumeText = `
John Doe
john.doe@example.com
123-456-7890

Objective: Software Engineer with 5 years experience

Education:
B.Sc. Computer Science, MIT, 2015-2019

Work Experience:
Software Developer, Tech Corp, 2019-Present
- Built web applications
- Led team of 5 developers

Skills:
JavaScript
Python
Node.js
  `;

  try {
    console.log("Extracting resume data using NVIDIA API (default)...\n");
    
    const result = await extractResumeDataAsString(rawResumeText);
    console.log(result);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Export functions for use in other modules
module.exports = {
  extractResumeData,
  extractResumeDataAsString,
};

// Run if called directly
if (require.main === module) {
  main();
}
