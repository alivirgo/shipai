import fs from 'fs-extra';
import path from 'path';
import { getProjectFiles, readTextFile, writeTextFile } from '../../utils/fileUtils.js';
import { RebrandMatrix } from '../rebrand/casingMatrix.js';

export interface PythonAuditFinding {
  type: 'unpinned_dependency' | 'vulnerable_package' | 'missing_venv_script';
  message: string;
  file?: string;
}

export interface PythonRebrandResult {
  modifiedFiles: string[];
  totalReplacements: number;
}

export interface PythonBootstrapResult {
  scriptsCreated: string[];
}

/**
 * Audits Python project dependencies and environment hygiene
 */
export async function auditPythonProject(rootDir: string): Promise<PythonAuditFinding[]> {
  const findings: PythonAuditFinding[] = [];
  const reqsPath = path.join(rootDir, 'requirements.txt');
  const pyprojectPath = path.join(rootDir, 'pyproject.toml');

  if (await fs.pathExists(reqsPath)) {
    const content = await fs.readFile(reqsPath, 'utf-8');
    const lines = content.split('\n');

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      // Check if unpinned (e.g. "langchain" without "==" or ">=")
      if (!/[=><~!]/.test(trimmed)) {
        findings.push({
          type: 'unpinned_dependency',
          message: `Package "${trimmed}" in requirements.txt has no pinned version. Clients may encounter breaking changes.`,
          file: 'requirements.txt'
        });
      }
    }
  }

  const venvScriptSh = path.join(rootDir, 'scripts', 'setup-venv.sh');
  if (!(await fs.pathExists(venvScriptSh)) && ((await fs.pathExists(reqsPath)) || (await fs.pathExists(pyprojectPath)))) {
    findings.push({
      type: 'missing_venv_script',
      message: 'No client virtual environment setup script found. Non-technical clients may fail to configure Python dependencies.'
    });
  }

  return findings;
}

/**
 * Rebrands Python source files, FastAPI schemas, and pyproject.toml manifests
 */
export async function rebrandPythonProject(
  rootDir: string,
  matrix: RebrandMatrix,
  dryRun = false
): Promise<PythonRebrandResult> {
  const files = await getProjectFiles(rootDir);
  const pythonFiles = files.filter(f => /\.(py|toml|cfg|ini)$/i.test(f.filePath));

  const modifiedFiles: string[] = [];
  let totalReplacements = 0;

  for (const f of pythonFiles) {
    if (f.relativePath.includes('.venv') || f.relativePath.includes('site-packages')) continue;

    let content: string;
    try {
      content = await readTextFile(f.filePath);
    } catch {
      continue;
    }

    let updated = content;
    let fileReplacements = 0;

    // Apply casing matrix transformations to Python symbols & strings
    for (const pair of matrix.pairs) {
      if (updated.includes(pair.source)) {
        const occurrences = updated.split(pair.source).length - 1;
        fileReplacements += occurrences;
        updated = updated.split(pair.source).join(pair.target);
      }
    }

    // Rebrand FastAPI title and description if present
    if (f.filePath.endsWith('.py') && updated.includes('FastAPI(')) {
      const fastApiTitleRegex = /FastAPI\s*\(\s*title\s*=\s*["'][^"']+["']/g;
      const targetTitle = matrix.pairs.find(p => p.type === 'Title Case')?.target || matrix.pairs[0].target;
      if (fastApiTitleRegex.test(updated)) {
        updated = updated.replace(fastApiTitleRegex, `FastAPI(title="${targetTitle}"`);
        fileReplacements++;
      }
    }

    if (fileReplacements > 0 && updated !== content) {
      totalReplacements += fileReplacements;
      modifiedFiles.push(f.relativePath);
      if (!dryRun) {
        await writeTextFile(f.filePath, updated);
      }
    }
  }

  return { modifiedFiles, totalReplacements };
}

/**
 * Generates automated cross-platform Python virtual environment bootstrap scripts for non-technical clients
 */
export async function generatePythonBootstrap(
  rootDir: string,
  projectName = 'AI Solution'
): Promise<PythonBootstrapResult> {
  const scriptsDir = path.join(rootDir, 'scripts');
  await fs.ensureDir(scriptsDir);
  const scriptsCreated: string[] = [];

  // 1. Linux / macOS setup script
  const shContent = `#!/usr/bin/env bash
set -e

echo "=========================================================="
echo " ${projectName} - Client Environment Setup"
echo "=========================================================="

if ! command -v python3 &> /dev/null; then
    echo "Error: python3 is not installed. Please install Python 3.10+."
    exit 1
fi

echo "[1/4] Creating virtual environment (.venv)..."
python3 -m venv .venv

echo "[2/4] Activating virtual environment..."
source .venv/bin/activate

echo "[3/4] Upgrading pip and build tools..."
pip install --upgrade pip setuptools wheel

echo "[4/4] Installing enterprise dependencies..."
if [ -f "requirements.txt" ]; then
    pip install -r requirements.txt
elif [ -f "pyproject.toml" ]; then
    pip install .
fi

if [ ! -f ".env" ] && [ -f ".env.example" ]; then
    cp .env.example .env
    echo "Created .env from .env.example template."
fi

echo "=========================================================="
echo "✔ Setup complete! To start the service:"
echo "   source .venv/bin/activate"
echo "   uvicorn main:app --reload --port 8000"
echo "=========================================================="
`;

  // 2. Windows PowerShell / Batch setup script
  const batContent = `@echo off
echo ==========================================================
echo  ${projectName} - Client Environment Setup (Windows)
echo ==========================================================

where python >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Python is not installed or not in PATH. Please install Python 3.10+.
    pause
    exit /b 1
)

echo [1/4] Creating virtual environment (.venv)...
python -m venv .venv

echo [2/4] Activating virtual environment...
call .venv\\Scripts\\activate.bat

echo [3/4] Upgrading pip...
python -m pip install --upgrade pip setuptools wheel

echo [4/4] Installing enterprise dependencies...
if exist requirements.txt (
    pip install -r requirements.txt
) else if exist pyproject.toml (
    pip install .
)

if not exist .env (
    if exist .env.example (
        copy .env.example .env
        echo Created .env from .env.example template.
    )
)

echo ==========================================================
echo Setup complete! To start the service:
echo    .venv\\Scripts\\activate.bat
echo    uvicorn main:app --reload --port 8000
echo ==========================================================
pause
`;

  const shPath = path.join(scriptsDir, 'setup-venv.sh');
  const batPath = path.join(scriptsDir, 'setup-venv.bat');

  await fs.writeFile(shPath, shContent, { encoding: 'utf-8', mode: 0o755 });
  scriptsCreated.push('scripts/setup-venv.sh');

  await fs.writeFile(batPath, batContent, 'utf-8');
  scriptsCreated.push('scripts/setup-venv.bat');

  return { scriptsCreated };
}
