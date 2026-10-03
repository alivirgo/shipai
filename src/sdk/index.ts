import path from 'path';
import { auditProject, AuditReport } from '../core/audit/projectAuditor.js';
import { sanitizeProject, SanitizeResult } from '../core/sanitize/aiResidueCleaner.js';
import { replaceProjectText, RebrandResult } from '../core/rebrand/textReplacer.js';
import { renameProjectFiles, RenameResult } from '../core/rebrand/fileRenamer.js';
import { rebrandDatabaseSchemas } from '../core/rebrand/databaseSchemaRebrander.js';
import { updateProjectMetadata } from '../core/rebrand/metadataUpdater.js';
import { generateBrandAssets } from '../core/rebrand/assetGenerator.js';
import { applyClientTheme } from '../core/rebrand/themeEngine.js';
import { detectFramework, FrameworkInfo } from '../core/pack/frameworkDetector.js';
import { generateDockerConfigs } from '../core/pack/dockerGenerator.js';
import { generateProductionProxy } from '../core/pack/proxyGenerator.js';
import { generateUniversalAiBridge } from '../core/pack/universalAiBridge.js';
import { generateObservabilityLayer } from '../core/pack/observabilityGenerator.js';
import { generateCostGuardrails } from '../core/pack/guardrailGenerator.js';
import { generateClientInstaller } from '../core/pack/clientInstaller.js';
import { generateClientDiagnostics } from '../core/pack/clientDiagnosticsGenerator.js';
import { generateCloudManifests } from '../core/pack/cloudManifests.js';
import { generateK8sManifests } from '../core/pack/k8sGenerator.js';
import { generateDevContainer } from '../core/pack/devcontainerGenerator.js';
import { generateEnvExample } from '../core/pack/envExampleGenerator.js';
import { generateCicdWorkflows } from '../core/pack/cicdGenerator.js';
import { generateBespokeDocSuite } from '../core/pack/bespokeDocSuite.js';
import { generateClientManuals } from '../core/pack/clientManualGenerator.js';
import { calculateAiProjectCost, generateCostReport, CodebaseLlmFootprint } from '../core/finance/costCalculator.js';
import { runPreShipVerification, VerificationReport } from '../core/verify/smokeTestRunner.js';
import { SnapshotManager } from '../core/snapshot/snapshotManager.js';
import { buildCasingMatrix } from '../core/rebrand/casingMatrix.js';
import { rebrandPythonProject, generatePythonBootstrap } from '../core/python/pythonManager.js';

export interface ShipAiOptions {
  rootDir?: string;
  sourceName?: string;
  targetName?: string;
  clientName?: string;
  brandColor?: string;
  author?: string;
  url?: string;
  description?: string;
  createSnapshot?: boolean;
  modules?: {
    audit?: boolean;
    sanitize?: boolean;
    cleanAiSlop?: boolean;
    rebrand?: boolean;
    pack?: boolean;
    docker?: boolean;
    universalGateway?: boolean;
    guardrails?: boolean;
    diagnostics?: boolean;
    costReport?: boolean;
    verify?: boolean;
  };
  dryRun?: boolean;
}

export interface ShipAiSummary {
  rootDir: string;
  targetName: string;
  clientName: string;
  shipScore: number;
  isReadyToShip: boolean;
  auditReport?: AuditReport;
  sanitizeResult?: SanitizeResult;
  rebrandResult?: RebrandResult;
  verificationReport?: VerificationReport;
  costFootprint?: CodebaseLlmFootprint;
  docsCreated: string[];
}

/**
 * Enterprise programmatic master runner for ShipAI.
 * Orchestrates audit, sanitization, deep AST rebranding, infrastructure generation,
 * cost calculation, and verification in a single automated call.
 */
