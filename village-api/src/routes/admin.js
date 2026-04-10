// src/routes/admin.js
const express = require('express');
const { jwtAuth, adminOnly, requestMeta } = require('../middleware/auth');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');
const { cacheDel } = require('../utils/redis');

const router = express.Router();
const prisma = require('../lib/prisma'); // singleton

router.use(requestMeta);
router.use(jwtAuth);
router.use(adminOnly);

// ─── Dashboard Stats ──────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
    const thirtyDaysAgo = new Date(today); thirtyDaysAgo.setDate(today.getDate() - 30);

    const [
      totalVillages,
      totalUsers,
      activeUsersToday,
      activeUsersYesterday,
      apiRequestsToday,
      avgResponseTime,
      planDistribution,
      usersByStatus,
    ] = await Promise.all([
      prisma.village.count(),
      prisma.user.count({ where: { isAdmin: false } }),
      prisma.user.count({ where: { lastActiveAt: { gte: today }, isAdmin: false } }),
      prisma.user.count({ where: { lastActiveAt: { gte: yesterday, lt: today }, isAdmin: false } }),
      prisma.apiLog.count({ where: { createdAt: { gte: today } } }),
      prisma.apiLog.aggregate({
        where: { createdAt: { gte: today } },
        _avg: { responseTime: true },
      }),
      prisma.user.groupBy({ by: ['planType'], where: { isAdmin: false }, _count: true }),
      prisma.user.groupBy({ by: ['status'], where: { isAdmin: false }, _count: true }),
    ]);

    // Raw queries — Prisma stores camelCase columns quoted in Postgres
    const dailyRequestsRaw = await prisma.$queryRaw`
      SELECT DATE("createdAt") as date, COUNT(*) as count
      FROM "ApiLog"
      WHERE "createdAt" >= ${thirtyDaysAgo}
      GROUP BY DATE("createdAt")
      ORDER BY date ASC
    `;

    const dailyRequests = dailyRequestsRaw.map(d => ({
      date: d.date,
      count: Number(d.count), // ✅ FIX BigInt here
    }));

    const topEndpoints = await prisma.apiLog.groupBy({
      by: ['endpoint'],
      where: { createdAt: { gte: thirtyDaysAgo } },
      _count: true,
      orderBy: { _count: { endpoint: 'desc' } },
      take: 10,
    });

    const responseTimes = await prisma.apiLog.findMany({
      where: { createdAt: { gte: today } },
      select: { responseTime: true },
      orderBy: { responseTime: 'asc' },
    });
    const p95 = responseTimes[Math.floor(responseTimes.length * 0.95)]?.responseTime || 0;
    const p99 = responseTimes[Math.floor(responseTimes.length * 0.99)]?.responseTime || 0;

    return successResponse(res, {
      overview: {
        totalVillages,
        totalUsers,
        activeUsersToday,
        activeUsersYesterday,
        apiRequestsToday,
        avgResponseTime: Math.round(avgResponseTime._avg.responseTime || 0),
        p95ResponseTime: p95,
        p99ResponseTime: p99,
      },
      planDistribution: planDistribution.map(p => ({ plan: p.planType, count: p._count })),
      usersByStatus: usersByStatus.map(s => ({ status: s.status, count: s._count })),
      dailyRequests,
      topEndpoints: topEndpoints.map(e => ({ endpoint: e.endpoint, count: e._count })),
    });
  } catch (e) {
    console.error('[admin/stats]', e);
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── Users List ────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  const { page = 1, limit = 20, search, status, planType, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
  const skip = (parseInt(page) - 1) * parseInt(limit);

  const where = {
    isAdmin: false,
    ...(search && {
      OR: [
        { email: { contains: search, mode: 'insensitive' } },
        { businessName: { contains: search, mode: 'insensitive' } },
      ],
    }),
    ...(status && { status }),
    ...(planType && { planType }),
  };

  try {
    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        select: {
          id: true, email: true, businessName: true, planType: true,
          status: true, createdAt: true, lastActiveAt: true, phone: true,
          _count: { select: { apiKeys: true, apiLogs: true } },
        },
        orderBy: { [sortBy]: sortOrder },
        skip,
        take: parseInt(limit),
      }),
      prisma.user.count({ where }),
    ]);
    return paginatedResponse(res, users, total, page, parseInt(limit));
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── User Detail ───────────────────────────────────────────────────────
router.get('/users/:id', async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.params.id },
      include: {
        apiKeys: { select: { id: true, name: true, key: true, isActive: true, createdAt: true, lastUsedAt: true } },
        stateAccess: { include: { state: { select: { id: true, name: true, code: true } } } },
        _count: { select: { apiLogs: true } },
      },
    });
    if (!user) return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
    user.apiKeys = user.apiKeys.map(k => ({ ...k, key: k.key.substring(0, 8) + '...' }));
    return successResponse(res, user);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── Update User ────────────────────────────────────────────────────────
