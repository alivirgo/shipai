import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { replaceProjectText } from '../src/core/rebrand/textReplacer.js';
import { renameProjectFiles } from '../src/core/rebrand/fileRenamer.js';
import { updateProjectMetadata } from '../src/core/rebrand/metadataUpdater.js';
import { generateBrandAssets, getMonogram } from '../src/core/rebrand/assetGenerator.js';

const REBRAND_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'rebrand-test-dir');

describe('Rebrand Module', () => {
  beforeEach(async () => {
    await fs.ensureDir(REBRAND_DIR);
    await fs.ensureDir(path.join(REBRAND_DIR, 'public'));
    await fs.ensureDir(path.join(REBRAND_DIR, 'src', 'components'));

    // Create a package.json
    await fs.writeJson(path.join(REBRAND_DIR, 'package.json'), {
      name: 'chat-pilot',
      version: '0.1.0',
      description: 'Old AI prototype for Chat Pilot',
      author: 'Old Dev'
    });

    // Create an index.html
    await fs.writeFile(
      path.join(REBRAND_DIR, 'index.html'),
      `<!DOCTYPE html><html><head><title>ChatPilot Prototype</title><meta name="description" content="ChatPilot app" /></head><body></body></html>`
    );

    // Create a file with multiple casings
    await fs.writeFile(
      path.join(REBRAND_DIR, 'src', 'components', 'ChatPilotWidget.ts'),
      `
      export class ChatPilotWidget {
        private chatPilotConfig = {};
        private readonly CHAT_PILOT_URL = "https://chat-pilot.internal";
      }
      `
    );
  });

  afterEach(async () => {
    await fs.remove(REBRAND_DIR);
  });

  it('should calculate accurate monogram', () => {
    expect(getMonogram('Acme Portal')).toBe('AP');
    expect(getMonogram('OmniDesk')).toBe('OM');
    expect(getMonogram('alpha-beta')).toBe('AB');
  });

  it('should deeply replace all casing formats across files', async () => {
    const result = await replaceProjectText({
      rootDir: REBRAND_DIR,
      sourceName: 'ChatPilot',
      targetName: 'OmniDesk'
    });

    expect(result.totalReplacements).toBeGreaterThan(0);

    const componentContent = await fs.readFile(
      path.join(REBRAND_DIR, 'src', 'components', 'ChatPilotWidget.ts'),
      'utf-8'
    );

    expect(componentContent).toContain('OmniDeskWidget');
    expect(componentContent).toContain('omniDeskConfig');
    expect(componentContent).toContain('OMNI_DESK_URL');
    expect(componentContent).toContain('omni-desk.internal');
    expect(componentContent).not.toContain('ChatPilot');
  });

  it('should rename files containing the legacy project name', async () => {
    const renameResult = await renameProjectFiles(
      REBRAND_DIR,
      'ChatPilot',
      'OmniDesk'
    );

    expect(renameResult.renamedItems.length).toBeGreaterThan(0);
    const newFileExists = await fs.pathExists(
      path.join(REBRAND_DIR, 'src', 'components', 'OmniDeskWidget.ts')
    );
    expect(newFileExists).toBe(true);
  });

  it('should update package.json and index.html metadata', async () => {
    await updateProjectMetadata({
      rootDir: REBRAND_DIR,
      projectName: 'OmniDesk',
      clientName: 'Acme Corp',
      description: 'Custom AI Assistant for Acme Corp',
      brandColor: '#0ea5e9'
    });

    const pkg = await fs.readJson(path.join(REBRAND_DIR, 'package.json'));
    expect(pkg.name).toBe('omni-desk');
    expect(pkg.author).toBe('Acme Corp');

    const html = await fs.readFile(path.join(REBRAND_DIR, 'index.html'), 'utf-8');
    expect(html).toContain('<title>Omni Desk | Acme Corp</title>');
    expect(html).toContain('Custom AI Assistant for Acme Corp');
  });

  it('should generate modern bespoke SVG assets', async () => {
    const assetResult = await generateBrandAssets({
      rootDir: REBRAND_DIR,
      projectName: 'OmniDesk',
      brandColor: '#6366f1'
    });

    expect(assetResult.generatedAssets.length).toBeGreaterThan(0);
    const favPath = path.join(REBRAND_DIR, 'public', 'favicon.svg');
    const logoPath = path.join(REBRAND_DIR, 'public', 'logo.svg');

    expect(await fs.pathExists(favPath)).toBe(true);
    expect(await fs.pathExists(logoPath)).toBe(true);

    const favContent = await fs.readFile(favPath, 'utf-8');
    expect(favContent).toContain('<svg');
    expect(favContent).toContain('#6366f1');
  });
});
