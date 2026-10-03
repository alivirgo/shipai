import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface ClientSideLeakFinding {
  filePath: string;
  relativePath: string;
  line: number;
  variableName: string;
  reason: string;
}

const PUBLIC_PREFIX_PATTERNS = [
  /\b(NEXT_PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|AUTH|PASS)[A-Z0-9_]*)\b/g,
  /\b(VITE_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|AUTH|PASS)[A-Z0-9_]*)\b/g,
  /\b(REACT_APP_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|AUTH|PASS)[A-Z0-9_]*)\b/g,
  /\b(PUBLIC_[A-Z0-9_]*(?:KEY|SECRET|TOKEN|AUTH|PASS)[A-Z0-9_]*)\b/g
];

// Benign public tokens that are intentionally public
const ALLOWED_PUBLIC_KEYS = new Set([
  'NEXT_PUBLIC_SUPABASE_ANON_KEY',
  'VITE_SUPABASE_ANON_KEY',
  'NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY',
  'VITE_STRIPE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'VITE_CLERK_PUBLISHABLE_KEY'
]);

/**
 * Detects confidential API keys exposed to browser client bundles via frontend env prefixes
 */
export async function scanClientSideLeaks(rootDir: string): Promise<ClientSideLeakFinding[]> {
  const files = await getProjectFiles(rootDir);
  const findings: ClientSideLeakFinding[] = [];

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

      for (const pattern of PUBLIC_PREFIX_PATTERNS) {
        pattern.lastIndex = 0;
        let match: RegExpExecArray | null;

        while ((match = pattern.exec(line)) !== null) {
          const varName = match[1];

          if (ALLOWED_PUBLIC_KEYS.has(varName)) {
            continue;
          }

          // Flag serious AI provider leaks (e.g. NEXT_PUBLIC_OPENAI_API_KEY)
          if (
            varName.includes('OPENAI') ||
            varName.includes('ANTHROPIC') ||
            varName.includes('GROQ') ||
            varName.includes('SERVICE_ROLE') ||
            varName.includes('PRIVATE') ||
            varName.includes('SECRET')
          ) {
            findings.push({
              filePath: file.filePath,
              relativePath: file.relativePath,
              line: idx + 1,
              variableName: varName,
              reason: `CRITICAL LEAK: "${varName}" exposes backend AI credentials to the client browser bundle!`
            });
          }
        }
      }
    }
  }

  return findings;
}
