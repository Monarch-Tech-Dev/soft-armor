# OpenCV.js Setup for Loop Detection

The loop detection feature requires OpenCV.js to perform advanced video analysis. Follow these steps to add OpenCV.js to your extension:

## Manual Setup (Recommended)

1. **Download OpenCV.js**:
   ```bash
   wget https://docs.opencv.org/4.8.0/opencv.js -O public/opencv.js
   ```

2. **Verify the files are in the right location**:
   ```
   public/
   ├── opencv.js         # Main OpenCV library
   └── models/          # ML models (optional)
   ```

3. **Build the extension**:
   ```bash
   npm run build
   ```

The OpenCV.js library will be automatically copied to the `dist/` folder during build.

## Automatic Fallback

If OpenCV.js is not available locally, the loop detector will automatically:

1. Try loading from the extension bundle
2. Fallback to loading from OpenCV CDN: `https://docs.opencv.org/4.8.0/opencv.js`
3. Gracefully degrade to basic frame comparison if OpenCV fails to load

## Performance Features

The enhanced loop detector includes:

- **Adaptive thresholds** based on video quality
- **Memory pooling** for OpenCV matrices 
- **Performance monitoring** with automatic optimization
- **Graceful degradation** for low-performance devices
- **Multi-strategy loading** for maximum compatibility

## Usage

Once OpenCV.js is loaded, the loop detector provides:

- **Frame-by-frame analysis** with optical flow
- **Motion consistency detection** for AI-generated loops
- **Circular motion pattern recognition**
- **Template matching** for visual similarity
- **Performance metrics** for optimization

## Verification

To verify OpenCV.js is working:

1. Load the extension in Chrome
2. Right-click any video and select "Soft-Armor ▶ Scan media"
3. Check the browser console for OpenCV initialization messages
4. Look for detailed loop analysis results

The extension will work without OpenCV.js but with reduced loop detection capabilities.