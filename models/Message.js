const { prisma } = require('../database/prisma');

const Message = {
  async create({ conversationId, userId, telegramMessageId, role, intentDetected, content, aiResponse }) {
    const contentPreview = content ? content.substring(0, 500) : null;
    const aiResponsePreview = aiResponse ? aiResponse.substring(0, 500) : null;
    
    return await prisma.message.create({
      data: {
        conversationId,
        userId: BigInt(userId),
        telegramMessageId: telegramMessageId ? BigInt(telegramMessageId) : null,
        role,
        intentDetected,
        contentPreview,
        aiResponsePreview
      }
    });
  },

  async createUserMessage({ conversationId, userId, telegramMessageId, content, intentDetected }) {
    return await this.create({
      conversationId,
      userId,
      telegramMessageId,
      role: 'user',
      intentDetected,
      content,
      aiResponse: null
    });
  },

  async createAssistantMessage({ conversationId, userId, aiResponse }) {
    return await this.create({
      conversationId,
      userId,
      telegramMessageId: null,
      role: 'assistant',
      intentDetected: null,
      content: null,
      aiResponse
    });
  },

  async findById(id) {
    return await prisma.message.findUnique({
      where: { id }
    });
  },

  async getRecent(userId, chatId, limit = 8) {
    const messages = await prisma.message.findMany({
      where: {
        conversation: {
          userId: BigInt(userId),
          chatId: BigInt(chatId)
        }
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
      include: {
        conversation: {
          select: {
            intentType: true,
            chatId: true
          }
        }
      }
    });
    return messages.reverse();
  },

  async getRecentByConversation(conversationId, limit = 10) {
    const messages = await prisma.message.findMany({
      where: { conversationId },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
    return messages.reverse();
  },

  async getContextForAI(userId, chatId, limit = 8) {
    const messages = await this.getRecent(userId, chatId, limit);
    
    return messages.map(m => ({
      role: m.role,
      content: m.contentPreview || m.aiResponsePreview || '',
      created_at: m.createdAt
    }));
  },

  async count(userId = null, sinceDate = null) {
    const where = {};
    
    if (userId) {
      where.userId = BigInt(userId);
    }
    
    if (sinceDate) {
      where.createdAt = { gte: sinceDate };
    }
    
    return await prisma.message.count({ where });
  },

  async getByIntent(intentType, limit = 100) {
    return await prisma.message.findMany({
      where: {
        conversation: { intentType }
      },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },

  async getDailyCount(date) {
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);
    
    return await prisma.message.count({
      where: {
        createdAt: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });
  },

  async deleteOld(beforeDate) {
    const result = await prisma.message.deleteMany({
      where: {
        createdAt: { lt: beforeDate }
      }
    });
    return result.count;
  }
};

module.exports = Message;
