import fs from 'fs-extra';
import path from 'path';

export interface ColorShades {
  50: string;
  100: string;
  200: string;
  300: string;
  400: string;
  500: string;
  600: string;
  700: string;
  800: string;
  900: string;
  950: string;
}

export interface ThemeUpdateResult {
  updatedThemeFiles: string[];
  palette: ColorShades;
}

/**
 * Converts Hex string to RGB
 */
function hexToRgb(hex: string): { r: number; g: number; b: number } {
  let cleanHex = hex.replace('#', '').trim();
  if (cleanHex.length === 3) {
    cleanHex = cleanHex.split('').map(c => c + c).join('');
  }
  const num = parseInt(cleanHex, 16);
  return {
    r: (num >> 16) & 255,
    g: (num >> 8) & 255,
    b: num & 255
  };
}

/**
 * Converts RGB to HSL
 */
function rgbToHsl(r: number, g: number, b: number): { h: number; s: number; l: number } {
  r /= 255;
  g /= 255;
  b /= 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h /= 6;
  }

  return { h: Math.round(h * 360), s: Math.round(s * 100), l: Math.round(l * 100) };
}

/**
 * Converts HSL back to Hex string
 */
function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color)
      .toString(16)
      .padStart(2, '0');
  };
  return `#${f(0)}${f(8)}${f(4)}`;
}

/**
 * Generates an 11-shade perceptual color palette from a single base brand color
 */
export function generateColorPalette(hexColor: string): ColorShades {
  const { r, g, b } = hexToRgb(hexColor);
  const { h, s } = rgbToHsl(r, g, b);

  return {
    50: hslToHex(h, Math.min(s, 70), 97),
    100: hslToHex(h, Math.min(s, 75), 93),
    200: hslToHex(h, s, 85),
    300: hslToHex(h, s, 74),
    400: hslToHex(h, s, 62),
    500: hexColor.startsWith('#') ? hexColor : `#${hexColor}`,
    600: hslToHex(h, Math.min(s + 5, 100), 42),
    700: hslToHex(h, Math.min(s + 10, 100), 34),
    800: hslToHex(h, Math.min(s + 10, 100), 26),
    900: hslToHex(h, Math.min(s + 15, 100), 18),
    950: hslToHex(h, Math.min(s + 20, 100), 10)
  };
}

/**
 * Updates CSS theme files and Tailwind configurations with the client's bespoke brand palette
 */
export async function applyClientTheme(
  rootDir: string,
  brandColor: string
): Promise<ThemeUpdateResult> {
  const palette = generateColorPalette(brandColor);
  const updatedThemeFiles: string[] = [];

  const cssCandidates = [
    path.join(rootDir, 'src', 'app', 'globals.css'),
    path.join(rootDir, 'app', 'globals.css'),
    path.join(rootDir, 'src', 'globals.css'),
    path.join(rootDir, 'globals.css'),
    path.join(rootDir, 'src', 'index.css'),
    path.join(rootDir, 'src', 'styles', 'globals.css'),
    path.join(rootDir, 'styles', 'globals.css'),
    path.join(rootDir, 'index.css')
  ];

  for (const cssPath of cssCandidates) {
    if (await fs.pathExists(cssPath)) {
      try {
        let css = await fs.readFile(cssPath, 'utf-8');

        // Check if :root exists or append ShipAI theme variables
        const themeVars = `
  /* --- ShipAI Bespoke Client Brand Palette --- */
  --brand-50: ${palette[50]};
  --brand-100: ${palette[100]};
  --brand-200: ${palette[200]};
  --brand-300: ${palette[300]};
  --brand-400: ${palette[400]};
  --brand-500: ${palette[500]};
  --brand-600: ${palette[600]};
  --brand-700: ${palette[700]};
  --brand-800: ${palette[800]};
  --brand-900: ${palette[900]};
  --brand-primary: ${palette[500]};
`;

        if (css.includes(':root {')) {
          css = css.replace(':root {', `:root {${themeVars}`);
        } else {
          css = `:root {${themeVars}}\n\n` + css;
        }

        await fs.writeFile(cssPath, css, 'utf-8');
        updatedThemeFiles.push(path.relative(rootDir, cssPath));
      } catch {
        // continue
      }
    }
  }

  // Update or inject brand colors into Tailwind configuration if present
  const tailwindCandidates = [
    path.join(rootDir, 'tailwind.config.js'),
    path.join(rootDir, 'tailwind.config.ts'),
    path.join(rootDir, 'tailwind.config.mjs')
  ];

  for (const twPath of tailwindCandidates) {
    if (await fs.pathExists(twPath)) {
      try {
        let tw = await fs.readFile(twPath, 'utf-8');
        if (!tw.includes('brand:')) {
          // Inject brand palette under colors: { ... }
          const brandObj = `brand: {
        50: '${palette[50]}',
        100: '${palette[100]}',
        200: '${palette[200]}',
        300: '${palette[300]}',
        400: '${palette[400]}',
        500: '${palette[500]}',
        600: '${palette[600]}',
        700: '${palette[700]}',
        800: '${palette[800]}',
        900: '${palette[900]}',
        DEFAULT: '${palette[500]}'
      },`;

          if (tw.includes('colors: {')) {
            tw = tw.replace('colors: {', `colors: {\n      ${brandObj}`);
            await fs.writeFile(twPath, tw, 'utf-8');
            updatedThemeFiles.push(path.relative(rootDir, twPath));
          } else if (tw.includes('extend: {')) {
            tw = tw.replace('extend: {', `extend: {\n      colors: {\n        ${brandObj}\n      },`);
            await fs.writeFile(twPath, tw, 'utf-8');
            updatedThemeFiles.push(path.relative(rootDir, twPath));
          }
        }
      } catch {
        // continue
      }
    }
  }

  return { updatedThemeFiles, palette };
}
