import fs from 'fs-extra';
import path from 'path';
import { kebabCase, capitalCase } from 'change-case';

export interface MetadataUpdateOptions {
  rootDir: string;
  projectName: string;
  clientName?: string;
  description?: string;
  websiteUrl?: string;
  repositoryUrl?: string;
  brandColor?: string;
}

export interface MetadataUpdateResult {
  updatedFiles: string[];
}

/**
 * Updates package.json, index.html, manifests, and pyproject.toml with bespoke client metadata
 */
export async function updateProjectMetadata(
  options: MetadataUpdateOptions
): Promise<MetadataUpdateResult> {
  const {
    rootDir,
    projectName,
    clientName = projectName,
    description = `${capitalCase(projectName)} - Bespoke Enterprise Solution for ${clientName}`,
    websiteUrl,
    repositoryUrl,
    brandColor = '#4f46e5'
  } = options;

  const updatedFiles: string[] = [];

  // 1. Update package.json if present
  const pkgPath = path.join(rootDir, 'package.json');
  if (await fs.pathExists(pkgPath)) {
    try {
      const pkg = await fs.readJson(pkgPath);
      pkg.name = kebabCase(projectName);
      pkg.description = description;
      pkg.author = clientName;
      if (repositoryUrl) {
        pkg.repository = { type: 'git', url: repositoryUrl };
      } else {
        delete pkg.repository;
      }
      if (websiteUrl) {
        pkg.homepage = websiteUrl;
      } else {
        delete pkg.homepage;
      }
      delete pkg.bugs;

      await fs.writeJson(pkgPath, pkg, { spaces: 2 });
      updatedFiles.push('package.json');
    } catch {
      // Ignore JSON parse errors
    }
  }

  // 2. Update index.html or HTML files
  const htmlCandidates = [
    path.join(rootDir, 'index.html'),
    path.join(rootDir, 'public', 'index.html'),
    path.join(rootDir, 'src', 'index.html')
  ];

  const pageTitle = `${capitalCase(projectName)} | ${clientName}`;

  for (const htmlPath of htmlCandidates) {
    if (await fs.pathExists(htmlPath)) {
      try {
        let html = await fs.readFile(htmlPath, 'utf-8');

        // Replace <title>
        html = html.replace(/<title>.*?<\/title>/i, `<title>${pageTitle}</title>`);

        // Replace or inject meta description
        if (/<meta\s+name=["']description["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']description["'][^>]*>/i,
            `<meta name="description" content="${description}" />`
          );
        }

        // Replace theme-color
        if (/<meta\s+name=["']theme-color["']/i.test(html)) {
          html = html.replace(
            /<meta\s+name=["']theme-color["'][^>]*>/i,
            `<meta name="theme-color" content="${brandColor}" />`
          );
        }

        // OpenGraph tags
        if (/<meta\s+property=["']og:title["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:title["'][^>]*>/i,
            `<meta property="og:title" content="${pageTitle}" />`
          );
        }
        if (/<meta\s+property=["']og:description["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:description["'][^>]*>/i,
            `<meta property="og:description" content="${description}" />`
          );
        }
        if (/<meta\s+property=["']og:site_name["']/i.test(html)) {
          html = html.replace(
            /<meta\s+property=["']og:site_name["'][^>]*>/i,
            `<meta property="og:site_name" content="${clientName}" />`
          );
        }

        await fs.writeFile(htmlPath, html, 'utf-8');
        updatedFiles.push(path.relative(rootDir, htmlPath));
      } catch {
        // Continue
      }
    }
  }

  // 3. Update Web Manifest files
  const manifestCandidates = [
    path.join(rootDir, 'manifest.json'),
    path.join(rootDir, 'public', 'manifest.json'),
    path.join(rootDir, 'public', 'site.webmanifest'),
    path.join(rootDir, 'src', 'manifest.json')
  ];

  for (const mPath of manifestCandidates) {
    if (await fs.pathExists(mPath)) {
      try {
        const manifest = await fs.readJson(mPath);
        manifest.name = capitalCase(projectName);
        manifest.short_name = capitalCase(projectName).substring(0, 12);
        manifest.description = description;
        manifest.theme_color = brandColor;
        manifest.background_color = '#ffffff';

        await fs.writeJson(mPath, manifest, { spaces: 2 });
        updatedFiles.push(path.relative(rootDir, mPath));
      } catch {
        // Continue
      }
    }
  }

  // 4. Update pyproject.toml if Python project
  const pyprojectPath = path.join(rootDir, 'pyproject.toml');
  if (await fs.pathExists(pyprojectPath)) {
    try {
      let pyContent = await fs.readFile(pyprojectPath, 'utf-8');
      pyContent = pyContent.replace(/name\s*=\s*["'][^"']+["']/, `name = "${kebabCase(projectName)}"`);
      pyContent = pyContent.replace(/description\s*=\s*["'][^"']+["']/, `description = "${description}"`);
      await fs.writeFile(pyprojectPath, pyContent, 'utf-8');
      updatedFiles.push('pyproject.toml');
    } catch {
      // Continue
    }
  }

  return { updatedFiles };
}
