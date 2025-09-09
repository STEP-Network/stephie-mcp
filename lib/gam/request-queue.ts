interface QueuedRequest<T> {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: Error) => void;
}

class RequestQueue {
  private queue: QueuedRequest<any>[] = [];
  private processing = false;
  private lastRequestTime = 0;
  private minDelayMs = 500; // Minimum 500ms between requests
  private maxConcurrent = 1; // Process one at a time to avoid rate limits
  private activeRequests = 0;

  async add<T>(execute: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      this.queue.push({ execute, resolve, reject });
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
      console.error(`[Request Queue] Processing request (${this.queue.length} remaining in queue)`);
      const result = await request.execute();
      request.resolve(result);
    } catch (error) {
      console.error("[Request Queue] Request failed:", error);
      request.reject(error instanceof Error ? error : new Error(String(error)));
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