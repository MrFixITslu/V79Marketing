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
  DEFAULT_CREDIT_BALANCE as INITIAL_CREDIT_BALANCE,
  DEFAULT_CREDIT_COSTS as INITIAL_CREDIT_COSTS,
  DEFAULT_BUSINESS_BRAIN as INITIAL_BUSINESS_BRAIN,
  DEFAULT_MARKETING_SCORE as INITIAL_MARKETING_SCORE,
  DEFAULT_WEEKLY_HEALTH_REPORT as INITIAL_WEEKLY_HEALTH_REPORT,
  INITIAL_REVIEWS,
  INITIAL_COMPETITORS,
  CARIBBEAN_CALENDAR_EVENTS as INITIAL_CARIBBEAN_EVENTS
} from './lib/constants';

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
import { CustomerPipelineView } from './components/CustomerPipelineView';
import { OneIdeaCampaignView } from './components/OneIdeaCampaignView';
import { FixMyMarketingModal } from './components/FixMyMarketingModal';
import { CustomerInquiry } from './types';

export type ViewType =
  | 'landing'
  | 'dashboard'
  | 'customers'
  | 'one-idea-campaign'
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

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>('dashboard');
  const [currency, setCurrency] = useState<'XCD' | 'USD'>('XCD');
  const [sessionState, setSessionState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

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
  const [businesses, setBusinesses] = useState<Business[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [posts, setPosts] = useState<Post[]>([]);
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [socialAccounts, setSocialAccounts] = useState<SocialAccount[]>([]);
  const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

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
  const [notifications, setNotifications] = useState<InAppNotification[]>([]);

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
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showCreditStoreModal, setShowCreditStoreModal] = useState(false);
  const [showFixModal, setShowFixModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const sessionResponse = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!sessionResponse.ok) {
          if (!cancelled) setSessionState('unauthenticated');
          return;
        }
        const session = await sessionResponse.json();
        if (cancelled || !session?.user || !session?.business) {
          if (!cancelled) setSessionState('unauthenticated');
          return;
        }
        setCurrentUser(session.user);
        setCurrentBusiness(session.business);
        setUsers([session.user]);
        setBusinesses([session.business]);
        setSessionState('authenticated');

        const [postResponse, customerResponse, creditResponse, campaignResponse, socialResponse] = await Promise.all([
          fetch('/api/posts', { credentials: 'same-origin' }),
          fetch('/api/customers', { credentials: 'same-origin' }),
          fetch('/api/credits/balance', { credentials: 'same-origin' }),
          fetch('/api/campaigns', { credentials: 'same-origin' }),
          fetch('/api/social-accounts', { credentials: 'same-origin' }),
        ]);
        if (postResponse.ok) {
          const body = await postResponse.json();
          if (!cancelled) setPosts(body.posts || []);
        }
        if (customerResponse.ok) {
          const body = await customerResponse.json();
          if (!cancelled) setCustomers(body.customers || []);
        }
        if (creditResponse.ok) {
          const body = await creditResponse.json();
          if (!cancelled && body.balance) setCreditBalance(body.balance);
        }
        if (campaignResponse.ok) {
          const body = await campaignResponse.json();
          if (!cancelled) setCampaigns(body.campaigns || []);
        }
        if (socialResponse.ok) {
          const body = await socialResponse.json();
          if (!cancelled) setSocialAccounts(body.socialAccounts || []);
        }
      } catch {
        if (!cancelled) setSessionState('unauthenticated');
      }
    }
    void loadSession();
    return () => { cancelled = true; };
  }, []);

  // Growth Platform Customers CRM State
  const [customers, setCustomers] = useState<CustomerInquiry[]>([]);

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

  const handleBuyCredits = (_amount: number) => {
    window.location.assign('/api/platform/hub');
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
    setBusinesses((items) => items.map((b) => (b.id === updated.id ? updated : b)));
    void fetch(`/api/businesses/${encodeURIComponent(updated.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updated),
    }).then(async (response) => {
      if (!response.ok) throw new Error((await response.json().catch(() => ({}))).error || 'Could not save business profile.');
      const body = await response.json();
      if (body.business) setCurrentBusiness({
        ...updated,
        name: body.business.name ?? updated.name,
        industry: body.business.industry ?? updated.industry,
        description: body.business.description ?? updated.description,
        location: body.business.location ?? updated.location,
        phone: body.business.phone ?? updated.phone,
        email: body.business.email ?? updated.email,
        website: body.business.website ?? updated.website,
        whatsapp: body.business.whatsapp ?? updated.whatsapp,
      });
    }).catch((error) => console.error('Business profile save failed:', error));
  };

  const handleSchedulePost = (newPost: Partial<Post>) => {
    void (async () => {
      const response = await fetch('/api/posts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessId: currentBusiness.id,
          title: newPost.title || 'New marketing post',
          content: newPost.content || {},
          mediaUrls: (newPost.mediaUrls || []).filter(Boolean),
          scheduledFor: newPost.scheduledFor || new Date().toISOString(),
          campaignId: newPost.campaignId,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not schedule the post.');
      if (body.post) setPosts((items) => [body.post, ...items.filter((item) => item.id !== body.post.id)]);
    })().catch((error) => console.error('Post scheduling failed:', error));
  };

  const handleCreateCampaign = (newCamp: Campaign) => {
    void (async () => {
      const response = await fetch('/api/campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name:newCamp.name,
          objective:newCamp.objective,
          startDate:newCamp.startDate,
          endDate:newCamp.endDate,
          status:newCamp.status,
          steps:newCamp.steps,
          aiPlanGenerated:newCamp.aiPlanGenerated,
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body.error || 'Could not create campaign.');
      if (body.campaign) setCampaigns((items) => [body.campaign, ...items.filter((item) => item.id !== body.campaign.id)]);
    })().catch((error) => console.error('Campaign save failed:', error));
  };

  const handleSaveImageToLibrary = (img: GeneratedImage) => {
    setGeneratedImages([img, ...generatedImages]);
  };

  const handleConnectChannel = (_platform: SocialPlatform, _handle: string) => {
    window.alert('This channel needs the official provider OAuth connection before V79 can publish to it. No connection will be simulated.');
  };

  const handleUpgradePlan = (_plan: PlanTier) => {
    window.location.assign('/api/platform/hub');
  };

  if (sessionState === 'loading') {
    return (
      <div className="grid min-h-screen place-items-center bg-slate-950 text-slate-300">
        <div className="text-center">
          <div className="text-lg font-semibold text-white">V79 Marketing</div>
          <div className="mt-2 text-sm">Checking your V79 Hub access…</div>
        </div>
      </div>
    );
  }

  if (sessionState === 'unauthenticated') {
    return (
      <main className="grid min-h-screen place-items-center bg-slate-950 px-6 text-white">
        <section className="max-w-lg rounded-3xl border border-white/10 bg-white/[0.05] p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-cyan-300 font-black text-slate-950">V79</div>
          <h1 className="mt-6 text-3xl font-semibold">V79 Marketing is part of V79 Hub</h1>
          <p className="mt-4 text-sm leading-6 text-slate-300">
            Business workspaces are created and authorised by V79 Hub. Sign in there to open the Marketing workspace included with your subscription.
          </p>
          <button onClick={() => window.location.assign('/api/platform/start')} className="mt-7 rounded-xl bg-cyan-300 px-5 py-3 font-semibold text-slate-950">
            Continue with V79 Hub
          </button>
        </section>
      </main>
    );
  }

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
        onOpenAuth={() => window.location.assign('/api/platform/hub')}
        onViewPublicProfile={() => setCurrentView('public_storefront')}
        onOpenCreditStore={() => window.location.assign('/api/platform/hub')}
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

        {currentView === 'customers' && (
          <CustomerPipelineView
            business={currentBusiness}
            customers={customers}
            onAddCustomer={(newCust) => {
              void fetch('/api/customers', {
                method:'POST',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify(newCust),
              }).then(async response => {
                const body=await response.json().catch(()=>({}));
                if(!response.ok) throw new Error(body.error || 'Could not add customer.');
                if(body.customer) setCustomers(items => [body.customer, ...items]);
              }).catch(error => console.error('Customer save failed:', error));
            }}
            onUpdateCustomerStatus={(id, status) => {
              setCustomers(items => items.map(c => c.id===id ? {...c,status} : c));
              void fetch(`/api/customers/${encodeURIComponent(id)}/status`, {
                method:'PATCH',
                headers:{'Content-Type':'application/json'},
                body:JSON.stringify({status}),
              }).catch(error => console.error('Customer status update failed:', error));
            }}
          />
        )}

        {currentView === 'one-idea-campaign' && (
          <OneIdeaCampaignView
            business={currentBusiness}
            onCreateCampaign={(newCamp) => setCampaigns([newCamp, ...campaigns])}
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
          <section className="rounded-3xl border border-slate-200 bg-white p-8">
            <h2 className="text-2xl font-semibold">Subscription managed in V79 Hub</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Your V79 plan, product access and future AI usage add-ons are controlled centrally so you never pay separately inside each app.
            </p>
            <button onClick={() => window.location.assign('/api/platform/hub')} className="mt-6 rounded-xl bg-slate-950 px-5 py-3 text-sm font-semibold text-white">
              Open V79 Hub
            </button>
          </section>
        )}

        {(currentView === 'admin-portal' || currentView === 'admin') && currentUser.role === 'PLATFORM_ADMIN' && (
          <AdminPortal
            businesses={businesses}
            users={users}
            auditLogs={auditLogs}
            invoices={invoices}
            currency={currency}
            onExitAdmin={() => setCurrentView('dashboard')}
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
          <span>V79 Marketing v3.0</span>
          <span>•</span>
          <button onClick={() => window.location.assign('/api/platform/hub')} className="text-slate-500 hover:text-blue-600 underline font-bold transition-colors cursor-pointer">
            V79 Hub
          </button>
        </div>
      </footer>

      {/* Mobile Bottom Touch Navigation */}
      <MobileBottomNav
        activeTab={currentView}
        setActiveTab={(tab) => setCurrentView(tab as ViewType)}
      />
    </div>
  );
}

