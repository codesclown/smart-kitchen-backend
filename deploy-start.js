#!/usr/bin/env node

// Load environment variables if .env file exists (for local testing)
const fs = require('fs');
const path = require('path');

if (fs.existsSync('.env')) {
  require('dotenv').config();
  console.log('📄 Loaded .env file for local testing');
}

console.log('🚀 Smart Kitchen Backend - Deployment Start');
console.log('Node.js version:', process.version);
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Port:', process.env.PORT || '4000');
console.log('Current directory:', process.cwd());

// Check if required files exist
const requiredFiles = [
  'dist/server.js',
  'package.json',
  'node_modules/@prisma/client'
];

console.log('\n📋 Checking required files...');
for (const file of requiredFiles) {
  const exists = fs.existsSync(path.join(process.cwd(), file));
  console.log(`${exists ? '✅' : '❌'} ${file}: ${exists ? 'Found' : 'Missing'}`);
  
  if (!exists) {
    console.error(`❌ Critical file missing: ${file}`);
    process.exit(1);
  }
}

// Check environment variables
console.log('\n🔧 Checking environment variables...');
const requiredEnvVars = ['DATABASE_URL', 'JWT_SECRET'];
const optionalEnvVars = ['OPENAI_API_KEY', 'PORT', 'NODE_ENV'];

for (const envVar of requiredEnvVars) {
  const value = process.env[envVar];
  console.log(`${value ? '✅' : '❌'} ${envVar}: ${value ? 'Set' : 'Missing'}`);
  
  if (!value) {
    console.error(`❌ Required environment variable missing: ${envVar}`);
    process.exit(1);
  }
}

for (const envVar of optionalEnvVars) {
  const value = process.env[envVar];
  console.log(`${value ? '✅' : '⚠️'} ${envVar}: ${value ? 'Set' : 'Not set'}`);
}

console.log('\n🎯 Starting server...');

// Start the server
try {
  require('./dist/server.js');
} catch (error) {
  console.error('❌ Failed to start server:', error);
  console.error('Stack trace:', error.stack);
  process.exit(1);
}