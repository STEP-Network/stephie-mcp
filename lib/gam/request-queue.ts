interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
  retries?: number;
  maxRetries?: number;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelayMs = 500; // Minimum 500ms between requests
  private maxConcurrent = 1; // Process one at a time to avoid rate limits
  private activeRequests = 0;

  async add<T>(execute: () => Promise<T>, maxRetries = 3): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ execute, resolve, reject, retries: 0, maxRetries });
      this.process();
    });
  }

  private async process() {
    if (this.processing || this.activeRequests >= this.maxConcurrent) {
      return;
    }

    const request = this.queue.shift();
    if (!request) {
      return;
    }

    this.processing = true;
    this.activeRequests++;

    try {
      // Ensure minimum delay between requests
      const now = Date.now();
      const timeSinceLastRequest = now - this.lastRequestTime;
      if (timeSinceLastRequest < this.minDelayMs) {
        const delay = this.minDelayMs - timeSinceLastRequest;
        console.error(`[Request Queue] Delaying ${delay}ms before next request`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }

      this.lastRequestTime = Date.now();
      
      // Execute the request
      console.error(`[Request Queue] Processing request (${this.queue.length} remaining in queue, retry ${request.retries}/${request.maxRetries})`);
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      console.error("[Request Queue] Request failed:", error);
      
      // Check if we should retry
      const shouldRetry = request.retries! < request.maxRetries! && 
        (error instanceof Error && (
          error.message.includes("timed out") ||
          error.message.includes("ECONNRESET") ||
          error.message.includes("ETIMEDOUT") ||
          error.message.includes("503") ||
          error.message.includes("502") ||
          error.message.includes("429") // Rate limited
        ));
      
      if (shouldRetry) {
        request.retries = (request.retries || 0) + 1;
        const backoffDelay = Math.min(1000 * Math.pow(2, request.retries), 30000); // Exponential backoff, max 30s
        
        console.error(`[Request Queue] Retrying request (attempt ${request.retries}/${request.maxRetries}) after ${backoffDelay}ms`);
        
        // Re-add to queue with delay
        setTimeout(() => {
          this.queue.unshift(request); // Add to front of queue for retry
          this.process();
        }, backoffDelay);
      } else {
        request.reject(error instanceof Error ? error : new Error(String(error)));
      }
    } finally {
      this.activeRequests--;
      this.processing = false;
      
      // Process next request if available
      if (this.queue.length > 0) {
        // Small delay before processing next to avoid tight loops
        setTimeout(() => this.process(), 100);
      }
    }
  }

  getQueueLength(): number {
    return this.queue.length;
  }

  getActiveRequests(): number {
    return this.activeRequests;
  }
}

// Create a singleton instance
export const gamRequestQueue = new RequestQueue();