# 🤝 Contributing to Soft-Armor

Welcome! We're excited that you want to contribute to Soft-Armor. This guide will help you get started with contributing to our mission of building a more thoughtful internet.

## 🎯 Ways to Contribute

### 🐛 Bug Reports
Found something broken? Help us fix it:
- Use our [Bug Report Template](.github/ISSUE_TEMPLATE/bug_report.md)
- Check existing issues first to avoid duplicates
- Include browser version, extension version, and steps to reproduce
- Screenshots or console errors are super helpful

### ✨ Feature Requests
Have an idea for improving Soft-Armor?
- Use our [Feature Request Template](.github/ISSUE_TEMPLATE/feature_request.md)
- Explain the problem you're trying to solve
- Describe your proposed solution
- Consider the impact on privacy and performance

### 🔬 Detection Engine Development
Help improve our scanning accuracy:
- Review `src/detection/` directory for existing engines
- Implement new detection algorithms
- Optimize existing detection methods
- Add test cases for edge cases

### 📚 Documentation
Help others understand and use Soft-Armor:
- Improve README clarity
- Add code comments
- Create tutorials and guides
- Translate documentation

### 🎨 Design & UX
Make Soft-Armor more accessible and user-friendly:
- Improve popup UI/UX
- Enhance accessibility (WCAG compliance)
- Design new icons or visual elements
- User research and testing

## 🚀 Getting Started

### Prerequisites
- Node.js 18+ and npm
- Git
- Chrome or Firefox browser
- Basic knowledge of TypeScript/JavaScript

### Development Setup

1. **Fork and Clone**
   ```bash
   git clone https://github.com/your-username/soft-armor.git
   cd soft-armor
   ```

2. **Install Dependencies**
   ```bash
   npm install
   ```

3. **Start Development**
   ```bash
   npm run dev
   ```

4. **Load Extension in Browser**
   - Chrome: Go to `chrome://extensions`, enable Developer mode, click "Load unpacked", select `dist/` folder
   - Firefox: Go to `about:debugging`, click "Load Temporary Add-on", select `dist/manifest.json`

5. **Make Changes and Test**
   - Edit source files in `src/`
   - Extension rebuilds automatically
   - Reload extension in browser to see changes

## 📋 Development Guidelines

### Code Style
We use ESLint and Prettier to maintain consistent code style:

```bash
# Check linting
npm run lint

# Format code
npm run format
```

**Key Conventions:**
- Use TypeScript for all new code
- Prefer `async/await` over Promises
- Use descriptive variable and function names
- Add JSDoc comments for public APIs
- Follow existing patterns in the codebase

**Example:**
```typescript
/**
 * Analyzes media for authenticity signals
 * @param mediaUrl - URL of the media to analyze
 * @returns Analysis result with confidence score
 */
async function analyzeMedia(mediaUrl: string): Promise<AnalysisResult> {
  const signals = await this.extractSignals(mediaUrl);
  return this.calculateRisk(signals);
}
```

### Testing Requirements
All contributions should include appropriate tests:

```bash
# Run unit tests
npm test

# Run E2E tests
npm run test:e2e
```

**Test Guidelines:**
- Unit tests for all new functions/classes
- Integration tests for detection engines
- E2E tests for user-facing features
- Aim for >90% code coverage
- Mock external dependencies

**Example Test:**
```typescript
describe('SoftArmorMetadataEngine', () => {
  it('should detect C2PA signatures in headers', async () => {
    const engine = new SoftArmorMetadataEngine();
    const result = await engine.scanMedia('https://example.com/c2pa-image.jpg');
    
    expect(result.hasC2PA).toBe(true);
    expect(result.riskScore).toBeLessThan(0.3);
  });
});
```

### Performance Guidelines
Soft-Armor runs in users' browsers, so performance matters:

- **Bundle Size**: Keep additions minimal, avoid heavy dependencies
- **Memory Usage**: Clean up resources, avoid memory leaks
- **Network**: Minimize requests, use efficient data formats
- **CPU**: Optimize algorithms, use web workers for heavy tasks

