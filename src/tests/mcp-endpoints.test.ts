import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetTestEnvironment } from './setup.js';

import { Configuration, ExtractionApi, FilesApi, PipelinesApi } from '@vectorize-io/vectorize-client';

// Mock the Vectorize client
vi.mock('@vectorize-io/vectorize-client', () => {
  return {
    Configuration: vi.fn(),
    PipelinesApi: vi.fn(() => ({
      retrieveDocuments: vi.fn().mockResolvedValue({ results: [] }),
      startDeepResearch: vi.fn().mockResolvedValue({ researchId: 'test-id' }),
      getDeepResearchResult: vi.fn().mockResolvedValue({ 
        ready: true, 
        data: { success: true, markdown: 'test markdown' } 
      }),
    })),
    ExtractionApi: vi.fn(() => ({
      startExtraction: vi.fn().mockResolvedValue({ extractionId: 'test-id' }),
      getExtractionResult: vi.fn().mockResolvedValue({ 
        ready: true, 
        data: { success: true, chunks: [] } 
      }),
    })),
    FilesApi: vi.fn(() => ({
      startFileUpload: vi.fn().mockResolvedValue({ 
        fileId: 'test-file-id',
        uploadUrl: 'https://example.com/upload'
      }),
    })),
  };
});

// Mock fetch
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  statusText: 'OK',
});

vi.mock('@modelcontextprotocol/sdk/server/index.js', () => ({
  Server: vi.fn().mockImplementation(() => ({
    connect: vi.fn(),
    sendLoggingMessage: vi.fn(),
    setRequestHandler: vi.fn((schema, handler) => {
      if (schema.name === 'call_tool') {
        vi.stubGlobal('callToolHandler', handler);
      } else if (schema.name === 'list_tools') {
        vi.stubGlobal('listToolsHandler', handler);
      }
    }),
  })),
}));

vi.mock('@modelcontextprotocol/sdk/server/stdio.js', () => ({
  StdioServerTransport: vi.fn(),
}));

process.env.NODE_ENV = 'test';

import '../tests/index-test.js';

describe('MCP Endpoints', () => {
  // Setup environment variables for testing
  beforeEach(() => {
    resetTestEnvironment();
  });

  describe('retrieve endpoint', () => {
    it('should handle retrieve requests with pipelineId parameter', async () => {
      const handler = vi.fn((global as any).callToolHandler);
      
      const result = await handler({
        params: {
          name: 'retrieve',
          arguments: {
            pipelineId: 'test-pipeline',
            question: 'test question',
            k: 5
          }
        }
      });
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
    });

    it('should handle retrieve requests with VECTORIZE_PIPELINE_ID env var', async () => {
      process.env.VECTORIZE_PIPELINE_ID = 'env-pipeline-id';
      
      const handler = vi.fn((global as any).callToolHandler);
      
      const result = await handler({
        params: {
          name: 'retrieve',
          arguments: {
            question: 'test question',
            k: 5
          }
        }
      });
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
      
      delete process.env.VECTORIZE_PIPELINE_ID;
    });
  });

  describe('extract endpoint', () => {
    it('should handle extract requests', async () => {
      const handler = vi.fn((global as any).callToolHandler);
      
      const result = await handler({
        params: {
          name: 'extract',
          arguments: {
            base64Document: 'dGVzdCBkb2N1bWVudA==', // "test document" in base64
            contentType: 'text/plain'
          }
        }
      });
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
    });
  });

  describe('deep-research endpoint', () => {
    it('should handle deep-research requests with pipelineId parameter', async () => {
      const handler = vi.fn((global as any).callToolHandler);
      
      const result = await handler({
        params: {
          name: 'deep-research',
          arguments: {
            pipelineId: 'test-pipeline',
            query: 'test query',
            webSearch: true
          }
        }
      });
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
    });

    it('should handle deep-research requests with VECTORIZE_PIPELINE_ID env var', async () => {
      process.env.VECTORIZE_PIPELINE_ID = 'env-pipeline-id';
      
      const handler = vi.fn((global as any).callToolHandler);
      
      const result = await handler({
        params: {
          name: 'deep-research',
          arguments: {
            query: 'test query',
            webSearch: true
          }
        }
      });
      
      expect(result).toHaveProperty('content');
      expect(result).toHaveProperty('isError', false);
      
      delete process.env.VECTORIZE_PIPELINE_ID;
    });
  });

  describe('error handling', () => {
    it('should handle unknown tool errors', async () => {
      const handler = vi.fn((global as any).callToolHandler);
      
      await expect(handler({
        params: {
          name: 'unknown-tool',
          arguments: {}
        }
      })).rejects.toThrow('Tool not found');
    });
  });
});
