import fs from 'fs-extra';
import path from 'path';
import { scanEnvironmentVariables } from '../audit/envScanner.js';

export interface EnvGenResult {
  filePath: string;
  totalVars: number;
  vars: string[];
}

/**
 * Categorizes an environment variable key and suggests a safe placeholder value
 */
function getPlaceholderForVar(key: string): { category: string; placeholder: string; comment?: string } {
  const upper = key.toUpperCase();

  if (upper.includes('OPENAI')) {
    return { category: 'AI Providers', placeholder: 'sk-your-openai-api-key-here', comment: 'OpenAI API secret key' };
  }
  if (upper.includes('ANTHROPIC') || upper.includes('CLAUDE')) {
    return { category: 'AI Providers', placeholder: 'sk-ant-your-anthropic-key-here', comment: 'Anthropic Claude API key' };
  }
  if (upper.includes('GROQ')) {
    return { category: 'AI Providers', placeholder: 'gsk_your-groq-api-key-here', comment: 'Groq inference API key' };
  }
  if (upper.includes('GEMINI') || upper.includes('GOOGLE')) {
    return { category: 'AI Providers', placeholder: 'AIzaSy_your-google-api-key-here', comment: 'Google AI / Gemini key' };
  }
  if (upper.includes('COHERE')) {
    return { category: 'AI Providers', placeholder: 'your-cohere-api-key-here', comment: 'Cohere API key' };
  }
  if (upper.includes('PINECONE')) {
    return { category: 'Vector Databases', placeholder: 'your-pinecone-api-key-here', comment: 'Pinecone vector database key' };
  }
  if (upper.includes('QDRANT') || upper.includes('WEAVIATE') || upper.includes('CHROMA')) {
    return { category: 'Vector Databases', placeholder: 'http://localhost:6333', comment: 'Vector database host URL' };
  }
  if (upper.includes('DATABASE') || upper.includes('POSTGRES') || upper.includes('MONGO') || upper.includes('DB_URL')) {
    return { category: 'Databases', placeholder: 'postgresql://postgres:password@localhost:5432/app_db', comment: 'Primary database connection string' };
  }
  if (upper.includes('SUPABASE_URL')) {
    return { category: 'BaaS & Storage', placeholder: 'https://xyzcompany.supabase.co', comment: 'Supabase project URL' };
  }
  if (upper.includes('SUPABASE') && upper.includes('KEY')) {
    return { category: 'BaaS & Storage', placeholder: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...', comment: 'Supabase anon/service role key' };
  }
  if (upper.includes('JWT') || upper.includes('SECRET') || upper.includes('AUTH_SECRET')) {
    return { category: 'Authentication & Security', placeholder: 'replace-with-secure-32-char-random-secret', comment: 'Session / JWT signing secret' };
  }
  if (upper.includes('PORT')) {
    return { category: 'Server Configuration', placeholder: '3000', comment: 'Application listening port' };
  }
  if (upper.includes('URL') || upper.includes('HOST') || upper.includes('DOMAIN')) {
    return { category: 'Server Configuration', placeholder: 'http://localhost:3000', comment: 'Base application host URL' };
  }

  return { category: 'General Application Settings', placeholder: 'your-value-here' };
}

/**
 * Automatically creates a beautifully organized .env.example with placeholders and documentation
 */
export async function generateEnvExample(
  rootDir: string,
  projectName = 'Application'
): Promise<EnvGenResult> {
  const scan = await scanEnvironmentVariables(rootDir);
  const allVars = Array.from(new Set([...scan.detectedInCode, ...scan.definedInExample])).sort();

  // Group by category
  const groups: { [cat: string]: { key: string; placeholder: string; comment?: string }[] } = {};

  for (const v of allVars) {
    const info = getPlaceholderForVar(v);
    if (!groups[info.category]) {
      groups[info.category] = [];
    }
    groups[info.category].push({
      key: v,
      placeholder: info.placeholder,
      comment: info.comment
    });
  }

  let fileContent = `# =============================================================================
# ${projectName} - Environment Configuration Template
# Generated automatically by ShipAI
# =============================================================================
# Copy this file to .env and replace the values with your production/staging secrets.
# DO NOT commit real secrets or production keys to version control.
# =============================================================================

`;

  for (const [category, items] of Object.entries(groups)) {
    fileContent += `# -----------------------------------------------------------------------------\n`;
    fileContent += `# ${category}\n`;
    fileContent += `# -----------------------------------------------------------------------------\n`;
    for (const item of items) {
      if (item.comment) {
        fileContent += `# ${item.comment}\n`;
      }
      fileContent += `${item.key}=${item.placeholder}\n\n`;
    }
  }

  const outPath = path.join(rootDir, '.env.example');
  await fs.writeFile(outPath, fileContent, 'utf-8');

  return {
    filePath: outPath,
    totalVars: allVars.length,
    vars: allVars
  };
}
