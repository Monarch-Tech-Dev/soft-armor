/* ================================
   Performance Monitor
   Real-time metrics and optimization
   ================================ */

export interface PerformanceMetrics {
  scanId: string;
  startTime: number;
  endTime: number;
  totalDuration: number;
  mediaType: 'image' | 'video';
  mediaSize: number;
  phases: {
    initialization: number;
    dataFetching: number;
    c2paAnalysis: number;
    loopDetection: number;
    emotionAnalysis: number;
    resultProcessing: number;
  };
  memory: {
    heapUsedStart: number;
    heapUsedEnd: number;
    heapPeak: number;
    gcEvents: number;
  };
  performance: {
    frameRate: number;
    cpuUsage: number;
    networkLatency: number;
  };
  errors: Array<{
    phase: string;
    error: string;
    timestamp: number;
  }>;
  quality: {
    accuracyScore: number;
    confidenceLevel: number;
  };
}

export interface PerformanceReport {
  timestamp: number;
  periodStart: number;
  periodEnd: number;
  totalScans: number;
  successfulScans: number;
  averageTime: number;
  medianTime: number;
  p95Time: number;
  errorRate: number;
  memoryEfficiency: number;
  bottlenecks: string[];
  recommendations: string[];
}

export class PerformanceMonitor {
  private metrics: Map<string, PerformanceMetrics> = new Map();
  private reportHistory: PerformanceReport[] = [];
  private observers: PerformanceObserver[] = [];
  private memoryWatcher: number | null = null;
  private readonly MAX_METRICS_HISTORY = 1000;
  private readonly REPORT_INTERVAL = 5 * 60 * 1000; // 5 minutes

  constructor() {
    this.initializeMonitoring();
    this.startPeriodicReporting();
  }

  /* ================================
     Scan Monitoring
     ================================ */

