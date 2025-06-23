/* ================================
   Memory Manager
   Efficient Handling of Large Media Files
   ================================ */

export interface MemoryConfig {
  maxHeapUsage: number;        // Max heap usage percentage (0-1)
  canvasPoolSize: number;      // Number of reusable canvases
  imageDataPoolSize: number;   // Number of reusable ImageData objects
  bufferPoolSize: number;      // Number of reusable ArrayBuffers
  gcThreshold: number;         // Memory threshold to trigger GC
  enableStreaming: boolean;    // Enable streaming for large files
  chunkSize: number;          // Chunk size for streaming (bytes)
}

export interface MemoryStats {
  heapUsed: number;
  heapTotal: number;
  heapPercentage: number;
  canvasesInUse: number;
  buffersInUse: number;
  activeAllocations: number;
  lastGCTime: number;
}

export class MemoryManager {
  private config: MemoryConfig;
  private canvasPool: HTMLCanvasElement[] = [];
  private canvasInUse: Set<HTMLCanvasElement> = new Set();
  private imageDataPool: ImageData[] = [];
  private bufferPool: ArrayBuffer[] = [];
  private activeAllocations: Map<string, { size: number; timestamp: number }> = new Map();
  private memoryPressureCallbacks: Array<(pressure: number) => void> = [];
  private gcTimer: number | null = null;
  private streamingCache: Map<string, ReadableStream> = new Map();

  constructor(config?: Partial<MemoryConfig>) {
    this.config = {
      maxHeapUsage: 0.8,
      canvasPoolSize: 10,
      imageDataPoolSize: 20,
      bufferPoolSize: 15,
      gcThreshold: 0.7,
      enableStreaming: true,
      chunkSize: 1024 * 1024, // 1MB chunks
      ...config
    };

    this.initializeManager();
  }

  /* ================================
     Public API
     ================================ */

  getCurrentUsage(): number {
    if ((window as any).performance?.memory) {
      const memory = (window as any).performance.memory;
      return memory.usedJSHeapSize;
    }
    return 0;
  }

  getMemoryStats(): MemoryStats {
    const memory = (window as any).performance?.memory;
    const heapUsed = memory?.usedJSHeapSize || 0;
    const heapTotal = memory?.totalJSHeapSize || 0;
    
    return {
      heapUsed,
      heapTotal,
      heapPercentage: heapTotal > 0 ? heapUsed / heapTotal : 0,
      canvasesInUse: this.canvasInUse.size,
      buffersInUse: this.bufferPool.length,
      activeAllocations: this.activeAllocations.size,
      lastGCTime: Date.now()
    };
  }

  getReusableCanvas(width?: number, height?: number): HTMLCanvasElement {
    let canvas = this.canvasPool.pop();
    
    if (!canvas) {
      canvas = document.createElement('canvas');
      this.trackAllocation('canvas', this.estimateCanvasSize(width || 1920, height || 1080));
    }

    if (width && height) {
      canvas.width = width;
      canvas.height = height;
    }

    this.canvasInUse.add(canvas);
    return canvas;
  }

  returnCanvas(canvas: HTMLCanvasElement): void {
    this.canvasInUse.delete(canvas);
    
    if (this.canvasPool.length < this.config.canvasPoolSize) {
      // Clear the canvas for reuse
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      this.canvasPool.push(canvas);
    } else {
      // Dispose of excess canvas
      this.disposeCanvas(canvas);
    }
  }

  getReusableImageData(width: number, height: number): ImageData {
    const targetSize = width * height;
    
    // Find a suitable ImageData from pool
    for (let i = 0; i < this.imageDataPool.length; i++) {
      const imageData = this.imageDataPool[i];
      if (imageData.width * imageData.height >= targetSize) {
        this.imageDataPool.splice(i, 1);
        return imageData;
      }
    }

    // Create new if none suitable found
    const canvas = this.getReusableCanvas(width, height);
    const ctx = canvas.getContext('2d')!;
    const imageData = ctx.createImageData(width, height);
    this.returnCanvas(canvas);
    
    this.trackAllocation('imagedata', width * height * 4);
    return imageData;
  }

  returnImageData(imageData: ImageData): void {
    if (this.imageDataPool.length < this.config.imageDataPoolSize) {
      this.imageDataPool.push(imageData);
    }
  }

  getReusableBuffer(size: number): ArrayBuffer {
    // Find suitable buffer from pool
    for (let i = 0; i < this.bufferPool.length; i++) {
      const buffer = this.bufferPool[i];
      if (buffer.byteLength >= size) {
        this.bufferPool.splice(i, 1);
        return buffer;
      }
    }

    // Create new buffer
    const buffer = new ArrayBuffer(size);
    this.trackAllocation('buffer', size);
    return buffer;
  }

  returnBuffer(buffer: ArrayBuffer): void {
    if (this.bufferPool.length < this.config.bufferPoolSize) {
      this.bufferPool.push(buffer);
    }
  }

