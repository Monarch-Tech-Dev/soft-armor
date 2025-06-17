import { createC2pa } from 'c2pa';
import init, { scan_array_buffer } from '@contentauth/detector';
import { 
  C2PAResult, 
  C2PAManifest, 
  C2PAValidationStatus, 
  C2PACertificate,
  C2PAProducer,
  C2PAAssertion,
  C2PAIngredient,
  C2PASignature
} from '../content/types';
import { FallbackScanner } from './fallback-scanner';

export class C2PAProbe {
  private c2pa: any = null;
  private fallbackScanner: FallbackScanner;
  private trustedIssuers: Set<string> = new Set([
    'Adobe Systems Incorporated',
    'Canon Inc.',
    'Leica Camera AG',
    'Sony Corporation',
    'Microsoft Corporation'
  ]);

  constructor() {
    this.fallbackScanner = new FallbackScanner();
    this.initializeC2PA();
  }

  private async initializeC2PA(): Promise<void> {
    try {
      // Try to initialize with toolkit first
      this.c2pa = await createC2pa({
        wasmSrc: '/node_modules/@contentauth/toolkit/dist/c2pa.wasm',
        workerSrc: '/node_modules/@contentauth/toolkit/dist/c2pa.worker.js'
      });
      
      console.log('✅ C2PA SDK initialized successfully');
    } catch (error) {
      console.warn('⚠️ Failed to initialize C2PA SDK:', error);
      
      // Try fallback initialization
      try {
        this.c2pa = await createC2pa();
        console.log('✅ C2PA SDK initialized with default config');
      } catch (fallbackError) {
        console.error('❌ C2PA SDK initialization completely failed:', fallbackError);
        this.c2pa = null;
      }
    }
  }

  async check(mediaData: Uint8Array, mediaType: 'image' | 'video' = 'image'): Promise<C2PAResult> {
    // First attempt: Try full C2PA validation
    const c2paResult = await this.checkC2PA(mediaData);
    
    // If C2PA validation fails or finds no data, run fallback analysis
    if (c2paResult.validationStatus === 'missing' || c2paResult.validationStatus === 'error') {
      const fallbackResult = await this.fallbackScanner.scanFallback(mediaData, mediaType);
      const enhancedResult = this.enhanceWithFallbackData(c2paResult, fallbackResult);
      return enhancedResult;
    }
    
    return c2paResult;
  }

  private async checkC2PA(mediaData: Uint8Array): Promise<C2PAResult> {
    const result: C2PAResult = {
      isValid: false,
      validationStatus: 'missing',
      errors: [],
      warnings: []
    };

    try {
      // First, do a quick check for C2PA indicators
      const hasC2PAIndicators = await this.hasC2PAData(mediaData);
      if (!hasC2PAIndicators) {
        result.validationStatus = 'missing';
        return result;
      }

      // Initialize C2PA if not ready
      if (!this.c2pa) {
        await this.initializeC2PA();
      }

      if (!this.c2pa) {
        result.validationStatus = 'error';
        result.errors?.push('C2PA library not available');
        return result;
      }

      // Attempt to read C2PA data with timeout and error recovery
      const readResult = await this.safeC2PARead(mediaData);
      
      if (!readResult.success) {
        result.validationStatus = readResult.hasData ? 'invalid' : 'missing';
        if (readResult.error) {
          result.errors?.push(readResult.error);
        }
        return result;
      }

      const { manifest, manifestStore, validationStatus } = readResult.data;

      if (!manifest) {
        result.validationStatus = 'missing';
        return result;
      }

      // Parse and validate manifest with error recovery
      const parsedManifest = this.parseManifestSafely(manifest);
      const certificateChain = await this.extractCertificateChainSafely(readResult.data);
      const validationResult = await this.validateManifest(parsedManifest, certificateChain, validationStatus);

      // Calculate confidence score and trust level
      const confidenceData = this.calculateConfidenceScore(validationResult, certificateChain, parsedManifest);
      
      // Build comprehensive result
      result.isValid = validationResult.status === 'valid';
      result.validationStatus = validationResult.status;
      result.manifest = parsedManifest;
      result.certificateChain = certificateChain;
      result.errors = validationResult.errors;
      result.warnings = validationResult.warnings;
      result.signer = this.extractSigner(parsedManifest, certificateChain);
      result.signedTimestamp = parsedManifest.timestamp;
      result.softwareAgent = parsedManifest.claimGenerator;
      result.confidenceScore = confidenceData.score;
      result.trustLevel = confidenceData.trustLevel;

      return result;

    } catch (error) {
      console.warn('C2PA validation failed:', error);
      return this.handleCriticalError(error, result);
    }
  }

