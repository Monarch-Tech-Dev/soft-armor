/* ================================
   Context Menu Integration System
   Interactive States & Feedback
   ================================ */

import { ShieldIconSystem } from '../assets/design/shield-icons';

export interface ContextMenuState {
  isScanning: boolean;
  lastScanResult?: 'safe' | 'warning' | 'danger';
  scanProgress?: number;
  scanType?: 'quick' | 'standard' | 'deep';
}

export interface ScanConfig {
  mediaUrl: string;
  scanType: 'quick' | 'standard' | 'deep' | 'report';
  showProgress: boolean;
  timestamp: number;
}

export class ContextMenuIntegration {
  private static instance: ContextMenuIntegration;
  private mediaStates = new Map<HTMLElement, ContextMenuState>();
  private scanningOverlays = new Map<HTMLElement, HTMLElement>();
  private progressBars = new Map<HTMLElement, HTMLElement>();
  private loadingSpinners = new Map<HTMLElement, HTMLElement>();

  static getInstance(): ContextMenuIntegration {
    if (!this.instance) {
      this.instance = new ContextMenuIntegration();
    }
    return this.instance;
  }

  /* ================================
     Media Element Enhancement
     ================================ */

  enhanceMediaElements(): void {
    const mediaElements: NodeListOf<HTMLImageElement | HTMLVideoElement> = document.querySelectorAll('img, video');
    
    mediaElements.forEach(element => {
      this.setupMediaElement(element);
    });

    // Watch for dynamically added media
    this.observeNewMedia();
  }

  private setupMediaElement(element: HTMLImageElement | HTMLVideoElement): void {
    // Skip if already enhanced
    if (element.hasAttribute('data-soft-armor-enhanced')) return;

    // Mark as enhanced
    element.setAttribute('data-soft-armor-enhanced', 'true');
    element.setAttribute('data-soft-armor-scannable', 'true');

    // Add hover enhancement
    this.addHoverEnhancements(element);

    // Add right-click feedback
    this.addRightClickFeedback(element);

    // Initialize state
    this.mediaStates.set(element, {
      isScanning: false
    });
  }

  private addHoverEnhancements(element: HTMLElement): void {
    element.addEventListener('mouseenter', () => {
      this.showHoverIndicator(element);
    });

    element.addEventListener('mouseleave', () => {
      this.hideHoverIndicator(element);
    });
  }

  private addRightClickFeedback(element: HTMLElement): void {
    element.addEventListener('contextmenu', (event) => {
      this.triggerRippleEffect(element, event);
    });
  }

  /* ================================
     Visual Feedback Effects
     ================================ */

  private showHoverIndicator(element: HTMLElement): void {
    if (this.isScanning(element)) return;

    element.classList.add('soft-armor-hover-active');
  }

  private hideHoverIndicator(element: HTMLElement): void {
    element.classList.remove('soft-armor-hover-active');
  }

  private triggerRippleEffect(element: HTMLElement, event: MouseEvent): void {
    element.classList.add('soft-armor-context-active');
    
    // Create ripple at cursor position
    const rect = element.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('div');
    ripple.className = 'soft-armor-ripple';
    ripple.style.cssText = `
      position: absolute;
      left: ${x}px;
      top: ${y}px;
      width: 20px;
      height: 20px;
      border-radius: 50%;
      background: rgba(59, 130, 246, 0.3);
      transform: translate(-50%, -50%) scale(0);
      animation: soft-armor-ripple-expand 0.6s ease-out;
      pointer-events: none;
      z-index: var(--z-overlay);
    `;

    element.style.position = 'relative';
    element.appendChild(ripple);

    // Cleanup
    setTimeout(() => {
      element.classList.remove('soft-armor-context-active');
      if (ripple.parentNode) {
        ripple.parentNode.removeChild(ripple);
      }
    }, 600);
  }

  /* ================================
     Scanning State Management
     ================================ */