  /* ================================
     Large File Streaming
     ================================ */

  async createStreamForLargeFile(url: string, maxChunkSize?: number): Promise<ReadableStream<Uint8Array>> {
    const chunkSize = maxChunkSize || this.config.chunkSize;
    
    // Check if we already have a stream for this URL
    if (this.streamingCache.has(url)) {
      return this.streamingCache.get(url)!;
    }

    const response = await fetch(url);
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const contentLength = response.headers.get('content-length');
    const totalSize = contentLength ? parseInt(contentLength) : 0;

    const stream = new ReadableStream<Uint8Array>({
      start: (controller) => {
        let bytesRead = 0;
        const reader = response.body!.getReader();

        const pump = async (): Promise<void> => {
          try {
            const { value, done } = await reader.read();
            
            if (done) {
              controller.close();
              this.streamingCache.delete(url);
              return;
            }

            // Check memory pressure before processing chunk
            if (this.isMemoryPressureHigh()) {
              await this.forceGarbageCollection();
            }

            bytesRead += value.byteLength;
            controller.enqueue(value);

            // Track progress for large files
            if (totalSize > 0) {
              const progress = bytesRead / totalSize;
              this.notifyStreamingProgress(url, progress);
            }

            // Continue reading
            pump();
          } catch (error) {
            controller.error(error);
            this.streamingCache.delete(url);
          }
        };

        pump();
      }
    });

    this.streamingCache.set(url, stream);
    return stream;
  }

  async processLargeImageInChunks(
    imageElement: HTMLImageElement,
    processor: (canvas: HTMLCanvasElement, chunk: ImageData) => Promise<any>
  ): Promise<any[]> {
    const { naturalWidth, naturalHeight } = imageElement;
    
    // Calculate optimal chunk dimensions
    const maxChunkPixels = 1024 * 1024; // 1MP per chunk
    const chunkWidth = Math.min(naturalWidth, Math.sqrt(maxChunkPixels));
    const chunkHeight = Math.min(naturalHeight, maxChunkPixels / chunkWidth);

    const results: any[] = [];
    const canvas = this.getReusableCanvas();
    const ctx = canvas.getContext('2d')!;

    try {
      for (let y = 0; y < naturalHeight; y += chunkHeight) {
        for (let x = 0; x < naturalWidth; x += chunkWidth) {
          const currentChunkWidth = Math.min(chunkWidth, naturalWidth - x);
          const currentChunkHeight = Math.min(chunkHeight, naturalHeight - y);

          // Set canvas size for this chunk
          canvas.width = currentChunkWidth;
          canvas.height = currentChunkHeight;

          // Draw image chunk
          ctx.drawImage(
            imageElement,
            x, y, currentChunkWidth, currentChunkHeight,
            0, 0, currentChunkWidth, currentChunkHeight
          );

          // Get image data for processing
          const imageData = ctx.getImageData(0, 0, currentChunkWidth, currentChunkHeight);
          
          // Process chunk
          const result = await processor(canvas, imageData);
          results.push(result);

          // Check memory pressure after each chunk
          if (this.isMemoryPressureHigh()) {
            await this.forceGarbageCollection();
          }
        }
      }
    } finally {
      this.returnCanvas(canvas);
    }

    return results;
  }

  /* ================================
     Memory Pressure Management
     ================================ */

  isMemoryPressureHigh(): boolean {
    const stats = this.getMemoryStats();
    return stats.heapPercentage > this.config.gcThreshold;
  }

  async forceGarbageCollection(): Promise<void> {
    // Clear temporary caches
    this.clearTemporaryCaches();

    // Release excess pool resources
    this.trimPools();

    // Force garbage collection if available
    if ((window as any).gc) {
      (window as any).gc();
    }

    // Wait a tick for GC to complete
    await new Promise(resolve => setTimeout(resolve, 10));
  }

  onMemoryPressure(callback: (pressure: number) => void): void {
    this.memoryPressureCallbacks.push(callback);
  }

  /* ================================
     Resource Optimization
     ================================ */

  optimizeForLowMemory(): void {
    // Reduce pool sizes
    this.config.canvasPoolSize = Math.max(2, Math.floor(this.config.canvasPoolSize / 2));
    this.config.imageDataPoolSize = Math.max(5, Math.floor(this.config.imageDataPoolSize / 2));
    this.config.bufferPoolSize = Math.max(3, Math.floor(this.config.bufferPoolSize / 2));

    // Enable more aggressive cleanup
    this.config.gcThreshold = 0.6;

    // Trim current pools
    this.trimPools();

    console.log('Memory manager optimized for low memory environment');
  }

