const { prisma } = require('../database/prisma');

const DailyStats = {
  async get(date) {
    return await prisma.dailyStats.findUnique({
      where: { date: new Date(date) }
    });
  },

  async getOrCreate(date) {
    let stats = await this.get(date);
    
    if (!stats) {
      stats = await prisma.dailyStats.create({
        data: { date: new Date(date) }
      });
    }
    
    return stats;
  },

  async increment(field, value = 1) {
    const allowedFields = ['newUsers', 'activeUsers', 'totalMessages', 'resumePdfs', 'bookingPdfs', 'generalChats'];
    
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const data = {};
    data[field] = { increment: value };
    
    return await prisma.dailyStats.upsert({
      where: { date: today },
      update: data,
      create: { date: today, ...data }
    });
  },

  async incrementNewUser() {
    return await this.increment('newUsers', 1);
  },

  async incrementMessage() {
    return await this.increment('totalMessages', 1);
  },

  async incrementResumePDF() {
    return await this.increment('resumePdfs', 1);
  },

  async incrementBookingPDF() {
    return await this.increment('bookingPdfs', 1);
  },

  async incrementGeneralChat() {
    return await this.increment('generalChats', 1);
  },

  async setActiveUsers(count) {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return await prisma.dailyStats.upsert({
      where: { date: today },
      update: { activeUsers: count },
      create: { date: today, activeUsers: count }
    });
  },

  async getRange(startDate, endDate) {
    return await prisma.dailyStats.findMany({
      where: {
        date: {
          gte: new Date(startDate),
          lte: new Date(endDate)
        }
      },
      orderBy: { date: 'desc' }
    });
  },

  async getLastDays(days = 7) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);
    
    return await prisma.dailyStats.findMany({
      where: { date: { gte: startDate } },
      orderBy: { date: 'desc' }
    });
  },

  async getTotals(sinceDate = null) {
    const where = sinceDate ? { date: { gte: new Date(sinceDate) } } : {};
    
    const result = await prisma.dailyStats.aggregate({
      where,
      _sum: {
        newUsers: true,
        activeUsers: true,
        totalMessages: true,
        resumePdfs: true,
        bookingPdfs: true,
        generalChats: true
      }
    });
    
    return {
      totalNewUsers: result._sum.newUsers || 0,
      totalActiveUsers: result._sum.activeUsers || 0,
      totalMessages: result._sum.totalMessages || 0,
      totalResumePdfs: result._sum.resumePdfs || 0,
      totalBookingPdfs: result._sum.bookingPdfs || 0,
      totalGeneralChats: result._sum.generalChats || 0
    };
  },

  async refreshTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Get message count
    const messageCount = await prisma.message.count({
      where: {
        createdAt: { gte: today }
      }
    });
    
    // Get PDF counts
    const [resumePdfs, bookingPdfs] = await Promise.all([
      prisma.pDFGeneration.count({
        where: { 
          createdAt: { gte: today },
          pdfType: 'resume'
        }
      }),
      prisma.pDFGeneration.count({
        where: { 
          createdAt: { gte: today },
          pdfType: 'booking'
        }
      })
    ]);
    
    // Get active users
    const activeUsersResult = await prisma.conversation.groupBy({
      by: ['userId'],
      where: {
        lastMessageAt: { gte: today }
      }
    });
    
    return await prisma.dailyStats.upsert({
      where: { date: today },
      update: {
        totalMessages: messageCount,
        resumePdfs,
        bookingPdfs,
        activeUsers: activeUsersResult.length,
        updatedAt: new Date()
      },
      create: {
        date: today,
        totalMessages: messageCount,
        resumePdfs,
        bookingPdfs,
        activeUsers: activeUsersResult.length
      }
    });
  }
};

module.exports = DailyStats;
