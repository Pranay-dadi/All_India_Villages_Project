#!/usr/bin/env node
// scripts/import-data.js
// Usage: node scripts/import-data.js [--file path/to/file.xls] [--dir path/to/excel/dir]

require('dotenv').config();
const XLSX = require('xlsx');
const { PrismaClient } = require('@prisma/client');
const path = require('path');
const fs = require('fs');

const prisma = new PrismaClient();

// Parse args
const args = process.argv.slice(2);
const fileArg = args.find((a, i) => args[i - 1] === '--file');
const dirArg = args.find((a, i) => args[i - 1] === '--dir');

const EXCEL_DIR = dirArg || path.join(process.env.HOME || '/home', 'Documents/Bold_Analytics_Internship/All_India_Villages_Project/Excel_Sheets');
const BATCH_SIZE = 5000;

let stats = { states: 0, districts: 0, subDistricts: 0, villages: 0, errors: 0 };

async function ensureCountry() {
  return prisma.country.upsert({
    where: { code: 'IN' },
    create: { name: 'India', code: 'IN' },
    update: {},
  });
}

function readExcelFile(filePath) {
  const workbook = XLSX.readFile(filePath, { type: 'file' });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
  return rows;
}

function cleanCode(code) {
  if (code === null || code === undefined) return '000000';
  return String(code).trim().replace(/\s+/g, '').padStart(6, '0');
}

function cleanName(name) {
  return String(name || '').trim().replace(/\s+/g, ' ');
}

async function processFile(filePath, countryId) {
  const fileName = path.basename(filePath);
  console.log(`\n📂 Processing: ${fileName}`);

  let rows;
  try {
    rows = readExcelFile(filePath);
  } catch (e) {
    console.error(`  ❌ Failed to read file: ${e.message}`);
    stats.errors++;
    return;
  }

  if (rows.length === 0) {
    console.log('  ⚠️  No rows found');
    return;
  }

  // Detect column names (flexible)
  const sampleRow = rows[0];
  const keys = Object.keys(sampleRow);
  
  const stateCodeCol = keys.find(k => /MDDS.?STC|STATE.?CODE/i.test(k)) || keys[0];
  const stateNameCol = keys.find(k => /STATE.?NAME/i.test(k)) || keys[1];
  const distCodeCol = keys.find(k => /MDDS.?DTC|DIST.?CODE/i.test(k)) || keys[2];
  const distNameCol = keys.find(k => /DISTRICT.?NAME/i.test(k)) || keys[3];
  const subDistCodeCol = keys.find(k => /MDDS.?Sub_?DT|SUB.?DIST.?CODE/i.test(k)) || keys[4];
  const subDistNameCol = keys.find(k => /SUB.?DISTRICT.?NAME/i.test(k)) || keys[5];
  const villageCodeCol = keys.find(k => /MDDS.?PLCN|VILLAGE.?CODE/i.test(k)) || keys[6];
  const villageNameCol = keys.find(k => /Area.?Name|VILLAGE.?NAME/i.test(k)) || keys[7];

  console.log(`  📋 Columns detected: ${[stateCodeCol, stateNameCol, distCodeCol, distNameCol, subDistCodeCol, subDistNameCol, villageCodeCol, villageNameCol].join(', ')}`);

  // Cache maps to avoid repeated DB lookups
  const stateCache = new Map();
  const districtCache = new Map();
  const subDistrictCache = new Map();

  let villageBatch = [];
  let rowCount = 0;
  let skipped = 0;

  for (const row of rows) {
    rowCount++;
    try {
      const stateCode = cleanCode(row[stateCodeCol]);
      const stateName = cleanName(row[stateNameCol]);
      const distCode = cleanCode(row[distCodeCol]);
      const distName = cleanName(row[distNameCol]);
      const subDistCode = cleanCode(row[subDistCodeCol]);
      const subDistName = cleanName(row[subDistNameCol]);
      const villageCode = cleanCode(row[villageCodeCol]);
      const villageName = cleanName(row[villageNameCol]);

      // Skip header-like rows or rows with all zeros
      if (!stateName || stateName === stateCode || stateCode === '000000') { skipped++; continue; }
      if (!villageName || villageCode === '000000') { skipped++; continue; }

      // ── State ──
      const stateKey = stateCode;
      let stateId = stateCache.get(stateKey);
      if (!stateId) {
        const state = await prisma.state.upsert({
          where: { code: stateCode },
          create: { code: stateCode, name: stateName, countryId },
          update: { name: stateName },
        });
        stateId = state.id;
        stateCache.set(stateKey, stateId);
        stats.states++;
      }

      // ── District ──
      const distKey = `${stateCode}:${distCode}`;
      let districtId = districtCache.get(distKey);
      if (!districtId) {
        // Skip district-only rows (distCode === '000')
        if (distCode === '000000' || !distName) { skipped++; continue; }
        const district = await prisma.district.upsert({
          where: { code_stateId: { code: distCode, stateId } },
          create: { code: distCode, name: distName, stateId },
          update: { name: distName },
        });
        districtId = district.id;
        districtCache.set(distKey, districtId);
        stats.districts++;
      }

      // ── SubDistrict ──
      const subKey = `${distKey}:${subDistCode}`;
      let subDistrictId = subDistrictCache.get(subKey);
      if (!subDistrictId) {
        if (subDistCode === '000000' || !subDistName) { skipped++; continue; }
        const sub = await prisma.subDistrict.upsert({
          where: { code_districtId: { code: subDistCode, districtId } },
          create: { code: subDistCode, name: subDistName, districtId },
          update: { name: subDistName },
        });
        subDistrictId = sub.id;
        subDistrictCache.set(subKey, subDistrictId);
        stats.subDistricts++;
      }

      // ── Village (batched) ──
      villageBatch.push({
        code: villageCode,
        name: villageName,
        subDistrictId,
      });

      if (villageBatch.length >= BATCH_SIZE) {
        await flushVillages(villageBatch);
        villageBatch = [];
        process.stdout.write(`  ⏳ ${rowCount} rows processed...\r`);
      }

    } catch (e) {
      console.error(`  ❌ Row ${rowCount} error: ${e.message}`);
      stats.errors++;
    }
  }

  // Flush remaining
  if (villageBatch.length > 0) {
    await flushVillages(villageBatch);
  }

  console.log(`  ✅ Done: ${rowCount} rows, ${skipped} skipped`);
}

