/* ================================
   🔬 Enhanced Debug Logger System
   Comprehensive logging for Soft-Armor diagnostics
   ================================ */

export interface LogEntry {
  timestamp: number;
  level: 'debug' | 'info' | 'warn' | 'error' | 'performance' | 'scan' | 'ui';
  component: string;
  action: string;
  data?: any;
  duration?: number;
  memoryUsage?: number;
}

export class DebugLogger {
  private static instance: DebugLogger;
  private logs: LogEntry[] = [];
  private startTimes = new Map<string, number>();
  private verboseMode = false;
  private maxLogs = 1000;
  
  static getInstance(): DebugLogger {
    if (!this.instance) {
      this.instance = new DebugLogger();
    }
    return this.instance;
  }

  private constructor() {
    this.detectVerboseMode();
    this.setupPerformanceObserver();
  }

  private detectVerboseMode() {
    // Check if running in development or verbose mode
    this.verboseMode = 
      window.location.hostname === 'localhost' ||
      window.location.search.includes('debug=true') ||
      localStorage.getItem('soft-armor-debug') === 'true';
  }

  setVerboseMode(enabled: boolean) {
    this.verboseMode = enabled;
    localStorage.setItem('soft-armor-debug', enabled.toString());
    this.log('debug', 'DebugLogger', 'setVerboseMode', { enabled });
  }

  private createLogEntry(
    level: LogEntry['level'],
    component: string,
    action: string,
    data?: any,
    duration?: number
  ): LogEntry {
    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      component,
      action,
      data,
      duration
    };

    // Add memory usage if available
    if (performance.memory) {
      entry.memoryUsage = performance.memory.usedJSHeapSize;
    }

