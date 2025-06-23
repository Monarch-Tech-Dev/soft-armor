/* ================================
   Fast Scan Engine
   Sub-2-Second Performance Target
   ================================ */

import { PerformanceMonitor } from './performance-monitor';
import { MemoryManager } from './memory-manager';
import { BrowserCompatibility } from './browser-compatibility';

export interface FastScanConfig {
  maxScanTime: number;          // Maximum scan time in ms (default: 2000)
  priorityMode: 'speed' | 'accuracy' | 'balanced';
  enableParallelProcessing: boolean;
  maxImageSize: number;         // Max image resolution to process
  maxVideoFrames: number;       // Max video frames to analyze
  enableWebWorkers: boolean;    // Use web workers for heavy computation
  fallbackMode: boolean;        // Enable fallback for older browsers
}

export interface ScanResult {
  authenticity: 'safe' | 'warning' | 'danger';
  confidence: number;           // 0-1 confidence score
  processingTime: number;       // Actual processing time
  detectionMethods: string[];   // Which methods were used
  performance: {
    imageProcessingTime: number;
    c2paCheckTime: number;
    mlAnalysisTime: number;
    totalMemoryUsed: number;
  };
}

export class FastScanEngine {
  private performanceMonitor: PerformanceMonitor;
  private memoryManager: MemoryManager;
  private browserCompat: BrowserCompatibility;
  private scanConfig: FastScanConfig;
  private workerPool: Worker[] = [];
  private scanQueue: Array<{ resolve: Function; reject: Function; task: any }> = [];
  private activeScanCount = 0;
  private readonly MAX_CONCURRENT_SCANS = 3;

  constructor(config?: Partial<FastScanConfig>) {
    this.scanConfig = {
      maxScanTime: 2000,
      priorityMode: 'balanced',
      enableParallelProcessing: true,
      maxImageSize: 1920,
      maxVideoFrames: 8,
      enableWebWorkers: true,
      fallbackMode: true,
      ...config
    };

    this.performanceMonitor = new PerformanceMonitor();
    this.memoryManager = new MemoryManager();
    this.browserCompat = new BrowserCompatibility();

    this.initializeEngine();
  }

  /* ================================
     Core Scanning API
     ================================ */

  async scanMedia(mediaUrl: string, mediaElement?: HTMLImageElement | HTMLVideoElement): Promise<ScanResult> {
    const scanStartTime = performance.now();
    console.log('🚀 FastScanEngine.scanMedia started for:', mediaUrl);
    
    // Check if we can handle this scan
    if (this.activeScanCount >= this.MAX_CONCURRENT_SCANS) {
      console.log('📋 Queuing scan due to concurrent limit');
      return this.queueScan(mediaUrl, mediaElement);
    }

    this.activeScanCount++;
    
    try {
      // Fast path detection
      console.log('🔍 Trying fast path detection...');
      const fastResult = await this.tryFastPath(mediaUrl, mediaElement);
      if (fastResult) {
        console.log('✅ Fast path completed:', fastResult.authenticity);
        return fastResult;
      }

      // Full scan with optimization
      console.log('🔄 Performing optimized scan...');
      return await this.performOptimizedScan(mediaUrl, mediaElement, scanStartTime);
    } catch (error) {
      console.error('❌ Fast scan failed:', error);
      return this.createErrorResult(scanStartTime, error);
    } finally {
      this.activeScanCount--;
      this.processQueue();
      console.log('🏁 FastScanEngine.scanMedia completed in', performance.now() - scanStartTime, 'ms');
    }
  }

  /* ================================
     Fast Path Detection
     ================================ */

