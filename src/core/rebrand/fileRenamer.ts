import fs from 'fs-extra';
import path from 'path';
import fg from 'fast-glob';
import { IGNORE_PATTERNS } from '../../utils/constants.js';
import { buildCasingMatrix, RebrandMatrix } from './casingMatrix.js';

export interface RenameResult {
  renamedItems: { oldPath: string; newPath: string; oldName: string; newName: string }[];
}

/**
 * Escapes regex special characters
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Renames files and directories whose names match casing variations of the source name.
 * Processes from deepest path to root to ensure paths remain valid during rename.
 */
export async function renameProjectFiles(
  rootDir: string,
  sourceName: string,
  targetName: string,
  dryRun = false
): Promise<RenameResult> {
  const matrix = buildCasingMatrix(sourceName, targetName);
  const normalizedRoot = rootDir.replace(/\\/g, '/');

  const entries = await fg(['**/*'], {
    cwd: normalizedRoot,
    ignore: IGNORE_PATTERNS,
    dot: true,
    onlyFiles: false,
    absolute: true
  });

  // Sort descending by path length (deepest children first)
  entries.sort((a, b) => b.length - a.length);

  const renamedItems: { oldPath: string; newPath: string; oldName: string; newName: string }[] = [];

  for (const itemPath of entries) {
    const parentDir = path.dirname(itemPath);
    const baseName = path.basename(itemPath);

    let newBaseName = baseName;

    for (const pair of matrix.pairs) {
      if (newBaseName.includes(pair.source)) {
        const regex = new RegExp(escapeRegExp(pair.source), 'g');
        newBaseName = newBaseName.replace(regex, pair.target);
      }
    }

    if (newBaseName !== baseName) {
      const newPath = path.join(parentDir, newBaseName);
      renamedItems.push({
        oldPath: itemPath,
        newPath,
        oldName: baseName,
        newName: newBaseName
      });

      if (!dryRun) {
        if (await fs.pathExists(itemPath)) {
          await fs.move(itemPath, newPath, { overwrite: true });
        }
      }
    }
  }

  return { renamedItems };
}
