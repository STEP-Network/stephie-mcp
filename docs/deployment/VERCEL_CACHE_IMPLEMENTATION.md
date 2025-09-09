# Vercel Cache Implementation for MCP Server

## Solution: Vercel Edge Functions + KV Storage (or Edge Config)

Since Vercel Data Cache is for Next.js App Router, we'll use **Vercel KV** (Redis-compatible) or **Edge Config** (read-optimized) for our MCP server.

## Option 1: Vercel Edge Config (Recommended for Read-Heavy)

Edge Config is perfect for our metadata cache:
- **Ultra-fast reads**: ~15ms globally
- **Free tier**: 8KB included
- **No cold starts**: Data loaded at edge
- **Simple API**: Just read, no complex Redis commands

### Implementation:

#### 1. Create Edge Config Store

```bash
# Install Vercel CLI
npm i -g vercel

# Create Edge Config
vercel env add EDGE_CONFIG
```

#### 2. Simple Cache Manager

```typescript
// lib/cache/edge-config-cache.ts
import { get } from '@vercel/edge-config';

export class EdgeConfigCache {
  private memoryCache = new Map<string, any>();
  private lastSync = 0;
  
  async getColumns(boardId: string): Promise<string[]> {
    // Try memory first (0ms)
    if (this.memoryCache.has(boardId)) {
      return this.memoryCache.get(boardId);
    }
    
    // Try Edge Config (15ms)
    const columns = await get(`columns_${boardId}`);
    if (columns) {
      this.memoryCache.set(boardId, columns);
      return columns as string[];
    }
    
    // Fallback to defaults
    return ['name', 'status'];
  }
  
  async getAllMetadata() {
    return get('metadata') || {};
  }
}

export const cache = new EdgeConfigCache();
```

#### 3. Sync Endpoint with Cron

```typescript
// api/cron/sync-metadata.ts
import { mondayApi } from '../../lib/monday/client';
import { updateEdgeConfig } from '@vercel/edge-config';

export const config = {
  runtime: 'edge',
  maxDuration: 30,
};

export async function GET(request: Request) {
  // Verify cron secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new Response('Unauthorized', { status: 401 });
  }
  
  console.log('🔄 Syncing metadata to Edge Config...');
  
  try {
    // Fetch all metadata from Monday.com
    const metadata = await fetchAllMetadata();
    
    // Update Edge Config
    await updateEdgeConfig({
      items: [
        {
          key: 'metadata',
          value: metadata,
        },
        // Store individual board columns for faster access
        ...Object.entries(metadata.columns).map(([boardId, columns]) => ({
          key: `columns_${boardId}`,
          value: columns,
        })),
      ],
    });
    
    return new Response('Sync completed', { status: 200 });
  } catch (error) {
    console.error('Sync failed:', error);
    return new Response('Sync failed', { status: 500 });
  }
}

async function fetchAllMetadata() {
  const query = `
    query {
      boards(ids: [2135717897, 1698570295]) {
        id
        items_page(limit: 500) {
          items {
            id
            name
            column_values {
              id
              text
              ... on BoardRelationValue {
                linked_item_ids
              }
            }
          }
        }
      }
    }
  `;
  
  const response = await mondayApi(query);
  return processMetadata(response);
}
```

#### 4. Configure Vercel Cron

```json
// vercel.json
{
  "crons": [
    {
      "path": "/api/cron/sync-metadata",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

## Option 2: Vercel KV (Redis-Compatible)

If you need more storage or complex operations:

```typescript
// lib/cache/kv-cache.ts
import { kv } from '@vercel/kv';

export class KVCache {
  async getColumns(boardId: string): Promise<string[]> {
    const columns = await kv.get(`columns:${boardId}`);
    return columns || ['name', 'status'];
  }
  
  async setColumns(boardId: string, columns: string[]) {
    await kv.set(`columns:${boardId}`, columns, {
      ex: 1800, // 30 minutes TTL
    });
  }
}
```

## Option 3: Simple File Cache (Works on Vercel!)

If you want to keep it simple, Vercel DOES support file system in `/tmp`:

```typescript
// lib/cache/file-cache.ts
import fs from 'fs/promises';
import path from 'path';

const CACHE_DIR = '/tmp/cache';
const CACHE_FILE = path.join(CACHE_DIR, 'metadata.json');

export class FileCache {
  private cache: any = null;
  
  async initialize() {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      
      // Try to load existing cache
      const data = await fs.readFile(CACHE_FILE, 'utf8');
      this.cache = JSON.parse(data);
      
      // Check if stale (older than 30 minutes)
      const stats = await fs.stat(CACHE_FILE);
      const age = Date.now() - stats.mtimeMs;
      if (age > 30 * 60 * 1000) {
        await this.sync();
      }
    } catch {
      // No cache exists, sync now
      await this.sync();
    }
  }
  
  async getColumns(boardId: string): Promise<string[]> {
    if (!this.cache) {
      await this.initialize();
    }
    return this.cache?.columns?.[boardId] || ['name', 'status'];
  }
  
  async sync() {
    console.log('Syncing metadata...');
    const metadata = await fetchAllMetadata();
    this.cache = metadata;
    await fs.writeFile(CACHE_FILE, JSON.stringify(metadata));
  }
}
```

## Performance Comparison

| Solution | Read Speed | Storage | Cost | Complexity |
|----------|-----------|---------|------|------------|
| Edge Config | 15ms | 8KB free | Free-$20 | Simple |
| Vercel KV | 5-10ms | 30MB free | Free-$20 | Medium |
| File Cache (/tmp) | 1-2ms | 500MB | Free | Simplest |
| Memory Only | 0ms | Instance RAM | Free | Too simple |

## My Recommendation

### 🏆 **Edge Config for Production**
- Perfect for metadata that changes infrequently
- Ultra-fast global reads
- No cold starts
- Built for this exact use case

### 🏆 **File Cache for Development/Simple**
- Works everywhere including Vercel
- Zero dependencies
- Easiest to implement
- Good enough for most cases

## Implementation Steps

1. **For Edge Config:**
```bash
# Install dependencies
npm install @vercel/edge-config

# Create Edge Config store
vercel link
vercel env pull .env.local

# Add cron secret
vercel env add CRON_SECRET
```

2. **Create sync endpoint:**
```bash
mkdir -p api/cron
# Create api/cron/sync-metadata.ts (code above)
```

3. **Update vercel.json:**
```json
{
  "crons": [
    {
      "path": "/api/cron/sync-metadata",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

4. **Update getDynamicColumns:**
```typescript
import { cache } from './cache/edge-config-cache';

export async function getDynamicColumns(boardId: string) {
  return cache.getColumns(boardId);
}
```

Ready to implement! Which option do you prefer?