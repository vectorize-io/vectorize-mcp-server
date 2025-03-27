import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { Configuration, PipelinesApi, ExtractionApi, FilesApi } from '@vectorize-io/vectorize-client';
import dotenv from 'dotenv';
import PQueue from 'p-queue';

dotenv.config();

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

const extractToolSchema = {
  name: 'extract',
  description: 'Extract text from a document.',
  schema: {
    type: 'object',
    properties: {
      base64Document: {
        type: 'string',
        description: 'The base64-encoded document to extract text from.',
      },
      contentType: {
        type: 'string',
        description: 'The content type of the document.',
      },
    },
    required: ['base64Document', 'contentType'],
  },
};

const deepResearchToolSchema = {
  name: 'deep-research',
  description: 'Perform deep research on a query.',
  schema: {
    type: 'object',
    properties: {
      pipelineId: {
        type: 'string',
        description: 'The ID of the pipeline to perform deep research with.',
      },
      query: {
        type: 'string',
        description: 'The query to perform deep research on.',
      },
      webSearch: {
        type: 'boolean',
        description: 'Whether to perform a web search.',
      },
    },
    required: process.env.VECTORIZE_PIPELINE_ID ? ['query', 'webSearch'] : ['pipelineId', 'query', 'webSearch'],
  },
};

const VECTORIZE_ORG_ID = process.env.VECTORIZE_ORG_ID;
const VECTORIZE_TOKEN = process.env.VECTORIZE_TOKEN;
const VECTORIZE_PIPELINE_ID = process.env.VECTORIZE_PIPELINE_ID;

if (!VECTORIZE_ORG_ID || !VECTORIZE_TOKEN) {
  console.error(
    'Error: VECTORIZE_TOKEN and VECTORIZE_ORG_ID environment variable are required'
  );
  if (process.env.NODE_ENV !== 'test') {
    process.exit(1);
  }
}

const vectorizeApi = new Configuration({
  accessToken: VECTORIZE_TOKEN,
});

const pipelinesApi = new PipelinesApi(vectorizeApi);
const extractionApi = new ExtractionApi(vectorizeApi);
const filesApi = new FilesApi(vectorizeApi);

const deepResearchQueue = new PQueue({ concurrency: 1 });

async function performRetrieval(
  orgId: string,
  pipelineId: string,
  question: string,
  k: number
) {
  try {
    const response = await pipelinesApi.retrieveDocuments(
      orgId,
      pipelineId,
      {
        query: question,
        k,
      }
    );

    return {
      content: JSON.stringify(response.results),
      isError: false,
    };
  } catch (error: any) {
    return {
      content: `Error retrieving documents: ${error.message}`,
      isError: true,
    };
  }
}

async function performExtraction(
  orgId: string,
  base64Document: string,
  contentType: string
) {
  try {
    const startResponse = await extractionApi.startExtraction(orgId, {
      base64Document,
      contentType,
    });

    const extractionId = startResponse.extractionId;

    let ready = false;
    let result;
    while (!ready) {
      const resultResponse = await extractionApi.getExtractionResult(
        orgId,
        extractionId
      );
      ready = resultResponse.ready;
      if (ready) {
        result = resultResponse.data;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      content: JSON.stringify(result),
      isError: false,
    };
  } catch (error: any) {
    return {
      content: `Error extracting text: ${error.message}`,
      isError: true,
    };
  }
}

async function performDeepResearch(
  orgId: string,
  pipelineId: string,
  query: string,
  webSearch: boolean
) {
  try {
    const startResponse = await pipelinesApi.startDeepResearch(
      orgId,
      pipelineId,
      {
        query,
        webSearch,
      }
    );

    const researchId = startResponse.researchId;

    let ready = false;
    let result;
    while (!ready) {
      const resultResponse = await pipelinesApi.getDeepResearchResult(
        orgId,
        researchId
      );
      ready = resultResponse.ready;
      if (ready) {
        result = resultResponse.data;
      } else {
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
    }

    return {
      content: result.markdown,
      isError: false,
    };
  } catch (error: any) {
    return {
      content: `Error performing deep research: ${error.message}`,
      isError: true,
    };
  }
}

export async function startServer() {
  const server = new Server(new StdioServerTransport());

  await server.connect();

  server.setRequestHandler(
    {
      name: 'list_tools',
      schema: {
        type: 'object',
        properties: {},
      },
    },
    async () => {
      return {
        tools: [retrieveToolSchema, extractToolSchema, deepResearchToolSchema],
      };
    }
  );

  server.setRequestHandler(
    {
      name: 'call_tool',
      schema: {
        type: 'object',
        properties: {
          name: {
            type: 'string',
          },
          arguments: {
            type: 'object',
          },
        },
        required: ['name', 'arguments'],
      },
    },
    async (request) => {
      const { name, arguments: args } = request.params;

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
        default: {
          throw new Error(`Tool not found: ${name}`);
        }
      }
    }
  );

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
  
  return server;
}

if (process.env.NODE_ENV !== 'test') {
  startServer();
}