  private async tryFastPath(mediaUrl: string, mediaElement?: HTMLElement): Promise<ScanResult | null> {
    const startTime = performance.now();
    console.log('🔍 Fast path: starting for', mediaUrl);

    // Cache check
    const cacheKey = this.generateCacheKey(mediaUrl);
    const cached = this.getFromCache(cacheKey);
    if (cached && this.isCacheValid(cached)) {
      console.log('💾 Fast path: cache hit');
      return {
        ...cached.result,
        processingTime: performance.now() - startTime
      };
    }

    // Quick heuristics
    console.log('🧠 Fast path: performing quick heuristics...');
    const quickCheck = await this.performQuickHeuristics(mediaUrl, mediaElement);
    console.log('🧠 Fast path: heuristics result:', quickCheck);
    
    if (quickCheck.confidence > 0.8) {
      console.log('✅ Fast path: high confidence result, returning early');
      const result = {
        authenticity: quickCheck.authenticity,
        confidence: quickCheck.confidence,
        processingTime: performance.now() - startTime,
        detectionMethods: ['quick-heuristics'],
        performance: {
          imageProcessingTime: 0,
          c2paCheckTime: 0,
          mlAnalysisTime: 0,
          totalMemoryUsed: this.memoryManager.getCurrentUsage()
        }
      } as ScanResult;

      this.cacheResult(cacheKey, result);
      return result;
    }

    console.log('⏭️ Fast path: confidence too low, proceeding to full scan');
    return null;
  }

  /* ================================
     Optimized Full Scan
     ================================ */

  private async performOptimizedScan(
    mediaUrl: string, 
    mediaElement?: HTMLElement, 
    scanStartTime: number
  ): Promise<ScanResult> {
    const timeRemaining = this.scanConfig.maxScanTime - (performance.now() - scanStartTime);
    
    if (timeRemaining < 500) {
      // Not enough time for full scan, return fast result
      return this.createTimeoutResult(scanStartTime);
    }

    const scanTasks = this.planScanStrategy(mediaUrl, mediaElement, timeRemaining);
    const results = await this.executeScanTasks(scanTasks, timeRemaining);

    return this.aggregateResults(results, scanStartTime);
  }

  private planScanStrategy(mediaUrl: string, mediaElement?: HTMLElement, timeRemaining: number): Array<ScanTask> {
    const tasks: ScanTask[] = [];
    const mediaType = this.detectMediaType(mediaUrl, mediaElement);

    // Always start with fastest checks
    tasks.push({
      type: 'metadata-check',
      priority: 1,
      estimatedTime: 50,
      execute: () => this.checkMetadata(mediaUrl, mediaElement)
    });

    if (timeRemaining > 300) {
      tasks.push({
        type: 'c2pa-quick',
        priority: 2,
        estimatedTime: 200,
        execute: () => this.performQuickC2PACheck(mediaUrl)
      });
    }

    if (timeRemaining > 800 && mediaType === 'image') {
      tasks.push({
        type: 'image-analysis',
        priority: 3,
        estimatedTime: 400,
        execute: () => this.performImageAnalysis(mediaElement as HTMLImageElement)
      });
    }

    if (timeRemaining > 1200 && mediaType === 'video') {
      tasks.push({
        type: 'video-analysis',
        priority: 3,
        estimatedTime: 600,
        execute: () => this.performVideoAnalysis(mediaElement as HTMLVideoElement)
      });
    }

    // Sort by priority and estimated completion time
    return tasks.sort((a, b) => a.priority - b.priority);
  }

