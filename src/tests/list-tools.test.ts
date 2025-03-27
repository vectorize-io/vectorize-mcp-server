import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetTestEnvironment } from './setup.js';

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    sendLoggingMessage: vi.fn(),
    setRequestHandler: vi.fn((schema, handler) => {
      if (schema.name === 'list_tools') {
        vi.stubGlobal('listToolsHandler', handler);
      }
    }),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

import '../index.js';

describe('ListTools Handler', () => {
  beforeEach(() => {
    resetTestEnvironment();
  });
  it('should return all three tools', async () => {
    const handler = vi.fn((global as any).listToolsHandler);
    
    const result = await handler({});
    
    expect(result).toHaveProperty('tools');
    expect(result.tools).toHaveLength(3);
    
    const toolNames = result.tools.map((tool: any) => tool.name);
    expect(toolNames).toContain('retrieve');
    expect(toolNames).toContain('extract');
    expect(toolNames).toContain('deep-research');
  });
});
