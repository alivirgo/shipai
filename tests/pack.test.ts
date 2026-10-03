import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { detectFramework } from '../src/core/pack/frameworkDetector.js';
import { generateDockerConfigs } from '../src/core/pack/dockerGenerator.js';
import { generateEnvExample } from '../src/core/pack/envExampleGenerator.js';
import { generateCicdWorkflows } from '../src/core/pack/cicdGenerator.js';
import { generateProjectDocs } from '../src/core/pack/documentationGenerator.js';

const PACK_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'pack-test-dir');

describe('Packaging & Shipping Module', () => {
  beforeEach(async () => {
    await fs.ensureDir(PACK_DIR);
    await fs.writeJson(path.join(PACK_DIR, 'package.json'), {
      name: 'client-next-app',
      dependencies: {
        next: '14.0.0',
        react: '18.2.0'
      },
      scripts: {
        dev: 'next dev',
        build: 'next build',
        start: 'next start'
      }
    });

    await fs.writeFile(
      path.join(PACK_DIR, 'app.ts'),
      `
      const key = process.env.OPENAI_API_KEY;
      const db = process.env.DATABASE_URL;
      const port = process.env.PORT;
      `
    );
  });

  afterEach(async () => {
    await fs.remove(PACK_DIR);
  });

  it('should detect Next.js framework', async () => {
    const info = await detectFramework(PACK_DIR);
    expect(info.framework).toBe('nextjs');
    expect(info.port).toBe(3000);
  });

  it('should generate production Docker configurations', async () => {
    const info = await detectFramework(PACK_DIR);
    const dockerResult = await generateDockerConfigs(PACK_DIR, info, 'client-app');

    expect(dockerResult.filesCreated).toContain('Dockerfile');
    expect(dockerResult.filesCreated).toContain('.dockerignore');
    expect(dockerResult.filesCreated).toContain('docker-compose.yml');

    const dockerfile = await fs.readFile(path.join(PACK_DIR, 'Dockerfile'), 'utf-8');
    expect(dockerfile).toContain('FROM node:20-alpine');
    expect(dockerfile).toContain('nextjs');

    const compose = await fs.readFile(path.join(PACK_DIR, 'docker-compose.yml'), 'utf-8');
    expect(compose).toContain('client-app');
    expect(compose).toContain('3000:3000');
  });

  it('should generate documented .env.example', async () => {
    const envResult = await generateEnvExample(PACK_DIR, 'ClientApp');
    expect(envResult.totalVars).toBeGreaterThan(0);
    expect(envResult.vars).toContain('OPENAI_API_KEY');
    expect(envResult.vars).toContain('DATABASE_URL');

    const envContent = await fs.readFile(path.join(PACK_DIR, '.env.example'), 'utf-8');
    expect(envContent).toContain('OPENAI_API_KEY=');
    expect(envContent).toContain('DATABASE_URL=');
    expect(envContent).toContain('AI Providers');
  });

  it('should generate CI/CD workflows and client docs', async () => {
    const info = await detectFramework(PACK_DIR);
    const cicdResult = await generateCicdWorkflows(PACK_DIR, info, 'client-app');
    expect(cicdResult.workflowsCreated.length).toBeGreaterThan(0);

    const docResult = await generateProjectDocs({
      rootDir: PACK_DIR,
      projectName: 'OmniPortal',
      clientName: 'Global Logistics Inc',
      frameworkInfo: info
    });

    expect(docResult.docsCreated).toContain('README.md');
    expect(docResult.docsCreated).toContain('DEPLOYMENT.md');

    const readme = await fs.readFile(path.join(PACK_DIR, 'README.md'), 'utf-8');
    expect(readme).toContain('Global Logistics Inc');
    expect(readme).toContain('Omni Portal');
    expect(readme).toContain('docker compose up -d');
  });
});
