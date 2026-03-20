const { query } = require('../database/connection');

const PDFGeneration = {
  async create({ conversationId, userId, pdfType, extractedData, filename }) {
    const result = await query(`
      INSERT INTO pdf_generations 
        (conversation_id, user_id, pdf_type, extracted_data, filename)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `, [conversationId, userId, pdfType, JSON.stringify(extractedData), filename]);
    return result.rows[0];
  },

  async createResume({ conversationId, userId, extractedData }) {
    return await this.create({
      conversationId,
      userId,
      pdfType: 'resume',
      extractedData,
      filename: `resume_${Date.now()}.pdf`
    });
  },

  async createBooking({ conversationId, userId, extractedData }) {
    return await this.create({
      conversationId,
      userId,
      pdfType: 'booking',
      extractedData,
      filename: `booking_${Date.now()}.pdf`
    });
  },

  async findById(id) {
    const result = await query(
      'SELECT * FROM pdf_generations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async getRecentByUser(userId, limit = 10) {
    const result = await query(`
      SELECT * FROM pdf_generations 
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  },

  async getByType(pdfType, limit = 100) {
    const result = await query(`
      SELECT * FROM pdf_generations 
      WHERE pdf_type = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [pdfType, limit]);
    return result.rows;
  },

  async getByDateRange(startDate, endDate) {
    const result = await query(`
      SELECT * FROM pdf_generations 
      WHERE created_at >= $1 AND created_at <= $2
      ORDER BY created_at DESC
    `, [startDate, endDate]);
    return result.rows;
  },

  async count(pdfType = null, sinceDate = null) {
    let sql = 'SELECT COUNT(*) as count FROM pdf_generations';
    const params = [];
    const conditions = [];
    let paramIndex = 1;
    
    if (pdfType) {
      conditions.push(`pdf_type = $${paramIndex}`);
      params.push(pdfType);
      paramIndex++;
    }
    
    if (sinceDate) {
      conditions.push(`created_at >= $${paramIndex}`);
      params.push(sinceDate);
    }
    
    if (conditions.length > 0) {
      sql += ' WHERE ' + conditions.join(' AND ');
    }
    
    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  },

  async getStats(sinceDate) {
    const result = await query(`
      SELECT 
        pdf_type,
        COUNT(*) as total,
        COUNT(DISTINCT user_id) as unique_users
      FROM pdf_generations
      WHERE created_at >= $1
      GROUP BY pdf_type
    `, [sinceDate]);
    return result.rows;
  },

  async getDailyStats(date) {
    const result = await query(`
      SELECT 
        pdf_type,
        COUNT(*) as count
      FROM pdf_generations
      WHERE DATE(created_at) = $1
      GROUP BY pdf_type
    `, [date]);
    return result.rows;
  },

  async deleteOld(beforeDate) {
    const result = await query(`
      DELETE FROM pdf_generations 
      WHERE created_at < $1
      RETURNING id
    `, [beforeDate]);
    return result.rowCount;
  },

  async getUserStats(userId) {
    const result = await query(`
      SELECT 
        COUNT(*) as total,
        COUNT(CASE WHEN pdf_type = 'resume' THEN 1 END) as resumes,
        COUNT(CASE WHEN pdf_type = 'booking' THEN 1 END) as bookings
      FROM pdf_generations
      WHERE user_id = $1
    `, [userId]);
    return result.rows[0];
  }
};

if (require.main === module) {
  (async () => {
    try {
      console.log('PDFGeneration model test skipped (database not configured)');
    } catch (error) {
      console.log('PDFGeneration model test failed:', error.message);
    }
  })();
}

module.exports = PDFGeneration;
