import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { generateObservabilityLayer } from '../src/core/pack/observabilityGenerator.js';

const OBS_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'obs-test');

describe('Enterprise LLM Observability & Telemetry', () => {
  beforeEach(async () => {
    await fs.ensureDir(OBS_DIR);
    await fs.ensureDir(path.join(OBS_DIR, 'src'));
  });

  afterEach(async () => {
    await fs.remove(OBS_DIR);
  });

  it('should generate telemetry instrumentation layer with token cost estimators', async () => {
    const result = await generateObservabilityLayer(OBS_DIR, true);
    expect(result.telemetryPath).toContain('telemetry.ts');

    const code = await fs.readFile(path.join(OBS_DIR, result.telemetryPath), 'utf-8');
    expect(code).toContain('recordLlmTrace');
    expect(code).toContain('estimateCost');
    expect(code).toContain('PRICING_TABLE');
  });
});
