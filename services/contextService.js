const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const CONTEXT_MESSAGE_LIMIT = 8;
const SUMMARY_TRIGGER_MESSAGES = 5;

const ContextService = {
  async buildContext(userId, chatId) {
    const messages = await Message.getRecent(userId, chatId, CONTEXT_MESSAGE_LIMIT);
    
    if (messages.length === 0) {
      return null;
    }
    
    const context = messages.map(m => ({
      role: m.role,
      content: m.content_preview || m.ai_response_preview || '',
      created_at: m.created_at
    }));
    
    return context;
  },

  async buildContextString(userId, chatId) {
    const context = await this.buildContext(userId, chatId);
    
    if (!context || context.length === 0) {
      return '';
    }
    
    return context.map(m => `${m.role}: ${m.content}`).join('\n');
  },

  async updateConversationContext(conversationId, userId, chatId) {
    const context = await this.buildContext(userId, chatId);
    
    if (context) {
      await Conversation.updateContextWindow(conversationId, context);
    }
    
    return context;
  },

  async shouldGenerateSummary(conversationId) {
    const conversation = await Conversation.findById(conversationId);
    
    if (!conversation) return false;
    
    return conversation.message_count >= SUMMARY_TRIGGER_MESSAGES && 
           !conversation.summary;
  },

  async generateSummary(messages) {
    const messageTexts = messages.map(m => 
      `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content_preview || m.ai_response_preview || ''}`
    ).join('\n');
    
    const summaryPrompt = `Summarize this conversation in 1-2 sentences:
    
${messageTexts}

Summary (brief, capturing the main topic/goal):`;
    
    return summaryPrompt;
  },

  async getFullContext(conversationId, userId, chatId) {
    const context = await this.buildContext(userId, chatId);
    const conversation = await Conversation.findById(conversationId);
    
    return {
      messages: context || [],
      summary: conversation?.summary || null,
      messageCount: conversation?.message_count || 0,
      intentType: conversation?.intent_type || null
    };
  }
};

module.exports = ContextService;
