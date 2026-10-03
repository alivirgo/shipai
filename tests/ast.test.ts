import { describe, it, expect } from 'vitest';
import { transformCodeWithAst } from '../src/core/ast/astTransformer.js';
import { buildCasingMatrix } from '../src/core/rebrand/casingMatrix.js';

describe('TypeScript AST Semantic Code Transformer', () => {
  it('should transform TypeScript class and method identifiers without breaking syntax', () => {
    const code = `
export class ChatPilotService {
  private chatPilotApiKey: string;
  constructor(apiKey: string) {
    this.chatPilotApiKey = apiKey;
  }
  public getChatPilotStatus(): boolean {
    return true;
  }
}
`;
    const matrix = buildCasingMatrix('ChatPilot', 'OmniDesk');
    const result = transformCodeWithAst(code, 'src/services/service.ts', matrix);

    expect(result.hasChanges).toBe(true);
    expect(result.transformedCode).toContain('export class OmniDeskService');
    expect(result.transformedCode).toContain('this.omniDeskApiKey = apiKey');
    expect(result.transformedCode).toContain('getOmniDeskStatus(): boolean');
  });

  it('should transform JSX elements and components', () => {
    const code = `
import React from 'react';
export function App() {
  return (
    <div>
      <ChatPilotHeader title="Welcome" />
      <ChatPilotWidget />
    </div>
  );
}
`;
    const matrix = buildCasingMatrix('ChatPilot', 'OmniDesk');
    const result = transformCodeWithAst(code, 'src/components/App.tsx', matrix);

    expect(result.hasChanges).toBe(true);
    expect(result.transformedCode).toContain('<OmniDeskHeader title="Welcome"');
    expect(result.transformedCode).toContain('<OmniDeskWidget />');
  });
});
