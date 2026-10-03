import path from 'path';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { runAuditCommand } from './audit.js';
import { runSanitizeCommand } from './sanitize.js';
import { runRebrandCommand } from './rebrand.js';
import { runPackCommand } from './pack.js';
import { runHandoffCommand } from './handoff.js';
import { printSummaryBox } from '../ui/banners.js';

export interface FullPipelineOptions {
  from?: string;
  to?: string;
  client?: string;
  color?: string;
  resetGit?: boolean;
}

/**
 * Runs the end-to-end transformation pipeline: Audit -> Sanitize -> Rebrand -> Pack -> Handoff
 */
export async function runFullPipeline(targetDir?: string, options: FullPipelineOptions = {}): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());

  p.intro(pc.bgMagenta(pc.white(pc.bold(' ShipAI Complete Transformation Pipeline '))));
  console.log(pc.dim('Taking an AI prototype through deep sanitation, bespoke rebranding, and containerized deployment packaging.\n'));

  // Step 1: Pre-Audit
  console.log(pc.bold(pc.cyan('▶ Step 1/5: Initial Project Audit')));
  await runAuditCommand(rootDir);
  console.log('');

  // Step 2: Sanitize
  console.log(pc.bold(pc.cyan('▶ Step 2/5: Sanitizing AI Traces & Securing .gitignore')));
  await runSanitizeCommand(rootDir);
  console.log('');

  // Step 3: Rebrand
  console.log(pc.bold(pc.cyan('▶ Step 3/5: Bespoke Client Rebranding')));
  await runRebrandCommand(rootDir, {
    from: options.from,
    to: options.to,
    client: options.client,
    color: options.color
  });
  console.log('');

  // Step 4: Pack & Containerize
  console.log(pc.bold(pc.cyan('▶ Step 4/5: Generating Production Docker & Documentation')));
  await runPackCommand(rootDir, {
    name: options.to,
    client: options.client
  });
  console.log('');

  // Step 5: Post-Audit Verification
  console.log(pc.bold(pc.cyan('▶ Step 5/5: Post-Shipment Verification Audit')));
  await runAuditCommand(rootDir);
  console.log('');

  // Optional Step: Pristine Git Handoff
  if (options.resetGit !== false) {
    const doGit = await p.confirm({
      message: 'Would you like to initialize a clean, pristine Git repository for client handoff?',
      initialValue: true
    });

    if (!p.isCancel(doGit) && doGit) {
      await runHandoffCommand(rootDir, {
        client: options.client,
        project: options.to,
        force: true
      });
    }
  }

  printSummaryBox(
    '🎉 Project Successfully Shipped & Bespoke!',
    [
      '✔ AI residues wiped and confidential keys sanitized',
      '✔ Multi-casing rebranding applied across codebase & metadata',
      '✔ Custom client SVG logo and favicon generated',
      '✔ Multi-stage Dockerfile and docker-compose.yml ready',
      '✔ Documented .env.example created from dynamic code scan',
      '✔ Client README.md and DEPLOYMENT.md generated'
    ],
    'green'
  );
}
