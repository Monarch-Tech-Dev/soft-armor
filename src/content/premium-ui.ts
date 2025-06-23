/**
 * Premium Feature UI Components
 * Displays upgrade prompts and premium feature interfaces
 */

import { UpgradePromptData } from '../api/premium-client';

export interface PremiumUIConfig {
  showAnimations: boolean;
  theme: 'light' | 'dark';
  position: 'top' | 'bottom' | 'center';
}

export class PremiumUI {
  private config: PremiumUIConfig;
  private activePrompts: Set<string> = new Set();

  constructor(config: Partial<PremiumUIConfig> = {}) {
    this.config = {
      showAnimations: true,
      theme: 'light',
      position: 'top',
      ...config
    };

    this.initializeEventListeners();
    this.injectStyles();
  }

  /**
   * Initialize event listeners for premium prompts
   */
  private initializeEventListeners(): void {
    window.addEventListener('soft-armor-upgrade-prompt', (event: any) => {
      const promptData = event.detail as UpgradePromptData;
      this.showUpgradePrompt(promptData);
    });

    // Handle prompt interactions
    document.addEventListener('click', (event) => {
      const target = event.target as HTMLElement;
      
      if (target.classList.contains('sa-premium-upgrade-btn')) {
        const feature = target.getAttribute('data-feature');
        const url = target.getAttribute('data-url');
        if (url) {
          window.open(url, '_blank');
          this.trackUpgradeClick(feature || 'unknown');
        }
      }
      
      if (target.classList.contains('sa-premium-dismiss-btn')) {
        const promptId = target.getAttribute('data-prompt-id');
        if (promptId) {
          this.dismissPrompt(promptId);
        }
      }
    });
  }

