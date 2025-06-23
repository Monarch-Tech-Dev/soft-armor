import { RiskLevel, ScanResult } from './types';

export class UIManager {
  private currentBanner: HTMLElement | null = null;

  showBanner(message: string, riskLevel: RiskLevel, scanResult?: ScanResult): void {
    // Remove existing banner
    this.removeBanner();
    
    // Create new banner
    const banner = document.createElement('div');
    banner.className = `sa-banner sa-${riskLevel}`;
    
    // Create main content
    const content = document.createElement('div');
    content.className = 'sa-content';
    
    const mainMessage = document.createElement('span');
    mainMessage.className = 'sa-message';
    mainMessage.textContent = message;
    content.appendChild(mainMessage);
    
    // Add detailed results if available
    if (scanResult) {
      const details = this.createDetailsSection(scanResult);
      content.appendChild(details);
    }
    
    banner.appendChild(content);
    
    // Add close button
    const closeBtn = document.createElement('span');
    closeBtn.textContent = '×';
    closeBtn.className = 'sa-close';
    closeBtn.onclick = () => this.removeBanner();
    banner.appendChild(closeBtn);
    
    // Add to page
    document.body.appendChild(banner);
    this.currentBanner = banner;
    
    // Auto-hide after 7 seconds (longer for detailed results)
    setTimeout(() => this.removeBanner(), scanResult ? 7000 : 5000);
  }

  private createDetailsSection(result: ScanResult): HTMLElement {
    const details = document.createElement('div');
    details.className = 'sa-details';
    
    // Create summary stats
    const stats = document.createElement('div');
    stats.className = 'sa-stats';
    
    // Enhanced C2PA status with detailed information
    const c2paStatus = document.createElement('div');
    c2paStatus.className = 'sa-stat sa-c2pa-status';
    const c2paDisplay = this.getC2PAStatusDisplay(result);
    c2paStatus.innerHTML = `<span>C2PA:</span> ${c2paDisplay}`;
    stats.appendChild(c2paStatus);
    
    // Loop detection for videos
    if (result.mediaType === 'video') {
      const loopStatus = document.createElement('div');
      loopStatus.className = 'sa-stat';
      loopStatus.innerHTML = `<span>Loops:</span> ${result.hasLoopArtifacts ? '⚠ Detected' : '✓ None'}`;
      stats.appendChild(loopStatus);
    }
    
    // Emotion score
    const emotionStatus = document.createElement('div');
    emotionStatus.className = 'sa-stat';
    const emotionLevel = this.getEmotionLevel(result.emotionScore);
    emotionStatus.innerHTML = `<span>Manipulation:</span> ${emotionLevel}`;
    stats.appendChild(emotionStatus);
    
    details.appendChild(stats);
    
    // Add detailed C2PA information if available
    if (result.c2paDetails) {
      const c2paDetails = this.createC2PADetailsSection(result.c2paDetails);
      details.appendChild(c2paDetails);
    }
    
    // Add expand/collapse functionality
    details.style.display = 'none';
    
    const toggleBtn = document.createElement('button');
    toggleBtn.className = 'sa-toggle';
    toggleBtn.textContent = 'Show details';
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      const isVisible = details.style.display !== 'none';
      details.style.display = isVisible ? 'none' : 'block';
      toggleBtn.textContent = isVisible ? 'Show details' : 'Hide details';
    };
    
    // Create wrapper to contain both toggle and details
    const wrapper = document.createElement('div');
    wrapper.className = 'sa-details-wrapper';
    wrapper.appendChild(toggleBtn);
    wrapper.appendChild(details);
    
