import fs from 'fs-extra';
import path from 'path';

export type SupportedFramework =
  | 'nextjs'
  | 'vite'
  | 'node-api'
  | 'fastapi'
  | 'flask'
  | 'remix'
  | 'astro'
  | 'generic-node';

export interface FrameworkInfo {
  framework: SupportedFramework;
  frameworkName: string;
  packageManager: 'npm' | 'pnpm' | 'yarn' | 'bun' | 'uv' | 'pip';
  port: number;
  buildCommand?: string;
  startCommand?: string;
  isTypeScript: boolean;
  isPython: boolean;
}

/**
 * Automatically inspects the project files to detect framework, language, package manager, and port
 */
export async function detectFramework(rootDir: string): Promise<FrameworkInfo> {
  const pkgPath = path.join(rootDir, 'package.json');
  const pyprojectPath = path.join(rootDir, 'pyproject.toml');
  const reqsPath = path.join(rootDir, 'requirements.txt');

  let packageManager: FrameworkInfo['packageManager'] = 'npm';
  if (await fs.pathExists(path.join(rootDir, 'pnpm-lock.yaml'))) packageManager = 'pnpm';
  else if (await fs.pathExists(path.join(rootDir, 'yarn.lock'))) packageManager = 'yarn';
  else if (await fs.pathExists(path.join(rootDir, 'bun.lockb'))) packageManager = 'bun';

  // Check Python
  if ((await fs.pathExists(pyprojectPath)) || (await fs.pathExists(reqsPath))) {
    let reqContent = '';
    if (await fs.pathExists(reqsPath)) reqContent = await fs.readFile(reqsPath, 'utf-8');
    if (await fs.pathExists(pyprojectPath)) reqContent += await fs.readFile(pyprojectPath, 'utf-8');

    if (/fastapi/i.test(reqContent)) {
      return {
        framework: 'fastapi',
        frameworkName: 'FastAPI (Python)',
        packageManager: 'pip',
        port: 8000,
        startCommand: 'uvicorn main:app --host 0.0.0.0 --port 8000',
        isTypeScript: false,
        isPython: true
      };
    }

    if (/flask/i.test(reqContent)) {
      return {
        framework: 'flask',
        frameworkName: 'Flask (Python)',
        packageManager: 'pip',
        port: 5000,
        startCommand: 'flask run --host=0.0.0.0 --port=5000',
        isTypeScript: false,
        isPython: true
      };
    }
  }

  // Node.js project detection
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      const allDeps = {
        ...pkg.dependencies,
        ...pkg.devDependencies
      };

      const isTypeScript = !!(
        allDeps['typescript'] ||
        (await fs.pathExists(path.join(rootDir, 'tsconfig.json')))
      );

      if (allDeps['next']) {
        return {
          framework: 'nextjs',
          frameworkName: 'Next.js (React)',
          packageManager,
          port: 3000,
          buildCommand: `${packageManager} run build`,
          startCommand: `${packageManager} run start`,
          isTypeScript,
          isPython: false
        };
      }

      if (allDeps['vite']) {
        return {
          framework: 'vite',
          frameworkName: 'Vite (Single Page App)',
          packageManager,
          port: 5173,
          buildCommand: `${packageManager} run build`,
          startCommand: `${packageManager} run preview`,
          isTypeScript,
          isPython: false
        };
      }

      if (allDeps['@remix-run/react'] || allDeps['@remix-run/node']) {
        return {
          framework: 'remix',
          frameworkName: 'Remix',
          packageManager,
          port: 3000,
          buildCommand: `${packageManager} run build`,
          startCommand: `${packageManager} run start`,
          isTypeScript,
          isPython: false
        };
      }

      if (allDeps['astro']) {
        return {
          framework: 'astro',
          frameworkName: 'Astro',
          packageManager,
          port: 4321,
          buildCommand: `${packageManager} run build`,
          startCommand: `${packageManager} run preview`,
          isTypeScript,
          isPython: false
        };
      }

      if (allDeps['express'] || allDeps['fastify'] || allDeps['@nestjs/core'] || allDeps['koa']) {
        return {
          framework: 'node-api',
          frameworkName: 'Node.js Backend API',
          packageManager,
          port: 3000,
          buildCommand: pkg.scripts?.build ? `${packageManager} run build` : undefined,
          startCommand: pkg.scripts?.start ? `${packageManager} run start` : 'node dist/index.js',
          isTypeScript,
          isPython: false
        };
      }

      return {
        framework: 'generic-node',
        frameworkName: 'Node.js Application',
        packageManager,
        port: 3000,
        buildCommand: pkg.scripts?.build ? `${packageManager} run build` : undefined,
        startCommand: pkg.scripts?.start ? `${packageManager} run start` : 'node index.js',
        isTypeScript,
        isPython: false
      };
    } catch {
      // JSON parse error
    }
  }

  // Fallback
  return {
    framework: 'generic-node',
    frameworkName: 'Web Application',
    packageManager: 'npm',
    port: 3000,
    isTypeScript: false,
    isPython: false
  };
}
