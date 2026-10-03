// Programmatic SDK Master Runner
export { shipAI, ShipAiOptions, ShipAiSummary } from './sdk/index.js';

// Core Auditing & Forensics
export { auditProject, AuditReport, AuditIssue } from './core/audit/projectAuditor.js';
export { scanForSecrets, SecretFinding } from './core/audit/secretScanner.js';
export { calculateShannonEntropy, scanContentEntropy, EntropyFinding } from './core/audit/entropyScanner.js';
export { scanClientSideLeaks, ClientSideLeakFinding } from './core/audit/clientSideLeakScanner.js';
export { auditDependencies, DependencyAuditReport } from './core/audit/dependencyScanner.js';
export { auditLicenses, LicenseAuditReport, LicenseFinding } from './core/audit/licenseScanner.js';
export { scanPrompts, PromptFinding } from './core/audit/promptScanner.js';
export { scanStorageTraces, StorageTraceFinding } from './core/audit/storageTraceScanner.js';
export { scanEnvironmentVariables, EnvScanReport } from './core/audit/envScanner.js';
export { scanForAIResidue, AIResidueFinding } from './core/audit/residueScanner.js';

// AI Slop Sanitizer & Code Hygiene
export { sanitizeAiSlop, AI_SLOP_PATTERNS, CleanSlopOptions, CleanSlopResult, SlopFinding } from './core/sanitize/aiSlopSanitizer.js';

// Core Rebranding & AST Engine
export { buildCasingMatrix, RebrandMatrix, CasingPair } from './core/rebrand/casingMatrix.js';
export { transformCodeWithAst, AstTransformResult } from './core/ast/astTransformer.js';
export { replaceProjectText, RebrandOptions, RebrandResult, CustomReplacement } from './core/rebrand/textReplacer.js';
export { renameProjectFiles, RenameResult } from './core/rebrand/fileRenamer.js';
export { rebrandDatabaseSchemas, DbRebrandResult } from './core/rebrand/databaseSchemaRebrander.js';
export { updateProjectMetadata, MetadataUpdateOptions, MetadataUpdateResult } from './core/rebrand/metadataUpdater.js';
export { generateBrandAssets, AssetGeneratorOptions, AssetGeneratorResult } from './core/rebrand/assetGenerator.js';
export { applyClientTheme, generateColorPalette, ColorShades, ThemeUpdateResult } from './core/rebrand/themeEngine.js';

// Python AI Agent Ecosystem Engine
export { auditPythonProject, rebrandPythonProject, generatePythonBootstrap, PythonAuditFinding, PythonRebrandResult, PythonBootstrapResult } from './core/python/pythonManager.js';

// Financial & LLM Token OpEx Cost Modeler
export { calculateAiProjectCost, generateCostReport, ENTERPRISE_MODEL_PRICING, ModelPricing, CodebaseLlmFootprint, ModelCostComparison } from './core/finance/costCalculator.js';

// Core Packaging & Deployment
export { detectFramework, FrameworkInfo, SupportedFramework } from './core/pack/frameworkDetector.js';
export { generateDockerConfigs, DockerGeneratorResult } from './core/pack/dockerGenerator.js';
export { generateProductionProxy, ProxyConfigResult } from './core/pack/proxyGenerator.js';
export { generateUniversalAiBridge, AiBridgeResult } from './core/pack/universalAiBridge.js';
export { generateObservabilityLayer, ObservabilityResult } from './core/pack/observabilityGenerator.js';
export { setupVectorDatabase, VectorDbResult } from './core/pack/vectorDatabaseGenerator.js';
export { generateDevContainer, DevcontainerResult } from './core/pack/devcontainerGenerator.js';
export { generateCostGuardrails, GuardrailResult } from './core/pack/guardrailGenerator.js';
export { generateClientInstaller, InstallerResult } from './core/pack/clientInstaller.js';
export { generateClientDiagnostics, DiagnosticsGenResult } from './core/pack/clientDiagnosticsGenerator.js';
export { generateCloudManifests, CloudManifestsResult } from './core/pack/cloudManifests.js';
export { generateK8sManifests, K8sResult } from './core/pack/k8sGenerator.js';
export { generateClientManuals, ManualResult } from './core/pack/clientManualGenerator.js';
export { generateEnvExample, EnvGenResult } from './core/pack/envExampleGenerator.js';
export { generateCicdWorkflows, CicdResult } from './core/pack/cicdGenerator.js';
export { generateBespokeDocSuite, BespokeDocOptions, BespokeDocResult } from './core/pack/bespokeDocSuite.js';
export { getOneClickDeployBadges } from './core/pack/oneClickDeployGenerator.js';

// Pre-Ship Verification Gate
export { runPreShipVerification, VerificationReport, VerificationCheck } from './core/verify/smokeTestRunner.js';

// Snapshots & Rollback
export { SnapshotManager, SnapshotMeta } from './core/snapshot/snapshotManager.js';

// Diffs & Inspection
export { computeUnifiedDiff, renderTerminalDiff, FileDiff } from './core/diff/diffInspector.js';

// Core Sanitization & Handoff
export { sanitizeProject, SanitizeOptions, SanitizeResult } from './core/sanitize/aiResidueCleaner.js';
export { pristineGitHandoff, GitHandoffOptions, GitHandoffResult } from './core/handoff/gitHandoff.js';

// Studio Web Server
export { startStudioServer, StudioOptions } from './studio/server.js';
export { getStudioHtml } from './studio/studioHtml.js';

// Utilities
export { getProjectFiles, isBinaryFile, readTextFile, writeTextFile } from './utils/fileUtils.js';
export { logger } from './utils/logger.js';
export * from './utils/constants.js';
