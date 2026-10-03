import fs from 'fs-extra';
import path from 'path';
import { FrameworkInfo } from './frameworkDetector.js';

export interface DevcontainerResult {
  devcontainerPath: string;
}

/**
 * Generates an enterprise DevContainer specification for instant 1-click cloud IDE setup (GitHub Codespaces / VS Code)
 */
export async function generateDevContainer(
  rootDir: string,
  projectName: string,
  info: FrameworkInfo
): Promise<DevcontainerResult> {
  const devContainerDir = path.join(rootDir, '.devcontainer');
  await fs.ensureDir(devContainerDir);

  const devcontainerConfig = {
    name: `${projectName} Cloud Development Environment`,
    image: 'mcr.microsoft.com/devcontainers/typescript-node:1-20-bullseye',
    features: {
      'ghcr.io/devcontainers/features/docker-in-docker:2': {},
      'ghcr.io/devcontainers/features/git:1': {}
    },
    forwardPorts: [info.port, 6379, 5432],
    postCreateCommand: `${info.packageManager === 'npm' ? 'npm install' : `${info.packageManager} install`}`,
    customizations: {
      vscode: {
        extensions: [
          'dbaeumer.vscode-eslint',
          'esbenp.prettier-vscode',
          'bradlc.vscode-tailwindcss',
          'ms-azuretools.vscode-docker',
          'GitHub.copilot',
          'prisma.prisma'
        ],
        settings: {
          'terminal.integrated.defaultProfile.linux': 'bash',
          'editor.formatOnSave': true,
          'editor.defaultFormatter': 'esbenp.prettier-vscode'
        }
      }
    }
  };

  const configPath = path.join(devContainerDir, 'devcontainer.json');
  await fs.writeJson(configPath, devcontainerConfig, { spaces: 2 });

  return { devcontainerPath: '.devcontainer/devcontainer.json' };
}
