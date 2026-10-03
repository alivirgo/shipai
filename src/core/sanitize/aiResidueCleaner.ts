import fs from 'fs-extra';
import path from 'path';
import { AI_RESIDUE_DIRS, AI_RESIDUE_FILES, SECRET_PATTERNS } from '../../utils/constants.js';
import { getProjectFiles, readTextFile, writeTextFile } from '../../utils/fileUtils.js';
import { sanitizeAiSlop } from './aiSlopSanitizer.js';

export interface SanitizeOptions {
  rootDir: string;
  removeAiFiles?: boolean;
  redactSecrets?: boolean;
  protectGitignore?: boolean;
  cleanAiSlop?: boolean;
  dryRun?: boolean;
}

export interface SanitizeResult {
  removedFiles: string[];
  removedDirs: string[];
  redactedSecretsCount: number;
  slopCleanedCount: number;
  modifiedFiles: string[];
  gitignoreUpdated: boolean;
}

/**
 * Scrubs AI traces, deletes agent scratchpads, protects .gitignore, and redacts hardcoded secrets
 */
export async function sanitizeProject(options: SanitizeOptions): Promise<SanitizeResult> {
  const {
    rootDir,
    removeAiFiles = true,
    redactSecrets = true,
    protectGitignore = true,
    cleanAiSlop = false,
    dryRun = false
  } = options;

  const removedFiles: string[] = [];
  const removedDirs: string[] = [];
  const modifiedFiles: string[] = [];
  let redactedSecretsCount = 0;
  let slopCleanedCount = 0;
  let gitignoreUpdated = false;

  // 1. Remove AI files
  if (removeAiFiles) {
    for (const f of AI_RESIDUE_FILES) {
      const target = path.join(rootDir, f);
      if (await fs.pathExists(target)) {
        removedFiles.push(f);
        if (!dryRun) {
          await fs.remove(target);
        }
      }
    }

    for (const d of AI_RESIDUE_DIRS) {
      const target = path.join(rootDir, d);
      if (await fs.pathExists(target)) {
        removedDirs.push(d);
        if (!dryRun) {
          await fs.remove(target);
        }
      }
    }
  }

  // 2. Protect .gitignore (ensure .env, *.log, dist, node_modules are ignored)
  if (protectGitignore) {
    const gitignorePath = path.join(rootDir, '.gitignore');
    const requiredPatterns = ['.env', '.env.local', '*.log', 'node_modules', 'dist'];
    let currentContent = '';

    if (await fs.pathExists(gitignorePath)) {
      currentContent = await fs.readFile(gitignorePath, 'utf-8');
    }

    const lines = currentContent.split(/\r?\n/);
    const toAppend: string[] = [];

    for (const pat of requiredPatterns) {
      const exists = lines.some(l => l.trim() === pat);
      if (!exists) {
        toAppend.push(pat);
      }
    }

    if (toAppend.length > 0) {
      gitignoreUpdated = true;
      if (!dryRun) {
        const newContent = (currentContent ? currentContent.trimEnd() + '\n\n# ShipAI Security\n' : '# ShipAI Security\n') + toAppend.join('\n') + '\n';
        await fs.writeFile(gitignorePath, newContent, 'utf-8');
      }
    }
  }

  // 3. Redact hardcoded secrets
  if (redactSecrets) {
    const files = await getProjectFiles(rootDir);

    for (const file of files) {
      if (file.relativePath.includes('node_modules') || file.relativePath.endsWith('.lock')) {
        continue;
      }

      let content: string;
      try {
        content = await readTextFile(file.filePath);
      } catch {
        continue;
      }

      let updated = content;
      let fileModified = false;

      for (const pattern of SECRET_PATTERNS) {
        pattern.regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.regex.exec(content)) !== null) {
          const secret = match[0];
          if (
            secret.includes('your-key-here') ||
            secret.includes('YOUR_API_KEY') ||
            secret.includes('sk-xxx') ||
            secret.includes('placeholder')
          ) {
            continue;
          }

          const placeholder = `process.env.REDACTED_API_KEY /* ShipAI: was ${pattern.mask(secret)} */`;
          updated = updated.replace(secret, placeholder);
          redactedSecretsCount++;
          fileModified = true;
        }
      }

      if (fileModified) {
        modifiedFiles.push(file.relativePath);
        if (!dryRun) {
          await writeTextFile(file.filePath, updated);
        }
      }
    }
  }

  // 4. Deep AI comment slop and mock delay cleanup
  if (cleanAiSlop) {
    const slopResult = await sanitizeAiSlop({ rootDir, removeMockDelays: true, dryRun });
    slopCleanedCount = slopResult.totalSlopRemoved;
    for (const mod of slopResult.modifiedFiles) {
      if (!modifiedFiles.includes(mod)) {
        modifiedFiles.push(mod);
      }
    }
  }

  return {
    removedFiles,
    removedDirs,
    redactedSecretsCount,
    slopCleanedCount,
    modifiedFiles,
    gitignoreUpdated
  };
}
