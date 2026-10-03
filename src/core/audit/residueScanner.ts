import fs from 'fs-extra';
import path from 'path';
import { AI_RESIDUE_DIRS, AI_RESIDUE_FILES, AI_WATERMARK_STRINGS } from '../../utils/constants.js';
import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface AIResidueFinding {
  type: 'file' | 'directory' | 'watermark';
  path: string;
  relativePath: string;
  details: string;
  line?: number;
}

/**
 * Scans for AI coding agent residual files and signature watermarks
 */
export async function scanForAIResidue(rootDir: string): Promise<AIResidueFinding[]> {
  const findings: AIResidueFinding[] = [];

  // 1. Scan for residual files in root and subdirectories
  const seenFiles = new Set<string>();
  for (const fileName of AI_RESIDUE_FILES) {
    const candidatePath = path.join(rootDir, fileName);
    if (await fs.pathExists(candidatePath)) {
      const lower = fileName.toLowerCase();
      if (!seenFiles.has(lower)) {
        seenFiles.add(lower);
        findings.push({
          type: 'file',
          path: candidatePath,
          relativePath: fileName,
          details: `AI agent configuration / artifact file detected: ${fileName}`
        });
      }
    }
  }

  // 2. Scan for residual directories
  for (const dirName of AI_RESIDUE_DIRS) {
    const candidateDir = path.join(rootDir, dirName);
    if (await fs.pathExists(candidateDir)) {
      findings.push({
        type: 'directory',
        path: candidateDir,
        relativePath: dirName,
        details: `AI agent workspace directory detected: ${dirName}`
      });
    }
  }

  // 3. Scan file contents for AI watermarks and comments
  const files = await getProjectFiles(rootDir);

  for (const file of files) {
    let content: string;
    try {
      content = await readTextFile(file.filePath);
    } catch {
      continue;
    }

    const lines = content.split(/\r?\n/);
    for (let idx = 0; idx < lines.length; idx++) {
      const lineLower = lines[idx].toLowerCase();

      for (const watermark of AI_WATERMARK_STRINGS) {
        if (lineLower.includes(watermark)) {
          findings.push({
            type: 'watermark',
            path: file.filePath,
            relativePath: file.relativePath,
            line: idx + 1,
            details: `Found AI boilerplate reference: "${watermark}"`
          });
          break;
        }
      }
    }
  }

  return findings;
}