  startScanning(element: HTMLElement, config: ScanConfig): void {
    const state = this.mediaStates.get(element);
    if (!state) return;

    state.isScanning = true;
    state.scanType = config.scanType;
    state.scanProgress = 0;

    this.createScanningOverlay(element, config);
    this.createProgressBar(element);
    this.addLoadingSpinner(element);

    // Disable hover effects during scan
    element.classList.add('soft-armor-scanning');
  }

  updateScanProgress(element: HTMLElement, progress: number): void {
    const state = this.mediaStates.get(element);
    if (!state || !state.isScanning) return;

    state.scanProgress = Math.max(0, Math.min(100, progress));
    this.updateProgressBar(element, state.scanProgress);
  }

  completeScan(element: HTMLElement, result: 'safe' | 'warning' | 'danger'): void {
    console.log('🏁 Completing scan for element:', element);
    const state = this.mediaStates.get(element);
    if (!state) {
      console.log('❌ No state found for element');
      return;
    }

    state.isScanning = false;
    state.lastScanResult = result;
    state.scanProgress = 100;

    // CRITICAL: Clean up ALL scanning UI immediately
    this.removeScanningOverlay(element);
    this.removeProgressBar(element);
    this.removeLoadingSpinner(element);
    
    // ENHANCED: Immediate aggressive cleanup
    this.aggressiveCleanup(element);
    
    // Additional safety check - remove any floating overlays
    setTimeout(() => {
      // Final cleanup pass after a short delay to catch any missed elements
      this.forceCleanupElement(element);
      this.globalCleanup(); // Extra global cleanup after successful scan
    }, 200);
    
    this.showScanResult(element, result);

    // Re-enable hover effects
    element.classList.remove('soft-armor-scanning');
    console.log('✅ Scan completed and UI cleaned up');
  }

  /* ================================
     Scanning UI Components
     ================================ */

