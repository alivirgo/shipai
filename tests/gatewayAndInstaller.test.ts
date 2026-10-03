import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { generateUniversalAiBridge } from '../src/core/pack/universalAiBridge.js';
import { generateClientInstaller } from '../src/core/pack/clientInstaller.js';
import { generateK8sManifests } from '../src/core/pack/k8sGenerator.js';
import { generateClientManuals } from '../src/core/pack/clientManualGenerator.js';

const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'gateway-installer-test');

describe('Universal AI Gateway, Installer & Manuals', () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
    await fs.writeJson(path.join(TEST_DIR, 'package.json'), {
      name: 'client-app',
      scripts: {}
    });
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('should generate universal AI bridge with multi-provider mappings', async () => {
    const res = await generateUniversalAiBridge(TEST_DIR, true);
    expect(res.gatewayPath).toContain('universalGateway.ts');

    const content = await fs.readFile(path.join(TEST_DIR, res.gatewayPath), 'utf-8');
    expect(content).toContain('deepseek');
    expect(content).toContain('anthropic');
    expect(content).toContain('ollama');
    expect(content).toContain('executeAiCompletion');
  });

  it('should generate client self-bootstrapping installer and inject script', async () => {
    const res = await generateClientInstaller(TEST_DIR, 'OmniDesk');
    expect(res.installerPath).toContain('client-setup.js');

    const pkg = await fs.readJson(path.join(TEST_DIR, 'package.json'));
    expect(pkg.scripts.setup).toBe('node bin/client-setup.js');

    const installerContent = await fs.readFile(path.join(TEST_DIR, res.installerPath), 'utf-8');
    expect(installerContent).toContain('Automated Client Setup Wizard');
  });

  it('should generate Kubernetes deployment manifests', async () => {
    const res = await generateK8sManifests(TEST_DIR, 'OmniDesk', 3000);
    expect(res.manifests).toContain('k8s/deployment.yaml');
    expect(res.manifests).toContain('k8s/service.yaml');
    expect(res.manifests).toContain('k8s/ingress.yaml');

    const deployContent = await fs.readFile(path.join(TEST_DIR, 'k8s', 'deployment.yaml'), 'utf-8');
    expect(deployContent).toContain('omnidesk-deployment');
    expect(deployContent).toContain('containerPort: 3000');
  });

  it('should generate user manual and administrator guide', async () => {
    const res = await generateClientManuals(TEST_DIR, 'OmniDesk', 'Apex Global');
    expect(res.manualsCreated).toContain('USER_MANUAL.md');
    expect(res.manualsCreated).toContain('ADMIN_OPERATIONS_GUIDE.md');

    const userManual = await fs.readFile(path.join(TEST_DIR, 'USER_MANUAL.md'), 'utf-8');
    expect(userManual).toContain('Apex Global');
    expect(userManual).toContain('End-User Operational Manual');
  });
});