**Performance Checklist:**
- [ ] New code doesn't significantly increase bundle size
- [ ] Memory usage is bounded and cleaned up
- [ ] Network requests are efficient and cached
- [ ] Heavy computations don't block the UI thread

### Security Requirements
Security is paramount for a trust and safety tool:

- **No Secrets**: Never commit API keys, tokens, or credentials
- **Input Validation**: Sanitize all user inputs and external data
- **Content Security Policy**: Follow CSP requirements
- **Permissions**: Request minimal necessary permissions
- **Dependencies**: Keep dependencies updated and secure

**Security Checklist:**
- [ ] No hardcoded secrets or credentials
- [ ] All inputs are validated and sanitized
- [ ] External data is treated as untrusted
- [ ] New permissions are justified and minimal
- [ ] Dependencies are up-to-date and secure

## 🔧 Technical Architecture

### Core Components

```
src/
├── content/              # Content scripts (run on web pages)
│   ├── scanner.ts        # Main scanning orchestrator
│   ├── ui.ts            # UI management and banner display
│   └── context-menu-integration.ts  # Right-click menu handling
├── detection/           # Detection engines
│   ├── soft-armor-metadata-engine.ts  # Custom metadata engine
│   ├── c2pa-probe.ts    # C2PA provenance checking
│   └── loop-detector.ts # AI artifact detection
├── background.ts        # Background script (service worker)
└── assets/popup/        # Extension popup UI
```

### Adding a New Detection Engine

1. **Create the Engine Class**
   ```typescript
   // src/detection/my-new-engine.ts
   export class MyNewEngine {
     async analyze(mediaData: Uint8Array): Promise<AnalysisResult> {
       // Your detection logic here
       return {
         confidence: 0.85,
         isAuthentic: true,
         details: 'Analysis details...'
       };
     }
   }
   ```

2. **Integrate with Scanner**
   ```typescript
   // src/content/scanner.ts
   import { MyNewEngine } from '../detection/my-new-engine';
   
   // Add to parallel checks
   const myEngineResult = await this.myNewEngine.analyze(mediaData);
   ```

3. **Add Tests**
   ```typescript
   // tests/unit/my-new-engine.test.ts
   describe('MyNewEngine', () => {
     it('should analyze media correctly', async () => {
       // Test implementation
     });
   });
   ```

4. **Update Documentation**
   - Add engine description to README
   - Document any new configuration options
   - Update API documentation

### UI Development Guidelines

Our UI follows a "mercy-first" design philosophy:

**Design Principles:**
- **Calm, not alarming**: Use gentle colors and animations
- **Educational, not punitive**: Help users understand, don't shame them
- **Progressive disclosure**: Show basic info first, details on demand
- **Accessibility first**: WCAG AA compliance is required

**CSS Guidelines:**
```css
/* Use CSS custom properties for consistency */
.my-component {
  background: var(--green-authentic);
  color: var(--text-primary);
  transition: all 0.2s ease; /* Gentle transitions */
}

/* Follow BEM naming convention */
.banner__content--warning {
  /* Component__element--modifier */
}
```

## 📝 Pull Request Process

### Before Submitting
- [ ] Code follows our style guidelines
- [ ] All tests pass (`npm test`)
- [ ] Extension builds without errors (`npm run build`)
- [ ] Changes are tested manually in browser
- [ ] Documentation is updated if needed

### PR Template
Use our [Pull Request Template](.github/pull_request_template.md):

```markdown
## Summary
Brief description of changes and why they're needed.

## Test Plan
- [ ] Unit tests added/updated
- [ ] Manual testing completed
- [ ] No regressions in existing functionality

## Screenshots
Include screenshots for UI changes.
```

### Review Process
1. **Automated Checks**: CI will run tests and linting
2. **Code Review**: Team member will review your code
3. **Manual Testing**: We'll test the changes manually
4. **Approval**: Once approved, we'll merge your PR

**Review Criteria:**
- Code quality and maintainability
- Test coverage and correctness
- Performance impact
- Security implications
- UI/UX considerations

## 🌍 Community Guidelines

### Code of Conduct
We follow the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). Be respectful, inclusive, and constructive in all interactions.

