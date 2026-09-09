import {
  CreditBalance,
  CreditCostConfig,
  AIBusinessBrain,
  MarketingScoreData,
  WeeklyHealthReport,
  CaribbeanEvent,
  UsageLimits,
  Business,
  User,
  SocialAccount,
  Post,
  Campaign,
  AuditLog,
  Invoice,
  CustomerReview,
  Competitor,
} from '../types';

export const DEFAULT_CREDIT_COSTS: CreditCostConfig = {
  aiPost: 25,
  aiImage: 100,
  campaign30Day: 300,
  aiVideo: 500,
  reviewResponse: 15,
  competitorAudit: 50,
};

export const DEFAULT_CREDIT_BALANCE: CreditBalance = {
  businessId: 'bus-1',
  monthlyAllowance: 200000,
  purchasedCredits: 0,
  bonusCredits: 5000,
  usedCredits: 0,
  resetDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
};

export const DEFAULT_USAGE_LIMITS: UsageLimits = {
  businessId: 'bus-1',
  aiPostsUsed: 0,
  aiPostsLimit: 1000,
  aiImagesUsed: 0,
  aiImagesLimit: 100,
  socialAccountsConnected: 0,
  socialAccountsLimit: 10,
};

export const DEFAULT_BUSINESS_BRAIN: AIBusinessBrain = {
  businessId: 'bus-1',
  description: '',
  productsAndServices: [],
  brandVoiceAndTone: 'Warm, hospitable, authentic, professional and inviting',
  targetAudience: 'Local clientele, corporate clients, and visitors seeking premium service',
  customerDemographics: 'All age groups, value quality service and authentic engagement',
  primaryGoals: [
    'Increase customer acquisition and direct bookings',
    'Build consistent social media engagement and reach',
    'Automate regular client communications and promos'
  ],
  frequentlyAskedQuestions: [],
  seasonalPromotions: [],
  preferredPostingTimes: 'Wednesdays 11:30 AM & Fridays 4:00 PM',
  preferredHashtags: ['#CaribbeanBusiness', '#ShopLocal', '#V79Digital'],
  previousCampaignNotes: ''
};

export const DEFAULT_MARKETING_SCORE: MarketingScoreData = {
  overallScore: 82,
  healthStatus: 'Good',
  breakdown: {
    brandCompleteness: 85,
    postingConsistency: 78,
    websiteOptimization: 80,
    socialProfileCompleteness: 88,
    seoReadiness: 75,
    reviewActivity: 80,
    aiUtilization: 85,
  },
  priorityTasks: [
    { id: 't1', title: 'Complete business profile and brand voice memory', impact: 'HIGH', creditsReward: 150, done: false, actionView: 'profile-builder' },
    { id: 't2', title: 'Generate first 30-Day Multi-Channel Campaign', impact: 'HIGH', creditsReward: 300, done: false, actionView: 'ai-assistant' },
    { id: 't3', title: 'Connect active social channels & Google Business', impact: 'MEDIUM', creditsReward: 200, done: false, actionView: 'social-channels' },
  ],
  recommendations: [
    'Complete your Brand Kit in AI Brain to ensure generated posts match your exact brand colors and tone.',
    'Schedule your weekly posts using AI Content Studio for optimal Friday peak engagement.',
    'Use Customer Pipeline to track WhatsApp and social inquiries in real-time.'
  ]
};

export const DEFAULT_WEEKLY_HEALTH_REPORT: WeeklyHealthReport = {
  weekDate: new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' }),
  overallScore: 82,
  topPerformingContent: 'Active social posts and multi-channel campaigns',
  weakestChannel: 'Expand reach across Instagram and WhatsApp',
  recommendedCampaign: 'Seasonal Celebration & Customer Appreciation Special',
  suggestedPostingFrequency: '3-4 Posts / week',
  caribbeanEventFocus: 'Upcoming regional holidays and cultural festivals',
  growthOpportunities: [
    'Activate WhatsApp direct customer inquiries for instant quote closing',
    'Publish regular short-form video reels highlighting client experiences',
    'Maintain prompt responses to customer reviews to boost SEO rankings'
  ],
  customerEngagementSummary: 'Platform systems active. Monitor analytics weekly to track reach, impressions, and customer conversions.'
};