  /**
   * Inject CSS styles for premium UI components
   */
  private injectStyles(): void {
    if (document.getElementById('soft-armor-premium-styles')) return;

    const styles = document.createElement('style');
    styles.id = 'soft-armor-premium-styles';
    styles.textContent = `
      .sa-premium-prompt {
        position: fixed;
        top: 20px;
        right: 20px;
        width: 380px;
        background: ${this.config.theme === 'dark' ? '#2d3748' : '#ffffff'};
        color: ${this.config.theme === 'dark' ? '#e2e8f0' : '#2d3748'};
        border-radius: 12px;
        box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04);
        border: 1px solid ${this.config.theme === 'dark' ? '#4a5568' : '#e2e8f0'};
        padding: 0;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        transform: translateX(400px);
        transition: transform 0.3s ease-out;
        max-height: 600px;
        overflow: hidden;
      }

      .sa-premium-prompt.sa-show {
        transform: translateX(0);
      }

      .sa-premium-prompt.sa-bottom {
        top: auto;
        bottom: 20px;
      }

      .sa-premium-prompt.sa-center {
        top: 50%;
        left: 50%;
        right: auto;
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0;
      }

      .sa-premium-prompt.sa-center.sa-show {
        transform: translate(-50%, -50%) scale(1);
        opacity: 1;
      }

      .sa-premium-header {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 12px 12px 0 0;
        position: relative;
        overflow: hidden;
      }

      .sa-premium-header::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: url('data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="20" cy="20" r="2" fill="rgba(255,255,255,0.1)"/><circle cx="80" cy="30" r="1.5" fill="rgba(255,255,255,0.1)"/><circle cx="40" cy="70" r="1" fill="rgba(255,255,255,0.1)"/><circle cx="90" cy="80" r="2.5" fill="rgba(255,255,255,0.1)"/></svg>') repeat;
        pointer-events: none;
      }

      .sa-premium-icon {
        display: inline-block;
        width: 24px;
        height: 24px;
        margin-right: 12px;
        vertical-align: middle;
      }

      .sa-premium-title {
        font-size: 18px;
        font-weight: 600;
        margin: 0;
        display: inline-block;
        vertical-align: middle;
      }

      .sa-premium-tier-badge {
        position: absolute;
        top: 15px;
        right: 20px;
        background: rgba(255, 255, 255, 0.2);
        color: white;
        padding: 4px 12px;
        border-radius: 20px;
        font-size: 12px;
        font-weight: 500;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }

      .sa-premium-body {
        padding: 24px;
      }

      .sa-premium-message {
        font-size: 16px;
        line-height: 1.5;
        margin: 0 0 20px 0;
        color: ${this.config.theme === 'dark' ? '#a0aec0' : '#4a5568'};
      }

      .sa-premium-benefits {
        list-style: none;
        padding: 0;
        margin: 0 0 24px 0;
      }

      .sa-premium-benefit {
        display: flex;
        align-items: center;
        margin: 12px 0;
        font-size: 14px;
        color: ${this.config.theme === 'dark' ? '#e2e8f0' : '#2d3748'};
      }

      .sa-premium-benefit::before {
        content: '✓';
        display: inline-block;
        width: 20px;
        height: 20px;
        background: #48bb78;
        color: white;
        border-radius: 50%;
        text-align: center;
        line-height: 20px;
        font-size: 12px;
        font-weight: bold;
        margin-right: 12px;
        flex-shrink: 0;
      }

      .sa-premium-actions {
        display: flex;
        gap: 12px;
        margin-top: 24px;
      }

      .sa-premium-btn {
        flex: 1;
        padding: 12px 20px;
        border: none;
        border-radius: 8px;
        font-size: 14px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s ease;
        text-decoration: none;
        text-align: center;
        display: inline-block;
      }

      .sa-premium-upgrade-btn {
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
      }

      .sa-premium-upgrade-btn:hover {
        transform: translateY(-1px);
        box-shadow: 0 10px 25px -5px rgba(102, 126, 234, 0.4);
      }

      .sa-premium-dismiss-btn {
        background: ${this.config.theme === 'dark' ? '#4a5568' : '#e2e8f0'};
        color: ${this.config.theme === 'dark' ? '#e2e8f0' : '#4a5568'};
      }

      .sa-premium-dismiss-btn:hover {
        background: ${this.config.theme === 'dark' ? '#2d3748' : '#cbd5e0'};
      }

      .sa-premium-feature-preview {
        background: ${this.config.theme === 'dark' ? '#1a202c' : '#f7fafc'};
        border: 1px dashed ${this.config.theme === 'dark' ? '#4a5568' : '#cbd5e0'};
        border-radius: 8px;
        padding: 16px;
        margin: 16px 0;
        text-align: center;
        color: ${this.config.theme === 'dark' ? '#a0aec0' : '#718096'};
        font-size: 14px;
      }

      .sa-premium-loading {
        display: inline-block;
        width: 20px;
        height: 20px;
        border: 2px solid ${this.config.theme === 'dark' ? '#4a5568' : '#e2e8f0'};
        border-radius: 50%;
        border-top-color: #667eea;
        animation: sa-spin 1s ease-in-out infinite;
      }

      @keyframes sa-spin {
        to { transform: rotate(360deg); }
      }

      .sa-premium-close {
        position: absolute;
        top: 15px;
        right: 15px;
        background: none;
        border: none;
        color: rgba(255, 255, 255, 0.8);
        font-size: 20px;
        cursor: pointer;
        width: 30px;
        height: 30px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 0.2s ease;
      }

      .sa-premium-close:hover {
        background: rgba(255, 255, 255, 0.1);
        color: white;
      }

      /* Animation for dismissing */
      .sa-premium-prompt.sa-dismissing {
        transform: translateX(400px);
        opacity: 0;
      }

      .sa-premium-prompt.sa-center.sa-dismissing {
        transform: translate(-50%, -50%) scale(0.9);
        opacity: 0;
      }
    `;

    document.head.appendChild(styles);
  }

  /**
   * Show upgrade prompt with animation
   */
  showUpgradePrompt(promptData: UpgradePromptData): void {
    const promptId = `premium-${promptData.feature}-${Date.now()}`;
    
    // Avoid showing duplicate prompts
    if (this.activePrompts.has(promptData.feature)) {
      return;
    }

    this.activePrompts.add(promptData.feature);

    const promptElement = this.createPromptElement(promptId, promptData);
    document.body.appendChild(promptElement);

    // Trigger animation
    requestAnimationFrame(() => {
      promptElement.classList.add('sa-show');
    });

    // Auto-dismiss after 30 seconds if not interacted with
    setTimeout(() => {
      if (document.contains(promptElement)) {
        this.dismissPrompt(promptId);
      }
    }, 30000);
  }

