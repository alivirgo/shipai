import path from 'path';
import ora from 'ora';
import pc from 'picocolors';
import { detectFramework } from '../../core/pack/frameworkDetector.js';
import { generateDockerConfigs } from '../../core/pack/dockerGenerator.js';
import { generateEnvExample } from '../../core/pack/envExampleGenerator.js';
import { generateCicdWorkflows } from '../../core/pack/cicdGenerator.js';
import { generateBespokeDocSuite } from '../../core/pack/bespokeDocSuite.js';
import { generateCostGuardrails } from '../../core/pack/guardrailGenerator.js';
import { generateProductionProxy } from '../../core/pack/proxyGenerator.js';
import { generateCloudManifests } from '../../core/pack/cloudManifests.js';
import { generateUniversalAiBridge } from '../../core/pack/universalAiBridge.js';
import { generateClientInstaller } from '../../core/pack/clientInstaller.js';
import { generateK8sManifests } from '../../core/pack/k8sGenerator.js';
import { generateClientManuals } from '../../core/pack/clientManualGenerator.js';
import { printSummaryBox } from '../ui/banners.js';

export interface PackCommandOptions {
  name?: string;
  client?: string;
  color?: string;
}

export async function runPackCommand(targetDir?: string, options: PackCommandOptions = {}): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());
  const projectName = options.name || path.basename(rootDir);
  const clientName = options.client || projectName;
  const brandColor = options.color || '#4f46e5';

  const spinner = ora('Detecting framework and environment architecture...').start();

  try {
    // 1. Detect Framework
    const frameworkInfo = await detectFramework(rootDir);
    spinner.text = `Detected ${pc.cyan(frameworkInfo.frameworkName)}. Generating deployment recipes...`;

    // 2. Generate Docker & Compose with Redis
    const dockerResult = await generateDockerConfigs(rootDir, frameworkInfo, projectName.toLowerCase());

    // 3. Generate Reverse Proxy (Caddyfile)
    spinner.text = 'Configuring TLS reverse proxy and security headers (Caddyfile)...';
    const proxyResult = await generateProductionProxy(rootDir, frameworkInfo.port);

    // 4. Generate Universal Multi-LLM Gateway Bridge
    spinner.text = 'Injecting Universal Multi-LLM Gateway Bridge (OpenAI, Claude, Gemini, DeepSeek, Ollama)...';
    const bridgeResult = await generateUniversalAiBridge(rootDir, frameworkInfo.isTypeScript);

    // 5. Generate AI Cost Guardrails & Rate Limiter
    spinner.text = 'Injecting AI Cost Guardrails and Rate-Limiter middleware...';
    const guardrailResult = await generateCostGuardrails(rootDir, frameworkInfo.isTypeScript);

    // 6. Generate Self-Bootstrapping Client Installer
    spinner.text = 'Generating 1-command client setup script and installer (bin/client-setup.js)...';
    const installerResult = await generateClientInstaller(rootDir, projectName);

    // 7. Generate Cloud Blueprints (Railway, Render, Vercel)
    spinner.text = 'Generating multi-cloud manifests (Railway, Render, Vercel)...';
    const cloudResult = await generateCloudManifests(rootDir, frameworkInfo, projectName);

    // 8. Generate Kubernetes Enterprise Manifests
    spinner.text = 'Generating Kubernetes enterprise manifests (k8s/)...';
    const k8sResult = await generateK8sManifests(rootDir, projectName, frameworkInfo.port);

    // 9. Generate .env.example
    spinner.text = 'Scanning environment variables and building .env.example...';
    const envResult = await generateEnvExample(rootDir, projectName);

    // 10. Generate CI/CD Workflows
    spinner.text = 'Creating GitHub Actions CI/CD workflows...';
    const cicdResult = await generateCicdWorkflows(rootDir, frameworkInfo, projectName.toLowerCase());

    // 11. Generate Client User Manuals & Admin Guide
    spinner.text = 'Generating client end-user manual and admin operations guide...';
    const manualResult = await generateClientManuals(rootDir, projectName, clientName);

    // 12. Generate Bespoke Client Documentation Suite & Certificate
    spinner.text = 'Generating executive client documentation suite & cryptographic delivery certificate...';
    const docResult = await generateBespokeDocSuite({
      rootDir,
      projectName,
      clientName,
      frameworkInfo,
      brandColor
    });

    spinner.succeed('Project packaged for enterprise production deployment!');

    console.log('');
    printSummaryBox(
      'Enterprise Ship-Ready Artifacts Generated',
      [
        `Detected Stack:   ${frameworkInfo.frameworkName} (Port ${frameworkInfo.port})`,
        `AI Gateway:       ${bridgeResult.gatewayPath} (Universal LLM Router)`,
        `Client Installer: ${installerResult.installerPath} (Run: npm run setup)`,
        `Container Stack:  ${dockerResult.filesCreated.join(', ')} (App + Redis)`,
        `Security Proxy:   ${proxyResult.caddyfilePath} (Auto-TLS, CSP, HSTS)`,
        `AI Guardrails:    ${guardrailResult.middlewarePath} (Rate-Limiter & Cost Ceiling)`,
        `Cloud Blueprints: ${cloudResult.manifestsCreated.join(', ')}`,
        `Kubernetes:       ${k8sResult.manifests.join(', ')}`,
        `Manuals & Guides: ${manualResult.manualsCreated.join(', ')}`,
        `Deliverables:     ${docResult.docsCreated.join(', ')}`
      ],
      'green'
    );

    console.log(pc.bold('Client Delivery Checklist:'));
    console.log(`  1. End-user setup:   ${pc.cyan('npm run setup')} (validates keys, runtime, and initializes)`);
    console.log(`  2. Local container:  ${pc.green('docker compose up -d --build')}`);
    console.log(`  3. Client handoff:   Deliver ${pc.cyan('USER_MANUAL.md')}, ${pc.cyan('ADMIN_OPERATIONS_GUIDE.md')}, and ${pc.cyan('DELIVERY_CERTIFICATE.md')}`);
    console.log('');
  } catch (err: any) {
    spinner.fail(`Packaging failed: ${err.message}`);
  }
}
