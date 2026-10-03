import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { auditLicenses } from '../src/core/audit/licenseScanner.js';

const LIC_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'license-test');

describe('Commercial License & Copyleft Auditor', () => {
  beforeEach(async () => {
    await fs.ensureDir(LIC_DIR);
    await fs.ensureDir(path.join(LIC_DIR, 'node_modules', 'safe-lib'));
    await fs.ensureDir(path.join(LIC_DIR, 'node_modules', 'risky-agpl-lib'));

    // package.json with dependencies
    await fs.writeJson(path.join(LIC_DIR, 'package.json'), {
      name: 'client-app',
      dependencies: {
        'safe-lib': '1.0.0',
        'risky-agpl-lib': '2.0.0'
      }
    });

    // MIT package
    await fs.writeJson(path.join(LIC_DIR, 'node_modules', 'safe-lib', 'package.json'), {
      name: 'safe-lib',
      version: '1.0.0',
      license: 'MIT'
    });

    // AGPL-3.0 package
    await fs.writeJson(path.join(LIC_DIR, 'node_modules', 'risky-agpl-lib', 'package.json'), {
      name: 'risky-agpl-lib',
      version: '2.0.0',
      license: 'AGPL-3.0'
    });
  });

  afterEach(async () => {
    await fs.remove(LIC_DIR);
  });

  it('should detect copyleft AGPL licenses and flag commercial compliance risk', async () => {
    const report = await auditLicenses(LIC_DIR);
    expect(report.packagesScanned).toBe(2);
    expect(report.isCommerciallyCompliant).toBe(false);
    expect(report.copyleftIssues.length).toBe(1);
    expect(report.copyleftIssues[0].packageName).toBe('risky-agpl-lib');
    expect(report.copyleftIssues[0].severity).toBe('CRITICAL');
  });
});
