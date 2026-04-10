# VillageAPI — India's Village Data Platform

Production-grade SaaS REST API for India's complete village-level geographical data.

---

## Table of Contents

1. [Project Structure](#1-project-structure)
2. [Prerequisites](#2-prerequisites)
3. [Infrastructure Setup](#3-infrastructure-setup)
4. [Local Development Setup](#4-local-development-setup)
5. [Data Import](#5-data-import)
6. [Running the Application](#6-running-the-application)
7. [Admin Setup](#7-admin-setup)
8. [API Usage](#8-api-usage)
9. [Deployment to Vercel](#9-deployment-to-vercel)
10. [Demo Client](#10-demo-client)
11. [Architecture Reference](#11-architecture-reference)
12. [Troubleshooting](#12-troubleshooting)

---

## 1. Project Structure

```
village-api/
├── api/                    # Backend (Node.js + Express)
│   ├── index.js            # Entry point
│   ├── middleware/
│   │   └── auth.js         # JWT + API key auth + rate limiting
│   ├── routes/
│   │   ├── auth.js         # /api/auth/* (login, register)
│   │   ├── v1.js           # /api/v1/* (public API endpoints)
│   │   ├── admin.js        # /api/admin/* (admin panel)
│   │   └── b2b.js          # /api/b2b/* (B2B user portal)
│   └── utils/
│       ├── redis.js        # Redis + in-memory cache
│       └── response.js     # Standardized response helpers
├── prisma/
│   └── schema.prisma       # Database schema
├── frontend/               # React dashboard
│   └── src/
│       ├── pages/
│       │   ├── auth/       # Login, Register
│       │   ├── admin/      # Admin dashboard, users, logs, villages
│       │   └── b2b/        # B2B dashboard, keys, usage, docs
│       ├── store/          # Zustand auth store
│       └── utils/          # API client, helpers
├── scripts/
│   ├── import-data.js      # Excel → Database importer
│   └── seed-admin.js       # Create admin user
├── demo-client/
│   └── index.html          # Standalone demo application
├── .env.example            # Environment variables template
├── vercel.json             # Vercel deployment config
└── package.json
```

---

## 2. Prerequisites

Install these tools before starting:

```bash
# Check Node.js version (need 18+)
node --version

# Install Node.js 20 LTS if needed (Ubuntu/Debian)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Check npm version
npm --version

# Install Git if needed
sudo apt-get install -y git

# Verify installations
node --version   # Should be v18+ or v20+
npm --version    # Should be 9+
```

---

## 3. Infrastructure Setup

### 3.1 NeonDB (PostgreSQL) — Free Tier Available

1. Go to **https://neon.tech** → Sign up (free)
2. Click **"Create Project"**
3. Name it: `village-api`
4. Region: `AWS ap-south-1` (Mumbai — lowest latency for India)
5. Copy the **Connection String** — it looks like:
   ```
   postgresql://username:password@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require
   ```
6. Save this as `DATABASE_URL` in your `.env` file

### 3.2 Upstash Redis — Free Tier Available

1. Go to **https://upstash.com** → Sign up (free)
2. Click **"Create Database"**
3. Name: `village-api-cache`
4. Region: `AP-South-1` (Mumbai)
5. Type: **Regional** (not Global for free tier)
6. After creation, go to **Details** tab
7. Copy the **Redis URL** — it looks like:
   ```
   redis://default:xxxxx@us1-xxx.upstash.io:6379
   ```
   Or for TLS:
   ```
   rediss://default:xxxxx@us1-xxx.upstash.io:6379
   ```
8. Save as `REDIS_URL` in your `.env` file

> **Note**: If you skip Redis, the app uses an in-memory fallback automatically. This works for development but not for production multi-instance deployments.

### 3.3 SMTP Email (Optional)

For Gmail App Password:
1. Go to Google Account → Security → 2-Step Verification → App passwords
2. Generate password for "Mail"
3. Use: `SMTP_HOST=smtp.gmail.com`, `SMTP_PORT=587`

---

## 4. Local Development Setup

### Step 1: Clone / Set up the project

```bash
# Navigate to project (already created)
cd ~/Documents/Bold_Analytics_Internship/All_India_Villages_Project

# If starting fresh, copy village-api folder here
# Otherwise just cd into it:
cd village-api
```

### Step 2: Configure environment variables

```bash
# Copy the example env file
cp .env.example .env

# Edit it with your values
nano .env
# OR use any text editor
```

Fill in these required values in `.env`:
```env
DATABASE_URL="postgresql://username:password@ep-xxx.ap-south-1.aws.neon.tech/neondb?sslmode=require"
REDIS_URL="redis://default:xxxx@ep-xxx.upstash.io:6379"
JWT_SECRET="generate-a-random-string-minimum-32-chars-here"
ADMIN_EMAIL="admin@yourdomain.com"
ADMIN_PASSWORD="YourSecurePassword@123"
FRONTEND_URL="http://localhost:5173"
```

Generate a strong JWT secret:
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### Step 3: Install backend dependencies

```bash
# In the root village-api directory
cd ~/Documents/Bold_Analytics_Internship/All_India_Villages_Project/village-api

npm install
```

### Step 4: Install frontend dependencies

```bash
cd frontend
npm install
cd ..
```

### Step 5: Set up the database schema

```bash
# Generate Prisma client from schema
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push
```

Expected output:
```
🚀  Your database is now in sync with your Prisma schema.
✅  Generated Prisma Client
```

### Step 6: Create the admin user

```bash
npm run seed:admin
```

Expected output:
```
✅ Admin user created/updated: admin@yourdomain.com
   Password: YourSecurePassword@123
   isAdmin: true
⚠️  Please change the admin password after first login!
```

---

## 5. Data Import

This imports all Excel files from your `Excel_Sheets` directory into the database.

### Quick Import (All States)

```bash
# Import all Excel files from the default directory
node scripts/import-data.js --dir ~/Documents/Bold_Analytics_Internship/All_India_Villages_Project/Excel_Sheets
```

### Import Single File (for testing)

```bash
# Test with one state first
node scripts/import-data.js --file ~/Documents/Bold_Analytics_Internship/All_India_Villages_Project/Excel_Sheets/Rdir_2011_02_HIMACHAL_PRADESH.xls
```

### Import with Custom Directory

```bash
node scripts/import-data.js --dir /path/to/your/excel/files
```

### What the import does:
1. Creates `India` country record
2. For each Excel file:
   - Reads all rows (handles `.xls`, `.xlsx`, `.ods` formats)
   - Upserts states → districts → sub-districts
   - Batch-inserts villages in chunks of 5,000
3. Prints summary with counts and errors

### Expected Import Output:
```
🚀 Village API Data Import Tool
================================
✅ Country: India (IN)
📁 Found 30 files in .../Excel_Sheets

📂 Processing: Rdir_2011_02_HIMACHAL_PRADESH.xls
  📋 Columns detected: MDDS STC, STATE NAME, ...
  ✅ Done: 18432 rows, 12 skipped

📂 Processing: Rdir_2011_27_MAHARASHTRA.xls
  ✅ Done: 44829 rows, 18 skipped

... (continues for all states)

=============================
📊 Import Summary
=============================
States:        36
Districts:     726
Sub-Districts: 6,528
Villages:      618,942
Errors:        0
Time:          847.3s
=============================

🔍 Verification:
DB States: 36, Districts: 726, SubDistricts: 6528, Villages: 618942
```

> **Note**: Full import of ~600K villages takes 10–20 minutes depending on your connection to NeonDB.

### Verify Import via Prisma Studio

```bash
npm run db:studio
# Opens browser at http://localhost:5555
# Browse all tables visually
```

---

## 6. Running the Application

### Development Mode (Backend + Frontend together)

```bash
# From the root village-api directory
npm run dev
```

This starts:
- **Backend API**: http://localhost:3000
- **Frontend Dashboard**: http://localhost:5173

### Run Backend Only

```bash
npm run dev:api
# API available at http://localhost:3000
```

### Run Frontend Only

```bash
npm run dev:frontend
# Dashboard at http://localhost:5173
```

### Verify API is working

```bash
# Health check
curl http://localhost:3000/health

# Expected:
# {"status":"ok","timestamp":"...","version":"1.0.0","environment":"development"}
```

---

## 7. Admin Setup

### 7.1 Log in as Admin

1. Open http://localhost:5173
2. Login with your `ADMIN_EMAIL` and `ADMIN_PASSWORD`
3. You'll be redirected to `/admin` (admin panel)

### 7.2 Approve a B2B User

1. Go to **Users** → find user with "Pending" status
2. Click the green ✓ button to approve
3. Go to **Users** → click into user → **State Access**
4. Select states they should have access to, or toggle "Grant All States"
5. Click **Update Access**

### 7.3 Grant Yourself API Access (for testing)

After approving a B2B user, log in as that user and create an API key.

Or via API directly:
```bash
# First login as admin to get JWT token
TOKEN=$(curl -s -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@yourdomain.com","password":"YourSecurePassword@123"}' \
  | node -e "let d=''; process.stdin.on('data',c=>d+=c).on('end',()=>console.log(JSON.parse(d).data.token))")

echo "Token: $TOKEN"
```

---

## 8. API Usage

### Authentication Headers

```bash
X-API-Key: ak_your_api_key_here
```

### Example API Calls

```bash
export API_KEY="ak_your_api_key_here"
export BASE="http://localhost:3000/api/v1"

# List all states
curl -H "X-API-Key: $API_KEY" "$BASE/states"

# Search villages
curl -H "X-API-Key: $API_KEY" "$BASE/search?q=manibeli"

# Autocomplete (for typeahead)
curl -H "X-API-Key: $API_KEY" "$BASE/autocomplete?q=akkalk"

# Get districts of Maharashtra
STATE_ID="<state-id-from-states-response>"
curl -H "X-API-Key: $API_KEY" "$BASE/states/$STATE_ID/districts"

# Get villages in a sub-district (paginated)
SUB_ID="<subdistrict-id>"
curl -H "X-API-Key: $API_KEY" "$BASE/subdistricts/$SUB_ID/villages?page=1&limit=100"
```

### Response Format

```json
{
  "success": true,
  "count": 5,
  "data": [
    {
      "value": "clxxx",
      "label": "Manibeli",
      "fullAddress": "Manibeli, Akkalkuwa, Nandurbar, Maharashtra, India",
      "hierarchy": {
        "village": "Manibeli",
        "subDistrict": "Akkalkuwa",
        "district": "Nandurbar",
        "state": "Maharashtra",
        "country": "India"
      }
    }
  ],
  "meta": {
    "requestId": "req_abc",
    "responseTime": 47
  }
}
```

### Rate Limit Headers in Response

```
X-RateLimit-Limit: 5000
X-RateLimit-Remaining: 4850
X-RateLimit-Reset: 2024-01-15T00:00:00Z
```

---

## 9. Deployment to Vercel

### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

### Step 2: Build the frontend

```bash
cd frontend
npm run build
cd ..
```

### Step 3: Deploy

```bash
# Login to Vercel
vercel login

# Deploy (first time - follow interactive prompts)
vercel

# When asked:
# - Set up and deploy? YES
# - Which scope? Your account
# - Link to existing project? NO (first time)
# - Project name? village-api
# - Root directory? ./ (current folder)
```

### Step 4: Set environment variables on Vercel

```bash
# Set each required variable
vercel env add DATABASE_URL
vercel env add REDIS_URL
vercel env add JWT_SECRET
vercel env add ADMIN_EMAIL
vercel env add ADMIN_PASSWORD
vercel env add FRONTEND_URL
vercel env add NODE_ENV

# When prompted, paste values and select environments (Production, Preview, Development)
```

Or set them via the Vercel dashboard:
1. Go to https://vercel.com → your project
2. Settings → Environment Variables
3. Add all variables from `.env.example`

### Step 5: Deploy to production

```bash
vercel --prod
```

### Step 6: Run DB migration on production

```bash
# Set DATABASE_URL temporarily for migration
export DATABASE_URL="your-neon-db-url"
npm run db:migrate
npm run seed:admin
```

### Step 7: Import data to production

```bash
# Point to production database
DATABASE_URL="your-neon-db-url" node scripts/import-data.js \
  --dir ~/Documents/Bold_Analytics_Internship/All_India_Villages_Project/Excel_Sheets
```

---

## 10. Demo Client

The demo client is a standalone HTML file that demonstrates the autocomplete API.

### Run Locally

```bash
# Simple — just open in browser
open demo-client/index.html

# Or serve with any static server
npx serve demo-client
# Opens at http://localhost:3000 (or next available port)
```

### Configure Demo Client

Edit `demo-client/index.html`, find the config section near the bottom:

```javascript
const API_URL = 'http://localhost:3000/v1';  // Change to production URL
const API_KEY = 'DEMO_KEY';                  // Replace with actual demo key
```

### Deploy Demo Client Separately

```bash
# Deploy only the demo to Vercel
cd demo-client
vercel
# URL: village-api-demo.vercel.app
```

### Create a Demo API Key

1. Register a test account at http://localhost:5173/register
2. Approve it in admin panel
3. Grant access to Maharashtra state only
4. Log in as the test user
5. Create an API key named "Demo Key"
6. Update `demo-client/index.html` with the key

---

## 11. Architecture Reference

### Plan Limits

| Plan      | Price     | Daily Requests | Burst/min |
|-----------|-----------|----------------|-----------|
| Free      | $0        | 5,000          | 100       |
| Premium   | $49/mo    | 50,000         | 500       |
| Pro       | $199/mo   | 300,000        | 2,000     |
| Unlimited | $499/mo   | 1,000,000      | 5,000     |

### API Endpoints Summary

| Method | Endpoint | Auth |
|--------|----------|------|
| POST | /api/auth/login | None |
| POST | /api/auth/register | None |
| GET | /api/auth/me | JWT |
| GET | /api/v1/states | API Key |
| GET | /api/v1/states/:id/districts | API Key |
| GET | /api/v1/districts/:id/subdistricts | API Key |
| GET | /api/v1/subdistricts/:id/villages | API Key |
| GET | /api/v1/search | API Key |
| GET | /api/v1/autocomplete | API Key |
| GET | /api/admin/stats | JWT + Admin |
| GET | /api/admin/users | JWT + Admin |
| PATCH | /api/admin/users/:id | JWT + Admin |
| PUT | /api/admin/users/:id/state-access | JWT + Admin |
| GET | /api/admin/logs | JWT + Admin |
| GET | /api/admin/villages | JWT + Admin |
| GET | /api/b2b/dashboard | JWT |
| GET | /api/b2b/keys | JWT |
| POST | /api/b2b/keys | JWT |
| DELETE | /api/b2b/keys/:id | JWT |
| GET | /api/b2b/usage | JWT |
| GET | /api/b2b/access | JWT |

### Database Tables

```
Country → State → District → SubDistrict → Village
                                              (600K+ rows)
User → ApiKey → ApiLog
User → UserStateAccess → State
```

---

## 12. Troubleshooting

### Database connection error

```bash
# Test connection manually
node -e "
const {PrismaClient} = require('@prisma/client');
const p = new PrismaClient();
p.\$connect().then(() => console.log('✅ DB connected')).catch(console.error)
"
```

Check:
- `DATABASE_URL` is correct in `.env`
- NeonDB project is not paused (free tier auto-pauses after inactivity)
- SSL mode: add `?sslmode=require` to the connection string

### Prisma client not found

```bash
npm run db:generate
# Regenerates the Prisma client from schema
```

### Import fails for .ods file

The script handles `.ods` (LibreOffice format) used by `Rdir_2011_09_UTTAR_PRADESH.ods`. If it fails:

```bash
# Convert to xlsx first using LibreOffice
libreoffice --headless --convert-to xlsx Rdir_2011_09_UTTAR_PRADESH.ods
```

### Redis connection error

The app falls back to in-memory cache automatically if Redis is unavailable. You'll see:
```
[Redis] REDIS_URL not set — using in-memory fallback
```
This is fine for development.

### Port already in use

```bash
# Find and kill process on port 3000
lsof -i :3000
kill -9 <PID>

# Or change the port
PORT=4000 npm run dev:api
```

### Frontend build error

```bash
cd frontend
rm -rf node_modules
npm install
npm run build
```

### JWT token expired

Tokens expire after 24 hours. Simply log in again.

---

## Quick Reference: All Commands

```bash
# ── Setup ───────────────────────────────────────────
npm install                    # Install backend deps
cd frontend && npm install     # Install frontend deps
cd ..

# ── Database ────────────────────────────────────────
npm run db:generate            # Generate Prisma client
npm run db:push                # Push schema to DB (dev)
npm run db:migrate             # Run migrations (prod)
npm run db:studio              # Open Prisma Studio (GUI)

# ── Seed ────────────────────────────────────────────
npm run seed:admin             # Create admin user

# ── Import Data ─────────────────────────────────────
node scripts/import-data.js --dir /path/to/excel/files
node scripts/import-data.js --file /path/to/single.xls

# ── Development ─────────────────────────────────────
npm run dev                    # Backend + Frontend
npm run dev:api                # Backend only (port 3000)
npm run dev:frontend           # Frontend only (port 5173)

# ── Production ──────────────────────────────────────
npm run build                  # Build frontend
npm start                      # Start production server

# ── Vercel ──────────────────────────────────────────
vercel                         # Deploy to preview
vercel --prod                  # Deploy to production
vercel env add DATABASE_URL    # Add env variable
vercel logs                    # View production logs
```
