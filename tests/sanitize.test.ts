import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { sanitizeProject } from '../src/core/sanitize/aiResidueCleaner.js';

const SANITIZE_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'sanitize-test-dir');

describe('Sanitize Module', () => {
  beforeEach(async () => {
    await fs.ensureDir(SANITIZE_DIR);

    // AI files
    await fs.writeFile(path.join(SANITIZE_DIR, '.cursorrules'), 'system prompt');
    await fs.writeFile(path.join(SANITIZE_DIR, 'claude.md'), 'scratchpad');
    await fs.ensureDir(path.join(SANITIZE_DIR, '.cursor'));

    // Code file with secret
    await fs.writeFile(
      path.join(SANITIZE_DIR, 'server.js'),
      `const apiKey = "sk-proj-99887766554433221100aabbccddeeff1122";`
    );

    // Existing .gitignore without .env
    await fs.writeFile(path.join(SANITIZE_DIR, '.gitignore'), `node_modules\n`);
  });

  afterEach(async () => {
    await fs.remove(SANITIZE_DIR);
  });

  it('should remove AI residue files and directories', async () => {
    const result = await sanitizeProject({
      rootDir: SANITIZE_DIR,
      removeAiFiles: true,
      redactSecrets: true,
      protectGitignore: true
    });

    expect(result.removedFiles).toContain('.cursorrules');
    expect(result.removedFiles).toContain('claude.md');
    expect(result.removedDirs).toContain('.cursor');

    expect(await fs.pathExists(path.join(SANITIZE_DIR, '.cursorrules'))).toBe(false);
    expect(await fs.pathExists(path.join(SANITIZE_DIR, 'claude.md'))).toBe(false);
    expect(await fs.pathExists(path.join(SANITIZE_DIR, '.cursor'))).toBe(false);
  });

  it('should redact leaked API secrets in code', async () => {
    await sanitizeProject({
      rootDir: SANITIZE_DIR,
      removeAiFiles: true,
      redactSecrets: true,
      protectGitignore: true
    });

    const serverContent = await fs.readFile(path.join(SANITIZE_DIR, 'server.js'), 'utf-8');
    expect(serverContent).not.toContain('sk-proj-99887766554433221100aabbccddeeff1122');
    expect(serverContent).toContain('REDACTED_API_KEY');
  });

  it('should update .gitignore with security essentials', async () => {
    const result = await sanitizeProject({
      rootDir: SANITIZE_DIR,
      removeAiFiles: true,
      redactSecrets: true,
      protectGitignore: true
    });

    expect(result.gitignoreUpdated).toBe(true);
    const gitignoreContent = await fs.readFile(path.join(SANITIZE_DIR, '.gitignore'), 'utf-8');
    expect(gitignoreContent).toContain('.env');
  });
});
