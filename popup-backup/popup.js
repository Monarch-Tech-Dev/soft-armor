// Soft-Armor Popup Manager - CSP Compliant Version
class PopupManager {
  constructor() {
    this.currentTab = 'dashboard';
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
    this.settings = {
      autoScanEnabled: true,
      showNotifications: true,
      storeHistory: true,
      debugMode: false
    };
    this.init();
  }

  async init() {
    await this.loadStoredData();
    this.setupEventListeners();
    this.updateUI();
  }

  setupEventListeners() {
    // Tab navigation
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const tab = e.target.closest('.tab-btn').dataset.tab;
        this.switchTab(tab);
      });
    });

    // Settings button
    const settingsBtn = document.getElementById('settingsToggle');
    if (settingsBtn) {
      settingsBtn.addEventListener('click', () => {
        this.toggleSettings();
      });
    }

    // Settings close button
    const settingsClose = document.getElementById('settingsClose');
    if (settingsClose) {
      settingsClose.addEventListener('click', () => {
        this.closeSettings();
      });
    }

    // Settings overlay
    const settingsOverlay = document.getElementById('settingsOverlay');
    if (settingsOverlay) {
      settingsOverlay.addEventListener('click', () => {
        this.closeSettings();
      });
    }

    // Manual scan button
    const manualScan = document.getElementById('runManualScan');
    if (manualScan) {
      manualScan.addEventListener('click', () => {
        this.runManualScan();
      });
    }

    // Batch scan button  
    const batchScan = document.getElementById('runBatchScan');
    if (batchScan) {
      batchScan.addEventListener('click', () => {
        this.runBatchScan();
      });
    }

    // Test button - for compatibility with diagnostic suite
    const testBtn = document.getElementById('testBtn');
    if (testBtn) {
      testBtn.addEventListener('click', () => {
        this.runTest();
      });
    }

    // Settings toggles
    this.setupSettingsListeners();
  }

  setupSettingsListeners() {
    const settingsToggles = ['autoScanEnabled', 'showNotifications', 'storeHistory', 'debugMode'];
    
    settingsToggles.forEach(settingId => {
      const toggle = document.getElementById(settingId);
      if (toggle) {
        toggle.checked = this.settings[settingId] || false;
        toggle.addEventListener('change', (e) => {
          this.updateSetting(settingId, e.target.checked);
        });
      }
    });
  }

  async loadStoredData() {
    try {
      const result = await chrome.storage.local.get(['statsData', 'scanHistory', 'settings', 'lastUpdate']);
      
      if (result.statsData) {
        this.statsData = { ...this.statsData, ...result.statsData };
      }
      
      if (result.scanHistory) {
        this.scanHistory = result.scanHistory;
      }
      
      if (result.settings) {
        this.settings = { ...this.settings, ...result.settings };
      }

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
    const today = new Date();
    const lastDate = lastUpdate ? new Date(lastUpdate) : null;
    
    if (!lastDate || lastDate.toDateString() !== today.toDateString()) {
      this.statsData.todayScans = 0;
      this.saveData();
    }
  }

  switchTab(tabName) {
    if (this.currentTab === tabName) return;

    // Update tab buttons
    document.querySelectorAll('.tab-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabName);
    });

    // Update content
    document.querySelectorAll('.tab-content').forEach(content => {
      content.classList.toggle('active', content.id === tabName);
    });

    this.currentTab = tabName;

    // Update specific tab content
    if (tabName === 'history') {
      this.updateHistoryTab();
    }
  }

  toggleSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsOverlay');
    
    if (settingsPanel && settingsOverlay) {
      const isOpen = settingsPanel.classList.contains('open');
      
      if (isOpen) {
        settingsPanel.classList.remove('open');
        settingsOverlay.classList.remove('visible');
      } else {
        settingsPanel.classList.add('open');
        settingsOverlay.classList.add('visible');
      }
    }
  }

  closeSettings() {
    const settingsPanel = document.getElementById('settingsPanel');
    const settingsOverlay = document.getElementById('settingsOverlay');
    
    if (settingsPanel && settingsOverlay) {
      settingsPanel.classList.remove('open');
      settingsOverlay.classList.remove('visible');
    }
  }

  updateSetting(settingName, value) {
    this.settings[settingName] = value;
    this.saveData();
    
    // Notify background script
    chrome.runtime.sendMessage({
      type: 'SETTINGS_UPDATED',
      settings: this.settings
    });

    if (settingName === 'autoScanEnabled') {
      this.updateStatusIndicator();
    }

    this.showNotification(`Setting updated: ${settingName}`, 'success');
  }

  updateUI() {
    this.updateStatsDisplay();
    this.updateRecentActivity();
    this.updateStatusIndicator();
  }

  updateStatsDisplay() {
    const statElements = {
      todayScans: document.getElementById('todayScans'),
      threatsBlocked: document.getElementById('threatsBlocked'),
      authenticMedia: document.getElementById('authenticMedia'),
      suspiciousMedia: document.getElementById('suspiciousMedia')
    };

    Object.entries(statElements).forEach(([key, element]) => {
      if (element) {
        element.textContent = this.statsData[key] || 0;
      }
    });
  }

  updateRecentActivity() {
    const activityList = document.getElementById('recentActivity');
    if (!activityList) return;

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
      const time = new Date(scan.timestamp).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit'
      });
      
      return `
        <div class="activity-item">
          <div class="activity-icon">${icon}</div>
          <div class="activity-content">
            <div class="activity-text">${scan.description}</div>
            <div class="activity-subtext">${time} • ${scan.domain}</div>
          </div>
        </div>
      `;
    }).join('');
  }

  updateStatusIndicator() {
    const statusLight = document.querySelector('.status-light');
    const statusText = document.querySelector('.status-text');
    
    if (statusLight && statusText) {
      if (this.settings.autoScanEnabled) {
        statusLight.classList.add('active');
        statusText.textContent = 'Protection Active';
      } else {
        statusLight.classList.remove('active');
        statusText.textContent = 'Protection Paused';
      }
    }
  }

  updateHistoryTab() {
    const totalScans = document.getElementById('totalScans');
    const successRate = document.getElementById('successRate');
    const avgScanTime = document.getElementById('avgScanTime');
    const historyList = document.getElementById('historyList');

    const total = this.scanHistory.length;
    const authentic = this.scanHistory.filter(scan => scan.result === 'authentic').length;
    const avgTime = total > 0 ? 
      this.scanHistory.reduce((sum, scan) => sum + (scan.scanTime || 1000), 0) / total / 1000 : 0;

    if (totalScans) totalScans.textContent = total;
    if (successRate) successRate.textContent = total > 0 ? `${Math.round(authentic/total * 100)}%` : '0%';
    if (avgScanTime) avgScanTime.textContent = `${avgTime.toFixed(1)}s`;

    if (historyList) {
      if (this.scanHistory.length === 0) {
        historyList.innerHTML = `
          <div class="history-item empty">
            <div class="empty-icon">📜</div>
            <div class="empty-text">No scan history yet</div>
            <div class="empty-subtext">Your scan results will appear here</div>
          </div>
        `;
      } else {
        historyList.innerHTML = this.scanHistory.slice().reverse().map(scan => {
          const icon = this.getResultIcon(scan.result);
          const time = new Date(scan.timestamp).toLocaleString();
          
          return `
            <div class="activity-item">
              <div class="activity-icon">${icon}</div>
              <div class="activity-content">
                <div class="activity-text">${scan.description}</div>
                <div class="activity-subtext">${time} • ${scan.domain}</div>
              </div>
            </div>
          `;
        }).join('');
      }
    }
  }

  async runManualScan() {
    try {
      this.showNotification('Starting manual scan...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        type: 'MANUAL_SCAN_REQUEST'
      });

      if (response && response.success) {
        this.showNotification('✅ Scan initiated on current page', 'success');
        
        // Update stats optimistically
        this.statsData.todayScans = (this.statsData.todayScans || 0) + 1;
        this.updateStatsDisplay();
        this.saveData();
        
      } else {
        throw new Error(response?.error || 'Scan failed');
      }
    } catch (error) {
      console.error('Manual scan failed:', error);
      this.showNotification('❌ Scan failed - try refreshing the page', 'error');
    }
  }

  async runBatchScan() {
    try {
      this.showNotification('Starting batch scan...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        type: 'BATCH_SCAN_REQUEST'
      });

      if (response && response.success) {
        this.showNotification('🔍 Batch scan initiated', 'success');
      } else {
        throw new Error(response?.error || 'Batch scan failed');
      }
    } catch (error) {
      console.error('Batch scan failed:', error);
      this.showNotification('❌ Batch scan failed - try refreshing the page', 'error');
    }
  }

  async runTest() {
    try {
      this.showNotification('🔍 Running extension test...', 'info');
      
      const response = await chrome.runtime.sendMessage({
        type: 'EXTENSION_TEST'
      });

      if (response && response.success) {
        this.showNotification('✅ Extension test completed successfully', 'success');
      } else {
        this.showNotification('⚠️ Extension test completed with warnings', 'warning');
      }
    } catch (error) {
      console.error('Extension test failed:', error);
      this.showNotification('❌ Extension test failed', 'error');
    }
  }

  getResultIcon(result) {
    switch (result) {
      case 'authentic': return '✅';
      case 'suspicious': return '⚠️';
      case 'threat': return '🛑';
      default: return '❓';
    }
  }

  showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `popup-notification ${type}`;
    notification.textContent = message;
    
    // Style the notification
    notification.style.cssText = `
      position: fixed;
      top: 10px;
      right: 10px;
      padding: 8px 12px;
      background: ${type === 'success' ? '#22c55e' : type === 'error' ? '#ef4444' : type === 'warning' ? '#f59e0b' : '#3b82f6'};
      color: white;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 500;
      z-index: 10000;
      transform: translateX(100%);
      transition: transform 0.3s ease;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    `;
    
    document.body.appendChild(notification);
    
    // Animate in
    setTimeout(() => {
      notification.style.transform = 'translateX(0)';
    }, 10);
    
    // Animate out and remove
    setTimeout(() => {
      notification.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (document.body.contains(notification)) {
          document.body.removeChild(notification);
        }
      }, 300);
    }, 2500);
  }

  // Handle scan completion from background script
  handleScanCompleted(scanData) {
    if (this.settings.storeHistory) {
      this.scanHistory.push(scanData);
      if (this.scanHistory.length > 100) {
        this.scanHistory = this.scanHistory.slice(-100);
      }
    }
    
    const icon = this.getResultIcon(scanData.result);
    this.showNotification(`${icon} Scan completed: ${scanData.description}`, 'info');
    
    this.saveData();
    this.updateUI();
  }

  // Handle stats update from background script
  handleStatsUpdate(newStats) {
    this.statsData = { ...this.statsData, ...newStats };
    this.updateStatsDisplay();
    this.saveData();
  }
}

// Initialize popup manager when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  window.popupManager = new PopupManager();
  console.log('✅ Soft-Armor popup loaded successfully');
});

// Listen for messages from background script
if (typeof chrome !== 'undefined' && chrome.runtime) {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (window.popupManager) {
      switch (message.type) {
        case 'SCAN_COMPLETED':
          window.popupManager.handleScanCompleted(message.data);
          break;
        case 'STATS_UPDATED':
          window.popupManager.handleStatsUpdate(message.data);
          break;
      }
    }
  });
}

// Save data when popup closes
window.addEventListener('beforeunload', () => {
  if (window.popupManager) {
    window.popupManager.saveData();
  }
});