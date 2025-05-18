//evals.ts

import { EvalConfig } from 'mcp-evals';
import { openai } from "@ai-sdk/openai";
import { grade, EvalFunction } from "mcp-evals";

const retrieveEval: EvalFunction = {
    name: 'retrieveEval',
    description: 'Evaluates retrieving documents from the pipeline',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Retrieve 4 documents about best practices for large language models.");
        return JSON.parse(result);
    }
};

const deepResearchEval: EvalFunction = {
    name: 'Deep Research Tool Evaluation',
    description: 'Evaluates the functionality of the deep research tool',
    run: async () => {
        const result = await grade(openai("gpt-4"), "Perform a deep research on the impact of microplastics in oceans and provide references. Use web search if necessary.");
        return JSON.parse(result);
    }
};

const extractEval: EvalFunction = {
    name: 'extract tool evaluation',
    description: 'Evaluates the text extraction and chunking functionality of the extract tool',
    run: async () => {
        const prompt = "Please extract the text from the following base64-encoded document: dGVzdCBkYXRh. The content type is application/pdf. Provide the extracted text.";
        const result = await grade(openai("gpt-4"), prompt);
        return JSON.parse(result);
    }
};

const config: EvalConfig = {
    model: openai("gpt-4"),
    evals: [retrieveEval, deepResearchEval, extractEval]
};
  
export default config;
  
export const evals = [retrieveEval, deepResearchEval, extractEval];