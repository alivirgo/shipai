import { getProjectFiles, readTextFile, writeTextFile } from '../../utils/fileUtils.js';
import { CasingPair, RebrandMatrix, buildCasingMatrix } from './casingMatrix.js';
import { transformCodeWithAst } from '../ast/astTransformer.js';
import { computeUnifiedDiff, FileDiff } from '../diff/diffInspector.js';

export interface CustomReplacement {
  from: string;
  to: string;
  description?: string;
}

export interface RebrandOptions {
  rootDir: string;
  sourceName: string;
  targetName: string;
  customReplacements?: CustomReplacement[];
  dryRun?: boolean;
}

export interface FileChangeRecord {
  filePath: string;
  relativePath: string;
  matchCount: number;
  replacedPairs: { [pairType: string]: number };
  diff?: FileDiff | null;
}

export interface RebrandResult {
  totalFilesScanned: number;
  totalFilesModified: number;
  totalReplacements: number;
  modifiedFiles: FileChangeRecord[];
  casingMatrix: RebrandMatrix;
}

/**
 * Escapes special regex characters in a string
 */
function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Executes deep text replacements across all project files matching casing variations with AST precision
 */
export async function replaceProjectText(options: RebrandOptions): Promise<RebrandResult> {
  const { rootDir, sourceName, targetName, customReplacements = [], dryRun = false } = options;

  const matrix = buildCasingMatrix(sourceName, targetName);
  const files = await getProjectFiles(rootDir);

  const modifiedFiles: FileChangeRecord[] = [];
  let totalReplacements = 0;

  // Prepare replacement rules: Custom replacements first, then casing matrix pairs
  const rules: { regex: RegExp; target: string; type: string }[] = [];

  for (const cr of customReplacements) {
    if (cr.from && cr.to) {
      rules.push({
        regex: new RegExp(escapeRegExp(cr.from), 'g'),
        target: cr.to,
        type: cr.description || `Custom: ${cr.from} -> ${cr.to}`
      });
    }
  }

  for (const pair of matrix.pairs) {
    rules.push({
      regex: new RegExp(escapeRegExp(pair.source), 'g'),
      target: pair.target,
      type: `${pair.type} (${pair.source} -> ${pair.target})`
    });
  }

  for (const file of files) {
    let content: string;
    try {
      content = await readTextFile(file.filePath);
    } catch {
      continue;
    }

    let updatedContent = content;
    let fileMatchCount = 0;
    const filePairs: { [pairType: string]: number } = {};

    const isAstCandidate = /\.(?:ts|tsx|js|jsx|mjs|cjs)$/.test(file.filePath);

    // Apply AST Transformation for JavaScript / TypeScript files
    if (isAstCandidate) {
      try {
        const astResult = transformCodeWithAst(updatedContent, file.filePath, matrix);
        if (astResult.hasChanges) {
          updatedContent = astResult.transformedCode;
          fileMatchCount += astResult.replacementsCount;
          filePairs['AST Semantic Transform'] = astResult.replacementsCount;
        }
      } catch {
        // Fall back to lexical replacement if AST parse encounters exotic syntax
      }
    }

    // Apply lexical / regex rules for remaining text, comments, and non-AST elements
    for (const rule of rules) {
      const matches = updatedContent.match(rule.regex);
      if (matches && matches.length > 0) {
        const count = matches.length;
        fileMatchCount += count;
        filePairs[rule.type] = (filePairs[rule.type] || 0) + count;
        updatedContent = updatedContent.replace(rule.regex, rule.target);
      }
    }

    if (fileMatchCount > 0 && updatedContent !== content) {
      totalReplacements += fileMatchCount;
      const fileDiff = computeUnifiedDiff(file.relativePath, content, updatedContent);

      modifiedFiles.push({
        filePath: file.filePath,
        relativePath: file.relativePath,
        matchCount: fileMatchCount,
        replacedPairs: filePairs,
        diff: fileDiff
      });

      if (!dryRun) {
        await writeTextFile(file.filePath, updatedContent);
      }
    }
  }

  return {
    totalFilesScanned: files.length,
    totalFilesModified: modifiedFiles.length,
    totalReplacements,
    modifiedFiles,
    casingMatrix: matrix
  };
}
