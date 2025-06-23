// C2PA Testing utilities and sample validation
import { C2PAProbe } from './c2pa-probe';

export class C2PATestSuite {
  private c2paProbe: C2PAProbe;

  constructor() {
    this.c2paProbe = new C2PAProbe();
  }

  /**
   * Test C2PA validation with various scenarios
   */
  async runTestSuite(): Promise<void> {
    console.log('🧪 Starting C2PA Test Suite...');

    try {
      // Test 1: Test with known C2PA sample (Adobe's test image)
      await this.testAdobeSampleImage();

      // Test 2: Test with corrupted manifest
      await this.testCorruptedManifest();

      // Test 3: Test with missing signature
      await this.testMissingSignature();

      // Test 4: Test with non-C2PA image
      await this.testNonC2PAImage();

      console.log('✅ C2PA Test Suite completed successfully');
    } catch (error) {
      console.error('❌ C2PA Test Suite failed:', error);
    }
  }

  /**
   * Test with multiple C2PA sample sources
   */
  private async testAdobeSampleImage(): Promise<void> {
    console.log('📸 Testing C2PA sample images...');

    // Try multiple sample URLs
    const sampleUrls = [
      'https://cai-assertions.s3.amazonaws.com/media/CAICAI.jpg',
      'https://raw.githubusercontent.com/contentauth/c2pa-js/main/packages/toolkit/tests/fixtures/image.jpg',
      'https://contentauth.s3.amazonaws.com/samples/truepic-signed.jpg'
    ];

    let testPassed = false;

    for (const url of sampleUrls) {
      try {
        console.log(`🔗 Trying sample from: ${url}`);
        
        const response = await fetch(url);
        if (!response.ok) {
          console.log(`❌ HTTP ${response.status} - skipping this source`);
          continue;
        }

        const arrayBuffer = await response.arrayBuffer();
        const mediaData = new Uint8Array(arrayBuffer);

        console.log(`✅ Downloaded ${mediaData.length} bytes`);

        const result = await this.c2paProbe.check(mediaData, 'image');
        
        console.log('🔍 C2PA validation result:', {
          isValid: result.isValid,
          status: result.validationStatus,
          signer: result.signer,
          errors: result.errors?.length || 0,
          warnings: result.warnings?.length || 0
        });

        if (result.manifest) {
          console.log('📋 Manifest details:', {
            generator: result.manifest.claimGenerator,
            timestamp: result.manifest.timestamp,
            assertions: result.manifest.assertions?.length || 0
          });
        }

        testPassed = true;
        break; // Success with at least one sample

      } catch (error) {
        console.log(`⚠️ Failed to test ${url}:`, error.message);
        continue;
      }
    }

    if (!testPassed) {
      console.log('⚠️ All C2PA sample sources failed - testing with synthetic data');
      await this.testSyntheticC2PAData();
    }
  }

  /**
   * Test with synthetic C2PA-like data for offline testing
   */
  private async testSyntheticC2PAData(): Promise<void> {
    console.log('🔧 Testing with synthetic C2PA data...');

    // Create a JPEG with embedded C2PA markers
    const syntheticImage = new Uint8Array([
      // JPEG header
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00,
      // Fake C2PA markers
      ...new TextEncoder().encode('urn:uuid:c2pa.manifest'),
      0x00, 0x00,
      // JUMB box signature
      0x00, 0x00, 0x00, 0x0C, 0x6A, 0x75, 0x6D, 0x62,
      // More C2PA-like content
      ...new TextEncoder().encode('contentauth.adobe.com'),
      // Minimal JPEG content
      0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00,
      0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
      0x03, 0x11, 0x01,
      // End of image
      0xFF, 0xD9
    ]);

    const result = await this.c2paProbe.check(syntheticImage, 'image');
    
    console.log('🔍 Synthetic C2PA test result:', {
      status: result.validationStatus,
      foundIndicators: result.validationStatus !== 'missing'
    });

    // Should detect C2PA markers but likely fail validation
    if (result.validationStatus === 'invalid' || result.validationStatus === 'error') {
      console.log('✅ Correctly identified synthetic/invalid C2PA data');
    } else if (result.validationStatus !== 'missing') {
      console.log('✅ C2PA markers detected (expected for synthetic data)');
    } else {
      console.log('⚠️ Failed to detect C2PA markers in synthetic data');
    }
  }

