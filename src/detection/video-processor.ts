interface VideoProcessingOptions {
  maxDuration?: number; // Maximum processing time in seconds
  targetScanTime?: number; // Target scan completion time
  enableCaching?: boolean;
  progressCallback?: (progress: number) => void;
  qualityMode?: 'fast' | 'balanced' | 'thorough';
}

interface VideoMetadata {
  format: string;
  duration: number;
  width: number;
  height: number;
  frameRate: number;
  bitrate?: number;
  codec?: string;
  fileSize: number;
}

interface ProcessingResult {
  success: boolean;
  processingTime: number;
  framesAnalyzed: number;
  cacheHit: boolean;
  metadata: VideoMetadata;
  error?: string;
}

interface CacheEntry {
  url: string;
  hash: string;
  result: any;
  timestamp: number;
  metadata: VideoMetadata;
}

export class VideoProcessor {
  private cache = new Map<string, CacheEntry>();
  private readonly CACHE_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
  private readonly MAX_CACHE_SIZE = 100;
  private readonly SUPPORTED_FORMATS = ['mp4', 'webm', 'mov', 'avi', 'mkv', 'ogg'];
  
  // Performance thresholds for different quality modes
  private readonly QUALITY_SETTINGS = {
    fast: {
      maxFrames: 3,
      resolution: { width: 320, height: 240 },
      timeout: 1000
    },
    balanced: {
      maxFrames: 5,
      resolution: { width: 640, height: 480 },
      timeout: 2000
    },
    thorough: {
      maxFrames: 8,
      resolution: { width: 1280, height: 720 },
      timeout: 5000
    }
  };

  constructor() {
    this.initializeCache();
    this.setupPerformanceMonitoring();
  }

  async processVideo(
    videoUrl: string, 
    options: VideoProcessingOptions = {}
  ): Promise<ProcessingResult> {
    const startTime = performance.now();
    const {
      targetScanTime = 2000,
      enableCaching = true,
      progressCallback,
      qualityMode = 'balanced'
    } = options;

    try {
      // Step 1: Check format support and generate cache key
      progressCallback?.(0.1);
      const cacheKey = await this.generateCacheKey(videoUrl);
      
      // Step 2: Check cache first
      if (enableCaching) {
        const cached = this.getFromCache(cacheKey);
        if (cached) {
          progressCallback?.(1.0);
          return {
            success: true,
            processingTime: performance.now() - startTime,
            framesAnalyzed: 0,
            cacheHit: true,
            metadata: cached.metadata,
          };
        }
      }

      progressCallback?.(0.2);

      // Step 3: Validate video format
      const formatSupported = await this.validateVideoFormat(videoUrl);
      if (!formatSupported) {
        throw new Error('Unsupported video format');
      }

      progressCallback?.(0.3);

      // Step 4: Extract metadata
      const metadata = await this.extractVideoMetadata(videoUrl);
      
      progressCallback?.(0.4);

      // Step 5: Optimize processing strategy based on video characteristics
      const strategy = this.optimizeProcessingStrategy(metadata, targetScanTime, qualityMode);
      
      progressCallback?.(0.5);

      // Step 6: Create optimized video element
      const videoElement = await this.createOptimizedVideoElement(videoUrl, strategy);
      
      progressCallback?.(0.6);

      // Step 7: Process with adaptive frame extraction
      const result = await this.processWithStrategy(videoElement, strategy, progressCallback);
      
      progressCallback?.(0.9);

      // Step 8: Cache the result
      if (enableCaching && result.success) {
        this.saveToCache(cacheKey, result, metadata);
      }

      // Cleanup
      this.cleanupVideoElement(videoElement);
      
      progressCallback?.(1.0);

      return {
        ...result,
        processingTime: performance.now() - startTime,
        cacheHit: false,
        metadata
      };

    } catch (error) {
      console.warn('Video processing failed:', error);
      return {
        success: false,
        processingTime: performance.now() - startTime,
        framesAnalyzed: 0,
        cacheHit: false,
        metadata: {} as VideoMetadata,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  private async validateVideoFormat(videoUrl: string): Promise<boolean> {
    try {
      // Check file extension first
      const extension = this.extractFileExtension(videoUrl);
      if (!this.SUPPORTED_FORMATS.includes(extension.toLowerCase())) {
        return false;
      }

      // Try to create video element to validate format support
      const video = document.createElement('video');
      video.style.display = 'none';
      
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => {
          document.body.removeChild(video);
          resolve(false);
        }, 3000);

        video.onloadedmetadata = () => {
          clearTimeout(timeout);
          document.body.removeChild(video);
          resolve(true);
        };

        video.onerror = () => {
          clearTimeout(timeout);
          if (document.body.contains(video)) {
            document.body.removeChild(video);
          }
          resolve(false);
        };

        video.src = videoUrl;
        video.preload = 'metadata';
        document.body.appendChild(video);
      });

    } catch (error) {
      console.warn('Format validation failed:', error);
      return false;
    }
  }

