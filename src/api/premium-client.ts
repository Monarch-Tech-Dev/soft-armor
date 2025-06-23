/**
 * Premium API Client Framework
 * Open Source Integration for Soft-Armor Premium Services
 */

export interface PremiumConfig {
  apiKey?: string;
  baseUrl: string;
  tier: 'free' | 'premium' | 'enterprise';
  features: string[];
  quotas: {
    daily: number;
    monthly: number;
    concurrent: number;
  };
}

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  creditsUsed?: number;
  quotaRemaining?: number;
}

export interface ReverseSearchResult {
  matches: Array<{
    url: string;
    confidence: number;
    firstSeen: string;
    context: string;
    metadata?: any;
  }>;
  analysisTime: number;
  creditsUsed: number;
}

export interface AdvancedAnalysisResult {
  emotionScore: number;
  syntheticProbability: number;
  manipulationIndicators: string[];
  confidence: number;
  processingTime: number;
  modelUsed: string;
}

export interface VerificationRequest {
  mediaHash: string;
  priority: 'standard' | 'urgent';
  context: string;
  userNotes?: string;
}

export interface UpgradePromptData {
  feature: string;
  tier: 'premium' | 'enterprise';
  message: string;
  upgradeUrl: string;
  benefits: string[];
}

export class PremiumClient {
  private config: PremiumConfig;
  private isInitialized = false;

  constructor(config: Partial<PremiumConfig> = {}) {
    this.config = {
      baseUrl: 'https://api.soft-armor.com/v1',
      tier: 'free',
      features: [],
      quotas: { daily: 0, monthly: 0, concurrent: 1 },
      ...config
    };
  }

  /**
   * Initialize the premium client and validate API key
   */
  async initialize(): Promise<boolean> {
    try {
      console.log('[Premium] Initializing client...');
      
      if (!this.config.apiKey) {
        console.log('[Premium] No API key provided - free tier only');
        this.isInitialized = true;
        return true;
      }

      // Validate API key and get user configuration
      const response = await this.apiCall<PremiumConfig>('/auth/validate', {
        method: 'POST',
        body: { apiKey: this.config.apiKey }
      });

      if (response.success && response.data) {
        this.config = { ...this.config, ...response.data };
        console.log(`[Premium] Authenticated as ${this.config.tier} tier`);
        this.isInitialized = true;
        return true;
      } else {
        console.warn('[Premium] API key validation failed:', response.error);
        // Fall back to free tier
        this.config.tier = 'free';
        this.config.features = [];
        this.isInitialized = true;
        return false;
      }
    } catch (error) {
      console.error('[Premium] Initialization failed:', error);
      // Gracefully degrade to free tier
      this.config.tier = 'free';
      this.config.features = [];
      this.isInitialized = true;
      return false;
    }
  }

  /**
   * Check if a premium feature is available for the current user
   */
  isFeatureEnabled(feature: string): boolean {
    return this.config.features.includes(feature);
  }

  /**
   * Get current user's tier and quota information
   */
  getUserInfo(): { tier: string; quotas: any; features: string[] } {
    return {
      tier: this.config.tier,
      quotas: this.config.quotas,
      features: this.config.features
    };
  }

