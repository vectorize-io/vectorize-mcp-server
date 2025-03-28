# Vectorize MCP Server

A Model Context Protocol (MCP) server implementation that integrates with [Vectorize](https://vectorize.io/) for advanced Vector retrieval and text extraction.

<a href="https://glama.ai/mcp/servers/pxwbgk0kzr">
  <img width="380" height="200" src="https://glama.ai/mcp/servers/pxwbgk0kzr/badge" alt="Vectorize MCP server" />
</a>


## Installation

### Running with npx

```bash
export VECTORIZE_ORG_ID=YOUR_ORG_ID
export VECTORIZE_TOKEN=YOUR_TOKEN
export VECTORIZE_PIPELINE_ID=YOUR_PIPELINE_ID

npx -y @vectorize-io/vectorize-mcp-server@latest
```

## Configuration on Claude/Windsurf/Cursor/Cline

```json
{
  "mcpServers": {
    "vectorize": {
      "command": "npx",
      "args": ["-y", "@vectorize-io/vectorize-mcp-server@latest"],
      "env": {
        "VECTORIZE_ORG_ID": "your-org-id",
        "VECTORIZE_TOKEN": "your-token",
        "VECTORIZE_PIPELINE_ID": "your-pipeline-id"
      }
    }
  }
}
```

## Tools

### Retrieve documents

Perform vector search and retrieve documents (see official [API](https://docs.vectorize.io/api/api-pipelines/api-retrieval)):

```json
{
  "name": "retrieve",
  "arguments": {
    "question": "Financial health of the company",
    "k": 5
  }
}
```

### Text extraction and chunking (Any file to Markdown)

Extract text from a document and chunk it into Markdown format (see official [API](https://docs.vectorize.io/api/api-extraction)):

```json
{
  "name": "extract",
  "arguments": {
    "base64document": "base64-encoded-document",
    "contentType": "application/pdf"
  }
}
```

### Deep Research

Generate a Private Deep Research from your pipeline (see official [API](https://docs.vectorize.io/api/api-pipelines/api-deep-research)):

```json
{
  "name": "deep-research",
  "arguments": {
    "query": "Generate a financial status report about the company",
    "webSearch": true
  }
}
```

## Development

```bash
npm install
npm run dev
```

### Contributing

1. Fork the repository
2. Create your feature branch
3. Submit a pull request
