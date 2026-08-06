import {
  Business,
  User,
  SocialAccount,
  Post,
  Campaign,
  AuditLog,
  Invoice,
  UsageLimits,
  CreditBalance,
  CreditCostConfig,
  AIBusinessBrain,
  MarketingScoreData,
  WeeklyHealthReport,
  CustomerReview,
  Competitor,
  CaribbeanEvent,
  GeneratedVideo
} from '../types';

export const INITIAL_CREDIT_BALANCE: CreditBalance = {
  businessId: 'bus-1',
  monthlyAllowance: 200000, // Growth plan gives 200,000 AI Credits
  purchasedCredits: 25000,
  bonusCredits: 5000,
  usedCredits: 78450,
  resetDate: '2026-09-01T00:00:00Z',
};

export const INITIAL_CREDIT_COSTS: CreditCostConfig = {
  aiPost: 25,
  aiImage: 100,
  campaign30Day: 300,
  aiVideo: 500,
  reviewResponse: 15,
  competitorAudit: 50,
};

export const INITIAL_BUSINESS_BRAIN: AIBusinessBrain = {
  businessId: 'bus-1',
  description: 'Authentic Caribbean wood-fired seafood, smoked jerk delicacies, and tropical cocktails served on the Rodney Bay Marina waterfront.',
  productsAndServices: [
    'Jerk Glazed Pork Ribs (EC$65)',
    'Waterfront Lobster Tail (EC$110)',
    'Pitons Rum Punch Pitcher (EC$45)',
    'Private Waterfront Catering',
    'Sunset VIP Balcony Table Reservations'
  ],
  brandVoiceAndTone: 'Warm, hospitable, authentic Caribbean, culinary passionate, inviting, energetic',
  targetAudience: 'Locals celebrating special occasions, yachties at Rodney Bay Marina, tourists seeking authentic island cuisine, sunset cocktail lovers',
  customerDemographics: 'Ages 25-60, middle-to-upper income, value authentic island flavors, seafood lovers, Instagram & Facebook active',
  primaryGoals: [
    'Increase Friday Sunset Happy Hour bookings by 40%',
    'Drive weekend dinner reservations at waterfront balcony',
    'Promote private event catering for Saint Lucia weddings and galas'
  ],
  frequentlyAskedQuestions: [
    { q: 'Do you offer vegetarian or gluten-free options?', a: 'Yes! We offer wood-fired grilled vegetable skewers, callaloo soup, and gluten-free cassava bread.' },
    { q: 'Is dockside boat mooring available?', a: 'Yes, guests arriving by yacht or boat can dock directly at Rodney Bay Marina dock B.' },
    { q: 'What time is the live acoustic music?', a: 'Live reggae and saxophone performances every Friday & Saturday from 6:30 PM to 9:30 PM.' }
  ],
  seasonalPromotions: [
    'Saint Lucia Carnival Warm-Up Party (July)',
    'Emancipation Weekend Cultural Feast (August)',
    'Creole Heritage Month Seafood Special (October)',
    'Festive Sunset Rum Punch Countdown (December)'
  ],
  preferredPostingTimes: 'Wednesdays 11:30 AM & Fridays 4:00 PM',
  preferredHashtags: ['#IsleSpiceGrill', '#RodneyBay', '#StLuciaEats', '#SunsetHappyHour', '#CaribbeanCocktails'],
  previousCampaignNotes: 'Posts showcasing behind-the-scenes wood-fire grilling and rum punch mixology reels achieved 3.2x higher engagement than static banners.'
};

