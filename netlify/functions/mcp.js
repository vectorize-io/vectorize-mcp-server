const { createHandler } = require('@netlify/functions');
const axios = require('axios');

exports.handler = async (event, context) => {
  // Only allow POST requests for API endpoints
  if (event.httpMethod !== "POST") {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: "Method not allowed" })
    };
  }

  // Check if environment variables are properly set
  const requiredEnvVars = [
    'VECTORIZE_SECRETS_ENDPOINT',
    'VECTORIZE_ORG_ID',
    'VECTORIZE_PIPELINE_ID',
    'VECTORIZE_TOKEN'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  if (missingVars.length > 0) {
    console.error(`Missing required environment variables: ${missingVars.join(', ')}`);
    return {
      statusCode: 500,
      body: JSON.stringify({
        error: 'Server configuration error',
        details: 'Missing required environment variables'
      })
    };
  }

  // Extract Vectorize credentials from environment variables
  const VECTORIZE_SECRETS_ENDPOINT = process.env.VECTORIZE_SECRETS_ENDPOINT;
  const VECTORIZE_ORG_ID = process.env.VECTORIZE_ORG_ID;
  const VECTORIZE_PIPELINE_ID = process.env.VECTORIZE_PIPELINE_ID;
  const VECTORIZE_TOKEN = process.env.VECTORIZE_TOKEN;

  // Parse the request body
  let body;
  try {
    body = JSON.parse(event.body);
  } catch (error) {
    return {
      statusCode: 400,
      body: JSON.stringify({ error: 'Invalid request body' })
    };
  }

  // Forward the request to Vectorize API
  try {
    console.log(`Processing query: "${body.query?.substring(0, 50)}..."`);

    const response = await axios({
      method: 'post',
      url: VECTORIZE_SECRETS_ENDPOINT,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${VECTORIZE_TOKEN}`
      },
      data: {
        orgId: VECTORIZE_ORG_ID,
        pipelineId: VECTORIZE_PIPELINE_ID,
        query: body.query,
        // Include any other parameters required by the Vectorize API
        ...(body.params || {})
      }
    });

    console.log('Successfully processed query');
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify(response.data)
    };
  } catch (error) {
    console.error('Error:', error.response?.data || error.message);
    return {
      statusCode: error.response?.status || 500,
      body: JSON.stringify({
        error: 'Failed to process request',
        details: error.response?.data || error.message
      })
    };
  }
};
