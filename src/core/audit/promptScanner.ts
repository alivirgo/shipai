import { getProjectFiles, readTextFile } from '../../utils/fileUtils.js';

export interface PromptFinding {
  filePath: string;
  relativePath: string;
  line: number;
  type: 'LEAKED_BRAND_IN_PROMPT' | 'PROMPT_INJECTION_RISK' | 'HARDCODED_SYSTEM_PROMPT';
  snippet: string;
  description: string;
}

const SYSTEM_PROMPT_PATTERNS = [
  /you are an? (?:helpful|expert|ai|friendly)?\s*(?:assistant|agent|copilot|bot|system)/i,
  /system\s*:\s*["'`].*?["'`]/i,
  /role\s*:\s*['"]system['"]/i,
  /system_prompt\s*[:=]\s*["'`]/i
];

const PROMPT_INJECTION_RISK_PATTERNS = [
  /(?:prompt|query|message|input)\s*[:=]\s*`[^`]*?\$\{(?:req\.body|req\.query|input|userInput|params\.)[^`]*?`/i,
  /(?:prompt|query|message)\s*\+=\s*(?:req\.body|userInput|req\.query)/i
];

/**
 * Scans codebase for embedded system prompts, unescaped user prompt concatenations, and legacy brand traces in prompts
 */
export async function scanPrompts(
  rootDir: string,
  brandName?: string
): Promise<PromptFinding[]> {
  const files = await getProjectFiles(rootDir);
  const findings: PromptFinding[] = [];

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

      // 1. Check for legacy brand in system prompt
      if (brandName && line.toLowerCase().includes(brandName.toLowerCase())) {
        for (const sysPattern of SYSTEM_PROMPT_PATTERNS) {
          if (sysPattern.test(line)) {
            findings.push({
              filePath: file.filePath,
              relativePath: file.relativePath,
              line: idx + 1,
              type: 'LEAKED_BRAND_IN_PROMPT',
              snippet: line.trim().substring(0, 100),
              description: `System prompt mentions legacy brand name "${brandName}". This will leak to end-users during inference.`
            });
            break;
          }
        }
      }

      // 2. Check for Prompt Injection Risk (unvalidated user input concatenation into prompt)
      for (const injPattern of PROMPT_INJECTION_RISK_PATTERNS) {
        if (injPattern.test(line)) {
          findings.push({
            filePath: file.filePath,
            relativePath: file.relativePath,
            line: idx + 1,
            type: 'PROMPT_INJECTION_RISK',
            snippet: line.trim().substring(0, 100),
            description: `Potential prompt injection risk: direct user input concatenation into LLM prompt template.`
          });
          break;
        }
      }
    }
  }

  return findings;
}
