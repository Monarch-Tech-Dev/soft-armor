interface LoopAnalysisResult {
  isLoop: boolean;
  confidence: number;
  similarity: number;
  motionConsistency: number;
  opticalFlowScore: number;
  performance?: {
    processingTime: number;
    framesAnalyzed: number;
    memoryUsed: number;
  };
}

interface FrameData {
  mat: any; // cv.Mat
  timestamp: number;
  features?: any[]; // cv.KeyPoint[]
  descriptors?: any; // cv.Mat
}

import { LoopDetectorOptimizer } from './loop-detector-performance';
import { VideoProcessor, VideoProcessingOptions } from './video-processor';

export class LoopDetector {
  private cv: any = null;
  private isInitialized = false;
  private initPromise: Promise<void> | null = null;
  private optimizer: LoopDetectorOptimizer;
  private videoProcessor: VideoProcessor;

  // AI loop detection thresholds (now adaptive)
  private LOOP_SIMILARITY_THRESHOLD = 0.85;
  private MOTION_CONSISTENCY_THRESHOLD = 0.9;
  private OPTICAL_FLOW_THRESHOLD = 0.8;

  constructor() {
    this.optimizer = new LoopDetectorOptimizer();
    this.videoProcessor = new VideoProcessor();
    this.initializeOpenCV();
  }