export const INITIAL_MARKETING_SCORE: MarketingScoreData = {
  overallScore: 84,
  healthStatus: 'Good',
  breakdown: {
    brandCompleteness: 92,
    postingConsistency: 85,
    websiteOptimization: 78,
    socialProfileCompleteness: 95,
    seoReadiness: 70,
    reviewActivity: 88,
    aiUtilization: 80,
  },
  priorityTasks: [
    { id: 't1', title: 'Connect Google Business profile review auto-responder', impact: 'HIGH', creditsReward: 150, done: false, actionView: 'reviews' },
    { id: 't2', title: 'Generate 30-Day Saint Lucia Creole Month Campaign', impact: 'HIGH', creditsReward: 300, done: false, actionView: 'ai-assistant' },
    { id: 't3', title: 'Publish vertical Video Reel for Friday Sunset Happy Hour', impact: 'MEDIUM', creditsReward: 200, done: false, actionView: 'ai-video' },
    { id: 't4', title: 'Audit top 2 Rodney Bay competitor posting schedules', impact: 'LOW', creditsReward: 100, done: true, actionView: 'competitors' }
  ],
  recommendations: [
    'Your Instagram engagement peaks at 5:30 PM on Fridays — schedule your Rum Punch reels 1 hour before.',
    'Google Business reviews mentioned "slow seating" 2 times last month — use AI Review Assistant to respond with a warm invitation.',
    'Saint Lucia Creole Heritage Month is coming up — activate Caribbean Intelligence auto-campaign.'
  ]
};

export const INITIAL_WEEKLY_HEALTH_REPORT: WeeklyHealthReport = {
  weekDate: 'Monday, August 3, 2026',
  overallScore: 84,
  topPerformingContent: 'Friday Sunset Rum Punch 2-for-1 Reel (3,400 Reach, 310 Engagements)',
  weakestChannel: 'LinkedIn (Only 1 post published in 30 days)',
  recommendedCampaign: 'Saint Lucia Waterfront Sunday Jazz Brunch Series',
  suggestedPostingFrequency: '4 Posts / week (Mon, Wed, Fri, Sat)',
  caribbeanEventFocus: 'Emancipation Weekend & St. Lucia Food & Rum Festival prep',
  growthOpportunities: [
    'Launch WhatsApp direct VIP reservation broadcasts for repeat locals',
    'Cross-promote waterfront dining with local catamaran tour operators',
    'Generate video stories highlighting fresh lobster catches arriving at dock'
  ],
  customerEngagementSummary: 'Overall engagement up +18.2% this week. 14 new Google Business reviews logged with 4.8 star average.'
};

export const INITIAL_REVIEWS: CustomerReview[] = [
  {
    id: 'rev-1',
    businessId: 'bus-1',
    customerName: 'Marcus Thorne',
    platform: 'google_business',
    rating: 5,
    comment: 'The Jerk Glazed Ribs are out of this world! Watched the sunset over Rodney Bay Marina with a pitcher of Pitons Rum Punch. Outstanding hospitality!',
    date: '2026-08-04T18:20:00Z',
    sentiment: 'POSITIVE',
    aiSuggestedResponse: 'Thank you so much Marcus! We are thrilled you enjoyed the Jerk Ribs and sunset views over Rodney Bay. Hope to welcome you back for Friday acoustic reggae soon! 🍹🌴',
    responded: true
  },
  {
    id: 'rev-2',
    businessId: 'bus-1',
    customerName: 'Elena Rostova',
    platform: 'tripadvisor',
    rating: 4,
    comment: 'Great atmosphere and fresh lobster tail! Table service was slightly slow around 7 PM during rush hour, but the live music made up for it.',
    date: '2026-08-02T20:15:00Z',
    sentiment: 'NEUTRAL',
    aiSuggestedResponse: 'Hi Elena, thank you for visiting Isle Spice! We appreciate your feedback on peak hour seating and are taking steps to speed up weekend service. So glad you loved the lobster and music! 🎷🦞',
    responded: false
  },
  {
    id: 'rev-3',
    businessId: 'bus-1',
    customerName: 'Dave & Sarah Miller',
    platform: 'facebook',
    rating: 5,
    comment: 'Celebrated our 10th anniversary at Isle Spice on the waterfront balcony. Chef surprised us with complimentary dessert! Unforgettable Caribbean evening.',
    date: '2026-07-29T21:00:00Z',
    sentiment: 'POSITIVE',
    aiSuggestedResponse: 'Happy 10th Anniversary Dave & Sarah! It was our absolute honor to host your celebration. Here is to many more joyful island years ahead! 🥂✨',
    responded: true
  }
];

