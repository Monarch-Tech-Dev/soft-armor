interface PerformanceMetrics {
  frameExtractionTime: number;
  analysisTime: number;
  memoryUsage: number;
  totalTime: number;
  framesProcessed: number;
}

export class LoopDetectorOptimizer {
  private performanceHistory: PerformanceMetrics[] = [];
  private readonly MAX_HISTORY = 100;
  private memoryPool: any[] = []; // OpenCV Mat pool for reuse

  // Adaptive performance settings
  private settings = {
    maxFrames: 5,           // Max frames to analyze
    maxResolution: 640,     // Max frame resolution
    skipFrames: false,      // Skip frames if performance is poor
    useMemoryPool: true,    // Reuse OpenCV Mats
    enableGC: true          // Force garbage collection
  };

  constructor() {
    this.initializePerformanceMonitoring();
  }

  private initializePerformanceMonitoring(): void {
    // Monitor memory usage periodically
    if (typeof window !== 'undefined' && (window as any).performance) {
      setInterval(() => {
        this.checkMemoryUsage();
      }, 5000);
    }
  }

  private checkMemoryUsage(): void {
    if ((window as any).performance && (window as any).performance.memory) {
      const memory = (window as any).performance.memory;
      const usageRatio = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      
      // Adjust settings based on memory pressure
      if (usageRatio > 0.8) {
        this.settings.maxFrames = Math.max(3, this.settings.maxFrames - 1);
        this.settings.maxResolution = Math.max(320, this.settings.maxResolution - 80);
        this.settings.skipFrames = true;
        
        console.warn('High memory usage detected, reducing loop detection quality');
      } else if (usageRatio < 0.5) {
        this.settings.maxFrames = Math.min(5, this.settings.maxFrames + 1);
        this.settings.maxResolution = Math.min(640, this.settings.maxResolution + 40);
        this.settings.skipFrames = false;
      }
    }
  }

  optimizeFrameExtraction(video: HTMLVideoElement, duration: number): number[] {
    const baseFrameCount = this.settings.maxFrames;
    let frameCount = baseFrameCount;
    
    // Reduce frame count for longer videos to maintain performance
    if (duration > 30) {
      frameCount = Math.max(3, Math.floor(baseFrameCount * 0.7));
    } else if (duration > 60) {
      frameCount = 3; // Minimum for meaningful analysis
    }

    // Generate optimized time points
    const timePoints: number[] = [];
    
    if (frameCount === 3) {
      // Minimum: start, middle, end
      timePoints.push(0.1, duration * 0.5, Math.max(0.2, duration - 0.1));
    } else if (frameCount === 4) {
      // Add quarter points
      timePoints.push(0.1, duration * 0.33, duration * 0.66, Math.max(0.2, duration - 0.1));
    } else {
      // Full analysis
      timePoints.push(
        0.1,
        duration * 0.25,
        duration * 0.5,
        duration * 0.75,
        Math.max(0.2, duration - 0.1)
      );
    }

    return timePoints;
  }

  optimizeCanvasSize(videoWidth: number, videoHeight: number): { width: number; height: number } {
    const maxRes = this.settings.maxResolution;
    
    // Calculate optimal size maintaining aspect ratio
    let width = videoWidth;
    let height = videoHeight;
    
    if (width > maxRes || height > maxRes) {
      const aspectRatio = width / height;
      
      if (width > height) {
        width = maxRes;
        height = Math.round(maxRes / aspectRatio);
      } else {
        height = maxRes;
        width = Math.round(maxRes * aspectRatio);
      }
    }

    // Ensure dimensions are even (better for OpenCV)
    width = Math.floor(width / 2) * 2;
    height = Math.floor(height / 2) * 2;

    return { width, height };
  }

  getMatFromPool(rows: number, cols: number, type: number, cv: any): any {
    if (!this.settings.useMemoryPool) {
      return new cv.Mat(rows, cols, type);
    }

    // Try to find a reusable mat of the same size
    for (let i = 0; i < this.memoryPool.length; i++) {
      const mat = this.memoryPool[i];
      if (mat.rows === rows && mat.cols === cols && mat.type() === type) {
        this.memoryPool.splice(i, 1);
        return mat;
      }
    }

    // Create new mat if none available
    return new cv.Mat(rows, cols, type);
  }

  returnMatToPool(mat: any): void {
    if (!this.settings.useMemoryPool || this.memoryPool.length > 10) {
      // Don't pool too many mats or if pooling is disabled
      if (mat && typeof mat.delete === 'function') {
        mat.delete();
      }
      return;
    }

    this.memoryPool.push(mat);
  }

