import fs from 'fs-extra';
import path from 'path';

export interface LicenseFinding {
  packageName: string;
  version: string;
  license: string;
  isCopyleft: boolean;
  severity: 'CRITICAL' | 'WARNING' | 'SAFE';
  reason: string;
}

export interface LicenseAuditReport {
  packagesScanned: number;
  copyleftIssues: LicenseFinding[];
  isCommerciallyCompliant: boolean;
}

const COPYLEFT_LICENSES = new Set([
  'AGPL-1.0', 'AGPL-3.0', 'AGPL-3.0-only', 'AGPL-3.0-or-later',
  'GPL-1.0', 'GPL-2.0', 'GPL-2.0-only', 'GPL-2.0-or-later',
  'GPL-3.0', 'GPL-3.0-only', 'GPL-3.0-or-later',
  'SSPL-1.0', 'CPAL-1.0', 'EUPL-1.1', 'EUPL-1.2'
]);

const PERMISSIVE_LICENSES = new Set([
  'MIT', 'ISC', 'Apache-2.0', 'BSD-2-Clause', 'BSD-3-Clause', '0BSD', 'Unlicense', 'CC0-1.0'
]);

/**
 * Scans installed node_modules and package.json to verify that all dependencies
 * comply with commercial enterprise closed-source client distribution.
 */
export async function auditLicenses(rootDir: string): Promise<LicenseAuditReport> {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    return { packagesScanned: 0, copyleftIssues: [], isCommerciallyCompliant: true };
  }

  let pkg: any = {};
  try {
    pkg = await fs.readJson(pkgPath);
  } catch {
    return { packagesScanned: 0, copyleftIssues: [], isCommerciallyCompliant: true };
  }

  const deps = {
    ...pkg.dependencies,
    ...pkg.devDependencies
  };

  const copyleftIssues: LicenseFinding[] = [];
  const nodeModulesPath = path.join(rootDir, 'node_modules');
  let scannedCount = 0;

  for (const [depName, versionRange] of Object.entries(deps)) {
    scannedCount++;
    const depPkgPath = path.join(nodeModulesPath, depName, 'package.json');
    let license = 'Unknown';
    let installedVersion = String(versionRange);

    if (await fs.pathExists(depPkgPath)) {
      try {
        const depPkg = await fs.readJson(depPkgPath);
        license = depPkg.license || (depPkg.licenses ? depPkg.licenses[0]?.type : 'Unknown');
        installedVersion = depPkg.version || installedVersion;
      } catch {}
    }

    const cleanLic = typeof license === 'string' ? license.trim() : 'Unknown';
    const isCopyleft = COPYLEFT_LICENSES.has(cleanLic) || cleanLic.includes('GPL') || cleanLic.includes('SSPL');

    if (isCopyleft) {
      copyleftIssues.push({
        packageName: depName,
        version: installedVersion,
        license: cleanLic,
        isCopyleft: true,
        severity: cleanLic.includes('AGPL') ? 'CRITICAL' : 'WARNING',
        reason: cleanLic.includes('AGPL')
          ? `AGPL copyleft license requires the entire bespoke client solution to be open-sourced under network use!`
          : `GPL copyleft license may force client application source disclosure.`
      });
    }
  }

  return {
    packagesScanned: scannedCount,
    copyleftIssues,
    isCommerciallyCompliant: copyleftIssues.length === 0
  };
}
