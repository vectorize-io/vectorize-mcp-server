#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  Tool,
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import dotenv from 'dotenv';
import { Configuration, ExtractionApi, FilesApi, PipelinesApi } from '@vectorize-io/vectorize-client';

dotenv.config();

const RETRIEVAL_TOOL: Tool = {
  name: 'retrieve',
  description: 'Retrieve documents from a Vectorize pipeline.',
  inputSchema: {
    type: 'object',
    properties: {

      question: {
        type: 'string',
        description: 'The term to search for.',
      },
      k: {
        type: 'number',
        description: 'The number of documents to retrieve.',
      },
      pipelineId: {
        type: 'string',
        description: 'The pipeline ID to retrieve documents from. If not specified explicitly, the value of VECTORIZE_PIPELINE_ID environment variable will be used.',
      },
    },
    required: process.env.VECTORIZE_PIPELINE_ID ? ['question', 'k'] : ['pipelineId', 'question', 'k'],
  },
};


const DEEP_RESEARCH_TOOL: Tool = {
  name: 'deep-research',
  description: 'Generate a deep research on a Vectorize pipeline.',
  inputSchema: {
    type: 'object',
    properties: {
      pipelineId: {
        type: 'string',
        description: 'The pipeline ID to retrieve documents from. If not specified explicitly, the value of VECTORIZE_PIPELINE_ID environment variable will be used.',
      },
      query: {
        type: 'string',
        description: 'The deep research query.',
      },
      webSearch: {
        type: 'boolean',
        description: 'Whether to perform a web search.',
      },
    },
    required: process.env.VECTORIZE_PIPELINE_ID ? ['query', 'webSearch'] : ['pipelineId', 'query', 'webSearch'],
  },
};

const EXTRACTION_TOOL: Tool = {
  name: 'extract',
  description: 'Perform text extraction and chunking on a document.',
  inputSchema: {
    type: 'object',
    properties: {
      base64Document: {
        type: 'string',
        description: 'Document encoded in base64.',
      },
      contentType: {
        type: 'string',
        description: 'Document content type.',
      },

    },
    required: ['base64Document', 'contentType'],
  },
};

// Server implementation
const server = new Server(
  {
    name: 'vectorize-mcp',
    version: '0.1.0',
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
const VECTORIZE_TOKEN = process.env.VECTORIZE_TOKEN;
const VECTORIZE_PIPELINE_ID = process.env.VECTORIZE_PIPELINE_ID;
// Check if API key is required (only for cloud service)
if (!VECTORIZE_ORG_ID || !VECTORIZE_TOKEN) {
  console.error(
    'Error: VECTORIZE_TOKEN and VECTORIZE_ORG_ID environment variable are required'
  );
  process.exit(1);
}
const vectorizeApi = new Configuration({
  accessToken: VECTORIZE_TOKEN,
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [RETRIEVAL_TOOL, EXTRACTION_TOOL, DEEP_RESEARCH_TOOL],
}));

async function performRetrieval(
  orgId: string,
  pipelineId: string,
  question: string,
  k: number
) {
  const pipelinesApi = new PipelinesApi(vectorizeApi);
  const response = await pipelinesApi.retrieveDocuments({
    organization: orgId,
    pipeline: pipelineId + '',
    retrieveDocumentsRequest: {
      question: question + '',
      numResults: k,
    },
  });
  return {
    content: [{ type: 'text', text: JSON.stringify(response) }],
    isError: false,
  };
}


async function performExtraction(
  orgId: string,
  base64Document: string,
  contentType: string
) {
  const filesApi = new FilesApi(vectorizeApi);
  const startResponse = await filesApi.startFileUpload({
    organization: orgId,
    startFileUploadRequest: {
      name: "My File",
      contentType
    }
  });

  const fileBuffer = Buffer.from(base64Document, 'base64');
  const fetchResponse = await fetch(startResponse.uploadUrl, {
    method: 'PUT',
    body: fileBuffer,
    headers: {
      'Content-Type': contentType
    },
  });
  if (!fetchResponse.ok) {
    throw new Error(`Failed to upload file: ${fetchResponse.statusText}`);
  }

  const extractionApi = new ExtractionApi(vectorizeApi);
  const response = await extractionApi.startExtraction({
    organization: orgId,
    startExtractionRequest: {
      fileId: startResponse.fileId,
      chunkSize: 512,
    }
  })
  const extractionId = response.extractionId;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await extractionApi.getExtractionResult({
      organization: orgId,
      extractionId: extractionId,
    })
    if (result.ready) {
      if (result.data?.success) {
        return {
          content: [{ type: 'text', text: JSON.stringify(result.data) }],
          isError: false,
        }
      } else {
        throw new Error(`Extraction failed: ${result.data?.error}`);
      }
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}



async function performDeepResearch(
  orgId: string,
  pipelineId: string,
  query: string,
  webSearch: boolean
) {
  const pipelinesApi = new PipelinesApi(vectorizeApi);
  const response = await pipelinesApi.startDeepResearch({
    organization: orgId,
    pipeline: pipelineId,
    startDeepResearchRequest: {
      query,
      webSearch
    }
  });
  const researchId = response.researchId;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const result = await pipelinesApi.getDeepResearchResult({
      organization: orgId,
      pipeline: pipelineId,
      researchId: researchId
    })
    if (result.ready) {
      if (result.data?.success) {
        return {
          content: [{ type: 'text', text: result.data.markdown }],
          isError: false,
        }
      } else {
        throw new Error(`Deep research failed: ${result.data?.error}`);
      }
      break
    } else {
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }
}


server.setRequestHandler(CallToolRequestSchema, async (request) => {
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
      case 'retrieve': {
        return await performRetrieval(
          VECTORIZE_ORG_ID,
          args.pipelineId ? (args.pipelineId + '') : (VECTORIZE_PIPELINE_ID || ''),
          args.question + '',
          Number(args.k)
        );
      }
      case 'extract': {
        return await performExtraction(
          VECTORIZE_ORG_ID,
          args.base64Document + '',
          args.contentType + ''
        );
      }
      case 'deep-research': {
        return await performDeepResearch(
          VECTORIZE_ORG_ID,
          args.pipelineId ? (args.pipelineId + '') : (VECTORIZE_PIPELINE_ID || ''),
          args.query + '',
          Boolean(args.webSearch)
        );
      }
      default:
        throw new Error(`Tool not found: ${name}`);
    }
  } catch (error) {
    server.sendLoggingMessage({
      level: 'error',
      data: {
        message: `Request failed: ${
          error instanceof Error ? error.message : String(error)
        }`,
        tool: request.params.name,
        arguments: request.params.arguments,
        timestamp: new Date().toISOString(),
      },
    });
    throw error;
  }
});

// Server startup
async function runServer() {
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

  if (VECTORIZE_PIPELINE_ID) {
    server.sendLoggingMessage({
      level: 'info',
      data: `Configuration: Using fixed Pipeline ID: ${VECTORIZE_PIPELINE_ID}`,
    });
  }

  console.error('Vectorize MCP Server running');
}

runServer().catch((error) => {
  console.error('Fatal error running server:', error);
  process.exit(1);
});
