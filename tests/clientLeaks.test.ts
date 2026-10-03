import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'fs-extra';
import path from 'path';
import { scanClientSideLeaks } from '../src/core/audit/clientSideLeakScanner.js';

const TEST_DIR = path.join(process.cwd(), 'tests', 'fixtures', 'client-leak-test');

describe('Client-Side Secret Leak Scanner', () => {
  beforeEach(async () => {
    await fs.ensureDir(TEST_DIR);
    await fs.writeFile(
      path.join(TEST_DIR, 'ClientComponent.tsx'),
      `
      export function ChatWidget() {
        const apiKey = process.env.NEXT_PUBLIC_OPENAI_API_KEY;
        const validAnon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
        return <div>Chat</div>;
      }
      `
    );
  });

  afterEach(async () => {
    await fs.remove(TEST_DIR);
  });

  it('should detect critical public LLM key leaks and allow valid anon keys', async () => {
    const leaks = await scanClientSideLeaks(TEST_DIR);
    expect(leaks.length).toBe(1);
    expect(leaks[0].variableName).toBe('NEXT_PUBLIC_OPENAI_API_KEY');
    expect(leaks[0].reason).toContain('CRITICAL LEAK');
  });
});
