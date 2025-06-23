/* ================================
   User Experience Flow System
   Core Journey & Accessibility
   ================================ */

import { ShieldIconSystem } from '../assets/design/shield-icons';
import { UIResponseSystem, UIState } from './ui-response-system';
import { ContextMenuIntegration } from './context-menu-integration';
import BannerWorkflowManager from './banner-workflow-manager';

export interface UserJourneyStep {
  id: string;
  type: 'onboarding' | 'scanning' | 'result' | 'error' | 'help';
  title: string;
  message: string;
  duration?: number;
  actions?: Array<{
    label: string;
    action: () => void;
    isPrimary?: boolean;
    keyboardShortcut?: string;
  }>;
  accessibility?: {
    ariaLabel: string;
    announcement: string;
    focusTarget?: string;
  };
}

export interface OnboardingConfig {
  isFirstTime: boolean;
  hasSeenIntro: boolean;
  preferredScanType: 'quick' | 'standard' | 'deep';
  accessibilityMode: boolean;
}

export class UserExperienceFlow {
  private static instance: UserExperienceFlow;
  private uiSystem: UIResponseSystem;
  private contextMenu: ContextMenuIntegration;
  private bannerManager: BannerWorkflowManager;
  private onboardingConfig: OnboardingConfig;
  private currentJourneyStep: UserJourneyStep | null = null;
  private keyboardShortcuts = new Map<string, () => void>();
  private focusManager: FocusManager;

  static getInstance(): UserExperienceFlow {
    if (!this.instance) {
      this.instance = new UserExperienceFlow();
    }
    return this.instance;
  }

  constructor() {
    this.uiSystem = new UIResponseSystem();
    this.contextMenu = ContextMenuIntegration.getInstance();
    this.bannerManager = BannerWorkflowManager.getInstance();
    this.focusManager = new FocusManager();
    this.loadOnboardingConfig();
    this.initializeAccessibility();
    this.setupKeyboardShortcuts();
  }

  /* ================================
     Core User Journey
     ================================ */

  async startScanJourney(mediaUrl: string, scanType: string = 'standard'): Promise<void> {
    // Check if first-time user
    if (this.onboardingConfig.isFirstTime) {
      await this.showFirstTimeOnboarding();
      return;
    }

    // Show scan initiation feedback
    this.showJourneyStep({
      id: 'scan-start',
      type: 'scanning',
      title: 'Scan Initiated',
      message: 'Right-click detected • Starting gentle verification',
      duration: 1500,
      accessibility: {
        ariaLabel: 'Media scan initiated',
        announcement: 'Soft-Armor scan started. Please wait while we verify this media.'
      }
    });

    // Start actual scanning process
    setTimeout(() => {
      this.showScanningProgress();
    }, 1500);
  }

  private showScanningProgress(): void {
    this.showJourneyStep({
      id: 'scan-progress',
      type: 'scanning',
      title: 'Analyzing Content',
      message: 'Checking authenticity signals • This may take a moment',
      accessibility: {
        ariaLabel: 'Scanning in progress',
        announcement: 'Analyzing media content for authenticity indicators.'
      },
      actions: [
        {
          label: 'Cancel',
          action: () => this.cancelScan(),
          keyboardShortcut: 'Escape'
        }
      ]
    });
  }

  showScanResult(result: 'safe' | 'warning' | 'danger', details?: any): void {
    const resultConfig = this.getResultConfig(result);
    
    this.showJourneyStep({
      id: 'scan-result',
      type: 'result',
      title: resultConfig.title,
      message: resultConfig.message,
      duration: 6000,
      accessibility: {
        ariaLabel: resultConfig.ariaLabel,
        announcement: resultConfig.announcement
      },
      actions: [
        {
          label: 'View Details',
          action: () => this.showDetailedResults(details),
          isPrimary: true,
          keyboardShortcut: 'Enter'
        },
        {
          label: 'Scan Another',
          action: () => this.startNewScan(),
          keyboardShortcut: 'Ctrl+N'
        }
      ]
    });
  }

