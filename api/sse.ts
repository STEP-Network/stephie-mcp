import { VercelRequest, VercelResponse } from '@vercel/node';
import { AuthValidator } from '../lib/auth/auth-validator.js';
import { MCPErrorCodes } from '../lib/types/mcp.js';

const authValidator = new AuthValidator();

export default async function handler(
  req: VercelRequest,
  res: VercelResponse
) {
  // Only allow POST
  if (req.method !== 'POST') {
    res.status(405).json({
      error: 'Method not allowed'
    });
    return;
  }

  // Validate auth token
  const authHeader = req.headers.authorization;
  const token = authHeader?.replace('Bearer ', '');

  if (!token) {
    res.status(401).json({
      error: 'Authentication required'
    });
    return;
  }

  const validation = await authValidator.validateToken(token);
  if (!validation.valid) {
    res.status(401).json({
      error: validation.error || 'Invalid token'
    });
    return;
  }

  // Set SSE headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');

  // Parse request body
  const { method, params } = req.body;

  // Send initial connection event
  res.write(`data: ${JSON.stringify({
    type: 'connected',
    userId: validation.userId,
    timestamp: Date.now()
  })}\n\n`);

  if (method === 'tools/call') {
    const { name, arguments: args } = params;

    try {
      // Send progress updates
      res.write(`data: ${JSON.stringify({
        type: 'progress',
        message: `Executing tool: ${name}`
      })}\n\n`);

      // Execute tool (placeholder)
      const result = await executeStreamingTool(name, args, validation.userId!, (progress) => {
        res.write(`data: ${JSON.stringify({
          type: 'progress',
          content: progress
        })}\n\n`);
      });

      // Send result
      res.write(`data: ${JSON.stringify({
        type: 'result',
        content: result
      })}\n\n`);

    } catch (error) {
      res.write(`data: ${JSON.stringify({
        type: 'error',
        error: error instanceof Error ? error.message : 'Unknown error'
      })}\n\n`);
    }
  }

  // Send completion
  res.write(`data: ${JSON.stringify({
    type: 'complete'
  })}\n\n`);

  res.end();
}

// Streaming tool execution (placeholder)
async function executeStreamingTool(
  name: string, 
  args: any, 
  userId: string,
  onProgress: (progress: any) => void
): Promise<any> {
  // Simulate streaming progress
  onProgress({ step: 1, message: 'Initializing...' });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress({ step: 2, message: 'Fetching data...' });
  await new Promise(resolve => setTimeout(resolve, 500));
  
  onProgress({ step: 3, message: 'Processing...' });
  await new Promise(resolve => setTimeout(resolve, 500));

  // Return mock result
  return {
    tool: name,
    success: true,
    data: 'Mock result for ' + name
  };
}