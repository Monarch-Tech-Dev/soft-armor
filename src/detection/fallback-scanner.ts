import { C2PAResult, C2PAValidationStatus } from '../content/types';

export interface FallbackScanResult {
  hasMetadata: boolean;
  metadataType?: 'EXIF' | 'XMP' | 'IPTC' | 'JFIF' | 'PNG_TEXT' | 'UNKNOWN';
  confidence: number; // 0-1 scale
  findings: FallbackFinding[];
  recommendsC2PAUpgrade: boolean;
}

export interface FallbackFinding {
  type: 'metadata' | 'signature' | 'structure' | 'anomaly';
  description: string;
  confidence: number;
  evidence?: string;
}

export class FallbackScanner {
  private readonly METADATA_SIGNATURES = {
    EXIF: [0xFF, 0xE1],          // EXIF marker
    XMP: [0x3C, 0x78, 0x3A],     // XMP start "<x:"
    IPTC: [0x1C, 0x02],          // IPTC marker
    JFIF: [0xFF, 0xE0],          // JFIF marker
    PNG_TEXT: [0x74, 0x45, 0x58, 0x74], // tEXt chunk
    PHOTOSHOP: [0x38, 0x42, 0x49, 0x4D], // 8BIM (Photoshop)
  };

  private readonly SUSPICIOUS_PATTERNS = {
    AI_GENERATORS: [
      'midjourney', 'dalle', 'dall-e', 'stable diffusion', 'firefly',
      'nightcafe', 'artbreeder', 'runway', 'leonardo', 'playground'
    ],
    EDITING_SOFTWARE: [
      'adobe photoshop', 'gimp', 'canva', 'facetune', 'snapseed',
      'vsco', 'lightroom', 'aftereffects', 'premiere'
    ],
    DEEPFAKE_TOOLS: [
      'deepfacelab', 'faceswap', 'deepfakes', 'first order motion',
      'wav2lip', 'face2face', 'fsgan'
    ]
  };

  async scanFallback(mediaData: Uint8Array, mediaType: 'image' | 'video'): Promise<FallbackScanResult> {
    const result: FallbackScanResult = {
      hasMetadata: false,
      confidence: 0,
      findings: [],
      recommendsC2PAUpgrade: false
    };

    try {
      // Scan for various metadata types
      const metadataFindings = this.scanMetadata(mediaData);
      result.findings.push(...metadataFindings);

      // Look for editing signatures
      const editingFindings = this.scanEditingSignatures(mediaData);
      result.findings.push(...editingFindings);

      // Analyze file structure anomalies
      const structureFindings = this.scanStructuralAnomalies(mediaData, mediaType);
      result.findings.push(...structureFindings);

      // Check for AI generation indicators
      const aiFindings = this.scanAIIndicators(mediaData);
      result.findings.push(...aiFindings);

      // Calculate overall results
      result.hasMetadata = metadataFindings.length > 0;
      result.metadataType = this.determineMetadataType(metadataFindings);
      result.confidence = this.calculateOverallConfidence(result.findings);
      result.recommendsC2PAUpgrade = this.shouldRecommendC2PA(result.findings);

      return result;

    } catch (error) {
      console.warn('Fallback scanning failed:', error);
      return result;
    }
  }

