import type { VercelRequest, VercelResponse } from "@vercel/node";

// Set longer timeout for SSE connections
export const config = {
  runtime: "edge",
  maxDuration: 300, // 5 minutes
};

/**
 * Wrapper for SSE responses with keep-alive
 */
export class SSEResponseWrapper {
  private encoder = new TextEncoder();
  private writer: WritableStreamDefaultWriter;
  private keepAliveInterval?: NodeJS.Timeout;
  private isClosed = false;

  constructor(response: Response) {
    const stream = new TransformStream();
    this.writer = stream.writable.getWriter();

    // Start keep-alive ping every 30 seconds
    this.keepAliveInterval = setInterval(() => {
      if (!this.isClosed) {
        this.sendKeepAlive();
      }
    }, 30000);

    // Return the response with the stream
    Object.assign(response, {
      body: stream.readable,
      headers: {
        ...response.headers,
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        "Connection": "keep-alive",
        "X-Accel-Buffering": "no", // Disable Nginx buffering
      },
    });
  }

  private async sendKeepAlive() {
    try {
      const keepAlive = this.encoder.encode(": keep-alive\n\n");
      await this.writer.write(keepAlive);
    } catch (error) {
      console.error("[SSE] Failed to send keep-alive:", error);
      this.close();
    }
  }

  async write(data: string) {
    if (this.isClosed) return;
    
    try {
      const encoded = this.encoder.encode(data);
      await this.writer.write(encoded);
    } catch (error) {
      console.error("[SSE] Failed to write data:", error);
      this.close();
    }
  }

  close() {
    this.isClosed = true;
    if (this.keepAliveInterval) {
      clearInterval(this.keepAliveInterval);
    }
    this.writer.close().catch(() => {});
  }
}

/**
 * Wraps the original handler with SSE enhancements
 */
export function wrapSSEHandler(originalHandler: Function) {
  return async (req: VercelRequest, res: VercelResponse) => {
    // Add SSE-specific headers
    if (req.headers.accept?.includes("text/event-stream")) {
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache, no-transform");
      res.setHeader("Connection", "keep-alive");
      res.setHeader("X-Accel-Buffering", "no");
      
      // Set timeout to 5 minutes
      res.setTimeout?.(300000);
    }

    try {
      return await originalHandler(req, res);
    } catch (error) {
      console.error("[SSE Handler] Error:", error);
      
      // Return error as SSE event if it's an SSE request
      if (req.headers.accept?.includes("text/event-stream")) {
        res.write(`data: ${JSON.stringify({ error: String(error) })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: String(error) });
      }
    }
  };
}