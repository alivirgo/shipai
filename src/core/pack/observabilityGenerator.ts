import fs from 'fs-extra';
import path from 'path';

export interface ObservabilityResult {
  telemetryPath: string;
}

/**
 * Generates an enterprise-grade LLM Observability and OpenTelemetry-compatible tracing layer
 */
export async function generateObservabilityLayer(
  rootDir: string,
  isTypeScript = true
): Promise<ObservabilityResult> {
  const targetDir = (await fs.pathExists(path.join(rootDir, 'src')))
    ? path.join(rootDir, 'src', 'lib', 'ai')
    : path.join(rootDir, 'lib', 'ai');

  await fs.ensureDir(targetDir);

  const telemetryCode = `/**
 * =============================================================================
 * ShipAI Enterprise LLM Observability & Telemetry Instrumentation
 * =============================================================================
 * Compatible with OpenTelemetry, Langfuse, Helicone, and custom APMs.
 * =============================================================================
 */

export interface TraceRecord {
  traceId: string;
  timestamp: string;
  provider: string;
  model: string;
  durationMs: number;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  estimatedCostUsd: number;
  status: 'SUCCESS' | 'ERROR';
  errorMessage?: string;
}

// In-memory telemetry buffer with structured logging
const recentTraces: TraceRecord[] = [];
const MAX_BUFFER = 1000;

// Approximate cost per 1k tokens for top models (USD)
const PRICING_TABLE: Record<string, { prompt: number; completion: number }> = {
  'gpt-4o': { prompt: 0.0025, completion: 0.010 },
  'gpt-4o-mini': { prompt: 0.00015, completion: 0.0006 },
  'claude-3-5-sonnet': { prompt: 0.003, completion: 0.015 },
  'deepseek-chat': { prompt: 0.00014, completion: 0.00028 },
  'gemini-1.5-pro': { prompt: 0.00125, completion: 0.005 }
};

/**
 * Computes estimated cost in USD based on model pricing
 */
export function estimateCost(model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING_TABLE[model] || { prompt: 0.001, completion: 0.002 };
  return (promptTokens / 1000) * pricing.prompt + (completionTokens / 1000) * pricing.completion;
}

/**
 * Records an enterprise LLM trace event with latency, token usage, and cost calculation
 */
export function recordLlmTrace(event: {
  provider: string;
  model: string;
  startTime: number;
  promptTokens: number;
  completionTokens: number;
  error?: Error;
}): TraceRecord {
  const durationMs = Date.now() - event.startTime;
  const totalTokens = event.promptTokens + event.completionTokens;
  const estimatedCostUsd = estimateCost(event.model, event.promptTokens, event.completionTokens);

  const trace: TraceRecord = {
    traceId: \`tr-\${Date.now()}-\${Math.random().toString(36).substring(2, 7)}\`,
    timestamp: new Date().toISOString(),
    provider: event.provider,
    model: event.model,
    durationMs,
    promptTokens: event.promptTokens,
    completionTokens: event.completionTokens,
    totalTokens,
    estimatedCostUsd: Math.round(estimatedCostUsd * 100000) / 100000,
    status: event.error ? 'ERROR' : 'SUCCESS',
    errorMessage: event.error?.message
  };

  recentTraces.push(trace);
  if (recentTraces.length > MAX_BUFFER) {
    recentTraces.shift();
  }

  // Structured enterprise logging
  console.log(JSON.stringify({
    type: 'LLM_TELEMETRY',
    ...trace
  }));

  return trace;
}

/**
 * Returns telemetry analytics summary for client reporting
 */
export function getTelemetrySummary() {
  const totalRequests = recentTraces.length;
  const totalCost = recentTraces.reduce((sum, t) => sum + t.estimatedCostUsd, 0);
  const totalTokens = recentTraces.reduce((sum, t) => sum + t.totalTokens, 0);
  const avgLatency = totalRequests > 0
    ? Math.round(recentTraces.reduce((sum, t) => sum + t.durationMs, 0) / totalRequests)
    : 0;

  return {
    totalRequests,
    totalTokens,
    totalCostUsd: Math.round(totalCost * 100) / 100,
    averageLatencyMs: avgLatency
  };
}
`;

  const fileName = isTypeScript ? 'telemetry.ts' : 'telemetry.js';
  const outPath = path.join(targetDir, fileName);
  await fs.writeFile(outPath, telemetryCode, 'utf-8');

  return { telemetryPath: path.relative(rootDir, outPath) };
}
