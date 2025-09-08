/**
 * Vercel Cron Job endpoint to sync Monday.com metadata
 * Runs every 30 minutes to keep cache fresh
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import { cache } from '../../lib/cache/simple-cache.js';

export default async function handler(
  request: VercelRequest,
  response: VercelResponse
) {
  console.log('📅 Cron job triggered: sync-metadata');
  
  // Verify this is a legitimate cron request
  const authHeader = request.headers.authorization;
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    console.error('❌ Unauthorized cron request');
    return response.status(401).json({ error: 'Unauthorized' });
  }
  
  try {
    const startTime = Date.now();
    
    // Force sync the cache
    await cache.sync();
    
    // Get current metadata for stats
    const metadata = await cache.getMetadata();
    const boardCount = Object.keys(metadata?.columns || {}).length;
    const columnCount = Object.values(metadata?.columns || {}).reduce(
      (sum, cols) => sum + cols.length, 
      0
    );
    
    const duration = Date.now() - startTime;
    
    const result = {
      success: true,
      message: 'Metadata synced successfully',
      stats: {
        boards: boardCount,
        columns: columnCount,
        duration: `${duration}ms`,
        lastSync: metadata?.lastSync
      }
    };
    
    console.log('✅ Cron job completed:', result);
    return response.status(200).json(result);
    
  } catch (error: any) {
    console.error('❌ Cron job failed:', error);
    return response.status(500).json({
      success: false,
      error: error.message || 'Sync failed'
    });
  }
}