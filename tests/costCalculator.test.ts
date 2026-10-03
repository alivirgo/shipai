import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { calculateAiProjectCost, generateCostReport } from '../src/core/finance/costCalculator.js';

const COST_TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'cost-test-dir');

describe('Financial & Token OpEx Cost Calculator', () => {
  beforeEach(async () => {
    await fs.ensureDir(COST_TEST_DIR);

    const code = `
    import OpenAI from 'openai';
    const client = new OpenAI();
    
    export async function runChat() {
      return await client.chat.completions.create({
        model: 'gpt-4o',
        messages: [{ role: 'user', content: 'test' }]
      });
    }
    `;
    await fs.writeFile(path.join(COST_TEST_DIR, 'aiService.ts'), code);
  });

  afterEach(async () => {
    await fs.remove(COST_TEST_DIR);
  });

  it('should scan LLM call sites and calculate OpEx projections across models', async () => {
    const footprint = await calculateAiProjectCost(COST_TEST_DIR);
    expect(footprint.totalLlmCallSites).toBeGreaterThanOrEqual(1);
    expect(footprint.detectedProviders).toContain('OpenAI');
    expect(footprint.comparisons.length).toBeGreaterThan(5);

    const gpt4o = footprint.comparisons.find(c => c.modelId === 'gpt-4o');
    expect(gpt4o).toBeDefined();
    expect(gpt4o?.tiers['1k'].monthlyCostRaw).toBeGreaterThan(0);
    expect(gpt4o?.tiers['100k'].monthlyCostFormatted).toContain('$');

    const deepseek = footprint.comparisons.find(c => c.modelId === 'deepseek-v3');
    expect(deepseek).toBeDefined();
    // DeepSeek should be significantly cheaper than GPT-4o
    expect(deepseek!.perQueryCostUsd).toBeLessThan(gpt4o!.perQueryCostUsd);
  });

  it('should generate executive markdown report AI_COST_AND_SCALING_PROJECTION.md', async () => {
    const reportPath = await generateCostReport(COST_TEST_DIR, 'ApexIntelligence');
    expect(await fs.pathExists(reportPath)).toBe(true);

    const md = await fs.readFile(reportPath, 'utf-8');
    expect(md).toContain('ApexIntelligence');
    expect(md).toContain('Monthly OpEx Projection Matrix');
    expect(md).toContain('Claude 3.5 Sonnet');
    expect(md).toContain('DeepSeek-V3');
  });
});
