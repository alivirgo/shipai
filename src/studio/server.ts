import http from 'http';
import path from 'path';
import { auditProject } from '../core/audit/projectAuditor.js';
import { sanitizeProject } from '../core/sanitize/aiResidueCleaner.js';
import { replaceProjectText } from '../core/rebrand/textReplacer.js';
import { renameProjectFiles } from '../core/rebrand/fileRenamer.js';
import { updateProjectMetadata } from '../core/rebrand/metadataUpdater.js';
import { generateBrandAssets } from '../core/rebrand/assetGenerator.js';
import { applyClientTheme, generateColorPalette } from '../core/rebrand/themeEngine.js';
import { detectFramework } from '../core/pack/frameworkDetector.js';
import { generateDockerConfigs } from '../core/pack/dockerGenerator.js';
import { generateProductionProxy } from '../core/pack/proxyGenerator.js';
import { generateCostGuardrails } from '../core/pack/guardrailGenerator.js';
import { generateCloudManifests } from '../core/pack/cloudManifests.js';
import { generateEnvExample } from '../core/pack/envExampleGenerator.js';
import { generateCicdWorkflows } from '../core/pack/cicdGenerator.js';
import { generateBespokeDocSuite } from '../core/pack/bespokeDocSuite.js';
import { getStudioHtml } from './studioHtml.js';

export interface StudioOptions {
  port?: number;
  rootDir?: string;
}

