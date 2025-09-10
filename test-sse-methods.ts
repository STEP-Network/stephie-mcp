#!/usr/bin/env npx tsx

/**
 * Test script to verify SSE methods are properly handled
 */

async function testMethod(url: string, method: string, expectedKeys: string[]) {
  console.log(`\nTesting ${method}...`);
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.STEPHIE_AUTH_TOKEN || 'test-token'}`
      },
      body: JSON.stringify({
        jsonrpc: '2.0',
        id: Date.now(),
        method: method,
        params: {}
      })
    });

    if (!response.ok) {
      console.error(`❌ ${method}: HTTP ${response.status}`);
      return false;
    }

    const data = await response.json();
    
    if (data.error) {
      console.error(`❌ ${method}: Error - ${data.error.message}`);
      return false;
    }

    // Check if expected keys exist in result
    const result = data.result;
    const hasExpectedKeys = expectedKeys.every(key => key in result);

    if (hasExpectedKeys) {
      console.log(`✅ ${method}: Success - Response has expected keys:`, expectedKeys);
      console.log(`   Response:`, JSON.stringify(result, null, 2));
      return true;
    } else {
      console.error(`❌ ${method}: Missing expected keys. Got:`, Object.keys(result));
      return false;
    }
  } catch (error) {
    console.error(`❌ ${method}: Failed -`, error);
    return false;
  }
}

async function testSSE(url: string) {
  console.log(`\nTesting SSE connection with keepalive...`);
  
  return new Promise((resolve) => {
    const startTime = Date.now();
    let lastPing = Date.now();
    
    const eventSource = new EventSource(url, {
      // @ts-ignore - headers not standard but might work
      headers: {
        'Authorization': `Bearer ${process.env.STEPHIE_AUTH_TOKEN || 'test-token'}`
      }
    });

    eventSource.onopen = () => {
      console.log('✅ SSE connection opened');
    };

    eventSource.onmessage = (event) => {
      const now = Date.now();
      const timeSinceLastPing = now - lastPing;
      lastPing = now;
      
      if (event.data.includes('keepalive')) {
        console.log(`✅ Received keepalive ping (${timeSinceLastPing}ms since last)`);
      } else {
        console.log(`📦 Received data:`, event.data.substring(0, 100));
      }
    };

    eventSource.onerror = (error) => {
      const elapsed = Date.now() - startTime;
      console.error(`❌ SSE error after ${elapsed}ms:`, error);
      eventSource.close();
      resolve(false);
    };

    // Test for 65 seconds (just over the original timeout)
    setTimeout(() => {
      const elapsed = Date.now() - startTime;
      console.log(`✅ SSE connection survived ${elapsed}ms without timeout!`);
      eventSource.close();
      resolve(true);
    }, 65000);
  });
}

async function main() {
  const baseUrl = process.env.VERCEL_URL || 'https://stephie.vercel.app';
  const url = baseUrl.startsWith('http') ? baseUrl : `https://${baseUrl}`;
  
  console.log(`Testing MCP server at: ${url}`);
  console.log('=' .repeat(50));

  // Test missing method handlers
  const results = [];
  results.push(await testMethod(`${url}/api/server`, 'prompts/list', ['prompts']));
  results.push(await testMethod(`${url}/api/server`, 'resources/list', ['resources']));
  results.push(await testMethod(`${url}/api/server`, 'completion/complete', ['completion']));

  // Test SSE keepalive (optional, takes 65 seconds)
  if (process.argv.includes('--test-sse')) {
    console.log('\n' + '=' .repeat(50));
    console.log('Starting SSE keepalive test (will run for 65 seconds)...');
    results.push(await testSSE(`${url}/sse`));
  }

  // Summary
  console.log('\n' + '=' .repeat(50));
  console.log('TEST SUMMARY:');
  const passed = results.filter(r => r).length;
  const failed = results.filter(r => !r).length;
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);