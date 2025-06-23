import * as tf from '@tensorflow/tfjs';
import { EmotionResult } from '../content/types';

export class EmotionPulse {
  private model: tf.LayersModel | null = null;

  constructor() {
    this.loadModel();
  }

  private async loadModel(): Promise<void> {
    try {
      // Load pre-trained emotion detection model
      const modelUrl = chrome.runtime.getURL('models/emotion-model.json');
      this.model = await tf.loadLayersModel(modelUrl);
    } catch (error) {
      console.warn('Failed to load emotion model:', error);
    }
  }

  async analyze(mediaData: Uint8Array): Promise<EmotionResult> {
    try {
      await this.loadModel();
      
      // Convert media data to tensor
      const imageTensor = await this.preprocessImage(mediaData);
      if (!imageTensor) {
        return { arousalLevel: 5, confidence: 0 }; // Neutral default
      }

      // Run inference if model is loaded
      if (this.model) {
        const prediction = this.model.predict(imageTensor) as tf.Tensor;
        const scores = await prediction.data();
        
        // Calculate arousal level from emotion scores
        const arousalLevel = this.calculateArousalLevel(Array.from(scores));
        
        // Cleanup tensors
        imageTensor.dispose();
        prediction.dispose();
        
        return {
          arousalLevel,
          confidence: 0.8
        };
      }
      
      // Fallback: Use basic image analysis
      return this.basicEmotionAnalysis(mediaData);
      
    } catch (error) {
      console.warn('Emotion analysis failed:', error);
      return { arousalLevel: 5, confidence: 0 }; // Neutral default
    }
  }

  private async preprocessImage(mediaData: Uint8Array): Promise<tf.Tensor | null> {
    try {
      // Create image from data
      const blob = new Blob([mediaData]);
      const imageUrl = URL.createObjectURL(blob);
      
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        
        img.onload = () => {
          try {
            // Create canvas and resize to model input size (224x224)
            const canvas = document.createElement('canvas');
            const ctx = canvas.getContext('2d')!;
            canvas.width = 224;
            canvas.height = 224;
            
            ctx.drawImage(img, 0, 0, 224, 224);
            
            // Convert to tensor
            const tensor = tf.browser.fromPixels(canvas)
              .resizeNearestNeighbor([224, 224])
              .toFloat()
              .div(255.0)
              .expandDims(0);
            
            URL.revokeObjectURL(imageUrl);
            resolve(tensor);
          } catch (error) {
            reject(error);
          }
        };
        
        img.onerror = () => {
          URL.revokeObjectURL(imageUrl);
          reject(new Error('Failed to load image'));
        };
        
        img.src = imageUrl;
      });
      
    } catch (error) {
      console.warn('Image preprocessing failed:', error);
      return null;
    }
  }

  private calculateArousalLevel(emotionScores: number[]): number {
    // Map emotion scores to arousal levels (0-10 scale)
    // Higher scores indicate more manipulative/arousing content
    
    if (emotionScores.length < 2) return 5; // Neutral default
    
    // Assume scores represent: [neutral, happy, sad, angry, fear, surprise]
    // High arousal emotions: angry, fear (indices 3, 4)
    // Medium arousal: surprise, happy (indices 5, 1) 
    // Low arousal: sad, neutral (indices 2, 0)
    
    const weights = [1, 3, 2, 8, 9, 6]; // Arousal weights for each emotion
    let weightedSum = 0;
    let totalWeight = 0;
    
    for (let i = 0; i < Math.min(emotionScores.length, weights.length); i++) {
      weightedSum += emotionScores[i] * weights[i];
      totalWeight += emotionScores[i];
    }
    
    return totalWeight > 0 ? Math.min(10, (weightedSum / totalWeight)) : 5;
  }

  private basicEmotionAnalysis(mediaData: Uint8Array): EmotionResult {
    // Fallback analysis using basic image properties
    try {
      // Analyze color distribution for emotional indicators
      const colorIntensity = this.analyzeColorIntensity(mediaData);
      const contrast = this.analyzeContrast(mediaData);
      
      // High contrast + intense colors = potentially manipulative
      const arousalLevel = Math.min(10, (colorIntensity * 3 + contrast * 2));
      
      return {
        arousalLevel,
        confidence: 0.3 // Lower confidence for basic analysis
      };
      
    } catch (error) {
      return { arousalLevel: 5, confidence: 0 };
    }
  }

  private analyzeColorIntensity(mediaData: Uint8Array): number {
    // Sample first 1000 bytes for color analysis
    const sampleSize = Math.min(1000, mediaData.length);
    let intensity = 0;
    
    for (let i = 0; i < sampleSize; i += 4) {
      const r = mediaData[i] || 0;
      const g = mediaData[i + 1] || 0;
      const b = mediaData[i + 2] || 0;
      
      // Calculate color saturation
      const max = Math.max(r, g, b);
      const min = Math.min(r, g, b);
      intensity += (max - min) / 255;
    }
    
    return Math.min(5, intensity / (sampleSize / 4));
  }

  private analyzeContrast(mediaData: Uint8Array): number {
    // Simple contrast analysis
    const sampleSize = Math.min(500, mediaData.length);
    let contrast = 0;
    
    for (let i = 0; i < sampleSize - 4; i += 4) {
      const brightness1 = (mediaData[i] + mediaData[i + 1] + mediaData[i + 2]) / 3;
      const brightness2 = (mediaData[i + 4] + mediaData[i + 5] + mediaData[i + 6]) / 3;
      contrast += Math.abs(brightness1 - brightness2) / 255;
    }
    
    return Math.min(5, contrast / (sampleSize / 4));
  }
}