async function flushVillages(batch) {
  // createMany with skipDuplicates
  try {
    const result = await prisma.village.createMany({
      data: batch,
      skipDuplicates: true,
    });
    stats.villages += result.count;
  } catch (e) {
    // Fallback: upsert each
    for (const v of batch) {
      try {
        await prisma.village.upsert({
          where: { code_subDistrictId: { code: v.code, subDistrictId: v.subDistrictId } },
          create: v,
          update: { name: v.name },
        });
        stats.villages++;
      } catch (err) {
        stats.errors++;
      }
    }
  }
}

async function main() {
  console.log('🚀 Village API Data Import Tool');
  console.log('================================');

  const country = await ensureCountry();
  console.log(`✅ Country: ${country.name} (${country.code})`);

  let files = [];
  
  if (fileArg) {
    files = [fileArg];
  } else if (fs.existsSync(EXCEL_DIR)) {
    const dirFiles = fs.readdirSync(EXCEL_DIR);
    files = dirFiles
      .filter(f => /\.(xls|xlsx|ods)$/i.test(f))
      .map(f => path.join(EXCEL_DIR, f))
      .sort();
    console.log(`📁 Found ${files.length} files in ${EXCEL_DIR}`);
  } else {
    console.error(`❌ Excel directory not found: ${EXCEL_DIR}`);
    console.log('Usage: node scripts/import-data.js --dir /path/to/excel/files');
    console.log('   or: node scripts/import-data.js --file /path/to/file.xls');
    process.exit(1);
  }

  const startTime = Date.now();

  for (const file of files) {
    await processFile(file, country.id);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);

  console.log('\n=============================');
  console.log('📊 Import Summary');
  console.log('=============================');
  console.log(`States:        ${stats.states}`);
  console.log(`Districts:     ${stats.districts}`);
  console.log(`Sub-Districts: ${stats.subDistricts}`);
  console.log(`Villages:      ${stats.villages}`);
  console.log(`Errors:        ${stats.errors}`);
  console.log(`Time:          ${elapsed}s`);
  console.log('=============================');

  // Verification queries
  console.log('\n🔍 Verification:');
  const counts = await Promise.all([
    prisma.state.count(),
    prisma.district.count(),
    prisma.subDistrict.count(),
    prisma.village.count(),
  ]);
  console.log(`DB States: ${counts[0]}, Districts: ${counts[1]}, SubDistricts: ${counts[2]}, Villages: ${counts[3]}`);

  await prisma.$disconnect();
}

main().catch(async (e) => {
  console.error('Fatal error:', e);
  await prisma.$disconnect();
  process.exit(1);
});