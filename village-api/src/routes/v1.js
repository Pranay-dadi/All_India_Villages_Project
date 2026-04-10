// src/routes/v1.js
const express = require('express');
const { apiKeyAuth, rateLimiter, logApiCall, requestMeta } = require('../middleware/auth');
const { cacheGetOrSet } = require('../utils/redis');
const { successResponse, errorResponse, paginatedResponse } = require('../utils/response');

const router = express.Router();
const prisma = require('../lib/prisma');

// Apply to all v1 routes
router.use(requestMeta);
router.use(apiKeyAuth);
router.use(rateLimiter);
router.use(logApiCall);

// ─── Helper: check state access ────────────────────────────────────
async function checkStateAccess(userId, stateId) {
  const access = await prisma.userStateAccess.findUnique({
    where: { userId_stateId: { userId, stateId } },
  });
  return !!access;
}

// ─── GET /states ────────────────────────────────────────────────────
router.get('/states', async (req, res) => {
  try {
    const data = await cacheGetOrSet('v1:states:all', async () => {
      return prisma.state.findMany({
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      });
    }, 86400); // Cache 24h
    return successResponse(res, data);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── GET /states/:id/districts ──────────────────────────────────────
router.get('/states/:id/districts', async (req, res) => {
  const { id } = req.params;
  try {
    // Check access
    const hasAccess = await checkStateAccess(req.apiKey.userId, id);
    if (!hasAccess) return errorResponse(res, 403, 'ACCESS_DENIED', 'No access to this state');

    const data = await cacheGetOrSet(`v1:districts:state:${id}`, async () => {
      return prisma.district.findMany({
        where: { stateId: id },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      });
    }, 86400);
    return successResponse(res, data);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── GET /districts/:id/subdistricts ─────────────────────────────────
router.get('/districts/:id/subdistricts', async (req, res) => {
  const { id } = req.params;
  try {
    const district = await prisma.district.findUnique({
      where: { id },
      select: { stateId: true },
    });
    if (!district) return errorResponse(res, 404, 'NOT_FOUND', 'District not found');

    const hasAccess = await checkStateAccess(req.apiKey.userId, district.stateId);
    if (!hasAccess) return errorResponse(res, 403, 'ACCESS_DENIED', 'No access to this state');

    const data = await cacheGetOrSet(`v1:subdistricts:district:${id}`, async () => {
      return prisma.subDistrict.findMany({
        where: { districtId: id },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
      });
    }, 86400);
    return successResponse(res, data);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── GET /subdistricts/:id/villages ──────────────────────────────────
router.get('/subdistricts/:id/villages', async (req, res) => {
  const { id } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(500, Math.max(10, parseInt(req.query.limit) || 100));

  try {
    const sub = await prisma.subDistrict.findUnique({
      where: { id },
      include: { district: { select: { stateId: true } } },
    });
    if (!sub) return errorResponse(res, 404, 'NOT_FOUND', 'Sub-district not found');

    const hasAccess = await checkStateAccess(req.apiKey.userId, sub.district.stateId);
    if (!hasAccess) return errorResponse(res, 403, 'ACCESS_DENIED', 'No access to this state');

    const [data, total] = await Promise.all([
      prisma.village.findMany({
        where: { subDistrictId: id },
        select: { id: true, code: true, name: true },
        orderBy: { name: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.village.count({ where: { subDistrictId: id } }),
    ]);

    return paginatedResponse(res, data, total, page, limit);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── GET /search ──────────────────────────────────────────────────────
router.get('/search', async (req, res) => {
  const { q, state, district, subDistrict, limit: limitParam } = req.query;

  if (!q || q.trim().length < 2) {
    return errorResponse(res, 400, 'INVALID_QUERY', 'Search query must be at least 2 characters');
  }

  const limit = Math.min(100, Math.max(5, parseInt(limitParam) || 20));
  const searchTerm = q.trim();

  try {
    // Get user's accessible states
    const accessList = await prisma.userStateAccess.findMany({
      where: { userId: req.apiKey.userId },
      select: { stateId: true },
    });
    const accessibleStateIds = accessList.map(a => a.stateId);
    if (accessibleStateIds.length === 0) {
      return errorResponse(res, 403, 'ACCESS_DENIED', 'No state access configured');
    }

    const where = {
      name: { contains: searchTerm, mode: 'insensitive' },
      subDistrict: {
        district: {
          stateId: { in: accessibleStateIds },
          ...(state && { stateId: state }),
          ...(district && { id: district }),
        },
        ...(subDistrict && { id: subDistrict }),
      },
    };

    const villages = await prisma.village.findMany({
      where,
      take: limit,
      select: {
        id: true, code: true, name: true,
        subDistrict: {
          select: {
            id: true, name: true,
            district: {
              select: {
                id: true, name: true,
                state: { select: { id: true, name: true } },
              },
            },
          },
        },
      },
      orderBy: { name: 'asc' },
    });

    const data = villages.map(v => ({
      value: v.id,
      label: v.name,
      fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
      hierarchy: {
        village: v.name,
        villageCode: v.code,
        subDistrict: v.subDistrict.name,
        subDistrictId: v.subDistrict.id,
        district: v.subDistrict.district.name,
        districtId: v.subDistrict.district.id,
        state: v.subDistrict.district.state.name,
        stateId: v.subDistrict.district.state.id,
        country: 'India',
      },
    }));

    return successResponse(res, data);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

// ─── GET /autocomplete ────────────────────────────────────────────────
router.get('/autocomplete', async (req, res) => {
  const { q, hierarchyLevel = 'village' } = req.query;

  if (!q || q.trim().length < 2) {
    return errorResponse(res, 400, 'INVALID_QUERY', 'Query must be at least 2 characters');
  }

  try {
    const accessList = await prisma.userStateAccess.findMany({
      where: { userId: req.apiKey.userId },
      select: { stateId: true },
    });
    const accessibleStateIds = accessList.map(a => a.stateId);

    let data = [];
    if (hierarchyLevel === 'village' || !hierarchyLevel) {
      const villages = await prisma.village.findMany({
        where: {
          name: { startsWith: q.trim(), mode: 'insensitive' },
          subDistrict: { district: { stateId: { in: accessibleStateIds } } },
        },
        take: 10,
        select: {
          id: true, name: true,
          subDistrict: {
            select: {
              name: true,
              district: { select: { name: true, state: { select: { name: true } } } },
            },
          },
        },
      });
      data = villages.map(v => ({
        value: v.id,
        label: v.name,
        description: `${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}`,
        fullAddress: `${v.name}, ${v.subDistrict.name}, ${v.subDistrict.district.name}, ${v.subDistrict.district.state.name}, India`,
      }));
    }

    return successResponse(res, data);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', e.message);
  }
});

module.exports = router;