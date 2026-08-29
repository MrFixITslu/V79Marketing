export type UserRole = 'PLATFORM_ADMIN' | 'BUSINESS_OWNER' | 'MARKETING_STAFF' | 'CONTENT_CREATOR';

export type PlanTier = 'FREE' | 'STARTER' | 'GROWTH' | 'PROFESSIONAL' | 'ENTERPRISE';

export type PostStatus = 'DRAFT' | 'PENDING_APPROVAL' | 'SCHEDULED' | 'PUBLISHED' | 'FAILED';

export type SocialPlatform = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'tiktok' | 'google_business' | 'whatsapp';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  avatarUrl?: string;
  emailVerified: boolean;
  twoFactorEnabled: boolean;
  businessId: string;
  createdAt: string;
}

export interface ProductService {
  id: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl?: string;
}

export interface OpeningHours {
  day: string;
  open: string;
  close: string;
  closed: boolean;
}

export interface BrandProfile {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  brandVoice: string; // e.g., "Warm, Caribbean hospitable, energetic, professional"
  targetAudience: string;
  keywords: string[];
  tagline: string;
  fonts?: {
    heading: string;
    body: string;
  };
}

export interface CreditBalance {
  businessId: string;
  monthlyAllowance: number; // e.g., 200,000 for Growth
  purchasedCredits: number;
  bonusCredits: number;
  usedCredits: number;
  resetDate: string;
}

export interface CreditCostConfig {
  aiPost: number; // e.g., 25
  aiImage: number; // e.g., 100
  campaign30Day: number; // e.g., 300
  aiVideo: number; // e.g., 500
  reviewResponse: number; // e.g., 15
  competitorAudit: number; // e.g., 50
}

export interface AIBusinessBrain {
  businessId: string;
  description: string;
  productsAndServices: string[];
  brandVoiceAndTone: string;
  targetAudience: string;
  customerDemographics: string;
  primaryGoals: string[];
  frequentlyAskedQuestions: Array<{ q: string; a: string }>;
  seasonalPromotions: string[];
  preferredPostingTimes: string;
  preferredHashtags: string[];
  previousCampaignNotes: string;
}

export interface PriorityTask {
  id: string;
  title: string;
  impact: 'HIGH' | 'MEDIUM' | 'LOW';
  creditsReward: number;
  done: boolean;
  actionView?: string;
}

export interface MarketingScoreData {
  overallScore: number; // 0-100
  healthStatus: 'Excellent' | 'Good' | 'Needs Attention' | 'Critical';
  breakdown: {
    brandCompleteness: number;
    postingConsistency: number;
    websiteOptimization: number;
    socialProfileCompleteness: number;
    seoReadiness: number;
    reviewActivity: number;
    aiUtilization: number;
  };
  priorityTasks: PriorityTask[];
  recommendations: string[];
}

export interface WeeklyHealthReport {
  weekDate: string;
  overallScore: number;
  topPerformingContent: string;
  weakestChannel: string;
  recommendedCampaign: string;
  suggestedPostingFrequency: string;
  caribbeanEventFocus: string;
  growthOpportunities: string[];
  customerEngagementSummary: string;
}

export interface CustomerReview {
  id: string;
  businessId: string;
  customerName: string;
  platform: 'google_business' | 'facebook' | 'tripadvisor';
  rating: number; // 1-5
  comment: string;
  date: string;
  sentiment: 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE';
  aiSuggestedResponse?: string;
  responded: boolean;
}

export interface Competitor {
  id: string;
  businessId: string;
  name: string;
  handle: string;
  platform: SocialPlatform;
  postingFrequency: string;
  estimatedReach: string;
  topTopics: string[];
  opportunityGap: string;
  lastAnalyzed: string;
}

export interface CaribbeanEvent {
  id: string;
  name: string;
  dateOrSeason: string;
  region: string;
  category: 'Culture' | 'Carnival' | 'Tourism' | 'National' | 'Sport';
  description: string;
  campaignIdea: string;
}

export interface VideoScene {
  sceneNumber: number;
  visualPrompt: string;
  overlayText: string;
}

export interface VideoCaption {
  timestamp: string;
  text: string;
}

export interface GeneratedVideo {
  id: string;
  businessId?: string;
  title: string;
  prompt?: string;
  durationSeconds: number;
  aspectRatio: '9:16' | '16:9' | '1:1';
  theme?: string;
  audioTrack: string;
  videoUrl: string;
  thumbnailUrl: string;
  captions?: VideoCaption[];
  scenes?: VideoScene[];
  status?: 'READY' | 'GENERATING' | 'FAILED';
  createdAt?: string;
}

