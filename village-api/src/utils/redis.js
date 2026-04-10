// api/utils/redis.js
const Redis = require('ioredis');

let redis = null;

function getRedis() {
  if (!redis) {
    if (!process.env.REDIS_URL) {
      console.warn('[Redis] REDIS_URL not set — using in-memory fallback');
      return null;
    }
    redis = new Redis(process.env.REDIS_URL, {
      tls: process.env.REDIS_TLS === 'true' ? {} : undefined,
      maxRetriesPerRequest: 3,
      lazyConnect: true,
    });
    redis.on('error', (err) => console.error('[Redis] Error:', err.message));
    redis.on('connect', () => console.log('[Redis] Connected'));
  }
  return redis;
}

// Simple in-memory fallback for dev/testing
const memCache = new Map();

async function cacheGet(key) {
  const r = getRedis();
  if (r) {
    try {
      const val = await r.get(key);
      return val ? JSON.parse(val) : null;
    } catch (e) { return null; }
  }
  const item = memCache.get(key);
  if (!item) return null;
  if (item.expires && Date.now() > item.expires) { memCache.delete(key); return null; }
  return item.value;
}

async function cacheSet(key, value, ttlSeconds = 3600) {
  const r = getRedis();
  if (r) {
    try { await r.setex(key, ttlSeconds, JSON.stringify(value)); } catch (e) {}
    return;
  }
  memCache.set(key, { value, expires: Date.now() + ttlSeconds * 1000 });
}

async function cacheDel(key) {
  const r = getRedis();
  if (r) {
    try { await r.del(key); } catch (e) {}
    return;
  }
  memCache.delete(key);
}

async function cacheGetOrSet(key, fetchFn, ttlSeconds = 3600) {
  const cached = await cacheGet(key);
  if (cached !== null) return cached;
  const value = await fetchFn();
  await cacheSet(key, value, ttlSeconds);
  return value;
}

// Rate limit helpers
async function incrementCounter(key, windowSeconds) {
  const r = getRedis();
  if (r) {
    const pipeline = r.pipeline();
    pipeline.incr(key);
    pipeline.expire(key, windowSeconds);
    const results = await pipeline.exec();
    return results[0][1];
  }
  const item = memCache.get(key);
  const now = Date.now();
  if (!item || now > item.expires) {
    memCache.set(key, { value: 1, expires: now + windowSeconds * 1000 });
    return 1;
  }
  item.value++;
  return item.value;
}

async function getCounter(key) {
  const r = getRedis();
  if (r) {
    try { return parseInt(await r.get(key) || '0'); } catch (e) { return 0; }
  }
  const item = memCache.get(key);
  return item ? item.value : 0;
}

module.exports = { getRedis, cacheGet, cacheSet, cacheDel, cacheGetOrSet, incrementCounter, getCounter };