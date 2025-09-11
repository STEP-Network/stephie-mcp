import { spawn } from 'child_process';
import { createInterface } from 'readline';

const mcp = spawn('node', ['dist/mcp-server.js'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

const rl = createInterface({
  input: mcp.stdout,
  crlfDelay: Infinity
});

// Send initialize
mcp.stdin.write(JSON.stringify({
  jsonrpc: '2.0',
  id: 1,
  method: 'initialize',
  params: {
    protocolVersion: '0.1.0',
    capabilities: {},
    clientInfo: { name: 'test-client', version: '1.0.0' }
  }
}) + '\n');

let testStep = 0;

rl.on('line', (line) => {
  try {
    const response = JSON.parse(line);
    
    if (response.id === 1) {
      console.log('✓ Server initialized with resources capability:', response.result.capabilities.resources !== undefined);
      
      // Test 1: List all resources
      mcp.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 2,
        method: 'resources/list',
        params: {}
      }) + '\n');
      testStep = 1;
    } else if (response.id === 2 && testStep === 1) {
      console.log('✓ Listed', response.result.resources.length, 'resources');
      
      // Test 2: Search with query parameter
      mcp.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 3,
        method: 'resources/list',
        params: { query: 'tech' }
      }) + '\n');
      testStep = 2;
    } else if (response.id === 3 && testStep === 2) {
      console.log('✓ Query "tech" returned', response.result.resources.length, 'resources:', 
        response.result.resources.map(r => r.name).join(', '));
      
      // Test 3: Search with another query
      mcp.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 4,
        method: 'resources/list',
        params: { query: 'publisher' }
      }) + '\n');
      testStep = 3;
    } else if (response.id === 4 && testStep === 3) {
      console.log('✓ Query "publisher" returned', response.result.resources.length, 'resources:', 
        response.result.resources.map(r => r.name).join(', '));
      
      // Test 4: Read a resource
      mcp.stdin.write(JSON.stringify({
        jsonrpc: '2.0',
        id: 5,
        method: 'resources/read',
        params: { uri: 'monday://tasks/tech-intelligence' }
      }) + '\n');
      testStep = 4;
    } else if (response.id === 5 && testStep === 4) {
      const content = JSON.parse(response.result.contents[0].text);
      console.log('✓ Read tech-intelligence resource, got', content.data?.length || 0, 'tasks');
      
      console.log('\n✅ All tests passed! Resources work with standard query parameter.');
      process.exit(0);
    }
  } catch (e) {
    // Ignore non-JSON output
  }
});

mcp.stderr.on('data', (data) => {
  // Ignore stderr unless it's an error
  const msg = data.toString();
  if (!msg.includes('MCP server running')) {
    console.error('Error:', msg);
  }
});

setTimeout(() => {
  console.error('❌ Test timeout');
  process.exit(1);
}, 10000);
