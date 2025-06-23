import { C2PACertificate, C2PAResult } from './types';

export class CertificateDisplay {
  private container: HTMLElement | null = null;

  /**
   * Create a professional certificate details panel
   */
  createCertificatePanel(c2paResult: C2PAResult): HTMLElement {
    const panel = document.createElement('div');
    panel.className = 'soft-armor-certificate-panel';
    panel.innerHTML = this.generateCertificatePanelHTML(c2paResult);
    
    this.attachEventListeners(panel, c2paResult);
    return panel;
  }

  /**
   * Generate HTML for certificate panel with confidence score
   */
  private generateCertificatePanelHTML(c2paResult: C2PAResult): string {
    const confidenceColor = this.getConfidenceColor(c2paResult.confidenceScore || 0);
    const trustIcon = this.getTrustIcon(c2paResult.trustLevel || 'low');
    
    return `
      <div class="certificate-header">
        <div class="certificate-title">
          <span class="trust-icon">${trustIcon}</span>
          <h3>Content Authenticity</h3>
          <div class="confidence-badge" style="background: ${confidenceColor}">
            ${c2paResult.confidenceScore || 0}% confident
          </div>
        </div>
        <button class="close-certificate-panel" aria-label="Close certificate details">×</button>
      </div>

      <div class="certificate-content">
        ${this.generateConfidenceSection(c2paResult)}
        ${this.generateSignerSection(c2paResult)}
        ${this.generateTimestampSection(c2paResult)}
        ${this.generateCertificateChainSection(c2paResult.certificateChain || [])}
        ${this.generateManifestSection(c2paResult)}
        ${this.generateIssuesSection(c2paResult)}
      </div>
    `;
  }

  /**
   * Generate confidence visualization section
   */
  private generateConfidenceSection(c2paResult: C2PAResult): string {
    const score = c2paResult.confidenceScore || 0;
    const trustLevel = c2paResult.trustLevel || 'low';
    const statusText = this.getStatusText(c2paResult.validationStatus);
    
    return `
      <section class="confidence-section">
        <h4>Trust Assessment</h4>
        <div class="confidence-meter">
          <div class="confidence-bar">
            <div class="confidence-fill" style="width: ${score}%; background: ${this.getConfidenceColor(score)}"></div>
          </div>
          <div class="confidence-details">
            <span class="confidence-score">${score}%</span>
            <span class="trust-level trust-level--${trustLevel}">${trustLevel.toUpperCase()}</span>
          </div>
        </div>
        <p class="status-description">${statusText}</p>
      </section>
    `;
  }

  /**
   * Generate signer information section
   */
  private generateSignerSection(c2paResult: C2PAResult): string {
    const signer = c2paResult.signer || 'Unknown';
    const softwareAgent = c2paResult.softwareAgent || 'Unknown';
    
    return `
      <section class="signer-section">
        <h4>Signed By</h4>
        <div class="signer-info">
          <div class="signer-name">
            <span class="label">Signer:</span>
            <span class="value">${this.escapeHtml(signer)}</span>
          </div>
          <div class="software-agent">
            <span class="label">Software:</span>
            <span class="value">${this.escapeHtml(softwareAgent)}</span>
          </div>
        </div>
      </section>
    `;
  }

