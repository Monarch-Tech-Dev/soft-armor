/* ================================
   Banner Workflow Manager
   Orchestrates User Journey Banners
   ================================ */

import { ShieldIconSystem } from '../assets/design/shield-icons';
import { UserJourneyStep } from './user-experience-flow';

export interface BannerWorkflowConfig {
  position: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'center';
  autoHide: boolean;
  duration: number;
  showProgress: boolean;
  allowDismiss: boolean;
  stackable: boolean;
}

export class BannerWorkflowManager {
  private static instance: BannerWorkflowManager;
  private activeBanners = new Map<string, HTMLElement>();
  private bannerQueue: Array<{ step: UserJourneyStep; config: BannerWorkflowConfig }> = [];
  private isShowingBanner = false;
  private defaultConfig: BannerWorkflowConfig = {
    position: 'top-right',
    autoHide: true,
    duration: 5000,
    showProgress: false,
    allowDismiss: true,
    stackable: false
  };

  static getInstance(): BannerWorkflowManager {
    if (!this.instance) {
      this.instance = new BannerWorkflowManager();
    }
    return this.instance;
  }

  constructor() {
    this.setupGlobalStyles();
    this.setupKeyboardHandlers();
  }

  /* ================================
     Public API
     ================================ */

  showStep(step: UserJourneyStep, config?: Partial<BannerWorkflowConfig>): void {
    const finalConfig = { ...this.defaultConfig, ...config };
    
    if (finalConfig.stackable || !this.isShowingBanner) {
      this.displayBanner(step, finalConfig);
    } else {
      this.bannerQueue.push({ step, config: finalConfig });
    }
  }

  hideStep(stepId: string): void {
    const banner = this.activeBanners.get(stepId);
    if (banner) {
      this.removeBanner(banner, stepId);
    }
  }

  hideAllSteps(): void {
    this.activeBanners.forEach((banner, stepId) => {
      this.removeBanner(banner, stepId);
    });
  }