  optimizeForLargeFiles(): void {
    // Increase streaming capabilities
    this.config.enableStreaming = true;
    this.config.chunkSize = Math.max(512 * 1024, this.config.chunkSize / 2); // Smaller chunks

    // Reduce pool sizes to save memory for file processing
    this.config.canvasPoolSize = 3;
    this.config.imageDataPoolSize = 5;
    
    console.log('Memory manager optimized for large file processing');
  }

  /* ================================
     Private Methods
     ================================ */

  private initializeManager(): void {
    // Pre-populate pools with small resources
    this.prePopulatePools();

    // Set up periodic memory monitoring
    this.startMemoryMonitoring();

    // Listen for memory pressure events if supported
    this.setupMemoryPressureDetection();
  }

  private prePopulatePools(): void {
    // Pre-create some small canvases
    for (let i = 0; i < Math.min(3, this.config.canvasPoolSize); i++) {
      const canvas = document.createElement('canvas');
      canvas.width = 640;
      canvas.height = 480;
      this.canvasPool.push(canvas);
    }

    // Pre-create some buffers
    for (let i = 0; i < Math.min(3, this.config.bufferPoolSize); i++) {
      const buffer = new ArrayBuffer(64 * 1024); // 64KB buffers
      this.bufferPool.push(buffer);
    }
  }

  private startMemoryMonitoring(): void {
    setInterval(() => {
      const stats = this.getMemoryStats();
      
      // Notify callbacks of memory pressure
      if (stats.heapPercentage > this.config.gcThreshold) {
        this.memoryPressureCallbacks.forEach(callback => {
          try {
            callback(stats.heapPercentage);
          } catch (error) {
            console.warn('Memory pressure callback failed:', error);
          }
        });
      }

      // Auto-cleanup if memory pressure is very high
      if (stats.heapPercentage > 0.9) {
        this.forceGarbageCollection();
      }
    }, 5000);
  }

  private setupMemoryPressureDetection(): void {
    // Use PerformanceObserver if available
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          for (const entry of entries) {
            if (entry.name === 'memory') {
              const pressure = (entry as any).pressureLevel;
              if (pressure === 'critical') {
                this.forceGarbageCollection();
              }
            }
          }
        });
        observer.observe({ entryTypes: ['memory'] });
      } catch (error) {
        console.warn('Could not set up memory pressure detection:', error);
      }
    }
  }

  private trackAllocation(type: string, size: number): void {
    const id = `${type}_${Date.now()}_${Math.random()}`;
    this.activeAllocations.set(id, {
      size,
      timestamp: Date.now()
    });

    // Auto-cleanup old allocations
    setTimeout(() => {
      this.activeAllocations.delete(id);
    }, 300000); // 5 minutes
  }

  private estimateCanvasSize(width: number, height: number): number {
    // Estimate canvas memory usage (4 bytes per pixel + overhead)
    return width * height * 4 + 1024;
  }

  private disposeCanvas(canvas: HTMLCanvasElement): void {
    // Clear canvas to help GC
    canvas.width = 1;
    canvas.height = 1;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, 1, 1);
    }
  }

  private clearTemporaryCaches(): void {
    // Clear streaming cache for old URLs
    const now = Date.now();
    for (const [url, stream] of this.streamingCache.entries()) {
      // Remove streams older than 5 minutes
      if (now - this.getStreamAge(url) > 300000) {
        try {
          const reader = stream.getReader();
          reader.cancel();
        } catch (error) {
          console.warn('Failed to cancel stream:', error);
        }
        this.streamingCache.delete(url);
      }
    }
  }

  private trimPools(): void {
    // Trim canvas pool
    while (this.canvasPool.length > this.config.canvasPoolSize / 2) {
      const canvas = this.canvasPool.pop();
      if (canvas) {
        this.disposeCanvas(canvas);
      }
    }

    // Trim buffer pool
    this.bufferPool.splice(this.config.bufferPoolSize / 2);

    // Trim image data pool
    this.imageDataPool.splice(this.config.imageDataPoolSize / 2);
  }

  private getStreamAge(url: string): number {
    // This would need to be implemented to track when streams were created
    return Date.now();
  }

  private notifyStreamingProgress(url: string, progress: number): void {
    // Could emit events for streaming progress
    window.dispatchEvent(new CustomEvent('soft-armor-streaming-progress', {
      detail: { url, progress }
    }));
  }

  /* ================================
     Cleanup and Disposal
     ================================ */

  dispose(): void {
    // Clear all pools
    this.canvasPool.forEach(canvas => this.disposeCanvas(canvas));
    this.canvasPool.length = 0;
    this.canvasInUse.clear();
    this.imageDataPool.length = 0;
    this.bufferPool.length = 0;

    // Clear caches
    this.streamingCache.clear();
    this.activeAllocations.clear();

    // Clear timers
    if (this.gcTimer) {
      clearInterval(this.gcTimer);
    }

    // Clear callbacks
    this.memoryPressureCallbacks.length = 0;
  }
}

export default MemoryManager;