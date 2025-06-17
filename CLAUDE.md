# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Core Development
- `npm run dev` - Start development server with Vite
- `npm run build` - Build extension for production (outputs to dist/ and copies manifest)
- `npm run package` - Create production ZIP for store submission

### Code Quality
- `npm run lint` - Run ESLint on TypeScript files
- `npm run format` - Format code with Prettier

### Testing
- `npm test` - Run unit tests with Vitest
- `npm run test:e2e` - Run end-to-end tests with Playwright

### Extension Development
- Build creates `dist/` folder that can be loaded as unpacked extension in Chrome
- Manifest is copied from `src/manifest.json` to `dist/` during build
- Content scripts and background script are bundled by Vite

## Architecture Overview

### Browser Extension Structure
This is a Chrome/Firefox extension (Manifest V3) for media authenticity scanning. The extension uses a content script + background script architecture:

- **Background Script** (`src/background.ts`): Creates context menu, handles right-click events on images/videos
- **Content Script** (`src/content/scanner.ts`): Main scanning orchestrator, manages UI, coordinates detection engines
- **Detection Engines** (`src/detection/`): Modular analysis systems (C2PA, loop detection, emotion analysis)

### Key Components
- **Scanner Flow**: Right-click → background script → content script → parallel detection → traffic-light banner
- **UI System**: Non-intrusive banner overlays with traffic-light color coding (green/amber/red)
- **Detection Pipeline**: Runs C2PA verification, loop artifact detection, and emotion manipulation analysis in parallel
- **Risk Assessment**: Combines detection results into single risk level for user display

### Technology Stack
- **Framework**: TypeScript + Vite for bundling
- **Browser APIs**: WebExtension APIs (chrome.contextMenus, chrome.scripting)
- **Detection Libraries**: @contentauth/c2pa for provenance, @tensorflow/tfjs for ML analysis
- **Build System**: Vite with custom rollup config for multiple entry points

### File Structure Notes
- `src/content/` - Content script components (scanner, UI, types)
- `src/detection/` - Detection engine implementations
- `src/api/` - API client and cloud service integration
- `src/assets/` - Static assets (icons, popup HTML)
- `tests/` - Unit and E2E test suites
- Build outputs to `dist/` with manifest copied automatically

### Privacy-First Design
- Core scanning happens client-side only
- Cloud features are opt-in premium additions
- No raw media data sent to servers without explicit consent
- Local-first architecture with optional cloud enhancements

### Loop Detection System
- **OpenCV.js Integration**: Advanced computer vision for video analysis
- **Optical Flow Analysis**: Detects motion patterns typical of AI-generated loops
- **Performance Optimization**: Adaptive thresholds and memory pooling for efficiency
- **Multi-strategy Loading**: CDN fallback ensures OpenCV availability
- **Memory Management**: Automatic cleanup and garbage collection for large videos
- **Quality Assessment**: Adjusts analysis depth based on video characteristics

### Development Notes
- OpenCV.js should be placed in `public/opencv.js` for optimal performance
- Loop detection gracefully degrades without OpenCV (basic frame comparison)
- Performance metrics available via `loopDetector.getPerformanceReport()`
- Memory usage monitored and optimized automatically