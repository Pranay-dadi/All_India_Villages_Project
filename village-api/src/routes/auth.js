// src/routes/auth.js
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { errorResponse, successResponse } = require('../utils/response');
const { requestMeta } = require('../middleware/auth');

const router = express.Router();
const prisma = require('../lib/prisma'); // singleton

router.use(requestMeta);

// ─── Register (B2B) ───────────────────────────────────────────────────
router.post('/register',
  [
    body('email').isEmail().customSanitizer(val => val.toLowerCase().trim()),
    body('password').isLength({ min: 8 }).matches(/^(?=.*[A-Z])(?=.*[0-9])/),
    body('businessName').trim().isLength({ min: 2, max: 100 }),
    body('phone').customSanitizer(val => String(val || '').replace(/\s+/g, '')).matches(/^\+?[0-9]{7,15}$/),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = errors.array()[0];
      const fieldMessages = {
        email: 'Please enter a valid email address',
        password: 'Password must be at least 8 characters with 1 uppercase letter and 1 number',
        businessName: 'Business name must be between 2 and 100 characters',
        phone: 'Please enter a valid phone number (7-15 digits, optional + prefix)',
      };
      const message = fieldMessages[err.path] || fieldMessages[err.param] || err.msg || 'Validation error';
      return errorResponse(res, 400, 'VALIDATION_ERROR', message);
    }

    const { email, password, businessName, phone, gstNumber } = req.body;

    // Block free email providers
    const freeProviders = ['gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 'yopmail.com'];
    const domain = email.split('@')[1];
    if (freeProviders.includes(domain)) {
      return errorResponse(res, 400, 'INVALID_EMAIL', 'Please use a business email address');
    }

    try {
      const exists = await prisma.user.findUnique({ where: { email } });
      if (exists) return errorResponse(res, 409, 'EMAIL_EXISTS', 'Email already registered');

      const passwordHash = await bcrypt.hash(password, 12);
      const user = await prisma.user.create({
        data: {
          email,
          passwordHash,
          businessName,
          phone: String(phone).replace(/\s+/g, ''),
          gstNumber: gstNumber || null,
        },
      });

      return successResponse(res, {
        message: 'Registration successful. Your account is pending admin approval.',
        userId: user.id,
      });
    } catch (e) {
      console.error('[register]', e);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Registration failed');
    }
  }
);

// ─── Login ────────────────────────────────────────────────────────────
router.post('/login',
  [
    body('email').isEmail().customSanitizer(val => val.toLowerCase().trim()),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return errorResponse(res, 400, 'VALIDATION_ERROR', 'Invalid email or password format');
    }

    const { email, password } = req.body;

    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');

      const valid = await bcrypt.compare(password, user.passwordHash);
      if (!valid) return errorResponse(res, 401, 'INVALID_CREDENTIALS', 'Invalid email or password');

      if (user.status === 'PENDING_APPROVAL') {
        return errorResponse(res, 403, 'PENDING_APPROVAL', 'Account pending admin approval');
      }
      if (user.status === 'SUSPENDED') {
        return errorResponse(res, 403, 'ACCOUNT_SUSPENDED', 'Account has been suspended');
      }
      if (user.status === 'REJECTED') {
        return errorResponse(res, 403, 'ACCOUNT_REJECTED', 'Account registration was rejected');
      }

      const token = jwt.sign(
        { userId: user.id, email: user.email, isAdmin: user.isAdmin, planType: user.planType },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '24h' }
      );

      await prisma.user.update({
        where: { id: user.id },
        data: { lastActiveAt: new Date() },
      });

      return successResponse(res, {
        token,
        user: {
          id: user.id,
          email: user.email,
          businessName: user.businessName,
          planType: user.planType,
          isAdmin: user.isAdmin,
        },
      });
    } catch (e) {
      console.error('[login]', e);
      return errorResponse(res, 500, 'INTERNAL_ERROR', 'Login failed');
    }
  }
);

// ─── Me (profile) ────────────────────────────────────────────────────
router.get('/me', require('../middleware/auth').jwtAuth, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.userId },
      select: {
        id: true, email: true, businessName: true, gstNumber: true,
        phone: true, planType: true, status: true, isAdmin: true,
        createdAt: true, lastActiveAt: true,
      },
    });
    if (!user) return errorResponse(res, 404, 'NOT_FOUND', 'User not found');
    return successResponse(res, user);
  } catch (e) {
    return errorResponse(res, 500, 'INTERNAL_ERROR', 'Failed to fetch profile');
  }
});

module.exports = router;