import path from 'path';
import ora from 'ora';
import pc from 'picocolors';
import { sanitizeProject } from '../../core/sanitize/aiResidueCleaner.js';
import { printSummaryBox } from '../ui/banners.js';

export interface SanitizeCommandOptions {
  dryRun?: boolean;
}

export async function runSanitizeCommand(targetDir?: string, options: SanitizeCommandOptions = {}): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());
  const spinner = ora('Sanitizing project and scrubbing AI artifacts...').start();

  try {
    const result = await sanitizeProject({
      rootDir,
      removeAiFiles: true,
      redactSecrets: true,
      protectGitignore: true,
      cleanAiSlop: true,
      dryRun: options.dryRun
    });

    spinner.succeed(options.dryRun ? 'Sanitize dry run complete!' : 'Project sanitized successfully!');

    console.log('');
    printSummaryBox(
      'Sanitization Results',
      [
        `AI Files Removed:        ${result.removedFiles.length} (${result.removedFiles.join(', ') || 'None'})`,
        `AI Dirs Removed:         ${result.removedDirs.length} (${result.removedDirs.join(', ') || 'None'})`,
        `AI Slop Comments Scrubbed: ${result.slopCleanedCount || 0}`,
        `Secrets Redacted:        ${result.redactedSecretsCount}`,
        `Files Modified:          ${result.modifiedFiles.length}`,
        `.gitignore Updated:      ${result.gitignoreUpdated ? 'Yes' : 'Already up to date'}`
      ],
      result.removedFiles.length > 0 || result.redactedSecretsCount > 0 || (result.slopCleanedCount || 0) > 0 ? 'yellow' : 'green'
    );
  } catch (err: any) {
    spinner.fail(`Sanitization failed: ${err.message}`);
  }
}