  /**
   * Create prompt DOM element
   */
  private createPromptElement(promptId: string, promptData: UpgradePromptData): HTMLElement {
    const prompt = document.createElement('div');
    prompt.className = `sa-premium-prompt sa-${this.config.position}`;
    prompt.id = promptId;

    const tierIcon = promptData.tier === 'enterprise' ? '💼' : '⭐';
    const tierName = promptData.tier === 'enterprise' ? 'Enterprise' : 'Premium';

    prompt.innerHTML = `
      <div class="sa-premium-header">
        <button class="sa-premium-close" data-prompt-id="${promptId}">×</button>
        <div class="sa-premium-tier-badge">${tierName}</div>
        <h3 class="sa-premium-title">
          <span class="sa-premium-icon">${tierIcon}</span>
          Unlock ${promptData.feature.replace('_', ' ').toUpperCase()}
        </h3>
      </div>
      <div class="sa-premium-body">
        <p class="sa-premium-message">${promptData.message}</p>
        
        ${promptData.benefits.length > 0 ? `
          <ul class="sa-premium-benefits">
            ${promptData.benefits.map(benefit => `
              <li class="sa-premium-benefit">${benefit}</li>
            `).join('')}
          </ul>
        ` : ''}
        
        <div class="sa-premium-feature-preview">
          🔒 This feature requires ${tierName} subscription
        </div>
        
        <div class="sa-premium-actions">
          <button class="sa-premium-btn sa-premium-dismiss-btn" data-prompt-id="${promptId}">
            Maybe Later
          </button>
          <a href="${promptData.upgradeUrl}" 
             class="sa-premium-btn sa-premium-upgrade-btn" 
             data-feature="${promptData.feature}"
             data-url="${promptData.upgradeUrl}"
             target="_blank">
            Upgrade to ${tierName}
          </a>
        </div>
      </div>
    `;

    return prompt;
  }

  /**
   * Dismiss a prompt with animation
   */
  private dismissPrompt(promptId: string): void {
    const prompt = document.getElementById(promptId);
    if (!prompt) return;

    prompt.classList.add('sa-dismissing');
    
    setTimeout(() => {
      if (prompt.parentNode) {
        prompt.parentNode.removeChild(prompt);
      }
      
      // Remove from active prompts
      const feature = promptId.split('-')[1];
      this.activePrompts.delete(feature);
    }, 300);
  }

  /**
   * Show loading state for premium features
   */
  showLoadingState(message: string = 'Processing...'): HTMLElement {
    const loading = document.createElement('div');
    loading.className = 'sa-premium-feature-preview';
    loading.innerHTML = `
      <div class="sa-premium-loading"></div>
      <span style="margin-left: 12px;">${message}</span>
    `;
    return loading;
  }

  /**
   * Show premium feature result
   */
  showPremiumResult(data: any, container: HTMLElement): void {
    // This would be customized based on the specific feature
    container.innerHTML = `
      <div class="sa-premium-result">
        <pre>${JSON.stringify(data, null, 2)}</pre>
      </div>
    `;
  }

  /**
   * Track upgrade button clicks for analytics
   */
  private trackUpgradeClick(feature: string): void {
    console.log(`[Premium] Upgrade clicked for feature: ${feature}`);
    
    // Send analytics event (implement as needed)
    if (typeof gtag !== 'undefined') {
      gtag('event', 'premium_upgrade_click', {
        feature: feature,
        source: 'extension'
      });
    }
  }

  /**
   * Update theme
   */
  setTheme(theme: 'light' | 'dark'): void {
    this.config.theme = theme;
    this.injectStyles(); // Re-inject styles with new theme
  }

  /**
   * Clear all active prompts
   */
  clearAllPrompts(): void {
    this.activePrompts.forEach(feature => {
      const elements = document.querySelectorAll(`[id^="premium-${feature}"]`);
      elements.forEach(el => el.remove());
    });
    this.activePrompts.clear();
  }
}

// Export singleton instance
export const premiumUI = new PremiumUI();