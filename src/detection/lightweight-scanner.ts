/* ================================
   Lightweight Metadata-Only Scanner
   No Full File Downloads - Sub-Second Performance
   ================================ */

export interface LightweightScanResult {
  authenticity: 'safe' | 'warning' | 'danger';
  confidence: number; // 0-1
  scanTime: number;
  detectionMethods: string[];
  metadata: {
    fileSize?: number;
    mimeType?: string;
    hasC2PA: boolean;
    domain: string;
    url: string;
  };
}

export class LightweightScanner {
  private readonly TIMEOUT_MS = 3000; // 3 second max per scan
  private readonly SAMPLE_SIZE = 8192; // First 8KB only

  async scanMedia(mediaUrl: string): Promise<LightweightScanResult> {
    const startTime = performance.now();
    console.log('🚀 LightweightScanner: Starting metadata-only scan for:', mediaUrl);

    try {
      // Run all checks in parallel with timeout protection
      const [metadataResult, headerResult, urlResult] = await Promise.allSettled([
        this.withTimeout(this.getMetadata(mediaUrl), 1000),
        this.withTimeout(this.checkFileHeaders(mediaUrl), 2000),
        this.analyzeUrl(mediaUrl) // Instant, no network call
      ]);

      const scanTime = performance.now() - startTime;
      const detectionMethods: string[] = [];
      let suspicionScore = 0;
      let totalChecks = 0;

      // Process metadata check
      if (metadataResult.status === 'fulfilled') {
        detectionMethods.push('metadata');
        const metadata = metadataResult.value;
        
        if (!metadata.validMimeType) suspicionScore += 30;
        if (metadata.suspiciousSize) suspicionScore += 20;
        totalChecks += 2;
      }

      // Process header check  
      if (headerResult.status === 'fulfilled') {
        detectionMethods.push('headers');
        const headers = headerResult.value;
        
        if (headers.hasC2PA) {
          suspicionScore -= 20; // C2PA reduces suspicion
        } else {
          suspicionScore += 10; // Missing C2PA slightly suspicious
        }
        totalChecks += 1;
      }

      // Process URL analysis (always succeeds)
      if (urlResult.status === 'fulfilled') {
        detectionMethods.push('url-analysis');
        const urlAnalysis = urlResult.value;
        
        if (urlAnalysis.suspicious) suspicionScore += 40;
        else if (urlAnalysis.uncertain) suspicionScore += 20;
        totalChecks += 1;
      }

      // Calculate final result
      const maxPossibleScore = totalChecks * 40; // Worst case scenario
      const suspicionRatio = totalChecks > 0 ? suspicionScore / maxPossibleScore : 0.5;

      let authenticity: 'safe' | 'warning' | 'danger';
      let confidence: number;

      if (suspicionRatio > 0.6) {
        authenticity = 'danger';
        confidence = Math.min(0.95, 0.7 + (suspicionRatio - 0.6) * 0.625);
      } else if (suspicionRatio > 0.3) {
        authenticity = 'warning';
        confidence = Math.min(0.85, 0.5 + (suspicionRatio - 0.3) * 0.833);
      } else {
        authenticity = 'safe';
        confidence = Math.max(0.6, 0.9 - suspicionRatio * 1.5);
      }

      const result: LightweightScanResult = {
        authenticity,
        confidence,
        scanTime,
        detectionMethods,
        metadata: {
          fileSize: metadataResult.status === 'fulfilled' ? metadataResult.value.fileSize : undefined,
          mimeType: metadataResult.status === 'fulfilled' ? metadataResult.value.mimeType : undefined,
          hasC2PA: headerResult.status === 'fulfilled' ? headerResult.value.hasC2PA : false,
          domain: new URL(mediaUrl).hostname,
          url: mediaUrl
        }
      };

      console.log(`✅ LightweightScanner: Completed in ${scanTime.toFixed(0)}ms:`, result);
      return result;

    } catch (error) {
      const scanTime = performance.now() - startTime;
      console.error('❌ LightweightScanner: Failed:', error);
      
      // Return safe fallback result
      return {
        authenticity: 'warning',
        confidence: 0.3,
        scanTime,
        detectionMethods: ['error-fallback'],
        metadata: {
          hasC2PA: false,
          domain: new URL(mediaUrl).hostname,
          url: mediaUrl
        }
      };
    }
  }

  /* ================================
     Metadata-Only Checks (Fast)
     ================================ */

  private async getMetadata(mediaUrl: string): Promise<{
    fileSize?: number;
    mimeType?: string;
    validMimeType: boolean;
    suspiciousSize: boolean;
  }> {
    console.log('📋 Getting metadata via HEAD request...');
    
    try {
      const response = await fetch(mediaUrl, {
        method: 'HEAD',
        cache: 'force-cache'
      });

      const contentLength = response.headers.get('content-length');
      const contentType = response.headers.get('content-type');
      
      const fileSize = contentLength ? parseInt(contentLength) : undefined;
      const validMimeType = this.isValidMimeType(contentType);
      const suspiciousSize = this.isSuspiciousFileSize(fileSize);

      return {
        fileSize,
        mimeType: contentType || undefined,
        validMimeType,
        suspiciousSize
      };
    } catch (error) {
      console.warn('⚠️ HEAD request failed (CORS):', error);
      // Return fallback metadata analysis based on URL
      const urlBasedMimeType = this.getMimeTypeFromUrl(mediaUrl);
      return {
        validMimeType: true, // Assume valid to avoid false positives
        suspiciousSize: false, // Can't determine, assume OK
        mimeType: urlBasedMimeType
      };
    }
  }

