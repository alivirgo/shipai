import fs from 'fs-extra';
import path from 'path';
import { scanForSecrets, SecretFinding } from './secretScanner.js';
import { scanEnvironmentVariables, EnvScanReport } from './envScanner.js';
import { scanForAIResidue, AIResidueFinding } from './residueScanner.js';
import { scanClientSideLeaks, ClientSideLeakFinding } from './clientSideLeakScanner.js';
import { auditDependencies, DependencyAuditReport } from './dependencyScanner.js';
import { scanPrompts, PromptFinding } from './promptScanner.js';
import { scanStorageTraces, StorageTraceFinding } from './storageTraceScanner.js';

export interface AuditIssue {
  severity: 'CRITICAL' | 'WARNING' | 'INFO';
  category: 'SECURITY' | 'ENV' | 'AI_RESIDUE' | 'CONFIG' | 'DOCKER' | 'DEPENDENCY' | 'PROMPT' | 'STORAGE';
  title: string;
  description: string;
  file?: string;
  line?: number;
  fixSuggestion?: string;
}

export interface AuditReport {
  timestamp: string;
  rootDir: string;
  readinessScore: number; // 0 to 100
  secrets: SecretFinding[];
  clientSideLeaks: ClientSideLeakFinding[];
  env: EnvScanReport;
  aiResidues: AIResidueFinding[];
  dependencies: DependencyAuditReport;
  prompts: PromptFinding[];
  storageTraces: StorageTraceFinding[];
  issues: AuditIssue[];
  isShipReady: boolean;
}

/**
 * Runs an exhaustive ship-readiness and bespoke audit on the project
 */
