import { describe, it, expect } from 'vitest';
import { computeUnifiedDiff, renderTerminalDiff } from '../src/core/diff/diffInspector.js';

describe('Unified Diff & Inspection Engine', () => {
  it('should compute accurate unified diff patches', () => {
    const oldCode = `const name = "ChatPilot";\nconst port = 3000;`;
    const newCode = `const name = "OmniDesk";\nconst port = 3000;`;

    const diff = computeUnifiedDiff('server.js', oldCode, newCode);
    expect(diff).not.toBeNull();
    expect(diff?.additions).toBe(1);
    expect(diff?.deletions).toBe(1);
    expect(diff?.patch).toContain('-const name = "ChatPilot";');
    expect(diff?.patch).toContain('+const name = "OmniDesk";');

    const rendered = renderTerminalDiff(diff!);
    expect(rendered).toContain('server.js');
  });

  it('should return null when contents are identical', () => {
    const code = `const a = 1;`;
    expect(computeUnifiedDiff('test.js', code, code)).toBeNull();
  });
});
