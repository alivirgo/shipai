import path from 'path';
import ora from 'ora';
import pc from 'picocolors';
import { auditProject } from '../../core/audit/projectAuditor.js';
import { printSummaryBox } from '../ui/banners.js';

export async function runAuditCommand(targetDir?: string): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());
  const spinner = ora('Auditing project for ship-readiness and bespoke hygiene...').start();

  try {
    const report = await auditProject(rootDir);
    spinner.succeed('Audit complete!');

    console.log('');
    const scoreColor =
      report.readinessScore >= 80 ? pc.green : report.readinessScore >= 50 ? pc.yellow : pc.red;

    console.log(
      pc.bold('Ship-Readiness Score: ') +
        scoreColor(pc.bold(`${report.readinessScore}/100`)) +
        (report.isShipReady ? pc.green(' [SHIP READY]') : pc.red(' [ACTION REQUIRED]'))
    );
    console.log('');

    if (report.secrets.length > 0) {
      console.log(pc.red(pc.bold(`🚨 Leaked / Hardcoded Secrets (${report.secrets.length}):`)));
      for (const s of report.secrets) {
        console.log(`   ${pc.yellow(s.relativePath)}:${pc.cyan(String(s.line))} - ${s.patternName} (${pc.dim(s.maskedSnippet)})`);
      }
      console.log('');
    }

    if (report.aiResidues.length > 0) {
      console.log(pc.magenta(pc.bold(`🤖 AI Agent Artifacts & Residue (${report.aiResidues.length}):`)));
      for (const r of report.aiResidues) {
        console.log(`   ${pc.dim('•')} ${pc.white(r.relativePath)} ${r.line ? pc.dim(`(line ${r.line})`) : ''} - ${pc.dim(r.details)}`);
      }
      console.log('');
    }

    if (report.env.missingFromExample.length > 0) {
      console.log(pc.yellow(pc.bold(`⚠️  Missing from .env.example (${report.env.missingFromExample.length}):`)));
      for (const v of report.env.missingFromExample) {
        console.log(`   ${pc.dim('•')} ${pc.cyan(v)} (referenced in code, but not documented)`);
      }
      console.log('');
    }

    if (report.issues.length > 0) {
      console.log(pc.bold(`📋 Recommended Actions (${report.issues.length}):`));
      for (const issue of report.issues) {
        const badge =
          issue.severity === 'CRITICAL'
            ? pc.bgRed(' CRITICAL ')
            : issue.severity === 'WARNING'
            ? pc.bgYellow(pc.black(' WARNING '))
            : pc.bgBlue(' INFO ');
        console.log(` ${badge} ${pc.bold(issue.title)}`);
        console.log(`    ${pc.dim(issue.description)}`);
        if (issue.fixSuggestion) {
          console.log(`    ${pc.green('Fix:')} ${issue.fixSuggestion}`);
        }
      }
      console.log('');
    }

    printSummaryBox(
      'Audit Summary',
      [
        `Target Directory: ${rootDir}`,
        `Readiness Score:  ${report.readinessScore}/100`,
        `Secrets Leaked:   ${report.secrets.length}`,
        `AI Residues:      ${report.aiResidues.length}`,
        `Env Missing:      ${report.env.missingFromExample.length}`,
        `Ship Status:      ${report.isShipReady ? 'READY TO SHIP' : 'REQUIRES SANITIZING'}`
      ],
      report.isShipReady ? 'green' : 'yellow'
    );
  } catch (err: any) {
    spinner.fail(`Audit failed: ${err.message}`);
  }
}
