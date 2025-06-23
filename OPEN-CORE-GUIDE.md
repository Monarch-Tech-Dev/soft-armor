# 🔓 Open Core Architecture Guide

**Document**: Soft-Armor Open Core Business Model  
**Purpose**: Define clear boundaries between open source and proprietary components  
**Status**: Production Implementation Guide

## 🎯 **Open Core Strategy Overview**

Soft-Armor follows the "Open Core" business model where:
- **Core functionality** is open source (community value)
- **Premium services** are proprietary (business value)
- **Clear separation** maintains trust and competitive advantage

---

## 📂 **Repository Structure**

### **✅ OPEN SOURCE (This Repository)**

```
soft-armor/                          # 🔓 PUBLIC
├── src/
│   ├── detection/
│   │   ├── c2pa-probe.ts            # Core C2PA verification
│   │   ├── tensorflow-analyzer.ts   # Basic AI models only
│   │   ├── loop-detector.ts         # OpenCV integration
│   │   └── lightweight-scanner.ts   # Basic media detection
│   ├── content/
│   │   ├── scanner.ts               # Main scanning engine
│   │   ├── premium-ui.ts            # Upgrade prompts ONLY
│   │   ├── context-menu.ts          # Right-click integration
│   │   └── ui.ts                    # Basic UI components
│   ├── api/
│   │   └── premium-client.ts        # API client framework
│   └── performance/                 # Optimization code
├── chrome-store/                    # Store assets
├── tests/                           # Test suite
└── docs/                           # Documentation
```

### **🔒 PROPRIETARY (Private Repositories/Services)**

```
soft-armor-premium/                  # 🔒 PRIVATE
├── api-server/
│   ├── advanced-ai/                # Premium TensorFlow models
│   ├── reverse-search/             # Image similarity database
│   ├── community/                  # Verification pod network
│   └── billing/                    # Stripe integration
├── models/
│   ├── deepfake-detection/         # Advanced AI models
│   ├── manipulation-scoring/       # Proprietary algorithms
│   └── enterprise-features/        # Custom implementations
├── infrastructure/
│   ├── kubernetes/                 # Cloud deployment
│   ├── monitoring/                 # Observability stack
│   └── security/                   # Enterprise compliance
└── customer-data/                  # Subscription management
```

---

## 🔓 **Open Source Components**

### **Core Detection Engine**
**Why Open**: Builds trust, enables community contributions, drives adoption

- **C2PA Verification**: Industry standard implementation
- **Basic AI Analysis**: Lightweight TensorFlow.js models
- **OpenCV Integration**: Video loop detection
- **Media Scanner**: Core detection algorithms
- **Performance Framework**: Optimization and monitoring

### **Extension Framework**
**Why Open**: Platform-specific, low competitive value

- **Chrome Extension Shell**: Manifest, background scripts
- **Content Scripts**: DOM integration, context menus
- **UI Components**: Basic scanning interface
- **Build System**: Vite configuration, TypeScript setup
- **Test Suite**: Unit and integration tests

### **API Integration Framework**
**Why Open**: Enables third-party integrations, shows capabilities

- **Premium Client**: API calling framework
- **Authentication Handling**: Token management
- **Feature Gating**: Upgrade prompt system
- **Error Handling**: Graceful degradation
- **Documentation**: API usage examples

---

## 🔒 **Proprietary Components**

### **Advanced AI Models**
**Why Proprietary**: Competitive advantage, training cost, accuracy

- **Premium TensorFlow Models**: High-accuracy deepfake detection
- **Proprietary Training Data**: Curated dataset for accuracy
- **Model Serving Infrastructure**: GPU clusters for inference
- **Algorithm Improvements**: Continuous model refinement

### **Cloud Services**
**Why Proprietary**: Infrastructure cost, scale requirements

- **Reverse Image Search**: Massive image database
- **Community Verification**: Expert reviewer network
- **Real-time Processing**: High-performance computing
- **Global CDN**: Worldwide service delivery

### **Business Infrastructure**
**Why Proprietary**: Customer data, revenue generation

- **Billing System**: Stripe integration, subscription management
- **Customer Dashboard**: Usage analytics, account management
- **Enterprise Features**: White-label, custom integrations
- **Support Systems**: Ticketing, documentation, onboarding

---

## 🎯 **Value Proposition Separation**