    return wrapper;
  }

  private getC2PAStatusDisplay(result: ScanResult): string {
    if (result.c2paValid) {
      return '✓ Verified';
    }
    
    // Check for specific C2PA details to provide more context
    if (result.c2paDetails) {
      const details = result.c2paDetails;
      
      if (details.validationStatus === 'valid-untrusted') {
        return '⚠ Valid but Untrusted';
      }
      
      if (details.validationStatus === 'invalid') {
        return '✗ Invalid Manifest';
      }
      
      if (details.validationStatus === 'error') {
        return '⚠ Validation Error';
      }
      
      if (details.warnings && details.warnings.some(w => w.includes('metadata found'))) {
        return '◐ Alternative Metadata';
      }
    }
    
    return '✗ None';
  }

  private createC2PADetailsSection(c2paDetails: any): HTMLElement {
    const section = document.createElement('div');
    section.className = 'sa-c2pa-details';
    
    const title = document.createElement('div');
    title.className = 'sa-c2pa-title';
    title.textContent = 'Content Authenticity Details';
    section.appendChild(title);
    
    // Signer information
    if (c2paDetails.signer) {
      const signerInfo = document.createElement('div');
      signerInfo.className = 'sa-c2pa-item';
      signerInfo.innerHTML = `<span>Signer:</span> ${c2paDetails.signer}`;
      section.appendChild(signerInfo);
    }
    
    // Software agent
    if (c2paDetails.softwareAgent) {
      const softwareInfo = document.createElement('div');
      softwareInfo.className = 'sa-c2pa-item';
      softwareInfo.innerHTML = `<span>Created with:</span> ${c2paDetails.softwareAgent}`;
      section.appendChild(softwareInfo);
    }
    
    // Timestamp
    if (c2paDetails.signedTimestamp) {
      const timestampInfo = document.createElement('div');
      timestampInfo.className = 'sa-c2pa-item';
      const date = new Date(c2paDetails.signedTimestamp).toLocaleDateString();
      timestampInfo.innerHTML = `<span>Signed:</span> ${date}`;
      section.appendChild(timestampInfo);
    }
    
    // Certificate information
    if (c2paDetails.certificateChain && c2paDetails.certificateChain.length > 0) {
      const certInfo = document.createElement('div');
      certInfo.className = 'sa-c2pa-item';
      const mainCert = c2paDetails.certificateChain[0];
      const certStatus = mainCert.isTrusted ? '✓ Trusted' : (mainCert.isValid ? '⚠ Valid' : '✗ Invalid');
      certInfo.innerHTML = `<span>Certificate:</span> ${certStatus}`;
      section.appendChild(certInfo);
    }
    
    // Warnings
    if (c2paDetails.warnings && c2paDetails.warnings.length > 0) {
      const warningsSection = document.createElement('div');
      warningsSection.className = 'sa-c2pa-warnings';
      
      const warningsTitle = document.createElement('div');
      warningsTitle.className = 'sa-c2pa-warnings-title';
      warningsTitle.textContent = 'Warnings:';
      warningsSection.appendChild(warningsTitle);
      
      c2paDetails.warnings.forEach((warning: string) => {
        const warningItem = document.createElement('div');
        warningItem.className = 'sa-c2pa-warning';
        warningItem.textContent = `• ${warning}`;
        warningsSection.appendChild(warningItem);
      });
      
      section.appendChild(warningsSection);
    }
    
    // Errors
    if (c2paDetails.errors && c2paDetails.errors.length > 0) {
      const errorsSection = document.createElement('div');
      errorsSection.className = 'sa-c2pa-errors';
      
      const errorsTitle = document.createElement('div');
      errorsTitle.className = 'sa-c2pa-errors-title';
      errorsTitle.textContent = 'Issues:';
      errorsSection.appendChild(errorsTitle);
      
      c2paDetails.errors.forEach((error: string) => {
        const errorItem = document.createElement('div');
        errorItem.className = 'sa-c2pa-error';
        errorItem.textContent = `• ${error}`;
        errorsSection.appendChild(errorItem);
      });
      
      section.appendChild(errorsSection);
    }
    
    return section;
  }

  private getEmotionLevel(score: number): string {
    if (score < 3) return '✓ Low';
    if (score < 6) return '◐ Medium';
    if (score < 8) return '⚠ High';
    return '🛑 Very High';
  }

  showSimpleBanner(message: string, riskLevel: RiskLevel): void {
    this.showBanner(message, riskLevel);
  }

  showProgressBanner(message: string, progress: number): void {
    // Remove existing banner
    this.removeBanner();
    
    // Create progress banner
    const banner = document.createElement('div');
    banner.className = 'sa-banner sa-progress';
    
    // Create content
    const content = document.createElement('div');
    content.className = 'sa-content';
    
    const messageEl = document.createElement('span');
    messageEl.className = 'sa-message';
    messageEl.textContent = message;
    content.appendChild(messageEl);
    
    // Create progress bar
    const progressContainer = document.createElement('div');
    progressContainer.className = 'sa-progress-container';
    
    const progressBar = document.createElement('div');
    progressBar.className = 'sa-progress-bar';
    progressBar.style.width = `${Math.min(100, Math.max(0, progress * 100))}%`;
    
    const progressText = document.createElement('span');
    progressText.className = 'sa-progress-text';
    progressText.textContent = `${Math.round(progress * 100)}%`;
    
    progressContainer.appendChild(progressBar);
    progressContainer.appendChild(progressText);
    content.appendChild(progressContainer);
    
    banner.appendChild(content);
    
    // Add to page
    document.body.appendChild(banner);
    this.currentBanner = banner;
  }

  private removeBanner(): void {
    if (this.currentBanner) {
      this.currentBanner.remove();
      this.currentBanner = null;
    }
  }
}
