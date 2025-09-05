import { VercelRequest, VercelResponse } from '@vercel/node';

export default function handler(req: VercelRequest, res: VercelResponse) {
  res.status(200).json({
    status: 'healthy',
    service: 'stephie-mcp',
    version: process.env.MCP_SERVER_VERSION || '1.0.0',
    timestamp: new Date().toISOString(),
    environment: process.env.VERCEL_ENV || 'development',
    capabilities: ['tools', 'streaming', 'authentication']
  });
}