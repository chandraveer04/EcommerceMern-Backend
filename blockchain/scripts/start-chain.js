#!/usr/bin/env node

/**
 * Script to start a local development blockchain using Ganache
 * This will create a blockchain instance on localhost:7545
 */

const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('Starting local development blockchain...');

// Check if Ganache is installed
let ganachePath;
try {
  // require.resolve('ganache');
  ganachePath = require.resolve('ganache/bin/ganache.js');
  console.log('Ganache found. Starting blockchain...');
} catch (err) {
  console.error('Ganache not found. Installing...');
  console.log('Please run: npm install ganache --save-dev');
  process.exit(1);
}

// Get port from environment or use default
const port = process.env.BLOCKCHAIN_PORT || 7545;

// Set up ganache options
const options = [
  '--port', port,
  '--chain.chainId', '5777',
  '--wallet.deterministic', // Use deterministic addresses
  '--wallet.totalAccounts', '10',
  '--miner.blockTime', '1', // Add new block every second for testing
  '--wallet.defaultBalance', '1000',
  '--database.dbPath', path.join(__dirname, '../ganache-db'),
  '--logging.quiet', 'true', // Reduce console noise
];

// Check if database exists and notify user
const dbPath = path.join(__dirname, '../ganache-db');
if (fs.existsSync(dbPath)) {
  console.log(`Using existing blockchain database at ${dbPath}`);
}

// Start ganache using Node.js directly instead of npx
const ganache = spawn('node', [ganachePath, ...options], { stdio: 'inherit' });

// Handle process termination
process.on('SIGINT', () => {
  console.log('Shutting down blockchain...');
  ganache.kill();
  process.exit();
});

process.on('SIGTERM', () => {
  console.log('Shutting down blockchain...');
  ganache.kill();
  process.exit();
});

// Log process started
console.log(`Blockchain running on http://localhost:${port}`);
console.log('Press Ctrl+C to stop'); 