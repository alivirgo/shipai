import fs from 'fs-extra';
import path from 'path';
import { FrameworkInfo } from './frameworkDetector.js';

export interface CicdResult {
  workflowsCreated: string[];
}

/**
 * Generates production GitHub Actions workflows for continuous integration and Docker build checks
 */
export async function generateCicdWorkflows(
  rootDir: string,
  info: FrameworkInfo,
  projectName = 'app'
): Promise<CicdResult> {
  const workflowsDir = path.join(rootDir, '.github', 'workflows');
  await fs.ensureDir(workflowsDir);

  const workflowsCreated: string[] = [];

  const ciWorkflow = `name: CI & Quality Gate

on:
  push:
    branches: [ main, master, develop ]
  pull_request:
    branches: [ main, master ]

jobs:
  validate:
    name: Build & Validate
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      ${
        info.isPython
          ? `- name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: 'pip'

      - name: Install Dependencies
        run: |
          python -m pip install --upgrade pip
          if [ -f requirements.txt ]; then pip install -r requirements.txt; fi

      - name: Lint & Test
        run: |
          if command -v pytest &> /dev/null; then pytest; fi`
          : `- name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: '${info.packageManager === 'npm' ? 'npm' : info.packageManager}'

      - name: Install Dependencies
        run: ${info.packageManager === 'npm' ? 'npm ci' : `${info.packageManager} install`}

      - name: Type Check & Build
        run: |
          ${info.buildCommand || 'npm run build'}

      - name: Test
        run: |
          if npm run | grep -q "test"; then npm test; fi`
      }

  docker-check:
    name: Verify Docker Build
    runs-on: ubuntu-latest
    needs: validate
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Build Docker Image
        uses: docker/build-push-action@v5
        with:
          context: .
          push: false
          tags: ${projectName}:test
`;

  const ciPath = path.join(workflowsDir, 'ci.yml');
  await fs.writeFile(ciPath, ciWorkflow, 'utf-8');
  workflowsCreated.push('.github/workflows/ci.yml');

  return { workflowsCreated };
}
