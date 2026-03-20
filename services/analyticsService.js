const { query } = require('../database/connection');
const User = require('../models/User');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const PDFGeneration = require('../models/PDFGeneration');
const DailyStats = require('../models/DailyStats');

const AnalyticsService = {
  async getBasicStats() {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const monthAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const [
      totalUsers,
      todayStats,
      weekStats,
      monthStats
    ] = await Promise.all([
      User.count(),
      DailyStats.get(today),
      DailyStats.getTotals(weekAgo),
      DailyStats.getTotals(monthAgo)
    ]);
    
    return {
      totalUsers,
      today: todayStats || {
        new_users: 0,
        active_users: 0,
        total_messages: 0,
        resume_pdfs: 0,
        booking_pdfs: 0,
        general_chats: 0
      },
      last7Days: weekStats,
      last30Days: monthStats
    };
  },

  async getTodayStats() {
    const today = new Date().toISOString().split('T')[0];
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
    const since = sinceDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    const result = await query(`
      SELECT 
        intent_type,
        COUNT(*) as conversations,
        SUM(message_count) as messages
      FROM conversations
      WHERE created_at >= $1
      GROUP BY intent_type
    `, [since]);
    
    return result.rows;
  },

  async getTopUsers(limit = 10) {
    const result = await query(`
      SELECT 
        u.id,
        u.username,
        u.first_name,
        u.last_seen_at,
        COUNT(DISTINCT c.id) as conversations,
        SUM(c.message_count) as messages,
        COUNT(DISTINCT p.id) as pdfs_generated
      FROM users u
      LEFT JOIN conversations c ON u.id = c.user_id
      LEFT JOIN pdf_generations p ON u.id = p.user_id
      GROUP BY u.id, u.username, u.first_name, u.last_seen_at
      ORDER BY messages DESC
      LIMIT $1
    `, [limit]);
    
    return result.rows;
  },

  async getDashboardData() {
    const [
      basicStats,
      intentBreakdown,
      weeklyStats,
      topUsers
    ] = await Promise.all([
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
  },

  async recordUserActivity(userId) {
    const today = new Date().toISOString().split('T')[0];
    await DailyStats.getOrCreate(today);
  },

  async recordMessage(userId) {
    await DailyStats.incrementMessage();
  },

  async recordPDFGeneration(userId, pdfType) {
    if (pdfType === 'resume') {
      await DailyStats.incrementResumePDF();
    } else if (pdfType === 'booking') {
      await DailyStats.incrementBookingPDF();
    }
  },

  async recordIntent(intentType) {
    if (intentType === 'general') {
      await DailyStats.incrementGeneralChat();
    }
  }
};

if (require.main === module) {
  (async () => {
    try {
      console.log('Testing AnalyticsService...');
      const stats = await AnalyticsService.getBasicStats();
      console.log('Stats:', stats);
    } catch (error) {
      console.log('AnalyticsService test skipped (database not configured):', error.message);
    }
  })();
}

module.exports = AnalyticsService;
