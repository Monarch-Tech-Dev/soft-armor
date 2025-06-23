/* ================================
   Browser Compatibility System
   Graceful Degradation for Older Browsers
   ================================ */

export interface BrowserCapabilities {
  supportsWebWorkers: boolean;
  supportsOffscreenCanvas: boolean;
  supportsImageBitmap: boolean;
  supportsWasm: boolean;
  supportsWebGL: boolean;
  supportsCanvas2D: boolean;
  supportsFileAPI: boolean;
  supportsStreams: boolean;
  supportsPerformanceAPI: boolean;
  supportsIntersectionObserver: boolean;
  browserName: string;
  browserVersion: string;
  isModern: boolean;
}

export interface CompatibilityConfig {
  enableFallbacks: boolean;
  maxRetries: number;
  fallbackTimeout: number;
  polyfillUrls: Map<string, string>;
  featureFallbacks: Map<string, () => void>;
}

export class BrowserCompatibility {
  private capabilities: BrowserCapabilities;
  private config: CompatibilityConfig;
  private polyfillsLoaded: Set<string> = new Set();
  private fallbacksEnabled: Set<string> = new Set();

  constructor(config?: Partial<CompatibilityConfig>) {
    this.config = {
      enableFallbacks: true,
      maxRetries: 3,
      fallbackTimeout: 5000,
      polyfillUrls: new Map([
        ['webworker', 'https://cdn.jsdelivr.net/npm/webworker-polyfill@1.0.0/webworker.min.js'],
        ['intersection-observer', 'https://polyfill.io/v3/polyfill.min.js?features=IntersectionObserver'],
        ['performance', 'https://polyfill.io/v3/polyfill.min.js?features=performance.now']
      ]),
      featureFallbacks: new Map(),
      ...config
    };

    this.capabilities = this.detectCapabilities();
    this.setupFallbacks();
  }

  /* ================================
     Capability Detection
     ================================ */

  private detectCapabilities(): BrowserCapabilities {
    const userAgent = navigator.userAgent;
    const browserInfo = this.parseBrowserInfo(userAgent);

    return {
      supportsWebWorkers: this.detectWebWorkers(),
      supportsOffscreenCanvas: this.detectOffscreenCanvas(),
      supportsImageBitmap: this.detectImageBitmap(),
      supportsWasm: this.detectWebAssembly(),
      supportsWebGL: this.detectWebGL(),
      supportsCanvas2D: this.detectCanvas2D(),
      supportsFileAPI: this.detectFileAPI(),
      supportsStreams: this.detectStreams(),
      supportsPerformanceAPI: this.detectPerformanceAPI(),
      supportsIntersectionObserver: this.detectIntersectionObserver(),
      browserName: browserInfo.name,
      browserVersion: browserInfo.version,
      isModern: this.isModernBrowser(browserInfo)
    };
  }

  private detectWebWorkers(): boolean {
    return typeof Worker !== 'undefined';
  }

  private detectOffscreenCanvas(): boolean {
    return typeof OffscreenCanvas !== 'undefined';
  }

  private detectImageBitmap(): boolean {
    return typeof ImageBitmap !== 'undefined' && typeof createImageBitmap === 'function';
  }

  private detectWebAssembly(): boolean {
    return typeof WebAssembly !== 'undefined';
  }