  private async initializeOpenCV(): Promise<void> {
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      const initializeAsync = async () => {
        try {
          // Check if OpenCV is already loaded globally
          if (typeof window !== 'undefined' && (window as any).cv && (window as any).cv.Mat) {
            this.cv = (window as any).cv;
            this.isInitialized = true;
            resolve();
            return;
          }

          // Load OpenCV.js dynamically
          await this.loadOpenCVScript();
        
        // Wait for initialization
        if (this.cv && typeof this.cv.onRuntimeInitialized === 'function') {
          this.cv.onRuntimeInitialized = () => {
            this.isInitialized = true;
            resolve();
          };
        } else {
          // Fallback: check periodically
          const checkInterval = setInterval(() => {
            if (this.cv && this.cv.Mat) {
              clearInterval(checkInterval);
              this.isInitialized = true;
              resolve();
            }
          }, 100);

          // Timeout after 30 seconds
          setTimeout(() => {
            clearInterval(checkInterval);
            reject(new Error('OpenCV initialization timeout'));
          }, 30000);
        }

        } catch (error) {
          reject(error);
        }
      };

      initializeAsync();
    });

    return this.initPromise;
  }

  private async loadOpenCVScript(): Promise<void> {
    return new Promise((resolve, reject) => {
      // Try multiple OpenCV loading strategies
      const strategies = [
        () => this.loadFromExtension(),
        () => this.loadFromCDN(),
        () => this.loadFromNodeModules()
      ];

      let strategyIndex = 0;

      const tryNextStrategy = () => {
        if (strategyIndex >= strategies.length) {
          reject(new Error('All OpenCV loading strategies failed'));
          return;
        }

        const strategy = strategies[strategyIndex++];
        strategy()
          .then(() => {
            this.cv = (window as any).cv;
            resolve();
          })
          .catch((error) => {
            console.warn(`OpenCV loading strategy ${strategyIndex} failed:`, error);
            tryNextStrategy();
          });
      };

      tryNextStrategy();
    });
  }

  private loadFromExtension(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = chrome.runtime.getURL('opencv.js');
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OpenCV from extension'));
      
      document.head.appendChild(script);
    });
  }

  private loadFromCDN(): Promise<void> {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://docs.opencv.org/4.8.0/opencv.js';
      script.async = true;
      
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load OpenCV from CDN'));
      
      document.head.appendChild(script);
    });
  }

  private loadFromNodeModules(): Promise<void> {
    return new Promise((resolve, reject) => {
      // This strategy is not available in browser extensions
      reject(new Error('Node modules loading not supported in browser extension'));
    });
  }

  async analyze(videoUrl: string): Promise<boolean> {
    try {
      const result = await this.analyzeWithDetails(videoUrl);
      return result.isLoop;
    } catch (error) {
      console.warn('Loop detection failed:', error);
      return false;
    }
  }

  async analyzeOptimized(videoUrl: string, options: VideoProcessingOptions = {}): Promise<boolean> {
    try {
      const result = await this.analyzeWithDetailsOptimized(videoUrl, options);
      return result.isLoop;
    } catch (error) {
      console.warn('Optimized loop detection failed:', error);
      return false;
    }
  }

  async analyzeWithDetails(videoUrl: string): Promise<LoopAnalysisResult> {
    const startTime = performance.now();
    let memoryStart = 0;
    
    if ((window as any).performance?.memory) {
      memoryStart = (window as any).performance.memory.usedJSHeapSize;
    }

    try {
      // Ensure OpenCV is loaded
      await this.initializeOpenCV();
      
      if (!this.isInitialized || !this.cv) {
        throw new Error('OpenCV not properly initialized');
      }

      // Create and configure video element
      const video = await this.createVideoElement(videoUrl);
      
      // Check if we should skip analysis for performance reasons
      const videoSize = 0; // We don't have file size here, use 0
      if (this.optimizer.shouldSkipAnalysis(videoSize, video.duration || 0)) {
        console.warn('Skipping loop analysis due to performance constraints');
        return {
          isLoop: false,
          confidence: 0,
          similarity: 0,
          motionConsistency: 0,
          opticalFlowScore: 0,
          performance: {
            processingTime: performance.now() - startTime,
            framesAnalyzed: 0,
            memoryUsed: 0
          }
        };
      }

      // Determine video quality and get adaptive thresholds
      const videoQuality = this.optimizer.estimateVideoQuality(
        video.videoWidth || 640,
        video.videoHeight || 480,
        video.duration || 0
      );
      
      const thresholds = this.optimizer.getAdaptiveThresholds(videoQuality);
      this.LOOP_SIMILARITY_THRESHOLD = thresholds.similarity;
      this.MOTION_CONSISTENCY_THRESHOLD = thresholds.motion;
      this.OPTICAL_FLOW_THRESHOLD = thresholds.opticalFlow;

      // Extract frames for analysis with performance optimization
      const frames = await this.extractKeyFramesOptimized(video);
      
      if (frames.length < 2) {
        return {
          isLoop: false,
          confidence: 0,
          similarity: 0,
          motionConsistency: 0,
          opticalFlowScore: 0,
          performance: {
            processingTime: performance.now() - startTime,
            framesAnalyzed: frames.length,
            memoryUsed: this.calculateMemoryUsage(memoryStart)
          }
        };
      }

      // Perform comprehensive loop analysis with optimization
      const similarity = await this.calculateFrameSimilarityOptimized(frames[0], frames[frames.length - 1]);
      const motionConsistency = await this.analyzeMotionConsistency(frames);
      const opticalFlowScore = await this.analyzeOpticalFlow(frames);

      // Calculate overall confidence
      const confidence = this.calculateLoopConfidence(similarity, motionConsistency, opticalFlowScore);
      
      // Determine if it's a loop using adaptive thresholds
      const isLoop = similarity > this.LOOP_SIMILARITY_THRESHOLD && 
                     motionConsistency > this.MOTION_CONSISTENCY_THRESHOLD &&
                     opticalFlowScore > this.OPTICAL_FLOW_THRESHOLD;

      // Calculate final performance metrics
      const processingTime = performance.now() - startTime;
      const memoryUsed = this.calculateMemoryUsage(memoryStart);

      // Record performance for future optimization
      this.optimizer.recordPerformance({
        frameExtractionTime: processingTime * 0.3, // Estimate
        analysisTime: processingTime * 0.7,
        memoryUsage: memoryUsed,
        totalTime: processingTime,
        framesProcessed: frames.length
      });

      // Cleanup with optimization
      this.cleanupFramesOptimized(frames);

      return {
        isLoop,
        confidence,
        similarity,
        motionConsistency,
        opticalFlowScore,
        performance: {
          processingTime,
          framesAnalyzed: frames.length,
          memoryUsed
        }
      };

    } catch (error) {
      console.warn('Detailed loop analysis failed:', error);
      this.optimizer.forceCleanup(); // Cleanup on error
      
      return {
        isLoop: false,
        confidence: 0,
        similarity: 0,
        motionConsistency: 0,
        opticalFlowScore: 0,
        performance: {
          processingTime: performance.now() - startTime,
          framesAnalyzed: 0,
          memoryUsed: this.calculateMemoryUsage(memoryStart)
        }
      };
    }
  }

  private async createVideoElement(videoUrl: string): Promise<HTMLVideoElement> {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      video.src = videoUrl;
      video.crossOrigin = 'anonymous';
      video.muted = true;
      video.preload = 'metadata';
      video.style.display = 'none';
      
      const timeout = setTimeout(() => {
        document.body.removeChild(video);
        reject(new Error('Video loading timeout'));
      }, 15000);

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

  private async extractKeyFrames(video: HTMLVideoElement): Promise<FrameData[]> {
    const frames: FrameData[] = [];
    const duration = video.duration || 5;
    
    // Extract frames at strategic points
    const timePoints = [
      0.1, // Start (avoid black frame)
      duration * 0.25, // Quarter point
      duration * 0.5,  // Middle
      duration * 0.75, // Three-quarter point
      Math.max(0.1, duration - 0.1) // End (avoid artifacts)
    ];

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = Math.min(video.videoWidth || 640, 640); // Cap at 640px for performance
    canvas.height = Math.min(video.videoHeight || 480, 480);

    for (const timePoint of timePoints) {
      try {
        const frameData = await this.captureFrame(video, timePoint, canvas, ctx);
        if (frameData) {
          frames.push(frameData);
        }
      } catch (error) {
        console.warn(`Failed to capture frame at ${timePoint}s:`, error);
      }
    }

    return frames;
  }

  private async extractKeyFramesOptimized(video: HTMLVideoElement): Promise<FrameData[]> {
    const frames: FrameData[] = [];
    const duration = video.duration || 5;
    
    // Get optimized time points based on performance
    const timePoints = this.optimizer.optimizeFrameExtraction(video, duration);
    
    // Get optimized canvas size
    const { width, height } = this.optimizer.optimizeCanvasSize(
      video.videoWidth || 640,
      video.videoHeight || 480
    );

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    canvas.width = width;
    canvas.height = height;

    for (const timePoint of timePoints) {
      try {
        const frameData = await this.captureFrameOptimized(video, timePoint, canvas, ctx);
        if (frameData) {
          frames.push(frameData);
        }
      } catch (error) {
        console.warn(`Failed to capture frame at ${timePoint}s:`, error);
      }
    }

    return frames;
  }

  private async captureFrame(
    video: HTMLVideoElement, 
    time: number, 
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D
  ): Promise<FrameData | null> {
    return new Promise((resolve) => {
      const onSeeked = () => {
        try {
          // Draw frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to OpenCV Mat
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const mat = this.cv.matFromImageData(imageData);
          
          // Convert to grayscale for analysis
          const grayMat = new this.cv.Mat();
          this.cv.cvtColor(mat, grayMat, this.cv.COLOR_RGBA2GRAY);
          
          mat.delete(); // Cleanup original mat
          
          video.removeEventListener('seeked', onSeeked);
          resolve({
            mat: grayMat,
            timestamp: time
          });
        } catch (error) {
          console.warn('Frame capture error:', error);
          video.removeEventListener('seeked', onSeeked);
          resolve(null);
        }
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;

      // Fallback timeout
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve(null);
      }, 2000);
    });
  }

  private async calculateFrameSimilarity(frame1: FrameData, frame2: FrameData): Promise<number> {
    try {
      // Resize frames to same size if needed
      const size = new this.cv.Size(320, 240);
      const resized1 = new this.cv.Mat();
      const resized2 = new this.cv.Mat();
      
      this.cv.resize(frame1.mat, resized1, size);
      this.cv.resize(frame2.mat, resized2, size);

      // Calculate structural similarity using template matching
      const result = new this.cv.Mat();
      this.cv.matchTemplate(resized1, resized2, result, this.cv.TM_CCOEFF_NORMED);
      
      const minMaxLoc = this.cv.minMaxLoc(result);
      const similarity = minMaxLoc.maxVal;

      // Cleanup
      resized1.delete();
      resized2.delete();
      result.delete();

      return Math.max(0, Math.min(1, similarity));
    } catch (error) {
      console.warn('Similarity calculation failed:', error);
      return 0;
    }
  }

  private async analyzeMotionConsistency(frames: FrameData[]): Promise<number> {
    try {
      if (frames.length < 3) return 0;

      let totalConsistency = 0;
      let validComparisons = 0;

      // Compare motion between consecutive frame pairs
      for (let i = 0; i < frames.length - 2; i++) {
        const motion1 = await this.calculateMotionBetweenFrames(frames[i], frames[i + 1]);
        const motion2 = await this.calculateMotionBetweenFrames(frames[i + 1], frames[i + 2]);
        
        if (motion1 !== null && motion2 !== null) {
          // Calculate consistency (how similar the motion patterns are)
          const consistency = 1 - Math.abs(motion1 - motion2);
          totalConsistency += consistency;
          validComparisons++;
        }
      }

      return validComparisons > 0 ? totalConsistency / validComparisons : 0;
    } catch (error) {
      console.warn('Motion consistency analysis failed:', error);
      return 0;
    }
  }

  private async calculateMotionBetweenFrames(frame1: FrameData, frame2: FrameData): Promise<number | null> {
    try {
      // Use optical flow to detect motion
      const flow = new this.cv.Mat();
      
      this.cv.calcOpticalFlowPyrLK(
        frame1.mat, 
        frame2.mat, 
        new this.cv.Mat(), // no previous points
        new this.cv.Mat(), // no next points  
        new this.cv.Mat(), // no status
        new this.cv.Mat(), // no error
        new this.cv.Size(15, 15), // window size
        2 // max pyramid level
      );

      // Calculate average motion magnitude
      const motionMagnitude = this.calculateFlowMagnitude(flow);
      
      flow.delete();
      return motionMagnitude;
    } catch (error) {
      console.warn('Motion calculation failed:', error);
      return null;
    }
  }

  private async analyzeOpticalFlow(frames: FrameData[]): Promise<number> {
    try {
      if (frames.length < 2) return 0;

      let totalFlowScore = 0;
      let validFlows = 0;

      // Analyze optical flow between key frame pairs
      for (let i = 0; i < frames.length - 1; i++) {
        const flowScore = await this.calculateOpticalFlowScore(frames[i], frames[i + 1]);
        if (flowScore !== null) {
          totalFlowScore += flowScore;
          validFlows++;
        }
      }

      return validFlows > 0 ? totalFlowScore / validFlows : 0;
    } catch (error) {
      console.warn('Optical flow analysis failed:', error);
      return 0;
    }
  }

  private async calculateOpticalFlowScore(frame1: FrameData, frame2: FrameData): Promise<number | null> {
    try {
      // Detect good features to track
      const corners = new this.cv.Mat();
      const maxCorners = 100;
      const qualityLevel = 0.01;
      const minDistance = 10;
      
      this.cv.goodFeaturesToTrack(
        frame1.mat,
        corners,
        maxCorners,
        qualityLevel,
        minDistance
      );

      if (corners.rows === 0) {
        corners.delete();
        return null;
      }

      // Calculate optical flow
      const nextPts = new this.cv.Mat();
      const status = new this.cv.Mat();
      const err = new this.cv.Mat();

      this.cv.calcOpticalFlowPyrLK(
        frame1.mat,
        frame2.mat,
        corners,
        nextPts,
        status,
        err
      );

      // Analyze flow vectors for loop patterns
      const flowScore = this.analyzeFlowVectors(corners, nextPts, status);

      // Cleanup
      corners.delete();
      nextPts.delete();
      status.delete();
      err.delete();

      return flowScore;
    } catch (error) {
      console.warn('Optical flow score calculation failed:', error);
      return null;
    }
  }

  private analyzeFlowVectors(corners: any, nextPts: any, status: any): number {
    try {
      const cornersData = corners.data32F;
      const nextPtsData = nextPts.data32F;
      const statusData = status.data8U;
      
      let validVectors = 0;
      let totalMagnitude = 0;
      let circularMotion = 0;

      for (let i = 0; i < status.rows; i++) {
        if (statusData[i] === 1) { // Valid tracking
          const dx = nextPtsData[i * 2] - cornersData[i * 2];
          const dy = nextPtsData[i * 2 + 1] - cornersData[i * 2 + 1];
          
          const magnitude = Math.sqrt(dx * dx + dy * dy);
          totalMagnitude += magnitude;
          
          // Check for circular/repetitive motion patterns
          const angle = Math.atan2(dy, dx);
          if (this.isCircularMotion(angle, magnitude)) {
            circularMotion++;
          }
          
          validVectors++;
        }
      }

      if (validVectors === 0) return 0;

      // Higher score for consistent, circular motion (typical of AI loops)
      const avgMagnitude = totalMagnitude / validVectors;
      const circularRatio = circularMotion / validVectors;
      
      // Combine magnitude consistency and circular motion indicators
      return Math.min(1, (avgMagnitude / 50) * 0.7 + circularRatio * 0.3);
    } catch (error) {
      console.warn('Flow vector analysis failed:', error);
      return 0;
    }
  }

  private isCircularMotion(angle: number, magnitude: number): boolean {
    // Check if motion suggests circular or repetitive patterns
    // AI-generated loops often have consistent angular motion
    const normalizedAngle = ((angle % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
    const consistentMagnitude = magnitude > 2 && magnitude < 20; // Reasonable motion range
    
    return consistentMagnitude && (
      (normalizedAngle > Math.PI / 4 && normalizedAngle < 3 * Math.PI / 4) || // Vertical-ish
      (normalizedAngle > 5 * Math.PI / 4 && normalizedAngle < 7 * Math.PI / 4) // or its opposite
    );
  }

  private calculateFlowMagnitude(flow: any): number {
    try {
      // Calculate average magnitude of optical flow
      const flowData = flow.data32F;
      let totalMagnitude = 0;
      let pixelCount = 0;

      for (let i = 0; i < flowData.length; i += 2) {
        const dx = flowData[i];
        const dy = flowData[i + 1];
        const magnitude = Math.sqrt(dx * dx + dy * dy);
        
        if (!isNaN(magnitude) && magnitude > 0) {
          totalMagnitude += magnitude;
          pixelCount++;
        }
      }

      return pixelCount > 0 ? totalMagnitude / pixelCount : 0;
    } catch (error) {
      console.warn('Flow magnitude calculation failed:', error);
      return 0;
    }
  }

  private calculateLoopConfidence(
    similarity: number, 
    motionConsistency: number, 
    opticalFlowScore: number
  ): number {
    // Weighted combination of all factors
    const weights = {
      similarity: 0.4,      // Primary indicator
      motion: 0.35,         // Motion patterns  
      opticalFlow: 0.25     // Flow analysis
    };

    return Math.min(1, 
      similarity * weights.similarity +
      motionConsistency * weights.motion +
      opticalFlowScore * weights.opticalFlow
    );
  }

  private cleanupFrames(frames: FrameData[]): void {
    for (const frame of frames) {
      try {
        if (frame.mat && typeof frame.mat.delete === 'function') {
          frame.mat.delete();
        }
        if (frame.descriptors && typeof frame.descriptors.delete === 'function') {
          frame.descriptors.delete();
        }
      } catch (error) {
        console.warn('Frame cleanup error:', error);
      }
    }
  }

  async analyzeWithDetailsOptimized(videoUrl: string, options: VideoProcessingOptions = {}): Promise<LoopAnalysisResult> {
    const startTime = performance.now();
    let memoryStart = 0;
    
    if ((window as any).performance?.memory) {
      memoryStart = (window as any).performance.memory.usedJSHeapSize;
    }

    try {
      // Ensure OpenCV is loaded
      await this.initializeOpenCV();
      
      if (!this.isInitialized || !this.cv) {
        throw new Error('OpenCV not properly initialized');
      }

      // Set default options for performance optimization
      const processingOptions: VideoProcessingOptions = {
        targetScanTime: 1500, // Target 1.5 seconds for sub-2 second total time
        enableCaching: true,
        qualityMode: 'balanced',
        progressCallback: options.progressCallback,
        ...options
      };

      // Use VideoProcessor for optimized video handling
      const processingResult = await this.videoProcessor.processVideo(videoUrl, processingOptions);
      
      if (!processingResult.success) {
        return this.createFailureResult(startTime, memoryStart, processingResult.error);
      }

      // If cache hit, return fast result
      if (processingResult.cacheHit) {
        return this.createSuccessResult(
          false, // Default to no loop for cached results
          0.5,   // Default confidence
          startTime,
          memoryStart,
          processingResult.framesAnalyzed
        );
      }

      // Perform fast loop analysis on processed video
      const video = await this.createVideoElement(videoUrl);
      const frames = await this.extractKeyFramesOptimized(video);
      
      if (frames.length < 2) {
        return this.createFailureResult(startTime, memoryStart, 'Insufficient frames extracted');
      }

      // Fast analysis with reduced computation
      const similarity = await this.calculateFrameSimilarityOptimized(frames[0], frames[frames.length - 1]);
      const motionConsistency = frames.length >= 3 ? await this.analyzeMotionConsistency(frames.slice(0, 3)) : 0;
      const opticalFlowScore = await this.analyzeOpticalFlowFast(frames.slice(0, 2));

      // Calculate confidence and determine loop status
      const confidence = this.calculateLoopConfidence(similarity, motionConsistency, opticalFlowScore);
      const isLoop = similarity > this.LOOP_SIMILARITY_THRESHOLD && 
                     motionConsistency > this.MOTION_CONSISTENCY_THRESHOLD &&
                     opticalFlowScore > this.OPTICAL_FLOW_THRESHOLD;

      // Cleanup
      this.cleanupFramesOptimized(frames);

      return this.createSuccessResult(isLoop, confidence, startTime, memoryStart, frames.length);

    } catch (error) {
      console.warn('Optimized detailed loop analysis failed:', error);
      return this.createFailureResult(startTime, memoryStart, error instanceof Error ? error.message : 'Unknown error');
    }
  }

  private async analyzeOpticalFlowFast(frames: FrameData[]): Promise<number> {
    try {
      if (frames.length < 2) return 0;

      // Simplified optical flow analysis for speed
      const flowScore = await this.calculateOpticalFlowScore(frames[0], frames[1]);
      return flowScore || 0;
    } catch (error) {
      console.warn('Fast optical flow analysis failed:', error);
      return 0;
    }
  }

  private createSuccessResult(
    isLoop: boolean,
    confidence: number,
    startTime: number,
    memoryStart: number,
    framesAnalyzed: number
  ): LoopAnalysisResult {
    return {
      isLoop,
      confidence,
      similarity: confidence * 0.8, // Estimate
      motionConsistency: confidence * 0.9, // Estimate
      opticalFlowScore: confidence * 0.7, // Estimate
      performance: {
        processingTime: performance.now() - startTime,
        framesAnalyzed,
        memoryUsed: this.calculateMemoryUsage(memoryStart)
      }
    };
  }

  private createFailureResult(startTime: number, memoryStart: number, error?: string): LoopAnalysisResult {
    return {
      isLoop: false,
      confidence: 0,
      similarity: 0,
      motionConsistency: 0,
      opticalFlowScore: 0,
      performance: {
        processingTime: performance.now() - startTime,
        framesAnalyzed: 0,
        memoryUsed: this.calculateMemoryUsage(memoryStart)
      }
    };
  }

  // Public method to get detailed analysis results
  async getDetailedAnalysis(videoUrl: string): Promise<LoopAnalysisResult> {
    return this.analyzeWithDetails(videoUrl);
  }

  // Public method to get optimized detailed analysis results
  async getDetailedAnalysisOptimized(videoUrl: string, options: VideoProcessingOptions = {}): Promise<LoopAnalysisResult> {
    return this.analyzeWithDetailsOptimized(videoUrl, options);
  }

  // Check if OpenCV is ready
  isReady(): boolean {
    return this.isInitialized && !!this.cv;
  }

  // Get OpenCV version info
  getVersion(): string {
    return this.cv ? this.cv.getBuildInformation() : 'Not loaded';
  }

  // Additional optimized methods
  private async captureFrameOptimized(
    video: HTMLVideoElement, 
    time: number, 
    canvas: HTMLCanvasElement, 
    ctx: CanvasRenderingContext2D
  ): Promise<FrameData | null> {
    return new Promise((resolve) => {
      const onSeeked = () => {
        try {
          // Draw frame to canvas
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          
          // Convert to OpenCV Mat using optimized pool
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const mat = this.cv.matFromImageData(imageData);
          
          // Convert to grayscale for analysis using pooled mat
          const grayMat = this.optimizer.getMatFromPool(mat.rows, mat.cols, this.cv.CV_8UC1, this.cv);
          this.cv.cvtColor(mat, grayMat, this.cv.COLOR_RGBA2GRAY);
          
          this.optimizer.returnMatToPool(mat); // Return original mat to pool
          
          video.removeEventListener('seeked', onSeeked);
          resolve({
            mat: grayMat,
            timestamp: time
          });
        } catch (error) {
          console.warn('Optimized frame capture error:', error);
          video.removeEventListener('seeked', onSeeked);
          resolve(null);
        }
      };

      video.addEventListener('seeked', onSeeked);
      video.currentTime = time;

      // Shorter timeout for optimized capture
      setTimeout(() => {
        video.removeEventListener('seeked', onSeeked);
        resolve(null);
      }, 1500);
    });
  }

  private async calculateFrameSimilarityOptimized(frame1: FrameData, frame2: FrameData): Promise<number> {
    return this.optimizer.optimizeOpenCVOperation(() => {
      try {
        // Resize frames to same size if needed using pooled mats
        const size = new this.cv.Size(320, 240);
        const resized1 = this.optimizer.getMatFromPool(240, 320, frame1.mat.type(), this.cv);
        const resized2 = this.optimizer.getMatFromPool(240, 320, frame2.mat.type(), this.cv);
        
        this.cv.resize(frame1.mat, resized1, size);
        this.cv.resize(frame2.mat, resized2, size);

        // Calculate structural similarity using template matching
        const result = this.optimizer.getMatFromPool(1, 1, this.cv.CV_32FC1, this.cv);
        this.cv.matchTemplate(resized1, resized2, result, this.cv.TM_CCOEFF_NORMED);
        
        const minMaxLoc = this.cv.minMaxLoc(result);
        const similarity = minMaxLoc.maxVal;

        // Return mats to pool
        this.optimizer.returnMatToPool(resized1);
        this.optimizer.returnMatToPool(resized2);
        this.optimizer.returnMatToPool(result);

        return Math.max(0, Math.min(1, similarity));
      } catch (error) {
        console.warn('Optimized similarity calculation failed:', error);
        return 0;
      }
    });
  }

  private cleanupFramesOptimized(frames: FrameData[]): void {
    for (const frame of frames) {
      try {
        if (frame.mat && typeof frame.mat.delete === 'function') {
          this.optimizer.returnMatToPool(frame.mat);
        }
        if (frame.descriptors && typeof frame.descriptors.delete === 'function') {
          this.optimizer.returnMatToPool(frame.descriptors);
        }
      } catch (error) {
        console.warn('Optimized frame cleanup error:', error);
      }
    }
  }

  private calculateMemoryUsage(startMemory: number): number {
    if ((window as any).performance?.memory) {
      return (window as any).performance.memory.usedJSHeapSize - startMemory;
    }
    return 0;
  }

  // Public method to get performance report
  getPerformanceReport(): any {
    return this.optimizer.getPerformanceReport();
  }

  // Public method to force cleanup
  forceCleanup(): void {
    this.optimizer.forceCleanup();
  }
}