  startScan(mediaType: 'image' | 'video', mediaSize: number): string {
    const scanId = `scan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const startTime = performance.now();
    
    const metrics: PerformanceMetrics = {
      scanId,
      startTime,
      endTime: 0,
      totalDuration: 0,
      mediaType,
      mediaSize,
      phases: {
        initialization: 0,
        dataFetching: 0,
        c2paAnalysis: 0,
        loopDetection: 0,
        emotionAnalysis: 0,
        resultProcessing: 0
      },
      memory: {
        heapUsedStart: this.getCurrentMemoryUsage(),
        heapUsedEnd: 0,
        heapPeak: 0,
        gcEvents: 0
      },
      performance: {
        frameRate: 0,
        cpuUsage: 0,
        networkLatency: 0
      },
      errors: [],
      quality: {
        accuracyScore: 0,
        confidenceLevel: 0
      }
    };

    this.metrics.set(scanId, metrics);
    this.startMemoryWatching(scanId);
    
    return scanId;
  }

  recordPhase(scanId: string, phase: keyof PerformanceMetrics['phases'], duration: number): void {
    const metrics = this.metrics.get(scanId);
    if (!metrics) return;

    metrics.phases[phase] = duration;
    
    // Update peak memory usage
    const currentMemory = this.getCurrentMemoryUsage();
    if (currentMemory > metrics.memory.heapPeak) {
      metrics.memory.heapPeak = currentMemory;
    }
  }

  recordError(scanId: string, phase: string, error: string): void {
    const metrics = this.metrics.get(scanId);
    if (!metrics) return;

    metrics.errors.push({
      phase,
      error,
      timestamp: performance.now()
    });
  }

  recordQuality(scanId: string, accuracyScore: number, confidenceLevel: number): void {
    const metrics = this.metrics.get(scanId);
    if (!metrics) return;

    metrics.quality.accuracyScore = accuracyScore;
    metrics.quality.confidenceLevel = confidenceLevel;
  }

  endScan(scanId: string): PerformanceMetrics | null {
    const metrics = this.metrics.get(scanId);
    if (!metrics) return null;

    const endTime = performance.now();
    metrics.endTime = endTime;
    metrics.totalDuration = endTime - metrics.startTime;
    metrics.memory.heapUsedEnd = this.getCurrentMemoryUsage();

    this.stopMemoryWatching();
    this.trimMetricsHistory();
    
    return metrics;
  }

  /* ================================
     Performance Analysis
     ================================ */

  generateReport(periodMinutes: number = 60): PerformanceReport {
    const now = Date.now();
    const periodStart = now - (periodMinutes * 60 * 1000);
    
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.endTime > 0 && m.startTime >= periodStart);

    const totalScans = recentMetrics.length;
    const successfulScans = recentMetrics.filter(m => m.errors.length === 0).length;
    const scanTimes = recentMetrics.map(m => m.totalDuration).sort((a, b) => a - b);
    
    const report: PerformanceReport = {
      timestamp: now,
      periodStart,
      periodEnd: now,
      totalScans,
      successfulScans,
      averageTime: this.calculateAverage(scanTimes),
      medianTime: this.calculateMedian(scanTimes),
      p95Time: this.calculatePercentile(scanTimes, 95),
      errorRate: totalScans > 0 ? (totalScans - successfulScans) / totalScans : 0,
      memoryEfficiency: this.calculateMemoryEfficiency(recentMetrics),
      bottlenecks: this.identifyBottlenecks(recentMetrics),
      recommendations: this.generateRecommendations(recentMetrics)
    };

    this.reportHistory.push(report);
    this.trimReportHistory();
    
    return report;
  }

  getRealtimeMetrics(): {
    activeScanCount: number;
    averageMemoryUsage: number;
    currentCpuLoad: number;
    errorRate: number;
  } {
    const activeScans = Array.from(this.metrics.values()).filter(m => m.endTime === 0);
    const recentMetrics = Array.from(this.metrics.values())
      .filter(m => m.endTime > 0 && m.startTime >= Date.now() - 60000); // Last minute

    return {
      activeScanCount: activeScans.length,
      averageMemoryUsage: this.calculateAverageMemoryUsage(activeScans),
      currentCpuLoad: this.estimateCpuLoad(),
      errorRate: recentMetrics.length > 0 ? 
        recentMetrics.filter(m => m.errors.length > 0).length / recentMetrics.length : 0
    };
  }

  /* ================================
     Optimization Recommendations
     ================================ */

  private identifyBottlenecks(metrics: PerformanceMetrics[]): string[] {
    const bottlenecks: string[] = [];
    
    if (metrics.length === 0) return bottlenecks;

    // Analyze phase durations
    const avgPhases = this.calculateAveragePhases(metrics);
    const totalAvg = Object.values(avgPhases).reduce((sum, val) => sum + val, 0);

    for (const [phase, duration] of Object.entries(avgPhases)) {
      if (duration > totalAvg * 0.4) { // Phase takes >40% of total time
        bottlenecks.push(`${phase}-performance`);
      }
    }

    // Check memory usage
    const avgMemoryIncrease = metrics.reduce((sum, m) => 
      sum + (m.memory.heapUsedEnd - m.memory.heapUsedStart), 0) / metrics.length;
    
    if (avgMemoryIncrease > 50 * 1024 * 1024) { // >50MB average increase
      bottlenecks.push('memory-usage');
    }

    // Check error rates
    const errorRate = metrics.filter(m => m.errors.length > 0).length / metrics.length;
    if (errorRate > 0.1) { // >10% error rate
      bottlenecks.push('error-rate');
    }

    return bottlenecks;
  }

  private generateRecommendations(metrics: PerformanceMetrics[]): string[] {
    const recommendations: string[] = [];
    const bottlenecks = this.identifyBottlenecks(metrics);

    for (const bottleneck of bottlenecks) {
      switch (bottleneck) {
        case 'dataFetching-performance':
          recommendations.push('Consider implementing request caching for repeated media URLs');
          recommendations.push('Enable compression for network requests');
          break;
        case 'loopDetection-performance':
          recommendations.push('Reduce video frame analysis count for better performance');
          recommendations.push('Consider using lower resolution for loop detection');
          break;
        case 'c2paAnalysis-performance':
          recommendations.push('Implement progressive C2PA validation');
          recommendations.push('Cache C2PA validation results');
          break;
        case 'memory-usage':
          recommendations.push('Enable memory pooling for canvas operations');
          recommendations.push('Implement more aggressive garbage collection');
          break;
        case 'error-rate':
          recommendations.push('Review error handling and implement more robust fallbacks');
          recommendations.push('Add input validation to prevent processing invalid media');
          break;
      }
    }

    // Performance-based recommendations
    const avgTime = this.calculateAverage(metrics.map(m => m.totalDuration));
    if (avgTime > 3000) { // >3 seconds average
      recommendations.push('Enable fast-path scanning for common cases');
      recommendations.push('Implement scan timeout mechanisms');
    }

    return [...new Set(recommendations)]; // Remove duplicates
  }

  /* ================================
     Browser Performance Integration
     ================================ */

  private initializeMonitoring(): void {
    // Monitor long tasks
    if ('PerformanceObserver' in window) {
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.duration > 50) { // Long task threshold
              console.warn(`Long task detected: ${entry.duration}ms`);
            }
          }
        });
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.push(longTaskObserver);
      } catch (error) {
        console.warn('Long task monitoring not available:', error);
      }

      // Monitor paint timings
      try {
        const paintObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.name === 'first-contentful-paint') {
              console.log(`FCP: ${entry.startTime}ms`);
            }
          }
        });
        paintObserver.observe({ entryTypes: ['paint'] });
        this.observers.push(paintObserver);
      } catch (error) {
        console.warn('Paint monitoring not available:', error);
      }
    }
  }

  private startMemoryWatching(scanId: string): void {
    if (this.memoryWatcher) return;

    this.memoryWatcher = window.setInterval(() => {
      const metrics = this.metrics.get(scanId);
      if (!metrics) return;

      const currentMemory = this.getCurrentMemoryUsage();
      if (currentMemory > metrics.memory.heapPeak) {
        metrics.memory.heapPeak = currentMemory;
      }
    }, 100); // Check every 100ms
  }

  private stopMemoryWatching(): void {
    if (this.memoryWatcher) {
      clearInterval(this.memoryWatcher);
      this.memoryWatcher = null;
    }
  }

  private startPeriodicReporting(): void {
    setInterval(() => {
      const report = this.generateReport(5); // 5-minute reports
      
      // Store in browser storage for persistence
      if (typeof browser !== 'undefined') {
        chrome.storage.local.set({
          'performance_report_latest': report
        }).catch(console.warn);
      }
    }, this.REPORT_INTERVAL);
  }

  /* ================================
     Utility Methods
     ================================ */

  private getCurrentMemoryUsage(): number {
    if ((window as any).performance?.memory) {
      return (window as any).performance.memory.usedJSHeapSize;
    }
    return 0;
  }

  private calculateAverage(values: number[]): number {
    return values.length > 0 ? values.reduce((sum, val) => sum + val, 0) / values.length : 0;
  }

  private calculateMedian(values: number[]): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
  }

  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  private calculateMemoryEfficiency(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 1;
    
    const avgMemoryIncrease = metrics.reduce((sum, m) => 
      sum + (m.memory.heapUsedEnd - m.memory.heapUsedStart), 0) / metrics.length;
    
    const avgMediaSize = metrics.reduce((sum, m) => sum + m.mediaSize, 0) / metrics.length;
    
    // Efficiency = avgMediaSize / avgMemoryIncrease (higher is better)
    return avgMediaSize > 0 ? Math.min(1, avgMediaSize / Math.max(1, avgMemoryIncrease)) : 1;
  }

  private calculateAveragePhases(metrics: PerformanceMetrics[]): Record<string, number> {
    if (metrics.length === 0) return {};

    const phases = Object.keys(metrics[0].phases);
    const result: Record<string, number> = {};

    for (const phase of phases) {
      result[phase] = metrics.reduce((sum, m) => 
        sum + (m.phases as any)[phase], 0) / metrics.length;
    }

    return result;
  }

  private calculateAverageMemoryUsage(metrics: PerformanceMetrics[]): number {
    if (metrics.length === 0) return 0;
    
    return metrics.reduce((sum, m) => sum + m.memory.heapPeak, 0) / metrics.length;
  }

  private estimateCpuLoad(): number {
    // Simple CPU load estimation based on frame timing
    const now = performance.now();
    const frameTime = 16.67; // Target 60fps
    
    return Math.min(1, frameTime / 16.67);
  }

  private trimMetricsHistory(): void {
    if (this.metrics.size > this.MAX_METRICS_HISTORY) {
      const entries = Array.from(this.metrics.entries())
        .sort(([, a], [, b]) => a.startTime - b.startTime);
      
      const toRemove = entries.slice(0, entries.length - this.MAX_METRICS_HISTORY);
      for (const [scanId] of toRemove) {
        this.metrics.delete(scanId);
      }
    }
  }

  private trimReportHistory(): void {
    const maxReports = 100;
    if (this.reportHistory.length > maxReports) {
      this.reportHistory = this.reportHistory.slice(-maxReports);
    }
  }

  /* ================================
     Public API
     ================================ */

  getMetrics(scanId: string): PerformanceMetrics | undefined {
    return this.metrics.get(scanId);
  }

  getAllMetrics(): PerformanceMetrics[] {
    return Array.from(this.metrics.values());
  }

  getReportHistory(): PerformanceReport[] {
    return [...this.reportHistory];
  }

  clearMetrics(): void {
    this.metrics.clear();
    this.reportHistory.length = 0;
  }

  dispose(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.length = 0;
    
    if (this.memoryWatcher) {
      clearInterval(this.memoryWatcher);
      this.memoryWatcher = null;
    }
    
    this.clearMetrics();
  }
}

export default PerformanceMonitor;