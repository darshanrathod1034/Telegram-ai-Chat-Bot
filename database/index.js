const db = require('./connection');
const { runMigrations } = require('./migrations');
const { cleanupOldData, cleanupInactiveUsers, getCleanupStats } = require('./cleanup');

module.exports = {
  ...db,
  runMigrations,
  cleanupOldData,
  cleanupInactiveUsers,
  getCleanupStats
};