  private enhanceWithFallbackData(c2paResult: C2PAResult, fallbackResult: any): C2PAResult {
    const enhanced = { ...c2paResult };

    // Add fallback findings as warnings
    if (fallbackResult.findings && fallbackResult.findings.length > 0) {
      enhanced.warnings = enhanced.warnings || [];
      
      // Add metadata findings
      const metadataFindings = fallbackResult.findings.filter((f: any) => f.type === 'metadata');
      if (metadataFindings.length > 0) {
        enhanced.warnings.push(`Alternative metadata found: ${fallbackResult.metadataType || 'Unknown type'}`);
      }

      // Add suspicious signatures as warnings or errors
      const suspiciousFindings = fallbackResult.findings.filter((f: any) => 
        f.type === 'signature' && (f.description.includes('AI') || f.description.includes('deepfake'))
      );
      
      if (suspiciousFindings.length > 0) {
        enhanced.errors = enhanced.errors || [];
        enhanced.errors.push(...suspiciousFindings.map((f: any) => f.description));
        
        // Upgrade validation status if we found AI signatures
        if (enhanced.validationStatus === 'missing') {
          enhanced.validationStatus = 'invalid';
        }
      }

      // Extract software agent from fallback if not found in C2PA
      if (!enhanced.softwareAgent && fallbackResult.findings) {
        const softwareFinding = fallbackResult.findings.find((f: any) => 
          f.evidence && f.evidence.includes('Software:')
        );
        if (softwareFinding) {
          enhanced.softwareAgent = softwareFinding.evidence.replace('Software: ', '');
        }
      }

      // Extract signer from fallback if not found in C2PA
      if (!enhanced.signer && fallbackResult.findings) {
        const creatorFinding = fallbackResult.findings.find((f: any) => 
          f.evidence && f.evidence.includes('Creator:')
        );
        if (creatorFinding) {
          enhanced.signer = creatorFinding.evidence.replace('Creator: ', '');
        }
      }
    }

    // Add C2PA upgrade recommendation
    if (fallbackResult.recommendsC2PAUpgrade) {
      enhanced.warnings = enhanced.warnings || [];
      enhanced.warnings.push('Content appears professional - consider C2PA signing for authenticity');
    }

    return enhanced;
  }

