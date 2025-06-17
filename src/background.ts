// Chrome Manifest V3 Service Worker - use native Chrome APIs

interface BackgroundTask {
  id: string;
  type: 'scan' | 'cache-cleanup' | 'performance-report';
  priority: number;
  timestamp: number;
  data?: any;
}

class BackgroundProcessor {
  private taskQueue: BackgroundTask[] = [];
  private isProcessing = false;
  private maxConcurrentTasks = 2;
  private activeTasks = new Set<string>();

  async addTask(task: Omit<BackgroundTask, 'id' | 'timestamp'>): Promise<void> {
    const fullTask: BackgroundTask = {
      ...task,
      id: `${task.type}_${Date.now()}_${Math.random()}`,
      timestamp: Date.now()
    };

    this.taskQueue.push(fullTask);
    this.taskQueue.sort((a, b) => b.priority - a.priority);
    
    if (!this.isProcessing) {
      this.processQueue();
    }
  }

  private async processQueue(): Promise<void> {
    if (this.isProcessing || this.activeTasks.size >= this.maxConcurrentTasks) return;
    
    this.isProcessing = true;

    while (this.taskQueue.length > 0 && this.activeTasks.size < this.maxConcurrentTasks) {
      const task = this.taskQueue.shift()!;
      this.activeTasks.add(task.id);
      
      this.executeTask(task).finally(() => {
        this.activeTasks.delete(task.id);
      });
    }

    this.isProcessing = false;
  }

  private async executeTask(task: BackgroundTask): Promise<void> {
    switch (task.type) {
      case 'cache-cleanup':
        await this.performCacheCleanup();
        break;
      case 'performance-report':
        await this.generatePerformanceReport();
        break;
      default:
        console.warn('Unknown background task type:', task.type);
    }
  }

  private async performCacheCleanup(): Promise<void> {
    try {
      const cacheKeys = await chrome.storage.local.get(null);
      const now = Date.now();
      const maxAge = 24 * 60 * 60 * 1000; // 24 hours
      
      for (const [key, value] of Object.entries(cacheKeys)) {
        if (key.startsWith('scan_cache_') && typeof value === 'object' && value) {
          const cacheEntry = value as any;
          if (cacheEntry.timestamp && now - cacheEntry.timestamp > maxAge) {
            await chrome.storage.local.remove(key);
          }
        }
      }
    } catch (error) {
      console.warn('Cache cleanup failed:', error);
    }
  }

  private async generatePerformanceReport(): Promise<void> {
    try {
      const performanceData = await chrome.storage.local.get('performance_metrics');
      const metrics = performanceData.performance_metrics || {};
      
      const report = {
        lastUpdated: Date.now(),
        averageScanTime: this.calculateAverage(metrics.scanTimes || []),
        totalScans: metrics.totalScans || 0,
        errorRate: this.calculateErrorRate(metrics.errors || [], metrics.totalScans || 0),
        memoryUsage: metrics.memoryUsage || []
      };

      await chrome.storage.local.set({ performance_report: report });
    } catch (error) {
      console.warn('Performance report generation failed:', error);
    }
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateErrorRate(errors: any[], total: number): number {
    return total > 0 ? errors.length / total : 0;
  }
}

const backgroundProcessor = new BackgroundProcessor();

// Schedule periodic tasks
setInterval(() => {
  backgroundProcessor.addTask({ type: 'cache-cleanup', priority: 1 });
}, 60 * 60 * 1000); // Every hour

setInterval(() => {
  backgroundProcessor.addTask({ type: 'performance-report', priority: 2 });
}, 10 * 60 * 1000); // Every 10 minutes

// Create context menu on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: 'soft-armor-scan',
    title: '🛡️ Soft-Armor → Scan for authenticity',
    contexts: ['image', 'video']
  });

  chrome.contextMenus.create({
    id: 'soft-armor-quick-scan',
    title: '⚡ Quick scan',
    contexts: ['image', 'video'],
    parentId: 'soft-armor-scan'
  });

  chrome.contextMenus.create({
    id: 'soft-armor-deep-scan',
    title: '🔍 Deep analysis', 
    contexts: ['image', 'video'],
    parentId: 'soft-armor-scan'
  });

  chrome.contextMenus.create({
    id: 'separator-1',
    type: 'separator',
    contexts: ['image', 'video'],
    parentId: 'soft-armor-scan'
  });

  chrome.contextMenus.create({
    id: 'soft-armor-view-report',
    title: '📊 View previous report',
    contexts: ['image', 'video'],
    parentId: 'soft-armor-scan',
    enabled: false
  });
});