export const INITIAL_COMPETITORS: Competitor[] = [
  {
    id: 'comp-1',
    businessId: 'bus-1',
    name: 'Marigot Bay Catch & Grill',
    handle: '@MarigotCatchGrill',
    platform: 'instagram',
    postingFrequency: '3 posts / week',
    estimatedReach: '12,500 / mo',
    topTopics: ['Fresh Snapper', 'Yachtie Breakfasts', 'Sunset Happy Hour'],
    opportunityGap: 'They lack video content on TikTok & WhatsApp direct promos. You can dominate short-form video in Rodney Bay!',
    lastAnalyzed: '2026-08-05T10:00:00Z'
  },
  {
    id: 'comp-2',
    businessId: 'bus-1',
    name: 'Baywalk Bistro & Lounge',
    handle: '@BaywalkBistroSLU',
    platform: 'facebook',
    postingFrequency: '5 posts / week',
    estimatedReach: '18,200 / mo',
    topTopics: ['Lunch Specials', 'Corporate Buffets', 'Cocktail Pitchers'],
    opportunityGap: 'Their post visuals are static phone photos. Using V79 AI Image Studio gives Isle Spice a far more polished brand presence.',
    lastAnalyzed: '2026-08-04T14:30:00Z'
  }
];

export const INITIAL_CARIBBEAN_EVENTS: CaribbeanEvent[] = [
  {
    id: 'ce-1',
    name: 'Saint Lucia Creole Heritage Month',
    dateOrSeason: 'October 1 - October 31',
    region: 'Saint Lucia & OECS',
    category: 'Culture',
    description: 'Island-wide celebration of Creole culture, traditional kwéyòl music, dress, and culinary delicacies like breadfruit & smoked herring.',
    campaignIdea: 'Kwéyòl Friday Seafood & Breadfruit Roast promo with 30-day scheduled social posts and WhatsApp Kwéyòl trivia quiz.'
  },
  {
    id: 'ce-2',
    name: 'Caribbean Winter Cruise & Tourism Peak',
    dateOrSeason: 'November 15 - April 15',
    region: 'Pan-Caribbean',
    category: 'Tourism',
    description: 'High season influx of international visitors, yachties, and cruise passengers seeking waterfront dining and island excursions.',
    campaignIdea: 'Dock & Dine VIP package promotion targeting yacht owners and cruise excursion groups via Instagram, Google Business & TripAdvisor.'
  },
  {
    id: 'ce-3',
    name: 'Emancipation Weekend Cultural Gala',
    dateOrSeason: 'August 1 - August 3',
    region: 'All Caribbean Nations',
    category: 'National',
    description: 'Civic celebration marking emancipation, featuring street festivals, steelpan music, and traditional family gatherings.',
    campaignIdea: 'Emancipation Family Feast 3-course menu special with early-bird VIP table reservations.'
  },
  {
    id: 'ce-4',
    name: 'Saint Lucia Jazz & Arts Festival',
    dateOrSeason: 'May 5 - May 14',
    region: 'Saint Lucia',
    category: 'Carnival',
    description: 'World-renowned music festival drawing thousands of regional and international jazz and reggae fans to Pigeon Island.',
    campaignIdea: 'After-Jazz Waterfront Lounge Party featuring late-night cocktails, tapas, and live saxophone.'
  }
];

export const INITIAL_GENERATED_VIDEOS: GeneratedVideo[] = [
  {
    id: 'vid-1',
    businessId: 'bus-1',
    title: 'Friday Sunset Rum Punch Reel',
    prompt: 'Vertical 9:16 Instagram reel for waterfront 2-for-1 Rum Punch happy hour with tropical vibes',
    durationSeconds: 15,
    aspectRatio: '9:16',
    theme: 'Tropical Golden Hour',
    audioTrack: 'Upbeat Caribbean Reggae Beat',
    videoUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600',
    thumbnailUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400',
    createdAt: '2026-08-05T16:00:00Z'
  }
];

