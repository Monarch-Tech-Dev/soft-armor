# 🏗️ Premium API Architecture - Soft-Armor

## 🎯 **Open Core Integration Strategy**

### **Architecture Overview**
```
┌─────────────────────────────────────────────────────────────┐
│                    SOFT-ARMOR EXTENSION                    │
│                     (Open Source)                          │
├─────────────────────────────────────────────────────────────┤
│  Local Processing (Free Tier)                              │
│  ├── C2PA Verification                                     │
│  ├── OpenCV.js Loop Detection                              │
│  ├── Basic TensorFlow.js Models                            │
│  └── UI/UX Components                                      │
├─────────────────────────────────────────────────────────────┤
│  Premium API Client (Open Source)                          │
│  ├── Authentication Token Management                       │
│  ├── API Request/Response Handling                         │
│  ├── Feature Gating Logic                                  │
│  └── Graceful Degradation                                  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTPS API Calls
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                 PREMIUM CLOUD SERVICES                     │
│                    (Private/Paid)                          │
├─────────────────────────────────────────────────────────────┤
│  Authentication & Billing                                  │
│  ├── JWT Token Validation                                  │
│  ├── Stripe Subscription Management                        │
│  ├── Usage Tracking & Rate Limiting                        │
│  └── Customer Dashboard API                                │
├─────────────────────────────────────────────────────────────┤
│  Advanced Detection Services                               │
│  ├── Reverse Image Search API                              │
│  ├── Premium AI Models (TensorFlow.js Serving)             │
│  ├── High-Accuracy Video Analysis                          │
│  └── Bulk Processing Endpoints                             │
├─────────────────────────────────────────────────────────────┤
│  Community & Enterprise Features                           │
│  ├── Verification Pod Network                              │
│  ├── Expert Review System                                  │
│  ├── Reputation & Trust Scoring                            │
│  └── White-label API Access                                │
└─────────────────────────────────────────────────────────────┘
```

---

## 🔐 **Authentication System**

### **Token-Based Authentication**
```typescript
interface AuthConfig {
  apiKey: string;           // User's API key
  tier: 'free' | 'premium' | 'enterprise';
  quotas: {
    daily: number;          // Daily API call limit
    monthly: number;        // Monthly limit
    concurrent: number;     // Concurrent requests
  };
  features: string[];       // Enabled premium features
}

// Open source client-side auth management
class PremiumAuthClient {
  private apiKey: string | null = null;
  private tier: string = 'free';
  
  async authenticate(apiKey: string): Promise<AuthResult> {
    // Validate API key with cloud service
    // Store encrypted locally
    // Return user tier and capabilities
  }
  
  isFeatureEnabled(feature: string): boolean {
    // Check if user's tier includes feature
    // Graceful degradation for free users
  }
}
```

### **API Key Management**
- **Free Tier:** No API key required (local processing only)
- **Premium:** Secure API key generation via dashboard
- **Enterprise:** Custom API keys with enhanced quotas

---

## 🌐 **Premium API Endpoints**

### **1. Reverse Image Search**
```
POST /api/v1/search/reverse
Content-Type: application/json
Authorization: Bearer {api_key}

{
  "image_url": "https://example.com/image.jpg",
  "image_data": "base64_encoded_image", // Alternative
  "search_depth": "standard" | "deep",
  "include_metadata": boolean
}

Response:
{
  "matches": [
    {
      "url": "https://source.com/original.jpg",
      "confidence": 0.95,
      "first_seen": "2024-01-15T10:30:00Z",
      "context": "news_article",
      "metadata": {...}
    }
  ],
  "analysis_time": 1.2,
  "credits_used": 1
}
```

### **2. Advanced AI Analysis**
```
POST /api/v1/analyze/advanced
Authorization: Bearer {api_key}

{
  "media_url": "https://example.com/video.mp4",
  "analysis_types": ["emotion", "synthetic", "manipulation"],
  "model_version": "premium-v2"
}

Response:
{
  "results": {
    "emotion_score": 0.73,
    "synthetic_probability": 0.12,
    "manipulation_indicators": [...],
    "confidence": 0.89
  },
  "processing_time": 3.4,
  "model_used": "premium-v2"
}
```

### **3. Community Verification**
```
POST /api/v1/community/submit
Authorization: Bearer {api_key}

{
  "media_hash": "sha256_hash",
  "verification_request": {
    "priority": "standard" | "urgent",
    "context": "social_media_viral",
    "user_notes": "Suspicious editing artifacts"
  }
}

Response:
{
  "verification_id": "verify_123abc",
  "estimated_completion": "2024-01-15T15:00:00Z",
  "expert_pool_size": 12,
  "status": "queued"
}
```