export async function auditProject(rootDir: string, brandName?: string): Promise<AuditReport> {
  const issues: AuditIssue[] = [];

  // 1. Secrets Scan
  const secrets = await scanForSecrets(rootDir);
  for (const s of secrets) {
    issues.push({
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: `Hardcoded Secret Detected (${s.patternName})`,
      description: `Potential secret or key leaked: ${s.maskedSnippet}`,
      file: s.relativePath,
      line: s.line,
      fixSuggestion: `Move this value to an environment variable in .env and use process.env.`
    });
  }

  // 2. Client-Side Public Secret Leaks (e.g. NEXT_PUBLIC_OPENAI_API_KEY)
  const clientSideLeaks = await scanClientSideLeaks(rootDir);
  for (const leak of clientSideLeaks) {
    issues.push({
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: `Client-Side Exposed Secret: ${leak.variableName}`,
      description: leak.reason,
      file: leak.relativePath,
      line: leak.line,
      fixSuggestion: `Remove public prefix (e.g. remove NEXT_PUBLIC_ or VITE_) and proxy LLM requests through a backend server route.`
    });
  }

  // 3. AI Residues Scan
  const residues = await scanForAIResidue(rootDir);
  for (const r of residues) {
    issues.push({
      severity: r.type === 'file' || r.type === 'directory' ? 'WARNING' : 'INFO',
      category: 'AI_RESIDUE',
      title: `AI Artifact Traces Found: ${r.relativePath}`,
      description: r.details,
      file: r.relativePath,
      line: r.line,
      fixSuggestion: `Run "shipai sanitize" to automatically scrub agent traces before client delivery.`
    });
  }

  // 4. Embedded Prompts & Prompt Injection Risks Scan
  const promptFindings = await scanPrompts(rootDir, brandName);
  for (const p of promptFindings) {
    issues.push({
      severity: p.type === 'PROMPT_INJECTION_RISK' ? 'WARNING' : 'INFO',
      category: 'PROMPT',
      title: p.type === 'PROMPT_INJECTION_RISK' ? 'Prompt Injection Risk' : 'Brand Name in System Prompt',
      description: p.description,
      file: p.relativePath,
      line: p.line,
      fixSuggestion: `Parameterize prompts through the universal AI bridge and sanitize user inputs.`
    });
  }

  // 5. Storage, Cookie & Route Traces Scan
  const storageTraces = brandName ? await scanStorageTraces(rootDir, brandName) : [];
  for (const st of storageTraces) {
    issues.push({
      severity: 'WARNING',
      category: 'STORAGE',
      title: `Legacy Brand Found in ${st.category}: "${st.keyName}"`,
      description: `Identifier "${st.keyName}" contains legacy project branding.`,
      file: st.relativePath,
      line: st.line,
      fixSuggestion: `Rename key to client namespace so no legacy traces persist in browser storage.`
    });
  }

  // 6. Ghost & Unused Dependencies Scan
  const depReport = await auditDependencies(rootDir);
  for (const ghost of depReport.ghostDependencies) {
    issues.push({
      severity: 'CRITICAL',
      category: 'DEPENDENCY',
      title: `Ghost Dependency Detected: "${ghost}"`,
      description: `Package "${ghost}" is imported in source code but missing from package.json! This will crash in Docker containers.`,
      fixSuggestion: `Run "npm install ${ghost}" to declare it in package.json.`
    });
  }

  if (depReport.unusedDependencies.length > 0) {
    issues.push({
      severity: 'INFO',
      category: 'DEPENDENCY',
      title: `${depReport.unusedDependencies.length} Unused Dependencies Detected`,
      description: `Packages declared in package.json but not imported: ${depReport.unusedDependencies.slice(0, 5).join(', ')}${depReport.unusedDependencies.length > 5 ? '...' : ''}`,
      fixSuggestion: `Remove unused dependencies to reduce container image size and attack surface.`
    });
  }

  // 7. Environment Variables Scan
  const env = await scanEnvironmentVariables(rootDir);
  if (!env.hasEnvExample) {
    issues.push({
      severity: 'WARNING',
      category: 'ENV',
      title: 'Missing .env.example',
      description: 'No .env.example or template file exists for onboarding developers or clients.',
      fixSuggestion: 'Run "shipai pack" to auto-generate a complete .env.example from your codebase.'
    });
  } else if (env.missingFromExample.length > 0) {
    issues.push({
      severity: 'WARNING',
      category: 'ENV',
      title: `${env.missingFromExample.length} Environment Variables Undocumented`,
      description: `Variables referenced in code but missing from .env.example: ${env.missingFromExample.join(', ')}`,
      fixSuggestion: 'Add missing variables to .env.example so deployment does not fail on missing keys.'
    });
  }

  if (env.hasEnvFile && !env.isEnvIgnoredByGit) {
    issues.push({
      severity: 'CRITICAL',
      category: 'SECURITY',
      title: '.env is NOT in .gitignore',
      description: 'Your local .env file contains real secrets and risks being pushed to GitHub!',
      fixSuggestion: 'Add .env to your .gitignore immediately.'
    });
  }

  // 8. Build & Deployment Configs
  const pkgPath = path.join(rootDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      if (!pkg.scripts?.build) {
        issues.push({
          severity: 'WARNING',
          category: 'CONFIG',
          title: 'Missing "build" Script in package.json',
          description: 'No production build script defined. Deployment platforms require "npm run build".',
          fixSuggestion: 'Add a "build" script to package.json.'
        });
      }
      if (!pkg.scripts?.start && !pkg.scripts?.dev) {
        issues.push({
          severity: 'INFO',
          category: 'CONFIG',
          title: 'Missing "start" or "dev" Script',
          description: 'No start script found in package.json.',
          fixSuggestion: 'Add a "start" script to package.json.'
        });
      }
    } catch {
      // ignore
    }
  }

  const hasDockerfile =
    (await fs.pathExists(path.join(rootDir, 'Dockerfile'))) ||
    (await fs.pathExists(path.join(rootDir, 'docker-compose.yml')));

  if (!hasDockerfile) {
    issues.push({
      severity: 'INFO',
      category: 'DOCKER',
      title: 'No Container / Deployment Recipe Found',
      description: 'Project does not contain a Dockerfile or docker-compose.yml.',
      fixSuggestion: 'Run "shipai pack" to generate a production-grade multi-stage Dockerfile.'
    });
  }

  // Calculate Ship-Readiness Score
  let score = 100;
  for (const issue of issues) {
    if (issue.severity === 'CRITICAL') score -= 25;
    else if (issue.severity === 'WARNING') score -= 10;
    else if (issue.severity === 'INFO') score -= 3;
  }
  score = Math.max(0, Math.min(100, score));

  const isShipReady = score >= 80 && !issues.some(i => i.severity === 'CRITICAL');

  return {
    timestamp: new Date().toISOString(),
    rootDir,
    readinessScore: score,
    secrets,
    clientSideLeaks,
    env,
    aiResidues: residues,
    dependencies: depReport,
    prompts: promptFindings,
    storageTraces,
    issues,
    isShipReady
  };
}
