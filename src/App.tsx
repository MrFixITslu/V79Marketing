import React, { useState, useEffect } from 'react';
import { readMarketingView, marketingNavigationPath } from './lib/viewNavigation';
import {
  Business,
  User,
  Post,
  Campaign,
  SocialAccount,
  GeneratedImage,
  AuditLog,
  Invoice,
  SocialPlatform,
  CreditBalance,
  AIBusinessBrain,
  MarketingScoreData,
  WeeklyHealthReport,
  CustomerReview,
  Competitor,
  CaribbeanEvent,
  UtmTrackingParams,
  InAppNotification,
  NotificationCategory,
  PostDelivery
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
import { AgentDraftsView } from './components/AgentDraftsView';
import { SocialAccountsManager } from './components/SocialAccountsManager';
import { AnalyticsDashboard } from './components/AnalyticsDashboard';
import { AdminPortal } from './components/AdminPortal';
import { AuthModal } from './components/AuthModal';

import { AiBrainView } from './components/AiBrainView';
import { AiReviewAssistantView } from './components/AiReviewAssistantView';
import { CompetitorIntelligenceView } from './components/CompetitorIntelligenceView';
import { AiBrandKitView } from './components/AiBrandKitView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { CustomerPipelineView } from './components/CustomerPipelineView';
import { OneIdeaCampaignView } from './components/OneIdeaCampaignView';
import { CustomerInquiry } from './types';

export type ViewType =
  | 'landing'
  | 'dashboard'
  | 'customers'
  | 'one-idea-campaign'
  | 'ai_brain'
  | 'ai-assistant'
  | 'ai-image'
  | 'reviews'
  | 'competitors'
  | 'brand_kit'
  | 'profile-builder'
  | 'public_storefront'
  | 'calendar'
  | 'campaigns'
  | 'agent-drafts'
  | 'social-channels'
  | 'analytics'
  | 'billing'
  | 'admin-portal'
  | 'admin';

export default function App() {
  const [currentView, setCurrentView] = useState<ViewType>(() =>
    typeof window === 'undefined' ? 'dashboard' : readMarketingView(window.location.search)
  );
  const [currency, setCurrency] = useState<'XCD' | 'USD'>('XCD');
  const [sessionState, setSessionState] = useState<'loading' | 'authenticated' | 'unauthenticated'>('loading');

  // Keep the current workspace page shareable and stable across reloads.
  // Do not write the URL until the user session is verified.
  useEffect(() => {
    if (sessionState !== 'authenticated') return;
    const path = marketingNavigationPath(window.location.href, currentView);
    if (path !== window.location.pathname + window.location.search + window.location.hash) {
      window.history.replaceState(window.history.state, '', path);
    }
  }, [currentView, sessionState]);

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
        ipAddress: 'browser',
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
  const [postDeliveries, setPostDeliveries] = useState<PostDelivery[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);

  // New V79 AI Platform States
  const [creditBalance, setCreditBalance] = useState<CreditBalance>(INITIAL_CREDIT_BALANCE);
  const [aiBrain, setAiBrain] = useState<AIBusinessBrain>(INITIAL_BUSINESS_BRAIN);
  const [marketingScore, setMarketingScore] = useState<MarketingScoreData>(INITIAL_MARKETING_SCORE);
  const [weeklyReport, setWeeklyReport] = useState<WeeklyHealthReport>(INITIAL_WEEKLY_HEALTH_REPORT);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [competitors, setCompetitors] = useState<Competitor[]>([]);
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

  const [currentBusiness, setCurrentBusiness] = useState<Business>(INITIAL_BUSINESSES[0]);
  const [currentUser, setCurrentUser] = useState<User>(INITIAL_USERS[0]);
  const [showAuthModal, setShowAuthModal] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function loadSession() {
      try {
        const sessionResponse = await fetch('/api/auth/me', { credentials: 'same-origin' });
        if (!sessionResponse.ok) {
          if (!cancelled) {
            setSessionState('unauthenticated');
            window.location.replace('/api/platform/start');
          }
          return;
        }
        const session = await sessionResponse.json();
        if (cancelled || !session?.user || !session?.business) {
          if (!cancelled) {
            setSessionState('unauthenticated');
            window.location.replace('/api/platform/start');
          }
          return;
        }
        setCurrentUser(session.user);
        setCurrentBusiness(session.business);
        setUsers([session.user]);
        setBusinesses([session.business]);
        const [postResponse, customerResponse, creditResponse, campaignResponse, socialResponse, brainResponse, assetResponse, competitorResponse, deliveryResponse] = await Promise.all([
          fetch('/api/posts', { credentials: 'same-origin' }),
          fetch('/api/customers', { credentials: 'same-origin' }),
          fetch('/api/credits/balance', { credentials: 'same-origin' }),
          fetch('/api/campaigns', { credentials: 'same-origin' }),
          fetch('/api/social-accounts', { credentials: 'same-origin' }),
          fetch('/api/brain', { credentials: 'same-origin' }),
          fetch('/api/assets', { credentials: 'same-origin' }),
          fetch('/api/competitors', { credentials: 'same-origin' }),
          fetch('/api/post-deliveries', { credentials: 'same-origin' }),
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
        if (brainResponse.ok) {
          const body = await brainResponse.json();
          if (!cancelled && body.brain) setAiBrain(body.brain);
        }
        if (assetResponse.ok) {
          const body = await assetResponse.json();
          if (!cancelled) setGeneratedImages(body.assets || []);
        }
        if (competitorResponse.ok) {
          const body = await competitorResponse.json();
          if (!cancelled) setCompetitors(body.competitors || []);
        }
        if (deliveryResponse.ok) {
          const body = await deliveryResponse.json();
          if (!cancelled) setPostDeliveries(body.deliveries || []);
        }
        if (!cancelled) setSessionState('authenticated');
      } catch {
        if (!cancelled) setSessionState('unauthenticated');
      }
    }
    void loadSession();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    const refreshCredits = () => {
      void fetch('/api/credits/balance', { credentials:'same-origin' })
        .then(async response => {
          if (!response.ok) return;
          const body = await response.json().catch(() => ({}));
          if (body.balance) setCreditBalance(body.balance);
        })
        .catch(() => undefined);
    };
    window.addEventListener('v79:credits-updated', refreshCredits);
    return () => window.removeEventListener('v79:credits-updated', refreshCredits);
  }, []);

  useEffect(() => {
    if (sessionState !== 'authenticated') return;
    let cancelled = false;
    const refreshDeliveries = () => {
      void fetch('/api/post-deliveries', { credentials:'same-origin' })
        .then(async response => {
          if (!response.ok) return;
          const body = await response.json().catch(() => ({}));
          if (!cancelled) setPostDeliveries(body.deliveries || []);
        })
        .catch(() => undefined);
    };
    const handler = () => refreshDeliveries();
    window.addEventListener('v79:deliveries-updated', handler);
    const interval = window.setInterval(refreshDeliveries, 20_000);
    return () => {
      cancelled = true;
      window.removeEventListener('v79:deliveries-updated', handler);
      window.clearInterval(interval);
    };
  }, [sessionState]);

  // Growth Platform Customers CRM State
  const [customers, setCustomers] = useState<CustomerInquiry[]>([]);

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

  const handleUpdateBusiness = async (updated: Business): Promise<void> => {
    const editableProfile = {
      name: updated.name,
      slug: updated.slug,
      logoUrl: updated.logoUrl,
      coverImageUrl: updated.coverImageUrl,
      industry: updated.industry,
      description: updated.description,
      location: updated.location,
      phone: updated.phone,
      email: updated.email,
      website: updated.website,
      whatsapp: updated.whatsapp,
      openingHours: updated.openingHours,
      products: updated.products,
      services: updated.services,
      brandProfile: updated.brandProfile,
    };
    const response = await fetch(`/api/businesses/${encodeURIComponent(updated.id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editableProfile),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.business) {
      throw new Error(body.error || 'Could not save business profile.');
    }
    const saved: Business = {
      ...updated,
      ...body.business,
      logoUrl: body.business.logoUrl ?? updated.logoUrl,
      coverImageUrl: body.business.coverImageUrl ?? updated.coverImageUrl,
      openingHours: body.business.openingHours ?? updated.openingHours,
      products: body.business.products ?? updated.products,
      services: body.business.services ?? updated.services,
      brandProfile: body.business.brandProfile ?? updated.brandProfile,
      plan: body.business.plan ?? updated.plan,
    };
    setCurrentBusiness(saved);
    setBusinesses((items) => items.map((b) => (b.id === saved.id ? saved : b)));
  };

  const handleSchedulePost = async (newPost: Partial<Post>): Promise<void> => {
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
  };

  const handleCreateCampaign = async (newCamp: Campaign): Promise<Campaign> => {
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
    if (!response.ok || !body.campaign) throw new Error(body.error || 'Could not create campaign.');
    setCampaigns((items) => [body.campaign, ...items.filter((item) => item.id !== body.campaign.id)]);
    return body.campaign as Campaign;
  };

  const handleSaveImageToLibrary = async (img: GeneratedImage): Promise<GeneratedImage> => {
    const response = await fetch('/api/assets', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        prompt:img.prompt,
        dimension:img.dimension,
        platformTarget:img.platformTarget,
        imageUrl:img.imageUrl,
      }),
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok || !body.asset) throw new Error(body.error || 'Could not save media asset.');
    setGeneratedImages((items) => [body.asset, ...items.filter((item) => item.id !== body.asset.id)]);
    return body.asset as GeneratedImage;
  };

  const handleDisconnectChannel = async (id: string): Promise<void> => {
    const response = await fetch(`/api/social-accounts/${encodeURIComponent(id)}`, {
      method:'DELETE',
      credentials:'same-origin',
    });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not disconnect this provider.');
    setSocialAccounts(items => items.filter(item => item.id !== id));
  };

  const handleRetryDelivery = async (delivery: PostDelivery): Promise<void> => {
    const response = await fetch(
      `/api/post-deliveries/${encodeURIComponent(delivery.postId)}/${encodeURIComponent(delivery.platform)}/retry`,
      { method:'POST', credentials:'same-origin' }
    );
    const body = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(body.error || 'Could not retry this provider delivery.');
    setPostDeliveries(items => items.map(item =>
      item.postId === delivery.postId && item.platform === delivery.platform
        ? { ...item, status:'QUEUED', attempts:0, lastError:undefined, providerPostId:undefined, publishedAt:undefined, updatedAt:body.updatedAt || new Date().toISOString() }
        : item
    ));
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
          <div className="mt-6 flex items-center justify-center gap-4 text-xs text-slate-400">
            <a href="https://v79sl.com/privacy" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">Privacy Policy</a>
            <a href="https://v79sl.com/terms" target="_blank" rel="noopener noreferrer" className="underline underline-offset-2 hover:text-white">Terms of Service</a>
          </div>
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
    <div className="v79-marketing-app min-h-screen bg-[#07111f] text-slate-100 font-sans flex flex-col">
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
      />

      {/* Main App Canvas Body */}
      <main className="flex-1 max-w-[1540px] w-full mx-auto px-4 sm:px-5 xl:px-7 pt-5 pb-[calc(5.25rem+env(safe-area-inset-bottom))] md:pb-5">
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
              businessId: currentBusiness.id,
              aiPostsUsed: posts.length,
              aiPostsLimit: 0,
              aiImagesUsed: generatedImages.length,
              aiImagesLimit: 0,
              socialAccountsConnected: socialAccounts.filter(account => account.connected).length,
              socialAccountsLimit: 0,
            } as any}
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
              void (async () => {
                const response = await fetch(`/api/customers/${encodeURIComponent(id)}/status`, {
                  method:'PATCH',
                  headers:{'Content-Type':'application/json'},
                  body:JSON.stringify({status}),
                });
                const body = await response.json().catch(() => ({}));
                if (!response.ok) throw new Error(body.error || 'Customer status update failed.');
                setCustomers(items => items.map(c => c.id===id ? {...c,status} : c));
              })().catch(error => console.error('Customer status update failed:', error));
            }}
          />
        )}

        {currentView === 'one-idea-campaign' && (
          <OneIdeaCampaignView
            business={currentBusiness}
            onCreateCampaign={handleCreateCampaign}
          />
        )}

        {currentView === 'ai_brain' && (
          <AiBrainView
            business={currentBusiness}
            brain={aiBrain}
            onUpdateBrain={setAiBrain}
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
            socialAccounts={socialAccounts}
            onSchedulePost={handleSchedulePost}
          />
        )}

        {currentView === 'ai-image' && (
          <AiImageGenerator
            business={currentBusiness}
            onSaveToLibrary={handleSaveImageToLibrary}
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
          />
        )}

        {currentView === 'brand_kit' && (
          <AiBrandKitView
            business={currentBusiness}
            onUpdateBusinessBrand={(b) => {
              void handleUpdateBusiness({ ...currentBusiness, brandProfile: b })
                .catch((error) => console.error('Brand profile save failed:', error));
            }}
          />
        )}

        {currentView === 'calendar' && (
          <ContentCalendar
            posts={posts}
            deliveries={postDeliveries}
            onRetryDelivery={handleRetryDelivery}
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

        {currentView === 'agent-drafts' && <AgentDraftsView />}

        {currentView === 'social-channels' && (
          <SocialAccountsManager
            socialAccounts={socialAccounts}
            onDisconnectChannel={handleDisconnectChannel}
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
          <section className="rounded-[22px] border border-[#1a3854] bg-[#091728] p-5 sm:p-8">
            <h2 className="text-2xl font-semibold text-white">Subscription managed in V79 Hub</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500">
              Your V79 plan, product access and future AI usage add-ons are controlled centrally so you never pay separately inside each app.
            </p>
            <button onClick={() => window.location.assign('/api/platform/hub')} className="mt-6 rounded-xl border border-[#0A86FF]/30 bg-[#0A86FF]/10 px-5 py-3 text-sm font-semibold text-[#74d0ff] hover:bg-[#0A86FF]/18">
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

      {/* Status Bar / Footer */}
      <footer className="mt-auto border-t border-[#17324d] bg-[#06101d] px-5 sm:px-8 py-3 text-[10px] font-bold text-slate-600 hidden md:flex items-center justify-between">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-slate-500">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            V79 AI Engine Online
          </span>
          <span>|</span>
          <span className="text-slate-500">Credits Remaining: {Math.max(0, creditBalance.monthlyAllowance + creditBalance.purchasedCredits + creditBalance.bonusCredits - creditBalance.usedCredits).toLocaleString()}</span>
        </div>
        <div className="text-slate-400 flex flex-wrap items-center justify-end gap-2">
          <span>V79 Digital Marketing v3.0</span>
          <span>•</span>
          <a href="https://v79sl.com/privacy" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline font-bold transition-colors">
            Privacy
          </a>
          <span>•</span>
          <a href="https://v79sl.com/terms" target="_blank" rel="noopener noreferrer" className="text-slate-500 hover:text-slate-300 underline font-bold transition-colors">
            Terms
          </a>
          <span>•</span>
          <button onClick={() => window.location.assign('/api/platform/hub')} className="text-slate-500 hover:text-blue-600 underline font-bold transition-colors cursor-pointer">
            Back to Hub
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