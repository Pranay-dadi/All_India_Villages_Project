#!/usr/bin/env node
// scripts/seed-admin.js
require('dotenv').config();
const bcrypt = require('bcryptjs');
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  const email = process.env.ADMIN_EMAIL || 'admin@villageapi.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

  const passwordHash = await bcrypt.hash(password, 12);

  const admin = await prisma.user.upsert({
    where: { email },
    create: {
      email,
      passwordHash,
      businessName: 'VillageAPI Admin',
      phone: '+910000000000',
      planType: 'UNLIMITED',
      status: 'ACTIVE',
      isAdmin: true,
    },
    update: { passwordHash, isAdmin: true, status: 'ACTIVE' },
  });

  console.log(`✅ Admin user created/updated: ${admin.email}`);
  console.log(`   Password: ${password}`);
  console.log(`   isAdmin: ${admin.isAdmin}`);
  console.log('\n⚠️  Please change the admin password after first login!');

  await prisma.$disconnect();
}

main().catch(console.error);