  private scanMetadata(data: Uint8Array): FallbackFinding[] {
    const findings: FallbackFinding[] = [];

    // Check for EXIF data
    const exifOffset = this.findPattern(data, this.METADATA_SIGNATURES.EXIF);
    if (exifOffset !== -1) {
      const exifData = this.parseExifBasic(data, exifOffset);
      findings.push({
        type: 'metadata',
        description: `EXIF metadata found: ${exifData.camera || 'Unknown camera'}`,
        confidence: 0.9,
        evidence: exifData.software ? `Software: ${exifData.software}` : undefined
      });
    }

    // Check for XMP data
    const xmpOffset = this.findPattern(data, this.METADATA_SIGNATURES.XMP);
    if (xmpOffset !== -1) {
      const xmpData = this.parseXMPBasic(data, xmpOffset);
      findings.push({
        type: 'metadata',
        description: `XMP metadata found`,
        confidence: 0.8,
        evidence: xmpData.creator ? `Creator: ${xmpData.creator}` : undefined
      });
    }

    // Check for Photoshop signatures
    const photoshopOffset = this.findPattern(data, this.METADATA_SIGNATURES.PHOTOSHOP);
    if (photoshopOffset !== -1) {
      findings.push({
        type: 'metadata',
        description: 'Adobe Photoshop metadata detected',
        confidence: 0.8,
        evidence: 'Contains 8BIM resource blocks'
      });
    }

    return findings;
  }

