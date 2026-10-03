import * as diff from 'diff';
import pc from 'picocolors';

export interface FileDiff {
  filePath: string;
  relativePath: string;
  patch: string;
  additions: number;
  deletions: number;
}

/**
 * Computes a unified diff between old and new file content
 */
export function computeUnifiedDiff(
  relativePath: string,
  oldContent: string,
  newContent: string
): FileDiff | null {
  if (oldContent === newContent) return null;

  const patch = diff.createTwoFilesPatch(
    relativePath,
    relativePath,
    oldContent,
    newContent,
    'Original',
    'Bespoke'
  );

  let additions = 0;
  let deletions = 0;

  const lines = patch.split('\n');
  for (const line of lines) {
    if (line.startsWith('+') && !line.startsWith('+++')) additions++;
    if (line.startsWith('-') && !line.startsWith('---')) deletions++;
  }

  return {
    filePath: relativePath,
    relativePath,
    patch,
    additions,
    deletions
  };
}

/**
 * Renders a colorized unified diff for terminal display
 */
export function renderTerminalDiff(fileDiff: FileDiff): string {
  const lines = fileDiff.patch.split('\n');
  const coloredLines = lines.map(line => {
    if (line.startsWith('+') && !line.startsWith('+++')) return pc.green(line);
    if (line.startsWith('-') && !line.startsWith('---')) return pc.red(line);
    if (line.startsWith('@@')) return pc.cyan(line);
    return pc.dim(line);
  });

  return (
    pc.bold(`\n--- Diff for ${fileDiff.relativePath} (+${fileDiff.additions} / -${fileDiff.deletions}) ---\n`) +
    coloredLines.join('\n')
  );
}
