import fs from 'fs-extra';
import path from 'path';
import { FrameworkInfo } from './frameworkDetector.js';

export interface DockerGeneratorResult {
  filesCreated: string[];
}

/**
 * Generates multi-stage Dockerfile, .dockerignore, and docker-compose.yml
 */
export async function generateDockerConfigs(
  rootDir: string,
  info: FrameworkInfo,
  projectName = 'app'
): Promise<DockerGeneratorResult> {
  const filesCreated: string[] = [];

  let dockerfileContent = '';

  if (info.framework === 'nextjs') {
    dockerfileContent = `# --- Stage 1: Dependencies ---
FROM node:20-alpine AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app
COPY package.json package-lock.json* pnpm-lock.yaml* yarn.lock* ./
RUN \\
  if [ -f yarn.lock ]; then yarn --frozen-lockfile; \\
  elif [ -f pnpm-lock.yaml ]; then corepack enable pnpm && pnpm i --frozen-lockfile; \\
  elif [ -f package-lock.json ]; then npm ci; \\
  else npm i; \\
  fi

# --- Stage 2: Builder ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
ENV NEXT_TELEMETRY_DISABLED=1
ENV NODE_ENV=production
RUN npm run build

# --- Stage 3: Runner ---
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${info.port}
ENV HOSTNAME="0.0.0.0"

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
# Automatically leverage output traces to reduce image size
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE ${info.port}

CMD ["node", "server.js"]
`;
  } else if (info.framework === 'vite') {
    dockerfileContent = `# --- Stage 1: Build Static Assets ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: Production Nginx Server ---
FROM nginx:alpine AS runner
COPY --from=builder /app/dist /usr/share/nginx/html
# Custom nginx config for SPA routing
RUN printf 'server {\\n  listen 80;\\n  location / {\\n    root /usr/share/nginx/html;\\n    try_files $uri $uri/ /index.html;\\n  }\\n}\\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
`;
  } else if (info.isPython) {
    dockerfileContent = `# --- Python Production Container ---
FROM python:3.11-slim AS runner
WORKDIR /app

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

RUN apt-get update && apt-get install -y --no-install-recommends curl && rm -rf /var/lib/apt/lists/*

COPY requirements.txt* pyproject.toml* ./
RUN pip install --no-cache-dir --upgrade pip && \\
    if [ -f requirements.txt ]; then pip install --no-cache-dir -r requirements.txt; fi

COPY . .

RUN useradd -m -u 1001 appuser
USER appuser

EXPOSE ${info.port}
CMD ["${info.startCommand}"]
`;
  } else {
    // Generic Node.js
    dockerfileContent = `# --- Multi-stage Node.js Production Container ---
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN if npm run | grep -q "build"; then npm run build; fi

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=${info.port}

RUN addgroup -S appgroup && adduser -S appuser -G appgroup

COPY package*.json ./
RUN npm ci --only=production
COPY --from=builder /app/dist ./dist 2>/dev/null || true
COPY --from=builder /app ./

USER appuser
EXPOSE ${info.port}

CMD ["npm", "run", "start"]
`;
  }

  // .dockerignore
  const dockerignoreContent = `.git
.gitignore
node_modules
npm-debug.log
.next
dist
build
.env
.env.local
.env.*.local
.cursor
.cursorrules
claude.md
coverage
*.log
`;

  // docker-compose.yml
  const port = info.framework === 'vite' ? 80 : info.port;
  const dockerComposeContent = `services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    container_name: ${projectName}-app
    restart: unless-stopped
    ports:
      - "${port}:${port}"
    env_file:
      - .env
    environment:
      - NODE_ENV=production
      - PORT=${port}
      - REDIS_URL=redis://redis:6379
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:${port}/ || curl -f http://localhost:${port}/ || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 20s
    networks:
      - app-network

  redis:
    image: redis:7-alpine
    container_name: ${projectName}-redis
    restart: unless-stopped
    command: redis-server --save 60 1 --loglevel warning
    volumes:
      - redis_data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

networks:
  app-network:
    driver: bridge

volumes:
  redis_data:
    driver: local
`;

  const dockerfilePath = path.join(rootDir, 'Dockerfile');
  const dockerignorePath = path.join(rootDir, '.dockerignore');
  const composePath = path.join(rootDir, 'docker-compose.yml');

  await fs.writeFile(dockerfilePath, dockerfileContent, 'utf-8');
  filesCreated.push('Dockerfile');

  await fs.writeFile(dockerignorePath, dockerignoreContent, 'utf-8');
  filesCreated.push('.dockerignore');

  await fs.writeFile(composePath, dockerComposeContent, 'utf-8');
  filesCreated.push('docker-compose.yml');

  return { filesCreated };
}
