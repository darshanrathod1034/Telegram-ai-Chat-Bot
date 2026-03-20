const { query } = require('../database/connection');

const DailyStats = {
  async get(date) {
    const result = await query(
      'SELECT * FROM daily_stats WHERE date = $1',
      [date]
    );
    return result.rows[0] || null;
  },

  async getOrCreate(date) {
    let stats = await this.get(date);
    
    if (!stats) {
      const result = await query(`
        INSERT INTO daily_stats (date)
        VALUES ($1)
        ON CONFLICT (date) DO NOTHING
        RETURNING *
      `, [date]);
      stats = result.rows[0];
    }
    
    return stats;
  },

  async increment(field, value = 1) {
    const allowedFields = ['new_users', 'active_users', 'total_messages', 'resume_pdfs', 'booking_pdfs', 'general_chats'];
    
    if (!allowedFields.includes(field)) {
      throw new Error(`Invalid field: ${field}`);
    }
    
    const today = new Date().toISOString().split('T')[0];
    
    const result = await query(`
      INSERT INTO daily_stats (date, ${field})
      VALUES ($1, $2)
      ON CONFLICT (date) DO UPDATE SET
        ${field} = daily_stats.${field} + $2,
        updated_at = NOW()
      RETURNING *
    `, [today, value]);
    
    return result.rows[0];
  },

  async incrementNewUser() {
    return await this.increment('new_users', 1);
  },

  async incrementMessage() {
    return await this.increment('total_messages', 1);
  },

  async incrementResumePDF() {
    return await this.increment('resume_pdfs', 1);
  },

  async incrementBookingPDF() {
    return await this.increment('booking_pdfs', 1);
  },

  async incrementGeneralChat() {
    return await this.increment('general_chats', 1);
  },

  async setActiveUsers(count) {
    const today = new Date().toISOString().split('T')[0];
    
    const result = await query(`
      INSERT INTO daily_stats (date, active_users)
      VALUES ($1, $2)
      ON CONFLICT (date) DO UPDATE SET
        active_users = $2,
        updated_at = NOW()
      RETURNING *
    `, [today, count]);
    
    return result.rows[0];
  },

  async getRange(startDate, endDate) {
    const result = await query(`
      SELECT * FROM daily_stats 
      WHERE date >= $1 AND date <= $2
      ORDER BY date DESC
    `, [startDate, endDate]);
    return result.rows;
  },

  async getLastDays(days = 7) {
    const result = await query(`
      SELECT * FROM daily_stats 
      WHERE date >= CURRENT_DATE - $1
      ORDER BY date DESC
    `, [days]);
    return result.rows;
  },

  async getTotals(sinceDate = null) {
    let sql = `
      SELECT 
        SUM(new_users) as total_new_users,
        SUM(active_users) as total_active_users,
        SUM(total_messages) as total_messages,
        SUM(resume_pdfs) as total_resume_pdfs,
        SUM(booking_pdfs) as total_booking_pdfs,
        SUM(general_chats) as total_general_chats
      FROM daily_stats
    `;
    
    const params = [];
    if (sinceDate) {
      sql += ' WHERE date >= $1';
      params.push(sinceDate);
    }
    
    const result = await query(sql, params);
    return result.rows[0];
  },

  async aggregateFromMessages() {
    const today = new Date().toISOString().split('T')[0];
    
    await query(`
      INSERT INTO daily_stats (date, total_messages)
      SELECT $1, COUNT(*)
      FROM messages
      WHERE DATE(created_at) = $1
      ON CONFLICT (date) DO UPDATE SET
        total_messages = (
          SELECT COUNT(*) FROM messages WHERE DATE(created_at) = $1
        ),
        updated_at = NOW()
    `, [today]);
    
    await query(`
      INSERT INTO daily_stats (date, resume_pdfs, booking_pdfs)
      SELECT $1,
        COUNT(*) FILTER (WHERE pdf_type = 'resume'),
        COUNT(*) FILTER (WHERE pdf_type = 'booking')
      FROM pdf_generations
      WHERE DATE(created_at) = $1
      ON CONFLICT (date) DO UPDATE SET
        resume_pdfs = (
          SELECT COUNT(*) FROM pdf_generations 
          WHERE DATE(created_at) = $1 AND pdf_type = 'resume'
        ),
        booking_pdfs = (
          SELECT COUNT(*) FROM pdf_generations 
          WHERE DATE(created_at) = $1 AND pdf_type = 'booking'
        ),
        updated_at = NOW()
    `, [today]);
    
    return await this.get(today);
  },

  async refreshTodayStats() {
    const today = new Date().toISOString().split('T')[0];
    
    await this.aggregateFromMessages();
    
    const activeUsers = await query(`
      SELECT COUNT(DISTINCT user_id) as count
      FROM conversations
      WHERE DATE(last_message_at) = $1
    `, [today]);
    
    await this.setActiveUsers(parseInt(activeUsers.rows[0].count));
    
    return await this.get(today);
  }
};

if (require.main === module) {
  (async () => {
    try {
      console.log('DailyStats model test skipped (database not configured)');
    } catch (error) {
      console.log('DailyStats model test failed:', error.message);
    }
  })();
}

module.exports = DailyStats;
