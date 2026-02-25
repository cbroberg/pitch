#!/usr/bin/env node
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Run the CLI
import('../src/index.ts').catch((err) => {
  console.error(err);
  process.exit(1);
});
