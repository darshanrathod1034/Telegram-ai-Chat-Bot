const { query } = require('../database/connection');

const User = {
  async findById(id) {
    const result = await query(
      'SELECT * FROM users WHERE id = $1',
      [id]
    );
    return result.rows[0] || null;
  },

  async findOrCreate(userData) {
    const { id, username, first_name, last_name, language_code } = userData;
    
    const existingUser = await this.findById(id);
    if (existingUser) {
      await this.updateLastSeen(id);
      return { user: existingUser, created: false };
    }
    
    const result = await query(`
      INSERT INTO users (id, username, first_name, last_name, language_code)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (id) DO UPDATE SET
        username = EXCLUDED.username,
        first_name = EXCLUDED.first_name,
        last_name = EXCLUDED.last_name,
        updated_at = NOW(),
        last_seen_at = NOW()
      RETURNING *
    `, [id, username || null, first_name, last_name || null, language_code || null]);
    
    return { user: result.rows[0], created: true };
  },

  async updateLastSeen(id) {
    await query(`
      UPDATE users SET last_seen_at = NOW() WHERE id = $1
    `, [id]);
  },

  async update(id, updates) {
    const allowedFields = ['username', 'first_name', 'last_name', 'language_code'];
    const setClauses = [];
    const values = [];
    let paramIndex = 1;
    
    for (const [key, value] of Object.entries(updates)) {
      const dbKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
      if (allowedFields.includes(dbKey)) {
        setClauses.push(`${dbKey} = $${paramIndex}`);
        values.push(value);
        paramIndex++;
      }
    }
    
    if (setClauses.length === 0) return null;
    
    setClauses.push(`updated_at = NOW()`);
    values.push(id);
    
    const result = await query(`
      UPDATE users SET ${setClauses.join(', ')} 
      WHERE id = $${paramIndex}
      RETURNING *
    `, values);
    
    return result.rows[0];
  },

  async count() {
    const result = await query('SELECT COUNT(*) as count FROM users');
    return parseInt(result.rows[0].count);
  },

  async getRecent(limit = 10) {
    const result = await query(`
      SELECT * FROM users 
      ORDER BY last_seen_at DESC 
      LIMIT $1
    `, [limit]);
    return result.rows;
  },

  async getActiveUsers(sinceDate) {
    const result = await query(`
      SELECT COUNT(DISTINCT user_id) as count 
      FROM conversations 
      WHERE last_message_at >= $1
    `, [sinceDate]);
    return parseInt(result.rows[0].count);
  },

  async getAll() {
    const result = await query('SELECT * FROM users ORDER BY last_seen_at DESC');
    return result.rows;
  }
};

if (require.main === module) {
  (async () => {
    const userData = {
      id: 123456789,
      username: 'testuser',
      first_name: 'Test',
      last_name: 'User',
      language_code: 'en'
    };
    
    try {
      console.log('Testing User model...');
      const result = await User.findOrCreate(userData);
      console.log('Result:', result);
      
      const count = await User.count();
      console.log('Total users:', count);
    } catch (error) {
      console.log('User model test skipped (database not configured):', error.message);
    }
  })();
}

module.exports = User;
