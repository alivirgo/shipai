import fs from 'fs-extra';
import path from 'path';
import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface DependencyAuditReport {
  ghostDependencies: string[];   // Imported in code, but missing from package.json
  unusedDependencies: string[];  // Listed in package.json, but never imported in code
  totalImports: number;
}

// Built-in Node.js modules to ignore
const NODE_BUILTINS = new Set([
  'assert', 'async_hooks', 'buffer', 'child_process', 'cluster', 'console',
  'constants', 'crypto', 'dgram', 'diagnostics_channel', 'dns', 'domain',
  'events', 'fs', 'fs/promises', 'http', 'http2', 'https', 'inspector',
  'module', 'net', 'os', 'path', 'perf_hooks', 'process', 'punycode',
  'querystring', 'readline', 'repl', 'stream', 'stream/promises',
  'string_decoder', 'timers', 'timers/promises', 'tls', 'trace_events',
  'tty', 'url', 'util', 'util/types', 'v8', 'vm', 'wasi', 'worker_threads', 'zlib'
]);

const IMPORT_REGEX = /(?:import\s+(?:[\w*\s{},]*\s+from\s+)?['"]([^'"]+)['"]|require\(['"]([^'"]+)['"]\))/g;

/**
 * Extracts the root package name from an import path (e.g. '@clack/prompts/sub' -> '@clack/prompts')
 */
function extractPackageName(specifier: string): string | null {
  if (specifier.startsWith('.') || specifier.startsWith('/') || specifier.startsWith('~') || specifier.startsWith('@/')) {
    return null; // Local relative import
  }

  if (specifier.startsWith('@')) {
    const parts = specifier.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : specifier;
  }

  return specifier.split('/')[0];
}

/**
 * Audits project dependencies to detect missing (ghost) and dead (unused) packages
 */
export async function auditDependencies(rootDir: string): Promise<DependencyAuditReport> {
  const pkgPath = path.join(rootDir, 'package.json');
  if (!(await fs.pathExists(pkgPath))) {
    return { ghostDependencies: [], unusedDependencies: [], totalImports: 0 };
  }

  let pkg: any = {};
  try {
    pkg = await fs.readJson(pkgPath);
  } catch {
    return { ghostDependencies: [], unusedDependencies: [], totalImports: 0 };
  }

  const declaredDeps = new Set([
    ...Object.keys(pkg.dependencies || {}),
    ...Object.keys(pkg.devDependencies || {}),
    ...Object.keys(pkg.peerDependencies || {})
  ]);

  const files = await getProjectFiles(rootDir);
  const importedPackages = new Set<string>();

  for (const file of files) {
    if (file.relativePath.includes('node_modules') || file.relativePath.endsWith('.lock') || file.relativePath.includes('test')) {
      continue;
    }

    let content: string;
    try {
      content = await readTextFile(file.filePath);
    } catch {
      continue;
    }

    IMPORT_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = IMPORT_REGEX.exec(content)) !== null) {
      const specifier = match[1] || match[2];
      if (specifier) {
        const pkgName = extractPackageName(specifier);
        if (pkgName && !NODE_BUILTINS.has(pkgName)) {
          importedPackages.add(pkgName);
        }
      }
    }
  }

  // Ghost dependencies: imported in code, but NOT in package.json
  const ghostDependencies = Array.from(importedPackages)
    .filter(pkgName => !declaredDeps.has(pkgName))
    .sort();

  // Dead dependencies: declared in runtime dependencies, but NEVER imported (exclude devDeps and types)
  const runtimeDeps = Object.keys(pkg.dependencies || {});
  const unusedDependencies = runtimeDeps
    .filter(pkgName => !importedPackages.has(pkgName) && !pkgName.startsWith('@types/'))
    .sort();

  return {
    ghostDependencies,
    unusedDependencies,
    totalImports: importedPackages.size
  };
}