router.patch('/users/:id', async (req, res) => {
  const { status, planType, notes } = req.body;
  const data = {};
  if (status) data.status = status;
  if (planType) data.planType = planType;
  if (notes !== undefined) data.notes = notes;

  try {
    const user = await prisma.user.update({
      where: { id: req.params.id },
      data,
      select: { id: true, email: true, status: true, planType: true },
    });
    return successResponse(res, user);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── State Access Management ────────────────────────────────────────────
router.put('/users/:id/state-access', async (req, res) => {
  const { stateIds, grantAll } = req.body;

  try {
    await prisma.userStateAccess.deleteMany({ where: { userId: req.params.id } });

    let finalStateIds = stateIds || [];
    if (grantAll) {
      const allStates = await prisma.state.findMany({ select: { id: true } });
      finalStateIds = allStates.map(s => s.id);
    }

    if (finalStateIds.length > 0) {
      await prisma.userStateAccess.createMany({
        data: finalStateIds.map(stateId => ({ userId: req.params.id, stateId })),
        skipDuplicates: true,
      });
    }

    return successResponse(res, { message: 'State access updated', count: finalStateIds.length });
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── API Logs ──────────────────────────────────────────────────────────
router.get('/logs', async (req, res) => {
  const {
    page = 1, limit = 50,
    userId, startDate, endDate,
    endpoint, statusCode, minResponseTime,
  } = req.query;

  const where = {
    ...(userId && { userId }),
    ...(endpoint && { endpoint: { contains: endpoint } }),
    ...(statusCode && { statusCode: { gte: parseInt(statusCode), lt: parseInt(statusCode) + 100 } }),
    ...(minResponseTime && { responseTime: { gte: parseInt(minResponseTime) } }),
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
        include: {
          user: { select: { email: true, businessName: true } },
          apiKey: { select: { name: true, key: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: parseInt(limit),
      }),
      prisma.apiLog.count({ where }),
    ]);

    const sanitized = logs.map(log => ({
      ...log,
      ipAddress: log.ipAddress.replace(/(\d+\.\d+)\.\d+\.\d+/, '$1.x.x'),
      apiKey: { ...log.apiKey, key: log.apiKey.key.substring(0, 8) + '...' },
    }));

    return paginatedResponse(res, sanitized, total, page, parseInt(limit));
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── Villages Browser ──────────────────────────────────────────────────
router.get('/villages', async (req, res) => {
  const { stateId, districtId, subDistrictId, search, page = 1, limit = 500 } = req.query;

  if (!stateId) return errorResponse(res, 400, 'INVALID_QUERY', 'stateId is required');

  const where = {
    subDistrict: {
      district: {
        stateId,
        ...(districtId && { id: districtId }),
      },
      ...(subDistrictId && { id: subDistrictId }),
    },
    ...(search && { name: { contains: search, mode: 'insensitive' } }),
  };

  try {
    const [villages, total] = await Promise.all([
      prisma.village.findMany({
        where,
        select: {
          id: true, code: true, name: true,
          subDistrict: {
            select: {
              name: true,
              district: { select: { name: true, state: { select: { name: true } } } },
            },
          },
        },
        orderBy: { name: 'asc' },
        skip: (parseInt(page) - 1) * parseInt(limit),
        take: Math.min(10000, parseInt(limit)),
      }),
      prisma.village.count({ where }),
    ]);
    return paginatedResponse(res, villages, total, page, parseInt(limit));
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── Geography dropdowns ───────────────────────────────────────────────
router.get('/geography/states', async (req, res) => {
  try {
    const states = await prisma.state.findMany({
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true, _count: { select: { districts: true } } },
    });
    return successResponse(res, states);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

router.get('/geography/districts/:stateId', async (req, res) => {
  try {
    const districts = await prisma.district.findMany({
      where: { stateId: req.params.stateId },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
    return successResponse(res, districts);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

router.get('/geography/subdistricts/:districtId', async (req, res) => {
  try {
    const subs = await prisma.subDistrict.findMany({
      where: { districtId: req.params.districtId },
      orderBy: { name: 'asc' },
      select: { id: true, code: true, name: true },
    });
    return successResponse(res, subs);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

module.exports = router;