export const INITIAL_USERS: User[] = [
  {
    id: 'user-admin-1',
    email: 'admin@v79digital.com',
    name: 'Vance St. Clair (Admin)',
    role: 'PLATFORM_ADMIN',
    avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
    emailVerified: true,
    twoFactorEnabled: true,
    businessId: 'bus-1',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'user-owner-1',
    email: 'owner@islespice.com',
    name: 'Janelle Auguste (Owner)',
    role: 'BUSINESS_OWNER',
    avatarUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    emailVerified: true,
    twoFactorEnabled: false,
    businessId: 'bus-1',
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'user-marketing-1',
    email: 'marketing@islespice.com',
    name: 'Devon Francois (Marketing)',
    role: 'MARKETING_STAFF',
    avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    emailVerified: true,
    twoFactorEnabled: false,
    businessId: 'bus-1',
    createdAt: '2026-02-01T10:00:00Z',
  },
  {
    id: 'user-creator-1',
    email: 'creator@islespice.com',
    name: 'Maya Joseph (Content Creator)',
    role: 'CONTENT_CREATOR',
    avatarUrl: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?w=150',
    emailVerified: true,
    twoFactorEnabled: false,
    businessId: 'bus-1',
    createdAt: '2026-02-10T11:00:00Z',
  },
];

