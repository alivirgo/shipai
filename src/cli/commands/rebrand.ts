import path from 'path';
import * as p from '@clack/prompts';
import ora from 'ora';
import pc from 'picocolors';
import { replaceProjectText } from '../../core/rebrand/textReplacer.js';
import { renameProjectFiles } from '../../core/rebrand/fileRenamer.js';
import { updateProjectMetadata } from '../../core/rebrand/metadataUpdater.js';
import { generateBrandAssets } from '../../core/rebrand/assetGenerator.js';
import { applyClientTheme } from '../../core/rebrand/themeEngine.js';
import { SnapshotManager } from '../../core/snapshot/snapshotManager.js';
import { printSummaryBox } from '../ui/banners.js';

export interface RebrandCommandOptions {
  from?: string;
  to?: string;
  client?: string;
  description?: string;
  color?: string;
  url?: string;
  dryRun?: boolean;
}

export async function runRebrandCommand(targetDir?: string, options: RebrandCommandOptions = {}): Promise<void> {
  const rootDir = path.resolve(targetDir || process.cwd());

  let sourceName = options.from;
  let targetName = options.to;
  let clientName = options.client;
  let brandColor = options.color || '#4f46e5';
  let websiteUrl = options.url;
  let description = options.description;

  // If arguments missing, prompt interactively
  if (!sourceName || !targetName) {
    p.intro(pc.bgCyan(pc.black(' ShipAI Rebranding Wizard ')));

    if (!sourceName) {
      const fromInput = await p.text({
        message: 'What was the original project / AI prototype name? (e.g. BrainFlow, chat-agent)',
        placeholder: 'OriginalProject',
        validate: val => (!val ? 'Original name is required' : undefined)
      });
      if (p.isCancel(fromInput)) process.exit(0);
      sourceName = fromInput;
    }

    if (!targetName) {
      const toInput = await p.text({
        message: 'What is the new bespoke solution name for the client? (e.g. OmniDesk, client-portal)',
        placeholder: 'ClientPlatform',
        validate: val => (!val ? 'New target name is required' : undefined)
      });
      if (p.isCancel(toInput)) process.exit(0);
      targetName = toInput;
    }

    if (!clientName) {
      const clientInput = await p.text({
        message: 'What is the client or company name?',
        placeholder: 'Acme Corporation',
        initialValue: targetName
      });
      if (p.isCancel(clientInput)) process.exit(0);
      clientName = clientInput;
    }

    if (!options.color) {
      const colorInput = await p.text({
        message: 'Primary brand accent color (HEX):',
        placeholder: '#4f46e5',
        initialValue: '#4f46e5'
      });
      if (p.isCancel(colorInput)) process.exit(0);
      brandColor = colorInput;
    }
  }

  clientName = clientName || targetName;

  // Create safety snapshot before any mutations
  if (!options.dryRun) {
    const snapManager = new SnapshotManager(rootDir);
    await snapManager.createSnapshot(`Automatic checkpoint before rebranding "${sourceName}" to "${targetName}"`);
  }

  const spinner = ora(`Rebranding project from "${sourceName}" to "${targetName}"...`).start();

  try {
    // 1. Deep Text & Casing Replacements
    spinner.text = 'Scanning and replacing multi-casing strings across files...';
    const textResult = await replaceProjectText({
      rootDir,
      sourceName,
      targetName,
      dryRun: options.dryRun
    });

    // 2. Metadata Updates (package.json, index.html, manifests)
    spinner.text = 'Updating package.json, HTML headers, and client manifests...';
    const metaResult = await updateProjectMetadata({
      rootDir,
      projectName: targetName,
      clientName,
      description,
      websiteUrl,
      brandColor
    });

    // 3. File & Directory Renames
    spinner.text = 'Renaming files and directories containing legacy branding...';
    const renameResult = await renameProjectFiles(
      rootDir,
      sourceName,
      targetName,
      options.dryRun
    );

    // 4. Asset Generation (Bespoke SVG Logo, Favicon, Touch Icon, OpenGraph Card)
    spinner.text = 'Generating bespoke client logo, favicon, and OpenGraph social cards...';
    const assetResult = await generateBrandAssets({
      rootDir,
      projectName: targetName,
      clientName,
      brandColor
    });

    // 5. Design System Theming (Inject 11-shade palette into CSS & Tailwind)
    spinner.text = 'Reskinning design system and injecting 11-shade client brand palette...';
    const themeResult = await applyClientTheme(rootDir, brandColor);

    spinner.succeed(
      pc.green(
        options.dryRun
          ? 'Rebrand simulation completed (dry run)'
          : 'Project rebranded successfully!'
      )
    );

    console.log('');
    printSummaryBox(
      'Rebrand Results',
      [
        `Original Name:      ${sourceName}`,
        `New Bespoke Name:   ${targetName}`,
        `Client Name:        ${clientName}`,
        `Files Scanned:      ${textResult.totalFilesScanned}`,
        `Files Modified:     ${textResult.totalFilesModified}`,
        `Total String Swaps: ${textResult.totalReplacements}`,
        `Items Renamed:      ${renameResult.renamedItems.length}`,
        `Metadata Updated:   ${metaResult.updatedFiles.join(', ') || 'None'}`,
        `Assets Generated:   ${assetResult.generatedAssets.join(', ') || 'None'}`,
        `Theme Injected:     ${themeResult.updatedThemeFiles.join(', ') || '11-shade brand palette derived'}`
      ],
      'cyan'
    );

    if (renameResult.renamedItems.length > 0) {
      console.log(pc.bold('Renamed Files / Directories:'));
      for (const item of renameResult.renamedItems) {
        console.log(`  ${pc.dim(item.oldName)} -> ${pc.green(item.newName)}`);
      }
      console.log('');
    }
  } catch (err: any) {
    spinner.fail(`Rebranding failed: ${err.message}`);
  }
}
