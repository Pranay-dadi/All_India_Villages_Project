// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

const { cacheGetOrSet, cacheGet, cacheSet, incrementCounter, getCounter } = require('../utils/redis');
const { errorResponse } = require('../utils/response');
const { v4: uuidv4 } = require('uuid');

const prisma = require('../lib/prisma');

// Plan limits
const PLAN_LIMITS = {
  FREE: parseInt(process.env.RATE_LIMIT_FREE) || 5000,
  PREMIUM: parseInt(process.env.RATE_LIMIT_PREMIUM) || 50000,
  PRO: parseInt(process.env.RATE_LIMIT_PRO) || 300000,
  UNLIMITED: parseInt(process.env.RATE_LIMIT_UNLIMITED) || 1000000,
};

const BURST_LIMITS = { FREE: 100, PREMIUM: 500, PRO: 2000, UNLIMITED: 5000 };

// Attach request metadata
function requestMeta(req, res, next) {
  res.locals.startTime = Date.now();
  res.locals.requestId = uuidv4();
  next();
}

// JWT Auth (for dashboard)
function jwtAuth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return errorResponse(res, 401, 'UNAUTHORIZED', 'Authentication required');
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (e) {
    return errorResponse(res, 401, 'INVALID_TOKEN', 'Invalid or expired token');
  }
}

// Admin only guard
function adminOnly(req, res, next) {
  if (!req.user?.isAdmin) return errorResponse(res, 403, 'FORBIDDEN', 'Admin access required');
  next();
}

// API Key Auth (for v1 endpoints)
async function apiKeyAuth(req, res, next) {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return errorResponse(res, 401, 'INVALID_API_KEY', 'X-API-Key header required');

  try {
    // Cache key lookup for performance
    const cacheKey = `apikey:${apiKey}`;
    let keyData = await cacheGet(cacheKey);

    if (!keyData) {
      const keyRecord = await prisma.apiKey.findUnique({
        where: { key: apiKey, isActive: true },
        include: { user: true },
      });
      if (!keyRecord) return errorResponse(res, 401, 'INVALID_API_KEY', 'Invalid API key');
      if (keyRecord.expiresAt && keyRecord.expiresAt < new Date()) {
        return errorResponse(res, 401, 'INVALID_API_KEY', 'API key expired');
      }
      if (keyRecord.user.status !== 'ACTIVE') {
        return errorResponse(res, 403, 'ACCESS_DENIED', 'Account not active');
      }
      keyData = {
        keyId: keyRecord.id,
        secretHash: keyRecord.secretHash,
        userId: keyRecord.user.id,
        planType: keyRecord.user.planType,
        userStatus: keyRecord.user.status,
      };
      await cacheSet(cacheKey, keyData, 300); // 5 min cache
    }

    req.apiKey = keyData;
    next();
  } catch (err) {
    console.error('[apiKeyAuth]', err);
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Authentication error');
  }
}

// Rate limiter middleware
async function rateLimiter(req, res, next) {
  if (!req.apiKey) return next();

  const { userId, planType } = req.apiKey;
  const dailyLimit = PLAN_LIMITS[planType] || PLAN_LIMITS.FREE;
  const burstLimit = BURST_LIMITS[planType] || BURST_LIMITS.FREE;

  // Daily limit key (resets at midnight UTC)
  const today = new Date().toISOString().split('T')[0];
  const dailyKey = `ratelimit:daily:${userId}:${today}`;
  const minuteKey = `ratelimit:minute:${userId}:${Math.floor(Date.now() / 60000)}`;

  const [dailyCount, minuteCount] = await Promise.all([
    getCounter(dailyKey),
    getCounter(minuteKey),
  ]);

  if (dailyCount >= dailyLimit) {
    res.set({
      'X-RateLimit-Limit': dailyLimit,
      'X-RateLimit-Remaining': 0,
      'X-RateLimit-Reset': new Date(Date.now() + 86400000).toISOString(),
    });
    return errorResponse(res, 429, 'RATE_LIMITED', 'Daily quota exceeded');
  }

  if (minuteCount >= burstLimit) {
    return errorResponse(res, 429, 'RATE_LIMITED', 'Burst rate limit exceeded');
  }

  // Increment counters
  const secondsUntilMidnight = 86400 - (Date.now() % 86400000) / 1000;
  const [newDaily] = await Promise.all([
    incrementCounter(dailyKey, Math.ceil(secondsUntilMidnight)),
    incrementCounter(minuteKey, 60),
  ]);

  res.set({
    'X-RateLimit-Limit': dailyLimit,
    'X-RateLimit-Remaining': Math.max(0, dailyLimit - newDaily),
    'X-RateLimit-Reset': new Date(Date.now() + secondsUntilMidnight * 1000).toISOString(),
  });

  next();
}

// Async API log writer
async function logApiCall(req, res, next) {
  res.on('finish', async () => {
    if (!req.apiKey) return;
    try {
      await prisma.apiLog.create({
        data: {
          apiKeyId: req.apiKey.keyId,
          userId: req.apiKey.userId,
          endpoint: req.path,
          method: req.method,
          statusCode: res.statusCode,
          responseTime: Date.now() - res.locals.startTime,
          ipAddress: req.ip?.substring(0, 45) || 'unknown',
          userAgent: req.get('User-Agent')?.substring(0, 255),
          queryParams: Object.keys(req.query).length ? req.query : undefined,
        },
      });
      // Update lastUsedAt async
      prisma.apiKey.update({
        where: { key: req.headers['x-api-key'] },
        data: { lastUsedAt: new Date() },
      }).catch(() => {});
    } catch (e) {
      console.error('[logApiCall] Failed to log:', e.message);
    }
  });
  next();
}

module.exports = { requestMeta, jwtAuth, adminOnly, apiKeyAuth, rateLimiter, logApiCall };