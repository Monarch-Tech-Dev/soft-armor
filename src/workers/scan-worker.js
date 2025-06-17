// Simple scan worker for offloading heavy computations
self.addEventListener('message', (event) => {
  const { type, data } = event.data;
  
  switch (type) {
    case 'analyze-pixels':
      const result = analyzePixelData(data);
      self.postMessage({ type: 'pixel-analysis-result', result });
      break;
    
    case 'process-image-chunk':
      const chunkResult = processImageChunk(data);
      self.postMessage({ type: 'chunk-processed', result: chunkResult });
      break;
      
    default:
      self.postMessage({ type: 'error', message: 'Unknown task type' });
  }
});

function analyzePixelData(pixelData) {
  // Simple pixel analysis that can be moved to worker
  let complexity = 0;
  let edgeCount = 0;
  
  for (let i = 0; i < pixelData.length; i += 16) {
    const r = pixelData[i];
    const g = pixelData[i + 1];
    const b = pixelData[i + 2];
    
    // Simple edge detection
    if (i > 0) {
      const prevR = pixelData[i - 16];
      const prevG = pixelData[i - 15];
      const prevB = pixelData[i - 14];
      
      const diff = Math.abs(r - prevR) + Math.abs(g - prevG) + Math.abs(b - prevB);
      if (diff > 50) edgeCount++;
    }
    
    complexity += Math.abs(r - 128) + Math.abs(g - 128) + Math.abs(b - 128);
  }
  
  return {
    complexity: complexity / (pixelData.length / 16),
    edgeDensity: edgeCount / (pixelData.length / 16)
  };
}

function processImageChunk(chunkData) {
  // Process image chunk
  return {
    processed: true,
    timestamp: Date.now()
  };
}