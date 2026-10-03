import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { generateColorPalette, applyClientTheme } from '../src/core/rebrand/themeEngine.js';

const THEME_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'theme-test-dir');

describe('Theme & Design System Engine', () => {
  beforeEach(async () => {
    await fs.ensureDir(THEME_DIR);
    await fs.ensureDir(path.join(THEME_DIR, 'src'));

    await fs.writeFile(
      path.join(THEME_DIR, 'src', 'globals.css'),
      `:root {\n  --background: #ffffff;\n}\n`
    );

    await fs.writeFile(
      path.join(THEME_DIR, 'tailwind.config.js'),
      `module.exports = { theme: { extend: {} } };\n`
    );
  });

  afterEach(async () => {
    await fs.remove(THEME_DIR);
  });

  it('should generate complete 11-shade color palette', () => {
    const palette = generateColorPalette('#0ea5e9');
    expect(palette[50]).toBeDefined();
    expect(palette[500]).toBe('#0ea5e9');
    expect(palette[900]).toBeDefined();
    expect(palette[950]).toBeDefined();
  });

  it('should inject theme tokens into CSS and Tailwind config', async () => {
    const result = await applyClientTheme(THEME_DIR, '#10b981');
    expect(result.updatedThemeFiles.length).toBeGreaterThan(0);

    const cssContent = await fs.readFile(path.join(THEME_DIR, 'src', 'globals.css'), 'utf-8');
    expect(cssContent).toContain('--brand-primary: #10b981');
    expect(cssContent).toContain('--brand-50');

    const twContent = await fs.readFile(path.join(THEME_DIR, 'tailwind.config.js'), 'utf-8');
    expect(twContent).toContain('brand: {');
  });
});
