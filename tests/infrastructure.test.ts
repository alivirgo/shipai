import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { generateProductionProxy } from '../src/core/pack/proxyGenerator.js';
import { generateCostGuardrails } from '../src/core/pack/guardrailGenerator.js';
import { generateCloudManifests } from '../src/core/pack/cloudManifests.js';
import { generateBespokeDocSuite } from '../src/core/pack/bespokeDocSuite.js';
import { detectFramework } from '../src/core/pack/frameworkDetector.js';

const INFRA_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'infra-test-dir');

describe('Enterprise Infrastructure & Packaging', () => {
  beforeEach(async () => {
    await fs.ensureDir(INFRA_DIR);
    await fs.writeJson(path.join(INFRA_DIR, 'package.json'), {
      name: 'enterprise-solution',
      dependencies: { express: '^4.19.0' }
    });
  });

  afterEach(async () => {
    await fs.remove(INFRA_DIR);
  });

  it('should generate production Caddy reverse proxy with security headers', async () => {
    const res = await generateProductionProxy(INFRA_DIR, 3000);
    expect(res.caddyfilePath).toBe('Caddyfile');

    const caddy = await fs.readFile(path.join(INFRA_DIR, 'Caddyfile'), 'utf-8');
    expect(caddy).toContain('Strict-Transport-Security');
    expect(caddy).toContain('X-Frame-Options');
    expect(caddy).toContain('reverse_proxy app:3000');
  });

  it('should generate enterprise AI cost guardrail middleware', async () => {
    const res = await generateCostGuardrails(INFRA_DIR, true);
    expect(res.middlewarePath).toContain('aiGuardrails.ts');

    const guardrail = await fs.readFile(path.join(INFRA_DIR, res.middlewarePath), 'utf-8');
    expect(guardrail).toContain('checkRateLimit');
    expect(guardrail).toContain('DAILY_COST_LIMIT_USD');
    expect(guardrail).toContain('aiGuardMiddleware');
  });

  it('should generate multi-cloud manifests', async () => {
    const info = await detectFramework(INFRA_DIR);
    const cloud = await generateCloudManifests(INFRA_DIR, info, 'EnterpriseApp');

    expect(cloud.manifestsCreated).toContain('railway.json');
    expect(cloud.manifestsCreated).toContain('render.yaml');

    expect(await fs.pathExists(path.join(INFRA_DIR, 'railway.json'))).toBe(true);
    expect(await fs.pathExists(path.join(INFRA_DIR, 'render.yaml'))).toBe(true);
  });

  it('should generate comprehensive client documentation and cryptographic delivery certificate', async () => {
    const info = await detectFramework(INFRA_DIR);
    const docs = await generateBespokeDocSuite({
      rootDir: INFRA_DIR,
      projectName: 'AcuityAI',
      clientName: 'Nexus Global Holdings',
      frameworkInfo: info,
      brandColor: '#0ea5e9'
    });

    expect(docs.docsCreated).toContain('README.md');
    expect(docs.docsCreated).toContain('ARCHITECTURE.md');
    expect(docs.docsCreated).toContain('DEPLOYMENT_RUNBOOK.md');
    expect(docs.docsCreated).toContain('DELIVERY_CERTIFICATE.md');
    expect(docs.docsCreated).toContain('BESPOKE_VERIFICATION.json');

    const certMd = await fs.readFile(path.join(INFRA_DIR, 'DELIVERY_CERTIFICATE.md'), 'utf-8');
    expect(certMd).toContain('Nexus Global Holdings');
    expect(certMd).toContain('OFFICIAL CERTIFICATE OF BESPOKE DELIVERY');

    const certJson = await fs.readJson(path.join(INFRA_DIR, 'BESPOKE_VERIFICATION.json'));
    expect(certJson.status).toBe('VERIFIED_AND_CERTIFIED');
    expect(certJson.clientName).toBe('Nexus Global Holdings');
  });
});
