import { describe, it, expect, afterAll } from 'vitest';
import http from 'http';
import { startStudioServer } from '../src/studio/server.js';

describe('ShipAI Local Web Studio', () => {
  let serverInstance: http.Server;
  const TEST_PORT = 4499;

  afterAll(() => {
    if (serverInstance) {
      serverInstance.close();
    }
  });

  it('should start HTTP studio server and serve dashboard HTML', async () => {
    const { server, url } = await startStudioServer({ port: TEST_PORT, rootDir: process.cwd() });
    serverInstance = server;
    expect(url).toBe(`http://localhost:${TEST_PORT}`);

    // Request HTML root
    const htmlResponse = await fetch(`http://localhost:${TEST_PORT}/`);
    expect(htmlResponse.status).toBe(200);
    const html = await htmlResponse.text();
    expect(html).toContain('ShipAI Studio');
    expect(html).toContain('Forensic Ship-Readiness Score');

    // Request Audit API
    const apiResponse = await fetch(`http://localhost:${TEST_PORT}/api/audit`);
    expect(apiResponse.status).toBe(200);
    const data = await apiResponse.json();
    expect(data.success).toBe(true);
    expect(data.report).toBeDefined();
    expect(data.framework).toBeDefined();

    // Request Palette API
    const paletteRes = await fetch(`http://localhost:${TEST_PORT}/api/palette?color=%2310b981`);
    expect(paletteRes.status).toBe(200);
    const paletteData = await paletteRes.json();
    expect(paletteData.palette[500]).toBe('#10b981');
  });
});
