// api/utils/response.js

// 🔥 BigInt serializer (Vercel-safe)
function serializeBigInt(obj) {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'bigint') return Number(obj);

  if (Array.isArray(obj)) return obj.map(serializeBigInt);

  if (typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([key, value]) => [key, serializeBigInt(value)])
    );
  }

  return obj;
}

function successResponse(res, data, meta = {}) {
  const safeData = serializeBigInt(data); // ✅ FIX
  const count = Array.isArray(safeData) ? safeData.length : undefined;

  return res.json({
    success: true,
    ...(count !== undefined && { count }),
    data: safeData, // ✅ FIX
    meta: {
      requestId: res.locals.requestId || 'unknown',
      responseTime: Date.now() - (res.locals.startTime || Date.now()),
      ...meta,
    },
  });
}

function errorResponse(res, statusCode, code, message) {
  return res.status(statusCode).json({
    success: false,
    error: { code, message },
  });
}

function paginatedResponse(res, data, total, page, limit, meta = {}) {
  const safeData = serializeBigInt(data); // ✅ FIX

  return res.json({
    success: true,
    count: safeData.length,
    total: Number(total), // ✅ FIX (important)
    page: parseInt(page),
    totalPages: Math.ceil(Number(total) / limit), // ✅ FIX
    data: safeData, // ✅ FIX
    meta: {
      requestId: res.locals.requestId || 'unknown',
      responseTime: Date.now() - (res.locals.startTime || Date.now()),
      ...meta,
    },
  });
}

module.exports = { successResponse, errorResponse, paginatedResponse };