import React, { useState, useEffect } from 'react';
import {
  Business,
  User,
  Post,
  Campaign,
  SocialAccount,
  GeneratedImage,
  AuditLog,
  Invoice,
  PlanTier,
  SocialPlatform,
  CreditBalance,
  CreditCostConfig,
  AIBusinessBrain,
  MarketingScoreData,
  WeeklyHealthReport,
  CustomerReview,
  Competitor,
  CaribbeanEvent,
  UtmTrackingParams,
  InAppNotification,
  NotificationCategory
} from './types';
import {
  INITIAL_BUSINESSES,
  INITIAL_USERS,
  INITIAL_POSTS,
  INITIAL_CAMPAIGNS,
  INITIAL_SOCIAL_ACCOUNTS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INVOICES,
  INITIAL_CREDIT_BALANCE,
  INITIAL_CREDIT_COSTS,
  INITIAL_BUSINESS_BRAIN,
  INITIAL_MARKETING_SCORE,
  INITIAL_WEEKLY_HEALTH_REPORT,
  INITIAL_REVIEWS,
  INITIAL_COMPETITORS,
  INITIAL_CARIBBEAN_EVENTS
} from './data/mockData';

import { Navbar } from './components/Navbar';
import { LandingPage } from './components/LandingPage';
import { DashboardView } from './components/DashboardView';
import { BusinessProfileBuilder } from './components/BusinessProfileBuilder';
import { PublicBusinessProfile } from './components/PublicBusinessProfile';
import { AiContentGenerator } from './components/AiContentGenerator';
import { AiImageGenerator } from './components/AiImageGenerator';
import { ContentCalendar } from './components/ContentCalendar';
import { CampaignBuilder } from './components/CampaignBuilder';
import { SocialAccountsManager } from './components/SocialAccountsManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { PricingPage } from './components/PricingPage';
import { AdminPortal } from './components/AdminPortal';
import { AuthModal } from './components/AuthModal';

import { AiBrainView } from './components/AiBrainView';
import { AiReviewAssistantView } from './components/AiReviewAssistantView';
import { CompetitorIntelligenceView } from './components/CompetitorIntelligenceView';
import { AiBrandKitView } from './components/AiBrandKitView';
import { AiVideoStudioView } from './components/AiVideoStudioView';
import { CreditStoreModal } from './components/CreditStoreModal';
import { MobileBottomNav } from './components/MobileBottomNav';

export type ViewType =
  | 'landing'
  | 'dashboard'
  | 'ai_brain'
  | 'ai-assistant'
  | 'ai-image'
  | 'ai-video'
  | 'reviews'
  | 'competitors'
  | 'brand_kit'
  | 'profile-builder'
  | 'public_storefront'
  | 'calendar'
  | 'campaigns'
  | 'social-channels'
  | 'analytics'
  | 'billing'
  | 'admin-portal'
  | 'admin';

