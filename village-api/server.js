// server.js — Local development server only (not used by Vercel)
const app = require('./src/app');
//BigInt.prototype.toJSON = function () {
//  return Number(this);
//};
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 VillageAPI running on http://localhost:${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`\nAvailable routes:`);
  console.log(`  GET  http://localhost:${PORT}/api/health`);
  console.log(`  POST http://localhost:${PORT}/api/auth/login`);
  console.log(`  POST http://localhost:${PORT}/api/auth/register`);
  console.log(`  GET  http://localhost:${PORT}/api/v1/states   (needs X-API-Key)`);
});