  private scanEditingSignatures(data: Uint8Array): FallbackFinding[] {
    const findings: FallbackFinding[] = [];
    const dataString = new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 8192));
    const lowerDataString = dataString.toLowerCase();

    // Check for AI generation tools
    for (const aiTool of this.SUSPICIOUS_PATTERNS.AI_GENERATORS) {
      if (lowerDataString.includes(aiTool)) {
        findings.push({
          type: 'signature',
          description: `AI generation tool detected: ${aiTool}`,
          confidence: 0.95,
          evidence: 'Found in metadata strings'
        });
      }
    }

    // Check for editing software
    for (const software of this.SUSPICIOUS_PATTERNS.EDITING_SOFTWARE) {
      if (lowerDataString.includes(software)) {
        findings.push({
          type: 'signature',
          description: `Editing software detected: ${software}`,
          confidence: 0.7,
          evidence: 'Found in metadata strings'
        });
      }
    }

    // Check for deepfake tools
    for (const deepfakeTool of this.SUSPICIOUS_PATTERNS.DEEPFAKE_TOOLS) {
      if (lowerDataString.includes(deepfakeTool)) {
        findings.push({
          type: 'signature',
          description: `Deepfake tool signature: ${deepfakeTool}`,
          confidence: 0.9,
          evidence: 'Suspicious generation tool detected'
        });
      }
    }

    return findings;
  }

  private scanStructuralAnomalies(data: Uint8Array, mediaType: 'image' | 'video'): FallbackFinding[] {
    const findings: FallbackFinding[] = [];

    if (mediaType === 'image') {
      // Check for unusual JPEG structure
      if (this.isJPEG(data)) {
        const jpegAnomalies = this.analyzeJPEGStructure(data);
        findings.push(...jpegAnomalies);
      }

      // Check for PNG anomalies
      if (this.isPNG(data)) {
        const pngAnomalies = this.analyzePNGStructure(data);
        findings.push(...pngAnomalies);
      }
    } else if (mediaType === 'video') {
      // Check for MP4 anomalies
      if (this.isMP4(data)) {
        const mp4Anomalies = this.analyzeMP4Structure(data);
        findings.push(...mp4Anomalies);
      }
    }

    return findings;
  }

  private scanAIIndicators(data: Uint8Array): FallbackFinding[] {
    const findings: FallbackFinding[] = [];

    // Look for common AI generation artifacts in metadata
    const metadata = this.extractTextualMetadata(data);
    
    // Check for AI-typical metadata patterns
    if (metadata.includes('generated') || metadata.includes('synthesized')) {
      findings.push({
        type: 'anomaly',
        description: 'AI generation keywords in metadata',
        confidence: 0.8,
        evidence: 'Contains generation-related terms'
      });
    }

    // Check for missing camera metadata (suspicious for photos)
    if (!this.hasTypicalCameraMetadata(data)) {
      findings.push({
        type: 'anomaly',
        description: 'Missing typical camera metadata',
        confidence: 0.6,
        evidence: 'No camera make/model information found'
      });
    }

    // Check for perfect aspect ratios (common in AI)
    const dimensions = this.extractImageDimensions(data);
    if (dimensions && this.isPerfectAspectRatio(dimensions.width, dimensions.height)) {
      findings.push({
        type: 'anomaly',
        description: 'Perfect aspect ratio (AI-typical)',
        confidence: 0.5,
        evidence: `Dimensions: ${dimensions.width}x${dimensions.height}`
      });
    }

    return findings;
  }

  // Helper methods for pattern detection
  private findPattern(data: Uint8Array, pattern: number[]): number {
    for (let i = 0; i <= data.length - pattern.length; i++) {
      let found = true;
      for (let j = 0; j < pattern.length; j++) {
        if (data[i + j] !== pattern[j]) {
          found = false;
          break;
        }
      }
      if (found) return i;
    }
    return -1;
  }

  private parseExifBasic(data: Uint8Array, offset: number): { camera?: string; software?: string } {
    try {
      const exifString = new TextDecoder().decode(data.slice(offset, offset + 1000));
      return {
        camera: this.extractExifField(exifString, 'Make') || this.extractExifField(exifString, 'Model'),
        software: this.extractExifField(exifString, 'Software')
      };
    } catch {
      return {};
    }
  }

  private parseXMPBasic(data: Uint8Array, offset: number): { creator?: string } {
    try {
      const xmpString = new TextDecoder().decode(data.slice(offset, offset + 2000));
      const creatorMatch = xmpString.match(/dc:creator[^>]*>([^<]+)/i);
      return {
        creator: creatorMatch ? creatorMatch[1] : undefined
      };
    } catch {
      return {};
    }
  }

  private extractExifField(exifString: string, field: string): string | undefined {
    const regex = new RegExp(`${field}[\\x00\\s]*([^\\x00\\n\\r]+)`, 'i');
    const match = exifString.match(regex);
    return match ? match[1].trim() : undefined;
  }

  private isJPEG(data: Uint8Array): boolean {
    return data.length >= 2 && data[0] === 0xFF && data[1] === 0xD8;
  }

  private isPNG(data: Uint8Array): boolean {
    return data.length >= 8 && 
           data[0] === 0x89 && data[1] === 0x50 && 
           data[2] === 0x4E && data[3] === 0x47;
  }

  private isMP4(data: Uint8Array): boolean {
    return data.length >= 12 && 
           data[4] === 0x66 && data[5] === 0x74 && 
           data[6] === 0x79 && data[7] === 0x70;
  }

  private analyzeJPEGStructure(data: Uint8Array): FallbackFinding[] {
    const findings: FallbackFinding[] = [];
    
    // Check for unusual segment ordering
    let offset = 2; // Skip SOI marker
    let segmentCount = 0;
    
    while (offset < data.length - 1 && segmentCount < 50) {
      if (data[offset] !== 0xFF) break;
      
      const marker = data[offset + 1];
      if (marker === 0xDA) break; // Start of scan
      
      segmentCount++;
      
      // Check for unusual markers
      if (marker >= 0xE0 && marker <= 0xEF && segmentCount > 10) {
        findings.push({
          type: 'anomaly',
          description: 'Unusual JPEG segment structure',
          confidence: 0.4,
          evidence: `Excessive application segments (${segmentCount})`
        });
        break;
      }
      
      // Move to next segment
      const segmentLength = (data[offset + 2] << 8) | data[offset + 3];
      offset += segmentLength + 2;
    }
    
    return findings;
  }

  private analyzePNGStructure(data: Uint8Array): FallbackFinding[] {
    const findings: FallbackFinding[] = [];
    // Implement PNG structure analysis
    // Check for unusual chunk ordering, missing critical chunks, etc.
    return findings;
  }

  private analyzeMP4Structure(data: Uint8Array): FallbackFinding[] {
    const findings: FallbackFinding[] = [];
    // Implement MP4 structure analysis
    // Check for unusual atom ordering, missing atoms, etc.
    return findings;
  }

  private extractTextualMetadata(data: Uint8Array): string {
    try {
      return new TextDecoder('utf-8', { fatal: false }).decode(data.slice(0, 4096)).toLowerCase();
    } catch {
      return '';
    }
  }

  private hasTypicalCameraMetadata(data: Uint8Array): boolean {
    const metadata = this.extractTextualMetadata(data);
    const cameraIndicators = ['canon', 'nikon', 'sony', 'apple', 'samsung', 'make', 'model'];
    return cameraIndicators.some(indicator => metadata.includes(indicator));
  }

  private extractImageDimensions(data: Uint8Array): { width: number; height: number } | null {
    // Simple JPEG dimension extraction
    if (this.isJPEG(data)) {
      let offset = 2;
      while (offset < data.length - 8) {
        if (data[offset] === 0xFF && (data[offset + 1] === 0xC0 || data[offset + 1] === 0xC2)) {
          const height = (data[offset + 5] << 8) | data[offset + 6];
          const width = (data[offset + 7] << 8) | data[offset + 8];
          return { width, height };
        }
        offset++;
      }
    }
    
    return null;
  }

  private isPerfectAspectRatio(width: number, height: number): boolean {
    const ratio = width / height;
    const perfectRatios = [1.0, 1.5, 1.33, 1.78, 2.0]; // 1:1, 3:2, 4:3, 16:9, 2:1
    return perfectRatios.some(perfect => Math.abs(ratio - perfect) < 0.01);
  }

  private determineMetadataType(findings: FallbackFinding[]): 'EXIF' | 'XMP' | 'IPTC' | 'JFIF' | 'PNG_TEXT' | 'UNKNOWN' | undefined {
    const metadataFindings = findings.filter(f => f.type === 'metadata');
    if (metadataFindings.length === 0) return undefined;
    
    // Return the most confident metadata type
    const bestFinding = metadataFindings.reduce((best, current) => 
      current.confidence > best.confidence ? current : best
    );
    
    if (bestFinding.description.includes('EXIF')) return 'EXIF';
    if (bestFinding.description.includes('XMP')) return 'XMP';
    if (bestFinding.description.includes('IPTC')) return 'IPTC';
    if (bestFinding.description.includes('JFIF')) return 'JFIF';
    if (bestFinding.description.includes('PNG')) return 'PNG_TEXT';
    
    return 'UNKNOWN';
  }

  private calculateOverallConfidence(findings: FallbackFinding[]): number {
    if (findings.length === 0) return 0;
    
    // Weight findings by type and combine confidences
    const weights = { metadata: 0.4, signature: 0.3, structure: 0.2, anomaly: 0.1 };
    let totalWeight = 0;
    let weightedSum = 0;
    
    for (const finding of findings) {
      const weight = weights[finding.type] || 0.1;
      weightedSum += finding.confidence * weight;
      totalWeight += weight;
    }
    
    return totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0;
  }

  private shouldRecommendC2PA(findings: FallbackFinding[]): boolean {
    // Recommend C2PA if we found evidence of professional creation tools
    // or if the content appears to be from a trusted source
    return findings.some(finding => 
      finding.description.includes('Adobe') ||
      finding.description.includes('camera') ||
      (finding.type === 'metadata' && finding.confidence > 0.8)
    );
  }

  // Convert fallback results to C2PA format for consistent interface
  convertToC2PAResult(fallbackResult: FallbackScanResult): C2PAResult {
    const validationStatus: C2PAValidationStatus = fallbackResult.hasMetadata ? 'missing' : 'missing';
    
    return {
      isValid: false,
      validationStatus,
      errors: [],
      warnings: fallbackResult.findings
        .filter(f => f.type === 'anomaly' || f.type === 'signature')
        .map(f => f.description),
      signer: fallbackResult.findings
        .find(f => f.evidence?.includes('Creator:'))?.evidence?.replace('Creator: ', '') || undefined,
      softwareAgent: fallbackResult.findings
        .find(f => f.evidence?.includes('Software:'))?.evidence?.replace('Software: ', '') || undefined
    };
  }
}