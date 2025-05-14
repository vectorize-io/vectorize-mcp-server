exports.handler = async () => {
  // Check if all required environment variables are set
  const requiredEnvVars = [
    'VECTORIZE_SECRETS_ENDPOINT',
    'VECTORIZE_ORG_ID',
    'VECTORIZE_PIPELINE_ID',
    'VECTORIZE_TOKEN'
  ];

  const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);
  const envStatus = missingVars.length === 0 ? 'configured' : 'missing configuration';

  return {
    statusCode: 200,
    body: JSON.stringify({
      status: 'ok',
      service: 'Vectorize MCP Server',
      environment: envStatus,
      missingVars: missingVars.length > 0 ? missingVars : undefined,
      timestamp: new Date().toISOString()
    })
  };
};