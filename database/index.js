const db = require('./prisma');

module.exports = {
  ...db,
  runMigrations: async () => {
    console.log('With Prisma, migrations are handled differently.');
    console.log('Run: npx prisma migrate deploy');
    console.log('Or: npx prisma db push');
  },
  cleanupOldData: require('./cleanup'),
  getCleanupStats: async () => {
    console.log('Cleanup stats not implemented with Prisma yet');
    return { old_messages: 0, old_conversations: 0, old_pdfs: 0, inactive_users: 0 };
  }
};
