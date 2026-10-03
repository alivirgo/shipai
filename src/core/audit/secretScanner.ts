import { SECRET_PATTERNS } from '../../utils/constants.js';
import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface SecretFinding {
  filePath: string;
  relativePath: string;
  line: number;
  patternName: string;
  maskedSnippet: string;
}

/**
 * Scans all project source files for hardcoded credentials and AI provider secrets
 */
export async function scanForSecrets(rootDir: string): Promise<SecretFinding[]> {
  const files = await getProjectFiles(rootDir);
  const findings: SecretFinding[] = [];

  for (const file of files) {
    // Avoid scanning test fixtures or lockfiles
    if (file.relativePath.includes('node_modules') || file.relativePath.endsWith('.lock')) {
      continue;
    }

    let content: string;
    try {
      content = await readTextFile(file.filePath);
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);

    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const lineContent = lines[lineIdx];
      let lineMatchedSpecific = false;

      for (const pattern of SECRET_PATTERNS) {
        if (pattern.name.startsWith('Generic') && lineMatchedSpecific) {
          continue;
        }

        // Reset regex state
        pattern.regex.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.regex.exec(lineContent)) !== null) {
          const matchedSecret = match[0];
          // Filter out dummy/sample placeholders
          if (
            matchedSecret.includes('your-key-here') ||
            matchedSecret.includes('YOUR_API_KEY') ||
            matchedSecret.includes('sk-xxx') ||
            matchedSecret.includes('placeholder')
          ) {
            continue;
          }

          if (!pattern.name.startsWith('Generic')) {
            lineMatchedSpecific = true;
          }

          findings.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            line: lineIdx + 1,
            patternName: pattern.name,
            maskedSnippet: pattern.mask(matchedSecret)
          });
        }
      }
    }
  }

  return findings;
}
