// src/app.js — Express app (no app.listen, used by Vercel serverless)
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false, // disabled so frontend SPA works
}));

app.use(cors({
  origin: true, // allow all origins (Vercel handles domain security)
  credentials: true,
}));

app.use(compression());
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ─── Root ─────────────────────────────────────────────────────────────
app.get('/', (req, res) => {
  res.json({
    name: 'VillageAPI',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health:       'GET  /api/health',
      login:        'POST /api/auth/login',
      register:     'POST /api/auth/register',
      states:       'GET  /api/v1/states',
      search:       'GET  /api/v1/search?q=...',
      autocomplete: 'GET  /api/v1/autocomplete?q=...',
    },
  });
});

// ─── Health ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: process.env.DATABASE_URL ? 'configured' : 'missing',
  });
});

// ─── Routes ──────────────────────────────────────────────────────────
app.use('/api/auth',  require('./routes/auth'));
app.use('/api/v1',    require('./routes/v1'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/b2b',   require('./routes/b2b'));

// ─── 404 ─────────────────────────────────────────────────────────────
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    error: { code: 'NOT_FOUND', message: `API endpoint not found: ${req.method} ${req.path}` },
  });
});

// ─── Error Handler ────────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: {
      code: err.code || 'INTERNAL_ERROR',
      message: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
    },
  });
});

module.exports = app;