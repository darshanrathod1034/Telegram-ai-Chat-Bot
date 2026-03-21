const Message = require('../models/Message');
const Conversation = require('../models/Conversation');

const CONTEXT_MESSAGE_LIMIT = 8;

const ContextService = {
  async buildContext(userId, chatId) {
    const messages = await Message.getRecent(userId, chatId, CONTEXT_MESSAGE_LIMIT);
    
    if (messages.length === 0) {
      return null;
    }
    
    return messages.map(m => ({
      role: m.role,
      content: m.contentPreview || m.aiResponsePreview || '',
      created_at: m.createdAt
    }));
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

  async getFullContext(conversationId, userId, chatId) {
    const context = await this.buildContext(userId, chatId);
    const conversation = await Conversation.findById(conversationId);
    
    return {
      messages: context || [],
      summary: conversation?.summary || null,
      messageCount: conversation?.messageCount || 0,
      intentType: conversation?.intentType || null
    };
  }
};

module.exports = ContextService;
