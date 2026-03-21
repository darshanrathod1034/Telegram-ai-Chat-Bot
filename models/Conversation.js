const { prisma } = require('../database/prisma');

const Conversation = {
  async create({ userId, chatId, intentType }) {
    return await prisma.conversation.create({
      data: {
        userId: BigInt(userId),
        chatId: BigInt(chatId),
        intentType
      }
    });
  },

  async findById(id) {
    return await prisma.conversation.findUnique({
      where: { id }
    });
  },

  async findActiveByUserAndIntent(userId, chatId, intentType) {
    const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000);
    
    return await prisma.conversation.findFirst({
      where: {
        userId: BigInt(userId),
        chatId: BigInt(chatId),
        intentType,
        status: 'active',
        lastMessageAt: { gte: twoHoursAgo }
      },
      orderBy: { createdAt: 'desc' }
    });
  },

  async updateSummary(id, summary) {
    return await prisma.conversation.update({
      where: { id },
      data: { 
        summary,
        updatedAt: new Date()
      }
    });
  },

  async updateContextWindow(id, contextWindow) {
    return await prisma.conversation.update({
      where: { id },
      data: { 
        contextWindow,
        updatedAt: new Date()
      }
    });
  },

  async incrementMessageCount(id) {
    return await prisma.conversation.update({
      where: { id },
      data: { 
        messageCount: { increment: 1 },
        lastMessageAt: new Date(),
        updatedAt: new Date()
      }
    });
  },

  async markCompleted(id) {
    return await prisma.conversation.update({
      where: { id },
      data: { 
        status: 'completed',
        updatedAt: new Date()
      }
    });
  },

  async addMessageToContext(id, message) {
    const conv = await this.findById(id);
    if (!conv) return null;
    
    let context = conv.contextWindow || [];
    context.push(message);
    
    if (context.length > 10) {
      context = context.slice(-10);
    }
    
    return await this.updateContextWindow(id, context);
  },

  async getRecent(userId, limit = 10) {
    return await prisma.conversation.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        user: {
          select: {
            username: true,
            firstName: true,
            lastName: true
          }
        }
      }
    });
  },

  async count(intentType = null) {
    const where = intentType ? { intentType } : {};
    return await prisma.conversation.count({ where });
  },

  async getOrCreateActive(userId, chatId, intentType) {
    let conversation = await this.findActiveByUserAndIntent(userId, chatId, intentType);
    
    if (!conversation) {
      conversation = await this.create({ userId, chatId, intentType });
    }
    
    return conversation;
  }
};

module.exports = Conversation;