export function startStudioServer(options: StudioOptions = {}): Promise<{ server: http.Server; url: string }> {
  const port = options.port || 4488;
  const rootDir = path.resolve(options.rootDir || process.cwd());

  const server = http.createServer(async (req, res) => {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const url = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);

    // Helper for JSON response
    const sendJson = (data: any, status = 200) => {
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(data));
    };

    // Helper for parsing JSON body
    const parseBody = (): Promise<any> => {
      return new Promise((resolve) => {
        let body = '';
        req.on('data', chunk => { body += chunk; });
        req.on('end', () => {
          try {
            resolve(body ? JSON.parse(body) : {});
          } catch {
            resolve({});
          }
        });
      });
    };

    try {
      // 1. Audit API
      if (url.pathname === '/api/audit' && req.method === 'GET') {
        const report = await auditProject(rootDir);
        const framework = await detectFramework(rootDir);
        sendJson({ success: true, report, framework });
        return;
      }

      // 1b. Cost & OpEx API
      if (url.pathname === '/api/cost' && req.method === 'GET') {
        const { calculateAiProjectCost } = await import('../core/finance/costCalculator.js');
        const footprint = await calculateAiProjectCost(rootDir);
        sendJson({ success: true, footprint });
        return;
      }

      // 1c. Verification & Diagnostics API
      if ((url.pathname === '/api/verify' || url.pathname === '/api/diagnose') && req.method === 'GET') {
        const { runPreShipVerification } = await import('../core/verify/smokeTestRunner.js');
        const verification = await runPreShipVerification(rootDir);
        sendJson({ success: true, verification });
        return;
      }

      // 2. Palette Preview API
      if (url.pathname === '/api/palette' && req.method === 'GET') {
        const hex = url.searchParams.get('color') || '#4f46e5';
        const palette = generateColorPalette(hex);
        sendJson({ success: true, palette });
        return;
      }

      // 3. Sanitize API with deep AI slop removal
      if (url.pathname === '/api/sanitize' && req.method === 'POST') {
        const result = await sanitizeProject({ rootDir, cleanAiSlop: true });
        sendJson({ success: true, result });
        return;
      }

      // 4. Rebrand API
      if (url.pathname === '/api/rebrand' && req.method === 'POST') {
        const body = await parseBody();
        const { from, to, client, color, url: siteUrl } = body;

        const textResult = await replaceProjectText({ rootDir, sourceName: from, targetName: to });
        const metaResult = await updateProjectMetadata({ rootDir, projectName: to, clientName: client, websiteUrl: siteUrl, brandColor: color });
        const renameResult = await renameProjectFiles(rootDir, from, to);
        const assetResult = await generateBrandAssets({ rootDir, projectName: to, clientName: client, brandColor: color });
        const themeResult = await applyClientTheme(rootDir, color || '#4f46e5');

        sendJson({
          success: true,
          textResult,
          metaResult,
          renameResult,
          assetResult,
          themeResult
        });
        return;
      }

      // 5. Pack API
      if (url.pathname === '/api/pack' && req.method === 'POST') {
        const body = await parseBody();
        const { name, client, color } = body;
        const frameworkInfo = await detectFramework(rootDir);

        const docker = await generateDockerConfigs(rootDir, frameworkInfo, (name || 'app').toLowerCase());
        const proxy = await generateProductionProxy(rootDir, frameworkInfo.port);
        const guardrails = await generateCostGuardrails(rootDir, frameworkInfo.isTypeScript);
        const cloud = await generateCloudManifests(rootDir, frameworkInfo, name || 'app');
        const env = await generateEnvExample(rootDir, name || 'app');
        const cicd = await generateCicdWorkflows(rootDir, frameworkInfo, (name || 'app').toLowerCase());
        const docs = await generateBespokeDocSuite({
          rootDir,
          projectName: name || 'app',
          clientName: client || name,
          frameworkInfo,
          brandColor: color || '#4f46e5'
        });

        sendJson({
          success: true,
          framework: frameworkInfo,
          docker,
          proxy,
          guardrails,
          cloud,
          env,
          cicd,
          docs
        });
        return;
      }

      // 6. Complete One-Click Ship API
      if (url.pathname === '/api/ship' && req.method === 'POST') {
        const body = await parseBody();
        const { from, to, client, color, url: siteUrl } = body;

        // Step 1: Sanitize
        const sanitizeResult = await sanitizeProject({ rootDir });

        // Step 2: Rebrand
        const textResult = await replaceProjectText({ rootDir, sourceName: from, targetName: to });
        const metaResult = await updateProjectMetadata({ rootDir, projectName: to, clientName: client, websiteUrl: siteUrl, brandColor: color });
        const renameResult = await renameProjectFiles(rootDir, from, to);
        const assetResult = await generateBrandAssets({ rootDir, projectName: to, clientName: client, brandColor: color });
        const themeResult = await applyClientTheme(rootDir, color || '#4f46e5');

        // Step 3: Pack
        const frameworkInfo = await detectFramework(rootDir);
        const docker = await generateDockerConfigs(rootDir, frameworkInfo, to.toLowerCase());
        const proxy = await generateProductionProxy(rootDir, frameworkInfo.port);
        const guardrails = await generateCostGuardrails(rootDir, frameworkInfo.isTypeScript);
        const cloud = await generateCloudManifests(rootDir, frameworkInfo, to);
        const env = await generateEnvExample(rootDir, to);
        const cicd = await generateCicdWorkflows(rootDir, frameworkInfo, to.toLowerCase());
        const docs = await generateBespokeDocSuite({
          rootDir,
          projectName: to,
          clientName: client,
          frameworkInfo,
          brandColor: color
        });

        // Step 4: Final verification audit
        const finalAudit = await auditProject(rootDir);

        sendJson({
          success: true,
          sanitizeResult,
          rebrand: { textResult, metaResult, renameResult, assetResult, themeResult },
          pack: { docker, proxy, guardrails, cloud, env, cicd, docs },
          finalAudit
        });
        return;
      }

      // 7. Serve Dashboard Web Application
      if (url.pathname === '/' || url.pathname === '/index.html') {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(getStudioHtml(rootDir, port));
        return;
      }

      // 404 fallback
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    } catch (err: any) {
      sendJson({ success: false, error: err.message }, 500);
    }
  });

  return new Promise((resolve) => {
    server.listen(port, () => {
      resolve({ server, url: `http://localhost:${port}` });
    });
  });
}
