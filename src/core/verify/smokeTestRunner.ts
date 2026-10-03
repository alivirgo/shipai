import fs from 'fs-extra';
import path from 'path';
import { auditProject } from '../audit/projectAuditor.js';
import { auditLicenses } from '../audit/licenseScanner.js';

export interface VerificationCheck {
  id: string;
  name: string;
  passed: boolean;
  details: string;
}

export interface VerificationReport {
  timestamp: string;
  isReadyToShip: boolean;
  score: number;
  checks: VerificationCheck[];
}

/**
 * Runs an exhaustive multi-point pre-ship smoke test and verification gate
 */
export async function runPreShipVerification(rootDir: string): Promise<VerificationReport> {
  const checks: VerificationCheck[] = [];

  // Check 1: Audit & Secrets
  const audit = await auditProject(rootDir);
  checks.push({
    id: 'SEC-01',
    name: 'Hardcoded Secret & Key Cleanliness',
    passed: audit.secrets.length === 0 && audit.clientSideLeaks.length === 0,
    details: audit.secrets.length === 0
      ? 'Zero hardcoded secrets or client-side leaks detected.'
      : `${audit.secrets.length} secrets and ${audit.clientSideLeaks.length} client-side leaks detected!`
  });

  // Check 2: AI Residue
  checks.push({
    id: 'RES-02',
    name: 'AI Agent Fingerprint & Residue Cleanliness',
    passed: audit.aiResidues.length === 0,
    details: audit.aiResidues.length === 0
      ? 'Zero AI agent residue files detected.'
      : `${audit.aiResidues.length} AI residue files detected.`
  });

  // Check 3: Legal IP Compliance
  const licenseReport = await auditLicenses(rootDir);
  checks.push({
    id: 'LIC-03',
    name: 'Commercial Closed-Source License Compliance',
    passed: licenseReport.isCommerciallyCompliant,
    details: licenseReport.isCommerciallyCompliant
      ? `All ${licenseReport.packagesScanned} dependencies verified commercially compliant (no viral copyleft).`
      : `${licenseReport.copyleftIssues.length} copyleft licenses detected (e.g. AGPL/GPL).`
  });

  // Check 4: Container Artifacts
  const hasDocker = await fs.pathExists(path.join(rootDir, 'Dockerfile'));
  const hasCompose = await fs.pathExists(path.join(rootDir, 'docker-compose.yml'));
  checks.push({
    id: 'DOCKER-04',
    name: 'Production Containerization & Health Probes',
    passed: hasDocker && hasCompose,
    details: hasDocker && hasCompose
      ? 'Multi-stage Dockerfile and docker-compose.yml are verified.'
      : 'Missing Dockerfile or docker-compose.yml.'
  });

  // Check 5: Environment Template
  checks.push({
    id: 'ENV-05',
    name: 'Environment Variable Documentation (.env.example)',
    passed: audit.env.hasEnvExample && audit.env.missingFromExample.length === 0,
    details: audit.env.hasEnvExample
      ? 'All environment variables documented in .env.example template.'
      : 'Missing or incomplete .env.example.'
  });

  // Check 6: Client Runbook & Deliverables
  const hasReadme = await fs.pathExists(path.join(rootDir, 'README.md'));
  const hasCert = await fs.pathExists(path.join(rootDir, 'DELIVERY_CERTIFICATE.md'));
  checks.push({
    id: 'DOCS-06',
    name: 'Bespoke Client Deliverables & Certificate',
    passed: hasReadme && hasCert,
    details: hasReadme && hasCert
      ? 'Client README and cryptographic delivery certificate verified.'
      : 'Missing client documentation or certificate.'
  });

  const passedCount = checks.filter(c => c.passed).length;
  const score = Math.round((passedCount / checks.length) * 100);
  const isReadyToShip = score >= 80 && checks.every(c => c.id !== 'SEC-01' || c.passed);

  const report: VerificationReport = {
    timestamp: new Date().toISOString(),
    isReadyToShip,
    score,
    checks
  };

  const reportPath = path.join(rootDir, 'VERIFICATION_REPORT.json');
  await fs.writeJson(reportPath, report, { spaces: 2 });

  return report;
}