---

## 💰 **Pricing Tiers & Feature Gates**

### **Free Tier (Open Source)**
```typescript
const FREE_FEATURES = {
  local_scanning: true,
  c2pa_verification: true,
  opencv_loop_detection: true,
  basic_tensorflow_models: true,
  // No API calls, no cloud features
  api_calls_per_day: 0,
  reverse_search: false,
  advanced_ai: false,
  community_verification: false
};
```

### **Premium Tier ($9.99/month)**
```typescript
const PREMIUM_FEATURES = {
  ...FREE_FEATURES,
  api_calls_per_day: 1000,
  reverse_search: true,
  advanced_ai: true,
  community_verification: true,
  priority_support: false,
  bulk_processing: false,
  // 5 verification pod submissions/month
  verification_quota: 5
};
```

### **Enterprise Tier ($99/month)**
```typescript
const ENTERPRISE_FEATURES = {
  ...PREMIUM_FEATURES,
  api_calls_per_day: 10000,
  priority_support: true,
  bulk_processing: true,
  white_label_api: true,
  custom_models: true,
  sla_guarantee: "99.9%",
  verification_quota: 100,
  dedicated_support: true
};
```

---

## 🔧 **Implementation in Open Source Extension**

### **Feature Detection & Graceful Degradation**
```typescript
// src/api/premium-client.ts (Open Source)
export class PremiumClient {
  private config: AuthConfig | null = null;
  
  async checkPremiumFeature(feature: string): Promise<boolean> {
    if (!this.config) return false;
    return this.config.features.includes(feature);
  }
  
  async reverseImageSearch(imageUrl: string): Promise<SearchResult[]> {
    if (!await this.checkPremiumFeature('reverse_search')) {
      // Graceful degradation - show upgrade prompt
      return this.showUpgradePrompt('reverse_search');
    }
    
    return this.apiCall('/api/v1/search/reverse', {
      image_url: imageUrl
    });
  }
  
  private showUpgradePrompt(feature: string): SearchResult[] {
    // Show non-intrusive upgrade suggestion
    // Return empty results with upgrade context
    return [{
      type: 'upgrade_prompt',
      message: `Reverse image search requires Premium subscription`,
      upgrade_url: 'https://soft-armor.com/premium'
    }];
  }
}
```

### **Configuration Management**
```typescript
// User can configure API key through extension options
interface ExtensionConfig {
  premium_api_key?: string;
  tier: 'free' | 'premium' | 'enterprise';
  features_enabled: string[];
  privacy_mode: boolean; // Disable all cloud features
}
```

---

## 🚀 **Development Phases**

### **Phase 4 (Current) - API Client Framework**
- [ ] Premium API client structure (open source)
- [ ] Authentication token management
- [ ] Feature gating logic
- [ ] Graceful degradation UI components

### **Phase 5 - Cloud Infrastructure**
- [ ] Premium API server development (private)
- [ ] Stripe billing integration
- [ ] Usage tracking and rate limiting
- [ ] Customer dashboard

### **Phase 6 - Advanced Services**
- [ ] Reverse image search API
- [ ] Advanced AI model serving
- [ ] Community verification platform
- [ ] Enterprise features

---

## 🛡️ **Security & Privacy**

### **Data Handling**
- **Free Tier:** No data leaves user's device
- **Premium:** Optional cloud processing with explicit consent
- **Enterprise:** Dedicated instances, custom data retention

### **Privacy Controls**
```typescript
interface PrivacySettings {
  cloud_processing_enabled: boolean;
  data_retention_period: number; // days
  anonymous_usage_stats: boolean;
  share_with_community: boolean;
}
```

### **Compliance**
- GDPR compliance for EU users
- SOC 2 certification for enterprise
- User data export/deletion capabilities
- Transparent privacy policy

---

## 📊 **Success Metrics**

### **Technical KPIs**
- API response time < 2 seconds
- 99.9% uptime for premium services
- <1% false positive rate for AI models

### **Business KPIs**
- Free to Premium conversion rate
- Monthly recurring revenue (MRR)
- Customer lifetime value (CLV)
- API usage growth rate

---

**Next Steps:**
1. Implement API client framework in open source extension
2. Design premium service architecture
3. Build billing and authentication systems
4. Launch with reverse image search as first premium feature