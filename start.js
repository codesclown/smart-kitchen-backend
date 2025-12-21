#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

// Check if we're in a deployment environment
const isDeployment = process.env.NODE_ENV === 'production' || process.env.RENDER;

console.log('🚀 Starting Smart Kitchen Backend...');
console.log('Environment:', process.env.NODE_ENV || 'development');
console.log('Deployment mode:', isDeployment ? 'Yes' : 'No');

// In deployment, make sure we have the built files
if (isDeployment) {
  const fs = require('fs');
  const serverPath = path.join(__dirname, 'dist', 'server.js');
  
  if (!fs.existsSync(serverPath)) {
    console.error('❌ Built server.js not found. Running build...');
    
    // Run build process
    const buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      cwd: __dirname
    });
    
    buildProcess.on('close', (code) => {
      if (code === 0) {
        console.log('✅ Build completed successfully');
        startServer();
      } else {
        console.error('❌ Build failed with code:', code);
        process.exit(1);
      }
    });
  } else {
    startServer();
  }
} else {
  startServer();
}

function startServer() {
  console.log('🎯 Starting server...');
  
  const serverProcess = spawn('node', ['dist/server.js'], {
    stdio: 'inherit',
    cwd: __dirname,
    env: { ...process.env }
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  });
  
  serverProcess.on('close', (code) => {
    console.log('Server process exited with code:', code);
    process.exit(code);
  });
  
  // Handle graceful shutdown
  process.on('SIGINT', () => {
    console.log('🛑 Received SIGINT, shutting down gracefully...');
    serverProcess.kill('SIGINT');
  });
  
  process.on('SIGTERM', () => {
    console.log('🛑 Received SIGTERM, shutting down gracefully...');
    serverProcess.kill('SIGTERM');
  });
}