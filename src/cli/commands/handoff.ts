import path from 'path';
import * as p from '@clack/prompts';
import ora from 'ora';
import pc from 'picocolors';
import { pristineGitHandoff } from '../../core/handoff/gitHandoff.js';

export interface HandoffCommandOptions {
  client?: string;
  project?: string;
  tag?: string;
  force?: boolean;
}

export async function runHandoffCommand(targetDir?: string, options: HandoffCommandOptions = {}): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());
  const clientName = options.client || 'Client';
  const projectName = options.project || path.basename(rootDir);

  if (!options.force) {
    const confirm = await p.confirm({
      message: `Reset Git history and initialize a pristine repository for "${clientName}"? (This will permanently erase past AI prompt commits)`,
      initialValue: false
    });

    if (p.isCancel(confirm) || !confirm) {
      console.log(pc.yellow('Git handoff cancelled.'));
      return;
    }
  }

  const spinner = ora('Resetting commit history and creating pristine client release...').start();

  try {
    const result = await pristineGitHandoff({
      rootDir,
      clientName,
      projectName,
      initialTag: options.tag || 'v1.0.0'
    });

    if (result.success) {
      spinner.succeed(pc.green(result.message));
      console.log(pc.dim('  • Pristine main branch initialized'));
      console.log(pc.dim(`  • Initial release tag created: ${options.tag || 'v1.0.0'}`));
      console.log(pc.dim('  • Ready for `git remote add origin <client-repo>` and push'));
    } else {
      spinner.fail(result.message);
    }
  } catch (err: any) {
    spinner.fail(`Handoff failed: ${err.message}`);
  }
}
