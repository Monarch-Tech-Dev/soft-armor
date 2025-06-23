// Simple test for C2PA functionality
const https = require('https');

// Test function to validate C2PA implementation
async function testC2PA() {
  console.log('🧪 Testing C2PA implementation...');
  
  try {
    // Test 1: Fetch Adobe's sample C2PA image
    console.log('📸 Fetching Adobe C2PA sample image...');
    
    const imageData = await new Promise((resolve, reject) => {
      const req = https.get('https://cai-assertions.s3.amazonaws.com/media/CAICAI.jpg', (res) => {
        if (res.statusCode !== 200) {
          reject(new Error(`HTTP ${res.statusCode}: ${res.statusMessage}`));
          return;
        }
        
        const chunks = [];
        res.on('data', chunk => chunks.push(chunk));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          console.log(`✅ Downloaded ${buffer.length} bytes`);
          resolve(new Uint8Array(buffer));
        });
      });
      
      req.on('error', reject);
      req.setTimeout(10000, () => {
        req.destroy();
        reject(new Error('Download timeout'));
      });
    });
    
    // Test 2: Basic file validation
    console.log('🔍 Validating downloaded file...');
    
    // Check JPEG header
    const jpegHeader = [0xFF, 0xD8, 0xFF];
    const hasJPEGHeader = jpegHeader.every((byte, i) => imageData[i] === byte);
    
    if (hasJPEGHeader) {
      console.log('✅ Valid JPEG file detected');
    } else {
      console.log('❌ Invalid file format');
      return;
    }
    
    // Test 3: Look for C2PA indicators
    console.log('🔎 Scanning for C2PA markers...');
    
    const fileContent = new TextDecoder('utf-8', { fatal: false }).decode(imageData);
    
    // Check for various C2PA signatures
    const c2paMarkers = [
      'urn:uuid:c2pa',
      'c2pa.manifest',
      'contentauth',
      'jumbf',
      'c2pa'
    ];
    
    const foundMarkers = c2paMarkers.filter(marker => 
      fileContent.includes(marker)
    );
    
    if (foundMarkers.length > 0) {
      console.log('✅ C2PA markers found:', foundMarkers);
    } else {
      console.log('⚠️ No obvious C2PA text markers found (may still have binary data)');
    }
    
    // Test 4: Binary signature detection
    console.log('🔢 Checking for binary C2PA signatures...');
    
    // JUMB box signature
    const jumbSignature = [0x00, 0x00, 0x00, 0x0C, 0x6A, 0x75, 0x6D, 0x62];
    let jumbFound = false;
    
    for (let i = 0; i <= imageData.length - jumbSignature.length; i++) {
      if (jumbSignature.every((byte, idx) => imageData[i + idx] === byte)) {
        console.log('✅ JUMB box signature found at offset:', i);
        jumbFound = true;
        break;
      }
    }
    
    if (!jumbFound) {
      console.log('⚠️ JUMB box signature not found');
    }
    
    // Test 5: File structure analysis
    console.log('📋 Basic file analysis summary:');
    console.log(`  - File size: ${imageData.length} bytes`);
    console.log(`  - Format: JPEG`);
    console.log(`  - C2PA text markers: ${foundMarkers.length > 0 ? '✅' : '❌'}`);
    console.log(`  - Binary signatures: ${jumbFound ? '✅' : '❌'}`);
    
    const hasC2PAEvidence = foundMarkers.length > 0 || jumbFound;
    console.log(`  - Overall C2PA evidence: ${hasC2PAEvidence ? '✅' : '❌'}`);
    
    if (hasC2PAEvidence) {
      console.log('🎉 Test completed successfully - C2PA data detected!');
    } else {
      console.log('⚠️ Test completed - no C2PA evidence found (may require WASM detector)');
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    
    if (error.message.includes('ENOTFOUND')) {
      console.log('💡 Tip: This test requires internet access to download Adobe\'s sample');
    }
  }
}

// Run the test
testC2PA().catch(console.error);