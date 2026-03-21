const { prisma } = require('../database/prisma');

const PDFGeneration = {
  async create({ conversationId, userId, pdfType, extractedData, filename }) {
    return await prisma.pDFGeneration.create({
      data: {
        conversationId,
        userId: BigInt(userId),
        pdfType,
        extractedData,
        filename
      }
    });
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
    return await prisma.pDFGeneration.findUnique({
      where: { id }
    });
  },

  async getRecentByUser(userId, limit = 10) {
    return await prisma.pDFGeneration.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },

  async getByType(pdfType, limit = 100) {
    return await prisma.pDFGeneration.findMany({
      where: { pdfType },
      orderBy: { createdAt: 'desc' },
      take: limit
    });
  },

  async count(pdfType = null, sinceDate = null) {
    const where = {};
    
    if (pdfType) {
      where.pdfType = pdfType;
    }
    
    if (sinceDate) {
      where.createdAt = { gte: sinceDate };
    }
    
    return await prisma.pDFGeneration.count({ where });
  },

  async getStats(sinceDate) {
    return await prisma.pDFGeneration.groupBy({
      by: ['pdfType'],
      where: { createdAt: { gte: sinceDate } },
      _count: true,
      _count: {
        userId: true
      }
    });
  },

  async getUserStats(userId) {
    const [total, resumes, bookings] = await Promise.all([
      prisma.pDFGeneration.count({ where: { userId: BigInt(userId) } }),
      prisma.pDFGeneration.count({ 
        where: { userId: BigInt(userId), pdfType: 'resume' } 
      }),
      prisma.pDFGeneration.count({ 
        where: { userId: BigInt(userId), pdfType: 'booking' } 
      })
    ]);
    
    return { total, resumes, bookings };
  },

  async deleteOld(beforeDate) {
    const result = await prisma.pDFGeneration.deleteMany({
      where: { createdAt: { lt: beforeDate } }
    });
    return result.count;
  }
};

module.exports = PDFGeneration;