  private async safeC2PARead(mediaData: Uint8Array): Promise<{
    success: boolean;
    data?: any;
    error?: string;
    hasData?: boolean;
  }> {
    try {
      // Set a timeout for the read operation
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('C2PA read timeout')), 10000);
      });

      const readPromise = this.c2pa.read(mediaData.buffer);
      const readResult = await Promise.race([readPromise, timeoutPromise]);

      if (!readResult) {
        return { success: false, hasData: false };
      }

      return { success: true, data: readResult };

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      
      // Detect specific error types
      if (errorMessage.includes('timeout')) {
        return { 
          success: false, 
          hasData: true, 
          error: 'C2PA data present but read operation timed out' 
        };
      }
      
      if (errorMessage.includes('corrupt') || errorMessage.includes('invalid format')) {
        return { 
          success: false, 
          hasData: true, 
          error: 'Corrupted C2PA manifest detected' 
        };
      }

      if (errorMessage.includes('signature')) {
        return { 
          success: false, 
          hasData: true, 
          error: 'Invalid or corrupted signature' 
        };
      }

      return { 
        success: false, 
        hasData: true, 
        error: `C2PA read error: ${errorMessage}` 
      };
    }
  }

  private parseManifestSafely(rawManifest: any): C2PAManifest {
    const manifest: C2PAManifest = {};

    try {
      // Safe extraction with fallbacks
      manifest.claimGenerator = this.safeExtract(rawManifest, ['claim_generator', 'claimGenerator']);
      manifest.title = this.safeExtract(rawManifest, ['title']);
      manifest.format = this.safeExtract(rawManifest, ['format']);
      manifest.instanceId = this.safeExtract(rawManifest, ['instance_id', 'instanceId']);
      manifest.timestamp = this.safeExtract(rawManifest, ['timestamp', 'claim_timestamp']);

      // Parse producer information safely
      const producerData = this.safeExtract(rawManifest, ['producer', 'claim_generator_info']);
      if (producerData && typeof producerData === 'object') {
        manifest.producer = {
          name: this.safeExtract(producerData, ['name']),
          identifier: this.safeExtract(producerData, ['identifier']),
          credential: this.safeExtractArray(producerData, ['credential'])
        };
      }

      // Parse assertions safely
      const assertions = this.safeExtractArray(rawManifest, ['assertions']);
      if (assertions) {
        manifest.assertions = assertions.map((assertion: any) => {
          if (typeof assertion !== 'object') return { label: 'unknown' };
          return {
            label: this.safeExtract(assertion, ['label']) || 'unknown',
            data: assertion.data,
            hash: this.safeExtract(assertion, ['hash'])
          };
        });
      }

      // Parse ingredients safely
      const ingredients = this.safeExtractArray(rawManifest, ['ingredients']);
      if (ingredients) {
        manifest.ingredients = ingredients.map((ingredient: any) => {
          if (typeof ingredient !== 'object') return {};
          return {
            title: this.safeExtract(ingredient, ['title']),
            format: this.safeExtract(ingredient, ['format']),
            documentId: this.safeExtract(ingredient, ['document_id', 'documentId']),
            instanceId: this.safeExtract(ingredient, ['instance_id', 'instanceId']),
            relationship: this.safeExtract(ingredient, ['relationship']),
            hash: this.safeExtract(ingredient, ['hash'])
          };
        });
      }

      // Parse signature information safely
      const sigData = this.safeExtract(rawManifest, ['signature_info', 'signature']);
      if (sigData && typeof sigData === 'object') {
        manifest.signature = {
          algorithm: this.safeExtract(sigData, ['algorithm']),
          certificate: this.safeExtract(sigData, ['certificate']),
          signatureValue: this.safeExtract(sigData, ['signature_value', 'signatureValue']),
          timestampInfo: this.parseTimestampSafely(sigData)
        };
      }

    } catch (error) {
      console.warn('Error parsing manifest safely:', error);
    }

    return manifest;
  }

  private safeExtract(obj: any, keys: string[]): any {
    if (!obj || typeof obj !== 'object') return undefined;
    
    for (const key of keys) {
      if (obj[key] !== undefined && obj[key] !== null) {
        return obj[key];
      }
    }
    return undefined;
  }

  private safeExtractArray(obj: any, keys: string[]): any[] | undefined {
    const value = this.safeExtract(obj, keys);
    return Array.isArray(value) ? value : undefined;
  }

  private parseTimestampSafely(sigData: any): { genTime?: string; timestampAuthority?: string } | undefined {
    const timestampInfo = this.safeExtract(sigData, ['timestamp_info', 'timestampInfo']);
    if (!timestampInfo || typeof timestampInfo !== 'object') return undefined;

    return {
      genTime: this.safeExtract(timestampInfo, ['gen_time', 'genTime']),
      timestampAuthority: this.safeExtract(timestampInfo, ['timestamp_authority', 'timestampAuthority'])
    };
  }

  private async extractCertificateChainSafely(readResult: any): Promise<C2PACertificate[]> {
    const certificates: C2PACertificate[] = [];

    try {
      const certChain = this.safeExtractArray(readResult, ['certificateChain', 'certificate_chain', 'certificates']);
      
      if (certChain) {
        for (const cert of certChain) {
          try {
            const parsedCert = await this.parseCertificateSafely(cert);
            certificates.push(parsedCert);
          } catch (error) {
            console.warn('Failed to parse individual certificate:', error);
            // Add a placeholder for the failed certificate
            certificates.push({
              subject: 'Certificate parsing failed',
              isValid: false,
              isTrusted: false,
              purpose: []
            });
          }
        }
      }
    } catch (error) {
      console.warn('Failed to extract certificate chain safely:', error);
    }

    return certificates;
  }

  private async parseCertificateSafely(certData: any): Promise<C2PACertificate> {
    const certificate: C2PACertificate = {
      purpose: []
    };

    try {
      certificate.subject = this.safeExtract(certData, ['subject']);
      certificate.issuer = this.safeExtract(certData, ['issuer']);
      certificate.serialNumber = this.safeExtract(certData, ['serial_number', 'serialNumber']);
      certificate.validFrom = this.safeExtract(certData, ['valid_from', 'validFrom', 'notBefore']);
      certificate.validTo = this.safeExtract(certData, ['valid_to', 'validTo', 'notAfter']);
      certificate.purpose = this.safeExtractArray(certData, ['purpose', 'keyUsage']) || [];

      // Validate certificate dates safely
      certificate.isValid = this.validateCertificateDates(certificate.validFrom, certificate.validTo);

      // Check if issuer is trusted
      certificate.isTrusted = this.isTrustedIssuer(certificate.issuer);

      // Special handling for self-signed certificates
      if (certificate.subject === certificate.issuer) {
        certificate.isTrusted = false; // Self-signed is never trusted
      }

    } catch (error) {
      console.warn('Error parsing certificate safely:', error);
      certificate.isValid = false;
      certificate.isTrusted = false;
    }

    return certificate;
  }

  private validateCertificateDates(validFrom?: string, validTo?: string): boolean {
    try {
      if (!validFrom || !validTo) return false;

      const now = new Date();
      const fromDate = new Date(validFrom);
      const toDate = new Date(validTo);

      // Check if dates are valid
      if (isNaN(fromDate.getTime()) || isNaN(toDate.getTime())) {
        return false;
      }

      return fromDate <= now && now <= toDate;
    } catch (error) {
      return false;
    }
  }

  private handleCriticalError(error: any, result: C2PAResult): C2PAResult {
    const errorMessage = error instanceof Error ? error.message : 'Unknown critical error';
    
    // Categorize critical errors
    if (errorMessage.includes('memory') || errorMessage.includes('allocation')) {
      result.validationStatus = 'error';
      result.errors?.push('Insufficient memory for C2PA processing');
    } else if (errorMessage.includes('wasm') || errorMessage.includes('module')) {
      result.validationStatus = 'error';
      result.errors?.push('C2PA WebAssembly module failed to load');
    } else if (errorMessage.includes('network') || errorMessage.includes('fetch')) {
      result.validationStatus = 'error';
      result.errors?.push('Network error during C2PA validation');
    } else {
      result.validationStatus = 'error';
      result.errors?.push(`Critical C2PA error: ${errorMessage}`);
    }

    return result;
  }

  private parseManifest(rawManifest: any): C2PAManifest {
    const manifest: C2PAManifest = {
      claimGenerator: rawManifest.claim_generator || rawManifest.claimGenerator,
      title: rawManifest.title,
      format: rawManifest.format,
      instanceId: rawManifest.instance_id || rawManifest.instanceId,
      timestamp: rawManifest.timestamp || rawManifest.claim_timestamp,
    };

    // Parse producer information
    if (rawManifest.producer || rawManifest.claim_generator_info) {
      const producerData = rawManifest.producer || rawManifest.claim_generator_info;
      manifest.producer = {
        name: producerData.name,
        identifier: producerData.identifier,
        credential: Array.isArray(producerData.credential) ? producerData.credential : []
      };
    }

    // Parse assertions
    if (rawManifest.assertions && Array.isArray(rawManifest.assertions)) {
      manifest.assertions = rawManifest.assertions.map((assertion: any) => ({
        label: assertion.label,
        data: assertion.data,
        hash: assertion.hash
      }));
    }

    // Parse ingredients (parent/source content)
    if (rawManifest.ingredients && Array.isArray(rawManifest.ingredients)) {
      manifest.ingredients = rawManifest.ingredients.map((ingredient: any) => ({
        title: ingredient.title,
        format: ingredient.format,
        documentId: ingredient.document_id || ingredient.documentId,
        instanceId: ingredient.instance_id || ingredient.instanceId,
        relationship: ingredient.relationship,
        hash: ingredient.hash
      }));
    }

    // Parse signature information
    if (rawManifest.signature_info || rawManifest.signature) {
      const sigData = rawManifest.signature_info || rawManifest.signature;
      manifest.signature = {
        algorithm: sigData.algorithm,
        certificate: sigData.certificate,
        signatureValue: sigData.signature_value || sigData.signatureValue,
        timestampInfo: sigData.timestamp_info ? {
          genTime: sigData.timestamp_info.gen_time || sigData.timestamp_info.genTime,
          timestampAuthority: sigData.timestamp_info.timestamp_authority || sigData.timestamp_info.timestampAuthority
        } : undefined
      };
    }

    return manifest;
  }

  private async extractCertificateChain(readResult: any): Promise<C2PACertificate[]> {
    const certificates: C2PACertificate[] = [];

    try {
      if (readResult.certificateChain && Array.isArray(readResult.certificateChain)) {
        for (const cert of readResult.certificateChain) {
          const parsedCert = await this.parseCertificate(cert);
          certificates.push(parsedCert);
        }
      }
    } catch (error) {
      console.warn('Failed to extract certificate chain:', error);
    }

    return certificates;
  }

  private async parseCertificate(certData: any): Promise<C2PACertificate> {
    const certificate: C2PACertificate = {
      subject: certData.subject,
      issuer: certData.issuer,
      serialNumber: certData.serial_number || certData.serialNumber,
      validFrom: certData.valid_from || certData.validFrom,
      validTo: certData.valid_to || certData.validTo,
      purpose: Array.isArray(certData.purpose) ? certData.purpose : []
    };

    // Validate certificate dates
    const now = new Date();
    const validFrom = certificate.validFrom ? new Date(certificate.validFrom) : null;
    const validTo = certificate.validTo ? new Date(certificate.validTo) : null;

    certificate.isValid = validFrom && validTo && 
                         validFrom <= now && 
                         now <= validTo;

    // Check if issuer is trusted
    certificate.isTrusted = this.isTrustedIssuer(certificate.issuer);

    return certificate;
  }

  private async validateManifest(
    manifest: C2PAManifest, 
    certificates: C2PACertificate[], 
    sdkValidationStatus?: any
  ): Promise<{ status: C2PAValidationStatus; errors: string[]; warnings: string[] }> {
    
    const errors: string[] = [];
    const warnings: string[] = [];

    // Check basic manifest structure
    if (!manifest.claimGenerator) {
      errors.push('Missing claim generator information');
    }

    if (!manifest.timestamp) {
      warnings.push('No timestamp found in manifest');
    } else {
      // Validate timestamp is reasonable
      const manifestTime = new Date(manifest.timestamp);
      const now = new Date();
      const oneYearAgo = new Date(now.getTime() - 365 * 24 * 60 * 60 * 1000);
      const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

      if (manifestTime < oneYearAgo) {
        warnings.push('Manifest timestamp is over a year old');
      } else if (manifestTime > tomorrow) {
        errors.push('Manifest timestamp is in the future');
      }
    }

    // Validate certificate chain with enhanced checks
    if (!certificates || certificates.length === 0) {
      errors.push('No certificate chain found');
    } else {
      const invalidCerts = certificates.filter(cert => !cert.isValid);
      const untrustedCerts = certificates.filter(cert => !cert.isTrusted);
      const expiredCerts = certificates.filter(cert => {
        if (!cert.validTo) return false;
        return new Date(cert.validTo) < new Date();
      });

      if (invalidCerts.length > 0) {
        errors.push(`Invalid certificates: ${invalidCerts.map(c => c.subject || 'Unknown').join(', ')}`);
      }

      if (expiredCerts.length > 0) {
        errors.push(`Expired certificates: ${expiredCerts.map(c => c.subject || 'Unknown').join(', ')}`);
      }

      if (untrustedCerts.length > 0) {
        warnings.push(`Untrusted certificate issuers: ${untrustedCerts.map(c => c.issuer || 'Unknown').join(', ')}`);
      }

      // Check for self-signed certificates
      const selfSignedCerts = certificates.filter(cert => cert.subject === cert.issuer);
      if (selfSignedCerts.length > 0) {
        warnings.push('Self-signed certificates detected - authenticity cannot be verified');
      }
    }

    // Enhanced SDK validation status handling
    if (sdkValidationStatus) {
      if (Array.isArray(sdkValidationStatus)) {
        const failures = sdkValidationStatus.filter((status: any) => status.code !== 'success' && status.code !== 'valid');
        if (failures.length > 0) {
          failures.forEach((f: any) => {
            const message = f.explanation || f.message || f.description || 'Signature validation failed';
            
            // Categorize by severity
            if (f.code === 'signature.invalid' || f.code === 'manifest.corrupted') {
              errors.push(message);
            } else if (f.code === 'certificate.untrusted' || f.code === 'timestamp.old') {
              warnings.push(message);
            } else {
              errors.push(message);
            }
          });
        }
      } else if (sdkValidationStatus.code && sdkValidationStatus.code !== 'success') {
        errors.push(sdkValidationStatus.explanation || sdkValidationStatus.message || 'Validation failed');
      }
    }

    // Check for required assertions
    if (manifest.assertions && manifest.assertions.length > 0) {
      const hasActionAssertion = manifest.assertions.some(a => a.label?.includes('action') || a.label?.includes('stds.schema-org.CreativeWork'));
      if (!hasActionAssertion) {
        warnings.push('No action assertions found - provenance may be incomplete');
      }
    } else {
      warnings.push('No assertions found in manifest');
    }

    // Validate signature information
    if (manifest.signature) {
      if (!manifest.signature.algorithm) {
        errors.push('Missing signature algorithm information');
      } else if (!['ES256', 'ES384', 'ES512', 'PS256', 'PS384', 'PS512'].includes(manifest.signature.algorithm)) {
        warnings.push(`Uncommon signature algorithm: ${manifest.signature.algorithm}`);
      }

      if (!manifest.signature.signatureValue) {
        errors.push('Missing signature value');
      }
    } else {
      errors.push('No signature information found');
    }

    // Determine overall validation status with more nuanced logic
    let status: C2PAValidationStatus;
    
    if (errors.length > 0) {
      // Check if errors are critical or just formal issues
      const criticalErrors = errors.filter(e => 
        e.includes('signature') || 
        e.includes('corrupted') || 
        e.includes('invalid') ||
        e.includes('future')
      );
      
      if (criticalErrors.length > 0) {
        status = 'invalid';
      } else {
        // Non-critical errors might still allow valid-untrusted status
        status = 'valid-untrusted';
      }
    } else if (warnings.some(w => w.includes('Untrusted') || w.includes('self-signed'))) {
      status = 'valid-untrusted';
    } else if (warnings.length > 0) {
      // Valid but with minor issues
      status = 'valid';
    } else {
      status = 'valid';
    }

    return { status, errors, warnings };
  }

  private extractSigner(manifest: C2PAManifest, certificates: C2PACertificate[]): string {
    // Try to get signer from certificate chain
    if (certificates.length > 0) {
      const signingCert = certificates[0]; // First cert is usually the signing cert
      if (signingCert.subject) {
        // Extract common name from subject
        const cnMatch = signingCert.subject.match(/CN=([^,]+)/);
        if (cnMatch) {
          return cnMatch[1];
        }
        return signingCert.subject;
      }
    }

    // Fallback to manifest data
    return manifest.producer?.name || 
           manifest.claimGenerator || 
           'Unknown Signer';
  }

  private isTrustedIssuer(issuer?: string): boolean {
    if (!issuer) return false;
    
    return Array.from(this.trustedIssuers).some(trusted => 
      issuer.includes(trusted)
    );
  }

  private calculateConfidenceScore(
    validationResult: { status: C2PAValidationStatus; errors: string[]; warnings: string[] },
    certificateChain: C2PACertificate[],
    manifest: C2PAManifest
  ): { score: number; trustLevel: 'high' | 'medium' | 'low' } {
    let score = 0;
    let factors = 0;

    // Base score based on validation status (40% weight)
    switch (validationResult.status) {
      case 'valid':
        score += 40;
        break;
      case 'valid-untrusted':
        score += 25;
        break;
      case 'invalid':
        score += 5;
        break;
      case 'missing':
        score += 0;
        break;
      case 'error':
        score += 0;
        break;
    }
    factors += 40;

    // Certificate chain quality (25% weight)
    if (certificateChain && certificateChain.length > 0) {
      const validCerts = certificateChain.filter(cert => cert.isValid);
      const trustedCerts = certificateChain.filter(cert => cert.isTrusted);
      const unexpiredCerts = certificateChain.filter(cert => {
        if (!cert.validTo) return true;
        return new Date(cert.validTo) > new Date();
      });

      let certScore = 0;
      if (validCerts.length === certificateChain.length) certScore += 10; // All valid
      if (trustedCerts.length > 0) certScore += 10; // Has trusted certs
      if (unexpiredCerts.length === certificateChain.length) certScore += 5; // All current

      score += certScore;
      factors += 25;
    }

    // Manifest completeness (20% weight)
    let manifestScore = 0;
    if (manifest.claimGenerator) manifestScore += 5;
    if (manifest.timestamp) manifestScore += 5;
    if (manifest.signature) manifestScore += 5;
    if (manifest.assertions && manifest.assertions.length > 0) manifestScore += 3;
    if (manifest.producer) manifestScore += 2;

    score += manifestScore;
    factors += 20;

    // Error and warning impact (15% weight)
    let errorScore = 15;
    const criticalErrors = validationResult.errors.filter(error => 
      error.includes('signature') || error.includes('corrupted') || error.includes('invalid')
    ).length;
    const minorErrors = validationResult.errors.length - criticalErrors;
    const warnings = validationResult.warnings.length;

    errorScore -= (criticalErrors * 8); // Heavy penalty for critical errors
    errorScore -= (minorErrors * 3);    // Moderate penalty for minor errors
    errorScore -= (warnings * 1);       // Light penalty for warnings

    score += Math.max(0, errorScore);
    factors += 15;

    // Calculate final percentage and trust level
    const finalScore = Math.round((score / factors) * 100);
    const clampedScore = Math.max(0, Math.min(100, finalScore));

    let trustLevel: 'high' | 'medium' | 'low';
    if (clampedScore >= 80) {
      trustLevel = 'high';
    } else if (clampedScore >= 50) {
      trustLevel = 'medium';
    } else {
      trustLevel = 'low';
    }

    return {
      score: clampedScore,
      trustLevel
    };
  }

  // Enhanced C2PA detection using official detector
  async hasC2PAData(mediaData: Uint8Array): Promise<boolean> {
    try {
      // Initialize the detector WASM module
      await init();
      
      // Use official C2PA detector for more accurate detection
      const detectionResult = scan_array_buffer(mediaData.buffer);
      
      // Result is numeric: 0 = no C2PA data, >0 = C2PA data found
      if (detectionResult > 0) {
        console.log('🔍 C2PA data detected at offset:', detectionResult);
        return true;
      }
      
      // Fallback to manual signature detection for edge cases
      return this.hasC2PADataFallback(mediaData);
      
    } catch (error) {
      console.warn('C2PA detector failed, using fallback:', error);
      return this.hasC2PADataFallback(mediaData);
    }
  }

  private hasC2PADataFallback(mediaData: Uint8Array): boolean {
    // Check for C2PA signatures in file headers
    const header = new TextDecoder().decode(mediaData.slice(0, 1024));
    
    // Look for common C2PA indicators
    const c2paIndicators = [
      'urn:uuid:c2pa',
      'c2pa.manifest',
      'contentauth',
      'jumbf',
      'c2pa',
      'cai:'
    ];

    // Also check binary signatures
    const binaryIndicators = [
      new Uint8Array([0x00, 0x00, 0x00, 0x0C, 0x6A, 0x75, 0x6D, 0x62]), // JUMB box
      new Uint8Array([0x75, 0x72, 0x6E, 0x3A, 0x75, 0x75, 0x69, 0x64]), // urn:uuid
    ];

    // Check text indicators
    const hasTextIndicator = c2paIndicators.some(indicator => 
      header.toLowerCase().includes(indicator.toLowerCase())
    );

    // Check binary indicators
    const hasBinaryIndicator = binaryIndicators.some(signature => {
      for (let i = 0; i <= mediaData.length - signature.length; i++) {
        if (mediaData.subarray(i, i + signature.length).every((byte, idx) => byte === signature[idx])) {
          return true;
        }
      }
      return false;
    });

    return hasTextIndicator || hasBinaryIndicator;
  }
}
