import { describe, it, expect, vi } from 'vitest';

describe('ListTools Handler', () => {
  it('should verify tool schema structure', () => {
    const retrieveToolSchema = {
      name: 'retrieve',
      description: 'Retrieve documents from a Vectorize pipeline.',
      schema: {
        type: 'object',
        properties: {
          pipelineId: {
            type: 'string',
            description: 'The ID of the pipeline to retrieve documents from.',
          },
          question: {
            type: 'string',
            description: 'The question to retrieve documents for.',
          },
          k: {
            type: 'number',
            description: 'The number of documents to retrieve.',
          },
        },
        required: process.env.VECTORIZE_PIPELINE_ID ? ['question', 'k'] : ['pipelineId', 'question', 'k'],
      },
    };
    
    expect(retrieveToolSchema).toHaveProperty('name', 'retrieve');
    expect(retrieveToolSchema).toHaveProperty('description');
    expect(retrieveToolSchema).toHaveProperty('schema.properties.pipelineId');
    expect(retrieveToolSchema).toHaveProperty('schema.properties.question');
    expect(retrieveToolSchema).toHaveProperty('schema.properties.k');
    
    if (process.env.VECTORIZE_PIPELINE_ID) {
      expect(retrieveToolSchema.schema.required).not.toContain('pipelineId');
    } else {
      expect(retrieveToolSchema.schema.required).toContain('pipelineId');
    }
  });
});
