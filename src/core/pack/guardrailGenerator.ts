import fs from 'fs-extra';
import path from 'path';

export interface GuardrailResult {
  middlewarePath: string;
}

/**
 * Generates an enterprise-grade AI Cost Ceiling, Rate-Limiting, and Circuit Breaker middleware
 */
export async function generateCostGuardrails(
  rootDir: string,
  isTypeScript = true
): Promise<GuardrailResult> {
  const targetDir = (await fs.pathExists(path.join(rootDir, 'src')))
    ? path.join(rootDir, 'src', 'middleware')
    : path.join(rootDir, 'middleware');

  await fs.ensureDir(targetDir);

  const tsContent = `/**
 * =============================================================================
 * ShipAI Enterprise AI Guardrails & Cost Circuit Breaker
 * =============================================================================
 * Protects client API keys from bot abuse, DDoS, and runaway LLM billing loops.
 * =============================================================================
 */

interface RateBucket {
  tokens: number;
  lastRefill: number;
}

const ipBuckets = new Map<string, RateBucket>();
const MAX_TOKENS = 60; // 60 requests per window
const REFILL_RATE = 1; // 1 token per second
const WINDOW_MS = 60 * 1000;

// Daily Cost Tracker (In-Memory / Redis compatible)
let dailyEstimatedCost = 0;
let lastResetDay = new Date().getUTCDate();
const DAILY_COST_LIMIT_USD = parseFloat(process.env.DAILY_AI_BUDGET_USD || '50.00');

/**
 * Checks if the request exceeds IP rate limit
 */
export function checkRateLimit(clientIp: string): { allowed: boolean; remaining: number } {
  const now = Date.now();
  let bucket = ipBuckets.get(clientIp);

  if (!bucket) {
    bucket = { tokens: MAX_TOKENS, lastRefill: now };
    ipBuckets.set(clientIp, bucket);
  }

  const delta = (now - bucket.lastRefill) / 1000;
  bucket.tokens = Math.min(MAX_TOKENS, bucket.tokens + delta * REFILL_RATE);
  bucket.lastRefill = now;

  if (bucket.tokens >= 1) {
    bucket.tokens -= 1;
    return { allowed: true, remaining: Math.floor(bucket.tokens) };
  }

  return { allowed: false, remaining: 0 };
}

/**
 * Verifies that the daily LLM spend has not exceeded client safety ceiling
 */
export function verifyBudgetAllowance(estimatedCostIncrement = 0.02): boolean {
  const currentDay = new Date().getUTCDate();
  if (currentDay !== lastResetDay) {
    dailyEstimatedCost = 0;
    lastResetDay = currentDay;
  }

  if (dailyEstimatedCost + estimatedCostIncrement > DAILY_COST_LIMIT_USD) {
    console.error(\`[ShipAI Guardrail Alert] Daily AI budget limit exceeded (\$\${dailyEstimatedCost.toFixed(2)} / \$\${DAILY_COST_LIMIT_USD.toFixed(2)})\`);
    return false;
  }

  dailyEstimatedCost += estimatedCostIncrement;
  return true;
}

/**
 * Standard Express / Next.js API Route Guard Middleware
 */
export async function aiGuardMiddleware(req: any, res: any, next?: () => void) {
  const clientIp = req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '127.0.0.1';
  
  const rate = checkRateLimit(String(clientIp));
  if (!rate.allowed) {
    return res.status(429).json({
      error: 'Too Many Requests',
      message: 'Rate limit exceeded. Please wait before submitting more AI queries.'
    });
  }

  if (!verifyBudgetAllowance()) {
    return res.status(503).json({
      error: 'Service Temporarily Throttled',
      message: 'Daily safety budget threshold reached. Contact platform administrator.'
    });
  }

  if (next) next();
}
`;

  const fileName = isTypeScript ? 'aiGuardrails.ts' : 'aiGuardrails.js';
  const outPath = path.join(targetDir, fileName);
  await fs.writeFile(outPath, tsContent, 'utf-8');

  return { middlewarePath: path.relative(rootDir, outPath) };
}
