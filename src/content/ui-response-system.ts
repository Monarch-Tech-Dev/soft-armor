import { RiskLevel, ScanResult, C2PAResult } from './types';
import { CertificateDisplay } from './certificate-display';
import { C2PABadge } from './c2pa-badge';

export interface UIState {
  type: 'idle' | 'loading' | 'success' | 'warning' | 'error';
  message: string;
  progress?: number;
  details?: any;
  autoHide?: boolean;
  duration?: number;
  disclosure?: {
    brief: string;
    detailed?: string;
    expandable?: boolean;
    initiallyExpanded?: boolean;
  };
}

export interface UITransition {
  from: UIState['type'];
  to: UIState['type'];
  duration: number;
  easing: string;
}

export class UIResponseSystem {
  private currentBanner: HTMLElement | null = null;
  private currentState: UIState['type'] = 'idle';
  private transitionQueue: UITransition[] = [];
  private isTransitioning = false;
  private autoHideTimer: number | null = null;
  private isExpanded = false;
  private certificateDisplay: CertificateDisplay;
  private c2paBadge: C2PABadge;

  constructor() {
    this.certificateDisplay = new CertificateDisplay();
    this.c2paBadge = new C2PABadge();
  }

  // Emotionally intelligent color psychology and states
  private readonly stateConfig = {
    idle: {
      color: '#8B9DC3', // Soft lavender-blue for calm neutrality
      icon: '🛡️',
      iconAlt: '○',
      priority: 0,
      autoHide: false,
      emotion: 'neutral'
    },
    loading: {
      color: '#4A90E2', // Gentle blue for trust and progress
      icon: '⏳',
      iconAlt: '◐',
      priority: 1,
      autoHide: false,
      emotion: 'anticipation'
    },
    success: {
      color: '#2E7D32', // Forest green for confidence and authenticity
      icon: '✓',
      iconAlt: '●',
      priority: 2,
      autoHide: true,
      duration: 6000,
      emotion: 'confident'
    },
    warning: {
      color: '#F57C00', // Warm amber for caution without fear
      icon: '◐',
      iconAlt: '▲',
      priority: 3,
      autoHide: true,
      duration: 8000,
      emotion: 'cautious'
    },
    error: {
      color: '#C62828', // Deep red for seriousness without panic
      icon: '◒',
      iconAlt: '■',
      priority: 4,
      autoHide: true,
      duration: 10000,
      emotion: 'serious'
    }
  };

  // Enhanced banner display with traffic-light system
  showTrafficLightBanner(state: UIState): void {
    // Check if we should interrupt current state
    if (!this.shouldTransition(this.currentState, state.type)) {
      return;
    }

    // Clear any existing auto-hide timer
    this.clearAutoHideTimer();

    // Handle banner replacement with sliding animation
    if (this.currentBanner) {
      const existingBanner = this.currentBanner;
      this.currentBanner = null; // Clear reference to prevent conflicts
      this.createTrafficLightBanner(state, existingBanner);
    } else {
      this.createTrafficLightBanner(state);
    }
  }

  private shouldTransition(from: UIState['type'], to: UIState['type']): boolean {
    const fromPriority = this.stateConfig[from].priority;
    const toPriority = this.stateConfig[to].priority;
    
    // Always allow transitions to higher priority states
    // Allow same priority transitions (for updates)
    // Block lower priority transitions unless enough time has passed
    return toPriority >= fromPriority;
  }

  private createTrafficLightBanner(state: UIState, existingBanner?: HTMLElement): void {
    const config = this.stateConfig[state.type];
    
    // Create banner container with accessibility attributes
    const banner = document.createElement('div');
    banner.className = `sa-response-banner sa-${state.type}`;
    banner.style.setProperty('--primary-color', config.color);
    
    // Accessibility attributes
    banner.setAttribute('role', 'alert');
    banner.setAttribute('aria-live', state.type === 'loading' ? 'polite' : 'assertive');
    banner.setAttribute('aria-atomic', 'true');
    banner.setAttribute('tabindex', '0');
    
    // Add describedby relationship for screen readers
    const bannerId = `sa-banner-${Date.now()}`;
    banner.id = bannerId;
    
    // Add traffic light indicator with accessibility
    const trafficLight = document.createElement('div');
    trafficLight.className = 'sa-traffic-light';
    trafficLight.setAttribute('role', 'img');
    trafficLight.setAttribute('aria-label', `Status: ${state.type}`);
    
    const lightIndicator = document.createElement('div');
    lightIndicator.className = 'sa-light-indicator';
    lightIndicator.style.backgroundColor = config.color;
    lightIndicator.setAttribute('aria-hidden', 'true');
    
    const lightIcon = document.createElement('span');
    lightIcon.className = 'sa-light-icon';
    lightIcon.textContent = config.icon;
    lightIcon.setAttribute('aria-hidden', 'true');
    
    trafficLight.appendChild(lightIndicator);
    trafficLight.appendChild(lightIcon);
    banner.appendChild(trafficLight);
    
    // Create content section with progressive disclosure
    const content = document.createElement('div');
    content.className = 'sa-response-content';
    
    // Progressive disclosure: create brief and detailed views
    if (state.disclosure) {
      this.createProgressiveDisclosureContent(content, state);
    } else {
      // Standard message display
      const message = document.createElement('div');
      message.className = 'sa-response-message';
      message.textContent = state.message;
      content.appendChild(message);
    }
    
    // Progress indicator for loading state
    if (state.type === 'loading') {
      const progressContainer = this.createEnhancedProgressIndicator(state);
      content.appendChild(progressContainer);
    }
    
    // Details section
    if (state.details) {
      const detailsSection = this.createDetailsSection(state.details);
      content.appendChild(detailsSection);
    }
    
    // Trust-building transparency section
    if (state.type !== 'loading') {
      const trustSection = this.createTrustSection(state);
      content.appendChild(trustSection);
    }
    
    banner.appendChild(content);
    
    // Action buttons
    const actions = document.createElement('div');
    actions.className = 'sa-response-actions';
    
    // Always add close button with accessibility
    const closeBtn = document.createElement('button');
    closeBtn.className = 'sa-action-btn sa-close-btn';
    closeBtn.innerHTML = '<span aria-hidden="true">×</span>';
    closeBtn.setAttribute('aria-label', 'Close notification');
    closeBtn.setAttribute('title', 'Close notification');
    closeBtn.onclick = () => this.hideBanner();
    actions.appendChild(closeBtn);
    
    // Add retry button for error states with accessibility
    if (state.type === 'error' && state.details?.retryAction) {
      const retryBtn = document.createElement('button');
      retryBtn.className = 'sa-action-btn sa-retry-btn';
      retryBtn.innerHTML = '<span aria-hidden="true">🔄</span>';
      retryBtn.setAttribute('aria-label', 'Retry operation');
      retryBtn.setAttribute('title', 'Retry operation');
      retryBtn.onclick = state.details.retryAction;
      actions.appendChild(retryBtn);
    }
    
    banner.appendChild(actions);
    
    // Add to page with enhanced sliding animation
    document.body.appendChild(banner);
    this.currentBanner = banner;
    this.currentState = state.type;
    
    // Apply mobile-specific positioning
    this.applyMobilePositioning(banner);
    
    // Add keyboard navigation support
    this.addKeyboardNavigation(banner);
    
    // Trigger enhanced entrance animation
    this.slideInNewBanner(banner, existingBanner);
    
    // Announce to screen readers
    this.announceToScreenReader(state);
    
    // Set auto-hide timer if configured
    if (state.autoHide ?? config.autoHide) {
      const duration = state.duration ?? config.duration ?? 5000;
      this.setAutoHideTimer(duration);
    }
  }

