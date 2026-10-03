import { describe, it, expect } from 'vitest';
import { calculateShannonEntropy, scanContentEntropy } from '../src/core/audit/entropyScanner.js';

describe('Shannon Entropy Scanner', () => {
  it('should compute low entropy for repetitive text', () => {
    const low = calculateShannonEntropy('aaaaaaaaaaaaaaaaaaaaaaaaaa');
    expect(low).toBe(0);

    const english = calculateShannonEntropy('function processClientOrder(orderId, clientAccount)');
    expect(english).toBeLessThan(4.2);
  });

  it('should compute high entropy for cryptographic tokens', () => {
    const randomSecret = 'eK9#mP2$vL7!qR4*zX1&wY8^';
    const high = calculateShannonEntropy(randomSecret);
    expect(high).toBeGreaterThan(4.2);
  });

  it('should detect private keys in source content', () => {
    const sample = `
      const header = "-----BEGIN RSA PRIVATE KEY-----";
      const keyData = "MIIEowIBAAKCAQEA0Y7...";
    `;
    const findings = scanContentEntropy(sample);
    expect(findings.some(f => f.type === 'Private Key Certificate')).toBe(true);
  });
});
