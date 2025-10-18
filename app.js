#!/usr/bin/env node
// Entry point for Passenger (Node.js application)
// This file is required by Phusion Passenger to run the Node.js application

import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { createRequire } from 'module';

// For Passenger compatibility
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Ensure the exports directory exists
import fs from 'fs';
import path from 'path';
const exportsDir = path.resolve(__dirname, 'exports');
if (!fs.existsSync(exportsDir)) {
  fs.mkdirSync(exportsDir, { recursive: true });
  console.log('✓ Created exports directory');
}

// Start the application
console.log('Starting SchoolRanker application...');
console.log('Node version:', process.version);
console.log('Working directory:', process.cwd());

// Import and start the main application
import('./dist/index.js').catch((err) => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