  private detectWebGL(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      return !!gl;
    } catch {
      return false;
    }
  }

  private detectCanvas2D(): boolean {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      return !!ctx;
    } catch {
      return false;
    }
  }

  private detectFileAPI(): boolean {
    return typeof File !== 'undefined' && 
           typeof FileReader !== 'undefined' && 
           typeof FileList !== 'undefined' && 
           typeof Blob !== 'undefined';
  }

  private detectStreams(): boolean {
    return typeof ReadableStream !== 'undefined' && 
           typeof WritableStream !== 'undefined';
  }

  private detectPerformanceAPI(): boolean {
    return typeof performance !== 'undefined' && 
           typeof performance.now === 'function';
  }

  private detectIntersectionObserver(): boolean {
    return typeof IntersectionObserver !== 'undefined';
  }

  private parseBrowserInfo(userAgent: string): { name: string; version: string } {
    const browsers = [
      { name: 'Chrome', pattern: /Chrome\/(\d+)/ },
      { name: 'Firefox', pattern: /Firefox\/(\d+)/ },
      { name: 'Safari', pattern: /Safari\/(\d+)/ },
      { name: 'Edge', pattern: /Edge\/(\d+)/ },
      { name: 'Opera', pattern: /Opera\/(\d+)/ },
      { name: 'IE', pattern: /MSIE (\d+)/ }
    ];

    for (const browser of browsers) {
      const match = userAgent.match(browser.pattern);
      if (match) {
        return {
          name: browser.name,
          version: match[1]
        };
      }
    }

    return { name: 'Unknown', version: '0' };
  }

  private isModernBrowser(browserInfo: { name: string; version: string }): boolean {
    const minVersions = {
      'Chrome': 80,
      'Firefox': 75,
      'Safari': 13,
      'Edge': 80,
      'Opera': 67
    };

    const minVersion = minVersions[browserInfo.name as keyof typeof minVersions];
    return minVersion ? parseInt(browserInfo.version) >= minVersion : false;
  }

  /* ================================
     Public API
     ================================ */

  getCapabilities(): BrowserCapabilities {
    return { ...this.capabilities };
  }

  isFeatureSupported(feature: keyof BrowserCapabilities): boolean {
    return this.capabilities[feature] as boolean;
  }

  supportsWebWorkers(): boolean {
    return this.capabilities.supportsWebWorkers;
  }

  supportsModernFeatures(): boolean {
    return this.capabilities.isModern &&
           this.capabilities.supportsWebWorkers &&
           this.capabilities.supportsCanvas2D &&
           this.capabilities.supportsPerformanceAPI;
  }

  async enableFeature(feature: string): Promise<boolean> {
    if (this.isFeatureNativelySupported(feature)) {
      return true;
    }

    if (this.config.enableFallbacks) {
      return await this.loadPolyfillFor(feature);
    }

    return false;
  }

  /* ================================
     Fallback Management
     ================================ */

  private setupFallbacks(): void {
    // Setup performance API fallback
    this.config.featureFallbacks.set('performance', () => {
      if (!window.performance) {
        window.performance = {} as Performance;
      }
      if (!window.performance.now) {
        window.performance.now = () => Date.now();
      }
    });

    // Setup canvas fallback
    this.config.featureFallbacks.set('canvas', () => {
      if (!this.capabilities.supportsCanvas2D) {
        console.warn('Canvas 2D not supported, media analysis will be limited');
      }
    });

    // Setup web worker fallback
    this.config.featureFallbacks.set('webworker', () => {
      if (!this.capabilities.supportsWebWorkers) {
        // Create a fake Worker that runs synchronously
        (window as any).Worker = class FakeWorker {
          onmessage: ((event: MessageEvent) => void) | null = null;
          onerror: ((event: ErrorEvent) => void) | null = null;

          constructor(scriptURL: string) {
            console.warn('Web Workers not supported, using synchronous fallback');
          }

          postMessage(message: any): void {
            // Simulate async behavior
            setTimeout(() => {
              if (this.onmessage) {
                this.onmessage({ data: { error: 'Worker not supported' } } as MessageEvent);
              }
            }, 0);
          }

          terminate(): void {
            // No-op for fake worker
          }
        };
      }
    });

    // Setup streams fallback
    this.config.featureFallbacks.set('streams', () => {
      if (!this.capabilities.supportsStreams) {
        // Polyfill basic ReadableStream
        if (!window.ReadableStream) {
          (window as any).ReadableStream = class FakeReadableStream {
            constructor(underlyingSource: any) {
              console.warn('ReadableStream not supported, using basic fallback');
            }

            getReader() {
              return {
                read: () => Promise.resolve({ done: true, value: undefined }),
                cancel: () => Promise.resolve(),
                releaseLock: () => {}
              };
            }
          };
        }
      }
    });
  }

  private isFeatureNativelySupported(feature: string): boolean {
    switch (feature) {
      case 'webworkers':
        return this.capabilities.supportsWebWorkers;
      case 'canvas':
        return this.capabilities.supportsCanvas2D;
      case 'performance':
        return this.capabilities.supportsPerformanceAPI;
      case 'streams':
        return this.capabilities.supportsStreams;
      case 'intersection-observer':
        return this.capabilities.supportsIntersectionObserver;
      default:
        return false;
    }
  }

  private async loadPolyfillFor(feature: string): Promise<boolean> {
    if (this.polyfillsLoaded.has(feature)) {
      return true;
    }

    const polyfillUrl = this.config.polyfillUrls.get(feature);
    if (polyfillUrl) {
      try {
        await this.loadScript(polyfillUrl);
        this.polyfillsLoaded.add(feature);
        return true;
      } catch (error) {
        console.warn(`Failed to load polyfill for ${feature}:`, error);
      }
    }

    // Try fallback implementation
    const fallback = this.config.featureFallbacks.get(feature);
    if (fallback) {
      fallback();
      this.fallbacksEnabled.add(feature);
      return true;
    }

    return false;
  }

  private loadScript(url: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = url;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error(`Failed to load script: ${url}`));
      
      setTimeout(() => {
        reject(new Error(`Script load timeout: ${url}`));
      }, this.config.fallbackTimeout);

      document.head.appendChild(script);
    });
  }

  /* ================================
     Adaptive Performance
     ================================ */

  getOptimalConfig(): {
    useWebWorkers: boolean;
    maxConcurrentScans: number;
    enableStreaming: boolean;
    chunkSize: number;
    enableCaching: boolean;
  } {
    const isModern = this.capabilities.isModern;
    const hasWorkers = this.capabilities.supportsWebWorkers;
    const hasStreams = this.capabilities.supportsStreams;

    return {
      useWebWorkers: hasWorkers && isModern,
      maxConcurrentScans: isModern ? 3 : 1,
      enableStreaming: hasStreams && isModern,
      chunkSize: isModern ? 1024 * 1024 : 512 * 1024, // 1MB vs 512KB
      enableCaching: isModern
    };
  }

  createCompatibleCanvas(): HTMLCanvasElement | null {
    if (!this.capabilities.supportsCanvas2D) {
      console.error('Canvas 2D not supported');
      return null;
    }

    const canvas = document.createElement('canvas');
    
    // Set conservative defaults for older browsers
    if (!this.capabilities.isModern) {
      canvas.width = 640;
      canvas.height = 480;
    }

    return canvas;
  }

  createCompatibleWorker(scriptUrl: string): Worker | null {
    if (!this.capabilities.supportsWebWorkers) {
      console.warn('Web Workers not supported, operations will run on main thread');
      return null;
    }

    try {
      return new Worker(scriptUrl);
    } catch (error) {
      console.error('Failed to create worker:', error);
      return null;
    }
  }

  /* ================================
     Performance Optimization
     ================================ */

  optimizeForBrowser(): {
    recommendations: string[];
    adjustedConfig: any;
  } {
    const recommendations: string[] = [];
    const adjustedConfig: any = {};

    if (!this.capabilities.isModern) {
      recommendations.push('Consider updating browser for better performance');
      adjustedConfig.reduceQuality = true;
      adjustedConfig.disableAdvancedFeatures = true;
    }

    if (!this.capabilities.supportsWebWorkers) {
      recommendations.push('Web Workers not supported, processing will be slower');
      adjustedConfig.useMainThread = true;
    }

    if (!this.capabilities.supportsWasm) {
      recommendations.push('WebAssembly not supported, falling back to JavaScript');
      adjustedConfig.useJavaScript = true;
    }

    if (!this.capabilities.supportsWebGL) {
      recommendations.push('WebGL not available, GPU acceleration disabled');
      adjustedConfig.disableGPU = true;
    }

    // Browser-specific optimizations
    switch (this.capabilities.browserName) {
      case 'Firefox':
        adjustedConfig.preferCanvas = true;
        break;
      case 'Safari':
        adjustedConfig.limitConcurrency = true;
        break;
      case 'IE':
        adjustedConfig.usePolyfills = true;
        adjustedConfig.reducedFeatureSet = true;
        break;
    }

    return { recommendations, adjustedConfig };
  }

  /* ================================
     Error Handling & Recovery
     ================================ */

  async handleFeatureFailure(feature: string, error: Error): Promise<boolean> {
    console.warn(`Feature ${feature} failed:`, error);

    // Try to enable fallback
    if (this.config.enableFallbacks) {
      const fallbackEnabled = await this.enableFeature(feature);
      if (fallbackEnabled) {
        console.log(`Fallback enabled for ${feature}`);
        return true;
      }
    }

    // Log degradation
    this.logDegradation(feature, error);
    return false;
  }

  private logDegradation(feature: string, error: Error): void {
    const degradationEvent = {
      feature,
      error: error.message,
      browser: this.capabilities.browserName,
      version: this.capabilities.browserVersion,
      timestamp: Date.now()
    };

    // Could send to analytics or logging service
    console.warn('Feature degradation:', degradationEvent);
  }

  /* ================================
     Legacy Browser Support
     ================================ */

  createLegacyCompatibleImageProcessor(): {
    processImage: (imageElement: HTMLImageElement) => Promise<any>;
    processVideo: (videoElement: HTMLVideoElement) => Promise<any>;
  } {
    return {
      processImage: async (imageElement: HTMLImageElement) => {
        // Simple image processing for legacy browsers
        const canvas = this.createCompatibleCanvas();
        if (!canvas) {
          throw new Error('Canvas not supported');
        }

        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.min(imageElement.naturalWidth, 800);
        canvas.height = Math.min(imageElement.naturalHeight, 600);
        
        ctx.drawImage(imageElement, 0, 0, canvas.width, canvas.height);
        
        // Basic pixel analysis
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        return this.performBasicAnalysis(imageData);
      },

      processVideo: async (videoElement: HTMLVideoElement) => {
        // Simple video processing for legacy browsers
        const canvas = this.createCompatibleCanvas();
        if (!canvas) {
          throw new Error('Canvas not supported');
        }

        const ctx = canvas.getContext('2d')!;
        canvas.width = Math.min(videoElement.videoWidth, 640);
        canvas.height = Math.min(videoElement.videoHeight, 480);

        // Sample just a few frames
        const frameCount = 3;
        const analyses = [];

        for (let i = 0; i < frameCount; i++) {
          const time = (videoElement.duration / frameCount) * i;
          
          try {
            videoElement.currentTime = time;
            await new Promise(resolve => {
              videoElement.addEventListener('seeked', resolve, { once: true });
            });

            ctx.drawImage(videoElement, 0, 0, canvas.width, canvas.height);
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
            analyses.push(this.performBasicAnalysis(imageData));
          } catch (error) {
            console.warn(`Failed to process frame ${i}:`, error);
          }
        }

        return {
          frameAnalyses: analyses,
          averageComplexity: analyses.reduce((sum, a) => sum + a.complexity, 0) / analyses.length
        };
      }
    };
  }

  private performBasicAnalysis(imageData: ImageData): any {
    const { data } = imageData;
    let brightness = 0;
    const contrast = 0;
    
    // Sample every 10th pixel for performance
    for (let i = 0; i < data.length; i += 40) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      
      brightness += (r + g + b) / 3;
    }

    const pixelCount = data.length / 40;
    brightness /= pixelCount;

    return {
      brightness,
      complexity: brightness > 128 ? 0.6 : 0.4,
      quality: 'basic'
    };
  }

  /* ================================
     Utility Methods
     ================================ */

  dispose(): void {
    // Clean up any resources
    this.polyfillsLoaded.clear();
    this.fallbacksEnabled.clear();
  }
}

export default BrowserCompatibility;