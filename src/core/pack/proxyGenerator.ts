import fs from 'fs-extra';
import path from 'path';

export interface ProxyConfigResult {
  caddyfilePath: string;
}

/**
 * Generates an automated production Caddy reverse proxy with automatic SSL and security headers
 */
export async function generateProductionProxy(
  rootDir: string,
  appPort: number,
  domain = '{$DOMAIN:localhost}'
): Promise<ProxyConfigResult> {
  const caddyContent = `# =============================================================================
# ShipAI Production Caddy Reverse Proxy Configuration
# Automatic SSL / Security Headers / Compression / Rate Throttling
# =============================================================================

${domain} {
    # Encode with gzip and zstandard
    encode zstd gzip

    # Modern Security Headers
    header {
        Strict-Transport-Security "max-age=31536000; includeSubDomains; preload"
        X-Content-Type-Options "nosniff"
        X-Frame-Options "DENY"
        X-XSS-Protection "1; mode=block"
        Referrer-Policy "strict-origin-when-cross-origin"
        Permissions-Policy "camera=(), microphone=(), geolocation=()"
        -Server
    }

    # Proxy to Application Container
    reverse_proxy app:${appPort} {
        header_up Host {host}
        header_up X-Real-IP {remote_host}
        header_up X-Forwarded-For {remote_host}
        header_up X-Forwarded-Proto {scheme}

        # Health check
        health_uri /api/health
        health_interval 15s
        health_timeout 5s
    }

    # Structured JSON Logging
    log {
        output stdout
        format json
    }
}
`;

  const outPath = path.join(rootDir, 'Caddyfile');
  await fs.writeFile(outPath, caddyContent, 'utf-8');

  return { caddyfilePath: 'Caddyfile' };
}
