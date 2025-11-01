/**
 * Operation Queue System
 *
 * Prevents race conditions by queuing operations per habit.
 * Ensures operations execute sequentially, avoiding simultaneous API calls.
 */

type QueuedOperation<T> = {
  execute: () => Promise<T>;
  resolve: (value: T) => void;
  reject: (error: unknown) => void;
};

class OperationQueue {
  private queues: Map<string, QueuedOperation<unknown>[]> = new Map();
  private processing: Set<string> = new Set();

  /**
   * Add operation to queue for a specific key (e.g., habitId)
   * Operations for the same key execute sequentially
   */
  async enqueue<T>(key: string, operation: () => Promise<T>): Promise<T> {
    return new Promise<T>((resolve, reject) => {
      const queuedOp: QueuedOperation<T> = {
        execute: operation,
        resolve: resolve as (value: unknown) => void,
        reject,
      };

      if (!this.queues.has(key)) {
        this.queues.set(key, []);
      }

      this.queues.get(key)!.push(queuedOp as QueuedOperation<unknown>);

      // Start processing if not already processing this key
      if (!this.processing.has(key)) {
        this.processQueue(key);
      }
    });
  }

  private async processQueue(key: string): Promise<void> {
    this.processing.add(key);

    const queue = this.queues.get(key);
    if (!queue || queue.length === 0) {
      this.processing.delete(key);
      this.queues.delete(key);
      return;
    }

    const operation = queue.shift()!;

    try {
      const result = await operation.execute();
      operation.resolve(result);
    } catch (error) {
      operation.reject(error);
    }

    // Process next operation in queue
    await this.processQueue(key);
  }

  /**
   * Get queue size for a specific key (for debugging)
   */
  getQueueSize(key: string): number {
    return this.queues.get(key)?.length || 0;
  }

  /**
   * Check if queue is processing for a specific key
   */
  isProcessing(key: string): boolean {
    return this.processing.has(key);
  }
}

// Singleton instance
export const operationQueue = new OperationQueue();
