// ================================
// Popup Interface JavaScript
// ================================

class PopupManager {
  constructor() {
    this.currentTab = 'dashboard';
    this.settingsOpen = false;
    this.statsData = {
      todayScans: 0,
      threatsBlocked: 0,
      authenticMedia: 0,
      suspiciousMedia: 0,
      totalScans: 0,
      successRate: 0,
      avgScanTime: 0
    };
    this.scanHistory = [];
    this.batchScanState = {
      isActive: false,
      discoveredMedia: [],
      currentScan: null,
      results: { authentic: 0, suspicious: 0, threats: 0 },
      startTime: null
    };
    this.settings = {
      autoScanEnabled: true,
      showNotifications: true,
      scanSensitivity: 'standard', // quick, standard, deep
      analyticsEnabled: true,
      storeHistory: true,
      debugMode: false,
      performanceMode: 'balanced',
      // Enhanced settings
      enableBadges: true,
      showConfidenceScores: true,
      detailedReports: false,
      keyboardShortcuts: true
    };
    
    this.init();
  }

  async init() {
    await this.loadStoredData();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    this.setupMessageHandlers();
    this.updateUI();
    this.checkProStatus();
  }

  // ================================
  // Event Listeners Setup
  // ================================

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        this.switchTab(e.target.closest('.tab-btn').dataset.tab);
      });
    });

    // Settings panel
    document.getElementById('settingsToggle').addEventListener('click', () => {
      this.toggleSettings();
    });
    
    document.getElementById('settingsClose').addEventListener('click', () => {
      this.closeSettings();
    });
    
    document.getElementById('settingsOverlay').addEventListener('click', () => {
      this.closeSettings();
    });

    // Dashboard actions
    document.getElementById('runManualScan').addEventListener('click', () => {
      this.runManualScan();
    });
    
    document.getElementById('runBatchScan').addEventListener('click', () => {
      this.openBatchScanPanel();
    });
    
    document.getElementById('openOptions').addEventListener('click', () => {
      this.openExtensionOptions();
    });

    // Batch scan panel events
    document.getElementById('batchPanelClose').addEventListener('click', () => {
      this.closeBatchScanPanel();
    });

    document.getElementById('startBatchScan').addEventListener('click', () => {
      this.startBatchScan();
    });

    document.getElementById('cancelBatchScan').addEventListener('click', () => {
      this.cancelBatchScan();
    });

    document.getElementById('exportBatchResults').addEventListener('click', () => {
      this.exportBatchResults();
    });

    document.getElementById('viewBatchHistory').addEventListener('click', () => {
      this.viewBatchInHistory();
    });

    // Batch filter events
    document.getElementById('filterImages').addEventListener('change', () => {
      this.updateMediaDiscovery();
    });

    document.getElementById('filterVideos').addEventListener('change', () => {
      this.updateMediaDiscovery();
    });

    document.getElementById('batchLimit').addEventListener('change', () => {
      this.updateMediaDiscovery();
    });

    // History filters
    document.getElementById('historyFilter').addEventListener('change', (e) => {
      this.filterHistory(e.target.value);
    });
    
    document.getElementById('clearHistory').addEventListener('click', () => {
      this.clearHistory();
    });

    // Upgrade functionality
    document.getElementById('upgradeBtn').addEventListener('click', () => {
      this.initiateUpgrade();
    });

    // Settings controls
    this.setupSettingsListeners();

    // Settings actions
    document.getElementById('exportData').addEventListener('click', () => {
      this.exportUserData();
    });
    
    document.getElementById('resetSettings').addEventListener('click', () => {
      this.resetSettings();
    });

    // Footer links
    document.getElementById('privacyPolicy').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://soft-armor.com/privacy');
    });
    
    document.getElementById('support').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://soft-armor.com/support');
    });
    
    document.getElementById('feedback').addEventListener('click', (e) => {
      e.preventDefault();
      this.openLink('https://soft-armor.com/feedback');
    });
  }

  setupKeyboardShortcuts() {
    if (!this.settings.keyboardShortcuts) return;

    document.addEventListener('keydown', (e) => {
      // Cmd/Ctrl + 1-3 for tab navigation
      if ((e.ctrlKey || e.metaKey) && !e.shiftKey && !e.altKey) {
        switch (e.key) {
          case '1':
            e.preventDefault();
            this.switchTab('dashboard');
            break;
          case '2':
            e.preventDefault();
            this.switchTab('history');
            break;
          case '3':
            e.preventDefault();
            this.switchTab('upgrade');
            break;
          case 's':
            e.preventDefault();
            this.runManualScan();
            break;
          case ',':
            e.preventDefault();
            this.toggleSettings();
            break;
        }
      }
      
      // Escape to close modals/settings
      if (e.key === 'Escape') {
        const modal = document.querySelector('.scan-detail-modal');
        if (modal) {
          modal.remove();
        } else if (this.settingsOpen) {
          this.closeSettings();
        }
      }
    });
  }

  setupSettingsListeners() {
    // Toggle switches
    const toggles = [
      'autoScanEnabled',
      'showNotifications', 
      'analyticsEnabled',
      'storeHistory',
      'debugMode',
      'enableBadges',
      'showConfidenceScores'
    ];

    toggles.forEach(settingId => {
      const element = document.getElementById(settingId);
      element.checked = this.settings[settingId];
      element.addEventListener('change', (e) => {
        this.updateSetting(settingId, e.target.checked);
      });
    });

    // Select dropdowns
    const selects = [
      'scanSensitivity',
      'performanceMode'
    ];

    selects.forEach(settingId => {
      const element = document.getElementById(settingId);
      element.value = this.settings[settingId];
      element.addEventListener('change', (e) => {
        this.updateSetting(settingId, e.target.value);
      });
    });
  }

  // ================================
  // Data Management
  // ================================

  async loadStoredData() {
    try {
      // Load from Chrome storage
      const result = await chrome.storage.local.get([
        'statsData',
        'scanHistory', 
        'settings',
        'lastUpdate'
      ]);

      if (result.statsData) {
        this.statsData = { ...this.statsData, ...result.statsData };
      }
      
      if (result.scanHistory) {
        this.scanHistory = result.scanHistory;
      }
      
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }

      // Reset daily stats if it's a new day
      this.checkDailyReset(result.lastUpdate);

    } catch (error) {
      console.error('Error loading stored data:', error);
    }
  }

  async saveData() {
    try {
      await chrome.storage.local.set({
        statsData: this.statsData,
        scanHistory: this.scanHistory,
        settings: this.settings,
        lastUpdate: Date.now()
      });
    } catch (error) {
      console.error('Error saving data:', error);
    }
  }

  checkDailyReset(lastUpdate) {
    const now = new Date();
    const lastDate = lastUpdate ? new Date(lastUpdate) : null;
    
    if (!lastDate || lastDate.toDateString() !== now.toDateString()) {
      // Reset daily stats
      this.statsData.todayScans = 0;
      this.saveData();
    }
  }

  // ================================
  // Tab Management
  // ================================

  switchTab(tabName) {
    if (this.currentTab === tabName) return;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update tab content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName);
    });

    this.currentTab = tabName;

    // Load tab-specific data
    if (tabName === 'history') {
      this.updateHistoryTab();
    } else if (tabName === 'upgrade') {
      this.updateUpgradeTab();
    }
  }

  // ================================
  // Settings Panel
  // ================================

  toggleSettings() {
    this.settingsOpen = !this.settingsOpen;
    
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    
    panel.classList.toggle('open', this.settingsOpen);
    overlay.classList.toggle('visible', this.settingsOpen);
  }

  closeSettings() {
    this.settingsOpen = false;
    
    const panel = document.getElementById('settingsPanel');
    const overlay = document.getElementById('settingsOverlay');
    
    panel.classList.remove('open');
    overlay.classList.remove('visible');
  }

  updateSetting(key, value) {
    this.settings[key] = value;
    this.saveData();

    // Send settings update to background script
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: this.settings
    });

    // Handle specific setting changes
    if (key === 'autoScanEnabled') {
      this.updateStatusIndicator();
    }
  }

  resetSettings() {
    if (confirm('Reset all settings to defaults? This cannot be undone.')) {
      this.settings = {
        autoScanEnabled: true,
        showNotifications: true,
        scanSensitivity: 'standard',
        analyticsEnabled: true,
        storeHistory: true,
        debugMode: false,
        performanceMode: 'balanced',
        enableBadges: true,
        showConfidenceScores: true,
        detailedReports: false,
        keyboardShortcuts: true
      };
      
      this.setupSettingsListeners();
      this.saveData();
      
      // Show confirmation
      this.showNotification('Settings reset to defaults', 'success');
    }
  }

  // ================================
  // UI Updates
  // ================================

  updateUI() {
    this.updateStatsDisplay();
    this.updateRecentActivity();
    this.updateStatusIndicator();
  }

  updateStatsDisplay() {
    const elements = {
      todayScans: document.getElementById('todayScans'),
      threatsBlocked: document.getElementById('threatsBlocked'),
      authenticMedia: document.getElementById('authenticMedia'),
      suspiciousMedia: document.getElementById('suspiciousMedia')
    };

    Object.entries(elements).forEach(([key, element]) => {
      if (element) {
        element.textContent = this.statsData[key] || 0;
      }
    });
  }

  updateRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    const recentScans = this.scanHistory.slice(-5).reverse();

    if (recentScans.length === 0) {
      activityList.innerHTML = `
        <div class="activity-item empty">
          <div class="activity-icon">🌿</div>
          <div class="activity-content">
            <div class="activity-text">No recent activity</div>
            <div class="activity-subtext">Start scanning media to see your activity here</div>
          </div>
        </div>
      `;
      return;
    }

    activityList.innerHTML = recentScans.map(scan => {
      const icon = this.getResultIcon(scan.result);
      const timeStr = new Date(scan.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });

      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-text">${scan.description}</div>
            <div class="activity-subtext">${timeStr} • ${scan.domain}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStatusIndicator() {
    const indicator = document.getElementById('statusIndicator');
    const light = indicator.querySelector('.status-light');
    const text = indicator.querySelector('.status-text');

    if (this.settings.autoScanEnabled) {
      light.classList.add('active');
      text.textContent = 'Protection Active';
    } else {
      light.classList.remove('active');
      text.textContent = 'Protection Paused';
    }
  }

  updateHistoryTab() {
    const historyList = document.getElementById('historyList');
    const totalScansEl = document.getElementById('totalScans');
    const successRateEl = document.getElementById('successRate');
    const avgScanTimeEl = document.getElementById('avgScanTime');

    // Update stats
    const total = this.scanHistory.length;
    const successful = this.scanHistory.filter(s => s.result === 'authentic').length;
    const avgTime = total > 0 ? 
      this.scanHistory.reduce((sum, s) => sum + (s.scanTime || 1000), 0) / total / 1000 : 0;

    totalScansEl.textContent = total;
    successRateEl.textContent = total > 0 ? `${Math.round((successful / total) * 100)}%` : '0%';
    avgScanTimeEl.textContent = `${avgTime.toFixed(1)}s`;

    // Update history list
    if (this.scanHistory.length === 0) {
      historyList.innerHTML = `
        <div class="history-item empty">
          <div class="empty-icon">📜</div>
          <div class="empty-text">No scan history yet</div>
          <div class="empty-subtext">Your scan results will appear here</div>
        </div>
      `;
      return;
    }

    this.renderHistoryList();
  }

  renderHistoryList(filter = 'all') {
    const historyList = document.getElementById('historyList');
    let filteredHistory = this.scanHistory;

    if (filter !== 'all') {
      filteredHistory = this.scanHistory.filter(scan => {
        switch (filter) {
          case 'authentic': return scan.result === 'authentic';
          case 'suspicious': return scan.result === 'suspicious';
          case 'threats': return scan.result === 'threat';
          default: return true;
        }
      });
    }

    if (filteredHistory.length === 0) {
      historyList.innerHTML = `
        <div class="history-item empty">
          <div class="empty-icon">🔍</div>
          <div class="empty-text">No results for this filter</div>
          <div class="empty-subtext">Try adjusting your filter selection</div>
        </div>
      `;
      return;
    }

    historyList.innerHTML = filteredHistory.reverse().map(scan => {
      const icon = this.getResultIcon(scan.result);
      const date = new Date(scan.timestamp);
      const timeStr = date.toLocaleString();
      const confidenceBadge = scan.confidence > 0 ? 
        `<span class="confidence-badge confidence-${this.getConfidenceLevel(scan.confidence)}">${scan.confidence}%</span>` : '';
      const c2paBadge = scan.c2paStatus && scan.c2paStatus !== 'missing' ? 
        `<span class="c2pa-badge">${this.getC2PAStatusIcon(scan.c2paStatus)}</span>` : '';

      return `
        <div class="activity-item" data-scan-id="${scan.id}">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-text">
              ${scan.description}
              ${confidenceBadge}
              ${c2paBadge}
            </div>
            <div class="activity-subtext">
              ${timeStr} • ${scan.domain}
              ${scan.signer ? ` • Signed by ${scan.signer}` : ''}
            </div>
          </div>
          <div class="activity-actions">
            <button class="activity-action" onclick="popupManager.showScanDetails('${scan.id}')" title="View details">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    }).join('');
  }

  updateUpgradeTab() {
    // Update upgrade tab based on pro status
    // This would be implemented based on actual subscription status
  }

  // ================================
  // Actions
  // ================================

  async runManualScan() {
    try {
      // Send scan request to background script which will relay to content script
      const response = await chrome.runtime.sendMessage({
        type: 'MANUAL_SCAN_REQUEST'
      });

      if (response && response.success) {
        this.showNotification('Scan initiated on current page', 'success');
      } else {
        throw new Error(response.error || 'Scan failed');
      }

    } catch (error) {
      console.error('Manual scan failed:', error);
      this.showNotification('Scan failed - try refreshing the page', 'error');
    }
  }

  openExtensionOptions() {
    chrome.runtime.openOptionsPage();
  }

  filterHistory(filter) {
    this.renderHistoryList(filter);
  }

  clearHistory() {
    if (confirm('Clear all scan history? This cannot be undone.')) {
      this.scanHistory = [];
      this.saveData();
      this.updateHistoryTab();
      this.showNotification('History cleared', 'success');
    }
  }

  async initiateUpgrade() {
    try {
      // Show loading state
      const upgradeBtn = document.getElementById('upgradeBtn');
      const originalContent = upgradeBtn.innerHTML;
      upgradeBtn.innerHTML = '<span class="btn-text">Processing...</span>';
      upgradeBtn.disabled = true;

      // Request upgrade flow from billing manager
      const response = await chrome.runtime.sendMessage({
        type: 'INITIATE_UPGRADE'
      });

      if (response.success && response.url) {
        // Open Stripe checkout in new tab
        chrome.tabs.create({ url: response.url });
        this.showNotification('Redirecting to secure payment...', 'info');
      } else {
        this.showNotification(response.error || 'Failed to start upgrade process', 'error');
      }

      // Restore button
      upgradeBtn.innerHTML = originalContent;
      upgradeBtn.disabled = false;

    } catch (error) {
      console.error('Upgrade initiation failed:', error);
      this.showNotification('Upgrade failed - please try again', 'error');
      
      // Restore button
      const upgradeBtn = document.getElementById('upgradeBtn');
      upgradeBtn.innerHTML = '<span class="btn-text">Upgrade to Pro</span><span class="btn-icon">→</span>';
      upgradeBtn.disabled = false;
    }
  }

  exportUserData() {
    const data = {
      stats: this.statsData,
      history: this.scanHistory,
      settings: this.settings,
      exportDate: new Date().toISOString()
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `soft-armor-data-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Data exported successfully', 'success');
  }

  openLink(url) {
    chrome.tabs.create({ url });
  }

  // ================================
  // Utility Functions
  // ================================

  getResultIcon(result) {
    switch (result) {
      case 'authentic': return '✅';
      case 'suspicious': return '⚠️';
      case 'threat': return '🛑';
      default: return '❓';
    }
  }

  getConfidenceLevel(confidence) {
    if (confidence >= 80) return 'high';
    if (confidence >= 50) return 'medium';
    return 'low';
  }

  getC2PAStatusIcon(status) {
    switch (status) {
      case 'valid': return '🔒';
      case 'valid-untrusted': return '⚠️';
      case 'invalid': return '❌';
      case 'error': return '⚡';
      default: return '❓';
    }
  }

  showScanDetails(scanId) {
    const scan = this.scanHistory.find(s => s.id == scanId);
    if (!scan) return;

    // Create detailed scan modal
    this.showScanDetailModal(scan);
  }

  showScanDetailModal(scan) {
    const modal = document.createElement('div');
    modal.className = 'scan-detail-modal';
    modal.innerHTML = `
      <div class="modal-overlay" onclick="this.parentElement.remove()"></div>
      <div class="modal-content">
        <div class="modal-header">
          <h3>Scan Details</h3>
          <button class="modal-close" onclick="this.closest('.scan-detail-modal').remove()">×</button>
        </div>
        <div class="modal-body">
          <div class="detail-section">
            <h4>Result Summary</h4>
            <div class="result-summary">
              <div class="result-icon">${this.getResultIcon(scan.result)}</div>
              <div class="result-text">
                <div class="result-title">${scan.description}</div>
                <div class="result-subtitle">${new Date(scan.timestamp).toLocaleString()}</div>
              </div>
              ${scan.confidence > 0 ? `
                <div class="confidence-display">
                  <div class="confidence-bar">
                    <div class="confidence-fill confidence-${this.getConfidenceLevel(scan.confidence)}" 
                         style="width: ${scan.confidence}%"></div>
                  </div>
                  <div class="confidence-text">${scan.confidence}% confidence</div>
                </div>
              ` : ''}
            </div>
          </div>

          ${scan.c2paStatus !== 'missing' ? `
            <div class="detail-section">
              <h4>C2PA Authenticity</h4>
              <div class="c2pa-details">
                <div class="c2pa-status">
                  <span class="c2pa-icon">${this.getC2PAStatusIcon(scan.c2paStatus)}</span>
                  <span class="c2pa-text">${this.getC2PAStatusText(scan.c2paStatus)}</span>
                </div>
                ${scan.signer ? `<div class="c2pa-signer">Signed by: ${scan.signer}</div>` : ''}
                ${scan.trustLevel ? `<div class="c2pa-trust">Trust level: ${scan.trustLevel}</div>` : ''}
              </div>
            </div>
          ` : ''}

          <div class="detail-section">
            <h4>Technical Details</h4>
            <div class="tech-details">
              <div class="detail-item">
                <span class="detail-label">Domain:</span>
                <span class="detail-value">${scan.domain}</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Scan time:</span>
                <span class="detail-value">${(scan.scanTime / 1000).toFixed(1)}s</span>
              </div>
              <div class="detail-item">
                <span class="detail-label">Media type:</span>
                <span class="detail-value">${scan.mediaType || 'Unknown'}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(modal);
  }

  getC2PAStatusText(status) {
    switch (status) {
      case 'valid': return 'Cryptographically verified';
      case 'valid-untrusted': return 'Valid signature, untrusted issuer';
      case 'invalid': return 'Invalid or corrupted signature';
      case 'error': return 'Verification error occurred';
      default: return 'Status unknown';
    }
  }

  showNotification(message, type = 'info') {
    // Simple notification system
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 12px 16px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      border-radius: 8px;
      font-size: 12px;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
    `;

    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);

    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, 3000);
  }

  async checkProStatus() {
    try {
      // Get subscription status from billing manager
      const subscriptionStatus = await chrome.runtime.sendMessage({
        type: 'GET_SUBSCRIPTION_STATUS'
      });

      this.subscriptionStatus = subscriptionStatus || { active: false, plan: 'free' };
      this.updateProUI();

    } catch (error) {
      console.error('Error checking pro status:', error);
      this.subscriptionStatus = { active: false, plan: 'free' };
    }
  }

  updateProUI() {
    const upgradeTab = document.getElementById('upgradeTab');
    const upgradeBtn = document.getElementById('upgradeBtn');
    
    if (this.subscriptionStatus.active && this.subscriptionStatus.plan === 'pro') {
      // User has Pro subscription
      upgradeTab.querySelector('.tab-label').textContent = 'Pro';
      upgradeTab.querySelector('.tab-icon').textContent = '✅';
      
      // Update upgrade section to show subscription management
      this.updateUpgradeTabForProUser();
      
    } else {
      // Free user
      upgradeTab.querySelector('.tab-label').textContent = 'Upgrade';
      upgradeTab.querySelector('.tab-icon').textContent = '⭐';
    }
  }

  updateUpgradeTabForProUser() {
    const upgradeContent = document.querySelector('#upgrade .upgrade-content');
    
    const isInTrial = this.subscriptionStatus.trialEnd && 
                     Date.now() < this.subscriptionStatus.trialEnd;
    
    const daysRemaining = isInTrial ? 
      Math.ceil((this.subscriptionStatus.trialEnd - Date.now()) / (1000 * 60 * 60 * 24)) :
      Math.ceil((this.subscriptionStatus.currentPeriodEnd - Date.now()) / (1000 * 60 * 60 * 24));

    upgradeContent.innerHTML = `
      <div class="pro-status-content">
        <div class="pro-header">
          <div class="pro-icon">✅</div>
          <h3 class="pro-title">Soft-Armor Pro Active</h3>
          <p class="pro-subtitle">
            ${isInTrial ? `${daysRemaining} days left in trial` : 
              `Renews in ${daysRemaining} days`}
          </p>
        </div>
        
        <div class="pro-features">
          <div class="feature-item active">
            <div class="feature-icon">🚀</div>
            <div class="feature-text">
              <div class="feature-title">Unlimited Scans</div>
              <div class="feature-desc">No daily limits - scan as much as you need</div>
            </div>
          </div>
          
          <div class="feature-item active">
            <div class="feature-icon">🔬</div>
            <div class="feature-text">
              <div class="feature-title">Advanced AI Detection</div>
              <div class="feature-desc">Enhanced deepfake and manipulation detection</div>
            </div>
          </div>
          
          <div class="feature-item active">
            <div class="feature-icon">☁️</div>
            <div class="feature-text">
              <div class="feature-title">Cloud Processing</div>
              <div class="feature-desc">Faster analysis with cloud-powered AI</div>
            </div>
          </div>
        </div>
        
        <div class="pro-actions">
          <button class="action-btn secondary" id="manageSubscription">
            <span class="btn-icon">⚙️</span>
            <span class="btn-text">Manage Subscription</span>
          </button>
          
          ${this.subscriptionStatus.cancelAtPeriodEnd ? `
            <button class="action-btn primary" id="reactivateSubscription">
              <span class="btn-icon">🔄</span>
              <span class="btn-text">Reactivate Subscription</span>
            </button>
          ` : `
            <button class="action-btn secondary" id="cancelSubscription">
              <span class="btn-icon">⏸️</span>
              <span class="btn-text">Cancel Subscription</span>
            </button>
          `}
        </div>
        
        <div class="pro-footer">
          <div class="footer-text">
            Thank you for supporting Soft-Armor Pro! 🙏
          </div>
        </div>
      </div>
    `;

    // Add event listeners for pro actions
    this.setupProActionListeners();
  }

  setupProActionListeners() {
    const manageBtn = document.getElementById('manageSubscription');
    const cancelBtn = document.getElementById('cancelSubscription');
    const reactivateBtn = document.getElementById('reactivateSubscription');

    if (manageBtn) {
      manageBtn.addEventListener('click', () => this.openCustomerPortal());
    }

    if (cancelBtn) {
      cancelBtn.addEventListener('click', () => this.cancelSubscription());
    }

    if (reactivateBtn) {
      reactivateBtn.addEventListener('click', () => this.reactivateSubscription());
    }
  }

  async openCustomerPortal() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'OPEN_CUSTOMER_PORTAL'
      });

      if (response.success && response.url) {
        chrome.tabs.create({ url: response.url });
        this.showNotification('Opening billing portal...', 'info');
      } else {
        this.showNotification(response.error || 'Failed to open billing portal', 'error');
      }
    } catch (error) {
      console.error('Failed to open customer portal:', error);
      this.showNotification('Failed to open billing portal', 'error');
    }
  }

  async cancelSubscription() {
    if (!confirm('Are you sure you want to cancel your Pro subscription? You\'ll continue to have access until the end of your current billing period.')) {
      return;
    }

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'CANCEL_SUBSCRIPTION'
      });

      if (response.success) {
        this.showNotification('Subscription canceled. Access continues until period end.', 'info');
        await this.checkProStatus(); // Refresh status
      } else {
        this.showNotification(response.error || 'Failed to cancel subscription', 'error');
      }
    } catch (error) {
      console.error('Failed to cancel subscription:', error);
      this.showNotification('Failed to cancel subscription', 'error');
    }
  }

  async reactivateSubscription() {
    try {
      const response = await chrome.runtime.sendMessage({
        type: 'REACTIVATE_SUBSCRIPTION'
      });

      if (response.success) {
        this.showNotification('Subscription reactivated successfully!', 'success');
        await this.checkProStatus(); // Refresh status
      } else {
        this.showNotification(response.error || 'Failed to reactivate subscription', 'error');
      }
    } catch (error) {
      console.error('Failed to reactivate subscription:', error);
      this.showNotification('Failed to reactivate subscription', 'error');
    }
  }

  // ================================
  // Batch Scanning
  // ================================

  async openBatchScanPanel() {
    const panel = document.getElementById('batchScanPanel');
    const batchBtn = document.getElementById('runBatchScan');
    
    // Show panel
    panel.classList.remove('hidden');
    batchBtn.classList.add('batch-active');
    
    // Start media discovery
    await this.discoverPageMedia();
  }

  closeBatchScanPanel() {
    const panel = document.getElementById('batchScanPanel');
    const batchBtn = document.getElementById('runBatchScan');
    
    // Hide panel
    panel.classList.add('hidden');
    batchBtn.classList.remove('batch-active');
    
    // Reset batch state if not actively scanning
    if (!this.batchScanState.isActive) {
      this.resetBatchState();
    }
  }

  async discoverPageMedia() {
    const discoveryStatus = document.getElementById('discoveryStatus');
    const mediaCount = document.getElementById('mediaCount');
    const startBtn = document.getElementById('startBatchScan');
    
    // Update UI to show discovery in progress
    discoveryStatus.querySelector('.discovery-text').textContent = 'Discovering media...';
    mediaCount.textContent = 'Found 0 items';
    startBtn.disabled = true;
    
    try {
      // Send discovery request to background script
      const response = await chrome.runtime.sendMessage({
        type: 'DISCOVER_MEDIA',
        filters: {
          images: document.getElementById('filterImages').checked,
          videos: document.getElementById('filterVideos').checked,
          limit: parseInt(document.getElementById('batchLimit').value)
        }
      });

      if (response && response.success && response.media) {
        this.batchScanState.discoveredMedia = response.media;
        this.updateMediaDiscovery();
      } else {
        throw new Error(response.error || 'No media found or discovery failed');
      }

    } catch (error) {
      console.error('Media discovery failed:', error);
      discoveryStatus.querySelector('.discovery-text').textContent = 'Discovery failed';
      discoveryStatus.querySelector('.discovery-icon').textContent = '❌';
      mediaCount.textContent = 'Error discovering media';
      
      setTimeout(() => {
        this.closeBatchScanPanel();
      }, 2000);
    }
  }

  updateMediaDiscovery() {
    const includeImages = document.getElementById('filterImages').checked;
    const includeVideos = document.getElementById('filterVideos').checked;
    const limit = parseInt(document.getElementById('batchLimit').value);
    
    // Filter discovered media
    let filteredMedia = this.batchScanState.discoveredMedia.filter(item => {
      if (item.type === 'image' && !includeImages) return false;
      if (item.type === 'video' && !includeVideos) return false;
      return true;
    });
    
    // Apply limit
    filteredMedia = filteredMedia.slice(0, limit);
    
    // Update UI
    const discoveryStatus = document.getElementById('discoveryStatus');
    const mediaCount = document.getElementById('mediaCount');
    const startBtn = document.getElementById('startBatchScan');
    
    if (filteredMedia.length > 0) {
      discoveryStatus.querySelector('.discovery-text').textContent = 'Media discovered';
      discoveryStatus.querySelector('.discovery-icon').textContent = '✅';
      mediaCount.textContent = `Found ${filteredMedia.length} items`;
      startBtn.disabled = false;
    } else {
      discoveryStatus.querySelector('.discovery-text').textContent = 'No media found';
      discoveryStatus.querySelector('.discovery-icon').textContent = '🔍';
      mediaCount.textContent = 'No items match your filters';
      startBtn.disabled = true;
    }
    
    // Store filtered media for scanning
    this.batchScanState.filteredMedia = filteredMedia;
  }

  async startBatchScan() {
    if (!this.batchScanState.filteredMedia?.length) return;
    
    this.batchScanState.isActive = true;
    this.batchScanState.startTime = Date.now();
    this.batchScanState.results = { authentic: 0, suspicious: 0, threats: 0 };
    
    // Update UI
    this.showBatchProgress();
    
    const mediaToScan = this.batchScanState.filteredMedia;
    const totalItems = mediaToScan.length;
    
    try {
      for (let i = 0; i < totalItems; i++) {
        if (!this.batchScanState.isActive) break; // Check for cancellation
        
        const item = mediaToScan[i];
        this.updateBatchProgress(i, totalItems, `Scanning ${item.type}...`);
        
        // Perform scan
        const result = await this.scanSingleItem(item);
        
        // Update results
        this.updateBatchResults(result);
        
        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      }
      
      if (this.batchScanState.isActive) {
        this.completeBatchScan();
      }
      
    } catch (error) {
      console.error('Batch scan failed:', error);
      this.showBatchError(error.message);
    }
  }

  async scanSingleItem(item) {
    try {
      // Send scan request to background script
      const response = await chrome.runtime.sendMessage({
        type: 'SCAN_MEDIA_ITEM',
        item: item
      });
      
      return response || { result: 'error', confidence: 0 };
      
    } catch (error) {
      console.error('Single item scan failed:', error);
      return { result: 'error', confidence: 0 };
    }
  }

  updateBatchResults(scanResult) {
    // Map scan result to our categories
    if (scanResult.result === 'authentic' || scanResult.riskLevel === 'green') {
      this.batchScanState.results.authentic++;
    } else if (scanResult.result === 'threat' || scanResult.riskLevel === 'red') {
      this.batchScanState.results.threats++;
    } else {
      this.batchScanState.results.suspicious++;
    }
    
    // Add to scan history if enabled
    if (this.settings.storeHistory) {
      this.scanHistory.push({
        id: Date.now() + Math.random(),
        timestamp: Date.now(),
        result: this.mapScanResult(scanResult),
        description: `Batch scan: ${scanResult.description || 'Media analyzed'}`,
        domain: scanResult.domain || window.location.hostname,
        scanTime: scanResult.scanTime || 1000,
        confidence: scanResult.confidence || 0,
        c2paStatus: scanResult.c2paStatus || 'missing',
        mediaType: scanResult.mediaType || 'unknown',
        batchScan: true
      });
    }
  }

  mapScanResult(scanResult) {
    if (scanResult.result === 'authentic' || scanResult.riskLevel === 'green') {
      return 'authentic';
    } else if (scanResult.result === 'threat' || scanResult.riskLevel === 'red') {
      return 'threat';
    }
    return 'suspicious';
  }

  showBatchProgress() {
    // Hide discovery, show progress
    document.querySelector('.batch-discovery').style.display = 'none';
    document.querySelector('.batch-options').style.display = 'none';
    document.querySelector('.batch-actions').style.display = 'none';
    document.getElementById('batchProgress').classList.remove('hidden');
    
    // Show cancel button
    document.getElementById('cancelBatchScan').style.display = 'block';
  }

  updateBatchProgress(current, total, status) {
    const progressText = document.getElementById('progressText');
    const progressCount = document.getElementById('progressCount');
    const progressFill = document.getElementById('progressFill');
    const progressSpeed = document.getElementById('progressSpeed');
    const progressETA = document.getElementById('progressETA');
    
    const percentage = (current / total) * 100;
    const elapsed = Date.now() - this.batchScanState.startTime;
    const rate = current / (elapsed / 60000); // items per minute
    const remaining = total - current;
    const eta = remaining / rate; // minutes
    
    progressText.textContent = status;
    progressCount.textContent = `${current}/${total}`;
    progressFill.style.width = `${percentage}%`;
    progressSpeed.textContent = `${rate.toFixed(1)} items/min`;
    progressETA.textContent = `ETA: ${eta > 1 ? Math.ceil(eta) + 'm' : '<1m'}`;
  }

  completeBatchScan() {
    // Hide progress, show results
    document.getElementById('batchProgress').classList.add('hidden');
    document.getElementById('batchResults').classList.remove('hidden');
    document.getElementById('cancelBatchScan').style.display = 'none';
    
    // Update results summary
    document.getElementById('authenticCount').textContent = this.batchScanState.results.authentic;
    document.getElementById('suspiciousCount').textContent = this.batchScanState.results.suspicious;
    document.getElementById('threatCount').textContent = this.batchScanState.results.threats;
    
    // Update global stats
    this.statsData.todayScans += this.batchScanState.filteredMedia.length;
    this.statsData.authenticMedia += this.batchScanState.results.authentic;
    this.statsData.suspiciousMedia += this.batchScanState.results.suspicious;
    this.statsData.threatsBlocked += this.batchScanState.results.threats;
    
    this.saveData();
    this.updateStatsDisplay();
    
    this.batchScanState.isActive = false;
    
    this.showNotification(
      `Batch scan completed: ${this.batchScanState.filteredMedia.length} items processed`,
      'success'
    );
  }

  cancelBatchScan() {
    if (confirm('Cancel the current batch scan? Progress will be lost.')) {
      this.batchScanState.isActive = false;
      this.closeBatchScanPanel();
      this.showNotification('Batch scan cancelled', 'info');
    }
  }

  showBatchError(message) {
    document.getElementById('batchProgress').classList.add('hidden');
    
    const discoveryStatus = document.getElementById('discoveryStatus');
    discoveryStatus.querySelector('.discovery-text').textContent = 'Scan failed';
    discoveryStatus.querySelector('.discovery-icon').textContent = '❌';
    document.getElementById('mediaCount').textContent = message;
    
    document.querySelector('.batch-discovery').style.display = 'block';
    document.getElementById('cancelBatchScan').style.display = 'none';
    
    this.batchScanState.isActive = false;
    
    setTimeout(() => {
      this.closeBatchScanPanel();
    }, 3000);
  }

  exportBatchResults() {
    const batchData = {
      timestamp: new Date().toISOString(),
      summary: this.batchScanState.results,
      totalItems: this.batchScanState.filteredMedia.length,
      scanDuration: Date.now() - this.batchScanState.startTime,
      results: this.scanHistory.filter(item => item.batchScan && 
        item.timestamp >= this.batchScanState.startTime)
    };
    
    const blob = new Blob([JSON.stringify(batchData, null, 2)], {
      type: 'application/json'
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `batch-scan-results-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    
    URL.revokeObjectURL(url);
    this.showNotification('Batch results exported', 'success');
  }

  viewBatchInHistory() {
    this.closeBatchScanPanel();
    this.switchTab('history');
    
    // Filter to show recent batch results
    const filter = document.getElementById('historyFilter');
    filter.value = 'all';
    this.filterHistory('all');
  }

  resetBatchState() {
    this.batchScanState = {
      isActive: false,
      discoveredMedia: [],
      filteredMedia: [],
      currentScan: null,
      results: { authentic: 0, suspicious: 0, threats: 0 },
      startTime: null
    };
    
    // Reset UI
    document.querySelector('.batch-discovery').style.display = 'block';
    document.querySelector('.batch-options').style.display = 'block';
    document.querySelector('.batch-actions').style.display = 'block';
    document.getElementById('batchProgress').classList.add('hidden');
    document.getElementById('batchResults').classList.add('hidden');
    document.getElementById('cancelBatchScan').style.display = 'none';
  }

  // ================================
  // Message Handlers
  // ================================

  setupMessageHandlers() {
    // Listen for messages from background script
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'SCAN_COMPLETED':
          this.handleScanCompleted(message.data);
          break;
        case 'STATS_UPDATED':
          this.handleStatsUpdate(message.data);
          break;
        default:
          break;
      }
    });
  }

  handleScanCompleted(scanData) {
    // Scan data is already processed by background script
    // Just add to our local history and update UI
    if (this.settings.storeHistory) {
      this.scanHistory.push(scanData);

      // Keep only last 100 entries
      if (this.scanHistory.length > 100) {
        this.scanHistory = this.scanHistory.slice(-100);
      }
    }

    // Show notification about new scan
    const resultEmoji = scanData.result === 'authentic' ? '✅' : 
                       scanData.result === 'threat' ? '🛑' : '⚠️';
    this.showNotification(`${resultEmoji} Scan completed: ${scanData.description}`, 'info');

    // Update UI
    this.updateUI();
  }

  generateScanDescription(scanData, c2paDetails) {
    if (c2paDetails && c2paDetails.validationStatus !== 'missing') {
      const confidence = c2paDetails.confidenceScore || 0;
      const status = c2paDetails.validationStatus;
      
      switch (status) {
        case 'valid':
          return confidence >= 90 
            ? `Highly trusted content (${confidence}%)`
            : `Verified content (${confidence}%)`;
        case 'valid-untrusted':
          return `Self-signed content (${confidence}%)`;
        case 'invalid':
          return `Invalid authenticity data (${confidence}%)`;
        case 'error':
          return 'Verification failed';
        default:
          return `Content scanned (${confidence}%)`;
      }
    }
    
    // Fallback for non-C2PA content
    return scanData.description || 'Media scan completed';
  }

  handleStatsUpdate(statsData) {
    // Update stats from background script
    this.statsData = { ...this.statsData, ...statsData };
    this.updateStatsDisplay();
    // Don't save here - background script handles storage
  }
}

// ================================
// Initialize Popup
// ================================

document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
});

// Handle extension context invalidation
window.addEventListener('beforeunload', () => {
  // Save any pending data
  if (window.popupManager) {
    window.popupManager.saveData();
  }
});