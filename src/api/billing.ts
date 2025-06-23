// ================================
// Billing and Subscription Management
// ================================

export interface SubscriptionStatus {
  active: boolean;
  plan: 'free' | 'pro';
  subscriptionId?: string;
  customerId?: string;
  currentPeriodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  trialEnd?: number;
  status?: 'active' | 'canceled' | 'past_due' | 'trialing' | 'incomplete';
}

export interface BillingConfig {
  stripePublishableKey: string;
  proPriceId: string;
  successUrl: string;
  cancelUrl: string;
  webhookSecret: string;
}

export class BillingManager {
  private config: BillingConfig;
  private subscriptionStatus: SubscriptionStatus;

  constructor() {
    this.config = {
      stripePublishableKey: 'pk_live_51234567890abcdef', // Replace with actual key
      proPriceId: 'price_1234567890abcdef', // Replace with actual price ID
      successUrl: 'chrome-extension://' + chrome.runtime.id + '/popup.html?upgrade=success',
      cancelUrl: 'chrome-extension://' + chrome.runtime.id + '/popup.html?upgrade=canceled',
      webhookSecret: 'whsec_1234567890abcdef' // Replace with actual webhook secret
    };

    this.subscriptionStatus = {
      active: false,
      plan: 'free'
    };

    this.init();
  }

  private async init() {
    await this.loadSubscriptionStatus();
    this.setupMessageHandlers();
  }

  // ================================
  // Subscription Status Management
  // ================================

  async loadSubscriptionStatus(): Promise<SubscriptionStatus> {
    try {
      const result = await chrome.storage.local.get(['subscriptionStatus']);
      if (result.subscriptionStatus) {
        this.subscriptionStatus = result.subscriptionStatus;
      }
      
      // Verify status with server if we have a subscription
      if (this.subscriptionStatus.subscriptionId) {
        await this.verifySubscriptionStatus();
      }

      return this.subscriptionStatus;
    } catch (error) {
      console.error('Error loading subscription status:', error);
      return this.subscriptionStatus;
    }
  }

  async saveSubscriptionStatus(): Promise<void> {
    try {
      await chrome.storage.local.set({
        subscriptionStatus: this.subscriptionStatus
      });
    } catch (error) {
      console.error('Error saving subscription status:', error);
    }
  }

