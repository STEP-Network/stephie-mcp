// Use native Request/Response for Vercel Edge Runtime

/**
 * SSE handler wrapper with keepalive mechanism for Vercel Edge Runtime
 * Prevents timeout issues with Claude Desktop by sending periodic ping messages
 */
export function withSSEKeepAlive(handler: Function) {
  return async function (request: Request) {
    // Check if this is an SSE request
    const acceptHeader = request.headers.get("accept");
    const isSSE = acceptHeader?.includes("text/event-stream");
    
    if (!isSSE) {
      // Not an SSE request, pass through to original handler
      return handler(request);
    }

    // Create a transform stream for SSE
    const encoder = new TextEncoder();
    const stream = new TransformStream();
    const writer = stream.writable.getWriter();
    
    // Keepalive ping interval (30 seconds)
    let keepAliveInterval: NodeJS.Timeout | null = null;
    let isClosed = false;
    
    // Function to send keepalive ping
    const sendKeepAlive = async () => {
      if (!isClosed) {
        try {
          // SSE comment format for keepalive (doesn't affect data stream)
          await writer.write(encoder.encode(": keepalive\n\n"));
        } catch (error) {
          console.error("[SSE] Failed to send keepalive:", error);
          clearInterval(keepAliveInterval!);
        }
      }
    };
    
    // Start keepalive interval
    keepAliveInterval = setInterval(sendKeepAlive, 30000);
    
    // Create response with SSE headers
    const response = new Response(stream.readable, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      },
    });
    
    // Handle the actual request in the background
    (async () => {
      try {
        // Get the original handler response
        const originalResponse = await handler(request);
        
        if (originalResponse.body) {
          const reader = originalResponse.body.getReader();
          
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            // Forward the data to our stream
            await writer.write(value);
          }
        }
      } catch (error) {
        console.error("[SSE Handler] Error:", error);
        
        // Send error as SSE event
        const errorMessage = `data: ${JSON.stringify({ 
          error: "Internal server error", 
          message: String(error) 
        })}\n\n`;
        await writer.write(encoder.encode(errorMessage));
      } finally {
        // Cleanup
        isClosed = true;
        if (keepAliveInterval) {
          clearInterval(keepAliveInterval);
        }
        await writer.close();
      }
    })();
    
    return response;
  };
}

/**
 * Wrapper to handle missing MCP methods gracefully
 */
export function withMissingMethodHandlers(handler: Function) {
  return async function (request: Request) {
    try {
      // Clone request to read body
      const requestClone = request.clone();
      const body = await requestClone.json().catch(() => null);
      
      // Check if this is a request for missing methods
      if (body?.method === "prompts/list") {
        const response = new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { prompts: [] }
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
        console.log("[MCP] Handled prompts/list request");
        return response;
      }
      
      if (body?.method === "resources/list") {
        const response = new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { resources: [] }
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
        console.log("[MCP] Handled resources/list request");
        return response;
      }
      
      if (body?.method === "completion/complete") {
        const response = new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: {
            completion: {
              values: [],
              hasMore: false,
              total: 0
            }
          }
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET,OPTIONS,POST",
            "Access-Control-Allow-Headers": "Content-Type, Authorization"
          }
        });
        console.log("[MCP] Handled completion/complete request");
        return response;
      }

      // Also handle these methods for SSE
      if (body?.method === "notifications/list") {
        const response = new Response(JSON.stringify({
          jsonrpc: "2.0",
          id: body.id,
          result: { notifications: [] }
        }), {
          headers: { 
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*"
          }
        });
        return response;
      }
    } catch (err) {
      // Log but don't fail
      console.log("[MCP] Could not parse request body:", err);
    }
    
    // Pass through to original handler
    return handler(request);
  };
}