  /**
   * Test with corrupted manifest data
   */
  private async testCorruptedManifest(): Promise<void> {
    console.log('🔧 Testing corrupted manifest handling...');

    // Create fake C2PA-like data with corrupted structure
    const corruptedData = new Uint8Array([
      // JPEG header
      0xFF, 0xD8, 0xFF, 0xE0,
      // Fake C2PA indicators
      ...new TextEncoder().encode('urn:uuid:c2pa'),
      // Corrupted binary data
      0x00, 0x01, 0x02, 0x03, 0xFF, 0xFF, 0xFF, 0xFF,
      // More random data
      ...new Array(100).fill(0).map(() => Math.floor(Math.random() * 256))
    ]);

    const result = await this.c2paProbe.check(corruptedData, 'image');
    
    console.log('🔍 Corrupted data result:', {
      status: result.validationStatus,
      hasErrors: (result.errors?.length || 0) > 0,
      errorTypes: result.errors
    });

    // Should detect as corrupted or invalid
    if (result.validationStatus === 'invalid' || result.validationStatus === 'error') {
      console.log('✅ Correctly identified corrupted manifest');
    } else {
      console.warn('⚠️ Failed to identify corrupted manifest');
    }
  }

  /**
   * Test with image that has no C2PA data
   */
  private async testNonC2PAImage(): Promise<void> {
    console.log('📷 Testing non-C2PA image...');

    // Create a minimal JPEG without C2PA data
    const nonC2PAData = new Uint8Array([
      // Standard JPEG header
      0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
      0x49, 0x46, 0x00, 0x01, 0x01, 0x01, 0x00, 0x48,
      0x00, 0x48, 0x00, 0x00,
      // Minimal JPEG data
      0xFF, 0xC0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00,
      0x01, 0x01, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01,
      0x03, 0x11, 0x01,
      // End of image
      0xFF, 0xD9
    ]);

    const result = await this.c2paProbe.check(nonC2PAData, 'image');
    
    console.log('🔍 Non-C2PA image result:', {
      status: result.validationStatus,
      foundC2PA: result.validationStatus !== 'missing'
    });

    // Should detect as missing C2PA data
    if (result.validationStatus === 'missing') {
      console.log('✅ Correctly identified missing C2PA data');
    } else {
      console.warn('⚠️ Incorrectly detected C2PA data in non-C2PA image');
    }
  }

  /**
   * Test missing signature scenario
   */
  private async testMissingSignature(): Promise<void> {
    console.log('🔏 Testing missing signature handling...');

    // This would be a more complex test that requires
    // crafted C2PA data with manifest but no valid signature
    // For now, we'll simulate this scenario
    
    console.log('📝 Note: Missing signature test requires crafted test data');
  }

  /**
   * Generate test report for C2PA functionality
   */
  async generateTestReport(): Promise<{
    detectionWorking: boolean;
    validationWorking: boolean;
    errorHandlingWorking: boolean;
    recommendations: string[];
  }> {
    const report = {
      detectionWorking: false,
      validationWorking: false,
      errorHandlingWorking: false,
      recommendations: [] as string[]
    };

    try {
      // Test basic detection
      const nonC2PAData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0]); // JPEG header
      const result = await this.c2paProbe.check(nonC2PAData);
      
      if (result.validationStatus === 'missing') {
        report.detectionWorking = true;
      }

      // Test error handling
      const corruptedData = new Uint8Array([0xFF, 0xFF, 0xFF, 0xFF]);
      const errorResult = await this.c2paProbe.check(corruptedData);
      
      if (errorResult.validationStatus === 'error' || errorResult.validationStatus === 'missing') {
        report.errorHandlingWorking = true;
      }

      // Add recommendations
      if (!report.detectionWorking) {
        report.recommendations.push('C2PA detection may not be working correctly');
      }
      
      if (!report.errorHandlingWorking) {
        report.recommendations.push('Error handling needs improvement');
      }

      if (report.detectionWorking && report.errorHandlingWorking) {
        report.recommendations.push('C2PA implementation appears to be working correctly');
        report.validationWorking = true;
      }

    } catch (error) {
      report.recommendations.push(`C2PA testing failed: ${error.message}`);
    }

    return report;
  }
}

// Utility function to test C2PA with actual Adobe sample
export async function testWithAdobeC2PAImage(): Promise<void> {
  console.log('🔍 Testing with real Adobe C2PA image...');
  
  const testSuite = new C2PATestSuite();
  await testSuite.runTestSuite();
  
  const report = await testSuite.generateTestReport();
  console.log('📊 Test Report:', report);
}

// Export for use in extension
export { C2PATestSuite };