  private async extractVideoMetadata(videoUrl: string): Promise<VideoMetadata> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.style.display = 'none';
      video.crossOrigin = 'anonymous';
      video.preload = 'metadata';

      const timeout = setTimeout(() => {
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
        reject(new Error('Metadata extraction timeout'));
      }, 5000);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        
        const metadata: VideoMetadata = {
          format: this.extractFileExtension(videoUrl),
          duration: video.duration || 0,
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
          frameRate: this.estimateFrameRate(video),
          fileSize: 0 // Will be estimated
        };

        document.body.removeChild(video);
        resolve(metadata);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
        reject(new Error('Failed to load video metadata'));
      };

      video.src = videoUrl;
      document.body.appendChild(video);
    });
  }

  private optimizeProcessingStrategy(
    metadata: VideoMetadata, 
    targetTime: number, 
    qualityMode: 'fast' | 'balanced' | 'thorough'
  ) {
    const settings = this.QUALITY_SETTINGS[qualityMode];
    const complexity = this.calculateVideoComplexity(metadata);
    
    // Adaptive frame count based on video duration and target time
    let frameCount = settings.maxFrames;
    if (metadata.duration > 10) {
      frameCount = Math.max(3, Math.floor(settings.maxFrames * (targetTime / 2000)));
    }

    // Adaptive resolution based on original video size and performance target
    let { width, height } = settings.resolution;
    if (complexity > 0.7) {
      width = Math.floor(width * 0.75);
      height = Math.floor(height * 0.75);
    }

    return {
      frameCount,
      resolution: { width, height },
      timeout: settings.timeout,
      skipFrames: metadata.duration > 30 ? 2 : 1, // Skip frames for very long videos
      useWebGL: complexity < 0.5, // Use WebGL acceleration for simpler videos
      priority: qualityMode === 'fast' ? 'speed' : 'accuracy'
    };
  }

  private calculateVideoComplexity(metadata: VideoMetadata): number {
    // Calculate complexity score (0-1) based on video characteristics
    const resolutionFactor = (metadata.width * metadata.height) / (1920 * 1080);
    const durationFactor = Math.min(metadata.duration / 60, 1);
    const frameRateFactor = metadata.frameRate / 60;
    
    return Math.min(1, (resolutionFactor + durationFactor + frameRateFactor) / 3);
  }

  private async createOptimizedVideoElement(videoUrl: string, strategy: any): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      video.style.display = 'none';
      
      // Optimize video element based on strategy
      if (strategy.useWebGL) {
        video.setAttribute('webkit-playsinline', 'true');
        video.setAttribute('playsinline', 'true');
      }

      const timeout = setTimeout(() => {
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
        reject(new Error('Video loading timeout'));
      }, strategy.timeout);

      video.onloadedmetadata = () => {
        clearTimeout(timeout);
        resolve(video);
      };

      video.onerror = () => {
        clearTimeout(timeout);
        if (document.body.contains(video)) {
          document.body.removeChild(video);
        }
        reject(new Error('Video loading failed'));
      };

      document.body.appendChild(video);
    });
  }

  private async processWithStrategy(
    video: HTMLVideoElement, 
    strategy: any, 
    progressCallback?: (progress: number) => void
  ): Promise<{ success: boolean; framesAnalyzed: number }> {
    try {
      const duration = video.duration || 0;
      const frames: number[] = [];
      
      // Generate optimal time points for frame extraction
      for (let i = 0; i < strategy.frameCount; i++) {
        const timePoint = (duration / (strategy.frameCount + 1)) * (i + 1);
        frames.push(timePoint);
      }

      let framesAnalyzed = 0;
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      canvas.width = strategy.resolution.width;
      canvas.height = strategy.resolution.height;

      // Process frames with progress updates
      for (let i = 0; i < frames.length; i++) {
        const timePoint = frames[i];
        
        try {
          await this.extractFrameAtTime(video, timePoint, canvas, ctx);
          framesAnalyzed++;
          
          // Update progress (0.6 to 0.9 range)
          const frameProgress = 0.6 + (0.3 * (i + 1) / frames.length);
          progressCallback?.(frameProgress);
          
        } catch (error) {
          console.warn(`Failed to extract frame at ${timePoint}s:`, error);
        }
      }

      return {
        success: framesAnalyzed > 0,
        framesAnalyzed
      };

    } catch (error) {
      console.warn('Strategy processing failed:', error);
      return {
        success: false,
        framesAnalyzed: 0
      };
    }
  }

  private async extractFrameAtTime(
    video: HTMLVideoElement,
    time: number,
    canvas: HTMLCanvasElement,
    ctx: CanvasRenderingContext2D
  ): Promise<void> {
    return new Promise((resolve, reject) => {
      const onSeeked = () => {
        try {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          video.removeEventListener('seeked', onSeeked);
          resolve();
        } catch (error) {
          video.removeEventListener('seeked', onSeeked);
          reject(error);
        }
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;

      // Timeout for frame extraction
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        reject(new Error('Frame extraction timeout'));
      }, 1000);
    });
  }

  private extractFileExtension(url: string): string {
    const match = url.match(/\.([^.?#]+)(?:\?|#|$)/);
    return match ? match[1] : '';
  }

  private estimateFrameRate(video: HTMLVideoElement): number {
    // Estimate frame rate (fallback to common values)
    return 30; // Most web videos are 30fps
  }

  private async generateCacheKey(videoUrl: string): Promise<string> {
    // Generate a hash-based cache key
    const encoder = new TextEncoder();
    const data = encoder.encode(videoUrl);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }

  private getFromCache(key: string): CacheEntry | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    
    // Check if cache entry is still valid
    if (Date.now() - entry.timestamp > this.CACHE_EXPIRY) {
      this.cache.delete(key);
      return null;
    }
    
    return entry;
  }

  private saveToCache(key: string, result: any, metadata: VideoMetadata): void {
    // Implement LRU cache eviction
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }
    
    this.cache.set(key, {
      url: key,
      hash: key,
      result,
      timestamp: Date.now(),
      metadata
    });
  }

  private initializeCache(): void {
    // Load cache from localStorage if available
    try {
      const stored = localStorage.getItem('soft-armor-video-cache');
      if (stored) {
        const data = JSON.parse(stored);
        Object.entries(data).forEach(([key, value]) => {
          this.cache.set(key, value as CacheEntry);
        });
      }
    } catch (error) {
      console.warn('Failed to load cache from localStorage:', error);
    }
  }

  private setupPerformanceMonitoring(): void {
    // Save cache to localStorage periodically
    setInterval(() => {
      try {
        const cacheData = Object.fromEntries(this.cache.entries());
        localStorage.setItem('soft-armor-video-cache', JSON.stringify(cacheData));
      } catch (error) {
        console.warn('Failed to save cache to localStorage:', error);
      }
    }, 60000); // Save every minute
  }

  private cleanupVideoElement(video: HTMLVideoElement): void {
    try {
      if (document.body.contains(video)) {
        document.body.removeChild(video);
      }
    } catch (error) {
      console.warn('Video element cleanup failed:', error);
    }
  }

  // Public methods for cache management
  public clearCache(): void {
    this.cache.clear();
    localStorage.removeItem('soft-armor-video-cache');
  }

  public getCacheStats(): { size: number; maxSize: number; hitRate: number } {
    return {
      size: this.cache.size,
      maxSize: this.MAX_CACHE_SIZE,
      hitRate: 0 // TODO: Implement hit rate tracking
    };
  }

  public getSupportedFormats(): string[] {
    return [...this.SUPPORTED_FORMATS];
  }
}