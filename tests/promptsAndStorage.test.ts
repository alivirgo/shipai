import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { scanPrompts } from '../src/core/audit/promptScanner.js';
import { scanStorageTraces } from '../src/core/audit/storageTraceScanner.js';

const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'prompt-storage-test');

describe('Prompt Forensic & Storage Trace Scanner', () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);

    // Prompt with brand leak and injection risk
    await fs.writeFile(
      path.join(TEST_DIR, 'aiService.ts'),
      `
      const systemPrompt = "You are an AI assistant for BrainFlow AI platform.";
      const userPrompt = \`Summarize the following document: \${req.body.userInput}\`;
      `
    );

    // Storage traces
    await fs.writeFile(
      path.join(TEST_DIR, 'clientStorage.ts'),
      `
      localStorage.setItem("brainflow_token", token);
      app.get("/api/v1/brainflow/status", (req, res) => res.json({ ok: true }));
      `
    );
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('should detect brand name in system prompt and unvalidated user input concatenation', async () => {
    const findings = await scanPrompts(TEST_DIR, 'BrainFlow');
    expect(findings.some(f => f.type === 'LEAKED_BRAND_IN_PROMPT')).toBe(true);
    expect(findings.some(f => f.type === 'PROMPT_INJECTION_RISK')).toBe(true);
  });

  it('should detect legacy brand names in localStorage and route paths', async () => {
    const traces = await scanStorageTraces(TEST_DIR, 'BrainFlow');
    expect(traces.some(t => t.category === 'LOCAL_STORAGE' && t.keyName === 'brainflow_token')).toBe(true);
    expect(traces.some(t => t.category === 'ROUTE_SLUG' && t.keyName.includes('brainflow'))).toBe(true);
  });
});
