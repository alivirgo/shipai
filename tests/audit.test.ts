import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { auditProject } from '../src/core/audit/projectAuditor.js';
import { scanForSecrets } from '../src/core/audit/secretScanner.js';
import { scanEnvironmentVariables } from '../src/core/audit/envScanner.js';
import { scanForAIResidue } from '../src/core/audit/residueScanner.js';

const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'mock-ai-project');

describe('Audit Module', () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
    // Create package.json with missing build script
    await fs.writeJson(path.join(TEST_DIR, 'package.json'), {
      name: 'old-ai-prototype',
      scripts: {
        dev: 'node index.js'
      }
    });

    // Create an AI residue file
    await fs.writeFile(path.join(TEST_DIR, '.cursorrules'), 'You are a coding assistant');

    // Create a file with hardcoded OpenAI key and process.env references
    await fs.writeFile(
      path.join(TEST_DIR, 'index.js'),
      `
      const key = "sk-proj-1234567890abcdef1234567890abcdef1234";
      const dbUrl = process.env.DATABASE_URL;
      const stripeKey = process.env.STRIPE_SECRET_KEY;
      console.log("Created by v0");
      `
    );
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('should detect hardcoded secrets', async () => {
    const secrets = await scanForSecrets(TEST_DIR);
    expect(secrets.length).toBeGreaterThan(0);
    expect(secrets[0].patternName).toContain('OpenAI');
    expect(secrets[0].maskedSnippet).toContain('sk-proj');
  });

  it('should detect AI residue files and watermarks', async () => {
    const residues = await scanForAIResidue(TEST_DIR);
    const hasCursorRules = residues.some(r => r.relativePath === '.cursorrules');
    const hasWatermark = residues.some(r => r.type === 'watermark');
    expect(hasCursorRules).toBe(true);
    expect(hasWatermark).toBe(true);
  });

  it('should identify environment variables referenced in code', async () => {
    const envReport = await scanEnvironmentVariables(TEST_DIR);
    expect(envReport.detectedInCode).toContain('DATABASE_URL');
    expect(envReport.detectedInCode).toContain('STRIPE_SECRET_KEY');
    expect(envReport.hasEnvExample).toBe(false);
  });

  it('should compute readiness score and issue recommendations', async () => {
    const report = await auditProject(TEST_DIR);
    expect(report.readinessScore).toBeLessThan(80);
    expect(report.isShipReady).toBe(false);
    expect(report.issues.some(i => i.severity === 'CRITICAL')).toBe(true);
  });
});
