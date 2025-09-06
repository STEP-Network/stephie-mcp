# STEPhie MCP Server - Production Deployment Guide

## Overview
This guide covers deploying the STEPhie MCP Server to production using Vercel Functions at https://stephie-mcp.vercel.app/

## Deployment Architecture

### Endpoints
- **Main**: `https://stephie-mcp.vercel.app/` - API documentation
- **Health Check**: `https://stephie-mcp.vercel.app/health` - Service status
- **MCP Endpoint**: `https://stephie-mcp.vercel.app/mcp` - Model Context Protocol endpoint

### API Functions
All serverless functions are located in `/api/`:
- `api/index.ts` - Main documentation endpoint
- `api/health.ts` - Health check endpoint
- `api/mcp.ts` - MCP protocol handler (all tools)
- `api/server.ts` - Legacy server endpoint
- `api/sse.ts` - Server-sent events (if needed)

## Environment Variables

### Required in Vercel Dashboard

Navigate to your Vercel project settings and add these environment variables:

```env
# Authentication (Required)
STEPHIE_AUTH_TOKEN=<from Stack Auth>

# Monday.com API (Required)
MONDAY_API_KEY=<your Monday.com API key>

# Google Ad Manager (Required for forecasting & contextual targeting)
GOOGLE_AD_MANAGER_NETWORK_CODE=21809957681
GOOGLE_SERVICE_ACCOUNT_EMAIL=<service-account@project.iam.gserviceaccount.com>
GOOGLE_PRIVATE_KEY=<your private key - paste directly, Vercel handles newlines>

# Stack Auth Integration (Optional - for full auth)
NEXT_PUBLIC_STACK_PROJECT_ID=<your project id>
STACK_SECRET_SERVER_KEY=<your server key>
DATABASE_URL=<PostgreSQL connection string>
```

### Setting Environment Variables in Vercel

1. Go to https://vercel.com/dashboard
2. Select your `stephie-mcp` project
3. Navigate to Settings → Environment Variables
4. Add each variable with appropriate values
5. Select environment scope (Production, Preview, Development)
6. Save changes

**Important Notes:**
- For `GOOGLE_PRIVATE_KEY`, paste the entire private key including headers
- Vercel automatically handles newline characters in multi-line values
- Always use Production scope for sensitive variables

## Deployment Process

### Initial Setup (One-time)

1. **Connect GitHub Repository**
   ```bash
   # If not already connected
   vercel link
   ```

2. **Configure Project**
   ```bash
   vercel
   # Follow prompts to set up project
   ```

### Automatic Deployment (Recommended)

With GitHub integration, deployments happen automatically:
- **Production**: Push to `main` branch
- **Preview**: Push to any other branch or open PR

### Manual Deployment

```bash
# Deploy to preview
vercel

# Deploy to production
vercel --prod
```

### Deployment via GitHub

```bash
# Commit changes
git add .
git commit -m "feat: update MCP server configuration"

# Push to main for production deployment
git push origin main
```

## Post-Deployment Verification

### 1. Check Deployment Status
```bash
# View deployment logs
vercel logs https://stephie-mcp.vercel.app/

# Or check in Vercel Dashboard
open https://vercel.com/dashboard
```

### 2. Test Endpoints

```bash
# Test health endpoint
curl https://stephie-mcp.vercel.app/health

# Test main endpoint
curl https://stephie-mcp.vercel.app/

# Test MCP endpoint (initialize)
curl -X POST https://stephie-mcp.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"initialize","params":{},"id":1}'

# List available tools
curl -X POST https://stephie-mcp.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":2}'
```

### 3. Test Tool Execution

```bash
# Example: Get all publishers
curl -X POST https://stephie-mcp.vercel.app/mcp \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_AUTH_TOKEN" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "getAllPublishers",
      "arguments": {"limit": 5}
    },
    "id": 3
  }'
```

## Monitoring & Logs

### View Function Logs
```bash
# Real-time logs
vercel logs --follow

# Specific function logs
vercel logs api/mcp.ts
```

### Vercel Dashboard Monitoring
1. Visit https://vercel.com/dashboard
2. Select your project
3. Go to Functions tab to see:
   - Invocation count
   - Error rate
   - Duration metrics
   - Memory usage

## Troubleshooting

### Common Issues

#### 1. Environment Variables Not Loading
- Ensure variables are set in Vercel Dashboard
- Check scope (Production vs Preview)
- Redeploy after adding variables

#### 2. Function Timeout
- Current limits: 120s for MCP endpoint
- Consider breaking large operations into smaller chunks
- Use streaming responses for large datasets

#### 3. CORS Errors
- Headers are configured in `vercel.json`
- Ensure client includes proper headers
- Check browser console for specific CORS issues

#### 4. Authentication Failures
- Verify `STEPHIE_AUTH_TOKEN` is set correctly
- Check Stack Auth integration if using full auth
- Test with health endpoint first

### Debug Mode

For detailed debugging, you can:

1. **Check Function Logs**
   ```bash
   vercel logs api/mcp.ts --since 1h
   ```

2. **Use Debug Tools**
   - Call `listBoards` tool to verify Monday.com connection
   - Call `getBoardColumns` to check board structure
   - Test with minimal parameters first

3. **Local Testing**
   ```bash
   # Test locally before deployment
   pnpm mcp:dev
   TEST_AUTH_TOKEN=test-token pnpm test:local
   ```

## Security Best Practices

1. **Never commit `.env.local` file**
2. **Use Vercel environment variables for secrets**
3. **Rotate API keys regularly**
4. **Enable Vercel Security Headers**
5. **Monitor function invocations for anomalies**
6. **Use rate limiting if needed**

## Rollback Procedure

If issues occur after deployment:

```bash
# View deployment history
vercel ls

# Rollback to previous deployment
vercel rollback [deployment-url]

# Or use Vercel Dashboard
# Projects → Your Project → Deployments → Promote to Production
```

## Performance Optimization

### Function Configuration
- MCP endpoint: 120s timeout, 1024MB memory
- Other endpoints: 30-60s timeout, default memory
- Adjust in `vercel.json` if needed

### Caching Strategy
- Consider edge caching for frequently accessed data
- Use Vercel KV for session storage if needed
- Implement client-side caching where appropriate

## Support & Resources

- **Vercel Documentation**: https://vercel.com/docs
- **MCP Protocol Spec**: https://modelcontextprotocol.io/
- **Monday.com API**: https://developer.monday.com/
- **Google Ad Manager API**: https://developers.google.com/ad-manager/api/

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables set in Vercel Dashboard
- [ ] Tests pass locally (`pnpm test:local`)
- [ ] API endpoints verified
- [ ] CORS configuration tested
- [ ] Authentication working
- [ ] Error handling implemented
- [ ] Logging configured
- [ ] Documentation updated
- [ ] Version number incremented in `package.json`

## Quick Deploy Commands

```bash
# Full deployment process
git add .
git commit -m "feat: deploy to production"
git push origin main

# Check deployment status
vercel ls
vercel logs --follow

# Test production endpoint
curl https://stephie-mcp.vercel.app/health
```

---

Last Updated: 2025-09-06