  /**
   * Generate timestamp section
   */
  private generateTimestampSection(c2paResult: C2PAResult): string {
    const timestamp = c2paResult.signedTimestamp || c2paResult.manifest?.timestamp;
    
    if (!timestamp) {
      return `
        <section class="timestamp-section">
          <h4>Timestamp</h4>
          <p class="no-timestamp">No timestamp available</p>
        </section>
      `;
    }

    const date = new Date(timestamp);
    const formattedDate = date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
    const formattedTime = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short'
    });

    return `
      <section class="timestamp-section">
        <h4>Signed On</h4>
        <div class="timestamp-info">
          <div class="timestamp-date">${formattedDate}</div>
          <div class="timestamp-time">${formattedTime}</div>
        </div>
      </section>
    `;
  }

  /**
   * Generate certificate chain section
   */
  private generateCertificateChainSection(certificates: C2PACertificate[]): string {
    if (!certificates || certificates.length === 0) {
      return `
        <section class="certificate-chain-section">
          <h4>Certificate Chain</h4>
          <p class="no-certificates">No certificate information available</p>
        </section>
      `;
    }

    const certificatesList = certificates.map((cert, index) => `
      <div class="certificate-item ${cert.isValid ? 'valid' : 'invalid'}">
        <div class="certificate-header-mini">
          <span class="certificate-status">${cert.isValid ? '✓' : '⚠'}</span>
          <span class="certificate-level">${index === 0 ? 'Signing Certificate' : `CA Level ${index}`}</span>
          ${cert.isTrusted ? '<span class="trusted-badge">Trusted</span>' : ''}
        </div>
        <div class="certificate-details">
          <div class="certificate-subject">
            <span class="label">Subject:</span>
            <span class="value">${this.escapeHtml(cert.subject || 'Unknown')}</span>
          </div>
          <div class="certificate-issuer">
            <span class="label">Issuer:</span>
            <span class="value">${this.escapeHtml(cert.issuer || 'Unknown')}</span>
          </div>
          ${cert.validTo ? `
            <div class="certificate-expiry">
              <span class="label">Expires:</span>
              <span class="value">${new Date(cert.validTo).toLocaleDateString()}</span>
            </div>
          ` : ''}
        </div>
      </div>
    `).join('');

    return `
      <section class="certificate-chain-section">
        <h4>Certificate Chain</h4>
        <div class="certificate-chain">
          ${certificatesList}
        </div>
      </section>
    `;
  }

  /**
   * Generate manifest details section
   */
  private generateManifestSection(c2paResult: C2PAResult): string {
    const manifest = c2paResult.manifest;
    if (!manifest) {
      return '';
    }

    const assertions = manifest.assertions || [];
    const ingredients = manifest.ingredients || [];

    return `
      <section class="manifest-section">
        <h4>Content Details</h4>
        <div class="manifest-details">
          ${manifest.format ? `
            <div class="manifest-item">
              <span class="label">Format:</span>
              <span class="value">${this.escapeHtml(manifest.format)}</span>
            </div>
          ` : ''}
          ${assertions.length > 0 ? `
            <div class="manifest-item">
              <span class="label">Assertions:</span>
              <span class="value">${assertions.length} claim(s)</span>
            </div>
          ` : ''}
          ${ingredients.length > 0 ? `
            <div class="manifest-item">
              <span class="label">Sources:</span>
              <span class="value">${ingredients.length} source(s)</span>
            </div>
          ` : ''}
        </div>
      </section>
    `;
  }

  /**
   * Generate issues section (errors and warnings)
   */
  private generateIssuesSection(c2paResult: C2PAResult): string {
    const errors = c2paResult.errors || [];
    const warnings = c2paResult.warnings || [];

    if (errors.length === 0 && warnings.length === 0) {
      return `
        <section class="issues-section">
          <div class="no-issues">
            <span class="success-icon">✓</span>
            <span>No validation issues found</span>
          </div>
        </section>
      `;
    }

    const errorsList = errors.length > 0 ? `
      <div class="error-list">
        <h5>Issues Found:</h5>
        ${errors.map(error => `
          <div class="issue-item error">
            <span class="issue-icon">⚠</span>
            <span class="issue-text">${this.makeUserFriendly(error)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    const warningsList = warnings.length > 0 ? `
      <div class="warning-list">
        <h5>Notices:</h5>
        ${warnings.map(warning => `
          <div class="issue-item warning">
            <span class="issue-icon">ℹ</span>
            <span class="issue-text">${this.makeUserFriendly(warning)}</span>
          </div>
        `).join('')}
      </div>
    ` : '';

    return `
      <section class="issues-section">
        ${errorsList}
        ${warningsList}
      </section>
    `;
  }

  /**
   * Get confidence color based on score
   */
  private getConfidenceColor(score: number): string {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // amber
    if (score >= 40) return '#ef4444'; // red
    return '#6b7280'; // gray
  }

  /**
   * Get trust icon based on trust level
   */
  private getTrustIcon(trustLevel: string): string {
    switch (trustLevel) {
      case 'high': return '🔒';
      case 'medium': return '🔓';
      case 'low': return '⚠️';
      default: return '❓';
    }
  }

  /**
   * Get user-friendly status text
   */
  private getStatusText(status: string): string {
    switch (status) {
      case 'valid':
        return 'This content has been verified as authentic with a trusted digital signature.';
      case 'valid-untrusted':
        return 'This content is digitally signed but the certificate is not from a recognized authority.';
      case 'invalid':
        return 'The digital signature on this content appears to be corrupted or invalid.';
      case 'missing':
        return 'This content does not contain any digital authenticity information.';
      case 'error':
        return 'There was a technical issue while checking the authenticity of this content.';
      default:
        return 'Authenticity status unknown.';
    }
  }

  /**
   * Convert technical error messages to user-friendly text
   */
  private makeUserFriendly(message: string): string {
    const friendlyMappings: Record<string, string> = {
      'Missing claim generator information': 'The creator information is incomplete',
      'No certificate chain found': 'No digital certificate was found',
      'Invalid certificates': 'The digital certificate has issues',
      'Expired certificates': 'The digital certificate has expired',
      'Untrusted certificate issuers': 'The certificate is from an unknown authority',
      'Self-signed certificates detected': 'The content is self-certified',
      'Missing signature algorithm information': 'The security method is unclear',
      'Missing signature value': 'The digital signature is incomplete',
      'Manifest timestamp is in the future': 'The signature date appears to be incorrect',
      'No assertions found in manifest': 'Limited authenticity information available'
    };

    for (const [technical, friendly] of Object.entries(friendlyMappings)) {
      if (message.includes(technical)) {
        return friendly;
      }
    }

    return message;
  }

  /**
   * Escape HTML to prevent XSS
   */
  private escapeHtml(text: string): string {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  /**
   * Attach event listeners to the certificate panel
   */
  private attachEventListeners(panel: HTMLElement, c2paResult: C2PAResult): void {
    const closeButton = panel.querySelector('.close-certificate-panel');
    if (closeButton) {
      closeButton.addEventListener('click', () => {
        this.hideCertificatePanel();
      });
    }

    // Close on escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.container && this.container.contains(panel)) {
        this.hideCertificatePanel();
      }
    });

    // Close on outside click
    panel.addEventListener('click', (e) => {
      if (e.target === panel) {
        this.hideCertificatePanel();
      }
    });
  }

  /**
   * Show certificate panel
   */
  showCertificatePanel(c2paResult: C2PAResult): void {
    this.hideCertificatePanel(); // Remove any existing panel

    this.container = document.createElement('div');
    this.container.className = 'soft-armor-certificate-overlay';
    
    const panel = this.createCertificatePanel(c2paResult);
    this.container.appendChild(panel);
    
    document.body.appendChild(this.container);
    
    // Animate in
    requestAnimationFrame(() => {
      this.container?.classList.add('visible');
    });
  }

  /**
   * Hide certificate panel
   */
  hideCertificatePanel(): void {
    if (this.container) {
      this.container.classList.add('hiding');
      setTimeout(() => {
        if (this.container && this.container.parentNode) {
          this.container.parentNode.removeChild(this.container);
        }
        this.container = null;
      }, 300);
    }
  }
}