  updateStepProgress(stepId: string, progress: number): void {
    const banner = this.activeBanners.get(stepId);
    if (banner) {
      const progressBar = banner.querySelector('.soft-armor-progress-bar') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${Math.max(0, Math.min(100, progress))}%`;
      }
    }
  }

  /* ================================
     Banner Creation & Management
     ================================ */

  private displayBanner(step: UserJourneyStep, config: BannerWorkflowConfig): void {
    // Remove existing banner if not stackable
    if (!config.stackable) {
      this.hideAllSteps();
    }

    const banner = this.createBannerElement(step, config);
    this.positionBanner(banner, config.position);
    
    // Add to DOM
    document.body.appendChild(banner);
    this.activeBanners.set(step.id, banner);
    this.isShowingBanner = true;

    // Trigger entrance animation
    requestAnimationFrame(() => {
      banner.classList.add('soft-armor-step-entered');
    });

    // Setup auto-hide
    if (config.autoHide && config.duration > 0) {
      setTimeout(() => {
        this.removeBanner(banner, step.id);
      }, config.duration);
    }

    // Setup accessibility
    this.setupBannerAccessibility(banner, step);
  }

  private createBannerElement(step: UserJourneyStep, config: BannerWorkflowConfig): HTMLElement {
    const banner = document.createElement('div');
    banner.className = `soft-armor-journey-banner soft-armor-journey-banner--${step.type} soft-armor-step-entering`;
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', 'polite');
    banner.setAttribute('data-step-id', step.id);

    // Create header
    const header = this.createBannerHeader(step);
    banner.appendChild(header);

    // Create content
    const content = this.createBannerContent(step, config);
    banner.appendChild(content);

    // Create actions
    if (step.actions && step.actions.length > 0) {
      const actions = this.createBannerActions(step.actions);
      banner.appendChild(actions);
    }

    // Create close button if dismissible
    if (config.allowDismiss) {
      const closeButton = this.createCloseButton(() => this.removeBanner(banner, step.id));
      banner.appendChild(closeButton);
    }

    return banner;
  }

  private createBannerHeader(step: UserJourneyStep): HTMLElement {
    const header = document.createElement('div');
    header.className = 'soft-armor-banner-header';

    // Icon
    const icon = document.createElement('div');
    icon.className = 'soft-armor-banner-icon';
    
    // Use appropriate icon based on step type
    const iconContent = this.getStepIcon(step);
    icon.innerHTML = iconContent;
    header.appendChild(icon);

    // Title
    const title = document.createElement('div');
    title.className = 'soft-armor-banner-title';
    title.textContent = step.title;
    header.appendChild(title);

    return header;
  }

  private createBannerContent(step: UserJourneyStep, config: BannerWorkflowConfig): HTMLElement {
    const content = document.createElement('div');
    content.className = 'soft-armor-banner-content';

    // Message
    const message = document.createElement('div');
    message.className = 'soft-armor-banner-message';
    message.textContent = step.message;
    content.appendChild(message);

    // Progress indicator for scanning steps
    if (config.showProgress || step.type === 'scanning') {
      const progressContainer = this.createProgressIndicator();
      content.appendChild(progressContainer);
    }

    return content;
  }

  private createProgressIndicator(): HTMLElement {
    const container = document.createElement('div');
    container.className = 'soft-armor-progress-container';

    const progressBar = document.createElement('div');
    progressBar.className = 'soft-armor-progress-bar';
    progressBar.style.width = '0%';

    container.appendChild(progressBar);
    return container;
  }

  private createBannerActions(actions: UserJourneyStep['actions']): HTMLElement {
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'soft-armor-banner-actions';

    actions?.forEach(action => {
      const button = document.createElement('button');
      button.className = `soft-armor-action-button ${action.isPrimary ? 'soft-armor-action-button--primary' : ''}`;
      button.textContent = action.label;
      button.onclick = action.action;

      // Add keyboard shortcut hint
      if (action.keyboardShortcut) {
        const shortcutHint = document.createElement('span');
        shortcutHint.className = 'soft-armor-shortcut-hint';
        shortcutHint.textContent = action.keyboardShortcut;
        button.appendChild(shortcutHint);
      }

      // Accessibility
      button.setAttribute('aria-label', action.label);
      if (action.keyboardShortcut) {
        button.setAttribute('aria-keyshortcuts', action.keyboardShortcut);
      }

      actionsContainer.appendChild(button);
    });

    return actionsContainer;
  }

  private createCloseButton(onClose: () => void): HTMLElement {
    const closeButton = document.createElement('button');
    closeButton.className = 'soft-armor-banner-close';
    closeButton.innerHTML = '×';
    closeButton.onclick = onClose;
    closeButton.setAttribute('aria-label', 'Close notification');
    closeButton.setAttribute('title', 'Close (Esc)');
    return closeButton;
  }

  /* ================================
     Banner Positioning
     ================================ */

  private positionBanner(banner: HTMLElement, position: BannerWorkflowConfig['position']): void {
    const positions = {
      'top-right': { top: 'var(--space-4)', right: 'var(--space-4)' },
      'top-left': { top: 'var(--space-4)', left: 'var(--space-4)' },
      'bottom-right': { bottom: 'var(--space-4)', right: 'var(--space-4)' },
      'bottom-left': { bottom: 'var(--space-4)', left: 'var(--space-4)' },
      'center': { 
        top: '50%', 
        left: '50%', 
        transform: 'translate(-50%, -50%)' 
      }
    };

    const pos = positions[position];
    Object.assign(banner.style, pos);
  }

  /* ================================
     Banner Removal
     ================================ */

  private removeBanner(banner: HTMLElement, stepId: string): void {
    banner.classList.add('soft-armor-step-exiting');
    
    setTimeout(() => {
      if (banner.parentNode) {
        banner.parentNode.removeChild(banner);
      }
      this.activeBanners.delete(stepId);
      
      if (this.activeBanners.size === 0) {
        this.isShowingBanner = false;
        this.processQueue();
      }
    }, 300);
  }

  private processQueue(): void {
    if (this.bannerQueue.length > 0 && !this.isShowingBanner) {
      const { step, config } = this.bannerQueue.shift()!;
      this.displayBanner(step, config);
    }
  }

  /* ================================
     Accessibility & Interaction
     ================================ */

  private setupBannerAccessibility(banner: HTMLElement, step: UserJourneyStep): void {
    // Focus management
    if (step.type === 'onboarding' || step.type === 'error') {
      const firstButton = banner.querySelector('.soft-armor-action-button') as HTMLElement;
      if (firstButton) {
        setTimeout(() => firstButton.focus(), 100);
      }
    }

    // Screen reader announcement
    if (step.accessibility?.announcement) {
      this.announceToScreenReader(step.accessibility.announcement);
    }
  }

  private setupKeyboardHandlers(): void {
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.hideAllSteps();
      }
    });
  }

  private announceToScreenReader(message: string): void {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    announcement.textContent = message;
    
    document.body.appendChild(announcement);
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  /* ================================
     Icon Management
     ================================ */

  private getStepIcon(step: UserJourneyStep): string {
    switch (step.type) {
      case 'onboarding':
        return ShieldIconSystem.generateShieldIcon({
          size: 'md',
          state: 'neutral',
          variant: 'filled',
          ariaLabel: 'Onboarding step'
        });
      
      case 'scanning':
        return ShieldIconSystem.generateShieldIcon({
          size: 'md',
          state: 'scanning',
          variant: 'minimal',
          ariaLabel: 'Scanning in progress'
        });
      
      case 'result': {
        const resultState = step.id.includes('safe') ? 'safe' : 
                           step.id.includes('warning') ? 'warning' : 'danger';
        return ShieldIconSystem.generateShieldIcon({
          size: 'md',
          state: resultState,
          variant: 'filled',
          ariaLabel: 'Scan result'
        });
      }
      
      case 'error':
        return ShieldIconSystem.generateShieldIcon({
          size: 'md',
          state: 'danger',
          variant: 'outline',
          ariaLabel: 'Error occurred'
        });
      
      case 'help':
        return ShieldIconSystem.generateShieldIcon({
          size: 'md',
          state: 'neutral',
          variant: 'outline',
          ariaLabel: 'Help information'
        });
      
      default:
        return '🛡️';
    }
  }

  /* ================================
     Global Styles Setup
     ================================ */

  private setupGlobalStyles(): void {
    if (document.getElementById('soft-armor-banner-styles')) return;

    const link = document.createElement('link');
    link.id = 'soft-armor-banner-styles';
    link.rel = 'stylesheet';
    link.href = chrome.runtime.getURL('content/banner-workflow.css');
    document.head.appendChild(link);
  }

  /* ================================
     Utility Methods
     ================================ */

  getActiveBannerCount(): number {
    return this.activeBanners.size;
  }

  getQueuedBannerCount(): number {
    return this.bannerQueue.length;
  }

  isStepActive(stepId: string): boolean {
    return this.activeBanners.has(stepId);
  }
}

export default BannerWorkflowManager;