  /**
   * Reverse image search (Premium feature)
   */
  async reverseImageSearch(imageUrl: string, options: any = {}): Promise<ReverseSearchResult | UpgradePromptData> {
    if (!this.isFeatureEnabled('reverse_search')) {
      return this.createUpgradePrompt('reverse_search', 'premium', {
        message: 'Reverse image search requires Premium subscription',
        benefits: [
          'Search across millions of indexed images',
          'Detect source and earliest publication',
          'Context analysis and metadata extraction',
          'Up to 1,000 searches per day'
        ]
      });
    }

    try {
      const response = await this.apiCall<ReverseSearchResult>('/search/reverse', {
        method: 'POST',
        body: {
          image_url: imageUrl,
          search_depth: options.searchDepth || 'standard',
          include_metadata: options.includeMetadata || true
        }
      });

      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.error || 'Search failed');
      }
    } catch (error) {
      console.error('[Premium] Reverse search failed:', error);
      throw error;
    }
  }

  /**
   * Advanced AI analysis (Premium feature)
   */
  async advancedAnalysis(mediaUrl: string, analysisTypes: string[] = []): Promise<AdvancedAnalysisResult | UpgradePromptData> {
    if (!this.isFeatureEnabled('advanced_ai')) {
      return this.createUpgradePrompt('advanced_ai', 'premium', {
        message: 'Advanced AI analysis requires Premium subscription',
        benefits: [
          'High-accuracy emotion manipulation detection',
          'State-of-the-art synthetic content detection',
          'Deepfake and AI-generated media identification',
          'Professional-grade confidence scoring'
        ]
      });
    }

    try {
      const response = await this.apiCall<AdvancedAnalysisResult>('/analyze/advanced', {
        method: 'POST',
        body: {
          media_url: mediaUrl,
          analysis_types: analysisTypes.length ? analysisTypes : ['emotion', 'synthetic', 'manipulation'],
          model_version: this.config.tier === 'enterprise' ? 'enterprise-v1' : 'premium-v2'
        }
      });

      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.error || 'Analysis failed');
      }
    } catch (error) {
      console.error('[Premium] Advanced analysis failed:', error);
      throw error;
    }
  }

  /**
   * Community verification request (Premium feature)
   */
  async requestVerification(request: VerificationRequest): Promise<{ verificationId: string } | UpgradePromptData> {
    if (!this.isFeatureEnabled('community_verification')) {
      return this.createUpgradePrompt('community_verification', 'premium', {
        message: 'Community verification requires Premium subscription',
        benefits: [
          'Expert human review of suspicious content',
          'Access to verification pod network',
          'Priority review for urgent cases',
          'Detailed verification reports'
        ]
      });
    }

    try {
      const response = await this.apiCall<{ verificationId: string }>('/community/submit', {
        method: 'POST',
        body: request
      });

      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.error || 'Verification request failed');
      }
    } catch (error) {
      console.error('[Premium] Verification request failed:', error);
      throw error;
    }
  }

  /**
   * Bulk processing (Enterprise feature)
   */
  async bulkProcess(mediaUrls: string[], options: any = {}): Promise<any[] | UpgradePromptData> {
    if (!this.isFeatureEnabled('bulk_processing')) {
      return this.createUpgradePrompt('bulk_processing', 'enterprise', {
        message: 'Bulk processing requires Enterprise subscription',
        benefits: [
          'Process multiple files simultaneously',
          'Batch API endpoints with volume discounts',
          'Priority processing queue',
          'Custom workflow integration'
        ]
      });
    }

    try {
      const response = await this.apiCall<any[]>('/bulk/process', {
        method: 'POST',
        body: {
          media_urls: mediaUrls,
          options: options
        }
      });

      if (response.success) {
        return response.data!;
      } else {
        throw new Error(response.error || 'Bulk processing failed');
      }
    } catch (error) {
      console.error('[Premium] Bulk processing failed:', error);
      throw error;
    }
  }

  /**
   * Generic API call handler with error handling and retry logic
   */
  private async apiCall<T>(endpoint: string, options: RequestInit & { body?: any } = {}): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'User-Agent': 'Soft-Armor-Extension/1.0',
      ...options.headers
    };

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`;
    }

    const requestOptions: RequestInit = {
      ...options,
      headers,
      body: options.body ? JSON.stringify(options.body) : undefined
    };

    try {
      const response = await fetch(url, requestOptions);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        return {
          success: false,
          error: errorData.error || `HTTP ${response.status}: ${response.statusText}`
        };
      }

      const data = await response.json();
      return {
        success: true,
        data: data.data || data,
        creditsUsed: data.creditsUsed,
        quotaRemaining: data.quotaRemaining
      };
    } catch (error) {
      console.error('[Premium] API call failed:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Network error'
      };
    }
  }

  /**
   * Create upgrade prompt data for UI display
   */
  private createUpgradePrompt(feature: string, tier: 'premium' | 'enterprise', options: {
    message: string;
    benefits: string[];
  }): UpgradePromptData {
    return {
      feature,
      tier,
      message: options.message,
      upgradeUrl: `https://soft-armor.com/upgrade?feature=${feature}&tier=${tier}`,
      benefits: options.benefits
    };
  }

  /**
   * Update API key and re-initialize
   */
  async updateApiKey(apiKey: string): Promise<boolean> {
    this.config.apiKey = apiKey;
    return await this.initialize();
  }

  /**
   * Clear API key and switch to free tier
   */
  clearApiKey(): void {
    this.config.apiKey = undefined;
    this.config.tier = 'free';
    this.config.features = [];
    this.config.quotas = { daily: 0, monthly: 0, concurrent: 1 };
  }

  /**
   * Get current quota usage (if available)
   */
  async getQuotaUsage(): Promise<{ daily: number; monthly: number } | null> {
    if (!this.config.apiKey) return null;

    try {
      const response = await this.apiCall<{ daily: number; monthly: number }>('/usage/quota');
      return response.success ? response.data! : null;
    } catch (error) {
      console.error('[Premium] Failed to fetch quota usage:', error);
      return null;
    }
  }

  /**
   * Graceful degradation - show upgrade prompt in UI
   */
  showUpgradePrompt(promptData: UpgradePromptData): void {
    // This will be implemented by the UI layer
    console.log('[Premium] Upgrade prompt:', promptData);
    
    // Dispatch custom event for UI to handle
    window.dispatchEvent(new CustomEvent('soft-armor-upgrade-prompt', {
      detail: promptData
    }));
  }
}

// Export singleton instance for extension use
export const premiumClient = new PremiumClient();