  async verifySubscriptionStatus(): Promise<void> {
    try {
      const response = await fetch('https://api.soft-armor.com/billing/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: this.subscriptionStatus.subscriptionId,
          customerId: this.subscriptionStatus.customerId
        })
      });

      if (response.ok) {
        const data = await response.json();
        this.updateSubscriptionStatus(data.subscription);
      }
    } catch (error) {
      console.error('Error verifying subscription:', error);
    }
  }

  updateSubscriptionStatus(subscription: Partial<SubscriptionStatus>): void {
    this.subscriptionStatus = {
      ...this.subscriptionStatus,
      ...subscription
    };
    this.saveSubscriptionStatus();
    this.notifyStatusChange();
  }

  // ================================
  // Upgrade Flow
  // ================================

  async initiateUpgrade(): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      // Check if already subscribed
      if (this.subscriptionStatus.active && this.subscriptionStatus.plan === 'pro') {
        return {
          success: false,
          error: 'Already subscribed to Pro plan'
        };
      }

      // Get user identifier (extension installation ID)
      const userId = await this.getUserId();

      // Create checkout session
      const response = await fetch('https://api.soft-armor.com/billing/create-checkout-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          priceId: this.config.proPriceId,
          userId: userId,
          successUrl: this.config.successUrl,
          cancelUrl: this.config.cancelUrl,
          clientReferenceId: userId,
          customerEmail: await this.getCustomerEmail(),
          metadata: {
            extensionId: chrome.runtime.id,
            version: chrome.runtime.getManifest().version,
            platform: 'chrome-extension'
          },
          allowPromotionCodes: true,
          billingAddressCollection: 'auto',
          paymentMethodTypes: ['card'],
          mode: 'subscription',
          subscriptionData: {
            trialPeriodDays: 7,
            metadata: {
              userId: userId,
              source: 'extension'
            }
          }
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.url) {
        // Track upgrade attempt
        this.trackEvent('upgrade_initiated', {
          priceId: this.config.proPriceId,
          userId: userId
        });

        return {
          success: true,
          url: data.url
        };
      } else {
        return {
          success: false,
          error: data.error || 'Failed to create checkout session'
        };
      }

    } catch (error) {
      console.error('Error initiating upgrade:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async handleUpgradeSuccess(sessionId: string): Promise<void> {
    try {
      // Retrieve the session to get subscription details
      const response = await fetch('https://api.soft-armor.com/billing/retrieve-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionId: sessionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        this.updateSubscriptionStatus({
          active: true,
          plan: 'pro',
          subscriptionId: data.subscription.id,
          customerId: data.customer.id,
          currentPeriodEnd: data.subscription.current_period_end * 1000,
          status: data.subscription.status,
          trialEnd: data.subscription.trial_end ? data.subscription.trial_end * 1000 : undefined
        });

        // Track successful upgrade
        this.trackEvent('upgrade_completed', {
          subscriptionId: data.subscription.id,
          plan: 'pro'
        });

        // Show success notification
        this.showUpgradeSuccessNotification();
      }
    } catch (error) {
      console.error('Error handling upgrade success:', error);
    }
  }

  async handleUpgradeCancel(): Promise<void> {
    // Track canceled upgrade
    this.trackEvent('upgrade_canceled');
    
    // Show informational message
    this.showUpgradeCancelNotification();
  }

  // ================================
  // Subscription Management
  // ================================

  async cancelSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.subscriptionStatus.subscriptionId) {
        return {
          success: false,
          error: 'No active subscription found'
        };
      }

      const response = await fetch('https://api.soft-armor.com/billing/cancel-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: this.subscriptionStatus.subscriptionId
        })
      });

      if (response.ok) {
        const data = await response.json();
        
        this.updateSubscriptionStatus({
          cancelAtPeriodEnd: true,
          status: 'active' // Still active until period end
        });

        this.trackEvent('subscription_canceled', {
          subscriptionId: this.subscriptionStatus.subscriptionId,
          cancelAtPeriodEnd: this.subscriptionStatus.currentPeriodEnd
        });

        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to cancel subscription'
        };
      }

    } catch (error) {
      console.error('Error canceling subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  async reactivateSubscription(): Promise<{ success: boolean; error?: string }> {
    try {
      if (!this.subscriptionStatus.subscriptionId) {
        return {
          success: false,
          error: 'No subscription found'
        };
      }

      const response = await fetch('https://api.soft-armor.com/billing/reactivate-subscription', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          subscriptionId: this.subscriptionStatus.subscriptionId
        })
      });

      if (response.ok) {
        this.updateSubscriptionStatus({
          cancelAtPeriodEnd: false,
          status: 'active'
        });

        this.trackEvent('subscription_reactivated', {
          subscriptionId: this.subscriptionStatus.subscriptionId
        });

        return { success: true };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to reactivate subscription'
        };
      }

    } catch (error) {
      console.error('Error reactivating subscription:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // ================================
  // Customer Portal
  // ================================

  async openCustomerPortal(): Promise<{ success: boolean; url?: string; error?: string }> {
    try {
      if (!this.subscriptionStatus.customerId) {
        return {
          success: false,
          error: 'No customer ID found'
        };
      }

      const response = await fetch('https://api.soft-armor.com/billing/create-portal-session', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          customerId: this.subscriptionStatus.customerId,
          returnUrl: chrome.runtime.getURL('popup.html')
        })
      });

      if (response.ok) {
        const data = await response.json();
        return {
          success: true,
          url: data.url
        };
      } else {
        const errorData = await response.json();
        return {
          success: false,
          error: errorData.error || 'Failed to create portal session'
        };
      }

    } catch (error) {
      console.error('Error opening customer portal:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  // ================================
  // Feature Access Control
  // ================================

  hasProAccess(): boolean {
    return this.subscriptionStatus.active && this.subscriptionStatus.plan === 'pro';
  }

  isInTrial(): boolean {
    return this.subscriptionStatus.trialEnd ? 
      Date.now() < this.subscriptionStatus.trialEnd : false;
  }

  getTrialDaysRemaining(): number {
    if (!this.subscriptionStatus.trialEnd) return 0;
    const daysRemaining = Math.ceil((this.subscriptionStatus.trialEnd - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysRemaining);
  }

  getDaysUntilRenewal(): number {
    if (!this.subscriptionStatus.currentPeriodEnd) return 0;
    const daysUntilRenewal = Math.ceil((this.subscriptionStatus.currentPeriodEnd - Date.now()) / (1000 * 60 * 60 * 24));
    return Math.max(0, daysUntilRenewal);
  }

  // ================================
  // Utility Methods
  // ================================

  private async getUserId(): Promise<string> {
    // Use extension installation ID as user identifier
    return new Promise((resolve) => {
      chrome.runtime.getPlatformInfo((info) => {
        const userId = chrome.runtime.id + '_' + info.os;
        resolve(userId);
      });
    });
  }

  private async getCustomerEmail(): Promise<string | undefined> {
    // Try to get email from stored user data
    try {
      const result = await chrome.storage.local.get(['userEmail']);
      return result.userEmail;
    } catch (error) {
      return undefined;
    }
  }

  private setupMessageHandlers(): void {
    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      switch (message.type) {
        case 'GET_SUBSCRIPTION_STATUS':
          sendResponse(this.subscriptionStatus);
          break;
        case 'INITIATE_UPGRADE':
          this.initiateUpgrade().then(sendResponse);
          return true; // Async response
        case 'CANCEL_SUBSCRIPTION':
          this.cancelSubscription().then(sendResponse);
          return true; // Async response
        case 'OPEN_CUSTOMER_PORTAL':
          this.openCustomerPortal().then(sendResponse);
          return true; // Async response
        default:
          break;
      }
    });
  }

  private notifyStatusChange(): void {
    // Notify all extension components of status change
    chrome.runtime.sendMessage({
      type: 'SUBSCRIPTION_STATUS_CHANGED',
      status: this.subscriptionStatus
    });
  }

  private trackEvent(eventName: string, properties: Record<string, any> = {}): void {
    // Track billing events for analytics
    chrome.runtime.sendMessage({
      type: 'TRACK_EVENT',
      eventName,
      properties: {
        ...properties,
        category: 'billing',
        timestamp: Date.now()
      }
    });
  }

  private showUpgradeSuccessNotification(): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Welcome to Soft-Armor Pro!',
      message: 'Your subscription is now active. Enjoy unlimited scans and advanced features!'
    });
  }

  private showUpgradeCancelNotification(): void {
    chrome.notifications.create({
      type: 'basic',
      iconUrl: 'icon48.png',
      title: 'Upgrade Canceled',
      message: 'No worries! You can upgrade to Pro anytime from the extension popup.'
    });
  }

  // ================================
  // Public API
  // ================================

  getSubscriptionStatus(): SubscriptionStatus {
    return { ...this.subscriptionStatus };
  }

  async refreshSubscriptionStatus(): Promise<SubscriptionStatus> {
    await this.verifySubscriptionStatus();
    return this.getSubscriptionStatus();
  }
}

// Export singleton instance
export const billingManager = new BillingManager();