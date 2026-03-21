const { PrismaClient } = require('@prisma/client');

// Create Prisma client - will only connect when DATABASE_URL is set
const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

// Only attempt connection if DATABASE_URL is configured
if (process.env.DATABASE_URL) {
  prisma.$connect()
    .then(() => console.log('✅ Prisma connected to database'))
    .catch((err) => console.error('❌ Prisma connection error:', err));
} else {
  console.log('⚠️  DATABASE_URL not set - running without database');
}

prisma.$on('error', (e) => {
  console.error('Prisma error:', e);
});

module.exports = {
  prisma,
  testConnection: async () => {
    if (!process.env.DATABASE_URL) {
      return false;
    }
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }
  }
};
