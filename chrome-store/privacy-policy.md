# Privacy Policy - Soft-Armor Media Authenticity Scanner

**Effective Date**: December 23, 2024  
**Last Updated**: December 23, 2024

## 🛡️ Our Privacy Commitment

Soft-Armor is built with privacy as the foundation. We believe media verification should be possible without compromising user privacy. This policy explains how we handle (or don't handle) your data.

## 📊 Data We DON'T Collect

### **No Media Upload**
- Images and videos you scan remain on your device
- No media files are ever transmitted to our servers
- All core processing happens locally in your browser

### **No User Tracking**
- We don't use analytics, cookies, or tracking pixels
- No behavioral data collection or profiling
- No cross-site tracking or fingerprinting

### **No Personal Information**
- We don't collect names, emails, or contact information
- No account creation required for basic functionality
- No demographic or location data collection

### **No Browsing History**
- We don't monitor which websites you visit
- No logging of scanned media or scan results
- No correlation of scanning patterns with user identity

## 🔍 How Soft-Armor Works (Privacy-First)

### **Local Processing**
All core functionality operates entirely on your device:
- **C2PA Verification**: Certificate validation happens locally
- **AI Analysis**: TensorFlow.js models run in your browser
- **Video Processing**: OpenCV.js frame analysis stays local
- **Results Display**: All UI updates are client-side only

### **Network Requests (Limited)**
The extension makes minimal network requests only for:
- **Extension Updates**: Chrome Web Store automatic updates
- **Library Loading**: CDN resources for AI models (if not bundled)
- **C2PA Certificate Validation**: Public certificate authority lookups (standard web security)

## 💰 Premium Features (Optional)

### **Opt-In Cloud Services**
Premium features require explicit user consent and include:
- **Reverse Image Search**: Image similarity matching via secure API
- **Community Verification**: Anonymous submission to expert review network
- **Advanced AI Models**: Cloud-based deepfake detection

### **Premium Data Handling**
When you choose premium features:
- **Explicit Consent**: Clear opt-in for each cloud feature
- **Minimal Data**: Only necessary image metadata, never full images
- **Encrypted Transmission**: All API calls use HTTPS encryption
- **No Storage**: Cloud processing results aren't stored long-term
- **Anonymous Processing**: No correlation with user identity

## 🔐 Technical Privacy Safeguards

### **Local Storage Only**
- Extension settings stored locally in Chrome's extension storage
- No server-side user profiles or accounts
- All data remains under user control

### **Secure Communication**
- All external API calls use HTTPS encryption
- Certificate pinning for security-critical connections
- No third-party tracking or advertising networks

### **Minimal Permissions**
- **activeTab**: Only access current page when user initiates scan
- **contextMenus**: Right-click menu integration
- **scripting**: Content script injection for scanning
- **storage**: Local extension settings only

## 🌍 International Privacy Compliance

### **GDPR Compliance (EU)**
- No personal data processing requiring consent
- No data controller relationship established
- Right to privacy by design and by default
- No international data transfers

### **CCPA Compliance (California)**
- No sale of personal information (we don't collect any)
- No behavioral advertising or profiling
- Clear disclosure of any data practices

### **Other Jurisdictions**
- Designed to comply with global privacy standards
- Regular review of international privacy requirements
- Proactive privacy protection regardless of jurisdiction

## 🔄 Data Subject Rights

### **Your Rights**
Since we don't collect personal data, traditional data subject rights don't apply, but you can:
- **Uninstall Extension**: Removes all local data
- **Clear Extension Data**: Chrome settings > Extensions > Soft-Armor > Remove
- **Disable Features**: Turn off any optional cloud features

### **Contact for Privacy Questions**
- **Email**: privacy@soft-armor.com
- **GitHub Issues**: Privacy-related questions in our public repository
- **Response Time**: We aim to respond within 7 business days

## 📱 Third-Party Services

### **Chrome Web Store**
- Google's privacy policy applies to extension installation and updates
- We don't receive installation data or user information from Google

### **Content Delivery Networks (CDN)**
- AI model libraries may be loaded from CDNs
- No user data shared with CDN providers
- Only standard HTTP requests for public resources

### **C2PA Certificate Authorities**
- Standard public key infrastructure for certificate validation
- No user data shared beyond normal PKI operations
- Same privacy level as HTTPS certificate validation

## 🔄 Policy Updates

### **Notification of Changes**
- Major changes will be announced via extension update notes
- Policy version number and date clearly displayed
- Users can review changes before accepting updates

### **Continued Use**
- Continued use of the extension after policy updates constitutes acceptance
- Users can uninstall at any time if they disagree with changes

## 🛠️ Technical Details

### **Local Storage Schema**
```javascript
// Example of local storage structure
{
  "settings": {
    "enableAnimations": true,
    "theme": "light",
    "premiumApiKey": null // Optional, user-provided
  },
  "scanHistory": [] // Local only, never transmitted
}
```

### **Network Traffic**
- Certificate validation requests (standard PKI)
- AI model downloads (public resources)
- Premium API calls (explicit user consent)
- Extension update checks (Chrome Web Store)

## 📞 Contact Information

**Monarch AS**  
**Email**: privacy@soft-armor.com  
**Website**: https://soft-armor.com/privacy  
**GitHub**: https://github.com/Monarch-Tech-Dev/soft-armor

## ✅ Privacy Certifications

- **Privacy by Design**: Built with privacy as the primary consideration
- **Open Source**: Full transparency through public code repository
- **Community Audited**: Regular security and privacy reviews by the community

---

**Summary**: Soft-Armor doesn't collect your data because we don't need to. Media verification happens locally on your device, protecting your privacy while keeping you safe from misinformation.

*This privacy policy is part of our commitment to transparent, privacy-respecting technology.*