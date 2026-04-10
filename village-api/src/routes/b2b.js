// src/routes/b2b.js
const express = require('express');
const bcrypt = require('bcryptjs');
const { jwtAuth, requestMeta } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { cacheDel } = require('../utils/redis');
const crypto = require('crypto');

const router = express.Router();
const prisma = require('../lib/prisma'); // singleton

router.use(requestMeta);
router.use(jwtAuth);

function generateKey(prefix) {
  return `${prefix}_${crypto.randomBytes(16).toString('hex')}`;
}

// ─── User Dashboard Stats ──────────────────────────────────────────────
router.get('/dashboard', async (req, res) => {
  const userId = req.user.userId;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const sevenDaysAgo = new Date(today); sevenDaysAgo.setDate(today.getDate() - 7);
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);

  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { planType: true, status: true },
    });

    const PLAN_LIMITS = { FREE: 5000, PREMIUM: 50000, PRO: 300000, UNLIMITED: 1000000 };
    const dailyLimit = PLAN_LIMITS[user.planType] || PLAN_LIMITS.FREE;

    const [todayRequests, monthRequests, avgResponseTime] = await Promise.all([
      prisma.apiLog.count({ where: { userId, createdAt: { gte: today } } }),
      prisma.apiLog.count({ where: { userId, createdAt: { gte: monthStart } } }),
      prisma.apiLog.aggregate({
        where: { userId, createdAt: { gte: today } },
        _avg: { responseTime: true },
      }),
    ]);

    // Raw query uses quoted camelCase — this is how Prisma stores it in Neon/Postgres
    const dailyBreakdown = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "ApiLog"
      WHERE "userId" = ${userId} AND "createdAt" >= ${sevenDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const successRequests = await prisma.apiLog.count({
      where: { userId, createdAt: { gte: today }, statusCode: { gte: 200, lt: 300 } },
    });

    return successResponse(res, {
      planType: user.planType,
      dailyLimit,
      todayRequests,
      todayRemaining: Math.max(0, dailyLimit - todayRequests),
      todayUsagePercent: Math.round((todayRequests / dailyLimit) * 100),
      monthRequests,
      avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
      successRate: todayRequests > 0 ? Math.round((successRequests / todayRequests) * 100) : 100,
      dailyBreakdown,
    });
  } catch (e) {
    console.error('[b2b/dashboard]', e);
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── API Keys ──────────────────────────────────────────────────────────
router.get('/keys', async (req, res) => {
  try {
    const keys = await prisma.apiKey.findMany({
      where: { userId: req.user.userId },
      select: {
        id: true, name: true, key: true,
        isActive: true, createdAt: true, lastUsedAt: true, expiresAt: true,
        _count: { select: { apiLogs: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    const masked = keys.map(k => ({ ...k, key: k.key.substring(0, 10) + '...' + k.key.slice(-4) }));
    return successResponse(res, masked);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

router.post('/keys', async (req, res) => {
  const { name } = req.body;
  if (!name?.trim()) return errorResponse(res, 400, 'VALIDATION_ERROR', 'Key name is required');

  const keyCount = await prisma.apiKey.count({ where: { userId: req.user.userId, isActive: true } });
  if (keyCount >= 5) return errorResponse(res, 400, 'LIMIT_EXCEEDED', 'Maximum 5 active API keys allowed');

  try {
    const apiKey = generateKey('ak');
    const apiSecret = generateKey('as');
    const secretHash = await bcrypt.hash(apiSecret, 10);

    const key = await prisma.apiKey.create({
      data: { name: name.trim(), key: apiKey, secretHash, userId: req.user.userId },
    });

    return successResponse(res, {
      id: key.id,
      name: key.name,
      key: apiKey,
      secret: apiSecret,
      message: 'Store your API secret securely — it will not be shown again!',
    });
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

router.delete('/keys/:id', async (req, res) => {
  try {
    const key = await prisma.apiKey.findFirst({
      where: { id: req.params.id, userId: req.user.userId },
    });
    if (!key) return errorResponse(res, 404, 'NOT_FOUND', 'API key not found');

    await prisma.apiKey.update({ where: { id: req.params.id }, data: { isActive: false } });
    await cacheDel(`apikey:${key.key}`);
    return successResponse(res, { message: 'API key revoked successfully' });
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── Usage History ─────────────────────────────────────────────────────
router.get('/usage', async (req, res) => {
  const { page = 1, limit = 50, startDate, endDate } = req.query;

  const where = {
    userId: req.user.userId,
    ...((startDate || endDate) && {
      createdAt: {
        ...(startDate && { gte: new Date(startDate) }),
        ...(endDate && { lte: new Date(endDate) }),
      },
    }),
  };

  try {
    const [logs, total] = await Promise.all([
      prisma.apiLog.findMany({
        where,
        select: {
          id: true, endpoint: true, method: true,
          statusCode: true, responseTime: true, createdAt: true,
          apiKey: { select: { name: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.apiLog.count({ where }),
    ]);
    return paginatedResponse(res, logs, total, page, parseInt(limit));
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── State Access (read) ───────────────────────────────────────────────
router.get('/access', async (req, res) => {
  try {
    const access = await prisma.userStateAccess.findMany({
      where: { userId: req.user.userId },
      include: { state: { select: { id: true, name: true, code: true } } },
    });
    return successResponse(res, access.map(a => a.state));
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

module.exports = router;