### Communication Channels
- **GitHub Issues**: Bug reports and feature requests
- **GitHub Discussions**: General questions and brainstorming
- **Discord**: Real-time developer chat (coming soon)
- **Email**: dev@soft-armor.io for private matters

### Recognition
We value all contributions! Contributors will be:
- Added to our Contributors section in README
- Mentioned in release notes for significant contributions
- Eligible for Soft-Armor swag and recognition
- Invited to contributor-only events and discussions

## 🎓 Learning Resources

### Getting Started with Browser Extensions
- [Chrome Extension Developer Guide](https://developer.chrome.com/docs/extensions/)
- [Firefox Add-ons Documentation](https://developer.mozilla.org/en-US/docs/Mozilla/Add-ons)
- [Manifest V3 Migration Guide](https://developer.chrome.com/docs/extensions/migrating/)

### Media Authenticity and AI Detection
- [Content Authenticity Initiative (CAI)](https://contentauthenticity.org/)
- [C2PA Technical Specification](https://c2pa.org/specifications/)
- [Deepfake Detection Research Papers](https://github.com/HongguLiu/Deepfake-Detection)

### TypeScript and Modern JavaScript
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Modern JavaScript Features](https://github.com/lukehoban/es6features)
- [Async/Await Best Practices](https://developer.mozilla.org/en-US/docs/Learn/JavaScript/Asynchronous/Async_await)

## 🐛 Debugging Tips

### Extension Development
```bash
# Debug popup
chrome://extensions -> Soft-Armor -> Inspect views: popup.html

# Debug background script
chrome://extensions -> Soft-Armor -> Inspect views: service worker

# Debug content script
Open DevTools on any webpage -> Console -> Check for Soft-Armor messages
```

### Common Issues
- **Extension not loading**: Check `manifest.json` syntax
- **Content script not injecting**: Verify permissions and host patterns
- **Build failing**: Clear `node_modules` and reinstall dependencies
- **Tests failing**: Check for async/await issues and proper mocking

### Performance Debugging
```typescript
// Add performance markers
performance.mark('scan-start');
await performScan();
performance.mark('scan-end');
performance.measure('scan-duration', 'scan-start', 'scan-end');
```

## 📊 Project Metrics

We track several metrics to ensure Soft-Armor remains performant and user-friendly:

- **Bundle Size**: < 2.5MB (currently ~2.0MB)
- **Scan Time**: < 3 seconds average
- **Success Rate**: > 95% scan completion
- **Memory Usage**: < 50MB per active tab
- **Test Coverage**: > 90% code coverage

## 🚀 Release Process

### Versioning
We follow [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes to public API
- **MINOR**: New features, backward compatible
- **PATCH**: Bug fixes, backward compatible

### Release Schedule
- **Patch releases**: As needed for critical bugs
- **Minor releases**: Monthly for new features
- **Major releases**: Quarterly for significant changes

## 💡 Ideas for First Contributions

New to open source? Here are some good first contribution ideas:

### Good First Issues
- Fix typos in documentation
- Add new test cases
- Improve error messages
- Add console logging for debugging
- Update dependencies

### Medium Complexity
- Implement new detection patterns
- Add new UI components
- Optimize existing algorithms
- Add internationalization support
- Create new example content

### Advanced
- Design new detection engines
- Add new data sources
- Implement advanced ML features
- Create development tools
- Build integration SDKs

## 📞 Getting Help

Stuck? Don't hesitate to ask for help:

1. **Check existing issues** - Your question might already be answered
2. **Read documentation** - README, code comments, and this guide
3. **Ask in discussions** - GitHub Discussions for general questions
4. **Create an issue** - For specific bugs or feature requests
5. **Email us** - dev@soft-armor.io for private or urgent matters

Remember: No question is too basic! We're here to help you succeed.

---

## 🙏 Thank You

Thank you for contributing to Soft-Armor! Every contribution, no matter how small, helps build a more thoughtful and trustworthy internet.

Together, we're making "scan before sharing" the new norm. 🛡️

---

**Happy Contributing!** 🎉

*This document is a living guide. If you see ways to improve it, please submit a PR!*