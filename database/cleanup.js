const { query } = require('./connection');

const cleanupOldData = async () => {
  console.log('Starting data cleanup for 15-day retention...');
  
  const startTime = Date.now();
  let totalDeleted = 0;
  
  try {
    const client = await (require('./connection').getClient)();
    
    await client.query('BEGIN');
    
    const messageResult = await client.query(`
      DELETE FROM messages 
      WHERE created_at < NOW() - INTERVAL '15 days'
      RETURNING id
    `);
    totalDeleted += messageResult.rowCount;
    console.log(`Deleted ${messageResult.rowCount} old messages`);
    
    const conversationResult = await client.query(`
      DELETE FROM conversations 
      WHERE last_message_at < NOW() - INTERVAL '15 days'
        AND status = 'completed'
      RETURNING id
    `);
    totalDeleted += conversationResult.rowCount;
    console.log(`Deleted ${conversationResult.rowCount} old conversations`);
    
    const pdfResult = await client.query(`
      DELETE FROM pdf_generations 
      WHERE created_at < NOW() - INTERVAL '15 days'
      RETURNING id
    `);
    totalDeleted += pdfResult.rowCount;
    console.log(`Deleted ${pdfResult.rowCount} old PDF records`);
    
    await client.query(`
      UPDATE users 
      SET last_seen_at = last_seen_at
      WHERE last_seen_at >= NOW() - INTERVAL '15 days'
    `);
    
    await client.query('COMMIT');
    
    const duration = Date.now() - startTime;
    console.log(`Cleanup completed: ${totalDeleted} records deleted in ${duration}ms`);
    
    return {
      success: true,
      deletedCount: totalDeleted,
      duration
    };
  } catch (error) {
    console.error('Cleanup error:', error.message);
    try {
      await (require('./connection').getClient)().then(c => c.query('ROLLBACK'));
    } catch (e) {}
    throw error;
  }
};

const cleanupInactiveUsers = async (daysInactive = 90) => {
  console.log(`Cleaning up users inactive for ${daysInactive}+ days...`);
  
  try {
    const result = await query(`
      DELETE FROM users 
      WHERE last_seen_at < NOW() - INTERVAL '${daysInactive} days'
        AND id NOT IN (
          SELECT DISTINCT user_id FROM conversations 
          WHERE last_message_at >= NOW() - INTERVAL '${daysInactive} days'
        )
      RETURNING id
    `);
    
    console.log(`Cleaned up ${result.rowCount} inactive users`);
    return result.rowCount;
  } catch (error) {
    console.error('User cleanup error:', error.message);
    throw error;
  }
};

const getCleanupStats = async () => {
  try {
    const stats = await query(`
      SELECT 
        (SELECT COUNT(*) FROM messages WHERE created_at < NOW() - INTERVAL '15 days') as old_messages,
        (SELECT COUNT(*) FROM conversations WHERE last_message_at < NOW() - INTERVAL '15 days' AND status = 'completed') as old_conversations,
        (SELECT COUNT(*) FROM pdf_generations WHERE created_at < NOW() - INTERVAL '15 days') as old_pdfs,
        (SELECT COUNT(*) FROM users WHERE last_seen_at < NOW() - INTERVAL '90 days') as inactive_users
    `);
    
    return stats.rows[0];
  } catch (error) {
    console.error('Stats error:', error.message);
    throw error;
  }
};

if (require.main === module) {
  (async () => {
    try {
      console.log('Manual cleanup started...');
      const statsBefore = await getCleanupStats();
      console.log('Records to clean:', statsBefore);
      
      await cleanupOldData();
      
      console.log('Cleanup completed successfully');
      process.exit(0);
    } catch (error) {
      console.error('Cleanup failed:', error);
      process.exit(1);
    }
  })();
}

module.exports = {
  cleanupOldData,
  cleanupInactiveUsers,
  getCleanupStats
};
