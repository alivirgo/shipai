import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { generateClientDiagnostics } from '../src/core/pack/clientDiagnosticsGenerator.js';

const DIAG_TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'diag-test-dir');

describe('Client Pre-Flight Diagnostics Generator', () => {
  beforeEach(async () => {
    await fs.ensureDir(DIAG_TEST_DIR);
    await fs.writeJson(path.join(DIAG_TEST_DIR, 'package.json'), {
      name: 'test-app',
      scripts: {}
    });
  });

  afterEach(async () => {
    await fs.remove(DIAG_TEST_DIR);
  });

  it('should generate zero-dependency client diagnostics script and inject npm run diagnose', async () => {
    const res = await generateClientDiagnostics(DIAG_TEST_DIR, 'Acme AI Portal');
    expect(res.scriptPath).toContain('client-diagnostics.mjs');

    const script = await fs.readFile(path.join(DIAG_TEST_DIR, res.scriptPath), 'utf-8');
    expect(script).toContain('Acme AI Portal');
    expect(script).toContain('System Health & Environment Pre-Flight Diagnostics');
    expect(script).toContain('Node.js Version');
    expect(script).toContain('Offline Demo Mode');

    const pkg = await fs.readJson(path.join(DIAG_TEST_DIR, 'package.json'));
    expect(pkg.scripts.diagnose).toBe('node scripts/client-diagnostics.mjs');
  });
});