  private createEnhancedProgressIndicator(state: UIState): HTMLElement {
    const container = document.createElement('div');
    container.className = 'sa-progress-indicator';
    
    // Handle different types of progress indicators
    if (state.details?.indeterminate) {
      return this.createIndeterminateProgress(state.details);
    }
    
    if (state.details?.isMultiStep) {
      return this.createMultiStepProgress(state);
    }
    
    // Standard progress bar
    return this.createStandardProgress(state.progress || 0);
  }

  private createStandardProgress(progress: number): HTMLElement {
    const container = document.createElement('div');
    container.className = 'sa-progress-indicator';
    
    const track = document.createElement('div');
    track.className = 'sa-progress-track';
    
    const bar = document.createElement('div');
    bar.className = 'sa-progress-bar';
    bar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    
    const text = document.createElement('span');
    text.className = 'sa-progress-text';
    text.textContent = `${Math.round(progress * 100)}%`;
    
    // Add pulsing animation for active progress
    if (progress < 1) {
      bar.classList.add('sa-progress-active');
    }
    
    track.appendChild(bar);
    container.appendChild(track);
    container.appendChild(text);
    
    return container;
  }

  private createIndeterminateProgress(details: any): HTMLElement {
    const container = document.createElement('div');
    container.className = 'sa-progress-indicator sa-indeterminate';
    
    const track = document.createElement('div');
    track.className = 'sa-progress-track';
    
    const bar = document.createElement('div');
    bar.className = 'sa-progress-bar sa-indeterminate-bar';
    
    track.appendChild(bar);
    container.appendChild(track);
    
    // Add sub-message if provided
    if (details.subMessage) {
      const subText = document.createElement('span');
      subText.className = 'sa-progress-sub-text';
      subText.textContent = details.subMessage;
      container.appendChild(subText);
    }
    
    // Add elapsed time indicator
    if (details.startTime) {
      const timeIndicator = document.createElement('span');
      timeIndicator.className = 'sa-progress-time';
      container.appendChild(timeIndicator);
      
      // Update time periodically
      const updateTime = () => {
        const elapsed = Math.floor((Date.now() - details.startTime) / 1000);
        timeIndicator.textContent = `${elapsed}s`;
      };
      updateTime();
      setInterval(updateTime, 1000);
    }
    
    return container;
  }

  private createMultiStepProgress(state: UIState): HTMLElement {
    const container = document.createElement('div');
    container.className = 'sa-progress-indicator sa-multi-step';
    
    const details = state.details;
    const progress = state.progress || 0;
    
    // Step indicator
    const stepIndicator = document.createElement('div');
    stepIndicator.className = 'sa-step-indicator';
    stepIndicator.textContent = `Step ${details.currentStep} of ${details.totalSteps}`;
    container.appendChild(stepIndicator);
    
    // Progress track
    const track = document.createElement('div');
    track.className = 'sa-progress-track';
    
    const bar = document.createElement('div');
    bar.className = 'sa-progress-bar';
    bar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    
    // Add step markers
    for (let i = 1; i <= details.totalSteps; i++) {
      const marker = document.createElement('div');
      marker.className = 'sa-step-marker';
      marker.style.left = `${(i / details.totalSteps) * 100}%`;
      
      if (i <= details.currentStep) {
        marker.classList.add('sa-step-completed');
      }
      
      track.appendChild(marker);
    }
    
    track.appendChild(bar);
    container.appendChild(track);
    
    // Step description
    if (details.stepDescription) {
      const stepDesc = document.createElement('span');
      stepDesc.className = 'sa-step-description';
      stepDesc.textContent = details.stepDescription;
      container.appendChild(stepDesc);
    }
    
    // Progress percentage
    const text = document.createElement('span');
    text.className = 'sa-progress-text';
    text.textContent = `${Math.round(progress * 100)}%`;
    container.appendChild(text);
    
    return container;
  }

