const { query, getClient } = require('../database/connection');

const Conversation = {
  async create({ userId, chatId, intentType }) {
    const result = await query(`
      INSERT INTO conversations (user_id, chat_id, intent_type)
      VALUES ($1, $2, $3)
      RETURNING *
    `, [userId, chatId, intentType]);
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      'SELECT * FROM conversations WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findActiveByUserAndIntent(userId, chatId, intentType) {
    const result = await query(`
      SELECT * FROM conversations 
      WHERE user_id = $1 
        AND chat_id = $2 
        AND intent_type = $3
        AND status = 'active'
        AND last_message_at > NOW() - INTERVAL '2 hours'
      ORDER BY created_at DESC
      LIMIT 1
    `, [userId, chatId, intentType]);
    return result.rows[0] || null;
  },

  async updateSummary(id, summary) {
    const result = await query(`
      UPDATE conversations 
      SET summary = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, summary]);
    return result.rows[0];
  },

  async updateContextWindow(id, contextWindow) {
    const result = await query(`
      UPDATE conversations 
      SET context_window = $2, updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id, JSON.stringify(contextWindow)]);
    return result.rows[0];
  },

  async incrementMessageCount(id) {
    const result = await query(`
      UPDATE conversations 
      SET message_count = message_count + 1,
          last_message_at = NOW(),
          updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    return result.rows[0];
  },

  async markCompleted(id) {
    const result = await query(`
      UPDATE conversations 
      SET status = 'completed', updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `, [id]);
    return result.rows[0];
  },

  async addMessageToContext(id, message) {
    const conv = await this.findById(id);
    if (!conv) return null;
    
    let context = conv.context_window || [];
    context.push(message);
    
    if (context.length > 10) {
      context = context.slice(-10);
    }
    
    return await this.updateContextWindow(id, context);
  },

  async getRecent(userId, limit = 10) {
    const result = await query(`
      SELECT c.*, 
             u.username, u.first_name, u.last_name
      FROM conversations c
      JOIN users u ON c.user_id = u.id
      WHERE c.user_id = $1
      ORDER BY c.last_message_at DESC
      LIMIT $2
    `, [userId, limit]);
    return result.rows;
  },

  async getByUserAndDateRange(userId, startDate, endDate) {
    const result = await query(`
      SELECT * FROM conversations 
      WHERE user_id = $1 
        AND created_at >= $2 
        AND created_at <= $3
      ORDER BY created_at DESC
    `, [userId, startDate, endDate]);
    return result.rows;
  },

  async count(intentType = null) {
    let sql = 'SELECT COUNT(*) as count FROM conversations';
    const params = [];
    
    if (intentType) {
      sql += ' WHERE intent_type = $1';
      params.push(intentType);
    }
    
    const result = await query(sql, params);
    return parseInt(result.rows[0].count);
  },

  async getStats(sinceDate) {
    const result = await query(`
      SELECT 
        intent_type,
        COUNT(*) as total,
        COUNT(CASE WHEN status = 'active' THEN 1 END) as active,
        COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed,
        SUM(message_count) as total_messages,
        AVG(message_count) as avg_messages
      FROM conversations
      WHERE created_at >= $1
      GROUP BY intent_type
    `, [sinceDate]);
    return result.rows;
  },

  async getOrCreateActive(userId, chatId, intentType) {
    let conversation = await this.findActiveByUserAndIntent(userId, chatId, intentType);
    
    if (!conversation) {
      conversation = await this.create({ userId, chatId, intentType });
    }
    
    return conversation;
  },

  async archiveOldConversations(hoursOld = 24) {
    const result = await query(`
      UPDATE conversations 
      SET status = 'completed'
      WHERE status = 'active'
        AND last_message_at < NOW() - INTERVAL '${hoursOld} hours'
      RETURNING id
    `);
    return result.rowCount;
  }
};

if (require.main === module) {
  (async () => {
    try {
      console.log('Conversation model test skipped (database not configured)');
    } catch (error) {
      console.log('Conversation model test failed:', error.message);
    }
  })();
}

module.exports = Conversation;
