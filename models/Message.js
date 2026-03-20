const { query } = require('../database/connection');

const Message = {
  async create({ conversationId, userId, telegramMessageId, role, intentDetected, content, aiResponse }) {
    const contentPreview = content ? content.substring(0, 500) : null;
    const aiResponsePreview = aiResponse ? aiResponse.substring(0, 500) : null;
    
    const result = await query(`
      INSERT INTO messages 
        (conversation_id, user_id, telegram_message_id, role, intent_detected, content_preview, ai_response_preview)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `, [conversationId, userId, telegramMessageId, role, intentDetected, contentPreview, aiResponsePreview]);
    
    return result.rows[0];
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
    const result = await query(
      'SELECT * FROM messages WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async getRecent(userId, chatId, limit = 8) {
    const result = await query(`
      SELECT m.*, c.intent_type, c.chat_id
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.user_id = $1 AND c.chat_id = $2
      ORDER BY m.created_at DESC
      LIMIT $3
    `, [userId, chatId, limit]);
    return result.rows.reverse();
  },

  async getRecentByConversation(conversationId, limit = 10) {
    const result = await query(`
      SELECT * FROM messages 
      WHERE conversation_id = $1
      ORDER BY created_at DESC
      LIMIT $2
    `, [conversationId, limit]);
    return result.rows.reverse();
  },

  async getContextForAI(userId, chatId, limit = 8) {
    const messages = await this.getRecent(userId, chatId, limit);
    
    return messages.map(m => ({
      role: m.role,
      content: m.content_preview || m.ai_response_preview || '',
      created_at: m.created_at
    }));
  },

  async count(userId = null, sinceDate = null) {
    let sql = 'SELECT COUNT(*) as count FROM messages';
    const params = [];
    const conditions = [];
    let paramIndex = 1;
    
    if (userId) {
      conditions.push(`user_id = $${paramIndex}`);
      params.push(userId);
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

  async getByIntent(intentType, limit = 100) {
    const result = await query(`
      SELECT m.*, c.intent_type
      FROM messages m
      JOIN conversations c ON m.conversation_id = c.id
      WHERE c.intent_type = $1
      ORDER BY m.created_at DESC
      LIMIT $2
    `, [intentType, limit]);
    return result.rows;
  },

  async getDailyCount(date) {
    const result = await query(`
      SELECT COUNT(*) as count 
      FROM messages 
      WHERE DATE(created_at) = $1
    `, [date]);
    return parseInt(result.rows[0].count);
  },

  async getByDateRange(startDate, endDate) {
    const result = await query(`
      SELECT DATE(created_at) as date, COUNT(*) as count
      FROM messages
      WHERE created_at >= $1 AND created_at <= $2
      GROUP BY DATE(created_at)
      ORDER BY date DESC
    `, [startDate, endDate]);
    return result.rows;
  },

  async deleteOld(beforeDate) {
    const result = await query(`
      DELETE FROM messages 
      WHERE created_at < $1
      RETURNING id
    `, [beforeDate]);
    return result.rowCount;
  }
};

if (require.main === module) {
  (async () => {
    try {
      console.log('Message model test skipped (database not configured)');
    } catch (error) {
      console.log('Message model test failed:', error.message);
    }
  })();
}

module.exports = Message;
