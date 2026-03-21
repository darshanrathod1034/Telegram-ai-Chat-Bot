const { prisma } = require('../database/prisma');
const User = require('../models/User');
const DailyStats = require('../models/DailyStats');

const AnalyticsService = {
  async getBasicStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const weekAgo = new Date(today);
    weekAgo.setDate(weekAgo.getDate() - 7);
    
    const monthAgo = new Date(today);
    monthAgo.setDate(monthAgo.getDate() - 30);
    
    const [totalUsers, todayStats, weekStats, monthStats] = await Promise.all([
      User.count(),
      DailyStats.get(today),
      DailyStats.getTotals(weekAgo),
      DailyStats.getTotals(monthAgo)
    ]);

    return {
      totalUsers,
      today: todayStats || {
        newUsers: 0,
        activeUsers: 0,
        totalMessages: 0,
        resumePdfs: 0,
        bookingPdfs: 0,
        generalChats: 0
      },
      last7Days: weekStats,
      last30Days: monthStats
    };
  },

  async getTodayStats() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let stats = await DailyStats.get(today);
    
    if (!stats) {
      stats = await DailyStats.refreshTodayStats();
    }
    
    return stats;
  },

  async getWeeklyStats() {
    return await DailyStats.getLastDays(7);
  },

  async getIntentBreakdown(sinceDate = null) {
    const since = sinceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    const result = await prisma.conversation.groupBy({
      by: ['intentType'],
      where: { createdAt: { gte: since } },
      _count: true,
      _sum: {
        messageCount: true
      }
    });
    
    return result.map(r => ({
      intentType: r.intentType,
      conversations: r._count,
      messages: r._sum.messageCount || 0
    }));
  },

  async getTopUsers(limit = 10) {
    return await prisma.user.findMany({
      orderBy: {
        lastSeenAt: 'desc'
      },
      take: limit,
      include: {
        conversations: {
          select: {
            id: true,
            messageCount: true
          }
        },
        pdfGenerations: {
          select: {
            id: true
          }
        }
      }
    });
  },

  async getDashboardData() {
    const [basicStats, intentBreakdown, weeklyStats, topUsers] = await Promise.all([
      this.getBasicStats(),
      this.getIntentBreakdown(),
      this.getWeeklyStats(),
      this.getTopUsers(5)
    ]);

    return {
      ...basicStats,
      intentBreakdown,
      weeklyStats,
      topUsers
    };
  }
};

module.exports = AnalyticsService;