  /* ================================
     Partial File Header Checks
     ================================ */

  private async checkFileHeaders(mediaUrl: string): Promise<{
    hasC2PA: boolean;
    fileSignature?: string;
  }> {
    console.log('🔍 Checking file headers (first 8KB only)...');
    
    try {
      const response = await fetch(mediaUrl, {
        headers: {
          'Range': `bytes=0-${this.SAMPLE_SIZE - 1}`
        },
        cache: 'force-cache'
      });

      const arrayBuffer = await response.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      
      const hasC2PA = this.detectC2PASignature(bytes);
      const fileSignature = this.getFileSignature(bytes);

      return {
        hasC2PA,
        fileSignature
      };
    } catch (error) {
      console.warn('Header check failed (CORS/network):', error.message);
      return { hasC2PA: false };
    }
  }

  /* ================================
     Helper Methods
     ================================ */

  private getMimeTypeFromUrl(url: string): string | undefined {
    const extension = url.split('.').pop()?.toLowerCase();
    const mimeMap: Record<string, string> = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg', 
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp4': 'video/mp4',
      'webm': 'video/webm',
      'mov': 'video/quicktime',
      'avi': 'video/x-msvideo'
    };
    return extension ? mimeMap[extension] : undefined;
  }

  /* ================================
     Instant URL Analysis
     ================================ */

  private analyzeUrl(mediaUrl: string): {
    suspicious: boolean;
    uncertain: boolean;
    domain: string;
  } {
    console.log('🌐 Analyzing URL patterns...');
    
    const url = mediaUrl.toLowerCase();
    const domain = new URL(mediaUrl).hostname.toLowerCase();

    // Suspicious patterns
    const suspiciousPatterns = [
      'temp', 'tmp', 'random', 'fake', 'generated', 'ai-', 'synthetic',
      'bit.ly', 'tinyurl', 'tempimg', 'fakeimg'
    ];

    // Uncertain patterns  
    const uncertainPatterns = [
      'unsplash', 'picsum', 'placeholder', 'via.placeholder',
      'amazonaws.com/temp', 'cloudinary'
    ];

    const suspicious = suspiciousPatterns.some(pattern => 
      url.includes(pattern) || domain.includes(pattern)
    );

    const uncertain = uncertainPatterns.some(pattern => 
      url.includes(pattern) || domain.includes(pattern)
    );

    return { suspicious, uncertain, domain };
  }

  /* ================================
     Binary Detection Utilities
     ================================ */

  private detectC2PASignature(bytes: Uint8Array): boolean {
    // Look for C2PA markers in JPEG/other formats
    const c2paMarkers = [
      [0xFF, 0xE2], // JPEG APP2 marker
      [0x43, 0x32, 0x50, 0x41], // "C2PA" ASCII
      [0x63, 0x32, 0x70, 0x61]  // "c2pa" ASCII
    ];

    for (const marker of c2paMarkers) {
      if (this.findBytes(bytes, marker)) {
        console.log('🛡️ C2PA signature detected');
        return true;
      }
    }

    return false;
  }

  private getFileSignature(bytes: Uint8Array): string {
    if (bytes.length < 8) return 'unknown';
    
    const header = Array.from(bytes.slice(0, 8))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');

    // Common file signatures
    if (header.startsWith('ffd8ff')) return 'jpeg';
    if (header.startsWith('89504e47')) return 'png';
    if (header.startsWith('47494638')) return 'gif';
    if (header.startsWith('52494646')) return 'webp';
    if (header.includes('66747970')) return 'mp4';
    if (header.startsWith('1a45dfa3')) return 'webm';

    return 'unknown';
  }

  private findBytes(haystack: Uint8Array, needle: number[]): boolean {
    for (let i = 0; i <= haystack.length - needle.length; i++) {
      let found = true;
      for (let j = 0; j < needle.length; j++) {
        if (haystack[i + j] !== needle[j]) {
          found = false;
          break;
        }
      }
      if (found) return true;
    }
    return false;
  }

  /* ================================
     Validation Utilities
     ================================ */

  private isValidMimeType(contentType: string | null): boolean {
    if (!contentType) return false;
    return contentType.startsWith('image/') || contentType.startsWith('video/');
  }

  private isSuspiciousFileSize(fileSize?: number): boolean {
    if (!fileSize) return false;
    
    // Files smaller than 1KB or larger than 500MB are suspicious
    return fileSize < 1000 || fileSize > 500 * 1024 * 1024;
  }

  /* ================================
     Timeout Protection
     ================================ */

  private async withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) => 
        setTimeout(() => reject(new Error(`Timeout after ${timeoutMs}ms`)), timeoutMs)
      )
    ]);
  }
}