// Handle context menu clicks
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (!tab?.id || !info.srcUrl) return;

  const scanConfig = {
    mediaUrl: info.srcUrl,
    scanType: 'standard',
    showProgress: true
  };

  switch (info.menuItemId) {
    case 'soft-armor-quick-scan':
      scanConfig.scanType = 'quick';
      break;
    case 'soft-armor-deep-scan':
      scanConfig.scanType = 'deep';
      break;
    case 'soft-armor-view-report':
      scanConfig.scanType = 'report';
      break;
    default:
      if (!info.menuItemId?.toString().startsWith('soft-armor')) return;
  }

  // Inject context menu feedback and scan logic
  await chrome.scripting.executeScript({
    target: { tabId: tab.id, allFrames: true },
    func: initiateScanWithFeedback,
    args: [scanConfig]
  });

  // Update context menu state
  await updateContextMenuState(tab.id, 'scanning');
});

// Enhanced scan initiation with visual feedback
function initiateScanWithFeedback(config: {
  mediaUrl: string;
  scanType: string;
  showProgress: boolean;
}) {
  // Find the target media element
  const mediaElement = document.querySelector(`img[src="${config.mediaUrl}"], video[src="${config.mediaUrl}"]`) as HTMLElement;
  
  if (mediaElement) {
    // Add ripple effect for immediate feedback
    mediaElement.classList.add('soft-armor-context-active');
    setTimeout(() => {
      mediaElement.classList.remove('soft-armor-context-active');
    }, 600);

    // Mark as scannable for enhanced styling
    mediaElement.setAttribute('data-soft-armor-scannable', 'true');
    
    // Add scanning overlay if enabled
    if (config.showProgress) {
      const scanningOverlay = document.createElement('div');
      scanningOverlay.className = 'soft-armor-scanning-overlay';
      scanningOverlay.setAttribute('data-scan-type', config.scanType);
      
      // Position overlay relative to media element
      const rect = mediaElement.getBoundingClientRect();
      scanningOverlay.style.position = 'fixed';
      scanningOverlay.style.top = `${rect.top}px`;
      scanningOverlay.style.left = `${rect.left}px`;
      scanningOverlay.style.width = `${rect.width}px`;
      scanningOverlay.style.height = `${rect.height}px`;
      
      document.body.appendChild(scanningOverlay);
      
      // Store reference for cleanup
      mediaElement.setAttribute('data-scanning-overlay-id', Date.now().toString());
    }
  }

  // Post message to content script with enhanced config
  window.postMessage({
    type: 'SOFT_ARMOR_SCAN',
    mediaUrl: config.mediaUrl,
    scanType: config.scanType,
    timestamp: Date.now(),
    showProgress: config.showProgress
  }, '*');
}

// Context menu state management
async function updateContextMenuState(tabId: number, state: 'idle' | 'scanning' | 'complete') {
  const menuUpdates: { [key: string]: any } = {};

  switch (state) {
    case 'scanning':
      menuUpdates['soft-armor-scan'] = { 
        title: '🔄 Scanning in progress...',
        enabled: false
      };
      menuUpdates['soft-armor-quick-scan'] = { enabled: false };
      menuUpdates['soft-armor-deep-scan'] = { enabled: false };
      break;
      
    case 'complete':
      menuUpdates['soft-armor-scan'] = { 
        title: '🛡️ Soft-Armor → Scan for authenticity',
        enabled: true
      };
      menuUpdates['soft-armor-quick-scan'] = { enabled: true };
      menuUpdates['soft-armor-deep-scan'] = { enabled: true };
      menuUpdates['soft-armor-view-report'] = { enabled: true };
      break;
      
    default: // idle
      menuUpdates['soft-armor-scan'] = { 
        title: '🛡️ Soft-Armor → Scan for authenticity',
        enabled: true
      };
      menuUpdates['soft-armor-quick-scan'] = { enabled: true };
      menuUpdates['soft-armor-deep-scan'] = { enabled: true };
  }

  // Apply updates
  for (const [id, properties] of Object.entries(menuUpdates)) {
    try {
      await chrome.contextMenus.update(id, properties);
    } catch (error) {
      console.warn(`Failed to update context menu item ${id}:`, error);
    }
  }
}

