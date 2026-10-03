import fs from 'fs-extra';
import path from 'path';
import { capitalCase } from 'change-case';

export interface AssetGeneratorOptions {
  rootDir: string;
  projectName: string;
  clientName?: string;
  brandColor?: string;
  secondaryColor?: string;
}

export interface AssetGeneratorResult {
  generatedAssets: string[];
}

/**
 * Derives a 2-character monogram from a project name
 */
export function getMonogram(name: string): string {
  const parts = name.trim().split(/[\s\-_]+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
}

/**
 * Creates modern bespoke SVG brand assets (favicon, logo, og-card, touch-icon) for the client
 */
export async function generateBrandAssets(
  options: AssetGeneratorOptions
): Promise<AssetGeneratorResult> {
  const {
    rootDir,
    projectName,
    clientName = projectName,
    brandColor = '#4f46e5',
    secondaryColor = '#06b6d4'
  } = options;

  const monogram = getMonogram(projectName);
  const generatedAssets: string[] = [];

  // 1. Favicon SVG
  const faviconSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
  <defs>
    <linearGradient id="brandGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
  </defs>
  <rect width="100" height="100" rx="28" fill="url(#brandGrad)" />
  <text x="50" y="65" font-size="44" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle" letter-spacing="-1">${monogram}</text>
</svg>
`;

  // 2. Horizontal Logo with Badge and Name
  const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 420 100">
  <defs>
    <linearGradient id="logoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
  </defs>
  <!-- Icon Badge -->
  <rect x="10" y="10" width="80" height="80" rx="22" fill="url(#logoGrad)" />
  <text x="50" y="62" font-size="38" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle">${monogram}</text>
  <!-- Wordmark -->
  <text x="110" y="63" font-size="40" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" fill="#0f172a" letter-spacing="-0.5">${projectName}</text>
</svg>
`;

  // 3. High-Res OpenGraph Social Card (1200 x 630)
  const ogCardSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <linearGradient id="ogBg" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#090d16" />
      <stop offset="100%" stop-color="#111827" />
    </linearGradient>
    <linearGradient id="accentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="${brandColor}" />
      <stop offset="100%" stop-color="${secondaryColor}" />
    </linearGradient>
  </defs>
  <!-- Deep Background -->
  <rect width="1200" height="630" fill="url(#ogBg)" />
  <circle cx="950" cy="180" r="320" fill="${brandColor}" opacity="0.15" filter="blur(80px)" />
  <circle cx="200" cy="500" r="280" fill="${secondaryColor}" opacity="0.1" filter="blur(70px)" />

  <!-- Center Card -->
  <rect x="100" y="100" width="1000" height="430" rx="24" fill="#ffffff" fill-opacity="0.04" stroke="#ffffff" stroke-opacity="0.1" />
  
  <!-- Monogram Badge -->
  <rect x="160" y="160" width="100" height="100" rx="28" fill="url(#accentGrad)" />
  <text x="210" y="226" font-size="52" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="900" fill="#ffffff" text-anchor="middle">${monogram}</text>
  
  <!-- Title & Tagline -->
  <text x="290" y="215" font-size="56" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="800" fill="#ffffff" letter-spacing="-1">${projectName}</text>
  <text x="290" y="250" font-size="22" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="500" fill="#94a3b8">Bespoke Solution Prepared for ${clientName}</text>
  
  <!-- Footer Feature Pills -->
  <rect x="160" y="420" width="180" height="44" rx="22" fill="#ffffff" fill-opacity="0.08" />
  <text x="250" y="448" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" fill="#e2e8f0" text-anchor="middle">Enterprise Grade</text>

  <rect x="360" y="420" width="180" height="44" rx="22" fill="#ffffff" fill-opacity="0.08" />
  <text x="450" y="448" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" fill="#e2e8f0" text-anchor="middle">Container Ready</text>

  <rect x="560" y="420" width="180" height="44" rx="22" fill="#ffffff" fill-opacity="0.08" />
  <text x="650" y="448" font-size="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-weight="600" fill="#e2e8f0" text-anchor="middle">Verified & Audited</text>
</svg>
`;

  // 4. Web App Manifest
  const manifest = {
    name: capitalCase(projectName),
    short_name: capitalCase(projectName).substring(0, 12),
    description: `Bespoke solution for ${clientName}`,
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: brandColor,
    icons: [
      {
        src: '/favicon.svg',
        sizes: 'any',
        type: 'image/svg+xml'
      },
      {
        src: '/apple-touch-icon.svg',
        sizes: '180x180',
        type: 'image/svg+xml'
      }
    ]
  };

  const targetDirs = [
    path.join(rootDir, 'public'),
    path.join(rootDir, 'src', 'assets'),
    rootDir
  ];

  for (const dir of targetDirs) {
    if (await fs.pathExists(dir)) {
      const favPath = path.join(dir, 'favicon.svg');
      const logoPath = path.join(dir, 'logo.svg');
      const touchPath = path.join(dir, 'apple-touch-icon.svg');
      const ogPath = path.join(dir, 'og-image.svg');
      const manifestPath = path.join(dir, 'site.webmanifest');

      await fs.writeFile(favPath, faviconSvg, 'utf-8');
      await fs.writeFile(logoPath, logoSvg, 'utf-8');
      await fs.writeFile(touchPath, faviconSvg, 'utf-8');
      await fs.writeFile(ogPath, ogCardSvg, 'utf-8');
      await fs.writeJson(manifestPath, manifest, { spaces: 2 });

      generatedAssets.push(path.relative(rootDir, favPath));
      generatedAssets.push(path.relative(rootDir, logoPath));
      generatedAssets.push(path.relative(rootDir, touchPath));
      generatedAssets.push(path.relative(rootDir, ogPath));
      generatedAssets.push(path.relative(rootDir, manifestPath));
      break;
    }
  }

  return { generatedAssets };
}
