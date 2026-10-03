import path from 'path';
import { generateClientDiagnostics } from '../../core/pack/clientDiagnosticsGenerator.js';
import ora from 'ora';
import pc from 'picocolors';
import { runPreShipVerification } from '../../core/verify/smokeTestRunner.js';

export async function runDiagnoseCommand(targetDir?: string): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());
  const spinner = ora('Executing client pre-flight diagnostics & environment probe...').start();

  try {
    const res = await generateClientDiagnostics(rootDir, 'Application');
    const verify = await runPreShipVerification(rootDir);
    spinner.succeed('Client diagnostic probe complete.');

    console.log('');
    console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));
    console.log(pc.bold('  🩺 CLIENT PRE-FLIGHT ENVIRONMENT & SYSTEM DIAGNOSTICS'));
    console.log(pc.bold(pc.cyan('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')));

    for (const c of verify.checks) {
      const icon = c.passed ? pc.green('✔') : pc.red('✖');
      console.log(`  ${icon} ${pc.bold(c.name.padEnd(28))}: ${pc.dim(c.details)}`);
    }

    console.log('');
    console.log(`  • Generated Diagnostic Runner: ${pc.bold(pc.cyan(res.scriptPath))}`);
    console.log(`  • Client CLI Command:          ${pc.bold(pc.green('npm run diagnose'))}`);
    console.log(`  • Overall Health Score:        ${pc.bold(verify.score >= 80 ? pc.green(`${verify.score}/100`) : pc.yellow(`${verify.score}/100`))}\n`);
  } catch (err: any) {
    spinner.fail(`Diagnostic execution error: ${err.message}`);
  }
}
