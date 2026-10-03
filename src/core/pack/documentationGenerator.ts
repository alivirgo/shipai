import fs from 'fs-extra';
import path from 'path';
import { capitalCase } from 'change-case';
import { FrameworkInfo } from './frameworkDetector.js';
import { scanEnvironmentVariables } from '../audit/envScanner.js';

export interface DocGenOptions {
  rootDir: string;
  projectName: string;
  clientName?: string;
  description?: string;
  frameworkInfo: FrameworkInfo;
}

export interface DocGenResult {
  docsCreated: string[];
}

/**
 * Generates bespoke, client-facing README.md and DEPLOYMENT.md runbooks
 */
export async function generateProjectDocs(options: DocGenOptions): Promise<DocGenResult> {
  const {
    rootDir,
    projectName,
    clientName = projectName,
    description = `Enterprise solution customized for ${clientName}`,
    frameworkInfo
  } = options;

  const docsCreated: string[] = [];
  const envScan = await scanEnvironmentVariables(rootDir);
  const detectedVars = Array.from(new Set([...envScan.detectedInCode, ...envScan.definedInExample]));

  const pm = frameworkInfo.packageManager;
  const installCmd = pm === 'npm' ? 'npm install' : `${pm} install`;
  const runDevCmd = pm === 'npm' ? 'npm run dev' : `${pm} run dev`;
  const buildCmd = pm === 'npm' ? 'npm run build' : `${pm} run build`;

  // 1. Client README.md
  const readmeContent = `# ${capitalCase(projectName)}

> **Bespoke Solution Prepared for ${clientName}**  
> ${description}

---

## 🌟 Executive Overview
This repository contains the production-ready source code for **${capitalCase(projectName)}**, engineered specifically for **${clientName}**. The application leverages modern architecture with high reliability, containerized deployment, and standardized environments.

- **Framework**: ${frameworkInfo.frameworkName}
- **Runtime**: ${frameworkInfo.isPython ? 'Python 3.11+' : 'Node.js 20+'}
- **Default Port**: \`${frameworkInfo.port}\`
- **Container**: Multi-stage Docker + Docker Compose

---

## 🚀 Quickstart Guide

### Option 1: Local Development

\`\`\`bash
# 1. Clone the repository and navigate into directory
git clone <repository-url>
cd ${projectName.toLowerCase()}

# 2. Configure environment variables
cp .env.example .env
# Edit .env and enter your required API keys and database credentials

# 3. Install dependencies
${installCmd}

# 4. Start local development server
${runDevCmd}
\`\`\`

The application will be live at: **\`http://localhost:${frameworkInfo.port}\`**

---

### Option 2: Docker Container (Recommended)

Run the full production stack using Docker with a single command:

\`\`\`bash
# Ensure .env is populated with required credentials
cp .env.example .env

# Build and launch containers
docker compose up -d --build

# View container logs
docker compose logs -f
\`\`\`

---

## 🔑 Environment Configuration

Ensure the following variables are configured in your \`.env\` file prior to startup:

| Variable Name | Purpose | Example / Format |
|---|---|---|
${
  detectedVars.length > 0
    ? detectedVars.map(v => `| \`${v}\` | Runtime configuration | Defined in \`.env.example\` |`).join('\n')
    : '| `PORT` | Web server listening port | `3000` |\n| `NODE_ENV` | Runtime environment mode | `production` |'
}

*See [\`.env.example\`](./.env.example) for the complete annotated configuration.*

---

## 🏗️ Production Build & Verification

To verify that the production bundle builds cleanly without errors:

\`\`\`bash
# Run production build
${buildCmd}

# Verify Docker container build
docker build -t ${projectName.toLowerCase()}:production .
\`\`\`

---

## 📋 Client Handoff & Support
- **Client Organization**: ${clientName}
- **Deployment Runbook**: Refer to [\`DEPLOYMENT.md\`](./DEPLOYMENT.md) for step-by-step production rollout.
- **Maintenance**: Contact the delivery engineering team for SLA escalations.

*Packaged & Verified with [ShipAI](https://github.com/shipai/shipai).*
`;

  // 2. Production DEPLOYMENT.md
  const deployDocContent = `# ${capitalCase(projectName)} - Production Deployment Runbook

This document outlines the standard deployment procedures for deploying **${capitalCase(projectName)}** to modern hosting and cloud providers.

---

## Pre-flight Checklist
- [ ] Production domain DNS configured
- [ ] SSL/TLS certificates provisioned (or managed by provider)
- [ ] Database instances and vector indexes initialized
- [ ] Production API keys verified and active
- [ ] Secrets populated in hosting dashboard

---

## Target Deployment Recipes

### 1. Docker / VPS (AWS EC2, DigitalOcean, Hetzner, Linode)
1. Provision an Ubuntu 22.04 LTS host with Docker & Docker Compose installed.
2. Clone repository to \`/opt/${projectName.toLowerCase()}\`.
3. Create production \`.env\` file.
4. Launch with systemd or docker compose:
   \`\`\`bash
   docker compose up -d --build
   \`\`\`
5. Configure reverse proxy (Nginx or Caddy) with Let's Encrypt SSL.

### 2. Platform-as-a-Service (Railway / Render / Fly.io)
1. Connect this GitHub repository.
2. Select **Dockerfile** as build provider.
3. Configure environment variables in the provider dashboard under **Variables**.
4. Port: Set to \`${frameworkInfo.port}\`.
5. Trigger initial deployment.

### 3. Vercel / Netlify (for Next.js / Vite frontends)
1. Import repository into Vercel/Netlify.
2. Framework preset will auto-detect as **${frameworkInfo.frameworkName}**.
3. Supply required environment variables.
4. Click **Deploy**.

---

## Monitoring & Health Checks
- Container Healthcheck: Configured in \`docker-compose.yml\` with interval \`30s\`.
- Standard logs: \`docker compose logs -f --tail=100\`
`;

  const readmePath = path.join(rootDir, 'README.md');
  const deployPath = path.join(rootDir, 'DEPLOYMENT.md');

  await fs.writeFile(readmePath, readmeContent, 'utf-8');
  docsCreated.push('README.md');

  await fs.writeFile(deployPath, deployDocContent, 'utf-8');
  docsCreated.push('DEPLOYMENT.md');

  return { docsCreated };
}
