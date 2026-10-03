import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { auditPythonProject, rebrandPythonProject, generatePythonBootstrap } from '../src/core/python/pythonManager.js';
import { buildCasingMatrix } from '../src/core/rebrand/casingMatrix.js';

const PY_TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'python-test-dir');

describe('Python AI Agent Ecosystem Manager', () => {
  beforeEach(async () => {
    await fs.ensureDir(PY_TEST_DIR);

    // requirements.txt with unpinned package
    await fs.writeFile(
      path.join(PY_TEST_DIR, 'requirements.txt'),
      `fastapi==0.110.0\nuvicorn>=0.28.0\nlangchain\n`
    );

    // Python FastAPI app
    const pyCode = `from fastapi import FastAPI

app = FastAPI(title="OldProject", description="AI prototype")

class OldProjectAgent:
    def __init__(self):
        self.name = "OldProject"
`;
    await fs.writeFile(path.join(PY_TEST_DIR, 'main.py'), pyCode);
  });

  afterEach(async () => {
    await fs.remove(PY_TEST_DIR);
  });

  it('should detect unpinned dependencies in requirements.txt', async () => {
    const findings = await auditPythonProject(PY_TEST_DIR);
    const unpinned = findings.find(f => f.type === 'unpinned_dependency');
    expect(unpinned).toBeDefined();
    expect(unpinned?.message).toContain('langchain');
  });

  it('should rebrand Python class names, strings, and FastAPI title', async () => {
    const matrix = buildCasingMatrix('OldProject', 'NewEnterprise');
    const result = await rebrandPythonProject(PY_TEST_DIR, matrix, false);

    expect(result.totalReplacements).toBeGreaterThan(0);
    const mainPy = await fs.readFile(path.join(PY_TEST_DIR, 'main.py'), 'utf-8');
    expect(mainPy).toContain('NewEnterpriseAgent');
    expect(mainPy).toContain('FastAPI(title="New Enterprise"');
    expect(mainPy).not.toContain('OldProjectAgent');
  });

  it('should generate cross-platform virtualenv bootstrap scripts', async () => {
    const result = await generatePythonBootstrap(PY_TEST_DIR, 'NewEnterprise');
    expect(result.scriptsCreated).toContain('scripts/setup-venv.sh');
    expect(result.scriptsCreated).toContain('scripts/setup-venv.bat');

    const sh = await fs.readFile(path.join(PY_TEST_DIR, 'scripts', 'setup-venv.sh'), 'utf-8');
    expect(sh).toContain('python3 -m venv .venv');
    expect(sh).toContain('pip install -r requirements.txt');

    const bat = await fs.readFile(path.join(PY_TEST_DIR, 'scripts', 'setup-venv.bat'), 'utf-8');
    expect(bat).toContain('python -m venv .venv');
  });
});
