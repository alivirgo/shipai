import { describe, it, expect } from 'vitest';
import { buildCasingMatrix } from '../src/core/rebrand/casingMatrix.js';

describe('Casing Matrix Generator', () => {
  it('should generate all casing variations correctly', () => {
    const matrix = buildCasingMatrix('ChatPilot', 'OmniDesk');

    expect(matrix.sourceName).toBe('ChatPilot');
    expect(matrix.targetName).toBe('OmniDesk');

    const pairTypes = matrix.pairs.map(p => p.type);
    expect(pairTypes).toContain('PascalCase');
    expect(pairTypes).toContain('camelCase');
    expect(pairTypes).toContain('kebab-case');
    expect(pairTypes).toContain('snake_case');
    expect(pairTypes).toContain('CONSTANT_CASE');
    expect(pairTypes).toContain('Title Case');

    const kebab = matrix.pairs.find(p => p.type === 'kebab-case');
    expect(kebab?.source).toBe('chat-pilot');
    expect(kebab?.target).toBe('omni-desk');

    const constant = matrix.pairs.find(p => p.type === 'CONSTANT_CASE');
    expect(constant?.source).toBe('CHAT_PILOT');
    expect(constant?.target).toBe('OMNI_DESK');

    const camel = matrix.pairs.find(p => p.type === 'camelCase');
    expect(camel?.source).toBe('chatPilot');
    expect(camel?.target).toBe('omniDesk');
  });

  it('should handle hyphenated and spaced source names', () => {
    const matrix = buildCasingMatrix('my-cool-agent', 'acme-copilot');
    const pascal = matrix.pairs.find(p => p.type === 'PascalCase');
    expect(pascal?.source).toBe('MyCoolAgent');
    expect(pascal?.target).toBe('AcmeCopilot');
  });
});