### **Open Source Value**
- **Trust Building**: Transparent algorithms
- **Community Driven**: Crowdsourced improvements
- **Educational**: Media literacy advancement
- **Privacy Focused**: Local processing guarantee
- **Developer Friendly**: Easy integration and extension

### **Premium Value**
- **Scale**: Cloud-powered processing
- **Accuracy**: State-of-the-art AI models
- **Speed**: Distributed computing infrastructure
- **Community**: Expert human verification
- **Support**: Professional SLA and assistance

---

## 🚧 **Implementation Guidelines**

### **Adding New Features**

#### **Default to Open Source If:**
- Improves core detection accuracy
- Enhances user experience
- Reduces privacy concerns
- Enables community contributions
- Has low infrastructure cost

#### **Keep Proprietary If:**
- Requires significant cloud infrastructure
- Contains proprietary algorithms or data
- Provides enterprise-specific value
- Involves customer data or billing
- Offers competitive differentiation

### **Code Review Checklist**

#### **Before Committing to Open Source:**
- [ ] No hardcoded API keys or secrets
- [ ] No proprietary algorithms exposed
- [ ] No customer data handling code
- [ ] No advanced AI model implementations
- [ ] Clear separation from premium features

#### **Security Verification:**
- [ ] All external APIs use user-provided keys
- [ ] No internal infrastructure details
- [ ] Privacy-first architecture maintained
- [ ] Graceful degradation for free users
- [ ] Premium features show upgrade prompts only

---

## 💰 **Business Model Protection**

### **Competitive Moat Strategy**

#### **Open Source Drives Adoption:**
- Users trust transparent code
- Developers contribute improvements
- Community builds around platform
- Viral growth through word-of-mouth

#### **Premium Services Capture Value:**
- Infrastructure requirements create barrier
- Advanced models require expertise
- Community features need moderation
- Enterprise needs require dedicated support

### **Revenue Streams**

#### **Freemium Conversion:**
- Free users experience core value
- Premium features clearly differentiated
- Upgrade path is seamless
- Value proposition is compelling

#### **Enterprise Sales:**
- Open source proves capability
- Premium features meet enterprise needs
- White-label options available
- Professional support included

---

## 📊 **Success Metrics**

### **Open Source KPIs**
- GitHub stars and forks
- Community contributions
- Issue resolution time
- Documentation quality
- Extension adoption rate

### **Business KPIs**
- Free to premium conversion rate
- Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)
- Enterprise deal size
- Support ticket volume

---

## 🔄 **Evolution Strategy**

### **Phase 1: Foundation (Current)**
- Core open source functionality
- Basic premium API framework
- Community building
- Trust establishment

### **Phase 2: Growth**
- Enhanced premium services
- Enterprise feature development
- API ecosystem expansion
- Partnership integrations

### **Phase 3: Scale**
- Advanced AI capabilities
- Global infrastructure
- White-label solutions
- Industry partnerships

---

## 📋 **Compliance and Legal**

### **Open Source License**
- **AGPL-3.0**: Ensures improvements remain open
- **Commercial Licensing**: Available for proprietary use
- **Patent Protection**: No patent restrictions
- **Export Control**: No restricted technologies

### **Premium Service Terms**
- **Proprietary License**: Premium services separately licensed
- **Data Processing**: Clear privacy boundaries
- **SLA Agreements**: Enterprise service levels
- **Compliance**: SOC 2, GDPR, industry standards

---

## 🤝 **Community Guidelines**

### **Open Source Contributions**
- Core features welcome
- Performance improvements encouraged
- Security fixes prioritized
- Documentation improvements valued

### **Premium Feature Requests**
- Community input on premium roadmap
- Open discussion of premium features
- Transparent pricing and capabilities
- Clear value proposition communication

---

## 📞 **Contact and Questions**

**Open Source**: GitHub Issues for technical questions  
**Business Model**: business@soft-armor.com for partnership inquiries  
**Enterprise**: sales@soft-armor.com for enterprise needs  
**Security**: security@soft-armor.com for security-related questions

---

## ✅ **Implementation Status**

**✅ COMPLETED:**
- Clear architectural separation
- Security audit passed
- Business model documented
- Legal compliance verified
- Community guidelines established

**🔄 ONGOING:**
- Premium service development
- Community engagement
- Feature prioritization
- Market validation

---

*This guide ensures Soft-Armor maintains the delicate balance between open source community value and sustainable business model protection.*