  private async executeScanTasks(tasks: ScanTask[], timeLimit: number): Promise<ScanTaskResult[]> {
    const results: ScanTaskResult[] = [];
    let remainingTime = timeLimit;
    const startTime = performance.now();

    for (const task of tasks) {
      if (remainingTime <= 0) break;

      try {
        const taskStartTime = performance.now();
        const result = await this.executeWithTimeout(task.execute(), remainingTime);
        const taskTime = performance.now() - taskStartTime;

        results.push({
          type: task.type,
          result,
          processingTime: taskTime,
          success: true
        });

        remainingTime -= taskTime;
      } catch (error) {
        console.warn(`Task ${task.type} failed:`, error);
        results.push({
          type: task.type,
          result: null,
          processingTime: 0,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /* ================================
     Detection Methods
     ================================ */

  private async performQuickHeuristics(mediaUrl: string, mediaElement?: HTMLElement): Promise<{
    authenticity: 'safe' | 'warning' | 'danger';
    confidence: number;
  }> {
    console.log('🧠 Quick heuristics: starting analysis');
    let suspicionScore = 0;
    let totalChecks = 0;

    // URL analysis (fast, no network calls)
    if (this.isSuspiciousUrl(mediaUrl)) {
      suspicionScore += 30;
      console.log('🚨 Quick heuristics: suspicious URL detected');
    }
    totalChecks++;

    // File size analysis (fast, local)
    if (mediaElement && this.isSuspiciousFileSize(mediaElement)) {
      suspicionScore += 20;
      console.log('⚠️ Quick heuristics: suspicious file size');
    }
    totalChecks++;

    // Domain reputation (simplified, no network calls for now)
    const domain = new URL(mediaUrl).hostname;
    const suspiciousDomains = ['tempimg.com', 'imgbb.com', 'temp-image'];
    if (suspiciousDomains.some(d => domain.includes(d))) {
      suspicionScore += 25;
      console.log('🚨 Quick heuristics: suspicious domain detected');
    }
    totalChecks++;

    const suspicionRatio = suspicionScore / (totalChecks * 30); // Normalize to 0-1
    console.log('📊 Quick heuristics: suspicion ratio:', suspicionRatio);

    let result;
    if (suspicionRatio > 0.7) {
      result = { authenticity: 'danger' as const, confidence: 0.9 };
    } else if (suspicionRatio > 0.4) {
      result = { authenticity: 'warning' as const, confidence: 0.8 };
    } else {
      result = { authenticity: 'safe' as const, confidence: 0.9 };
    }

    console.log('🧠 Quick heuristics: final result:', result);
    return result;
  }

  private async checkMetadata(mediaUrl: string, mediaElement?: HTMLElement): Promise<any> {
    // Quick metadata extraction without full parsing
    const headers = await this.getQuickHeaders(mediaUrl);
    const contentType = headers['content-type'];
    const contentLength = headers['content-length'];

    return {
      hasValidMimeType: this.isValidMimeType(contentType),
      reasonableSize: this.isReasonableSize(parseInt(contentLength)),
      hasExpectedHeaders: this.hasExpectedHeaders(headers)
    };
  }

  private async performQuickC2PACheck(mediaUrl: string): Promise<any> {
    // Lightweight C2PA signature check
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout
      
      const response = await fetch(mediaUrl, { 
        method: 'HEAD',
        cache: 'force-cache',
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const contentLength = response.headers.get('content-length');
      if (!contentLength || parseInt(contentLength) > 50 * 1024 * 1024) {
        return { hasC2PA: false, reason: 'file-too-large' };
      }

      // Quick binary signature check (with timeout)
      const partialController = new AbortController();
      const partialTimeoutId = setTimeout(() => partialController.abort(), 2000);
      
      const partialResponse = await fetch(mediaUrl, {
        headers: { 'Range': 'bytes=0-8192' },
        cache: 'force-cache',
        signal: partialController.signal
      });
      
      clearTimeout(partialTimeoutId);
      
      const buffer = await partialResponse.arrayBuffer();
      const hasC2PASignature = this.hasC2PASignature(new Uint8Array(buffer));

      return { hasC2PA: hasC2PASignature };
    } catch (error) {
      console.warn('Quick C2PA check failed:', error.message);
      return { hasC2PA: false, error: error.message };
    }
  }

  private async performImageAnalysis(imageElement: HTMLImageElement): Promise<any> {
    if (!imageElement.complete) {
      await new Promise(resolve => {
        imageElement.onload = resolve;
        imageElement.onerror = resolve;
      });
    }

    // Quick visual analysis
    const canvas = this.memoryManager.getReusableCanvas();
    const ctx = canvas.getContext('2d')!;

    // Optimize canvas size
    const maxSize = this.scanConfig.maxImageSize;
    const { width, height } = this.calculateOptimalSize(
      imageElement.naturalWidth, 
      imageElement.naturalHeight, 
      maxSize
    );

    canvas.width = width;
    canvas.height = height;
    ctx.drawImage(imageElement, 0, 0, width, height);

    const imageData = ctx.getImageData(0, 0, width, height);
    
    // Fast pixel analysis
    const analysis = this.performFastPixelAnalysis(imageData);
    
    this.memoryManager.returnCanvas(canvas);
    
    return analysis;
  }

  private async performVideoAnalysis(videoElement: HTMLVideoElement): Promise<any> {
    const canvas = this.memoryManager.getReusableCanvas();
    const ctx = canvas.getContext('2d')!;

    // Sample frames at key intervals
    const framesToAnalyze = Math.min(this.scanConfig.maxVideoFrames, 8);
    const frameInterval = videoElement.duration / framesToAnalyze;
    const frameAnalyses: any[] = [];

    for (let i = 0; i < framesToAnalyze; i++) {
      const time = i * frameInterval;
      
      try {
        await this.seekToTime(videoElement, time);
        
        const { width, height } = this.calculateOptimalSize(
          videoElement.videoWidth,
          videoElement.videoHeight,
          this.scanConfig.maxImageSize
        );

        canvas.width = width;
        canvas.height = height;
        ctx.drawImage(videoElement, 0, 0, width, height);

        const imageData = ctx.getImageData(0, 0, width, height);
        const analysis = this.performFastPixelAnalysis(imageData);
        frameAnalyses.push(analysis);
      } catch (error) {
        console.warn(`Failed to analyze frame at ${time}s:`, error);
      }
    }

    this.memoryManager.returnCanvas(canvas);

    return {
      frameCount: frameAnalyses.length,
      averageComplexity: frameAnalyses.reduce((sum, a) => sum + a.complexity, 0) / frameAnalyses.length,
      hasInconsistencies: frameAnalyses.some(a => a.hasAnomalies)
    };
  }

  /* ================================
     Performance Utilities
     ================================ */

  private async executeWithTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error('Task timeout')), timeoutMs)
      )
    ]);
  }

