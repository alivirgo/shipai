import { Command } from 'commander';
import * as p from '@clack/prompts';
import pc from 'picocolors';
import { printBanner } from './ui/banners.js';
import { runAuditCommand } from './commands/audit.js';
import { runRebrandCommand } from './commands/rebrand.js';
import { runPackCommand } from './commands/pack.js';
import { runSanitizeCommand } from './commands/sanitize.js';
import path from 'path';
import ora from 'ora';
import { runHandoffCommand } from './commands/handoff.js';
import { runFullPipeline } from './commands/full.js';
import { runCostCommand } from './commands/cost.js';
import { runDiagnoseCommand } from './commands/diagnose.js';
import { startStudioServer } from '../studio/server.js';
import { SnapshotManager } from '../core/snapshot/snapshotManager.js';
import { runPreShipVerification } from '../core/verify/smokeTestRunner.js';

const program = new Command();

program
  .name('shipai')
  .description('Transform messy AI agent prototypes into pristine, client-ready, bespoke software solutions.')
  .version('1.0.0');

// Subcommand: studio
program
  .command('studio [dir]')
  .description('Launch the interactive ShipAI Local Web Studio dashboard in your browser')
  .option('-p, --port <port>', 'Port to listen on (default: 4488)', '4488')
  .action(async (dir, options) => {
    printBanner();
    const port = parseInt(options.port, 10) || 4488;
    const { url } = await startStudioServer({ port, rootDir: dir });
    console.log(pc.bold(pc.green(`✔ ShipAI Studio running at: `)) + pc.bold(pc.cyan(url)));
    console.log(pc.dim('  Open the URL in your browser to inspect, rebrand, and ship visually. Press Ctrl+C to stop.\n'));
  });

// Subcommand: audit
program
  .command('audit [dir]')
  .description('Audit project for hardcoded secrets, leaked AI prompts, and missing configurations')
  .action(async (dir) => {
    printBanner();
    await runAuditCommand(dir);
  });

// Subcommand: verify
program
  .command('verify [dir]')
  .description('Run automated multi-point pre-ship smoke tests and generate verification certificate')
  .action(async (dir) => {
    printBanner();
    const rootDir = path.resolve(dir || process.cwd());
    const spinner = ora('Executing automated pre-ship verification suite...').start();
    const rep = await runPreShipVerification(rootDir);
    spinner.succeed(`Pre-ship verification complete: ${rep.score}/100`);

    console.log('');
    for (const c of rep.checks) {
      const icon = c.passed ? pc.green('✔') : pc.red('✖');
      console.log(` ${icon} ${pc.bold(c.name)}: ${pc.dim(c.details)}`);
    }
    console.log('');

    if (rep.isReadyToShip) {
      console.log(pc.green(pc.bold('✔ CERTIFIED SHIP-READY: Emitted VERIFICATION_REPORT.json\n')));
    } else {
      console.log(pc.yellow(pc.bold('⚠ Remediate flagged checks before client delivery.\n')));
    }
  });

// Subcommand: cost
program
  .command('cost [dir]')
  .description('Model token OpEx and forecast monthly API running costs across models')
  .action(async (dir) => {
    printBanner();
    await runCostCommand(dir);
  });

// Subcommand: diagnose
program
  .command('diagnose [dir]')
  .description('Run comprehensive client pre-flight diagnostic checks on runtime, environment, and AI credentials')
  .action(async (dir) => {
    printBanner();
    await runDiagnoseCommand(dir);
  });

// Subcommand: rebrand
program
  .command('rebrand [dir]')
  .description('Deeply rebrand project across all casing formats, update metadata, and generate client assets')
  .option('-f, --from <name>', 'Original project / prototype name (e.g. ChatPilot)')
  .option('-t, --to <name>', 'New bespoke client project name (e.g. OmniDesk)')
  .option('-c, --client <client>', 'Client or organization name')
  .option('--color <hex>', 'Primary brand accent color (default: #4f46e5)')
  .option('--url <url>', 'Client homepage / portal URL')
  .option('--dry-run', 'Preview changes without modifying files')
  .action(async (dir, options) => {
    printBanner();
    await runRebrandCommand(dir, options);
  });

// Subcommand: pack
program
  .command('pack [dir]')
  .description('Generate production Docker containers, .env.example, CI/CD, and client documentation')
  .option('-n, --name <name>', 'Project name')
  .option('-c, --client <client>', 'Client name')
  .action(async (dir, options) => {
    printBanner();
    await runPackCommand(dir, options);
  });

// Subcommand: sanitize
program
  .command('sanitize [dir]')
  .description('Scrub AI agent artifacts (.cursorrules, claude.md, prompt logs) and secure .gitignore')
  .option('--dry-run', 'Simulate cleanup without deleting files')
  .action(async (dir, options) => {
    printBanner();
    await runSanitizeCommand(dir, options);
  });

