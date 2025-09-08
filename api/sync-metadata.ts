/**
 * Manual sync endpoint for testing and on-demand cache refresh
 * GET /api/sync-metadata
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cache } from '../lib/cache/simple-cache.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  // For manual testing, allow without auth in development
  if (process.env.NODE_ENV === 'production') {
    const token = request.headers.authorization?.replace('Bearer ', '');
    if (token !== process.env.ADMIN_TOKEN) {
      return response.status(401).json({ error: 'Unauthorized' });
    }
  }
  
  try {
    console.log('🔄 Manual sync triggered');
    const startTime = Date.now();
    
    // Force sync
    await cache.sync();
    
    // Get metadata for response
    const metadata = await cache.getMetadata();
    const duration = Date.now() - startTime;
    
    return response.status(200).json({
      success: true,
      message: 'Sync completed',
      duration: `${duration}ms`,
      boards: Object.keys(metadata?.columns || {}).length,
      totalColumns: Object.values(metadata?.columns || {}).reduce((sum, cols) => sum + cols.length, 0),
      lastSync: metadata?.lastSync
    });
  } catch (error: any) {
    return response.status(500).json({
      success: false,
      error: error.message
    });
  }
}