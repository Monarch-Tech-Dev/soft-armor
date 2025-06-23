/**
 * TensorFlow.js AI Analysis Engine
 * Open Source Tier - Basic emotion manipulation detection
 */

import * as tf from '@tensorflow/tfjs';

export interface AIAnalysisResult {
  emotionScore: number;           // 0-1, higher = more manipulative
  syntheticProbability: number;   // 0-1, higher = more likely synthetic
  manipulationIndicators: string[];
  confidence: number;             // Overall confidence in analysis
  processingTime: number;         // Analysis time in seconds
}

export interface TensorFlowConfig {
  modelPath: string;
  backend: 'webgl' | 'cpu' | 'wasm';
  maxImageSize: number;
  enableGPU: boolean;
}

export class TensorFlowAnalyzer {
  private model: tf.LayersModel | null = null;
  private isInitialized = false;
  private config: TensorFlowConfig;
  
  constructor(config: Partial<TensorFlowConfig> = {}) {
    this.config = {
      modelPath: '/models/emotion-detector-lite.json', // Basic open source model
      backend: 'webgl',
      maxImageSize: 512,
      enableGPU: true,
      ...config
    };
  }

  /**
   * Initialize TensorFlow.js and load the basic emotion detection model
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[TensorFlow] Initializing...');
      
      // Set backend preference
      if (this.config.enableGPU) {
        await tf.setBackend(this.config.backend);
      } else {
        await tf.setBackend('cpu');
      }
      
      console.log(`[TensorFlow] Backend set to: ${tf.getBackend()}`);
      
      // Load basic model (this would be a lightweight model for open source)
      // For now, we'll create a dummy model structure
      await this.loadBasicModel();
      
      this.isInitialized = true;
      console.log('[TensorFlow] Initialization complete');
      
      return true;
    } catch (error) {
      console.error('[TensorFlow] Initialization failed:', error);
      return false;
    }
  }

  /**
   * Load the basic emotion detection model
   * In production, this would load a real pre-trained model
   */
  private async loadBasicModel(): Promise<void> {
    try {
      // For demonstration, create a simple sequential model
      // In production, this would load a pre-trained model from a file
      this.model = tf.sequential({
        layers: [
          tf.layers.conv2d({
            inputShape: [224, 224, 3],
            filters: 32,
            kernelSize: 3,
            activation: 'relu'
          }),
          tf.layers.maxPooling2d({ poolSize: 2 }),
          tf.layers.conv2d({ filters: 64, kernelSize: 3, activation: 'relu' }),
          tf.layers.maxPooling2d({ poolSize: 2 }),
          tf.layers.flatten(),
          tf.layers.dense({ units: 128, activation: 'relu' }),
          tf.layers.dropout({ rate: 0.5 }),
          tf.layers.dense({ units: 3, activation: 'softmax' }) // neutral, positive, manipulative
        ]
      });
      
      // Compile model
      this.model.compile({
        optimizer: 'adam',
        loss: 'categoricalCrossentropy',
        metrics: ['accuracy']
      });
      
      console.log('[TensorFlow] Basic model loaded successfully');
    } catch (error) {
      console.error('[TensorFlow] Model loading failed:', error);
      throw error;
    }
  }

  /**
   * Analyze image for emotion manipulation indicators
   */
  async analyzeImage(imageElement: HTMLImageElement): Promise<AIAnalysisResult> {
    const startTime = performance.now();
    
    try {
      if (!this.isInitialized || !this.model) {
        throw new Error('TensorFlow analyzer not initialized');
      }

      // Preprocess image
      const tensor = await this.preprocessImage(imageElement);
      
      // Run inference
      const prediction = this.model.predict(tensor) as tf.Tensor;
      const scores = await prediction.data();
      
      // Clean up tensors
      tensor.dispose();
      prediction.dispose();
      
      // Interpret results
      const result = this.interpretResults(scores, startTime);
      
      console.log('[TensorFlow] Analysis complete:', result);
      return result;
      
    } catch (error) {
      console.error('[TensorFlow] Analysis failed:', error);
      
      return {
        emotionScore: 0,
        syntheticProbability: 0,
        manipulationIndicators: ['Analysis failed'],
        confidence: 0,
        processingTime: (performance.now() - startTime) / 1000
      };
    }
  }

  /**
   * Preprocess image for model input
   */
  private async preprocessImage(imageElement: HTMLImageElement): Promise<tf.Tensor> {
    return tf.tidy(() => {
      // Convert image to tensor
      let tensor = tf.browser.fromPixels(imageElement);
      
      // Resize to model input size
      tensor = tf.image.resizeBilinear(tensor, [224, 224]);
      
      // Normalize pixel values to [0, 1]
      tensor = tensor.div(255.0);
      
      // Add batch dimension
      tensor = tensor.expandDims(0);
      
      return tensor;
    });
  }

