#!/usr/bin/env node

/**
 * Custom build script that provides localStorage file path for Node.js v25+
 * This resolves the "Cannot initialize local storage without a --localstorage-file path" error
 */

const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

// Create a temporary directory for localStorage during build
const tmpDir = path.join(__dirname, '..', '.tmp');
if (!fs.existsSync(tmpDir)) {
  fs.mkdirSync(tmpDir, { recursive: true });
}

const localStoragePath = path.join(tmpDir, 'build-localstorage');

// Run react-scripts build with NODE_OPTIONS to provide localStorage file path
const nodeOptions = process.env.NODE_OPTIONS || '';
const newNodeOptions = `${nodeOptions} --localstorage-file="${localStoragePath}"`.trim();

console.log('Starting build with localStorage support...');

const buildProcess = spawn('react-scripts', ['build'], {
  stdio: 'inherit',
  shell: true,
  env: {
    ...process.env,
    NODE_OPTIONS: newNodeOptions
  }
});

buildProcess.on('exit', (code) => {
  // Clean up temporary localStorage file
  try {
    if (fs.existsSync(localStoragePath)) {
      fs.unlinkSync(localStoragePath);
    }
  } catch (error) {
    // Ignore cleanup errors
  }

  process.exit(code);
});
