import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'path';
import { IGNORE_PATTERNS } from './constants.js';

export interface FileMatch {
  filePath: string;
  relativePath: string;
}

/**
 * Check if a file is likely binary based on extension or first bytes
 */
export async function isBinaryFile(filePath: string): Promise<boolean> {
  const binaryExtensions = new Set([
    '.png', '.jpg', '.jpeg', '.gif', '.webp', '.ico', '.pdf', '.zip',
    '.tar', '.gz', '.woff', '.woff2', '.ttf', '.eot', '.mp4', '.webm',
    '.mp3', '.wasm', '.exe', '.dll', '.so', '.dylib', '.lockb'
  ]);

  const ext = path.extname(filePath).toLowerCase();
  if (binaryExtensions.has(ext)) {
    return true;
  }

  try {
    const buffer = Buffer.alloc(512);
    const fd = await fs.open(filePath, 'r');
    const { bytesRead } = await fs.read(fd, buffer, 0, 512, 0);
    await fs.close(fd);

    for (let i = 0; i < bytesRead; i++) {
      if (buffer[i] === 0) {
        return true; // Null byte indicates binary
      }
    }
    return false;
  } catch {
    return false;
  }
}

/**
 * Discover all text/source files in project root, filtering ignored dirs and binaries
 */
export async function getProjectFiles(
  rootDir: string,
  extraIgnore: string[] = []
): Promise<FileMatch[]> {
  const ignore = [...IGNORE_PATTERNS, ...extraIgnore];

  // fast-glob requires forward slashes even on Windows
  const normalizedRoot = rootDir.replace(/\\/g, '/');

  const entries = await fg(['**/*'], {
    cwd: normalizedRoot,
    ignore,
    dot: true,
    onlyFiles: true,
    absolute: true
  });

  const validFiles: FileMatch[] = [];

  for (const absPath of entries) {
    const isBin = await isBinaryFile(absPath);
    if (!isBin) {
      const rel = path.relative(rootDir, absPath);
      validFiles.push({
        filePath: absPath,
        relativePath: rel
      });
    }
  }

  return validFiles;
}

/**
 * Safely read a file as utf-8 string
 */
export async function readTextFile(filePath: string): Promise<string> {
  return fs.readFile(filePath, 'utf-8');
}

/**
 * Safely write a file
 */
export async function writeTextFile(filePath: string, content: string): Promise<void> {
  await fs.ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, content, 'utf-8');
}
