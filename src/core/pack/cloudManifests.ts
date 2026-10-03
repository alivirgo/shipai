import fs from 'fs-extra';
import path from 'path';
import { FrameworkInfo } from './frameworkDetector.js';

export interface CloudManifestsResult {
  manifestsCreated: string[];
}

/**
 * Generates one-click deployment configurations for modern cloud platforms (Railway, Render, Vercel)
 */
export async function generateCloudManifests(
  rootDir: string,
  info: FrameworkInfo,
  projectName = 'app'
): Promise<CloudManifestsResult> {
  const manifestsCreated: string[] = [];

  // 1. Railway Blueprint (railway.json)
  const railwayConfig = {
    $schema: 'https://railway.app/railway.schema.json',
    build: {
      builder: 'DOCKERFILE',
      dockerfilePath: 'Dockerfile'
    },
    deploy: {
      numReplicas: 1,
      restartPolicyType: 'ON_FAILURE',
      restartPolicyMaxRetries: 5,
      healthcheckPath: '/api/health',
      healthcheckTimeout: 100
    }
  };

  const railwayPath = path.join(rootDir, 'railway.json');
  await fs.writeJson(railwayPath, railwayConfig, { spaces: 2 });
  manifestsCreated.push('railway.json');

  // 2. Render Blueprint (render.yaml)
  const renderYaml = `services:
  - type: web
    name: ${projectName.toLowerCase()}
    env: docker
    dockerfilePath: Dockerfile
    plan: starter
    healthCheckPath: /api/health
    envVars:
      - key: PORT
        value: ${info.port}
      - key: NODE_ENV
        value: production
`;

  const renderPath = path.join(rootDir, 'render.yaml');
  await fs.writeFile(renderPath, renderYaml, 'utf-8');
  manifestsCreated.push('render.yaml');

  // 3. Vercel Blueprint (vercel.json) if Next.js or Vite
  if (info.framework === 'nextjs' || info.framework === 'vite') {
    const vercelConfig = {
      framework: info.framework === 'nextjs' ? 'nextjs' : 'vite',
      buildCommand: info.buildCommand,
      headers: [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Content-Type-Options', value: 'nosniff' },
            { key: 'X-Frame-Options', value: 'DENY' },
            { key: 'X-XSS-Protection', value: '1; mode=block' }
          ]
        }
      ]
    };

    const vercelPath = path.join(rootDir, 'vercel.json');
    await fs.writeJson(vercelPath, vercelConfig, { spaces: 2 });
    manifestsCreated.push('vercel.json');
  }

  return { manifestsCreated };
}
