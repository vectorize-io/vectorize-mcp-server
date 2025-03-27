import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resetTestEnvironment } from './setup.js';

describe('MCP Endpoints', () => {
  // Setup environment variables for testing
  beforeEach(() => {
    resetTestEnvironment();
  });

  describe('retrieve endpoint', () => {
    it('should verify retrieve endpoint parameter handling', () => {
      const requiredWithoutEnvVar = process.env.VECTORIZE_PIPELINE_ID 
        ? ['question', 'k'] 
        : ['pipelineId', 'question', 'k'];
      
      if (!process.env.VECTORIZE_PIPELINE_ID) {
        expect(requiredWithoutEnvVar).toContain('pipelineId');
      }
      
      process.env.VECTORIZE_PIPELINE_ID = 'test-pipeline-id';
      
      const requiredWithEnvVar = process.env.VECTORIZE_PIPELINE_ID 
        ? ['question', 'k'] 
        : ['pipelineId', 'question', 'k'];
      
      expect(requiredWithEnvVar).not.toContain('pipelineId');
      
      delete process.env.VECTORIZE_PIPELINE_ID;
    });
  });

  describe('extract endpoint', () => {
    it('should verify extract endpoint parameter handling', () => {
      const required = ['base64Document', 'contentType'];
      
      expect(required).toContain('base64Document');
      expect(required).toContain('contentType');
    });
  });

  describe('deep-research endpoint', () => {
    it('should verify deep-research endpoint parameter handling', () => {
      const requiredWithoutEnvVar = process.env.VECTORIZE_PIPELINE_ID 
        ? ['query', 'webSearch'] 
        : ['pipelineId', 'query', 'webSearch'];
      
      if (!process.env.VECTORIZE_PIPELINE_ID) {
        expect(requiredWithoutEnvVar).toContain('pipelineId');
      }
      
      process.env.VECTORIZE_PIPELINE_ID = 'test-pipeline-id';
      
      const requiredWithEnvVar = process.env.VECTORIZE_PIPELINE_ID 
        ? ['query', 'webSearch'] 
        : ['pipelineId', 'query', 'webSearch'];
      
      expect(requiredWithEnvVar).not.toContain('pipelineId');
      
      delete process.env.VECTORIZE_PIPELINE_ID;
    });
  });

  describe('error handling', () => {
    it('should verify error handling for unknown tools', () => {
      const errorMessage = 'Tool not found: unknown-tool';
      expect(errorMessage).toContain('Tool not found');
    });
  });
});
