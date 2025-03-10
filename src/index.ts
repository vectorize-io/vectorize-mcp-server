#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import dotenv from 'dotenv';
import { Configuration, PipelinesApi } from '@vectorize-io/vectorize-client';

dotenv.config();

// Tool definitions
const RETRIEVAL_TOOL: Tool = {
  name: 'vectorize_retrieve',
  description:
    "Retrieve documents from a Vectorize pipeline.",
  inputSchema: {
    type: 'object',
    properties: {
      pipelineId: {
        type: 'string',
        description: 'The pipeline ID to retrieve documents from.',
      },
    },
    required: ['pipelineId'],
  },
};

// Server implementation
const server = new Server(
  {
    name: 'vectorize-mcp',
    version: '0.0.1',
  },
  {
    capabilities: {
      tools: {},
      logging: {},
    },
  }
);

// Get optional API URL
const VECTORIZE_ORG_ID = process.env.VECTORIZE_ORG_ID;
const VECTORIZE_API_KEY = process.env.VECTORIZE_API_KEY;





// Check if API key is required (only for cloud service)
if (!VECTORIZE_ORG_ID || !VECTORIZE_API_KEY) {
  console.error(
    'Error: VECTORIZE_API_KEY and VECTORIZE_ORG_ID environment variable are required'
  );
  process.exit(1);
}
const vectorizeApi = new Configuration({
  accessToken: VECTORIZE_API_KEY
});

// Tool handlers
server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    RETRIEVAL_TOOL,
      ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const startTime = Date.now();
  try {
    const { name, arguments: args } = request.params;

    // Log incoming request with timestamp
    server.sendLoggingMessage({
      level: 'info',
      data: `[${new Date().toISOString()}] Received request for tool: ${name}`,
    });

    if (!args) {
      throw new Error('No arguments provided');
    }

    switch (name) {
      case 'vectorize_retrieve': {
        const { pipelineId, question, k } = args;
        try {
          let pipelinesApi = new PipelinesApi(vectorizeApi);
          let response = await pipelinesApi.retrieveDocuments({
            organization: VECTORIZE_ORG_ID,
            pipelineId: pipelineId + "",
            retrieveDocumentsRequest: {
              question: question + "",
              numResults: Number(k)
            }
          });

          return {
            content: [
              { type: 'text', text: JSON.stringify(response) },
            ],
            isError: false,
          };
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : String(error);
          return {
            content: [{ type: 'text', text: errorMessage }],
            isError: true,
          };
        }
      }
      default:
        return {
          content: [{ type: 'text', text: `Unknown tool: ${name}` }],
          isError: true,
        };
    }
  } catch (error) {
    // Log detailed error information
    server.sendLoggingMessage({
      level: 'error',
      data: {
        message: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool: request.params.name,
        arguments: request.params.arguments,
        timestamp: new Date().toISOString(),
        duration: Date.now() - startTime,
      },
    });
    return {
      content: [
        {
          type: 'text',
          text: `Error: ${
            error instanceof Error ? error.message : String(error)
          }`,
        },
      ],
      isError: true,
    };
  } finally {
    // Log request completion with performance metrics
    server.sendLoggingMessage({
      level: 'info',
      data: `Request completed in ${Date.now() - startTime}ms`,
    });
  }
});

// Server startup
async function runServer() {
  try {
    console.error('Initializing Vectorize MCP Server...');

    const transport = new StdioServerTransport();
    await server.connect(transport);

    // Now that we're connected, we can send logging messages
    server.sendLoggingMessage({
      level: 'info',
      data: 'Vectorize MCP Server initialized successfully',
    });

    server.sendLoggingMessage({
      level: 'info',
      data: `Configuration: Organization ID: ${VECTORIZE_ORG_ID || 'default'}`,
    });

    console.error('FireCrawl MCP Server running on stdio');
  } catch (error) {
    console.error('Fatal error running server:', error);
    process.exit(1);
  }
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});