  private performFastPixelAnalysis(imageData: ImageData): any {
    const { data, width, height } = imageData;
    let complexitySum = 0;
    let edgeCount = 0;
    const sampleSize = Math.min(data.length / 16, 1000); // Sample every 16th pixel

    for (let i = 0; i < sampleSize; i++) {
      const pixelIndex = (i * 16) * 4;
      if (pixelIndex >= data.length - 4) break;

      const r = data[pixelIndex];
      const g = data[pixelIndex + 1];
      const b = data[pixelIndex + 2];

      // Simple edge detection
      if (i > 0) {
        const prevR = data[(i - 1) * 16 * 4];
        const prevG = data[(i - 1) * 16 * 4 + 1];
        const prevB = data[(i - 1) * 16 * 4 + 2];

        const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
        if (diff > 50) edgeCount++;
      }

      complexitySum += Math.abs(r - 128) + Math.abs(g - 128) + Math.abs(b - 128);
    }

    return {
      complexity: complexitySum / sampleSize,
      edgeDensity: edgeCount / sampleSize,
      hasAnomalies: edgeCount / sampleSize > 0.3
    };
  }

  /* ================================
     Result Processing
     ================================ */

  private aggregateResults(taskResults: ScanTaskResult[], scanStartTime: number): ScanResult {
    const totalProcessingTime = performance.now() - scanStartTime;
    let overallAuthenticity: 'safe' | 'warning' | 'danger' = 'safe';
    let confidence = 0;
    const detectionMethods: string[] = [];
    let suspicionCount = 0;
    let totalValidResults = 0;

    for (const taskResult of taskResults) {
      if (!taskResult.success) continue;

      detectionMethods.push(taskResult.type);
      totalValidResults++;

      // Aggregate suspicion indicators
      if (this.indicatesSuspicion(taskResult)) {
        suspicionCount++;
      }
    }

    // Determine overall result
    const suspicionRatio = totalValidResults > 0 ? suspicionCount / totalValidResults : 0;
    
    if (suspicionRatio > 0.6) {
      overallAuthenticity = 'danger';
      confidence = Math.min(0.95, 0.7 + (suspicionRatio - 0.6) * 0.625);
    } else if (suspicionRatio > 0.3) {
      overallAuthenticity = 'warning';
      confidence = Math.min(0.8, 0.5 + (suspicionRatio - 0.3) * 0.833);
    } else {
      overallAuthenticity = 'safe';
      confidence = Math.max(0.6, 0.9 - suspicionRatio * 1.5);
    }

    return {
      authenticity: overallAuthenticity,
      confidence,
      processingTime: totalProcessingTime,
      detectionMethods,
      performance: {
        imageProcessingTime: this.getTaskTime(taskResults, 'image-analysis'),
        c2paCheckTime: this.getTaskTime(taskResults, 'c2pa-quick'),
        mlAnalysisTime: this.getTaskTime(taskResults, 'video-analysis'),
        totalMemoryUsed: this.memoryManager.getCurrentUsage()
      }
    };
  }