export const INITIAL_BUSINESSES: Business[] = [
  {
    id: 'bus-1',
    name: 'Isle Spice Grill & Lounge',
    slug: 'isle-spice-grill',
    logoUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=200',
    coverImageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1200',
    industry: 'Food & Hospitality',
    description: 'Authentic Caribbean wood-fired cuisine, fresh local seafood, tropical cocktails, and live island rhythms right on the waterfront.',
    location: 'Rodney Bay Marina, St. Lucia',
    phone: '+1 (758) 452-9789',
    email: 'dine@islespicegrill.com',
    website: 'https://islespicegrill.com',
    whatsapp: '+17584529789',
    openingHours: [
      { day: 'Monday', open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Tuesday', open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Wednesday', open: '11:00 AM', close: '10:00 PM', closed: false },
      { day: 'Thursday', open: '11:00 AM', close: '11:00 PM', closed: false },
      { day: 'Friday', open: '11:00 AM', close: '12:00 AM', closed: false },
      { day: 'Saturday', open: '10:00 AM', close: '12:00 AM', closed: false },
      { day: 'Sunday', open: '10:00 AM', close: '09:00 PM', closed: false },
    ],
    products: [
      { id: 'p1', name: 'Jerk Glazed Pork Ribs', description: 'Slow-smoked with local pimento, honey jerk glaze, and plantain mash', price: 'EC$ 65.00', category: 'Mains', imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=400' },
      { id: 'p2', name: 'Waterfront Lobster Tail', description: 'Freshly caught grilled spiny lobster with garlic herb butter', price: 'EC$ 110.00', category: 'Seafood', imageUrl: 'https://images.unsplash.com/photo-1559847844-5315695dadae?w=400' },
      { id: 'p3', name: 'Pitons Rum Punch Pitcher', description: 'Overproof rum, fresh passion fruit, nutmeg & lime', price: 'EC$ 45.00', category: 'Cocktails', imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=400' },
    ],
    services: [
      { id: 's1', name: 'Private Waterfront Catering', description: 'Full event catering for weddings, corporate galas & VIP celebrations', price: 'Custom Quote', category: 'Events' },
      { id: 's2', name: 'Sunset VIP Table Reservation', description: 'Guaranteed prime sunset balcony view with complimentary welcome cocktail', price: 'EC$ 30.00 deposit', category: 'Reservations' }
    ],
    brandProfile: {
      primaryColor: '#EA580C', // Warm Orange / Spice
      secondaryColor: '#0D9488', // Caribbean Turquoise
      accentColor: '#F59E0B', // Amber Gold
      brandVoice: 'Warm, vibrant, welcoming Caribbean hospitality with culinary passion',
      targetAudience: 'Locals, food enthusiasts, tourists, sunset diners, and event hosts',
      keywords: ['Caribbean grill', 'Rodney Bay dining', 'Fresh seafood', 'Rum punch', 'Live music'],
      tagline: 'Savor the spice of the islands.',
    },
    plan: 'GROWTH',
    createdAt: '2026-01-15T09:30:00Z',
  },
  {
    id: 'bus-2',
    name: 'Kairi Artisanal Boutique',
    slug: 'kairi-artisanal',
    logoUrl: 'https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=200',
    coverImageUrl: 'https://images.unsplash.com/photo-1472851294608-062f824d29cc?w=1200',
    industry: 'Retail & Fashion',
    description: 'Handcrafted Caribbean resort wear, organic coconut skincare, hand-poured spice candles, and island artisan crafts.',
    location: 'Castries Craft Market & Port Zante',
    phone: '+1 (758) 453-2211',
    email: 'hello@kairiboutique.com',
    website: 'https://kairiboutique.com',
    whatsapp: '+17584532211',
    openingHours: [
      { day: 'Monday', open: '09:00 AM', close: '06:00 PM', closed: false },
      { day: 'Tuesday', open: '09:00 AM', close: '06:00 PM', closed: false },
      { day: 'Wednesday', open: '09:00 AM', close: '06:00 PM', closed: false },
      { day: 'Thursday', open: '09:00 AM', close: '06:00 PM', closed: false },
      { day: 'Friday', open: '09:00 AM', close: '07:00 PM', closed: false },
      { day: 'Saturday', open: '09:00 AM', close: '05:00 PM', closed: false },
      { day: 'Sunday', open: '10:00 AM', close: '02:00 PM', closed: true },
    ],
    products: [
      { id: 'kp1', name: 'Hand-Dyed Linen Tunic', description: '100% breathable organic linen styled for tropical sun', price: 'EC$ 120.00', category: 'Apparel' },
      { id: 'kp2', name: 'Nutmeg & Cocoa Scrub', description: 'Exfoliating local cocoa shell & pure nutmeg essential oils', price: 'EC$ 38.00', category: 'Skincare' }
    ],
    services: [],
    brandProfile: {
      primaryColor: '#059669', // Island Emerald
      secondaryColor: '#D97706', // Sunset Coral
      accentColor: '#10B981',
      brandVoice: 'Eco-elegant, artistic, serene, celebrating Caribbean heritage',
      targetAudience: 'Fashion-forward shoppers, eco-conscious travelers, gift seekers',
      keywords: ['Resort wear', 'Handcrafted', 'Caribbean linen', 'Organic skincare'],
      tagline: 'Elegance crafted by Caribbean hands.',
    },
    plan: 'STARTER',
    createdAt: '2026-02-01T10:00:00Z',
  }
];

export const INITIAL_SOCIAL_ACCOUNTS: SocialAccount[] = [
  {
    id: 'sa-1',
    businessId: 'bus-1',
    platform: 'facebook',
    accountName: 'Isle Spice Grill & Lounge',
    accountHandle: '@IsleSpiceGrill',
    connected: true,
    followerCount: 4850,
    lastSyncedAt: '2026-08-06T12:00:00Z',
  },
  {
    id: 'sa-2',
    businessId: 'bus-1',
    platform: 'instagram',
    accountName: 'islespice_stlucia',
    accountHandle: '@islespice_stlucia',
    connected: true,
    followerCount: 8920,
    lastSyncedAt: '2026-08-06T12:00:00Z',
  },
  {
    id: 'sa-3',
    businessId: 'bus-1',
    platform: 'tiktok',
    accountName: 'IsleSpiceTikTok',
    accountHandle: '@islespicegrill',
    connected: true,
    followerCount: 12400,
    lastSyncedAt: '2026-08-06T11:30:00Z',
  },
  {
    id: 'sa-4',
    businessId: 'bus-1',
    platform: 'linkedin',
    accountName: 'Isle Spice Hospitality Group',
    accountHandle: 'company/isle-spice-group',
    connected: true,
    followerCount: 950,
    lastSyncedAt: '2026-08-05T14:00:00Z',
  },
  {
    id: 'sa-5',
    businessId: 'bus-1',
    platform: 'google_business',
    accountName: 'Isle Spice Grill - Rodney Bay',
    accountHandle: 'g.page/isle-spice-stlucia',
    connected: true,
    followerCount: 310,
    lastSyncedAt: '2026-08-06T10:00:00Z',
  },
];

export const INITIAL_POSTS: Post[] = [
  {
    id: 'post-1',
    businessId: 'bus-1',
    authorId: 'user-marketing-1',
    authorName: 'Devon Francois',
    title: 'Weekend Sunset Rum Punch Special',
    content: {
      facebook: {
        caption: '🍹 Sunset looks better with a Pitons Rum Punch in hand! Join us this Friday from 5 PM to 7 PM for 2-for-1 cocktails on our waterfront deck. Fresh passion fruit, local rum & live acoustic reggae! Tag who you are bringing! 🌴✨',
        hashtags: ['#IsleSpiceGrill', '#RodneyBay', '#StLuciaEats', '#SunsetHappyHour', '#CaribbeanCocktails'],
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'
      },
      instagram: {
        caption: 'Golden hour at Isle Spice hits different 🌅✨ 2-for-1 Rum Punch every Friday 5-7 PM. Reserve your waterfront sunset table via the link in our bio! 🥂🔥',
        hashtags: ['#SaintLucia', '#RodneyBayMarina', '#CaribbeanFoodie', '#RumPunchSpecial', '#V79Marketing'],
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'
      },
      tiktok: {
        caption: 'POV: You found the ultimate sunset happy hour in Rodney Bay St. Lucia 🍹🔥 Tag your travel buddy!',
        hashtags: ['#StLuciaTikTok', '#RodneyBay', '#CaribbeanVibes', '#HappyHour'],
        imageUrl: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'
      },
      whatsapp: {
        caption: '🔥 FRIDAY SUNSET SPECIAL at Isle Spice Grill! Enjoy 2-for-1 Rum Punch from 5-7 PM. Reply "RESERVE" to lock in your table now!',
        hashtags: []
      }
    },
    mediaUrls: ['https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=800'],
    scheduledFor: '2026-08-08T17:00:00Z',
    status: 'SCHEDULED',
    createdAt: '2026-08-05T14:20:00Z',
    analytics: { reach: 3400, impressions: 4200, engagement: 310, clicks: 88 }
  },
  {
    id: 'post-2',
    businessId: 'bus-1',
    authorId: 'user-creator-1',
    authorName: 'Maya Joseph',
    title: 'Chef Wood-Fired Jerk Ribs Showcase',
    content: {
      facebook: {
        caption: 'Smoked for 6 hours over indigenous pimento wood and brushed with our secret honey jerk glaze. Have you tried our signature Jerk Glazed Pork Ribs yet? 🤤🔥',
        hashtags: ['#WoodFiredJerk', '#IsleSpice', '#StLuciaCuisine'],
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
      },
      instagram: {
        caption: 'Sizzle, smoke & spice 🔥 Our Jerk Ribs are smoked daily right by the bay. Pair with plantain mash & crisp slaw. Who’s hungry? 👇',
        hashtags: ['#FoodPorn', '#JerkRibs', '#StLuciaRestaurants'],
        imageUrl: 'https://images.unsplash.com/photo-1544025162-d76694265947?w=800'
      }
    },
    mediaUrls: ['https://images.unsplash.com/photo-1544025162-d76694265947?w=800'],
    scheduledFor: '2026-08-10T12:30:00Z',
    status: 'SCHEDULED',
    createdAt: '2026-08-06T09:10:00Z',
  },
  {
    id: 'post-3',
    businessId: 'bus-1',
    authorId: 'user-owner-1',
    authorName: 'Janelle Auguste',
    title: 'Civic Emancipation Day Feast Recap',
    content: {
      facebook: {
        caption: 'Thank you to everyone who joined our Emancipation Day Cultural Feast! Over 200 guests enjoyed traditional breadfruit roast, saltfish accra, and steelpan performances. Check out the photos! 🇱🇨🌴',
        hashtags: ['#EmancipationDay', '#StLuciaCulture', '#IsleSpiceGrill'],
        imageUrl: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'
      }
    },
    mediaUrls: ['https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=800'],
    scheduledFor: '2026-08-02T10:00:00Z',
    status: 'PUBLISHED',
    createdAt: '2026-08-01T15:00:00Z',
    analytics: { reach: 8900, impressions: 12100, engagement: 1420, clicks: 390 }
  }
];

export const INITIAL_CAMPAIGNS: Campaign[] = [
  {
    id: 'camp-1',
    businessId: 'bus-1',
    name: 'Summer Waterfront Sunset Series 2026',
    objective: 'Drive Friday sunset cocktail reservations & boost waterfront dinner foot traffic by 35%',
    startDate: '2026-08-01',
    endDate: '2026-08-31',
    status: 'ACTIVE',
    aiPlanGenerated: true,
    steps: [
      { dayNumber: 1, channel: 'facebook', postTitle: 'Sunset Series Announcement', captionPrompt: 'Announce 2-for-1 Rum Punch on Fridays', suggestedTime: '11:00 AM', completed: true },
      { dayNumber: 3, channel: 'instagram', postTitle: 'Cocktail Reel & Live DJ Teaser', captionPrompt: 'Show mixology of Pitons Rum Punch', suggestedTime: '04:00 PM', completed: true },
      { dayNumber: 7, channel: 'tiktok', postTitle: 'Rodney Bay Sunset POV', captionPrompt: 'Short viral clip of golden hour at the deck', suggestedTime: '06:00 PM', completed: true },
      { dayNumber: 12, channel: 'whatsapp', postTitle: 'VIP VIP Table Promo Broadcast', captionPrompt: 'Direct message discount code SUNSET15', suggestedTime: '10:00 AM', completed: false },
      { dayNumber: 18, channel: 'linkedin', postTitle: 'Corporate Waterfront Mixer Package', captionPrompt: 'Target local businesses for Friday after-work team mixers', suggestedTime: '09:00 AM', completed: false },
      { dayNumber: 25, channel: 'google_business', postTitle: 'Weekend Dining Special Offer', captionPrompt: 'Update Google Business profile with Sunset Special', suggestedTime: '01:00 PM', completed: false },
    ],
    createdAt: '2026-07-28T10:00:00Z',
  }
];

export const INITIAL_AUDIT_LOGS: AuditLog[] = [
  { id: 'al-1', businessId: 'bus-1', userId: 'user-marketing-1', userName: 'Devon Francois', action: 'POST_SCHEDULED', details: 'Scheduled post "Weekend Sunset Rum Punch Special" for Aug 8, 2026', ipAddress: '190.102.45.12', timestamp: '2026-08-05T14:20:00Z' },
  { id: 'al-2', businessId: 'bus-1', userId: 'user-creator-1', userName: 'Maya Joseph', action: 'AI_IMAGE_GENERATED', details: 'Generated 1080x1080 Instagram visual for Jerk Glazed Ribs', ipAddress: '190.102.45.18', timestamp: '2026-08-06T09:05:00Z' },
  { id: 'al-3', businessId: 'bus-1', userId: 'user-owner-1', userName: 'Janelle Auguste', action: 'BRAND_PROFILE_UPDATED', details: 'Updated brand voice and primary color to #EA580C', ipAddress: '190.102.45.12', timestamp: '2026-08-04T16:30:00Z' },
  { id: 'al-4', businessId: 'bus-1', userId: 'user-admin-1', userName: 'Vance St. Clair', action: 'PLAN_UPGRADED', details: 'Upgraded Isle Spice Grill & Lounge to BUSINESS plan', ipAddress: '190.102.10.01', timestamp: '2026-07-15T11:00:00Z' },
];

export const INITIAL_INVOICES: Invoice[] = [
  { id: 'inv-2026-008', businessId: 'bus-1', businessName: 'Isle Spice Grill & Lounge', amountXCD: 149, amountUSD: 55, status: 'PAID', date: '2026-08-01', pdfUrl: '#' },
  { id: 'inv-2026-007', businessId: 'bus-1', businessName: 'Isle Spice Grill & Lounge', amountXCD: 149, amountUSD: 55, status: 'PAID', date: '2026-07-01', pdfUrl: '#' },
  { id: 'inv-2026-006', businessId: 'bus-2', businessName: 'Kairi Artisanal Boutique', amountXCD: 49, amountUSD: 18, status: 'PAID', date: '2026-08-01', pdfUrl: '#' },
];

export const INITIAL_USAGE_LIMITS: UsageLimits = {
  businessId: 'bus-1',
  aiPostsUsed: 42,
  aiPostsLimit: 1000,
  aiImagesUsed: 18,
  aiImagesLimit: 100,
  socialAccountsConnected: 5,
  socialAccountsLimit: 10,
};