  // Trust-building elements
  private createTrustSection(state: UIState): HTMLElement {
    const trustContainer = document.createElement('div');
    trustContainer.className = 'sa-trust-section';
    
    // Technology transparency
    const techInfo = document.createElement('div');
    techInfo.className = 'sa-tech-transparency';
    
    const techTitle = document.createElement('div');
    techTitle.className = 'sa-trust-title';
    techTitle.innerHTML = '🔬 Technology Used';
    techInfo.appendChild(techTitle);
    
    const techDetails = document.createElement('div');
    techDetails.className = 'sa-trust-details';
    
    const technologies = this.getTechnologiesUsed(state.type);
    technologies.forEach(tech => {
      const techItem = document.createElement('div');
      techItem.className = 'sa-tech-item';
      techItem.innerHTML = `<span class="sa-tech-icon">${tech.icon}</span><span class="sa-tech-name">${tech.name}</span>`;
      techDetails.appendChild(techItem);
    });
    
    techInfo.appendChild(techDetails);
    trustContainer.appendChild(techInfo);
    
    // Privacy assurance
    const privacyInfo = document.createElement('div');
    privacyInfo.className = 'sa-privacy-assurance';
    
    const privacyTitle = document.createElement('div');
    privacyTitle.className = 'sa-trust-title';
    privacyTitle.innerHTML = '🛡️ Privacy Protected';
    privacyInfo.appendChild(privacyTitle);
    
    const privacyText = document.createElement('div');
    privacyText.className = 'sa-trust-text';
    privacyText.textContent = 'Analysis performed locally on your device. No data sent to external servers.';
    privacyInfo.appendChild(privacyText);
    
    trustContainer.appendChild(privacyInfo);
    
    // Certification indicators (when available)
    if (state.type === 'success') {
      const certInfo = document.createElement('div');
      certInfo.className = 'sa-certification-info';
      
      const certTitle = document.createElement('div');
      certTitle.className = 'sa-trust-title';
      certTitle.innerHTML = '✅ Verification Standards';
      certInfo.appendChild(certTitle);
      
      const certText = document.createElement('div');
      certText.className = 'sa-trust-text';
      certText.textContent = 'Complies with C2PA industry authentication standards';
      certInfo.appendChild(certText);
      
      trustContainer.appendChild(certInfo);
    }
    
    return trustContainer;
  }

  private getTechnologiesUsed(stateType: UIState['type']): Array<{icon: string, name: string}> {
    const baseTech = [
      { icon: '🔐', name: 'C2PA Cryptographic Verification' },
      { icon: '🧠', name: 'Computer Vision Analysis' }
    ];
    
    if (stateType === 'success' || stateType === 'warning' || stateType === 'error') {
      baseTech.push({ icon: '📊', name: 'Statistical Pattern Analysis' });
    }
    
    return baseTech;
  }

  // Progressive disclosure system
  private createProgressiveDisclosureContent(container: HTMLElement, state: UIState): void {
    const disclosure = state.disclosure!;
    this.isExpanded = disclosure.initiallyExpanded || false;
    
    // Brief summary (always visible)
    const briefSection = document.createElement('div');
    briefSection.className = 'sa-disclosure-brief';
    
    const briefMessage = document.createElement('div');
    briefMessage.className = 'sa-response-message sa-brief-message';
    briefMessage.textContent = disclosure.brief;
    briefSection.appendChild(briefMessage);
    
    // Expandable indicator and toggle
    if (disclosure.expandable && disclosure.detailed) {
      const toggleContainer = document.createElement('div');
      toggleContainer.className = 'sa-disclosure-toggle-container';
      
      const toggleButton = document.createElement('button');
      toggleButton.className = 'sa-disclosure-toggle';
      toggleButton.setAttribute('aria-expanded', this.isExpanded.toString());
      toggleButton.innerHTML = this.isExpanded ? 
        '<span class="sa-toggle-text">Show less</span> <span class="sa-toggle-icon">▲</span>' :
        '<span class="sa-toggle-text">Show details</span> <span class="sa-toggle-icon">▼</span>';
      
      toggleButton.addEventListener('click', () => this.toggleDisclosure(state));
      toggleContainer.appendChild(toggleButton);
      briefSection.appendChild(toggleContainer);
    }
    
    container.appendChild(briefSection);
    
    // Detailed section (conditionally visible)
    if (disclosure.detailed) {
      const detailedSection = document.createElement('div');
      detailedSection.className = `sa-disclosure-detailed ${this.isExpanded ? 'sa-expanded' : 'sa-collapsed'}`;
      
      const detailedMessage = document.createElement('div');
      detailedMessage.className = 'sa-response-message sa-detailed-message';
      
      // Handle multiline text by converting newlines to line breaks
      if (disclosure.detailed.includes('\n')) {
        const lines = disclosure.detailed.split('\n');
        lines.forEach((line, index) => {
          if (index > 0) {
            detailedMessage.appendChild(document.createElement('br'));
          }
          const textNode = document.createTextNode(line);
          detailedMessage.appendChild(textNode);
        });
      } else {
        detailedMessage.textContent = disclosure.detailed;
      }
      
      detailedSection.appendChild(detailedMessage);
      
      container.appendChild(detailedSection);
    }
  }

  private toggleDisclosure(state: UIState): void {
    if (!this.currentBanner) return;
    
    this.isExpanded = !this.isExpanded;
    
    const detailedSection = this.currentBanner.querySelector('.sa-disclosure-detailed') as HTMLElement;
    const toggleButton = this.currentBanner.querySelector('.sa-disclosure-toggle') as HTMLElement;
    
    if (detailedSection && toggleButton) {
      // Update button state
      toggleButton.setAttribute('aria-expanded', this.isExpanded.toString());
      toggleButton.innerHTML = this.isExpanded ? 
        '<span class="sa-toggle-text">Show less</span> <span class="sa-toggle-icon">▲</span>' :
        '<span class="sa-toggle-text">Show details</span> <span class="sa-toggle-icon">▼</span>';
      
      // Animate the disclosure
      if (this.isExpanded) {
        detailedSection.classList.remove('sa-collapsed');
        detailedSection.classList.add('sa-expanded');
        
        // Trigger expansion animation
        detailedSection.style.maxHeight = '0px';
        detailedSection.style.opacity = '0';
        
        requestAnimationFrame(() => {
          detailedSection.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          detailedSection.style.maxHeight = detailedSection.scrollHeight + 'px';
          detailedSection.style.opacity = '1';
          
          setTimeout(() => {
            detailedSection.style.maxHeight = 'none';
            detailedSection.style.transition = '';
          }, 300);
        });
      } else {
        // Trigger collapse animation
        detailedSection.style.maxHeight = detailedSection.scrollHeight + 'px';
        detailedSection.style.opacity = '1';
        
        requestAnimationFrame(() => {
          detailedSection.style.transition = 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
          detailedSection.style.maxHeight = '0px';
          detailedSection.style.opacity = '0';
          
          setTimeout(() => {
            detailedSection.classList.remove('sa-expanded');
            detailedSection.classList.add('sa-collapsed');
            detailedSection.style.transition = '';
          }, 300);
        });
      }
      
      // Reset auto-hide timer when expanded
      if (this.isExpanded && state.autoHide) {
        this.clearAutoHideTimer();
      } else if (!this.isExpanded && state.autoHide) {
        const config = this.stateConfig[state.type];
        const duration = state.duration ?? config.duration ?? 5000;
        this.setAutoHideTimer(duration);
      }
    }
  }

