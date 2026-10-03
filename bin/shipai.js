#!/usr/bin/env node

import('../dist/cli.js').catch((err) => {
  console.error('Failed to load ShipAI CLI binary:', err.message);
  process.exit(1);
});
