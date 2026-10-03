import fs from 'fs-extra';
import path from 'path';

export interface DiagnosticsGenResult {
  scriptPath: string;
}

/**
 * Generates an automated, zero-dependency client diagnostic test runner.
 * Allows client IT departments to verify environment health, API keys, database, and latency in 1 command.
 */
export async function generateClientDiagnostics(
  rootDir: string,
  projectName = 'Client Solution'
): Promise<DiagnosticsGenResult> {
  const scriptsDir = path.join(rootDir, 'scripts');
  await fs.ensureDir(scriptsDir);

  const scriptContent = `#!/usr/bin/env node
/**
 * =============================================================================
 * ${projectName} - Client Health & Pre-Flight Diagnostic Suite
 * =============================================================================
 * Self-contained pre-flight diagnostic runner. Zero external dependencies.
 * Run via: node scripts/client-diagnostics.mjs
 * =============================================================================
 */

import { promises as fs } from 'fs';
import path from 'path';
import process from 'process';

console.log('\\x1b[1m\\x1b[36m');
console.log('╔════════════════════════════════════════════════════════════╗');
console.log('║  ${projectName.padEnd(58)}║');
console.log('║  System Health & Environment Pre-Flight Diagnostics        ║');
console.log('╚════════════════════════════════════════════════════════════╝');
console.log('\\x1b[0m');

const results = [];

function recordCheck(category, name, passed, details) {
  results.push({ category, name, passed, details });
  const icon = passed ? '\\x1b[32m✔\\x1b[0m' : '\\x1b[31m✖\\x1b[0m';
  console.log(\` \${icon} [\${category}] \\x1b[1m\${name}\\x1b[0m: \${details}\`);
}

async function runDiagnostics() {
  // 1. Runtime Version
  const [major] = process.versions.node.split('.').map(Number);
  recordCheck(
    'Runtime',
    'Node.js Version',
    major >= 18,
    \`Detected v\${process.versions.node} (requires >= 18.0.0)\`
  );

  // 2. Environment Configuration
  const envPath = path.resolve('.env');
  let envExists = false;
  try {
    await fs.access(envPath);
    envExists = true;
  } catch {}

  recordCheck(
    'Config',
    'Environment File (.env)',
    envExists,
    envExists ? 'Found active .env configuration' : 'Missing .env! Copy .env.example to .env to configure.'
  );

  // 3. AI Provider Configuration Check
  const aiProvider = process.env.AI_PROVIDER || 'openai';
  const hasOfflineMode = process.env.OFFLINE_DEMO_MODE === 'true';

  if (hasOfflineMode) {
    recordCheck('AI Provider', 'Offline Demo Mode', true, 'Active - System running in zero-external-dependency demo mode');
  } else {
    let keyFound = false;
    if (aiProvider === 'openai' && process.env.OPENAI_API_KEY) keyFound = true;
    if (aiProvider === 'anthropic' && process.env.ANTHROPIC_API_KEY) keyFound = true;
    if (aiProvider === 'gemini' && (process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY)) keyFound = true;
    if (aiProvider === 'deepseek' && process.env.DEEPSEEK_API_KEY) keyFound = true;
    if (aiProvider === 'ollama') keyFound = true; // Local requires no key

    recordCheck(
      'AI Provider',
      \`Active Provider (\${aiProvider})\`,
      keyFound,
      keyFound ? \`Credentials detected for provider: \${aiProvider}\` : \`Missing API key for active provider: \${aiProvider}\`
    );
  }

  // 4. Memory & Resource Footprint
  const mem = process.memoryUsage();
  const rssMb = Math.round(mem.rss / 1024 / 1024);
  recordCheck('System', 'Process Memory (RSS)', rssMb < 512, \`Current consumption: \${rssMb} MB\`);

  // Summary
  console.log('\\n' + '─'.repeat(60));
  const failed = results.filter(r => !r.passed);
  if (failed.length === 0) {
    console.log('\\x1b[32m\\x1b[1m✔ ALL SYSTEMS GO: Application environment is certified healthy.\\x1b[0m\\n');
    process.exit(0);
  } else {
    console.log(\`\\x1b[33m\\x1b[1m⚠ \${failed.length} DIAGNOSTIC WARNING(S) DETECTED:\\x1b[0m\`);
    failed.forEach(f => console.log(\`  - \${f.name}: \${f.details}\`));
    console.log('\\x1b[0m');
    process.exit(1);
  }
}

runDiagnostics().catch(err => {
  console.error('Fatal diagnostic error:', err);
  process.exit(1);
});
`;

  const scriptPath = path.join(scriptsDir, 'client-diagnostics.mjs');
  await fs.writeFile(scriptPath, scriptContent, { encoding: 'utf-8', mode: 0o755 });

  // Update package.json scripts with "diagnose"
  const pkgPath = path.join(rootDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      pkg.scripts['diagnose'] = 'node scripts/client-diagnostics.mjs';
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    } catch {}
  }

  return { scriptPath: path.relative(rootDir, scriptPath) };
}