export async function shipAI(options: ShipAiOptions = {}): Promise<ShipAiSummary> {
  const rootDir = path.resolve(options.rootDir || process.cwd());
  const sourceName = options.sourceName || 'App';
  const targetName = options.targetName || 'EnterpriseApp';
  const clientName = options.clientName || targetName;
  const brandColor = options.brandColor || '#4f46e5';
  const dryRun = !!options.dryRun;

  const modules = {
    audit: true,
    sanitize: true,
    cleanAiSlop: true,
    rebrand: true,
    pack: true,
    docker: true,
    universalGateway: true,
    guardrails: true,
    diagnostics: true,
    costReport: true,
    verify: true,
    ...options.modules
  };

  // Optional snapshot
  if (options.createSnapshot && !dryRun) {
    const snapMgr = new SnapshotManager(rootDir);
    await snapMgr.createSnapshot(`Pre-ship snapshot for ${targetName}`);
  }

  // 1. Audit
  let auditReport: AuditReport | undefined;
  if (modules.audit) {
    auditReport = await auditProject(rootDir);
  }

  // 2. Sanitize AI slop, scratchpads, secrets
  let sanitizeResult: SanitizeResult | undefined;
  if (modules.sanitize) {
    sanitizeResult = await sanitizeProject({
      rootDir,
      removeAiFiles: true,
      redactSecrets: true,
      protectGitignore: true,
      cleanAiSlop: modules.cleanAiSlop,
      dryRun
    });
  }

  // 3. Rebrand
  let rebrandResult: RebrandResult | undefined;
  if (modules.rebrand && sourceName && targetName) {
    const matrix = buildCasingMatrix(sourceName, targetName);
    rebrandResult = await replaceProjectText({ rootDir, sourceName, targetName, dryRun });
    await renameProjectFiles(rootDir, sourceName, targetName, dryRun);
    await rebrandDatabaseSchemas(rootDir, sourceName, targetName);
    await rebrandPythonProject(rootDir, matrix, dryRun);
    await updateProjectMetadata({
      rootDir,
      projectName: targetName,
      clientName,
      websiteUrl: options.url,
      description: options.description
    });
    await generateBrandAssets({
      rootDir,
      projectName: targetName,
      clientName,
      brandColor
    });
    await applyClientTheme(rootDir, brandColor);
  }

  // 4. Pack & Deploy Infrastructure
  const allDocsCreated: string[] = [];
  let frameworkInfo: FrameworkInfo = await detectFramework(rootDir);

  if (modules.pack) {
    if (modules.docker) {
      await generateDockerConfigs(rootDir, frameworkInfo, targetName.toLowerCase());
      await generateProductionProxy(rootDir, frameworkInfo.port);
      await generateK8sManifests(rootDir, targetName.toLowerCase(), frameworkInfo.port);
      await generateCloudManifests(rootDir, frameworkInfo, targetName.toLowerCase());
      await generateDevContainer(rootDir, targetName, frameworkInfo);
    }

    if (modules.universalGateway) {
      await generateUniversalAiBridge(rootDir, frameworkInfo.isTypeScript);
    }

    if (modules.guardrails) {
      await generateCostGuardrails(rootDir, frameworkInfo.isTypeScript);
      await generateObservabilityLayer(rootDir);
    }

    if (modules.diagnostics) {
      await generateClientDiagnostics(rootDir, targetName);
    }

    await generateClientInstaller(rootDir, targetName);
    await generateEnvExample(rootDir, targetName);
    await generateCicdWorkflows(rootDir, frameworkInfo, targetName);

    const docSuite = await generateBespokeDocSuite({
      rootDir,
      projectName: targetName,
      clientName,
      description: options.description,
      frameworkInfo,
      brandColor
    });
    allDocsCreated.push(...docSuite.docsCreated);

    const manuals = await generateClientManuals(rootDir, targetName, clientName);
    allDocsCreated.push(...manuals.manualsCreated);

    if (frameworkInfo.isPython) {
      await generatePythonBootstrap(rootDir, targetName);
    }
  }

  // 5. Cost Report
  let costFootprint: CodebaseLlmFootprint | undefined;
  if (modules.costReport) {
    costFootprint = await calculateAiProjectCost(rootDir);
    await generateCostReport(rootDir, targetName);
    allDocsCreated.push('AI_COST_AND_SCALING_PROJECTION.md');
  }

  // 6. Pre-Ship Verification
  let verificationReport: VerificationReport | undefined;
  if (modules.verify) {
    verificationReport = await runPreShipVerification(rootDir);
  }

  return {
    rootDir,
    targetName,
    clientName,
    shipScore: verificationReport ? verificationReport.score : (auditReport ? auditReport.readinessScore : 95),
    isReadyToShip: verificationReport ? verificationReport.isReadyToShip : true,
    auditReport,
    sanitizeResult,
    rebrandResult,
    verificationReport,
    costFootprint,
    docsCreated: allDocsCreated
  };
}
