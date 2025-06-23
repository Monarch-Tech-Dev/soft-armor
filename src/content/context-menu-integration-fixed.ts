/* ================================
   Context Menu Integration System - FIXED
   Non-intrusive Enhancement (No Automatic Marking)
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
     FIXED: Non-Intrusive Media Enhancement
     Only mark elements during scanning, not on page load
     ================================ */

  enhanceMediaElements(): void {
    // REMOVED: No longer automatically mark all images as scannable
    // This was causing Reddit to blur images
    
    // Instead, we'll only enhance elements when they're being scanned
    console.log('🔧 Non-intrusive mode: Not marking images automatically');
    
    // Still watch for new media but don't mark them
    this.observeNewMedia();
  }

  // NEW: Only mark element as scannable when actually scanning it
  private markElementForScanning(element: HTMLImageElement | HTMLVideoElement): void {
    if (!element.hasAttribute('data-soft-armor-enhanced')) {
      element.setAttribute('data-soft-armor-enhanced', 'true');
      element.setAttribute('data-soft-armor-scannable', 'true');
      
      // Add hover enhancement only when needed
      this.addHoverEnhancements(element);
      this.addRightClickFeedback(element);
      
      // Initialize state
      this.mediaStates.set(element, {
        isScanning: false
      });
    }
  }

  // NEW: Remove scanning attributes after scan completes
  private unmarkElementAfterScanning(element: HTMLImageElement | HTMLVideoElement): void {
    // Remove scanning-specific attributes but keep enhancement
    element.removeAttribute('data-soft-armor-scannable');
    
    // Clean up any overlays
    this.cleanup(element);
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
    element.addEventListener('contextmenu', () => {
      this.showRightClickFeedback(element);
    });
  }

  private observeNewMedia(): void {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const element = node as Element;
            
            // Find new images and videos but DON'T mark them automatically
            const mediaElements = element.querySelectorAll('img, video');
            mediaElements.forEach((media) => {
              // Just store reference for potential future scanning
              // Don't add any attributes yet
              console.log('📷 New media detected (not marked):', media.tagName);
            });
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
     Scanning State Management - UPDATED
     ================================ */

  startScanning(element: HTMLImageElement | HTMLVideoElement, config: ScanConfig): void {
    // NOW mark element as scannable only when scanning starts
    this.markElementForScanning(element);
    
    const state = this.mediaStates.get(element) || { isScanning: false };
    state.isScanning = true;
    state.scanType = config.scanType;
    this.mediaStates.set(element, state);

    // Add visual scanning state
    element.classList.add('soft-armor-scanning');
    
    if (config.showProgress) {
      this.createScanningOverlay(element, config);
    }

    console.log(`🔍 Started scanning ${element.tagName.toLowerCase()}`);
  }

  updateScanProgress(element: HTMLElement, progress: number): void {
    const state = this.mediaStates.get(element);
    if (state) {
      state.scanProgress = progress;
      this.mediaStates.set(element, state);
    }

    const progressBar = this.progressBars.get(element);
    if (progressBar) {
      const progressFill = progressBar.querySelector('.soft-armor-progress-fill') as HTMLElement;
      if (progressFill) {
        progressFill.style.width = `${progress}%`;
      }
    }
  }

  completeScan(element: HTMLImageElement | HTMLVideoElement, result: 'safe' | 'warning' | 'danger'): void {
    const state = this.mediaStates.get(element);
    if (state) {
      state.isScanning = false;
      state.lastScanResult = result;
      this.mediaStates.set(element, state);
    }

    // Remove scanning visual state
    element.classList.remove('soft-armor-scanning');
    
    // Show result briefly then cleanup
    this.showScanResult(element, result);
    
    // FIXED: Remove scannable marking after scan completes
    setTimeout(() => {
      this.unmarkElementAfterScanning(element);
    }, 3000); // Keep result visible for 3 seconds
  }

  private createScanningOverlay(element: HTMLElement, config: ScanConfig): void {
    // Remove any existing overlay
    this.removeScanningOverlay(element);

    const overlay = document.createElement('div');
    overlay.className = 'soft-armor-scanning-overlay';
    overlay.setAttribute('data-scan-type', config.scanType);

    const rect = element.getBoundingClientRect();
    overlay.style.position = 'fixed';
    overlay.style.top = `${rect.top}px`;
    overlay.style.left = `${rect.left}px`;
    overlay.style.width = `${rect.width}px`;
    overlay.style.height = `${rect.height}px`;
    overlay.style.pointerEvents = 'none';
    overlay.style.zIndex = '999999';

    // Add scanning indicator
    const indicator = document.createElement('div');
    indicator.className = 'soft-armor-scan-indicator';
    indicator.innerHTML = `
      <div class="scan-spinner"></div>
      <div class="scan-text">Scanning...</div>
    `;
    overlay.appendChild(indicator);

    // Add progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'soft-armor-progress-container';
    progressContainer.innerHTML = `
      <div class="soft-armor-progress-bar">
        <div class="soft-armor-progress-fill"></div>
      </div>
    `;
    overlay.appendChild(progressContainer);

    document.body.appendChild(overlay);
    this.scanningOverlays.set(element, overlay);
    this.progressBars.set(element, progressContainer);
  }

  private removeScanningOverlay(element: HTMLElement): void {
    const overlay = this.scanningOverlays.get(element);
    if (overlay && overlay.parentNode) {
      overlay.parentNode.removeChild(overlay);
      this.scanningOverlays.delete(element);
      this.progressBars.delete(element);
    }
  }

  private showScanResult(element: HTMLElement, result: 'safe' | 'warning' | 'danger'): void {
    this.removeScanningOverlay(element);

    // Add result class briefly
    element.classList.add(`soft-armor-result-${result}`);
    
    setTimeout(() => {
      element.classList.remove(`soft-armor-result-${result}`);
    }, 2000);
  }

  private showHoverIndicator(element: HTMLElement): void {
    // Only show if element is marked as scannable
    if (!element.hasAttribute('data-soft-armor-scannable')) return;
    
    element.classList.add('soft-armor-hover');
  }

  private hideHoverIndicator(element: HTMLElement): void {
    element.classList.remove('soft-armor-hover');
  }

  private showRightClickFeedback(element: HTMLElement): void {
    element.classList.add('soft-armor-context-active');
    setTimeout(() => {
      element.classList.remove('soft-armor-context-active');
    }, 600);
  }

  /* ================================
     Cleanup Methods
     ================================ */

  cleanup(element: HTMLElement): void {
    this.removeScanningOverlay(element);
    this.mediaStates.delete(element);
    
    // Remove all our classes
    element.classList.remove(
      'soft-armor-scanning',
      'soft-armor-hover',
      'soft-armor-context-active',
      'soft-armor-result-safe',
      'soft-armor-result-warning',
      'soft-armor-result-danger'
    );
  }

  cleanupAll(): void {
    // Remove all scanning overlays
    this.scanningOverlays.forEach((overlay) => {
      if (overlay.parentNode) {
        overlay.parentNode.removeChild(overlay);
      }
    });

    // Clear all maps
    this.scanningOverlays.clear();
    this.progressBars.clear();
    this.loadingSpinners.clear();
    this.mediaStates.clear();

    // Remove all scannable attributes from page
    document.querySelectorAll('[data-soft-armor-scannable]').forEach(element => {
      element.removeAttribute('data-soft-armor-scannable');
      element.removeAttribute('data-soft-armor-enhanced');
    });
  }

  /* ================================
     Public Methods for Scanner
     ================================ */

  isElementScanning(element: HTMLElement): boolean {
    const state = this.mediaStates.get(element);
    return state ? state.isScanning : false;
  }

  getElementState(element: HTMLElement): ContextMenuState | undefined {
    return this.mediaStates.get(element);
  }
}