  /* ================================
     First-Time User Onboarding
     ================================ */

  private async showFirstTimeOnboarding(): Promise<void> {
    // Step 1: Welcome
    await this.showOnboardingStep1();
    
    // Step 2: How it works
    setTimeout(() => {
      this.showOnboardingStep2();
    }, 3000);
  }

  private async showOnboardingStep1(): Promise<void> {
    this.showJourneyStep({
      id: 'onboarding-welcome',
      type: 'onboarding',
      title: '🛡️ Welcome to Soft-Armor',
      message: 'Right-click any image or video to verify its authenticity with our gentle, mercy-first approach.',
      duration: 3000,
      accessibility: {
        ariaLabel: 'Welcome to Soft-Armor extension',
        announcement: 'Welcome! Soft-Armor helps verify media authenticity. Right-click images or videos to scan them.'
      },
      actions: [
        {
          label: 'Continue',
          action: () => this.showOnboardingStep2(),
          isPrimary: true,
          keyboardShortcut: 'Enter'
        },
        {
          label: 'Skip Intro',
          action: () => this.completeOnboarding(),
          keyboardShortcut: 'Escape'
        }
      ]
    });
  }

  private showOnboardingStep2(): void {
    this.showJourneyStep({
      id: 'onboarding-demo',
      type: 'onboarding',
      title: 'How It Works',
      message: 'Look for the 🛡️ shield when hovering over media, then right-click to see our traffic-light results: Green (safe), Amber (suspicious), Red (concerning).',
      duration: 5000,
      accessibility: {
        ariaLabel: 'How Soft-Armor works explanation',
        announcement: 'Hover over media to see shield indicator, then right-click to scan. Results use traffic light colors: green for safe, amber for suspicious, red for concerning.'
      },
      actions: [
        {
          label: 'Got It!',
          action: () => this.completeOnboarding(),
          isPrimary: true,
          keyboardShortcut: 'Enter'
        },
        {
          label: 'Show Demo',
          action: () => this.showInteractiveDemo(),
          keyboardShortcut: 'D'
        }
      ]
    });
  }

  private completeOnboarding(): void {
    this.onboardingConfig.isFirstTime = false;
    this.onboardingConfig.hasSeenIntro = true;
    this.saveOnboardingConfig();
    
    this.showJourneyStep({
      id: 'onboarding-complete',
      type: 'onboarding',
      title: 'Ready to Protect',
      message: 'Soft-Armor is now active. Right-click any media to start scanning!',
      duration: 2500,
      accessibility: {
        ariaLabel: 'Onboarding complete',
        announcement: 'Setup complete! Soft-Armor is now ready. Right-click media to scan.'
      }
    });
  }

  /* ================================
     Error Recovery Flows
     ================================ */

  showNetworkError(): void {
    this.showJourneyStep({
      id: 'error-network',
      type: 'error',
      title: 'Connection Issue',
      message: 'Unable to connect for advanced analysis. Basic verification is still available.',
      accessibility: {
        ariaLabel: 'Network connection error',
        announcement: 'Network error occurred. Basic offline verification is still available.'
      },
      actions: [
        {
          label: 'Retry',
          action: () => this.retryNetworkOperation(),
          isPrimary: true,
          keyboardShortcut: 'R'
        },
        {
          label: 'Use Offline Mode',
          action: () => this.enableOfflineMode(),
          keyboardShortcut: 'O'
        }
      ]
    });
  }