export const CARIBBEAN_CALENDAR_EVENTS: CaribbeanEvent[] = [
  {
    id: 'ce-1',
    name: 'Saint Lucia Creole Heritage Month',
    dateOrSeason: 'October 1 - October 31',
    region: 'Saint Lucia & OECS',
    category: 'Culture',
    description: 'Island-wide celebration of Creole culture, traditional kwéyòl music, dress, and culinary delicacies.',
    campaignIdea: 'Kwéyòl Heritage cultural specials with scheduled social posts and WhatsApp promos.'
  },
  {
    id: 'ce-2',
    name: 'Caribbean Winter Cruise & Tourism Peak',
    dateOrSeason: 'November 15 - April 15',
    region: 'Pan-Caribbean',
    category: 'Tourism',
    description: 'High season influx of international travelers and excursion groups seeking local dining, shopping, and tours.',
    campaignIdea: 'VIP packages and visitor specials promoted via Instagram, Google Business, and WhatsApp.'
  },
  {
    id: 'ce-3',
    name: 'Emancipation Weekend Cultural Celebration',
    dateOrSeason: 'August 1 - August 3',
    region: 'All Caribbean Nations',
    category: 'National',
    description: 'Civic celebration marking emancipation with community gatherings, cultural showcases, and family events.',
    campaignIdea: 'Holiday weekend family specials and early-bird reservation promos.'
  },
  {
    id: 'ce-4',
    name: 'Saint Lucia Jazz & Arts Festival',
    dateOrSeason: 'May 5 - May 14',
    region: 'Saint Lucia',
    category: 'Carnival',
    description: 'World-renowned music festival drawing regional and international visitors to Saint Lucia.',
    campaignIdea: 'Festival specials, after-hours lounges, and commemorative promotions.'
  }
];

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'bus-1',
    name: 'V79 Enterprise Hub',
    slug: 'v79-enterprise-hub',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
    industry: 'Hospitality & Services',
    description: 'Empowering local commerce with automated digital presence, AI-driven marketing campaigns, and omni-channel customer growth.',
    location: 'Rodney Bay, Saint Lucia',
    phone: '+1 (758) 452-9789',
    email: 'info@v79digital.com',
    website: 'https://v79digital.com',
    whatsapp: '+17584529789',
    openingHours: [
      { day: 'Monday', open: '08:00 AM', close: '06:00 PM', closed: false },
      { day: 'Tuesday', open: '08:00 AM', close: '06:00 PM', closed: false },
      { day: 'Wednesday', open: '08:00 AM', close: '06:00 PM', closed: false },
      { day: 'Thursday', open: '08:00 AM', close: '06:00 PM', closed: false },
      { day: 'Friday', open: '08:00 AM', close: '07:00 PM', closed: false },
      { day: 'Saturday', open: '09:00 AM', close: '05:00 PM', closed: false },
      { day: 'Sunday', open: '10:00 AM', close: '02:00 PM', closed: true },
    ],
    products: [
      { id: 'p1', name: 'Digital Growth Package', description: 'Comprehensive digital presence setup & managed AI posting', price: 'EC$ 199.00', category: 'Services' },
      { id: 'p2', name: 'Omni-Channel Customer Pipeline', description: 'Automated WhatsApp routing and direct client booking', price: 'EC$ 99.00', category: 'Software' },
    ],
    services: [
      { id: 's1', name: 'Strategic Brand Consultation', description: '1-on-1 digital marketing audit and customized growth roadmap', price: 'EC$ 150.00', category: 'Consulting' },
    ],
    brandProfile: {
      primaryColor: '#EA580C',
      secondaryColor: '#0D9488',
      accentColor: '#F59E0B',
      brandVoice: 'Professional, welcoming, energetic, and customer-focused',
      targetAudience: 'Caribbean business owners, entrepreneurs, and clients seeking verified quality',
      keywords: ['Digital Marketing', 'Caribbean SaaS', 'SMB Growth', 'WhatsApp Automation'],
      tagline: 'Your business online. Your brand everywhere.',
    },
    plan: 'GROWTH',
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    email: 'admin@v79digital.com',
    name: 'Platform Administrator',
    role: 'PLATFORM_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    emailVerified: true,
    twoFactorEnabled: true,
    businessId: 'bus-1',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'user-owner-1',
    email: 'owner@v79digital.com',
    name: 'Business Workspace Owner',
    role: 'BUSINESS_OWNER',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    emailVerified: true,
    twoFactorEnabled: false,
    businessId: 'bus-1',
    createdAt: new Date().toISOString(),
  }
];

export const INITIAL_SOCIAL_ACCOUNTS: SocialAccount[] = [
  {
    id: 'sa-1',
    businessId: 'bus-1',
    platform: 'facebook',
    accountName: 'V79 Digital Facebook Page',
    accountHandle: '@V79Digital',
    connected: true,
    followerCount: 1420,
    lastSyncedAt: new Date().toISOString(),
  },
  {
    id: 'sa-2',
    businessId: 'bus-1',
    platform: 'instagram',
    accountName: 'v79digital_official',
    accountHandle: '@v79digital',
    connected: true,
    followerCount: 2850,
    lastSyncedAt: new Date().toISOString(),
  }
];

export const INITIAL_POSTS: Post[] = [];
export const INITIAL_CAMPAIGNS: Campaign[] = [];
export const INITIAL_AUDIT_LOGS: AuditLog[] = [];
export const INITIAL_INVOICES: Invoice[] = [];
export const INITIAL_REVIEWS: CustomerReview[] = [];
export const INITIAL_COMPETITORS: Competitor[] = [];