// Enhanced message handler for popup and content script communication
chrome.runtime.onMessage.addListener(async (message, sender, sendResponse) => {
  switch (message.type) {
    case 'SCAN_COMPLETE':
      if (sender.tab?.id) {
        await updateContextMenuState(sender.tab.id, 'complete');
        await storeScanResult(message.result, sender.tab.url || 'unknown');
        await updateStatsData(message.result);
      }
      break;

    case 'MANUAL_SCAN_REQUEST':
      // Handle popup manual scan request
      if (sender.tab?.id) {
        try {
          await chrome.tabs.sendMessage(sender.tab.id, {
            type: 'MANUAL_SCAN_REQUEST'
          });
          sendResponse({ success: true });
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return true; // Keep channel open for async response

    case 'DISCOVER_MEDIA':
      // Handle popup media discovery request
      if (sender.tab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(sender.tab.id, {
            type: 'DISCOVER_MEDIA',
            filters: message.filters
          });
          sendResponse(response);
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return true;

    case 'SCAN_MEDIA_ITEM':
      // Handle popup single item scan request
      if (sender.tab?.id) {
        try {
          const response = await chrome.tabs.sendMessage(sender.tab.id, {
            type: 'SCAN_MEDIA_ITEM',
            item: message.item
          });
          sendResponse(response);
        } catch (error) {
          sendResponse({ success: false, error: error.message });
        }
      }
      return true;

    case 'SETTINGS_UPDATED':
      // Handle settings update from popup
      await chrome.storage.local.set({ 
        userSettings: message.settings 
      });
      
      // Broadcast to all tabs
      const tabs = await chrome.tabs.query({});
      for (const tab of tabs) {
        if (tab.id) {
          try {
            await chrome.tabs.sendMessage(tab.id, {
              type: 'SETTINGS_UPDATED',
              settings: message.settings
            });
          } catch (error) {
            // Tab might not have content script
          }
        }
      }
      break;

    case 'GET_SUBSCRIPTION_STATUS':
      // Handle Pro subscription status check
      const subscriptionData = await chrome.storage.local.get('subscription');
      sendResponse(subscriptionData.subscription || { active: false, plan: 'free' });
      return true;

    case 'INITIATE_UPGRADE':
      // Handle Pro upgrade request
      sendResponse({ 
        success: false, 
        error: 'Upgrade functionality coming soon' 
      });
      return true;

    default:
      break;
  }
});

// Store scan results for popup statistics
async function storeScanResult(scanResult: any, pageUrl: string): Promise<void> {
  try {
    const domain = new URL(pageUrl).hostname;
    const timestamp = Date.now();
    
    // Get existing scan history
    const historyData = await chrome.storage.local.get('scanHistory');
    const scanHistory = historyData.scanHistory || [];
    
    // Create scan entry
    const scanEntry = {
      id: `${timestamp}_${Math.random()}`,
      timestamp,
      result: scanResult.riskLevel === 'safe' ? 'authentic' : 
              scanResult.riskLevel === 'danger' ? 'threat' : 'suspicious',
      description: generateScanDescription(scanResult),
      domain,
      scanTime: scanResult.scanTime || 2000,
      confidence: scanResult.c2paDetails?.confidenceScore || 0,
      c2paStatus: scanResult.c2paDetails?.validationStatus || 'missing',
      mediaType: scanResult.mediaType || 'unknown',
      riskLevel: scanResult.riskLevel,
      batchScan: false
    };
    
    // Add to history (keep last 100 entries)
    scanHistory.push(scanEntry);
    if (scanHistory.length > 100) {
      scanHistory.splice(0, scanHistory.length - 100);
    }
    
    // Store updated history
    await chrome.storage.local.set({ scanHistory });
    
    // Notify popup if open
    try {
      await chrome.runtime.sendMessage({
        type: 'SCAN_COMPLETED',
        data: scanEntry
      });
    } catch (error) {
      // Popup might not be open
    }
    
  } catch (error) {
    console.error('Failed to store scan result:', error);
  }
}

// Update statistics data
async function updateStatsData(scanResult: any): Promise<void> {
  try {
    const statsData = await chrome.storage.local.get('statsData');
    const stats = statsData.statsData || {
      todayScans: 0,
      threatsBlocked: 0,
      authenticMedia: 0,
      suspiciousMedia: 0,
      totalScans: 0,
      lastUpdate: 0
    };
    
    // Check if it's a new day
    const today = new Date().toDateString();
    const lastUpdate = stats.lastUpdate ? new Date(stats.lastUpdate).toDateString() : '';
    
    if (today !== lastUpdate) {
      stats.todayScans = 0;
      stats.lastUpdate = Date.now();
    }
    
    // Update counters
    stats.todayScans += 1;
    stats.totalScans += 1;
    
    if (scanResult.riskLevel === 'safe') {
      stats.authenticMedia += 1;
    } else if (scanResult.riskLevel === 'danger') {
      stats.threatsBlocked += 1;
    } else {
      stats.suspiciousMedia += 1;
    }
    
    // Store updated stats
    await chrome.storage.local.set({ statsData: stats });
    
    // Notify popup if open
    try {
      await chrome.runtime.sendMessage({
        type: 'STATS_UPDATED',
        data: stats
      });
    } catch (error) {
      // Popup might not be open
    }
    
  } catch (error) {
    console.error('Failed to update stats:', error);
  }
}

// Generate scan description
function generateScanDescription(scanResult: any): string {
  const confidence = scanResult.c2paDetails?.confidenceScore || 0;
  const hasC2PA = scanResult.c2paValid || scanResult.c2paDetails?.isValid;
  
  if (hasC2PA && confidence > 80) {
    return `Verified authentic content (${confidence}%)`;
  } else if (hasC2PA) {
    return `C2PA signed content (${confidence}%)`;
  } else if (scanResult.riskLevel === 'danger') {
    return scanResult.hasLoopArtifacts ? 
      'AI-generated patterns detected' : 
      'Potential manipulation detected';
  } else if (scanResult.riskLevel === 'warning') {
    return 'Unverified content - proceed with caution';
  } else {
    return 'Content appears authentic';
  }
}