  showUnsupportedMediaError(mediaType: string): void {
    this.showJourneyStep({
      id: 'error-unsupported',
      type: 'error',
      title: 'Media Type Not Supported',
      message: `${mediaType} files aren't currently supported. Try images (JPG, PNG, WebP) or videos (MP4, WebM).`,
      duration: 4000,
      accessibility: {
        ariaLabel: 'Unsupported media type error',
        announcement: `${mediaType} files are not supported. Please try common image or video formats.`
      },
      actions: [
        {
          label: 'Learn More',
          action: () => this.showSupportedFormats(),
          keyboardShortcut: 'L'
        }
      ]
    });
  }

  showScanTimeoutError(): void {
    this.showJourneyStep({
      id: 'error-timeout',
      type: 'error',
      title: 'Scan Timed Out',
      message: 'The scan is taking longer than expected. This may be due to file size or network conditions.',
      accessibility: {
        ariaLabel: 'Scan timeout error',
        announcement: 'Scan timed out due to file size or network conditions.'
      },
      actions: [
        {
          label: 'Try Quick Scan',
          action: () => this.startQuickScan(),
          isPrimary: true,
          keyboardShortcut: 'Q'
        },
        {
          label: 'Retry Full Scan',
          action: () => this.retryFullScan(),
          keyboardShortcut: 'R'
        }
      ]
    });
  }

  /* ================================
     Accessibility Features
     ================================ */

  private initializeAccessibility(): void {
    // Screen reader announcements
    this.createAriaLiveRegion();
    
    // High contrast detection
    if (window.matchMedia('(prefers-contrast: high)').matches) {
      this.onboardingConfig.accessibilityMode = true;
    }

    // Reduced motion detection
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.enableReducedMotion();
    }