// Subcommand: handoff
program
  .command('handoff [dir]')
  .description('Reset git history and initialize a pristine Git repository for client handoff')
  .option('-c, --client <client>', 'Client name')
  .option('-p, --project <project>', 'Project name')
  .option('-t, --tag <tag>', 'Initial git release tag (default: v1.0.0)')
  .option('-y, --force', 'Skip confirmation prompt')
  .action(async (dir, options) => {
    printBanner();
    await runHandoffCommand(dir, options);
  });

// Subcommand: full / ship
program
  .command('full [dir]')
  .alias('ship')
  .description('Run the complete pipeline: Audit -> Sanitize -> Rebrand -> Pack -> Client Runbook')
  .option('-f, --from <name>', 'Original project name')
  .option('-t, --to <name>', 'New client project name')
  .option('-c, --client <client>', 'Client organization name')
  .option('--color <hex>', 'Primary brand color')
  .action(async (dir, options) => {
    printBanner();
    await runFullPipeline(dir, options);
  });

// Subcommand: snapshot
program
  .command('snapshot [dir]')
  .description('Create an atomic rollback checkpoint before modifications')
  .option('-m, --message <msg>', 'Snapshot description', 'Manual snapshot')
  .action(async (dir, options) => {
    printBanner();
    const mgr = new SnapshotManager(path.resolve(dir || process.cwd()));
    const snap = await mgr.createSnapshot(options.message);
    console.log(pc.green(`✔ Snapshot created: ${snap.id} (${snap.fileCount} files backed up)`));
  });

// Subcommand: rollback
program
  .command('rollback [dir]')
  .description('Instantly rollback project to a previous snapshot')
  .option('-i, --id <id>', 'Specific snapshot ID to rollback to')
  .action(async (dir, options) => {
    printBanner();
    const mgr = new SnapshotManager(path.resolve(dir || process.cwd()));
    const res = await mgr.rollback(options.id);
    console.log(pc.green(`✔ Project rolled back to snapshot ${res.restoredId} (${res.fileCount} files restored).`));
  });

// Default Interactive Action when no arguments supplied
program.action(async () => {
  printBanner();

  const action = await p.select({
    message: 'What would you like to do with this project?',
    options: [
      {
        value: 'studio',
        label: '🖥️  Launch Web Studio Dashboard',
        hint: 'Visual dark-mode studio on localhost:4488 with live palette & radar'
      },
      {
        value: 'full',
        label: '🚀 Run Full Pipeline (CLI)',
        hint: 'End-to-end: Audit, Sanitize, Rebrand, Dockerize, and Document'
      },
      {
        value: 'audit',
        label: '🔍 Audit Ship-Readiness',
        hint: 'Detect secrets, missing envs, and AI residue'
      },
      {
        value: 'rebrand',
        label: '🎨 Bespoke Rebranding',
        hint: 'Replace multi-casing names, URLs, headers, and generate logo'
      },
      {
        value: 'pack',
        label: '📦 Generate Deployment Assets',
        hint: 'Dockerfile, compose, .env.example, CI/CD, README'
      },
      {
        value: 'cost',
        label: '💰 AI Cost & Token Financial Modeling',
        hint: 'Forecast monthly OpEx across GPT-4o, Claude 3.5, Gemini, DeepSeek'
      },
      {
        value: 'diagnose',
        label: '🩺 Run Client Pre-Flight Diagnostics',
        hint: 'Test environment, Node version, memory, and LLM credentials'
      },
      {
        value: 'sanitize',
        label: '🧹 Sanitize & Scrub AI Residue',
        hint: 'Delete .cursorrules, claude.md, mock delays, and protect .gitignore'
      },
      {
        value: 'handoff',
        label: '🧼 Pristine Git Handoff',
        hint: 'Reset commit history and tag clean v1.0.0 release'
      }
    ]
  });

  if (p.isCancel(action)) {
    process.exit(0);
  }

  const currentDir = process.cwd();

  switch (action) {
    case 'studio': {
      const { url } = await startStudioServer({ port: 4488, rootDir: currentDir });
      console.log(pc.bold(pc.green(`✔ ShipAI Studio running at: `)) + pc.bold(pc.cyan(url)));
      console.log(pc.dim('  Open the URL in your browser. Press Ctrl+C to exit.\n'));
      break;
    }
    case 'full':
      await runFullPipeline(currentDir);
      break;
    case 'audit':
      await runAuditCommand(currentDir);
      break;
    case 'cost':
      await runCostCommand(currentDir);
      break;
    case 'diagnose':
      await runDiagnoseCommand(currentDir);
      break;
    case 'rebrand':
      await runRebrandCommand(currentDir);
      break;
    case 'pack':
      await runPackCommand(currentDir);
      break;
    case 'sanitize':
      await runSanitizeCommand(currentDir);
      break;
    case 'handoff':
      await runHandoffCommand(currentDir);
      break;
  }
});

program.parse(process.argv);
