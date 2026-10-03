import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface StorageTraceFinding {
  filePath: string;
  relativePath: string;
  line: number;
  category: 'LOCAL_STORAGE' | 'COOKIE' | 'ROUTE_SLUG' | 'DATABASE_SCHEMA';
  keyName: string;
  snippet: string;
}

/**
 * Scans for legacy brand names in localStorage keys, cookies, API route paths, and DB schemas
 */
export async function scanStorageTraces(
  rootDir: string,
  brandName: string
): Promise<StorageTraceFinding[]> {
  if (!brandName || brandName.trim().length === 0) return [];

  const files = await getProjectFiles(rootDir);
  const findings: StorageTraceFinding[] = [];
  const cleanBrand = brandName.toLowerCase();

  const STORAGE_REGEX = /(?:localStorage|sessionStorage)\.(?:getItem|setItem|removeItem)\(['"]([^'"]+)['"]/g;
  const COOKIE_REGEX = /(?:cookies?|req\.cookies)\.(?:get|set)\(['"]([^'"]+)['"]/g;
  const ROUTE_REGEX = /(?:app|router)\.(?:get|post|put|delete|use)\(['"]([^'"]+)['"]/g;

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

    const lines = content.split(/\r?\n/);

    for (let idx = 0; idx < lines.length; idx++) {
      const line = lines[idx];

      // Local/Session Storage
      STORAGE_REGEX.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = STORAGE_REGEX.exec(line)) !== null) {
        const key = match[1];
        if (key.toLowerCase().includes(cleanBrand)) {
          findings.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            line: idx + 1,
            category: 'LOCAL_STORAGE',
            keyName: key,
            snippet: line.trim()
          });
        }
      }

      // Cookies
      COOKIE_REGEX.lastIndex = 0;
      while ((match = COOKIE_REGEX.exec(line)) !== null) {
        const key = match[1];
        if (key.toLowerCase().includes(cleanBrand)) {
          findings.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            line: idx + 1,
            category: 'COOKIE',
            keyName: key,
            snippet: line.trim()
          });
        }
      }

      // Route paths
      ROUTE_REGEX.lastIndex = 0;
      while ((match = ROUTE_REGEX.exec(line)) !== null) {
        const route = match[1];
        if (route.toLowerCase().includes(cleanBrand)) {
          findings.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            line: idx + 1,
            category: 'ROUTE_SLUG',
            keyName: route,
            snippet: line.trim()
          });
        }
      }
    }
  }

  return findings;
}