export interface Business {
  id: string;
  name: string;
  slug: string; // e.g. v79marketing.com/business/isle-spice-grill
  logoUrl: string;
  coverImageUrl: string;
  industry: string;
  description: string;
  location: string;
  phone: string;
  email: string;
  website: string;
  whatsapp: string;
  openingHours: OpeningHours[];
  products: ProductService[];
  services: ProductService[];
  brandProfile: BrandProfile;
  plan: PlanTier;
  createdAt: string;
}

export interface SocialAccount {
  id: string;
  businessId: string;
  platform: SocialPlatform;
  accountName: string;
  accountHandle: string;
  connected: boolean;
  followerCount: number;
  lastSyncedAt: string;
}

export interface PostPlatformContent {
  caption: string;
  hashtags: string[];
  imageUrl?: string;
}

export interface Post {
  id: string;
  businessId: string;
  authorId: string;
  authorName: string;
  title: string;
  content: {
    facebook?: PostPlatformContent;
    instagram?: PostPlatformContent;
    linkedin?: PostPlatformContent;
    tiktok?: PostPlatformContent;
    whatsapp?: PostPlatformContent;
    twitter?: PostPlatformContent;
    google_business?: PostPlatformContent;
  };
  mediaUrls: string[];
  scheduledFor: string;
  status: PostStatus;
  campaignId?: string;
  analytics?: {
    reach: number;
    impressions: number;
    engagement: number;
    clicks: number;
  };
  createdAt: string;
}

export interface CampaignStep {
  dayNumber: number;
  channel: SocialPlatform;
  postTitle: string;
  captionPrompt: string;
  suggestedTime: string;
  completed: boolean;
}

export interface Campaign {
  id: string;
  businessId: string;
  name: string;
  objective: string;
  startDate: string;
  endDate: string;
  status: 'ACTIVE' | 'PLANNED' | 'COMPLETED';
  steps: CampaignStep[];
  aiPlanGenerated: boolean;
  createdAt: string;
}

export interface GeneratedImage {
  id: string;
  businessId: string;
  prompt: string;
  dimension: '1080x1080' | '1080x1920' | '1200x630' | '1200x627';
  platformTarget: string;
  imageUrl: string;
  createdAt: string;
}

export interface AuditLog {
  id: string;
  businessId: string;
  userId: string;
  userName: string;
  action: string;
  details: string;
  ipAddress: string;
  timestamp: string;
}

export interface Invoice {
  id: string;
  businessId: string;
  businessName: string;
  amountXCD: number;
  amountUSD: number;
  status: 'PAID' | 'PENDING' | 'OVERDUE';
  date: string;
  pdfUrl: string;
}

export interface UsageLimits {
  businessId: string;
  aiPostsUsed: number;
  aiPostsLimit: number;
  aiImagesUsed: number;
  aiImagesLimit: number;
  socialAccountsConnected: number;
  socialAccountsLimit: number;
}

export interface UtmTrackingParams {
  source?: string;
  medium?: string;
  campaign?: string;
  term?: string;
  content?: string;
  capturedAt?: string;
}

export type NotificationCategory = 'CAMPAIGN_MILESTONE' | 'LOW_CREDIT' | 'NEW_REVIEW' | 'SYSTEM' | 'SECURITY';

export interface InAppNotification {
  id: string;
  businessId: string;
  category: NotificationCategory;
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  severity: 'info' | 'warning' | 'success' | 'alert';
  actionTab?: string;
}

export type CustomerStatus = 'NEW_INQUIRY' | 'INTERESTED' | 'FOLLOW_UP' | 'CUSTOMER' | 'REPEAT_CUSTOMER';

export interface CustomerInquiry {
  id: string;
  businessId: string;
  name: string;
  phone: string;
  email?: string;
  channel: 'whatsapp' | 'facebook' | 'google_business' | 'website';
  status: CustomerStatus;
  notes?: string;
  lastContactedAt?: string;
  createdAt: string;
}

export interface GrowthPlanTask {
  id: string;
  businessId: string;
  weekNumber: 1 | 2 | 3 | 4;
  title: string;
  category: string;
  description: string;
  completed: boolean;
  actionView?: string;
}

export interface BusinessMemory {
  businessId: string;
  approvedClaims: string[];
  usps: string[];
  faqs: Array<{ q: string; a: string }>;
  preferredCtas: string[];
  brandVoice: string;
  updatedAt: string;
}

export interface MarketingAuditItem {
  id: string;
  businessId: string;
  title: string;
  severity: 'HIGH' | 'MEDIUM' | 'LOW';
  category: string;
  issueDescription: string;
  fixRecommendation: string;
  resolved: boolean;
  actionTarget?: string;
}