  private processErrorDetails(error?: Error, retryAction?: () => void): any {
    if (!error) {
      return { retryAction };
    }

    const processed = {
      message: error.message,
      name: error.name,
      retryAction,
      severity: (error as any).severity || 'normal',
      supportInfo: (error as any).supportInfo,
      userFriendlyMessage: this.getUserFriendlyErrorMessage(error),
      troubleshootingSteps: this.getTroubleshootingSteps(error)
    };

    if (typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.NODE_ENV === 'development') {
      processed.stack = error.stack;
    }

    return processed;
  }

  private getUserFriendlyErrorMessage(error: Error): string {
    const message = error.message.toLowerCase();
    
    if (message.includes('network') || message.includes('fetch')) {
      return 'Connection problem - please check your internet and try again';
    }
    if (message.includes('timeout')) {
      return 'This is taking longer than expected - please try again';
    }
    if (message.includes('permission') || message.includes('unauthorized')) {
      return 'You don\'t have permission to access this - try refreshing the page';
    }
    if (message.includes('cors')) {
      return 'Security settings prevented access to this content';
    }
    if (message.includes('quota') || message.includes('limit')) {
      return 'Usage limit reached - please try again later';
    }
    if (message.includes('parse') || message.includes('syntax')) {
      return 'The content format isn\'t supported';
    }
    
    return error.message;
  }

  private getTroubleshootingSteps(error: Error): string[] {
    const message = error.message.toLowerCase();
    const steps: string[] = [];
    
    if (message.includes('network') || message.includes('fetch')) {
      steps.push('Check your internet connection');
      steps.push('Try refreshing the page');
      steps.push('Disable ad blockers or VPN temporarily');
    } else if (message.includes('permission')) {
      steps.push('Refresh the page to reset permissions');
      steps.push('Check if you\'re logged in');
      steps.push('Try in an incognito/private window');
    } else if (message.includes('timeout')) {
      steps.push('Wait a moment and try again');
      steps.push('Check if the server is responding');
      steps.push('Try with a smaller file');
    } else {
      steps.push('Try refreshing the page');
      steps.push('Clear your browser cache');
      steps.push('Try again in a few minutes');
    }
    
    return steps;
  }