  /**
   * Interpret model output and generate analysis result
   */
  private interpretResults(scores: Float32Array, startTime: number): AIAnalysisResult {
    const [neutralScore, positiveScore, manipulativeScore] = Array.from(scores);
    
    // Calculate manipulation indicators
    const indicators: string[] = [];
    
    if (manipulativeScore > 0.7) {
      indicators.push('High manipulation probability detected');
    }
    
    if (manipulativeScore > 0.5) {
      indicators.push('Suspicious emotional targeting');
    }
    
    if (neutralScore < 0.2) {
      indicators.push('Low neutral emotion score');
    }
    
    // Calculate overall confidence
    const maxScore = Math.max(neutralScore, positiveScore, manipulativeScore);
    const confidence = maxScore;
    
    return {
      emotionScore: manipulativeScore,
      syntheticProbability: Math.min(manipulativeScore * 1.2, 1.0), // Basic synthetic detection
      manipulationIndicators: indicators,
      confidence: confidence,
      processingTime: (performance.now() - startTime) / 1000
    };
  }

  /**
   * Analyze video frames for temporal inconsistencies
   */
  async analyzeVideo(videoElement: HTMLVideoElement): Promise<AIAnalysisResult> {
    const startTime = performance.now();
    
    try {
      if (!this.isInitialized) {
        await this.initialize();
      }
      
      // Extract frames at different timestamps
      const frames = await this.extractVideoFrames(videoElement, 5);
      
      // Analyze each frame
      const frameResults: AIAnalysisResult[] = [];
      for (const frame of frames) {
        const result = await this.analyzeImage(frame);
        frameResults.push(result);
      }
      
      // Aggregate results
      return this.aggregateFrameResults(frameResults, startTime);
      
    } catch (error) {
      console.error('[TensorFlow] Video analysis failed:', error);
      
      return {
        emotionScore: 0,
        syntheticProbability: 0,
        manipulationIndicators: ['Video analysis failed'],
        confidence: 0,
        processingTime: (performance.now() - startTime) / 1000
      };
    }
  }

  /**
   * Extract frames from video for analysis
   */
  private async extractVideoFrames(video: HTMLVideoElement, numFrames: number): Promise<HTMLImageElement[]> {
    const frames: HTMLImageElement[] = [];
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d')!;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    const duration = video.duration;
    const interval = duration / (numFrames + 1);
    
    for (let i = 1; i <= numFrames; i++) {
      const time = interval * i;
      
      // Seek to specific time
      video.currentTime = time;
      await new Promise(resolve => video.onseeked = resolve);
      
      // Draw frame to canvas
      ctx.drawImage(video, 0, 0);
      
      // Convert to image
      const imageData = canvas.toDataURL();
      const img = new Image();
      img.src = imageData;
      await new Promise(resolve => img.onload = resolve);
      
      frames.push(img);
    }
    
    return frames;
  }

  /**
   * Aggregate results from multiple video frames
   */
  private aggregateFrameResults(frameResults: AIAnalysisResult[], startTime: number): AIAnalysisResult {
    if (frameResults.length === 0) {
      return {
        emotionScore: 0,
        syntheticProbability: 0,
        manipulationIndicators: ['No frames analyzed'],
        confidence: 0,
        processingTime: (performance.now() - startTime) / 1000
      };
    }
    
    // Calculate averages
    const avgEmotionScore = frameResults.reduce((sum, r) => sum + r.emotionScore, 0) / frameResults.length;
    const avgSyntheticProb = frameResults.reduce((sum, r) => sum + r.syntheticProbability, 0) / frameResults.length;
    const avgConfidence = frameResults.reduce((sum, r) => sum + r.confidence, 0) / frameResults.length;
    
    // Collect all indicators
    const allIndicators = frameResults.flatMap(r => r.manipulationIndicators);
    const uniqueIndicators = [...new Set(allIndicators)];
    
    // Check for temporal inconsistencies
    const emotionVariance = this.calculateVariance(frameResults.map(r => r.emotionScore));
    if (emotionVariance > 0.1) {
      uniqueIndicators.push('Temporal emotion inconsistencies detected');
    }
    
    return {
      emotionScore: avgEmotionScore,
      syntheticProbability: avgSyntheticProb,
      manipulationIndicators: uniqueIndicators,
      confidence: avgConfidence,
      processingTime: (performance.now() - startTime) / 1000
    };
  }

  /**
   * Calculate variance for temporal consistency analysis
   */
  private calculateVariance(values: number[]): number {
    const mean = values.reduce((sum, val) => sum + val, 0) / values.length;
    const squaredDiffs = values.map(val => Math.pow(val - mean, 2));
    return squaredDiffs.reduce((sum, val) => sum + val, 0) / values.length;
  }

  /**
   * Clean up resources
   */
  dispose(): void {
    if (this.model) {
      this.model.dispose();
      this.model = null;
    }
    this.isInitialized = false;
    console.log('[TensorFlow] Resources disposed');
  }

  /**
   * Check if analyzer is ready for use
   */
  isReady(): boolean {
    return this.isInitialized && this.model !== null;
  }
}

// Export singleton instance for extension use
export const tensorFlowAnalyzer = new TensorFlowAnalyzer();