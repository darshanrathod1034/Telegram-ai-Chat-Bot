const { prisma } = require('../database/prisma');

const User = {
  async findById(id) {
    return await prisma.user.findUnique({
      where: { id: BigInt(id) }
    });
  },

  async findOrCreate(userData) {
    const { id, username, first_name, last_name, language_code } = userData;
    
    try {
      // Try to find existing user
      const existingUser = await prisma.user.findUnique({
        where: { id: BigInt(id) }
      });
      
      if (existingUser) {
        // Update last seen
        await prisma.user.update({
          where: { id: BigInt(id) },
          data: { lastSeenAt: new Date() }
        });
        return { user: existingUser, created: false };
      }
      
      // Create new user
      const newUser = await prisma.user.create({
        data: {
          id: BigInt(id),
          username: username || null,
          firstName: first_name,
          lastName: last_name || null,
          languageCode: language_code || null
        }
      });
      
      return { user: newUser, created: true };
    } catch (error) {
      // If user exists (conflict), update and return
      if (error.code === 'P2002' || error.code === 'P2001') {
        const existingUser = await prisma.user.findUnique({
          where: { id: BigInt(id) }
        });
        if (existingUser) {
          await prisma.user.update({
            where: { id: BigInt(id) },
            data: { 
              username: username || null,
              firstName: first_name,
              lastName: last_name || null,
              lastSeenAt: new Date()
            }
          });
          return { user: existingUser, created: false };
        }
      }
      throw error;
    }
  },

  async updateLastSeen(id) {
    await prisma.user.update({
      where: { id: BigInt(id) },
      data: { lastSeenAt: new Date() }
    });
  },

  async count() {
    return await prisma.user.count();
  },

  async getRecent(limit = 10) {
    return await prisma.user.findMany({
      orderBy: { lastSeenAt: 'desc' },
      take: limit
    });
  },

  async getActiveUsers(sinceDate) {
    const result = await prisma.conversation.groupBy({
      by: ['userId'],
      where: {
        lastMessageAt: { gte: sinceDate }
      },
      count: true
    });
    return result.length;
  },

  async getAll() {
    return await prisma.user.findMany({
      orderBy: { lastSeenAt: 'desc' }
    });
  }
};

module.exports = User;
