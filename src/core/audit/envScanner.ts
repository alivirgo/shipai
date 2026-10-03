import fs from 'fs-extra';
import path from 'path';
import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface EnvScanReport {
  detectedInCode: string[];
  definedInExample: string[];
  missingFromExample: string[];
  hasEnvExample: boolean;
  hasEnvFile: boolean;
  isEnvIgnoredByGit: boolean;
}

const JS_ENV_REGEX = /(?:process\.env\.|import\.meta\.env\.)([A-Z0-9_]{3,})/g;
const JS_BRACKET_REGEX = /(?:process\.env|import\.meta\.env)\[['"]([A-Z0-9_]{3,})['"]\]/g;
const PY_ENV_REGEX = /(?:os\.environ\.get|os\.getenv)\(['"]([A-Z0-9_]{3,})['"]/g;
const PY_BRACKET_REGEX = /os\.environ\[['"]([A-Z0-9_]{3,})['"]\]/g;

/**
 * Parses variable names from a .env or .env.example file
 */
export function parseEnvVarNames(content: string): string[] {
  const vars: string[] = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const varName = trimmed.split('=')[0].trim();
      if (varName && !vars.includes(varName)) {
        vars.push(varName);
      }
    }
  }
  return vars;
}

/**
 * Scans code for environment variable references and cross-references with .env configs
 */
export async function scanEnvironmentVariables(rootDir: string): Promise<EnvScanReport> {
  const files = await getProjectFiles(rootDir);
  const detectedVarSet = new Set<string>();

  // Standard runtime variables to ignore
  const ignoredStandardVars = new Set([
    'NODE_ENV',
    'PORT',
    'PATH',
    'HOME',
    'USER',
    'CI',
    'SHELL',
    'PWD'
  ]);

  for (const file of files) {
    let content: string;
    try {
      content = await readTextFile(file.filePath);
    } catch {
      continue;
    }

    const regexes = [JS_ENV_REGEX, JS_BRACKET_REGEX, PY_ENV_REGEX, PY_BRACKET_REGEX];

    for (const reg of regexes) {
      reg.lastIndex = 0;
      let match: RegExpExecArray | null;
      while ((match = reg.exec(content)) !== null) {
        const varName = match[1];
        if (!ignoredStandardVars.has(varName)) {
          detectedVarSet.add(varName);
        }
      }
    }
  }

  const detectedInCode = Array.from(detectedVarSet).sort();

  // Check .env.example
  const exampleCandidates = ['.env.example', '.env.template', '.env.sample'];
  let exampleVars: string[] = [];
  let hasEnvExample = false;

  for (const name of exampleCandidates) {
    const p = path.join(rootDir, name);
    if (await fs.pathExists(p)) {
      hasEnvExample = true;
      const content = await fs.readFile(p, 'utf-8');
      exampleVars = parseEnvVarNames(content);
      break;
    }
  }

  // Check .env
  const hasEnvFile = await fs.pathExists(path.join(rootDir, '.env'));

  // Check .gitignore
  let isEnvIgnoredByGit = false;
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (await fs.pathExists(gitignorePath)) {
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    isEnvIgnoredByGit = /^\s*\.env(\s|$|\*)/m.test(gitignoreContent);
  }

  const missingFromExample = detectedInCode.filter(v => !exampleVars.includes(v));

  return {
    detectedInCode,
    definedInExample: exampleVars,
    missingFromExample,
    hasEnvExample,
    hasEnvFile,
    isEnvIgnoredByGit
  };
}
