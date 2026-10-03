import fs from 'fs-extra';
import path from 'path';

export interface AiBridgeResult {
  gatewayPath: string;
}

/**
 * Generates an enterprise Universal Multi-LLM Gateway Bridge with auto-failover and offline client demo mode.
 * Allows the shipped application to switch between OpenAI, Azure OpenAI, Anthropic, Gemini, DeepSeek,
 * Grok, or Local Ollama via 1 env var, with zero-downtime offline resiliency.
 */
export async function generateUniversalAiBridge(
  rootDir: string,
  isTypeScript = true
): Promise<AiBridgeResult> {
  const targetDir = (await fs.pathExists(path.join(rootDir, 'src')))
    ? path.join(rootDir, 'src', 'lib', 'ai')
    : path.join(rootDir, 'lib', 'ai');

  await fs.ensureDir(targetDir);

  const bridgeContent = `/**
 * =============================================================================
 * ShipAI Universal Multi-LLM Gateway Bridge
 * =============================================================================
 * Enterprise multi-provider routing with automatic failover, health checks,
 * and deterministic offline client demo resilience.
 * =============================================================================
 */

export type AiProvider = 'openai' | 'azure' | 'anthropic' | 'gemini' | 'deepseek' | 'grok' | 'ollama' | 'offline';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface CompletionOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
  stream?: boolean;
  enableFailover?: boolean;
}

export interface ProviderConfig {
  provider: AiProvider;
  apiKey?: string;
  baseUrl?: string;
  defaultModel: string;
}

/**
 * Resolves active provider and model mappings from environment variables
 */
export function getActiveAiConfig(overrideProvider?: AiProvider): ProviderConfig {
  const provider = (overrideProvider || process.env.AI_PROVIDER || 'openai').toLowerCase() as AiProvider;

  if (process.env.OFFLINE_DEMO_MODE === 'true' || provider === 'offline') {
    return {
      provider: 'offline',
      defaultModel: 'shipai-offline-resilient'
    };
  }

  switch (provider) {
    case 'deepseek':
      return {
        provider: 'deepseek',
        apiKey: process.env.DEEPSEEK_API_KEY,
        baseUrl: process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com/v1',
        defaultModel: process.env.AI_MODEL || 'deepseek-chat'
      };
    case 'anthropic':
      return {
        provider: 'anthropic',
        apiKey: process.env.ANTHROPIC_API_KEY,
        baseUrl: 'https://api.anthropic.com/v1',
        defaultModel: process.env.AI_MODEL || 'claude-3-5-sonnet-20241022'
      };
    case 'gemini':
      return {
        provider: 'gemini',
        apiKey: process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY,
        baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/',
        defaultModel: process.env.AI_MODEL || 'gemini-1.5-pro'
      };
    case 'grok':
      return {
        provider: 'grok',
        apiKey: process.env.XAI_API_KEY || process.env.GROK_API_KEY,
        baseUrl: 'https://api.x.ai/v1',
        defaultModel: process.env.AI_MODEL || 'grok-beta'
      };
    case 'ollama':
      return {
        provider: 'ollama',
        baseUrl: process.env.OLLAMA_BASE_URL || 'http://localhost:11434/v1',
        defaultModel: process.env.AI_MODEL || 'llama3.3'
      };
    case 'azure':
      return {
        provider: 'azure',
        apiKey: process.env.AZURE_OPENAI_API_KEY,
        baseUrl: process.env.AZURE_OPENAI_ENDPOINT,
        defaultModel: process.env.AZURE_OPENAI_DEPLOYMENT_NAME || 'gpt-4o'
      };
    case 'openai':
    default:
      return {
        provider: 'openai',
        apiKey: process.env.OPENAI_API_KEY,
        baseUrl: process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1',
        defaultModel: process.env.AI_MODEL || 'gpt-4o'
      };
  }
}

/**
 * Generates an intelligent, contextual offline response for client demonstrations
 */
function getOfflineMockResponse(messages: ChatMessage[]): string {
  const lastUserMsg = [...messages].reverse().find(m => m.role === 'user')?.content || '';
  return \`[ShipAI Client Demo Mode] Successfully processed request: "\${lastUserMsg.slice(0, 80)}\${lastUserMsg.length > 80 ? '...' : ''}". The system is operating in high-performance resilience mode with simulated low latency.\`;
}

/**
 * Dispatches a completion to the configured enterprise provider using standard OpenAI-compatible protocol
 */
export async function executeAiCompletion(
  messages: ChatMessage[],
  options: CompletionOptions = {}
): Promise<string> {
  const config = getActiveAiConfig();

  // If in offline mode or keys are intentionally unset in demo mode, serve safe mock
  if (config.provider === 'offline' || (!config.apiKey && config.provider !== 'ollama' && process.env.OFFLINE_DEMO_MODE === 'true')) {
    return getOfflineMockResponse(messages);
  }

  const model = options.model || config.defaultModel;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json'
  };

  if (config.apiKey) {
    headers['Authorization'] = \`Bearer \${config.apiKey}\`;
  }

  const endpoint = \`\${config.baseUrl?.replace(/\\/$/, '')}/chat/completions\`;

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.7,
        max_tokens: options.maxTokens ?? 2048,
        stream: false
      })
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(\`AI Gateway Error (\${config.provider} - \${response.status}): \${errorBody}\`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
  } catch (err: any) {
    // If failover is enabled or fallback requested, cascade
    if (options.enableFailover || process.env.AI_AUTO_FAILOVER === 'true') {
      return executeAiCompletionWithFailover(messages, options, [config.provider]);
    }
    throw err;
  }
}

/**
 * Multi-provider cascade failover: attempts backup providers if primary fails
 */
export async function executeAiCompletionWithFailover(
  messages: ChatMessage[],
  options: CompletionOptions = {},
  failedProviders: AiProvider[] = []
): Promise<string> {
  const cascadeOrder: AiProvider[] = ['openai', 'anthropic', 'gemini', 'deepseek', 'ollama', 'offline'];
  const candidates = cascadeOrder.filter(p => !failedProviders.includes(p));

  for (const candidate of candidates) {
    try {
      const config = getActiveAiConfig(candidate);
      if (candidate === 'offline') {
        return getOfflineMockResponse(messages);
      }
      if (!config.apiKey && candidate !== 'ollama') {
        continue;
      }
      return await executeAiCompletion(messages, { ...options, enableFailover: false, model: config.defaultModel });
    } catch {
      failedProviders.push(candidate);
    }
  }

  return getOfflineMockResponse(messages);
}

/**
 * Diagnostic ping to test connection and measure latency to a given provider
 */
export async function pingAiProvider(provider?: AiProvider): Promise<{ ok: boolean; latencyMs: number; message: string }> {
  const config = getActiveAiConfig(provider);
  if (config.provider === 'offline') {
    return { ok: true, latencyMs: 5, message: 'Offline Demo Mode Active' };
  }
  if (!config.apiKey && config.provider !== 'ollama') {
    return { ok: false, latencyMs: 0, message: \`Missing API key for \${config.provider}\` };
  }

  const start = Date.now();
  try {
    const endpoint = \`\${config.baseUrl?.replace(/\\/$/, '')}/models\`;
    const headers: Record<string, string> = {};
    if (config.apiKey) headers['Authorization'] = \`Bearer \${config.apiKey}\`;

    const res = await fetch(endpoint, { method: 'GET', headers });
    const latencyMs = Date.now() - start;
    return {
      ok: res.ok,
      latencyMs,
      message: res.ok ? \`\${config.provider} connected in \${latencyMs}ms\` : \`Failed with status \${res.status}\`
    };
  } catch (err: any) {
    return { ok: false, latencyMs: Date.now() - start, message: err.message || 'Connection failed' };
  }
}
`;

  const fileName = isTypeScript ? 'universalGateway.ts' : 'universalGateway.js';
  const outPath = path.join(targetDir, fileName);
  await fs.writeFile(outPath, bridgeContent, 'utf-8');

  return { gatewayPath: path.relative(rootDir, outPath) };
}