  private createDetailsSection(details: any): HTMLElement {
    const section = document.createElement('div');
    section.className = 'sa-response-details';
    
    if (details && (details.message || details instanceof Error)) {
      // Error details with enhanced display
      const errorTitle = document.createElement('div');
      errorTitle.className = 'sa-detail-title';
      errorTitle.textContent = details.severity === 'critical' ? 'Critical Error' : 'Error Details';
      section.appendChild(errorTitle);
      
      // User-friendly message
      const friendlyMessage = document.createElement('div');
      friendlyMessage.className = 'sa-detail-text sa-friendly-error';
      friendlyMessage.textContent = details.userFriendlyMessage || details.message;
      section.appendChild(friendlyMessage);
      
      // Troubleshooting steps
      if (details.troubleshootingSteps && details.troubleshootingSteps.length > 0) {
        const troubleshootingTitle = document.createElement('div');
        troubleshootingTitle.className = 'sa-troubleshooting-title';
        troubleshootingTitle.textContent = 'Try these steps:';
        section.appendChild(troubleshootingTitle);
        
        const stepsList = document.createElement('ul');
        stepsList.className = 'sa-troubleshooting-steps';
        
        details.troubleshootingSteps.forEach((step: string) => {
          const stepItem = document.createElement('li');
          stepItem.className = 'sa-troubleshooting-step';
          stepItem.textContent = step;
          stepsList.appendChild(stepItem);
        });
        
        section.appendChild(stepsList);
      }
      
      // Support information for critical errors
      if (details.supportInfo) {
        const supportInfo = document.createElement('div');
        supportInfo.className = 'sa-support-info';
        supportInfo.textContent = details.supportInfo;
        section.appendChild(supportInfo);
      }
      
      // Technical details (collapsible)
      if (details.message !== details.userFriendlyMessage) {
        const techDetails = document.createElement('details');
        techDetails.className = 'sa-tech-details';
        
        const summary = document.createElement('summary');
        summary.textContent = 'Technical Details';
        techDetails.appendChild(summary);
        
        const techMessage = document.createElement('div');
        techMessage.className = 'sa-detail-text sa-error-text';
        techMessage.textContent = details.message;
        techDetails.appendChild(techMessage);
        
        section.appendChild(techDetails);
      }
      
      // Stack trace for development
      if (details.stack && typeof (globalThis as any).process !== 'undefined' && (globalThis as any).process.env?.NODE_ENV === 'development') {
        const stackTrace = document.createElement('details');
        stackTrace.className = 'sa-stack-trace';
        
        const summary = document.createElement('summary');
        summary.textContent = 'Stack Trace';
        stackTrace.appendChild(summary);
        
        const stackText = document.createElement('pre');
        stackText.className = 'sa-stack-text';
        stackText.textContent = details.stack;
        stackTrace.appendChild(stackText);
        
        section.appendChild(stackTrace);
      }
    } else if (typeof details === 'object') {
      // Scan result details
      Object.entries(details).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          const detailItem = document.createElement('div');
          detailItem.className = 'sa-detail-item';
          
          const label = document.createElement('span');
          label.className = 'sa-detail-label';
          label.textContent = this.formatLabel(key);
          
          const valueSpan = document.createElement('span');
          valueSpan.className = 'sa-detail-value';
          valueSpan.textContent = this.formatValue(value);
          
          detailItem.appendChild(label);
          detailItem.appendChild(valueSpan);
          section.appendChild(detailItem);
        }
      });
    } else {
      // Simple text details
      const text = document.createElement('div');
      text.className = 'sa-detail-text';
      text.textContent = String(details);
      section.appendChild(text);
    }
    
    return section;
  }

  private formatLabel(key: string): string {
    return key
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .replace(/^\s+/, '') + ':';
  }

  private formatValue(value: any): string {
    if (typeof value === 'boolean') {
      return value ? '✓' : '✗';
    }
    if (typeof value === 'number') {
      return value.toFixed(2);
    }
    if (value instanceof Date) {
      return value.toLocaleString();
    }
    return String(value);
  }

  // Enhanced sliding notification animation system with emotional intelligence
  private async animateIn(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      // Get emotional context for animation
      const stateType = this.getElementStateType(element);
      const animation = this.getEmotionalAnimation(stateType);
      
      // Initial state based on emotion
      element.style.opacity = '0';
      element.style.transform = animation.initial.transform;
      element.style.filter = animation.initial.filter;
      
      // Force reflow
      element.offsetHeight;
      
      // Emotionally appropriate entrance animation
      element.style.transition = animation.transition;
      element.style.opacity = '1';
      element.style.transform = animation.final.transform;
      element.style.filter = animation.final.filter;
      
      // State-specific gentle effects
      setTimeout(() => {
        this.applyStateSpecificAnimation(element, stateType);
      }, animation.delay);
      
      setTimeout(() => {
        element.style.transition = '';
        resolve();
      }, animation.duration);
    });
  }

  private getElementStateType(element: HTMLElement): UIState['type'] {
    if (element.classList.contains('sa-success')) return 'success';
    if (element.classList.contains('sa-warning')) return 'warning';
    if (element.classList.contains('sa-error')) return 'error';
    if (element.classList.contains('sa-loading')) return 'loading';
    return 'idle';
  }

  private getEmotionalAnimation(stateType: UIState['type']) {
    const animations = {
      success: {
        initial: {
          transform: 'translateX(-50%) translateY(-80px) scale(0.92)',
          filter: 'blur(3px) brightness(1.1)'
        },
        final: {
          transform: 'translateX(-50%) translateY(0) scale(1)',
          filter: 'blur(0px) brightness(1)'
        },
        transition: 'all 0.6s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        delay: 400,
        duration: 600
      },
      warning: {
        initial: {
          transform: 'translateX(-50%) translateY(-60px) scale(0.95)',
          filter: 'blur(2px) contrast(1.05)'
        },
        final: {
          transform: 'translateX(-50%) translateY(0) scale(1)',
          filter: 'blur(0px) contrast(1)'
        },
        transition: 'all 0.5s cubic-bezier(0.34, 1.26, 0.64, 1)',
        delay: 300,
        duration: 500
      },
      error: {
        initial: {
          transform: 'translateX(-50%) translateY(-70px) scale(0.94)',
          filter: 'blur(2px) saturate(0.9)'
        },
        final: {
          transform: 'translateX(-50%) translateY(0) scale(1)',
          filter: 'blur(0px) saturate(1)'
        },
        transition: 'all 0.55s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        delay: 350,
        duration: 550
      },
      loading: {
        initial: {
          transform: 'translateX(-50%) translateY(-90px) scale(0.9)',
          filter: 'blur(4px) hue-rotate(5deg)'
        },
        final: {
          transform: 'translateX(-50%) translateY(0) scale(1)',
          filter: 'blur(0px) hue-rotate(0deg)'
        },
        transition: 'all 0.7s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        delay: 450,
        duration: 700
      },
      idle: {
        initial: {
          transform: 'translateX(-50%) translateY(-50px) scale(0.96)',
          filter: 'blur(2px)'
        },
        final: {
          transform: 'translateX(-50%) translateY(0) scale(1)',
          filter: 'blur(0px)'
        },
        transition: 'all 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
        delay: 250,
        duration: 400
      }
    };
    
    return animations[stateType];
  }

  private applyStateSpecificAnimation(element: HTMLElement, stateType: UIState['type']): void {
    switch (stateType) {
      case 'success':
        // Gentle upward float and settle
        element.style.transition = 'transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1)';
        element.style.transform = 'translateX(-50%) translateY(-3px) scale(1.01)';
        setTimeout(() => {
          element.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        }, 200);
        break;
        
      case 'warning':
        // Gentle attention pulse
        element.style.transition = 'transform 0.3s ease-out';
        element.style.transform = 'translateX(-50%) translateY(-1px) scale(1.005)';
        setTimeout(() => {
          element.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        }, 150);
        break;
        
      case 'error':
        // Gentle settle with slight emphasis
        element.style.transition = 'transform 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
        element.style.transform = 'translateX(-50%) translateY(-2px) scale(1.008)';
        setTimeout(() => {
          element.style.transform = 'translateX(-50%) translateY(0) scale(1)';
        }, 175);
        break;
        
      case 'loading':
        // No additional animation needed - breathing animation handles this
        break;
    }
  }

  private async animateOut(element: HTMLElement): Promise<void> {
    return new Promise((resolve) => {
      // Determine exit direction based on state
      const isError = element.classList.contains('sa-error');
      const slideDirection = isError ? 'translateY(-80px)' : 'translateY(-60px)';
      
      element.style.transition = 'all 0.4s cubic-bezier(0.55, 0.085, 0.68, 0.53)';
      element.style.opacity = '0';
      element.style.transform = `translateX(-50%) ${slideDirection} scale(0.9)`;
      element.style.filter = 'blur(2px)';
      
      setTimeout(() => {
        if (element.parentNode) {
          element.parentNode.removeChild(element);
        }
        resolve();
      }, 400);
    });
  }

  // Notification stacking system for multiple banners
  private async slideInNewBanner(newElement: HTMLElement, existingElement?: HTMLElement): Promise<void> {
    if (existingElement) {
      // Push existing banner up slightly
      existingElement.style.transition = 'transform 0.3s ease-out';
      existingElement.style.transform = 'translateX(-50%) translateY(-10px) scale(0.95)';
      existingElement.style.opacity = '0.8';
      
      // Slide new banner in below
      await this.animateIn(newElement);
      
      // Remove the old banner after new one is in
      setTimeout(() => {
        this.animateOut(existingElement);
      }, 200);
    } else {
      await this.animateIn(newElement);
    }
  }

  // Accessibility support methods
  private addKeyboardNavigation(banner: HTMLElement): void {
    banner.addEventListener('keydown', (event) => {
      switch (event.key) {
        case 'Escape':
          event.preventDefault();
          this.hideBanner();
          break;
        case 'Tab':
          // Allow tab navigation within banner
          this.handleTabNavigation(event, banner);
          break;
        case 'Enter':
        case ' ':
          // Activate focused element
          if (event.target instanceof HTMLElement && event.target.classList.contains('sa-disclosure-toggle')) {
            event.preventDefault();
            event.target.click();
          }
          break;
      }
    });

    // Add touch interaction support
    this.addTouchSupport(banner);

    // Focus management - focus banner when it appears (skip on mobile to avoid virtual keyboard)
    setTimeout(() => {
      if (banner.isConnected && !this.isMobileDevice()) {
        banner.focus();
      }
    }, 100);
  }

  private addTouchSupport(banner: HTMLElement): void {
    // Add touch-friendly swipe to dismiss on mobile
    if (this.isMobileDevice()) {
      let startY = 0;
      let startTime = 0;

      banner.addEventListener('touchstart', (event) => {
        startY = event.touches[0].clientY;
        startTime = Date.now();
      }, { passive: true });

      banner.addEventListener('touchend', (event) => {
        const endY = event.changedTouches[0].clientY;
        const deltaY = startY - endY;
        const deltaTime = Date.now() - startTime;

        // Swipe up to dismiss (minimum 50px, max 500ms)
        if (deltaY > 50 && deltaTime < 500) {
          this.hideBanner();
        }
      }, { passive: true });

      // Add visual feedback for touch
      banner.addEventListener('touchstart', () => {
        banner.style.transform = 'translateX(-50%) translateY(0) scale(0.98)';
      }, { passive: true });

      banner.addEventListener('touchend', () => {
        banner.style.transform = 'translateX(-50%) translateY(0) scale(1)';
      }, { passive: true });
    }
  }

  private isMobileDevice(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) ||
           (window.innerWidth <= 768 && 'ontouchstart' in window);
  }

  private applyMobilePositioning(banner: HTMLElement): void {
    if (this.isMobileDevice()) {
      // Adjust for mobile viewport and potential notches
      const viewportHeight = window.innerHeight;
      const safeAreaTop = this.getSafeAreaTop();
      
      // Position below any potential notch or status bar
      banner.style.top = `${Math.max(16, safeAreaTop + 8)}px`;
      
      // Ensure banner doesn't exceed viewport
      const maxHeight = viewportHeight * 0.8; // Max 80% of viewport height
      banner.style.maxHeight = `${maxHeight}px`;
      banner.style.overflowY = 'auto';
      
      // Add safe area padding for devices with notches
      if (safeAreaTop > 0) {
        banner.style.paddingTop = `${Math.max(16, safeAreaTop / 2)}px`;
      }
    }
  }

  private getSafeAreaTop(): number {
    // Try to get safe area inset from CSS env() if available
    const safeAreaTop = getComputedStyle(document.documentElement)
      .getPropertyValue('--safe-area-inset-top');
    
    if (safeAreaTop) {
      return parseInt(safeAreaTop.replace('px', '')) || 0;
    }
    
    // Fallback: detect iOS notch
    if (/iPhone/.test(navigator.userAgent) && window.screen.height >= 812) {
      // iPhone X and newer typically have a notch
      return 44; // Status bar height with notch
    }
    
    return 0;
  }

  private handleTabNavigation(event: KeyboardEvent, banner: HTMLElement): void {
    const focusableElements = banner.querySelectorAll(
      'button, [tabindex="0"], .sa-disclosure-toggle'
    );
    
    if (focusableElements.length === 0) return;

    const firstElement = focusableElements[0] as HTMLElement;
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement;

    if (event.shiftKey) {
      // Shift + Tab (backward)
      if (document.activeElement === firstElement || document.activeElement === banner) {
        event.preventDefault();
        lastElement.focus();
      }
    } else {
      // Tab (forward)
      if (document.activeElement === lastElement) {
        event.preventDefault();
        firstElement.focus();
      }
    }
  }

  private announceToScreenReader(state: UIState): void {
    // Create a temporary screen reader announcement
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'assertive');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.style.position = 'absolute';
    announcement.style.left = '-10000px';
    announcement.style.width = '1px';
    announcement.style.height = '1px';
    announcement.style.overflow = 'hidden';

    // Compose the announcement text
    let announcementText = '';
    
    if (state.disclosure) {
      announcementText = `${state.type} notification: ${state.disclosure.brief}`;
      if (state.disclosure.detailed && state.disclosure.initiallyExpanded) {
        announcementText += `. ${state.disclosure.detailed}`;
      }
    } else {
      announcementText = `${state.type} notification: ${state.message}`;
    }

    // Add context for different states
    switch (state.type) {
      case 'loading':
        announcementText += '. Please wait.';
        break;
      case 'error':
        announcementText += '. Press Tab to access retry button, or Escape to close.';
        break;
      default:
        announcementText += '. Press Escape to close.';
    }

    announcement.textContent = announcementText;
    document.body.appendChild(announcement);

    // Remove after announcement
    setTimeout(() => {
      if (announcement.parentNode) {
        announcement.parentNode.removeChild(announcement);
      }
    }, 1000);
  }

  // Enhanced loading states
  showLoadingState(message: string, progress?: number, details?: any): void {
    this.showTrafficLightBanner({
      type: 'loading',
      message,
      progress,
      details,
      autoHide: false
    });
  }

  showIndeterminateLoadingState(message: string, subMessage?: string): void {
    this.showTrafficLightBanner({
      type: 'loading',
      message,
      details: { 
        indeterminate: true,
        subMessage,
        startTime: Date.now()
      },
      autoHide: false
    });
  }

  showMultiStepLoadingState(
    message: string, 
    currentStep: number, 
    totalSteps: number, 
    stepDescription?: string
  ): void {
    const progress = currentStep / totalSteps;
    this.showTrafficLightBanner({
      type: 'loading',
      message,
      progress,
      details: {
        currentStep,
        totalSteps,
        stepDescription,
        isMultiStep: true
      },
      autoHide: false
    });
  }

  updateProgress(progress: number, message?: string): void {
    if (this.currentState === 'loading' && this.currentBanner) {
      const progressBar = this.currentBanner.querySelector('.sa-progress-bar') as HTMLElement;
      const progressText = this.currentBanner.querySelector('.sa-progress-text') as HTMLElement;
      const messageEl = this.currentBanner.querySelector('.sa-response-message') as HTMLElement;
      
      if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
      }
      
      if (progressText) {
        progressText.textContent = `${Math.round(progress * 100)}%`;
      }
      
      if (message && messageEl) {
        messageEl.textContent = message;
      }
      
      // Remove active animation when complete
      if (progress >= 1 && progressBar) {
        progressBar.classList.remove('sa-progress-active');
      }
    }
  }

  showSuccessState(message: string, details?: any): void {
    this.showTrafficLightBanner({
      type: 'success',
      message,
      details,
      autoHide: true
    });
  }

  showWarningState(message: string, details?: any): void {
    this.showTrafficLightBanner({
      type: 'warning',
      message,
      details,
      autoHide: true
    });
  }

  showErrorState(message: string, error?: Error, retryAction?: () => void): void {
    const errorDetails = this.processErrorDetails(error, retryAction);
    
    this.showTrafficLightBanner({
      type: 'error',
      message,
      details: errorDetails,
      autoHide: true,
      duration: errorDetails.severity === 'critical' ? 12000 : 8000
    });
  }

  // Progressive disclosure convenience methods
  showProgressiveState(
    type: UIState['type'],
    briefMessage: string,
    detailedMessage?: string,
    options?: {
      expandable?: boolean;
      initiallyExpanded?: boolean;
      autoHide?: boolean;
      details?: any;
    }
  ): void {
    this.showTrafficLightBanner({
      type,
      message: briefMessage, // Keep for backward compatibility
      disclosure: {
        brief: briefMessage,
        detailed: detailedMessage,
        expandable: options?.expandable ?? !!detailedMessage,
        initiallyExpanded: options?.initiallyExpanded ?? false
      },
      details: options?.details,
      autoHide: options?.autoHide ?? true
    });
  }

  showSuccessWithDetails(briefMessage: string, detailedMessage: string, scanResult?: any): void {
    this.showProgressiveState('success', briefMessage, detailedMessage, {
      expandable: true,
      initiallyExpanded: false,
      autoHide: true,
      details: scanResult
    });
  }

  showWarningWithDetails(briefMessage: string, detailedMessage: string, details?: any): void {
    this.showProgressiveState('warning', briefMessage, detailedMessage, {
      expandable: true,
      initiallyExpanded: false,
      autoHide: true,
      details
    });
  }

  showNetworkErrorState(originalError: Error, retryAction?: () => void): void {
    this.showErrorState(
      'Network connection failed',
      new Error('Unable to connect to server. Check your internet connection.'),
      retryAction
    );
  }

  showTimeoutErrorState(retryAction?: () => void): void {
    this.showErrorState(
      'Request timed out',
      new Error('The operation took too long to complete. This might be due to a slow connection or server issues.'),
      retryAction
    );
  }

  showPermissionErrorState(): void {
    this.showErrorState(
      'Access denied',
      new Error('Insufficient permissions to access this resource. Try refreshing the page or contact support.')
    );
  }

  showValidationErrorState(field: string, issue: string): void {
    this.showErrorState(
      'Invalid input',
      new Error(`${field}: ${issue}. Please check your input and try again.`)
    );
  }

  showCriticalErrorState(message: string, error: Error, supportInfo?: string): void {
    const criticalError = new Error(error.message);
    (criticalError as any).severity = 'critical';
    (criticalError as any).supportInfo = supportInfo;
    
    this.showErrorState(message, criticalError);
  }

  // Banner management
  hideBanner(): void {
    this.clearAutoHideTimer();
    
    if (this.currentBanner) {
      this.animateOut(this.currentBanner).then(() => {
        this.currentBanner = null;
        this.currentState = 'idle';
      });
    }
  }

  private setAutoHideTimer(duration: number): void {
    this.clearAutoHideTimer();
    this.autoHideTimer = window.setTimeout(() => {
      this.hideBanner();
    }, duration);
  }

  private clearAutoHideTimer(): void {
    if (this.autoHideTimer) {
      clearTimeout(this.autoHideTimer);
      this.autoHideTimer = null;
    }
  }

  // Enhanced C2PA result display methods
  showC2PAResult(
    scanResult: ScanResult,
    mediaElement?: HTMLImageElement | HTMLVideoElement
  ): void {
    const c2paResult = scanResult.c2paDetails;
    if (!c2paResult) {
      this.showSimpleBanner('Scan completed', scanResult.riskLevel);
      return;
    }

    const confidence = c2paResult.confidenceScore || 0;
    const trustLevel = c2paResult.trustLevel || 'low';
    const signer = c2paResult.signer || 'Unknown';
    
    // Create user-friendly message based on results
    const briefMessage = this.getC2PABriefMessage(c2paResult, confidence);
    const detailedMessage = this.getC2PADetailedMessage(c2paResult, scanResult);
    
    // Show enhanced banner with confidence score
    this.showProgressiveState(
      this.getC2PAStateType(c2paResult, confidence),
      briefMessage,
      detailedMessage,
      {
        expandable: true,
        initiallyExpanded: false,
        autoHide: true,
        details: { 
          ...scanResult, 
          confidence,
          trustLevel,
          signer,
          showCertificateAction: c2paResult.validationStatus !== 'missing'
        }
      }
    );

    // Attach C2PA badge to media element if provided
    if (mediaElement && c2paResult.validationStatus !== 'missing') {
      this.c2paBadge.attachBadgeToMedia(c2paResult, mediaElement);
    }
  }

  showCertificateDetails(c2paResult: C2PAResult): void {
    this.certificateDisplay.showCertificatePanel(c2paResult);
  }

  private getC2PABriefMessage(c2paResult: C2PAResult, confidence: number): string {
    switch (c2paResult.validationStatus) {
      case 'valid':
        return confidence >= 90 
          ? `✅ Highly trusted content (${confidence}% confidence)`
          : confidence >= 70
          ? `✅ Verified content (${confidence}% confidence)`
          : `✅ Content verified (${confidence}% confidence)`;
      
      case 'valid-untrusted':
        return `⚠️ Self-signed content (${confidence}% confidence)`;
      
      case 'invalid':
        return `❌ Invalid authenticity data (${confidence}% confidence)`;
      
      case 'missing':
        return 'ℹ️ No authenticity information available';
      
      case 'error':
        return '⚡ Unable to verify authenticity';
      
      default:
        return `❓ Authenticity unknown (${confidence}% confidence)`;
    }
  }

  private getC2PADetailedMessage(c2paResult: C2PAResult, scanResult: ScanResult): string {
    const lines: string[] = [];
    
    if (c2paResult.signer) {
      lines.push(`Signed by: ${c2paResult.signer}`);
    }
    
    if (c2paResult.signedTimestamp) {
      const date = new Date(c2paResult.signedTimestamp);
      lines.push(`Signed on: ${date.toLocaleDateString()}`);
    }
    
    if (c2paResult.softwareAgent) {
      lines.push(`Created with: ${c2paResult.softwareAgent}`);
    }
    
    // Add trust information
    if (c2paResult.trustLevel) {
      const trustText = c2paResult.trustLevel === 'high' 
        ? 'Certificate from trusted authority'
        : c2paResult.trustLevel === 'medium'
        ? 'Certificate from known issuer'
        : 'Self-signed or unknown certificate';
      lines.push(`Trust level: ${trustText}`);
    }
    
    // Add any user-friendly errors or warnings
    if (c2paResult.errors && c2paResult.errors.length > 0) {
      const friendlyErrors = c2paResult.errors.map(error => this.makeUserFriendlyError(error));
      lines.push(`Issues: ${friendlyErrors.join(', ')}`);
    }
    
    if (c2paResult.warnings && c2paResult.warnings.length > 0 && c2paResult.warnings.length <= 2) {
      const friendlyWarnings = c2paResult.warnings.map(warning => this.makeUserFriendlyError(warning));
      lines.push(`Notes: ${friendlyWarnings.join(', ')}`);
    }
    
    if (lines.length === 0) {
      return 'Click to view technical details';
    }
    
    return lines.join('\n');
  }

  private getC2PAStateType(c2paResult: C2PAResult, confidence: number): UIState['type'] {
    switch (c2paResult.validationStatus) {
      case 'valid':
        return confidence >= 70 ? 'success' : 'warning';
      case 'valid-untrusted':
        return 'warning';
      case 'invalid':
        return 'error';
      case 'missing':
        return 'warning';
      case 'error':
        return 'error';
      default:
        return 'warning';
    }
  }

  private makeUserFriendlyError(technicalMessage: string): string {
    const friendlyMappings: Record<string, string> = {
      'Missing claim generator information': 'incomplete creator info',
      'No certificate chain found': 'no digital certificate',
      'Invalid certificates': 'certificate issues',
      'Expired certificates': 'expired certificate',
      'Untrusted certificate issuers': 'unknown certificate authority',
      'Self-signed certificates detected': 'self-certified content',
      'Missing signature algorithm information': 'unclear security method',
      'Missing signature value': 'incomplete signature',
      'Manifest timestamp is in the future': 'incorrect signature date',
      'No assertions found in manifest': 'limited authenticity info'
    };

    for (const [technical, friendly] of Object.entries(friendlyMappings)) {
      if (technicalMessage.includes(technical)) {
        return friendly;
      }
    }

    // Return a simplified version of the technical message
    return technicalMessage.toLowerCase().replace(/[\.!]$/, '');
  }

  // Legacy compatibility methods
  showBanner(message: string, riskLevel: RiskLevel, scanResult?: ScanResult): void {
    const stateType = this.riskLevelToStateType(riskLevel);
    this.showTrafficLightBanner({
      type: stateType,
      message,
      details: scanResult,
      autoHide: stateType !== 'loading'
    });
  }

  showProgressBanner(message: string, progress: number): void {
    this.showLoadingState(message, progress);
  }

  updateMultiStepProgress(
    currentStep: number,
    totalSteps: number,
    message?: string,
    stepDescription?: string
  ): void {
    if (this.currentState === 'loading' && this.currentBanner) {
      const progress = currentStep / totalSteps;
      
      // Update main message if provided
      if (message) {
        const messageEl = this.currentBanner.querySelector('.sa-response-message') as HTMLElement;
        if (messageEl) {
          messageEl.textContent = message;
        }
      }
      
      // Update step indicator
      const stepIndicator = this.currentBanner.querySelector('.sa-step-indicator') as HTMLElement;
      if (stepIndicator) {
        stepIndicator.textContent = `Step ${currentStep} of ${totalSteps}`;
      }
      
      // Update progress bar
      const progressBar = this.currentBanner.querySelector('.sa-progress-bar') as HTMLElement;
      if (progressBar) {
        progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
      }
      
      // Update progress text
      const progressText = this.currentBanner.querySelector('.sa-progress-text') as HTMLElement;
      if (progressText) {
        progressText.textContent = `${Math.round(progress * 100)}%`;
      }
      
      // Update step description
      if (stepDescription) {
        const stepDesc = this.currentBanner.querySelector('.sa-step-description') as HTMLElement;
        if (stepDesc) {
          stepDesc.textContent = stepDescription;
        }
      }
      
      // Update step markers
      const markers = this.currentBanner.querySelectorAll('.sa-step-marker');
      markers.forEach((marker, index) => {
        if (index < currentStep) {
          marker.classList.add('sa-step-completed');
        } else {
          marker.classList.remove('sa-step-completed');
        }
      });
    }
  }

  showSimpleBanner(message: string, riskLevel: RiskLevel): void {
    const stateType = this.riskLevelToStateType(riskLevel);
    this.showTrafficLightBanner({
      type: stateType,
      message,
      autoHide: true
    });
  }

  private riskLevelToStateType(riskLevel: RiskLevel): UIState['type'] {
    switch (riskLevel) {
      case 'green': return 'success';
      case 'amber': return 'warning';
      case 'red': return 'error';
      default: return 'warning';
    }
  }

  // Public state getters
  getCurrentState(): UIState['type'] {
    return this.currentState;
  }

  isVisible(): boolean {
    return this.currentBanner !== null;
  }

  // Cleanup
  destroy(): void {
    this.clearAutoHideTimer();
    this.hideBanner();
  }
}