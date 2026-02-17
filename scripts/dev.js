/**
 * Dev server wrapper
 * Loads env vars and starts Next.js dev server
 * Bypasses NODE_OPTIONS issues by not using -r flag
 */

// Load env before any imports
require('./load-env.js');

// Guardrail: Clear NODE_OPTIONS unconditionally (dev doesn't need it)
// Prevents: /usr/local/bin/node: --r= is not allowed in NODE_OPTIONS
if (process.env.NODE_OPTIONS) {
  console.warn('⚠️  Clearing NODE_OPTIONS (was:', process.env.NODE_OPTIONS, ')');
  delete process.env.NODE_OPTIONS;
}

// Start Next dev server
const { spawn } = require('child_process');
const path = require('path');

const nextBin = path.join(__dirname, '..', 'node_modules', '.bin', 'next');

const child = spawn('node', [nextBin, 'dev'], {
  stdio: 'inherit',
  env: process.env
});

child.on('exit', (code) => {
  process.exit(code || 0);
});