  /* ================================
     Utility Methods
     ================================ */

  private indicatesSuspicion(taskResult: ScanTaskResult): boolean {
    switch (taskResult.type) {
      case 'metadata-check':
        return !taskResult.result?.hasValidMimeType || !taskResult.result?.reasonableSize;
      case 'c2pa-quick':
        return taskResult.result?.hasC2PA === false;
      case 'image-analysis':
      case 'video-analysis':
        return taskResult.result?.hasAnomalies || taskResult.result?.hasInconsistencies;
      default:
        return false;
    }
  }

  private getTaskTime(results: ScanTaskResult[], taskType: string): number {
    const task = results.find(r => r.type === taskType);
    return task?.processingTime || 0;
  }

  private generateCacheKey(mediaUrl: string): string {
    return `scan_${btoa(mediaUrl).slice(0, 16)}`;
  }

  private getFromCache(key: string): any {
    const cached = sessionStorage.getItem(key);
    return cached ? JSON.parse(cached) : null;
  }

  private cacheResult(key: string, result: ScanResult): void {
    try {
      sessionStorage.setItem(key, JSON.stringify({
        result,
        timestamp: Date.now()
      }));
    } catch (error) {
      console.warn('Failed to cache result:', error);
    }
  }

  private isCacheValid(cached: any): boolean {
    const maxAge = 5 * 60 * 1000; // 5 minutes
    return Date.now() - cached.timestamp < maxAge;
  }

  private async initializeEngine(): Promise<void> {
    // Initialize web workers if supported and enabled
    if (this.scanConfig.enableWebWorkers && this.browserCompat.supportsWebWorkers()) {
      await this.initializeWorkerPool();
    }

    // Preload common resources
    await this.preloadResources();
  }

  private async initializeWorkerPool(): Promise<void> {
    const workerCount = Math.min(navigator.hardwareConcurrency || 2, 4);
    
    for (let i = 0; i < workerCount; i++) {
      try {
        // Try to create worker, fall back gracefully if not available
        const workerBlob = new Blob([`
          self.addEventListener('message', (event) => {
            // Simple fallback worker implementation
            self.postMessage({ type: 'worker-ready' });
          });
        `], { type: 'application/javascript' });
        
        const workerUrl = URL.createObjectURL(workerBlob);
        const worker = new Worker(workerUrl);
        this.workerPool.push(worker);
        
        // Clean up the blob URL after worker is created
        setTimeout(() => URL.revokeObjectURL(workerUrl), 100);
      } catch (error) {
        console.warn('Failed to create worker:', error);
        // Continue without workers
      }
    }
  }

  private async preloadResources(): Promise<void> {
    // Preload any resources that might be needed
    // This could include ML models, lookup tables, etc.
  }

  // Helper methods (simplified implementations)
  private isSuspiciousUrl(url: string): boolean {
    const suspiciousPatterns = ['/tmp/', '/temp/', 'amazonaws.com/temp', 'bit.ly', 'tinyurl'];
    return suspiciousPatterns.some(pattern => url.includes(pattern));
  }

  private isSuspiciousFileSize(element: HTMLElement): boolean {
    if (element instanceof HTMLImageElement) {
      return element.naturalWidth * element.naturalHeight > 10000000; // 10MP
    }
    return false;
  }

  private async checkDomainReputation(url: string): Promise<boolean> {
    // Quick domain check - could be enhanced with reputation API
    const suspiciousDomains = ['tempimg.com', 'imgbb.com', 'temp-image'];
    const domain = new URL(url).hostname;
    return suspiciousDomains.some(d => domain.includes(d));
  }