  forceCleanup(): void {
    // Clean up memory pool
    for (const mat of this.memoryPool) {
      if (mat && typeof mat.delete === 'function') {
        mat.delete();
      }
    }
    this.memoryPool = [];

    // Force garbage collection if available
    if (this.settings.enableGC && (window as any).gc) {
      (window as any).gc();
    }
  }

  recordPerformance(metrics: PerformanceMetrics): void {
    this.performanceHistory.push(metrics);
    
    // Keep only recent history
    if (this.performanceHistory.length > this.MAX_HISTORY) {
      this.performanceHistory.shift();
    }

    // Analyze performance trends
    this.analyzePerformanceTrends();
  }

  private analyzePerformanceTrends(): void {
    if (this.performanceHistory.length < 5) return;

    const recent = this.performanceHistory.slice(-5);
    const avgTime = recent.reduce((sum, m) => sum + m.totalTime, 0) / recent.length;
    const avgMemory = recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length;

    // Adjust settings based on performance
    if (avgTime > 3000) { // More than 3 seconds
      this.settings.maxFrames = Math.max(3, this.settings.maxFrames - 1);
      console.warn('Slow loop detection performance, reducing frame count');
    } else if (avgTime < 1000 && this.settings.maxFrames < 5) { // Less than 1 second
      this.settings.maxFrames = Math.min(5, this.settings.maxFrames + 1);
    }

    if (avgMemory > 50 * 1024 * 1024) { // More than 50MB
      this.settings.maxResolution = Math.max(320, this.settings.maxResolution - 80);
      console.warn('High memory usage in loop detection, reducing resolution');
    }
  }

  getPerformanceReport(): any {
    if (this.performanceHistory.length === 0) {
      return { message: 'No performance data available' };
    }

    const recent = this.performanceHistory.slice(-10);
    return {
      averageTime: recent.reduce((sum, m) => sum + m.totalTime, 0) / recent.length,
      averageMemory: recent.reduce((sum, m) => sum + m.memoryUsage, 0) / recent.length,
      averageFrames: recent.reduce((sum, m) => sum + m.framesProcessed, 0) / recent.length,
      currentSettings: { ...this.settings },
      memoryPoolSize: this.memoryPool.length
    };
  }

  shouldSkipAnalysis(videoSize: number, duration: number): boolean {
    // Skip analysis for very large or very long videos if performance is poor
    if (!this.settings.skipFrames) return false;

    const recentPerformance = this.performanceHistory.slice(-3);
    if (recentPerformance.length === 0) return false;

    const avgTime = recentPerformance.reduce((sum, m) => sum + m.totalTime, 0) / recentPerformance.length;
    
    // Skip if recent performance was poor and current video is challenging
    return avgTime > 5000 && (videoSize > 10 * 1024 * 1024 || duration > 120);
  }

  optimizeOpenCVOperation(operation: () => any): any {
    const startTime = performance.now();
    let result;

    try {
      result = operation();
    } finally {
      const endTime = performance.now();
      
      // If operation took too long, consider skipping similar operations
      if (endTime - startTime > 1000) {
        this.settings.skipFrames = true;
        console.warn('Slow OpenCV operation detected, enabling frame skipping');
      }
    }

    return result;
  }

  // Adaptive thresholds based on performance and video characteristics
  getAdaptiveThresholds(videoQuality: 'low' | 'medium' | 'high'): {
    similarity: number;
    motion: number;
    opticalFlow: number;
  } {
    const baseThresholds = {
      similarity: 0.85,
      motion: 0.9,
      opticalFlow: 0.8
    };

    // Adjust thresholds based on video quality and performance
    switch (videoQuality) {
      case 'low':
        return {
          similarity: baseThresholds.similarity - 0.1,
          motion: baseThresholds.motion - 0.1,
          opticalFlow: baseThresholds.opticalFlow - 0.1
        };
      case 'high':
        return {
          similarity: baseThresholds.similarity + 0.05,
          motion: baseThresholds.motion + 0.05,
          opticalFlow: baseThresholds.opticalFlow + 0.05
        };
      default:
        return baseThresholds;
    }
  }

  estimateVideoQuality(width: number, height: number, duration: number): 'low' | 'medium' | 'high' {
    const pixels = width * height;
    
    if (pixels < 320 * 240 || duration < 3) {
      return 'low';
    } else if (pixels > 1280 * 720 || duration > 60) {
      return 'high';
    } else {
      return 'medium';
    }
  }
}