const isAdminPath = () =>
  typeof window !== 'undefined' &&
  (window.location.pathname === '/admin' || window.location.pathname === '/admin/');

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>(() => {
    if (isAdminPath()) return 'admin-portal';
    return 'landing';
  });
  const [currency, setCurrency] = useState<'XCD' | 'USD'>('XCD');

  // Sync URL history state with current view
  useEffect(() => {
    if (currentView === 'admin-portal' || currentView === 'admin') {
      if (!isAdminPath()) {
        window.history.pushState(null, '', '/admin');
      }
    } else {
      if (isAdminPath()) {
        window.history.pushState(null, '', '/');
      }
    }
  }, [currentView]);

  // Listen to browser navigation back/forward events
  useEffect(() => {
    const handlePopState = () => {
      if (isAdminPath()) {
        setCurrentView('admin-portal');
      } else {
        setCurrentView((prev) => (prev === 'admin-portal' || prev === 'admin' ? 'dashboard' : prev));
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // UTM Parameter Tracking State
  const [utmParams, setUtmParams] = useState<UtmTrackingParams | null>(() => {
    if (typeof window === 'undefined') return null;
    const urlParams = new URLSearchParams(window.location.search);
    const source = urlParams.get('utm_source');
    const medium = urlParams.get('utm_medium');
    const campaign = urlParams.get('utm_campaign');
    const term = urlParams.get('utm_term');
    const content = urlParams.get('utm_content');

    if (source || medium || campaign || term || content) {
      return {
        source: source || undefined,
        medium: medium || undefined,
        campaign: campaign || undefined,
        term: term || undefined,
        content: content || undefined,
        capturedAt: new Date().toISOString(),
      };
    }
    return null;
  });

  // Handle Signup / Get Started action from Landing Page with UTM attribution logging
  const handleGetStartedFromLanding = () => {
    if (utmParams && (utmParams.source || utmParams.campaign)) {
      const newLog: AuditLog = {
        id: `al-utm-${Date.now()}`,
        businessId: currentBusiness.id,
        userId: currentUser.id,
        userName: currentUser.name,
        action: 'UTM_CAMPAIGN_ATTRIBUTION',
        details: `User launched workspace attributed to campaign: source=${utmParams.source || 'direct'}, medium=${utmParams.medium || 'organic'}, campaign=${utmParams.campaign || 'default'}`,
        ipAddress: '190.102.45.12',
        timestamp: new Date().toISOString(),
      };
      setAuditLogs((prev) => [newLog, ...prev]);
    }
    setCurrentView('dashboard');
  };

  // Application Data States
  const [businesses, setBusinesses] = useState<Business[]>(INITIAL_BUSINESSES);
  const [users, setUsers] = useState<User[]>(INITIAL_USERS);
  const [posts, setPosts] = useState<Post[]>(INITIAL_POSTS);
  const [campaigns, setCampaigns] = useState<Campaign[]>(INITIAL_CAMPAIGNS);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>(INITIAL_SOCIAL_ACCOUNTS);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(INITIAL_AUDIT_LOGS);
  const [invoices, setInvoices] = useState<Invoice[]>(INITIAL_INVOICES);

  // New V79 AI Platform States
  const [creditBalance, setCreditBalance] = useState<CreditBalance>(INITIAL_CREDIT_BALANCE);
  const [creditCosts, setCreditCosts] = useState<CreditCostConfig>(INITIAL_CREDIT_COSTS);
  const [aiBrain, setAiBrain] = useState<AIBusinessBrain>(INITIAL_BUSINESS_BRAIN);
  const [marketingScore, setMarketingScore] = useState<MarketingScoreData>(INITIAL_MARKETING_SCORE);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyHealthReport>(INITIAL_WEEKLY_HEALTH_REPORT);
  const [reviews, setReviews] = useState<CustomerReview[]>(INITIAL_REVIEWS);
  const [competitors, setCompetitors] = useState<Competitor[]>(INITIAL_COMPETITORS);
  const [caribbeanEvents, setCaribbeanEvents] = useState<CaribbeanEvent[]>(INITIAL_CARIBBEAN_EVENTS);

  // In-App Notification State
  const [notifications, setNotifications] = useState<InAppNotification[]>([
    {
      id: 'notif-1',
      businessId: 'biz-1',
      category: 'CAMPAIGN_MILESTONE',
      title: 'Campaign Milestone Reached!',
      message: '"Summer Sunset Special" reached 10,000+ impressions with 18.4% engagement rate.',
      timestamp: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
      read: false,
      severity: 'success',
      actionTab: 'campaigns',
    },
    {
      id: 'notif-2',
      businessId: 'biz-1',
      category: 'LOW_CREDIT',
      title: 'Low Credit Warning',
      message: 'Your AI Credit balance is below 500 credits. Top up to ensure uninterrupted AI generation.',
      timestamp: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
      read: false,
      severity: 'warning',
      actionTab: 'billing',
    },
    {
      id: 'notif-3',
      businessId: 'biz-1',
      category: 'NEW_REVIEW',
      title: 'New 5-Star Review Received',
      message: 'Sarah Jenkins left a 5-star review on Google: "Best dining experience in Rodney Bay!" AI draft response ready.',
      timestamp: new Date(Date.now() - 1000 * 60 * 360).toISOString(),
      read: false,
      severity: 'info',
      actionTab: 'reviews',
    },
    {
      id: 'notif-4',
      businessId: 'biz-1',
      category: 'SYSTEM',
      title: 'Weekly Marketing Score Updated',
      message: 'Your business score increased to 88/100 (+4 pts). Recommended action: Publish short-form video.',
      timestamp: new Date(Date.now() - 1000 * 60 * 1440).toISOString(),
      read: true,
      severity: 'info',
      actionTab: 'dashboard',
    },
  ]);

  const handleMarkNotificationRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const handleMarkAllNotificationsRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleClearNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  };

  const handleSimulateNotification = (category: NotificationCategory) => {
    const now = new Date().toISOString();
    let newNotif: InAppNotification;

    if (category === 'CAMPAIGN_MILESTONE') {
      newNotif = {
        id: `notif-${Date.now()}`,
        businessId: currentBusiness.id,
        category: 'CAMPAIGN_MILESTONE',
        title: 'New Campaign Milestone: 15,000 Reach!',
        message: 'Your cross-channel marketing campaign hit a new milestone with 1,240 link clicks today.',
        timestamp: now,
        read: false,
        severity: 'success',
        actionTab: 'campaigns',
      };
    } else if (category === 'LOW_CREDIT') {
      newNotif = {
        id: `notif-${Date.now()}`,
        businessId: currentBusiness.id,
        category: 'LOW_CREDIT',
        title: 'Alert: Low Credit Balance Warning',
        message: 'You have fewer than 200 AI credits remaining. Top up to continue automated post generation.',
        timestamp: now,
        read: false,
        severity: 'warning',
        actionTab: 'billing',
      };
    } else if (category === 'NEW_REVIEW') {
      newNotif = {
        id: `notif-${Date.now()}`,
        businessId: currentBusiness.id,
        category: 'NEW_REVIEW',
        title: 'New Google Customer Review Alert',
        message: 'David Miller rated your business 5 stars: "Outstanding customer service and fast delivery!"',
        timestamp: now,
        read: false,
        severity: 'info',
        actionTab: 'reviews',
      };
    } else {
      newNotif = {
        id: `notif-${Date.now()}`,
        businessId: currentBusiness.id,
        category: 'SYSTEM',
        title: 'System Optimization Complete',
        message: 'AI Copy models updated with latest localized trend parameters.',
        timestamp: now,
        read: false,
        severity: 'info',
        actionTab: 'dashboard',
      };
    }

    setNotifications((prev) => [newNotif, ...prev]);
  };

  const [currentBusiness, setCurrentBusiness] = useState<Business>(INITIAL_BUSINESSES[0]);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [showAuthModal, setShowAuthModal] = useState<boolean>(false);
  const [showCreditStoreModal, setShowCreditStoreModal] = useState<boolean>(false);

  // Credit Deduction Engine
  const handleDeductCredits = (amount: number, reason: string): boolean => {
    const total = creditBalance.monthlyAllowance + creditBalance.purchasedCredits + creditBalance.bonusCredits;
    const remaining = total - creditBalance.usedCredits;
    if (remaining < amount) {
      setShowCreditStoreModal(true);
      return false;
    }

    setCreditBalance((prev) => ({
      ...prev,
      usedCredits: prev.usedCredits + amount,
    }));

    // Log to Audit trail
    const newLog: AuditLog = {
      id: `al-${Date.now()}`,
      businessId: currentBusiness.id,
      userId: currentUser.id,
      userName: currentUser.name,
      action: 'AI_POST_GENERATED',
      details: `Deducted ${amount} V79 AI Credits for ${reason}`,
      ipAddress: '190.102.45.12',
      timestamp: new Date().toISOString(),
    };
    setAuditLogs([newLog, ...auditLogs]);

    return true;
  };

  const handleBuyCredits = (amount: number) => {
    setCreditBalance((prev) => ({
      ...prev,
      purchasedCredits: prev.purchasedCredits + amount,
    }));
  };

  // Sync selected business when user changes
  const handleSelectUser = (user: User) => {
    setCurrentUser(user);
    const bus = businesses.find((b) => b.id === user.businessId);
    if (bus) {
      setCurrentBusiness(bus);
    }
    if (currentView !== 'admin-portal' && currentView !== 'admin') {
      setCurrentView('dashboard');
    }
  };

  const handleUpdateBusiness = (updated: Business) => {
    setCurrentBusiness(updated);
    setBusinesses(businesses.map((b) => (b.id === updated.id ? updated : b)));
  };

  const handleSchedulePost = (newPost: Partial<Post>) => {
    const postObj: Post = {
      id: `post-${Date.now()}`,
      businessId: currentBusiness.id,
      title: newPost.title || 'New AI Social Post',
      authorId: currentUser.id,
      authorName: currentUser.name,
      content: newPost.content || {
        facebook: { caption: 'Check out our latest update!', hashtags: [] }
      },
      scheduledFor: newPost.scheduledFor || new Date().toISOString(),
      status: 'SCHEDULED',
      mediaUrls: newPost.mediaUrls || [currentBusiness.coverImageUrl],
      createdAt: new Date().toISOString(),
      analytics: { reach: 0, impressions: 0, engagement: 0, clicks: 0 }
    };

    setPosts([postObj, ...posts]);
  };

  const handleCreateCampaign = (newCamp: Campaign) => {
    setCampaigns([newCamp, ...campaigns]);
  };

  const handleSaveImageToLibrary = (img: GeneratedImage) => {
    setGeneratedImages([img, ...generatedImages]);
  };

  const handleConnectChannel = (platform: SocialPlatform, handle: string) => {
    const newAccount: SocialAccount = {
      id: `sa-${Date.now()}`,
      businessId: currentBusiness.id,
      platform,
      accountName: `${currentBusiness.name} ${platform}`,
      accountHandle: handle,
      followerCount: 1250,
      connected: true,
      lastSyncedAt: new Date().toISOString(),
    };
    setSocialAccounts([...socialAccounts, newAccount]);
  };

  const handleUpgradePlan = (plan: PlanTier) => {
    const updatedBus = { ...currentBusiness, plan };
    handleUpdateBusiness(updatedBus);
    const newInvoice: Invoice = {
      id: `inv-${Date.now()}`,
      businessId: currentBusiness.id,
      businessName: currentBusiness.name,
      amountXCD: plan === 'STARTER' ? 49 : 149,
      amountUSD: plan === 'STARTER' ? 18 : 55,
      status: 'PAID',
      date: new Date().toISOString().split('T')[0],
      pdfUrl: '#',
    };
    setInvoices([newInvoice, ...invoices]);
  };

  // Dedicated full screen render for Public Business Storefront
  if (currentView === 'public_storefront') {
    return (
      <PublicBusinessProfile
        business={currentBusiness}
        onBackToApp={() => setCurrentView('dashboard')}
      />
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans flex flex-col">
      {/* Primary Top Navigation */}
      <Navbar
        currentUser={currentUser}
        onSwitchUser={handleSelectUser}
        users={users}
        currentBusiness={currentBusiness}
        creditBalance={creditBalance}
        activeTab={currentView}
        setActiveTab={(tab) => setCurrentView(tab as ViewType)}
        currency={currency}
        setCurrency={setCurrency}
        onOpenAuth={() => setShowAuthModal(true)}
        onViewPublicProfile={() => setCurrentView('public_storefront')}
        onOpenCreditStore={() => setShowCreditStoreModal(true)}
        notifications={notifications}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearNotification={handleClearNotification}
        onSimulateNotification={handleSimulateNotification}
      />

      {/* Main App Canvas Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        {currentView === 'landing' && (
          <LandingPage
            onStartDemo={handleGetStartedFromLanding}
            currency={currency}
            onViewPricing={() => setCurrentView('billing')}
            utmParams={utmParams}
          />
        )}

        {currentView === 'dashboard' && (
          <DashboardView
            currentBusiness={currentBusiness}
            posts={posts}
            socialAccounts={socialAccounts}
            currentUser={currentUser}
            usageLimits={{
              aiPostsUsed: 250,
              aiPostsLimit: 1000,
              aiImagesUsed: 15,
              aiImagesLimit: 50,
              campaignsUsed: 3,
              campaignsLimit: 10,
            }}
            onNavigate={(tab) => setCurrentView(tab as ViewType)}
            onQuickGenerate={(prompt) => {
              setCurrentView('ai-assistant');
            }}
            onViewPublicProfile={() => setCurrentView('public_storefront')}
            currency={currency}
          />
        )}

        {currentView === 'ai_brain' && (
          <AiBrainView
            business={currentBusiness}
            brain={aiBrain}
            onUpdateBrain={setAiBrain}
            onDeductCredits={handleDeductCredits}
          />
        )}

        {currentView === 'profile-builder' && (
          <BusinessProfileBuilder
            business={currentBusiness}
            onUpdateBusiness={handleUpdateBusiness}
            onViewPublicProfile={() => setCurrentView('public_storefront')}
          />
        )}

        {currentView === 'ai-assistant' && (
          <AiContentGenerator
            business={currentBusiness}
            onSchedulePost={handleSchedulePost}
          />
        )}

        {currentView === 'ai-image' && (
          <AiImageGenerator
            business={currentBusiness}
            onSaveToLibrary={handleSaveImageToLibrary}
          />
        )}

        {currentView === 'ai-video' && (
          <AiVideoStudioView
            business={currentBusiness}
            onDeductCredits={handleDeductCredits}
          />
        )}

        {currentView === 'reviews' && (
          <AiReviewAssistantView
            reviews={reviews}
            business={currentBusiness}
            onUpdateReviews={setReviews}
            onConvertToSocialPost={(rev) => {
              setCurrentView('ai-image');
            }}
            onDeductCredits={handleDeductCredits}
          />
        )}

        {currentView === 'competitors' && (
          <CompetitorIntelligenceView
            competitors={competitors}
            business={currentBusiness}
            onUpdateCompetitors={setCompetitors}
            onGenerateCounterCampaign={(opp) => {
              setCurrentView('campaigns');
            }}
            onDeductCredits={handleDeductCredits}
          />
        )}

        {currentView === 'brand_kit' && (
          <AiBrandKitView
            business={currentBusiness}
            onUpdateBusinessBrand={(b) => {
              handleUpdateBusiness({ ...currentBusiness, brandProfile: b });
            }}
          />
        )}

        {currentView === 'calendar' && (
          <ContentCalendar
            posts={posts}
            onSelectPost={() => {}}
            onCreateNewPost={() => setCurrentView('ai-assistant')}
          />
        )}

        {currentView === 'campaigns' && (
          <CampaignBuilder
            business={currentBusiness}
            campaigns={campaigns}
            onCreateCampaign={handleCreateCampaign}
          />
        )}

        {currentView === 'social-channels' && (
          <SocialAccountsManager
            socialAccounts={socialAccounts}
            onConnectChannel={handleConnectChannel}
          />
        )}

        {currentView === 'analytics' && (
          <AnalyticsDashboard
            business={currentBusiness}
            posts={posts}
            currency={currency}
          />
        )}

        {currentView === 'billing' && (
          <PricingPage
            currentBusiness={currentBusiness}
            currency={currency}
            onUpgradePlan={handleUpgradePlan}
          />
        )}

        {(currentView === 'admin-portal' || currentView === 'admin') && (
          <AdminPortal
            businesses={businesses}
            users={users}
            auditLogs={auditLogs}
            invoices={invoices}
            currency={currency}
            onExitAdmin={() => {
              setCurrentView('dashboard');
              if (window.location.pathname === '/admin' || window.location.pathname === '/admin/') {
                window.history.pushState(null, '', '/');
              }
            }}
          />
        )}
      </main>

      {/* Credit Add-On Store Modal */}
      {showCreditStoreModal && (
        <CreditStoreModal
          creditBalance={creditBalance}
          creditCosts={creditCosts}
          business={currentBusiness}
          currency={currency}
          onClose={() => setShowCreditStoreModal(false)}
          onBuyCredits={handleBuyCredits}
          onNavigateToBilling={() => setCurrentView('billing')}
        />
      )}

      {/* Status Bar / Footer */}
      <footer className="mt-auto border-t border-slate-200 bg-white px-8 py-3 text-[11px] font-bold text-slate-400 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-600">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            V79 AI Engine Online
          </span>
          <span>|</span>
          <span className="text-slate-500">Credits Remaining: {Math.max(0, creditBalance.monthlyAllowance + creditBalance.purchasedCredits + creditBalance.bonusCredits - creditBalance.usedCredits).toLocaleString()}</span>
        </div>
        <div className="text-slate-400 flex items-center gap-2">
          <span>V79 Marketing Hub v2.5.0</span>
          <span>•</span>
          <button
            onClick={() => {
              setCurrentView('admin-portal');
              if (window.location.pathname !== '/admin') {
                window.history.pushState(null, '', '/admin');
              }
            }}
            className="text-slate-500 hover:text-blue-600 underline font-bold transition-colors cursor-pointer"
          >
            Admin Portal (/admin)
          </button>
        </div>
      </footer>

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          users={users}
          currentUser={currentUser}
          onSelectUser={handleSelectUser}
          onClose={() => setShowAuthModal(false)}
        />
      )}

      {/* Mobile Bottom Touch Navigation */}
      <MobileBottomNav
        activeTab={currentView}
        setActiveTab={(tab) => setCurrentView(tab as ViewType)}
      />
    </div>
  );
}