    // Focus management
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') {
        this.focusManager.handleTabNavigation(e);
      }
    });
  }

  private createAriaLiveRegion(): void {
    const liveRegion = document.createElement('div');
    liveRegion.id = 'soft-armor-announcements';
    liveRegion.setAttribute('aria-live', 'polite');
    liveRegion.setAttribute('aria-atomic', 'true');
    liveRegion.style.cssText = `
      position: absolute;
      left: -10000px;
      width: 1px;
      height: 1px;
      overflow: hidden;
    `;
    document.body.appendChild(liveRegion);
  }

  private announceToScreenReader(message: string): void {
    const liveRegion = document.getElementById('soft-armor-announcements');
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }

  /* ================================
     Keyboard Shortcuts
     ================================ */

  private setupKeyboardShortcuts(): void {
    // Global shortcuts
    this.keyboardShortcuts.set('Ctrl+Shift+S', () => this.showShortcutsHelp());
    this.keyboardShortcuts.set('Ctrl+Shift+A', () => this.toggleAccessibilityMode());
    this.keyboardShortcuts.set('F1', () => this.showHelp());
    this.keyboardShortcuts.set('Escape', () => this.cancelCurrentAction());

    // Context-specific shortcuts will be added dynamically
    document.addEventListener('keydown', (e) => {
      const combo = this.getKeyCombo(e);
      const action = this.keyboardShortcuts.get(combo);
      if (action) {
        e.preventDefault();
        action();
      }
    });
  }

  private getKeyCombo(event: KeyboardEvent): string {
    const parts = [];
    if (event.ctrlKey) parts.push('Ctrl');
    if (event.shiftKey) parts.push('Shift');
    if (event.altKey) parts.push('Alt');
    if (event.metaKey) parts.push('Meta');
    parts.push(event.key);
    return parts.join('+');
  }

  /* ================================
     Journey Step Management
     ================================ */

  private showJourneyStep(step: UserJourneyStep): void {
    this.currentJourneyStep = step;
    
    // Show banner workflow
    this.bannerManager.showStep(step, {
      autoHide: !!step.duration,
      duration: step.duration || 0,
      showProgress: step.type === 'scanning',
      allowDismiss: step.type !== 'scanning',
      stackable: false
    });

    // Handle accessibility
    if (step.accessibility) {
      this.announceToScreenReader(step.accessibility.announcement);
      
      if (step.accessibility.focusTarget) {
        this.focusManager.setFocus(step.accessibility.focusTarget);
      }
    }

    // Setup actions
    if (step.actions) {
      this.setupStepActions(step.actions);
    }
  }

  private setupStepActions(actions: UserJourneyStep['actions']): void {
    // Clear existing action shortcuts
    this.clearActionShortcuts();

    // Add new shortcuts
    actions?.forEach(action => {
      if (action.keyboardShortcut) {
        this.keyboardShortcuts.set(action.keyboardShortcut, action.action);
      }
    });
  }

  private clearActionShortcuts(): void {
    // Remove dynamic action shortcuts but keep global ones
    const globalShortcuts = ['Ctrl+Shift+S', 'Ctrl+Shift+A', 'F1'];
    Array.from(this.keyboardShortcuts.keys()).forEach(key => {
      if (!globalShortcuts.includes(key)) {
        this.keyboardShortcuts.delete(key);
      }
    });
  }

  /* ================================
     Configuration Management
     ================================ */

  private loadOnboardingConfig(): void {
    const stored = localStorage.getItem('soft-armor-onboarding');
    this.onboardingConfig = stored ? JSON.parse(stored) : {
      isFirstTime: true,
      hasSeenIntro: false,
      preferredScanType: 'standard',
      accessibilityMode: false
    };
  }

  private saveOnboardingConfig(): void {
    localStorage.setItem('soft-armor-onboarding', JSON.stringify(this.onboardingConfig));
  }

  /* ================================
     Utility Methods
     ================================ */

  private mapStepTypeToUIType(stepType: UserJourneyStep['type']): UIState['type'] {
    switch (stepType) {
      case 'scanning': return 'loading';
      case 'result': return 'success';
      case 'error': return 'error';
      case 'onboarding': case 'help': return 'success';
      default: return 'idle';
    }
  }

  private getResultConfig(result: 'safe' | 'warning' | 'danger') {
    const configs = {
      safe: {
        title: 'Content Appears Authentic',
        message: 'Our analysis found strong authenticity indicators.',
        ariaLabel: 'Scan complete - content appears safe',
        announcement: 'Scan complete. Content appears authentic with strong verification indicators.'
      },
      warning: {
        title: 'Content May Be Modified',
        message: 'Some inconsistencies detected. Exercise caution.',
        ariaLabel: 'Scan complete - content may be modified',
        announcement: 'Scan complete. Some inconsistencies detected in the content. Exercise caution.'
      },
      danger: {
        title: 'Content Likely Manipulated',
        message: 'Multiple manipulation indicators found.',
        ariaLabel: 'Scan complete - content likely manipulated',
        announcement: 'Scan complete. Multiple manipulation indicators found in the content.'
      }
    };
    return configs[result];
  }

  /* ================================
     Action Handlers
     ================================ */

  private cancelScan(): void {
    this.showJourneyStep({
      id: 'scan-cancelled',
      type: 'help',
      title: 'Scan Cancelled',
      message: 'The verification was stopped at your request.',
      duration: 2000,
      accessibility: {
        ariaLabel: 'Scan cancelled',
        announcement: 'Scan cancelled by user request.'
      }
    });
  }

  private retryNetworkOperation(): void {
    this.showJourneyStep({
      id: 'retry-network',
      type: 'scanning',
      title: 'Retrying Connection',
      message: 'Attempting to reconnect for full analysis...',
      accessibility: {
        ariaLabel: 'Retrying network connection',
        announcement: 'Retrying network connection for full analysis.'
      }
    });
  }

  private enableOfflineMode(): void {
    this.showJourneyStep({
      id: 'offline-mode',
      type: 'help',
      title: 'Offline Mode Active',
      message: 'Using local verification methods only.',
      duration: 2500,
      accessibility: {
        ariaLabel: 'Offline mode enabled',
        announcement: 'Offline mode active. Using local verification methods only.'
      }
    });
  }

  private showShortcutsHelp(): void {
    this.showJourneyStep({
      id: 'shortcuts-help',
      type: 'help',
      title: 'Keyboard Shortcuts',
      message: 'F1: Help • Ctrl+Shift+S: Shortcuts • Ctrl+Shift+A: Accessibility • Esc: Cancel',
      duration: 5000,
      accessibility: {
        ariaLabel: 'Keyboard shortcuts help',
        announcement: 'Available shortcuts: F1 for help, Control Shift S for shortcuts, Control Shift A for accessibility mode, Escape to cancel.'
      }
    });
  }

  private toggleAccessibilityMode(): void {
    this.onboardingConfig.accessibilityMode = !this.onboardingConfig.accessibilityMode;
    this.saveOnboardingConfig();
    
    const mode = this.onboardingConfig.accessibilityMode ? 'enabled' : 'disabled';
    this.showJourneyStep({
      id: 'accessibility-toggle',
      type: 'help',
      title: `Accessibility Mode ${mode.charAt(0).toUpperCase() + mode.slice(1)}`,
      message: `Enhanced accessibility features are now ${mode}.`,
      duration: 2000,
      accessibility: {
        ariaLabel: `Accessibility mode ${mode}`,
        announcement: `Accessibility mode ${mode}. Enhanced features for screen readers and keyboard navigation.`
      }
    });
  }

  private showHelp(): void {
    this.showJourneyStep({
      id: 'help',
      type: 'help',
      title: 'Soft-Armor Help',
      message: 'Right-click images/videos to scan • Green=Safe, Amber=Suspicious, Red=Concerning • Press F1 anytime for help',
      duration: 6000,
      accessibility: {
        ariaLabel: 'Help information',
        announcement: 'Help: Right-click images or videos to scan. Results use traffic light colors: green for safe, amber for suspicious, red for concerning. Press F1 anytime for help.'
      }
    });
  }

  private cancelCurrentAction(): void {
    if (this.currentJourneyStep) {
      this.bannerManager.hideStep(this.currentJourneyStep.id);
      this.currentJourneyStep = null;
    }
  }

  // Placeholder methods for missing functionality
  private showInteractiveDemo(): void { /* TODO: Implement */ }
  private showDetailedResults(details: any): void { /* TODO: Implement */ }
  private startNewScan(): void { /* TODO: Implement */ }
  private showSupportedFormats(): void { /* TODO: Implement */ }
  private startQuickScan(): void { /* TODO: Implement */ }
  private retryFullScan(): void { /* TODO: Implement */ }
  private enableReducedMotion(): void { /* TODO: Implement */ }
}

/* ================================
   Focus Management System
   ================================ */

class FocusManager {
  private focusableElements: HTMLElement[] = [];
  private currentFocusIndex = -1;

  handleTabNavigation(event: KeyboardEvent): void {
    this.updateFocusableElements();
    
    if (event.shiftKey) {
      this.focusPrevious();
    } else {
      this.focusNext();
    }
    
    event.preventDefault();
  }

  setFocus(selector: string): void {
    const element = document.querySelector(selector) as HTMLElement;
    if (element) {
      element.focus();
      this.currentFocusIndex = this.focusableElements.indexOf(element);
    }
  }

  private updateFocusableElements(): void {
    const selector = 'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])';
    this.focusableElements = Array.from(document.querySelectorAll(selector)) as HTMLElement[];
  }

  private focusNext(): void {
    this.currentFocusIndex = (this.currentFocusIndex + 1) % this.focusableElements.length;
    this.focusableElements[this.currentFocusIndex]?.focus();
  }

  private focusPrevious(): void {
    this.currentFocusIndex = this.currentFocusIndex <= 0 
      ? this.focusableElements.length - 1 
      : this.currentFocusIndex - 1;
    this.focusableElements[this.currentFocusIndex]?.focus();
  }
}

export default UserExperienceFlow;