import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { setupVectorDatabase } from '../src/core/pack/vectorDatabaseGenerator.js';
import { runPreShipVerification } from '../src/core/verify/smokeTestRunner.js';

const VEC_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'vec-test');

describe('Vector Database Seeding & Pre-Ship Verification Gate', () => {
  beforeEach(async () => {
    await fs.ensureDir(VEC_DIR);
    await fs.writeJson(path.join(VEC_DIR, 'package.json'), {
      name: 'rag-ai-app',
      dependencies: {
        '@qdrant/js-client-rest': '^1.9.0'
      }
    });

    await fs.writeFile(path.join(VEC_DIR, 'Dockerfile'), 'FROM node:20-alpine\n');
    await fs.writeFile(path.join(VEC_DIR, 'docker-compose.yml'), 'services: {}\n');
    await fs.writeFile(path.join(VEC_DIR, '.env.example'), 'PORT=3000\n');
    await fs.writeFile(path.join(VEC_DIR, 'README.md'), '# App\n');
    await fs.writeFile(path.join(VEC_DIR, 'DELIVERY_CERTIFICATE.md'), '# Cert\n');
  });

  afterEach(async () => {
    await fs.remove(VEC_DIR);
  });

  it('should detect vector DB and generate knowledge base seeding script', async () => {
    const res = await setupVectorDatabase(VEC_DIR);
    expect(res.hasVectorDb).toBe(true);
    expect(res.dbType).toBe('qdrant');
    expect(res.seedScriptPath).toBe('scripts/seed-knowledge.js');

    const seedCode = await fs.readFile(path.join(VEC_DIR, 'scripts', 'seed-knowledge.js'), 'utf-8');
    expect(seedCode).toContain('seedKnowledgeBase');
  });

  it('should run pre-ship verification and emit report', async () => {
    const report = await runPreShipVerification(VEC_DIR);
    expect(report.score).toBeGreaterThanOrEqual(80);
    expect(report.checks.length).toBeGreaterThan(0);
    expect(await fs.pathExists(path.join(VEC_DIR, 'VERIFICATION_REPORT.json'))).toBe(true);
  });
});
