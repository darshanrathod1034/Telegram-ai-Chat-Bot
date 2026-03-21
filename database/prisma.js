const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  datasources: {
    db: {
      url: process.env.DATABASE_URL
    }
  }
});

prisma.$connect()
  .then(() => console.log('✅ Prisma connected to database'))
  .catch((err) => console.error('❌ Prisma connection error:', err));

prisma.$on('error', (e) => {
  console.error('Prisma error:', e);
});

module.exports = {
  prisma,
  testConnection: async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch (error) {
      console.error('Database connection failed:', error.message);
      return false;
    }
  }
};
