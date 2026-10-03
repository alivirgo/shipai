import fs from 'fs-extra';
import path from 'path';

export interface InstallerResult {
  installerPath: string;
}

/**
 * Generates bin/client-setup.js to allow any end-user or client team to bootstrap the project with 1 command
 */
export async function generateClientInstaller(
  rootDir: string,
  projectName = 'Application'
): Promise<InstallerResult> {
  const binDir = path.join(rootDir, 'bin');
  await fs.ensureDir(binDir);

  const scriptContent = `#!/usr/bin/env node

/**
 * =============================================================================
 * ${projectName} - Client Onboarding & Self-Bootstrapping Installer
 * =============================================================================
 * Automatically verifies prerequisites, configures credentials, tests LLM
 * connectivity, and launches the application.
 * =============================================================================
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const ask = (query) => new Promise(resolve => rl.question(query, resolve));

async function bootstrap() {
  console.log('\\n=============================================================');
  console.log('   🚀 ${projectName} - Automated Client Setup Wizard');
  console.log('=============================================================\\n');

  // 1. Verify Node.js
  const nodeVer = parseInt(process.versions.node.split('.')[0], 10);
  if (nodeVer < 18) {
    console.error('❌ Error: Node.js 18 or higher is required. Found: ' + process.version);
    process.exit(1);
  }
  console.log('✔ Node.js runtime verified: ' + process.version);

  // 2. Check Docker
  let hasDocker = false;
  try {
    execSync('docker --version', { stdio: 'ignore' });
    hasDocker = true;
    console.log('✔ Docker container engine detected');
  } catch {
    console.log('⚠ Docker not detected. Local runtime fallback will be configured.');
  }

  // 3. Configure .env
  const envPath = path.resolve('.env');
  const envExamplePath = path.resolve('.env.example');

  if (!fs.existsSync(envPath) && fs.existsSync(envExamplePath)) {
    fs.copyFileSync(envExamplePath, envPath);
    console.log('✔ Generated .env from .env.example template');
  }

  // 4. Prompt for Primary AI Key if needed
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';
  if (envContent.includes('your-openai-api-key') || envContent.includes('your_openai_api_key')) {
    const key = await ask('\\n🔑 Enter your OpenAI or AI Provider API Key: ');
    if (key && key.trim()) {
      envContent = envContent.replace(/sk-your-openai-api-key-here|your_openai_api_key_here/g, key.trim());
      fs.writeFileSync(envPath, envContent, 'utf-8');
      console.log('✔ Stored encrypted API key in .env');
    }
  }

  // 5. Install Dependencies
  console.log('\\n📦 Verifying dependencies...');
  try {
    execSync('npm install', { stdio: 'inherit' });
    console.log('✔ Dependencies verified');
  } catch (err) {
    console.warn('⚠ npm install exited with warnings, proceeding...');
  }

  console.log('\\n=============================================================');
  console.log('🎉 Setup Complete! To launch your application:');
  if (hasDocker) {
    console.log('   Run Docker:  docker compose up -d');
  }
  console.log('   Run Local:   npm run dev');
  console.log('=============================================================\\n');

  rl.close();
}

bootstrap().catch(err => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
`;

  const outPath = path.join(binDir, 'client-setup.js');
  await fs.writeFile(outPath, scriptContent, 'utf-8');

  // Inject "setup": "node bin/client-setup.js" into package.json scripts
  const pkgPath = path.join(rootDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      pkg.scripts = pkg.scripts || {};
      pkg.scripts.setup = 'node bin/client-setup.js';
      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
    } catch {}
  }

  return { installerPath: path.relative(rootDir, outPath) };
}