  private createScanningOverlay(element: HTMLElement, config: ScanConfig): void {
    if (!config.showProgress) return;

    const overlay = document.createElement('div');
    overlay.className = 'soft-armor-scanning-overlay';
    overlay.setAttribute('data-scan-type', config.scanType);
    overlay.setAttribute('data-element-id', this.getElementId(element));

    const rect = element.getBoundingClientRect();
    // Use absolute positioning relative to element
    overlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1000;
      pointer-events: none;
    `;

    // Insert overlay directly into the element's container
    element.style.position = 'relative';
    element.appendChild(overlay);
    this.scanningOverlays.set(element, overlay);

    // Add scan type indicator
    const typeIndicator = document.createElement('div');
    typeIndicator.className = 'soft-armor-scan-type-indicator';
    typeIndicator.textContent = this.getScanTypeLabel(config.scanType);
    overlay.appendChild(typeIndicator);
  }

  private createProgressBar(element: HTMLElement): void {
    const progressContainer = document.createElement('div');
    progressContainer.className = 'soft-armor-progress-overlay';

    const progressBar = document.createElement('div');
    progressBar.className = 'soft-armor-progress-bar';
    progressBar.style.width = '0%';

    progressContainer.appendChild(progressBar);

    const rect = element.getBoundingClientRect();
    progressContainer.style.cssText = `
      position: fixed;
      bottom: ${window.innerHeight - rect.bottom - window.scrollY}px;
      left: ${rect.left + window.scrollX}px;
      width: ${rect.width}px;
      z-index: var(--z-overlay);
      pointer-events: none;
    `;

    document.body.appendChild(progressContainer);
    this.progressBars.set(element, progressContainer);
  }

  private addLoadingSpinner(element: HTMLElement): void {
    console.log('🔄 Adding loading spinner to element:', element);
    
    const spinner = document.createElement('div');
    spinner.className = 'soft-armor-loading-overlay';
    spinner.setAttribute('data-element-id', this.getElementId(element));
    
    // Simple spinning shield emoji instead of complex icon system
    spinner.innerHTML = `
      <div class="spinner-content">
        <div class="shield-icon">🛡️</div>
      </div>
    `;

    // Position absolutely within the element
    spinner.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      z-index: 1001;
      pointer-events: none;
      width: 48px;
      height: 48px;
      background: rgba(0, 0, 0, 0.8);
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // Ensure element can contain spinner
    element.style.position = 'relative';
    element.appendChild(spinner);
    this.loadingSpinners.set(element, spinner);
    element.setAttribute('data-loading-spinner', 'active');
    console.log('✅ Spinner added to element');
  }

  private updateProgressBar(element: HTMLElement, progress: number): void {
    const progressContainer = this.progressBars.get(element);
    if (!progressContainer) return;

    const progressBar = progressContainer.querySelector('.soft-armor-progress-bar') as HTMLElement;
    if (progressBar) {
      progressBar.style.width = `${progress}%`;
    }
  }

  private showScanResult(element: HTMLElement, result: 'safe' | 'warning' | 'danger'): void {
    const resultOverlay = document.createElement('div');
    resultOverlay.className = `soft-armor-result-overlay soft-armor-result-overlay--${result}`;
    
    // Create shield icon with result state
    const shieldIcon = ShieldIconSystem.generateShieldIcon({
      size: 'sm',
      state: result,
      variant: 'filled',
      ariaLabel: `${this.getResultText(result)} - Soft-Armor verified`
    });

    const resultText = this.getResultText(result);
    resultOverlay.innerHTML = `${shieldIcon}<span class="result-text">${resultText}</span>`;

    const rect = element.getBoundingClientRect();
    resultOverlay.style.cssText = `
      position: fixed;
      top: ${rect.top + window.scrollY + 8}px;
      left: ${rect.left + window.scrollX + 8}px;
      z-index: var(--z-overlay);
      pointer-events: none;
    `;

    document.body.appendChild(resultOverlay);

    // Auto-remove after delay
    setTimeout(() => {
      if (resultOverlay.parentNode) {
        resultOverlay.style.opacity = '0';
        setTimeout(() => {
          if (resultOverlay.parentNode) {
            resultOverlay.parentNode.removeChild(resultOverlay);
          }
        }, 300);
      }
    }, 4000);
  }

  /* ================================
     Cleanup Methods
     ================================ */

  private removeScanningOverlay(element: HTMLElement): void {
    console.log('🧹 [CLEANUP] Removing scanning overlay for element:', element);
    const overlay = this.scanningOverlays.get(element);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      console.log('✅ [CLEANUP] Scanning overlay removed');
    }
    
    // Also clean up any orphaned overlays
    const orphanedOverlays = element.querySelectorAll('.soft-armor-scanning-overlay');
    orphanedOverlays.forEach(orphan => {
      orphan.remove();
      console.log('🧹 [CLEANUP] Removed orphaned scanning overlay');
    });
    
    this.scanningOverlays.delete(element);
  }

  private removeProgressBar(element: HTMLElement): void {
    const progressBar = this.progressBars.get(element);
    if (progressBar && progressBar.parentNode) {
      progressBar.parentNode.removeChild(progressBar);
    }
    this.progressBars.delete(element);
  }

  private removeLoadingSpinner(element: HTMLElement): void {
    console.log('🧹 [CLEANUP] Removing loading spinner for element:', element);
    const spinner = this.loadingSpinners.get(element);
    console.log('🔍 [CLEANUP] Found spinner:', spinner);
    
    // Enhanced cleanup - remove ALL loading overlays
    if (spinner) {
      // Add fade-out class for smooth transition
      spinner.classList.add('removing');
      setTimeout(() => {
        if (spinner.parentNode) {
          spinner.parentNode.removeChild(spinner);
          console.log('✅ [CLEANUP] Spinner removed from DOM');
        }
      }, 100);
    }
    
    // CRITICAL: Remove ALL orphaned spinners from element AND document
    const elementSpinners = element.querySelectorAll('.soft-armor-loading-overlay');
    elementSpinners.forEach(orphan => {
      orphan.remove();
      console.log('🧹 [CLEANUP] Removed orphaned element spinner');
    });
    
    // CRITICAL: Remove any floating spinners from document body
    const floatingSpinners = document.querySelectorAll('.soft-armor-loading-overlay');
    floatingSpinners.forEach(floating => {
      const elementId = floating.getAttribute('data-element-id');
      if (elementId === this.getElementId(element) || !floating.closest('img, video')) {
        floating.remove();
        console.log('🧹 [CLEANUP] Removed floating spinner');
      }
    });
    
    this.loadingSpinners.delete(element);
    element.removeAttribute('data-loading-spinner');
    element.classList.remove('soft-armor-scanning');
    console.log('🏷️ [CLEANUP] Removed data-loading-spinner attribute and scanning class');
  }

  /* ================================
     Dynamic Content Observation
     ================================ */

  private observeNewMedia(): void {
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        mutation.addedNodes.forEach(node => {
          if (node instanceof HTMLElement) {
            const mediaElements = node.querySelectorAll('img, video');
            mediaElements.forEach(element => {
              this.setupMediaElement(element as HTMLImageElement | HTMLVideoElement);
            });

            if (node.matches('img, video')) {
              this.setupMediaElement(node as HTMLImageElement | HTMLVideoElement);
            }
          }
        });
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true
    });
  }

  /* ================================
     Utility Methods
     ================================ */

  private isScanning(element: HTMLElement): boolean {
    const state = this.mediaStates.get(element);
    return state?.isScanning || false;
  }

  private getScanTypeLabel(scanType: string): string {
    const labels = {
      quick: 'Quick Scan',
      standard: 'Standard Scan',
      deep: 'Deep Analysis',
      report: 'Viewing Report'
    };
    return labels[scanType as keyof typeof labels] || 'Scanning';
  }

  private getResultText(result: 'safe' | 'warning' | 'danger'): string {
    const texts = {
      safe: 'Verified Safe',
      warning: 'Suspicious Content',
      danger: 'Threat Detected'
    };
    return texts[result];
  }

  /* ================================
     Public API
     ================================ */

  getMediaState(element: HTMLElement): ContextMenuState | undefined {
    return this.mediaStates.get(element);
  }

  clearAllStates(): void {
    this.mediaStates.clear();
    this.scanningOverlays.clear();
    this.progressBars.clear();
    this.loadingSpinners.clear();
  }

  // Global cleanup method to remove all stuck overlays
  globalCleanup(): void {
    console.log('🧹 [GLOBAL] Performing global overlay cleanup...');
    
    // Remove ALL soft-armor overlays from the document
    const allOverlays = document.querySelectorAll(`
      .soft-armor-scanning-overlay,
      .soft-armor-loading-overlay,
      .soft-armor-progress-overlay,
      .soft-armor-result-overlay
    `);
    
    allOverlays.forEach(overlay => {
      overlay.remove();
      console.log('🗑️ [GLOBAL] Removed overlay:', overlay.className);
    });
    
    // Clear all maps
    this.clearAllStates();
    
    // Remove scanning classes from all elements
    const scanningElements = document.querySelectorAll('.soft-armor-scanning, [data-loading-spinner]');
    scanningElements.forEach(element => {
      element.classList.remove('soft-armor-scanning', 'soft-armor-hover-active', 'soft-armor-context-active');
      element.removeAttribute('data-loading-spinner');
    });
    
    console.log('✅ [GLOBAL] Global cleanup completed');
  }

  // Aggressive cleanup for immediate overlay removal
  aggressiveCleanup(element: HTMLElement): void {
    console.log('🔥 [AGGRESSIVE] Performing aggressive cleanup for element:', element);
    
    // Remove ALL overlays with this element's ID
    const elementId = this.getElementId(element);
    const targetedOverlays = document.querySelectorAll(`[data-element-id="${elementId}"]`);
    targetedOverlays.forEach(overlay => {
      overlay.remove();
      console.log('🗑️ [AGGRESSIVE] Removed targeted overlay:', overlay.className);
    });
    
    // Remove any overlays inside or attached to this element
    const childOverlays = element.querySelectorAll('.soft-armor-scanning-overlay, .soft-armor-loading-overlay, .soft-armor-progress-overlay');
    childOverlays.forEach(overlay => {
      overlay.remove();
      console.log('🗑️ [AGGRESSIVE] Removed child overlay:', overlay.className);
    });
    
    // Clean up element classes and attributes immediately
    element.classList.remove('soft-armor-scanning', 'soft-armor-hover-active', 'soft-armor-context-active');
    element.removeAttribute('data-loading-spinner');
    
    // Clean up maps
    this.scanningOverlays.delete(element);
    this.loadingSpinners.delete(element);
    this.progressBars.delete(element);
    
    console.log('✅ [AGGRESSIVE] Aggressive cleanup completed');
  }

  private getElementId(element: HTMLElement): string {
    if (!element.id) {
      element.id = `sa-element-${Math.random().toString(36).substr(2, 9)}`;
    }
    return element.id;
  }

  // Emergency cleanup method for stuck UI elements
  forceCleanupElement(element: HTMLElement): void {
    console.log('🚨 [EMERGENCY] Force cleaning up element:', element);
    
    // Remove all scanning-related classes
    element.classList.remove('soft-armor-scanning', 'soft-armor-hover-active', 'soft-armor-context-active');
    element.removeAttribute('data-loading-spinner');
    
    // Remove all child overlays and spinners from the element
    const overlays = element.querySelectorAll('.soft-armor-scanning-overlay, .soft-armor-loading-overlay, .soft-armor-progress-overlay, .soft-armor-result-overlay');
    overlays.forEach(overlay => {
      overlay.remove();
      console.log('🗑️ [EMERGENCY] Removed overlay:', overlay.className);
    });
    
    // CRITICAL: Also remove any document-level floating overlays that belong to this element
    const elementId = this.getElementId(element);
    const documentOverlays = document.querySelectorAll(`
      .soft-armor-scanning-overlay[data-element-id="${elementId}"],
      .soft-armor-loading-overlay[data-element-id="${elementId}"],
      .soft-armor-progress-overlay[data-element-id="${elementId}"],
      .soft-armor-result-overlay
    `);
    documentOverlays.forEach(overlay => {
      overlay.remove();
      console.log('🗑️ [EMERGENCY] Removed document-level overlay:', overlay.className);
    });
    
    // Clean up from maps
    this.scanningOverlays.delete(element);
    this.loadingSpinners.delete(element);
    this.progressBars.delete(element);
    
    // Reset element state
    const state = this.mediaStates.get(element);
    if (state) {
      state.isScanning = false;
      state.scanProgress = 0;
    }
    
    // Reset element positioning if we changed it
    if (element.style.position === 'relative' && !element.hasAttribute('data-original-position')) {
      element.style.position = '';
    }
    
    console.log('✅ [EMERGENCY] Element cleanup completed');
  }
}

/* ================================
   Ripple Animation CSS
   ================================ */

const rippleAnimationCSS = `
@keyframes soft-armor-ripple-expand {
  0% {
    transform: translate(-50%, -50%) scale(0);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(4);
    opacity: 0;
  }
}

.soft-armor-scan-type-indicator {
  position: absolute;
  top: var(--space-2);
  right: var(--space-2);
  background: rgba(0, 0, 0, 0.8);
  color: white;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-weight: var(--font-weight-medium);
  backdrop-filter: blur(4px);
}

.soft-armor-hover-active::after {
  content: '🛡️';
  position: absolute;
  top: var(--space-1);
  right: var(--space-1);
  font-size: var(--text-sm);
  opacity: 0.8;
  pointer-events: none;
  z-index: var(--z-overlay);
  animation: soft-armor-shield-pulse 2s ease-in-out infinite;
}

@keyframes soft-armor-shield-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.1); }
}
`;

// Inject animation styles
if (typeof document !== 'undefined') {
  const style = document.createElement('style');
  style.textContent = rippleAnimationCSS;
  document.head.appendChild(style);
}

export default ContextMenuIntegration;