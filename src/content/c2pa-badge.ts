import { C2PAResult } from './types';
import { CertificateDisplay } from './certificate-display';

export class C2PABadge {
  private certificateDisplay: CertificateDisplay;

  constructor() {
    this.certificateDisplay = new CertificateDisplay();
  }

  /**
   * Create a C2PA authenticity badge for verified content
   */
  createBadge(
    c2paResult: C2PAResult, 
    mediaElement: HTMLImageElement | HTMLVideoElement
  ): HTMLElement {
    const badge = document.createElement('div');
    badge.className = `soft-armor-c2pa-badge ${this.getBadgeClassName(c2paResult)}`;
    badge.innerHTML = this.generateBadgeHTML(c2paResult);
    
    this.attachBadgeListeners(badge, c2paResult);
    this.positionBadge(badge, mediaElement);
    
    return badge;
  }

  /**
   * Generate HTML content for the badge
   */
  private generateBadgeHTML(c2paResult: C2PAResult): string {
    const icon = this.getBadgeIcon(c2paResult);
    const text = this.getBadgeText(c2paResult);
    const confidence = c2paResult.confidenceScore || 0;
    
    return `
      <div class="badge-content">
        <div class="badge-icon">${icon}</div>
        <div class="badge-info">
          <div class="badge-text">${text}</div>
          <div class="badge-confidence">${confidence}% confident</div>
        </div>
        <div class="badge-expand">ⓘ</div>
      </div>
      <div class="badge-tooltip">Click for details</div>
    `;
  }

  /**
   * Get appropriate badge CSS class based on validation status
   */
  private getBadgeClassName(c2paResult: C2PAResult): string {
    const confidence = c2paResult.confidenceScore || 0;
    
    switch (c2paResult.validationStatus) {
      case 'valid':
        return confidence >= 80 ? 'badge-verified' : 'badge-verified-medium';
      case 'valid-untrusted':
        return 'badge-untrusted';
      case 'invalid':
        return 'badge-invalid';
      case 'missing':
        return 'badge-none';
      case 'error':
        return 'badge-error';
      default:
        return 'badge-unknown';
    }
  }

  /**
   * Get appropriate icon for the badge
   */
  private getBadgeIcon(c2paResult: C2PAResult): string {
    const confidence = c2paResult.confidenceScore || 0;
    
    switch (c2paResult.validationStatus) {
      case 'valid':
        return confidence >= 80 ? '🔒' : '🔓';
      case 'valid-untrusted':
        return '⚠️';
      case 'invalid':
        return '❌';
      case 'missing':
        return '❓';
      case 'error':
        return '⚡';
      default:
        return '❓';
    }
  }

  /**
   * Get appropriate text for the badge
   */
  private getBadgeText(c2paResult: C2PAResult): string {
    switch (c2paResult.validationStatus) {
      case 'valid':
        return 'Verified';
      case 'valid-untrusted':
        return 'Self-Signed';
      case 'invalid':
        return 'Invalid';
      case 'missing':
        return 'No C2PA';
      case 'error':
        return 'Check Failed';
      default:
        return 'Unknown';
    }
  }

  /**
   * Position badge relative to media element
   */
  private positionBadge(
    badge: HTMLElement, 
    mediaElement: HTMLImageElement | HTMLVideoElement
  ): void {
    // Position badge in top-right corner of media element
    const rect = mediaElement.getBoundingClientRect();
    const scrollX = window.pageXOffset || document.documentElement.scrollLeft;
    const scrollY = window.pageYOffset || document.documentElement.scrollTop;
    
    badge.style.position = 'absolute';
    badge.style.top = `${rect.top + scrollY + 8}px`;
    badge.style.left = `${rect.right + scrollX - 8}px`;
    badge.style.transform = 'translateX(-100%)';
    badge.style.zIndex = '9999';
  }

  /**
   * Attach event listeners to badge
   */
  private attachBadgeListeners(badge: HTMLElement, c2paResult: C2PAResult): void {
    // Click to show certificate details
    badge.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      this.certificateDisplay.showCertificatePanel(c2paResult);
    });

    // Hover effects
    badge.addEventListener('mouseenter', () => {
      badge.classList.add('badge-hover');
    });

    badge.addEventListener('mouseleave', () => {
      badge.classList.remove('badge-hover');
    });

    // Keyboard accessibility
    badge.setAttribute('tabindex', '0');
    badge.setAttribute('role', 'button');
    badge.setAttribute('aria-label', `Content authenticity: ${this.getBadgeText(c2paResult)}`);
    
    badge.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        this.certificateDisplay.showCertificatePanel(c2paResult);
      }
    });
  }

  /**
   * Attach badge to media element
   */
  attachBadgeToMedia(
    c2paResult: C2PAResult,
    mediaElement: HTMLImageElement | HTMLVideoElement
  ): void {
    // Remove any existing badge
    this.removeBadgeFromMedia(mediaElement);

    // Only show badge for content with C2PA data
    if (c2paResult.validationStatus === 'missing') {
      return;
    }

    const badge = this.createBadge(c2paResult, mediaElement);
    
    // Add badge to document
    document.body.appendChild(badge);
    
    // Store reference on media element for cleanup
    (mediaElement as any).__softArmorBadge = badge;

    // Update position on window resize/scroll
    const updatePosition = () => {
      this.positionBadge(badge, mediaElement);
    };

    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);
    
    // Store cleanup function
    (badge as any).__cleanup = () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };

    // Auto-hide after delay if low confidence
    if ((c2paResult.confidenceScore || 0) < 30) {
      setTimeout(() => {
        badge.classList.add('badge-auto-hide');
      }, 5000);
    }
  }

  /**
   * Remove badge from media element
   */
  removeBadgeFromMedia(mediaElement: HTMLImageElement | HTMLVideoElement): void {
    const existingBadge = (mediaElement as any).__softArmorBadge;
    if (existingBadge) {
      // Run cleanup
      if ((existingBadge as any).__cleanup) {
        (existingBadge as any).__cleanup();
      }
      
      // Remove from DOM
      if (existingBadge.parentNode) {
        existingBadge.parentNode.removeChild(existingBadge);
      }
      
      // Clear reference
      delete (mediaElement as any).__softArmorBadge;
    }
  }

  /**
   * Create mini badge for scan results overview
   */
  createMiniBadge(c2paResult: C2PAResult): HTMLElement {
    const miniBadge = document.createElement('div');
    miniBadge.className = `soft-armor-mini-badge ${this.getBadgeClassName(c2paResult)}`;
    
    const icon = this.getBadgeIcon(c2paResult);
    const confidence = c2paResult.confidenceScore || 0;
    
    miniBadge.innerHTML = `
      <span class="mini-icon">${icon}</span>
      <span class="mini-confidence">${confidence}%</span>
    `;
    
    miniBadge.title = `C2PA ${this.getBadgeText(c2paResult)} - ${confidence}% confidence`;
    
    return miniBadge;
  }

  /**
   * Update existing badge with new results
   */
  updateBadge(
    badge: HTMLElement,
    c2paResult: C2PAResult
  ): void {
    // Update class
    badge.className = `soft-armor-c2pa-badge ${this.getBadgeClassName(c2paResult)}`;
    
    // Update content
    badge.innerHTML = this.generateBadgeHTML(c2paResult);
    
    // Update accessibility
    badge.setAttribute('aria-label', `Content authenticity: ${this.getBadgeText(c2paResult)}`);
    
    // Re-attach listeners
    this.attachBadgeListeners(badge, c2paResult);
  }
}