  private async getQuickHeaders(url: string): Promise<Record<string, string>> {
    try {
      // Add timeout to prevent hanging
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
      
      const response = await fetch(url, { 
        method: 'HEAD',
        signal: controller.signal,
        cache: 'force-cache'
      });
      
      clearTimeout(timeoutId);
      
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => headers[key] = value);
      return headers;
    } catch (error) {
      console.warn('Quick headers fetch failed:', error.message);
      return {};
    }
  }

  private isValidMimeType(contentType: string | null): boolean {
    if (!contentType) return false;
    return contentType.startsWith('image/') || contentType.startsWith('video/');
  }

  private isReasonableSize(size: number): boolean {
    return size > 1000 && size < 100 * 1024 * 1024; // 1KB - 100MB
  }

  private hasExpectedHeaders(headers: Record<string, string>): boolean {
    return 'content-type' in headers && 'content-length' in headers;
  }

  private hasC2PASignature(data: Uint8Array): boolean {
    // Quick binary check for C2PA signature
    const c2paMarker = new Uint8Array([0xFF, 0xE2]); // JPEG APP2 marker
    for (let i = 0; i < data.length - 1; i++) {
      if (data[i] === c2paMarker[0] && data[i + 1] === c2paMarker[1]) {
        return true;
      }
    }
    return false;
  }

  private calculateOptimalSize(width: number, height: number, maxSize: number): { width: number; height: number } {
    if (width <= maxSize && height <= maxSize) {
      return { width, height };
    }

    const ratio = Math.min(maxSize / width, maxSize / height);
    return {
      width: Math.floor(width * ratio),
      height: Math.floor(height * ratio)
    };
  }

  private detectMediaType(url: string, element?: HTMLElement): 'image' | 'video' | 'unknown' {
    if (element instanceof HTMLImageElement) return 'image';
    if (element instanceof HTMLVideoElement) return 'video';
    
    const extension = url.split('.').pop()?.toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(extension || '')) return 'image';
    if (['mp4', 'webm', 'mov', 'avi'].includes(extension || '')) return 'video';
    
    return 'unknown';
  }

  private async seekToTime(video: HTMLVideoElement, time: number): Promise<void> {
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error('Seek timeout')), 1000);
      
      video.addEventListener('seeked', () => {
        clearTimeout(timeout);
        resolve();
      }, { once: true });
      
      video.currentTime = time;
    });
  }

  private async queueScan(mediaUrl: string, mediaElement?: HTMLElement): Promise<ScanResult> {
    return new Promise((resolve, reject) => {
      this.scanQueue.push({
        resolve,
        reject,
        task: { mediaUrl, mediaElement }
      });
    });
  }

  private processQueue(): void {
    if (this.scanQueue.length > 0 && this.activeScanCount < this.MAX_CONCURRENT_SCANS) {
      const { resolve, reject, task } = this.scanQueue.shift()!;
      this.scanMedia(task.mediaUrl, task.mediaElement)
        .then(resolve)
        .catch(reject);
    }
  }

  private createTimeoutResult(startTime: number): ScanResult {
    return {
      authenticity: 'warning',
      confidence: 0.5,
      processingTime: performance.now() - startTime,
      detectionMethods: ['timeout-fallback'],
      performance: {
        imageProcessingTime: 0,
        c2paCheckTime: 0,
        mlAnalysisTime: 0,
        totalMemoryUsed: this.memoryManager.getCurrentUsage()
      }
    };
  }

  private createErrorResult(startTime: number, error: any): ScanResult {
    return {
      authenticity: 'danger',
      confidence: 0.3,
      processingTime: performance.now() - startTime,
      detectionMethods: ['error-fallback'],
      performance: {
        imageProcessingTime: 0,
        c2paCheckTime: 0,
        mlAnalysisTime: 0,
        totalMemoryUsed: this.memoryManager.getCurrentUsage()
      }
    };
  }
}

/* ================================
   Supporting Interfaces
   ================================ */

interface ScanTask {
  type: string;
  priority: number;
  estimatedTime: number;
  execute: () => Promise<any>;
}

interface ScanTaskResult {
  type: string;
  result: any;
  processingTime: number;
  success: boolean;
  error?: string;
}

export default FastScanEngine;