    return entry;
  }

  private addLog(entry: LogEntry) {
    this.logs.push(entry);
    
    // Keep only recent logs
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }

    // Output to console in verbose mode
    if (this.verboseMode) {
      this.outputToConsole(entry);
    }

    // Dispatch event for test suite integration
    this.dispatchLogEvent(entry);
  }

  private outputToConsole(entry: LogEntry) {
    const timestamp = new Date(entry.timestamp).toLocaleTimeString();
    const prefix = `[${timestamp}] 🔬 ${entry.level.toUpperCase()} [${entry.component}]`;
    const message = `${entry.action}${entry.duration ? ` (${entry.duration}ms)` : ''}`;
    
    const style = this.getConsoleStyle(entry.level);
    
    if (entry.data) {
      console.groupCollapsed(`%c${prefix} ${message}`, style);
      console.log('Data:', entry.data);
      if (entry.memoryUsage) {
        console.log('Memory:', `${(entry.memoryUsage / 1024 / 1024).toFixed(2)} MB`);
      }
      console.groupEnd();
    } else {
      console.log(`%c${prefix} ${message}`, style);
    }
  }

  private getConsoleStyle(level: LogEntry['level']): string {
    const styles = {
      debug: 'color: #718096; font-weight: normal;',
      info: 'color: #4299e1; font-weight: bold;',
      warn: 'color: #ed8936; font-weight: bold;',
      error: 'color: #f56565; font-weight: bold;',
      performance: 'color: #9f7aea; font-weight: bold;',
      scan: 'color: #48bb78; font-weight: bold;',
      ui: 'color: #ed64a6; font-weight: bold;'
    };
    return styles[level] || styles.info;
  }

  private dispatchLogEvent(entry: LogEntry) {
    window.dispatchEvent(new CustomEvent('soft-armor-log', {
      detail: entry
    }));
  }

  private setupPerformanceObserver() {
    if ('PerformanceObserver' in window) {
      try {
        const observer = new PerformanceObserver((list) => {
          list.getEntries().forEach((entry) => {
            if (entry.entryType === 'measure' && entry.name.startsWith('soft-armor-')) {
              this.log('performance', 'PerformanceObserver', entry.name, {
                duration: entry.duration,
                startTime: entry.startTime
              });
            }
          });
        });
        
        observer.observe({ entryTypes: ['measure', 'navigation', 'resource'] });
      } catch (error) {
        this.log('warn', 'DebugLogger', 'setupPerformanceObserver failed', { error: error.message });
      }
    }
  }

  // Main logging methods
  log(level: LogEntry['level'], component: string, action: string, data?: any) {
    const entry = this.createLogEntry(level, component, action, data);
    this.addLog(entry);
  }

  debug(component: string, action: string, data?: any) {
    this.log('debug', component, action, data);
  }

  info(component: string, action: string, data?: any) {
    this.log('info', component, action, data);
  }

  warn(component: string, action: string, data?: any) {
    this.log('warn', component, action, data);
  }

  error(component: string, action: string, data?: any) {
    this.log('error', component, action, data);
  }

  scan(component: string, action: string, data?: any) {
    this.log('scan', component, action, data);
  }

  ui(component: string, action: string, data?: any) {
    this.log('ui', component, action, data);
  }

  // Performance timing methods
  startTimer(timerName: string) {
    this.startTimes.set(timerName, performance.now());
    performance.mark(`soft-armor-${timerName}-start`);
    this.debug('Timer', `Started: ${timerName}`);
  }

  endTimer(timerName: string, component?: string, action?: string, data?: any) {
    const startTime = this.startTimes.get(timerName);
    if (startTime === undefined) {
      this.warn('Timer', `No start time found for: ${timerName}`);
      return 0;
    }

    const duration = performance.now() - startTime;
    this.startTimes.delete(timerName);
    
    performance.mark(`soft-armor-${timerName}-end`);
    performance.measure(`soft-armor-${timerName}`, 
      `soft-armor-${timerName}-start`, 
      `soft-armor-${timerName}-end`);

    const entry = this.createLogEntry(
      'performance',
      component || 'Timer',
      action || `Completed: ${timerName}`,
      data,
      duration
    );
    
    this.addLog(entry);
    return duration;
  }

  // Scan-specific logging
  scanStart(mediaUrl: string, scanType: string, config?: any) {
    const scanId = `scan-${Date.now()}`;
    this.startTimer(scanId);
    this.scan('Scanner', 'Scan Started', {
      scanId,
      mediaUrl,
      scanType,
      config
    });
    return scanId;
  }

  scanStep(scanId: string, step: string, data?: any) {
    this.scan('Scanner', `Step: ${step}`, {
      scanId,
      ...data
    });
  }

  scanComplete(scanId: string, result: any) {
    const duration = this.endTimer(scanId, 'Scanner', 'Scan Completed', {
      scanId,
      result
    });
    
    this.scan('Scanner', 'Scan Complete', {
      scanId,
      result,
      duration
    });
  }

  scanError(scanId: string, error: Error | string, context?: any) {
    this.endTimer(scanId);
    this.error('Scanner', 'Scan Failed', {
      scanId,
      error: typeof error === 'string' ? error : error.message,
      stack: typeof error === 'object' ? error.stack : undefined,
      context
    });
  }

  // UI event logging
  uiEvent(action: string, element?: HTMLElement, data?: any) {
    this.ui('UI', action, {
      element: element ? {
        tagName: element.tagName,
        className: element.className,
        id: element.id,
        dataset: element.dataset
      } : undefined,
      ...data
    });
  }

  // Network request logging
  networkRequest(url: string, method: string = 'GET', options?: any) {
    const requestId = `req-${Date.now()}`;
    this.startTimer(requestId);
    this.info('Network', `${method} Request Started`, {
      requestId,
      url,
      options
    });
    return requestId;
  }

  networkResponse(requestId: string, response: Response | any, data?: any) {
    const duration = this.endTimer(requestId);
    this.info('Network', 'Response Received', {
      requestId,
      status: response?.status,
      statusText: response?.statusText,
      headers: response?.headers ? Object.fromEntries(response.headers.entries()) : undefined,
      duration,
      ...data
    });
  }

  networkError(requestId: string, error: Error | string, context?: any) {
    this.endTimer(requestId);
    this.error('Network', 'Request Failed', {
      requestId,
      error: typeof error === 'string' ? error : error.message,
      context
    });
  }

  // Memory profiling
  logMemoryUsage(component: string, action: string) {
    if (!performance.memory) {
      this.warn('Memory', 'Performance.memory not available');
      return;
    }

    const memory = performance.memory;
    this.log('performance', component, action, {
      used: memory.usedJSHeapSize,
      total: memory.totalJSHeapSize,
      limit: memory.jsHeapSizeLimit,
      usedMB: (memory.usedJSHeapSize / 1024 / 1024).toFixed(2),
      totalMB: (memory.totalJSHeapSize / 1024 / 1024).toFixed(2)
    });
  }

  // Export/analysis methods
  exportLogs(format: 'json' | 'csv' | 'txt' = 'json'): string {
    switch (format) {
      case 'json':
        return JSON.stringify(this.logs, null, 2);
      
      case 'csv':
        const headers = 'timestamp,level,component,action,duration,memoryUsage,data\n';
        const rows = this.logs.map(log => [
          new Date(log.timestamp).toISOString(),
          log.level,
          log.component,
          log.action,
          log.duration || '',
          log.memoryUsage || '',
          log.data ? JSON.stringify(log.data).replace(/"/g, '""') : ''
        ].join(',')).join('\n');
        return headers + rows;
      
      case 'txt':
        return this.logs.map(log => {
          const timestamp = new Date(log.timestamp).toISOString();
          const duration = log.duration ? ` (${log.duration}ms)` : '';
          const memory = log.memoryUsage ? ` [${(log.memoryUsage / 1024 / 1024).toFixed(2)}MB]` : '';
          const data = log.data ? `\n  ${JSON.stringify(log.data, null, 2)}` : '';
          return `[${timestamp}] ${log.level.toUpperCase()} [${log.component}] ${log.action}${duration}${memory}${data}`;
        }).join('\n\n');
      
      default:
        return this.exportLogs('json');
    }
  }

  downloadLogs(format: 'json' | 'csv' | 'txt' = 'json') {
    const content = this.exportLogs(format);
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = `soft-armor-debug-${new Date().toISOString()}.${format}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    
    this.info('DebugLogger', 'Logs Downloaded', { format, count: this.logs.length });
  }

  getLogsSummary() {
    const summary = {
      total: this.logs.length,
      byLevel: {} as Record<string, number>,
      byComponent: {} as Record<string, number>,
      recentErrors: this.logs.filter(log => log.level === 'error').slice(-5),
      performanceIssues: this.logs.filter(log => 
        log.level === 'performance' && log.duration && log.duration > 1000
      ).slice(-5),
      memoryTrend: this.logs
        .filter(log => log.memoryUsage)
        .slice(-10)
        .map(log => ({
          timestamp: log.timestamp,
          memoryMB: ((log.memoryUsage || 0) / 1024 / 1024).toFixed(2)
        }))
    };

    this.logs.forEach(log => {
      summary.byLevel[log.level] = (summary.byLevel[log.level] || 0) + 1;
      summary.byComponent[log.component] = (summary.byComponent[log.component] || 0) + 1;
    });

    return summary;
  }

  clearLogs() {
    const count = this.logs.length;
    this.logs = [];
    this.startTimes.clear();
    this.info('DebugLogger', 'Logs Cleared', { previousCount: count });
  }
}

// Export singleton instance
export const debugLogger = DebugLogger.getInstance();

// Make available globally for console debugging
(window as any).softArmorDebug = debugLogger;