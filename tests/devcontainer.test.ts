import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { generateDevContainer } from '../src/core/pack/devcontainerGenerator.js';
import { detectFramework } from '../src/core/pack/frameworkDetector.js';

const DEV_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'devcontainer-test');

describe('DevContainer Specification Generator', () => {
  beforeEach(async () => {
    await fs.ensureDir(DEV_DIR);
    await fs.writeJson(path.join(DEV_DIR, 'package.json'), {
      name: 'client-app',
      scripts: { dev: 'next dev' }
    });
  });

  afterEach(async () => {
    await fs.remove(DEV_DIR);
  });

  it('should generate devcontainer.json with port forwarding and VS Code extensions', async () => {
    const info = await detectFramework(DEV_DIR);
    const result = await generateDevContainer(DEV_DIR, 'ClientAI', info);
    expect(result.devcontainerPath).toBe('.devcontainer/devcontainer.json');

    const config = await fs.readJson(path.join(DEV_DIR, '.devcontainer', 'devcontainer.json'));
    expect(config.name).toContain('ClientAI');
    expect(config.features['ghcr.io/devcontainers/features/docker-in-docker:2']).toBeDefined();
    expect(config.customizations.vscode.extensions).toContain('esbenp.prettier-vscode');
  });
});
