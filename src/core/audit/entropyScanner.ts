export interface EntropyFinding {
  line: number;
  stringSnippet: string;
  entropy: number;
  type: string;
}

/**
 * Calculates the Shannon Entropy of a string.
 * High entropy (> 4.2 for strings >= 20 chars) indicates random tokens, API keys, or encrypted secrets.
 */
export function calculateShannonEntropy(str: string): number {
  if (!str || str.length === 0) return 0;

  const frequencies = new Map<string, number>();
  for (const char of str) {
    frequencies.set(char, (frequencies.get(char) || 0) + 1);
  }

  let entropy = 0;
  const len = str.length;

  for (const count of frequencies.values()) {
    const probability = count / len;
    entropy -= probability * Math.log2(probability);
  }

  return entropy;
}

/**
 * Scans a file's content for suspicious high-entropy tokens and private keys
 */
export function scanContentEntropy(content: string): EntropyFinding[] {
  const findings: EntropyFinding[] = [];
  const lines = content.split(/\r?\n/);

  // Common high-entropy token candidates extracted from assignments or strings
  const stringLiteralRegex = /['"`]([A-Za-z0-9+/=_\-\.]{18,})['"`]/g;
  const privateKeyHeaderRegex = /-----BEGIN [A-Z ]+ PRIVATE KEY-----/;

  for (let idx = 0; idx < lines.length; idx++) {
    const line = lines[idx];

    // Check for private keys
    if (privateKeyHeaderRegex.test(line)) {
      findings.push({
        line: idx + 1,
        stringSnippet: '-----BEGIN PRIVATE KEY-----',
        entropy: 5.0,
        type: 'Private Key Certificate'
      });
      continue;
    }

    let match: RegExpExecArray | null;
    stringLiteralRegex.lastIndex = 0;

    while ((match = stringLiteralRegex.exec(line)) !== null) {
      const candidate = match[1];

      // Ignore common non-secret tokens (URLs, UUIDs with all zeros, long words, SVG paths)
      if (
        candidate.startsWith('http://') ||
        candidate.startsWith('https://') ||
        candidate.includes('localhost') ||
        candidate.includes('00000000') ||
        candidate.includes(' ') ||
        candidate.includes('/') ||
        candidate.length > 256
      ) {
        continue;
      }

      const entropy = calculateShannonEntropy(candidate);

      // Entropy threshold: > 4.3 for random strings >= 20 characters
      if (candidate.length >= 20 && entropy >= 4.3) {
        const masked = `${candidate.substring(0, 4)}...${candidate.substring(candidate.length - 4)}`;
        findings.push({
          line: idx + 1,
          stringSnippet: masked,
          entropy: Math.round(entropy * 100) / 100,
          type: 'High-Entropy Secret / Token'
        });
      }
    }
  }

  return findings;
}
