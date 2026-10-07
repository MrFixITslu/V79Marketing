import express from "express";
import crypto from "crypto";
import path from "path";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { db, initDb } from "./src/lib/db.js";
import {
  generateToken,
  verifyToken,
  authenticate,
  requireTenantAccess,
  requireRole,
  requireMarketingPermission,
  AuthenticatedRequest,
} from "./src/lib/auth.js";
import { getCreditBalance, deductCredits, addCredits, refundCredits, CREDIT_COSTS } from "./src/lib/creditService.js";
import { startPublisherWorker, processScheduledPosts } from "./src/lib/publisher.ts";
import { consumeHubLaunchTicket, verifyHubProvisionRequest, verifyHubSummaryRequest } from "./src/lib/platform.js";
import { deprovisionHubTeamIdentity, provisionHubIdentity } from "./src/lib/hubProvisioning.js";
import { queueMarketingEvent, startPlatformEventPump } from "./src/lib/platformEvents.js";
import { decryptToken, encryptToken } from "./src/lib/tokenVault.js";
import { buildAuthorizationUrl, exchangeOAuthCode, providerStatus, queryTikTokCreatorInfo, refreshProviderAccess, revokeProviderAuthorization, type ProviderAccountRecord, type ProviderPlatform } from "./src/lib/socialProviders.js";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

initDb();

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "blob:", "https:"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
      },
    },
    frameguard: { action: "deny" },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "same-origin" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
  })
);

const allowedOrigins = String(process.env.ALLOWED_ORIGINS || "").split(",").map(v => v.trim()).filter(Boolean);
if (allowedOrigins.length) {
  app.use(cors({ origin: allowedOrigins, credentials: true }));
}

app.use(express.json({ limit: "2mb", verify: (req:any, _res, body) => { req.rawBody = Buffer.from(body); } }));
app.use(cookieParser());

function canonicalOrigin(req: express.Request) {
  const configured = String(process.env.APP_URL || "").trim();
  if (configured) {
    try { return new URL(configured).origin; } catch {}
  }
  return `${req.protocol}://${req.get("host")}`;
}

app.use((req, res, next) => {
  if (["GET","HEAD","OPTIONS"].includes(req.method) || !req.path.startsWith("/api/") || req.path.startsWith("/api/platform/")) return next();
  const origin = req.headers.origin;
  if (!origin) return res.status(403).json({ error: "Origin header required." });
  try {
    if (new URL(origin).origin !== canonicalOrigin(req)) return res.status(403).json({ error: "Cross-site request denied." });
  } catch {
    return res.status(403).json({ error: "Cross-site request denied." });
  }
  next();
});

// Rate Limiting Rules
const globalApiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many requests from this IP, please try again after 15 minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "Too many login/registration attempts. Please try again later." },
});

const aiGenerationLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 15,
  message: { error: "AI rate limit reached. Please wait 1 minute before generating more content." },
});

app.use("/api/", globalApiLimiter);

// AI Client Initialization
function getGenAI() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "MY_GEMINI_API_KEY") {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        "User-Agent": "aistudio-build",
      },
    },
  });
}

async function tryOllamaJson(prompt: string) {
  const baseUrl = String(process.env.OLLAMA_BASE_URL || "").trim();
  const model = String(process.env.OLLAMA_MODEL || "qwen2.5:3b").trim();
  if (!baseUrl || !model) return null;
  try {
    const response = await fetch(new URL("/api/generate", baseUrl), {
      method:"POST",
      headers:{"content-type":"application/json"},
      body:JSON.stringify({
        model,
        prompt,
        format:"json",
        stream:false,
        keep_alive:"10m",
        options:{temperature:0.6},
      }),
      signal:AbortSignal.timeout(45_000),
    });
    if (!response.ok) throw new Error(`Ollama HTTP ${response.status}`);
    const body:any = await response.json();
    if (!body?.response) return null;
    return JSON.parse(body.response);
  } catch (error:any) {
    console.warn("[V79 Marketing] Ollama generation unavailable:", error?.message || error);
    return null;
  }
}

// Zod Validation Schemas
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createPostSchema = z.object({
  businessId: z.string().min(1).max(180),
  title: z.string().trim().min(1).max(300),
  content: z.record(z.string(), z.any()).refine(value => Object.keys(value).length <= 10, "Too many platform payloads."),
  mediaUrls: z.array(z.string().max(5000)).max(10).optional(),
  scheduledFor: z.string().datetime(),
  campaignId: z.string().max(180).optional(),
});

const createCampaignSchema = z.object({
  name: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(2000),
  startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  status: z.enum(["ACTIVE","PLANNED","COMPLETED"]).default("ACTIVE"),
  steps: z.array(z.record(z.string(), z.any())).max(100).default([]),
  aiPlanGenerated: z.boolean().default(false),
}).refine(data => data.endDate >= data.startDate, {
  message:"Campaign end date must be on or after the start date.",
  path:["endDate"],
});

const businessUpdateSchema = z.object({
  name: z.string().trim().min(1).max(180).optional(),
  slug: z.string().trim().toLowerCase().regex(/^[a-z0-9][a-z0-9-]{0,99}$/).optional(),
  logoUrl: z.string().max(5000).optional(),
  coverImageUrl: z.string().max(5000).optional(),
  industry: z.string().trim().max(180).optional(),
  description: z.string().max(8000).optional(),
  location: z.string().max(500).optional(),
  phone: z.string().max(100).optional(),
  email: z.union([z.string().email().max(320), z.literal("")]).optional(),
  website: z.string().max(1000).optional(),
  whatsapp: z.string().max(100).optional(),
  openingHours: z.array(z.object({
    day:z.string().max(30),
    open:z.string().max(30),
    close:z.string().max(30),
    closed:z.boolean(),
  })).max(14).optional(),
  products: z.array(z.object({
    id:z.string().max(180),
    name:z.string().max(300),
    description:z.string().max(4000),
    price:z.string().max(100),
    category:z.string().max(180),
    imageUrl:z.string().max(5000).optional(),
  })).max(250).optional(),
  services: z.array(z.object({
    id:z.string().max(180),
    name:z.string().max(300),
    description:z.string().max(4000),
    price:z.string().max(100),
    category:z.string().max(180),
    imageUrl:z.string().max(5000).optional(),
  })).max(250).optional(),
  brandProfile: z.object({
    primaryColor:z.string().max(50).optional(),
    secondaryColor:z.string().max(50).optional(),
    accentColor:z.string().max(50).optional(),
    brandVoice:z.string().max(3000).optional(),
    targetAudience:z.string().max(3000).optional(),
    keywords:z.array(z.string().max(180)).max(100).optional(),
    tagline:z.string().max(500).optional(),
    fonts:z.object({
      heading:z.string().max(180).optional(),
      body:z.string().max(180).optional(),
    }).optional(),
  }).optional(),
});

const LEGAL_VERSION = "2026-10-06" as const;
const socialPlatformSchema = z.enum(["facebook","instagram","linkedin","tiktok","youtube","google_business"]);
const socialConnectSchema = z.object({
  platform:socialPlatformSchema,
  accountHandle:z.string().trim().max(180).default(""),
  acceptedPrivacy:z.literal(true),
  acceptedTerms:z.literal(true),
  legalVersion:z.literal(LEGAL_VERSION),
});

const customerCreateSchema = z.object({
  name:z.string().trim().min(1).max(180),
  phone:z.string().trim().min(1).max(100),
  email:z.union([z.string().trim().email().max(320), z.literal("")]).optional(),
  channel:z.enum(["whatsapp","facebook","google_business","website"]).default("whatsapp"),
  status:z.enum(["NEW_INQUIRY","INTERESTED","FOLLOW_UP","CUSTOMER","REPEAT_CUSTOMER"]).default("NEW_INQUIRY"),
  notes:z.string().max(5000).optional(),
});

const generateTextSchema = z.object({
  prompt: z.string().trim().min(1).max(4000),
});

const generatedSocialCopySchema = z.object({
  facebook: z.object({ caption:z.string().max(10000), hashtags:z.array(z.string().max(120)).max(50) }),
  instagram: z.object({ caption:z.string().max(10000), hashtags:z.array(z.string().max(120)).max(50) }),
  linkedin: z.object({ caption:z.string().max(10000), hashtags:z.array(z.string().max(120)).max(50) }),
  tiktok: z.object({ caption:z.string().max(10000), hashtags:z.array(z.string().max(120)).max(50) }),
  youtube: z.object({ caption:z.string().max(5000), hashtags:z.array(z.string().max(120)).max(30) }),
  google_business: z.object({ caption:z.string().max(1500), hashtags:z.array(z.string().max(120)).max(20) }),
  whatsapp: z.object({ caption:z.string().max(10000), hashtags:z.array(z.string().max(120)).max(50) }),
});

const generateCampaignPlanSchema = z.object({
  campaignName: z.string().trim().min(1).max(160),
  objective: z.string().trim().min(1).max(2000),
});

const generatedCampaignStepSchema = z.object({
  dayNumber: z.coerce.number().int().min(1).max(90),
  channel: z.enum(["facebook","instagram","linkedin","tiktok","youtube","whatsapp","twitter","google_business"]),
  postTitle: z.string().max(500),
  caption: z.string().max(10000).optional(),
  captionPrompt: z.string().max(10000).optional(),
  suggestedTime: z.string().max(100),
});

const competitorSchema = z.object({
  name: z.string().trim().min(1).max(180),
  handle: z.string().trim().min(1).max(180),
  platform: z.enum(["facebook","instagram","linkedin","twitter","tiktok","youtube","google_business","whatsapp"]).default("instagram"),
});

const generatedAssetSchema = z.object({
  prompt: z.string().min(1).max(800),
  dimension: z.enum(["1080x1080", "1080x1920", "1200x630", "1200x627"]),
  platformTarget: z.string().min(1).max(120),
  imageUrl: z.string().min(1).max(1500000).refine(value => value.startsWith("data:image/svg+xml;base64,"), "Only V79-generated SVG assets can be stored."),
});

const visualTemplateSchema = z.object({
  prompt: z.string().min(1).max(800),
  dimension: z.enum(["1080x1080", "1080x1920", "1200x630", "1200x627"]).default("1080x1080"),
});

const businessBrainSchema = z.object({
  description: z.string().max(4000).default(""),
  productsAndServices: z.array(z.string().max(500)).max(100).default([]),
  brandVoiceAndTone: z.string().max(1500).default("Professional and trustworthy"),
  targetAudience: z.string().max(2000).default(""),
  customerDemographics: z.string().max(2000).default(""),
  primaryGoals: z.array(z.string().max(500)).max(50).default([]),
  frequentlyAskedQuestions: z.array(z.object({
    q: z.string().max(1000),
    a: z.string().max(2000),
  })).max(100).default([]),
  seasonalPromotions: z.array(z.string().max(500)).max(50).default([]),
  preferredPostingTimes: z.string().max(1000).default(""),
  preferredHashtags: z.array(z.string().max(120)).max(100).default([]),
  previousCampaignNotes: z.string().max(4000).default(""),
});

// --- AUTHENTICATION ROUTES ---

app.post("/api/auth/register", authLimiter, (_req, res) => {
  const hubUrl = String(process.env.V79_HUB_PUBLIC_URL || "https://hub.v79sl.com").replace(/\/$/, "");
  return res.status(410).json({
    error: "V79 Marketing accounts are created and managed by V79 Hub.",
    code: "HUB_SIGNUP_REQUIRED",
    hubUrl,
  });
});

app.post("/api/auth/login", authLimiter, (req, res) => {
  if (process.env.V79_ALLOW_LEGACY_LOGIN !== "1") {
    const hubUrl = String(process.env.V79_HUB_PUBLIC_URL || "https://hub.v79sl.com").replace(/\/$/, "");
    return res.status(410).json({ error: "Sign in through V79 Hub.", code: "HUB_AUTH_REQUIRED", hubUrl });
  }
  try {
    const data = loginSchema.parse(req.body);
    const user = db.prepare("SELECT * FROM users WHERE email = ? AND hub_user_id IS NULL").get(data.email) as any;
    if (!user || !bcrypt.compareSync(data.password, user.password_hash)) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken({
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      businessId: user.business_id,
    });

    res.cookie("v79_marketing_session", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", maxAge: 30 * 60 * 1000, path: "/" });

    res.json({
      success: true,
      token,
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        avatarUrl: user.avatar_url,
        emailVerified: Boolean(user.email_verified),
        twoFactorEnabled: Boolean(user.two_factor_enabled),
        businessId: user.business_id,
        createdAt: user.created_at,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Login failed" });
  }
});

app.get("/api/auth/me", authenticate, (req: AuthenticatedRequest, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.user!.id) as any;
  if (!user) return res.status(404).json({ error: "User not found" });

  const business = db.prepare("SELECT * FROM businesses WHERE id = ?").get(user.business_id) as any;

  res.json({
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      avatarUrl: user.avatar_url,
      emailVerified: Boolean(user.email_verified),
      twoFactorEnabled: Boolean(user.two_factor_enabled),
      businessId: user.business_id,
      createdAt: user.created_at,
    },
    business: business
      ? {
          id: business.id,
          name: business.name,
          slug: business.slug,
          logoUrl: business.logo_url || "",
          coverImageUrl: business.cover_image_url || "",
          industry: business.industry,
          description: business.description || "",
          location: business.location || "",
          phone: business.phone || "",
          email: business.email || "",
          website: business.website || "",
          whatsapp: business.whatsapp || "",
          openingHours: JSON.parse(business.opening_hours_json || "[]"),
          products: JSON.parse(business.products_json || "[]"),
          services: JSON.parse(business.services_json || "[]"),
          brandProfile: JSON.parse(business.brand_profile_json || "{}"),
          plan: business.plan,
          createdAt: business.created_at,
        }
      : null,
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("v79_marketing_session", { path: "/" });
  res.json({ success: true, message: "Logged out successfully" });
});


// --- V79 HUB ACCESS & PLATFORM CONTRACTS ---

function cleanValue(value: unknown) {
  return typeof value === "string" ? value.trim().replace(/^['"]|['"]$/g, "") : "";
}

app.post("/api/platform/provision", (req:any, res) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const organization = body.organization && typeof body.organization === "object" && !Array.isArray(body.organization) ? body.organization : {};
  const user = body.user && typeof body.user === "object" && !Array.isArray(body.user) ? body.user : {};
  const organizationId = cleanValue(organization.id);
  const organizationName = cleanValue(organization.name);
  const organizationSlug = cleanValue(organization.slug).toLowerCase();
  const hubUserId = cleanValue(user.id);
  const email = cleanValue(user.email).toLowerCase();
  const name = cleanValue(user.name) || email.split("@")[0] || "";

  const rawBody = req.rawBody?.toString("utf8") || JSON.stringify(body);
  if (!verifyHubProvisionRequest({
    method: req.method,
    pathname: req.path,
    timestamp: cleanValue(req.get("x-v79-timestamp")),
    signature: cleanValue(req.get("x-v79-signature")),
    serviceId: cleanValue(req.get("x-v79-service-id")),
    body: rawBody,
  })) return res.status(401).json({ error: "Invalid V79 Hub signature." });

  if (
    body.role !== "owner" ||
    !/^[A-Za-z0-9._:@-]{8,180}$/.test(organizationId) ||
    organizationName.length < 1 || organizationName.length > 180 ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(organizationSlug) ||
    !/^[A-Za-z0-9._:@-]{8,180}$/.test(hubUserId) ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    name.length < 1 || name.length > 180
  ) return res.status(400).json({ error: "Invalid Marketing provisioning request." });

  try {
    const local = provisionHubIdentity({
      user: { id: hubUserId, email, name },
      organization: { id: organizationId, name: organizationName, slug: organizationSlug },
      role: "owner",
      plan: body.plan || "hub",
      entitlement: { product: "marketing", enabled: true },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      provisioned: true,
      organizationId,
      ownerHubUserId: hubUserId,
      businessId: local.businessId,
      userId: local.userId,
    });
  } catch (error:any) {
    console.warn("[V79 Marketing] provisioning denied:", error?.message || error);
    return res.status(409).json({ error: "Marketing workspace provisioning could not be completed." });
  }
});

app.post("/api/platform/members/provision", (req:any, res) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const organization = body.organization && typeof body.organization === "object" && !Array.isArray(body.organization) ? body.organization : {};
  const user = body.user && typeof body.user === "object" && !Array.isArray(body.user) ? body.user : {};
  const organizationId = cleanValue(organization.id);
  const organizationName = cleanValue(organization.name);
  const organizationSlug = cleanValue(organization.slug).toLowerCase();
  const hubUserId = cleanValue(user.id);
  const email = cleanValue(user.email).toLowerCase();
  const name = cleanValue(user.name) || email.split("@")[0] || "";
  const role = cleanValue(body.role) as "manager" | "staff" | "viewer";

  const rawBody = req.rawBody?.toString("utf8") || JSON.stringify(body);
  if (!verifyHubProvisionRequest({
    method: req.method,
    pathname: req.path,
    timestamp: cleanValue(req.get("x-v79-timestamp")),
    signature: cleanValue(req.get("x-v79-signature")),
    serviceId: cleanValue(req.get("x-v79-service-id")),
    body: rawBody,
  })) return res.status(401).json({ error: "Invalid V79 Hub signature." });

  if (
    !["manager", "staff", "viewer"].includes(role) ||
    !/^[A-Za-z0-9._:@-]{8,180}$/.test(organizationId) ||
    organizationName.length < 1 || organizationName.length > 180 ||
    !/^[a-z0-9][a-z0-9-]{0,99}$/.test(organizationSlug) ||
    !/^[A-Za-z0-9._:@-]{8,180}$/.test(hubUserId) ||
    !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ||
    name.length < 1 || name.length > 180
  ) return res.status(400).json({ error: "Invalid Marketing team provisioning request." });

  try {
    const local = provisionHubIdentity({
      user: { id: hubUserId, email, name },
      organization: { id: organizationId, name: organizationName, slug: organizationSlug },
      role,
      plan: body.plan || "hub",
      entitlement: { product: "marketing", enabled: true },
    });
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      provisioned: true,
      organizationId,
      hubUserId,
      businessId: local.businessId,
      userId: local.userId,
      localRole: local.role,
    });
  } catch (error:any) {
    console.warn("[V79 Marketing] team provisioning denied:", error?.message || error);
    return res.status(409).json({ error: "Marketing team member provisioning could not be completed." });
  }
});

app.post("/api/platform/members/deprovision", (req:any, res) => {
  const body = req.body && typeof req.body === "object" && !Array.isArray(req.body) ? req.body : {};
  const organizationId = cleanValue(body.organizationId);
  const user = body.user && typeof body.user === "object" && !Array.isArray(body.user) ? body.user : {};
  const hubUserId = cleanValue(user.id);
  const rawBody = req.rawBody?.toString("utf8") || JSON.stringify(body);

  if (!verifyHubProvisionRequest({
    method: req.method,
    pathname: req.path,
    timestamp: cleanValue(req.get("x-v79-timestamp")),
    signature: cleanValue(req.get("x-v79-signature")),
    serviceId: cleanValue(req.get("x-v79-service-id")),
    body: rawBody,
  })) return res.status(401).json({ error: "Invalid V79 Hub signature." });

  if (
    !/^[A-Za-z0-9._:@-]{8,180}$/.test(organizationId) ||
    !/^[A-Za-z0-9._:@-]{8,180}$/.test(hubUserId)
  ) return res.status(400).json({ error: "Invalid Marketing team deprovisioning request." });

  try {
    const removed = deprovisionHubTeamIdentity(organizationId, hubUserId);
    res.setHeader("Cache-Control", "no-store");
    return res.json({
      deprovisioned: true,
      organizationId,
      hubUserId,
      businessId: removed.businessId,
      userId: removed.userId || null,
      alreadyAbsent: removed.alreadyAbsent,
    });
  } catch (error:any) {
    console.warn("[V79 Marketing] team deprovisioning denied:", error?.message || error);
    return res.status(409).json({ error: error?.message || "Marketing team member could not be deprovisioned." });
  }
});

app.get("/api/platform/start", (_req, res) => {
  const hubUrl = String(process.env.V79_HUB_PUBLIC_URL || "https://hub.v79sl.com").replace(/\/$/, "");
  res.redirect(302, `${hubUrl}/?return=marketing`);
});

app.get("/api/platform/hub", (_req, res) => {
  const hubUrl = String(process.env.V79_HUB_PUBLIC_URL || "https://hub.v79sl.com").replace(/\/$/, "");
  res.redirect(302, hubUrl);
});

app.get("/api/platform/launch", authLimiter, async (req, res) => {
  const ticket = cleanValue(req.query.ticket);
  if (!ticket || !/^[A-Za-z0-9_-]{32,180}$/.test(ticket)) {
    return res.status(400).send("Invalid V79 Hub launch ticket.");
  }
  try {
    const hubSession = await consumeHubLaunchTicket(ticket);
    const local = provisionHubIdentity(hubSession);
    const token = generateToken({
      id: local.userId,
      email: hubSession.user.email,
      name: hubSession.user.name,
      role: local.role,
      businessId: local.businessId,
    });
    res.cookie("v79_marketing_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 30 * 60 * 1000,
      path: "/",
    });
    return res.redirect(302, "/");
  } catch (error:any) {
    console.warn("[V79 Marketing] Hub launch denied:", error?.message || error);
    const target = new URL(String(process.env.V79_HUB_PUBLIC_URL || "https://hub.v79sl.com").replace(/\/$/, ""));
    target.searchParams.set("return", "marketing");
    target.searchParams.set("error", "launch_denied");
    return res.redirect(302, target.toString());
  }
});

app.get("/api/platform/summary/:subject", (req, res) => {
  const timestamp = cleanValue(req.get("x-v79-timestamp"));
  const signature = cleanValue(req.get("x-v79-signature"));
  const serviceId = cleanValue(req.get("x-v79-service-id"));
  if (!verifyHubSummaryRequest({
    method: req.method,
    pathname: req.path,
    timestamp,
    signature,
    serviceId,
  })) return res.status(401).json({ error: "Invalid V79 Hub signature." });

  const subject = cleanValue(req.params.subject);
  const business = db.prepare("SELECT id,name,plan,created_at FROM businesses WHERE hub_organization_id=? OR id=? LIMIT 1").get(subject, subject) as any;
  if (!business) return res.status(404).json({ error: "Marketing workspace not found." });

  const scalar = (sql: string, ...params: any[]) => Number((db.prepare(sql).get(...params) as any)?.count || 0);
  const statusRows = db.prepare("SELECT status,COUNT(*) AS count FROM posts WHERE business_id=? GROUP BY status").all(business.id) as any[];
  const customerRows = db.prepare("SELECT status,COUNT(*) AS count FROM customers WHERE business_id=? GROUP BY status").all(business.id) as any[];
  const postsByStatus = Object.fromEntries(statusRows.map(row => [row.status, Number(row.count)]));
  const customersByStatus = Object.fromEntries(customerRows.map(row => [row.status, Number(row.count)]));
  const credit = db.prepare("SELECT monthly_allowance,purchased_credits,bonus_credits,used_credits FROM credit_balances WHERE business_id=?").get(business.id) as any;

  res.json({
    product: "marketing",
    subjectId: business.id,
    generatedAt: new Date().toISOString(),
    workspace: { name: business.name, plan: business.plan, createdAt: business.created_at },
    metrics: {
      posts: scalar("SELECT COUNT(*) AS count FROM posts WHERE business_id=?", business.id),
      scheduledPosts: postsByStatus.SCHEDULED || 0,
      publishedPosts: postsByStatus.PUBLISHED || 0,
      campaigns: scalar("SELECT COUNT(*) AS count FROM campaigns WHERE business_id=?", business.id),
      activeCampaigns: scalar("SELECT COUNT(*) AS count FROM campaigns WHERE business_id=? AND status='ACTIVE'", business.id),
      customers: scalar("SELECT COUNT(*) AS count FROM customers WHERE business_id=?", business.id),
      repeatCustomers: customersByStatus.REPEAT_CUSTOMER || 0,
      connectedSocialAccounts: scalar("SELECT COUNT(*) AS count FROM social_accounts WHERE business_id=? AND connected=1", business.id),
      aiCreditsRemaining: credit ? Math.max(0, Number(credit.monthly_allowance)+Number(credit.purchased_credits)+Number(credit.bonus_credits)-Number(credit.used_credits)) : 0,
    },
  });
});


function verifyHubPlatformAdmin(req: express.Request) {
  const timestamp = cleanValue(req.get("x-v79-timestamp"));
  const signature = cleanValue(req.get("x-v79-signature"));
  const serviceId = cleanValue(req.get("x-v79-service-id"));
  return verifyHubSummaryRequest({
    method: req.method,
    pathname: req.path,
    timestamp,
    signature,
    serviceId,
  });
}

app.get("/api/platform/admin/stats", (req, res) => {
  if (!verifyHubPlatformAdmin(req)) return res.status(401).json({ error: "Invalid V79 Hub signature." });
  try {
    const scalar = (sql: string, ...params: any[]) => Number((db.prepare(sql).get(...params) as any)?.count || 0);
    const revenue = db.prepare("SELECT COALESCE(SUM(amount_xcd),0) AS xcd, COALESCE(SUM(amount_usd),0) AS usd FROM invoices WHERE status='PAID'").get() as any;
    const credit = db.prepare("SELECT COALESCE(SUM(monthly_allowance+purchased_credits+bonus_credits),0) AS available, COALESCE(SUM(used_credits),0) AS used FROM credit_balances").get() as any;

    res.json({
      totalBusinesses: scalar("SELECT COUNT(*) AS count FROM businesses"),
      totalUsers: scalar("SELECT COUNT(*) AS count FROM users"),
      totalPosts: scalar("SELECT COUNT(*) AS count FROM posts"),
      scheduledPosts: scalar("SELECT COUNT(*) AS count FROM posts WHERE status='SCHEDULED'"),
      publishedPosts: scalar("SELECT COUNT(*) AS count FROM posts WHERE status='PUBLISHED'"),
      totalCampaigns: scalar("SELECT COUNT(*) AS count FROM campaigns"),
      activeCampaigns: scalar("SELECT COUNT(*) AS count FROM campaigns WHERE status='ACTIVE'"),
      activeSubscriptions: scalar("SELECT COUNT(*) AS count FROM businesses WHERE UPPER(plan) <> 'FREE'"),
      connectedSocialAccounts: scalar("SELECT COUNT(*) AS count FROM social_accounts WHERE connected=1"),
      platformRevenueXcd: Number(revenue?.xcd || 0),
      platformRevenueUsd: Number(revenue?.usd || 0),
      aiCreditsAllocated: Number(credit?.available || 0),
      aiCreditsUsed: Number(credit?.used || 0),
      generatedAt: new Date().toISOString(),
    });
  } catch (error:any) {
    console.error("[platform-admin] Marketing stats failed:", error?.message || error);
    res.status(500).json({ error: "Unable to build Marketing platform statistics." });
  }
});

app.get("/api/platform/admin/businesses", (req, res) => {
  if (!verifyHubPlatformAdmin(req)) return res.status(401).json({ error: "Invalid V79 Hub signature." });
  try {
    const businesses = db.prepare(
      "SELECT id,name,industry,location,plan,hub_organization_id,created_at FROM businesses ORDER BY created_at DESC"
    ).all() as any[];

    const rows = businesses.map((business:any) => {
      const userCount = Number((db.prepare("SELECT COUNT(*) AS count FROM users WHERE business_id=?").get(business.id) as any)?.count || 0);
      const postCount = Number((db.prepare("SELECT COUNT(*) AS count FROM posts WHERE business_id=?").get(business.id) as any)?.count || 0);
      const campaignCount = Number((db.prepare("SELECT COUNT(*) AS count FROM campaigns WHERE business_id=?").get(business.id) as any)?.count || 0);
      const socialCount = Number((db.prepare("SELECT COUNT(*) AS count FROM social_accounts WHERE business_id=? AND connected=1").get(business.id) as any)?.count || 0);
      const credit = db.prepare("SELECT monthly_allowance,purchased_credits,bonus_credits,used_credits FROM credit_balances WHERE business_id=?").get(business.id) as any;
      const allocated = credit ? Number(credit.monthly_allowance)+Number(credit.purchased_credits)+Number(credit.bonus_credits) : 0;
      const used = credit ? Number(credit.used_credits) : 0;
      return {
        id: business.id,
        name: business.name,
        industry: business.industry || "",
        location: business.location || "",
        plan: business.plan || "HUB",
        hubOrganizationId: business.hub_organization_id || null,
        createdAt: business.created_at,
        userCount,
        postCount,
        campaignCount,
        connectedSocialAccounts: socialCount,
        aiCreditsUsed: used,
        aiCreditsRemaining: Math.max(0, allocated-used),
      };
    });

    res.json(rows);
  } catch (error:any) {
    console.error("[platform-admin] Marketing businesses failed:", error?.message || error);
    res.status(500).json({ error: "Unable to list Marketing workspaces." });
  }
});

// --- PUBLIC & HEALTH ROUTES ---

app.get("/api/health", (_req, res) => {
  try {
    db.prepare("SELECT 1").get();
    res.json({
      status: "ok",
      app: "V79 Marketing",
      owner: "V79 Digital",
      version: "3.0.0",
      authentication: "V79 Hub managed",
      database: "SQLite",
      timestamp: new Date().toISOString(),
    });
  } catch {
    res.status(503).json({ status: "storage_unavailable", app: "V79 Marketing" });
  }
});

app.get("/api/businesses/public/:slug", (req, res) => {
  const business = db.prepare("SELECT * FROM businesses WHERE slug = ? OR id = ?").get(req.params.slug, req.params.slug) as any;
  if (!business) return res.status(404).json({ error: "Public business profile not found" });

  res.json({
    business: {
      id: business.id,
      name: business.name,
      slug: business.slug,
      logoUrl: business.logo_url || "",
      coverImageUrl: business.cover_image_url || "",
      industry: business.industry || "",
      description: business.description || "",
      location: business.location || "",
      phone: business.phone || "",
      email: business.email || "",
      website: business.website || "",
      whatsapp: business.whatsapp || "",
      openingHours: JSON.parse(business.opening_hours_json || "[]"),
      products: JSON.parse(business.products_json || "[]"),
      services: JSON.parse(business.services_json || "[]"),
      brandProfile: JSON.parse(business.brand_profile_json || "{}"),
      createdAt: business.created_at,
    },
  });
});

// --- PROTECTED TENANT BUSINESS & DATA ENDPOINTS ---

app.get("/api/businesses", authenticate, requireMarketingPermission("business.read"), (req: AuthenticatedRequest, res) => {
  let rows: any[];
  if (req.user!.role === "PLATFORM_ADMIN") {
    rows = db.prepare("SELECT * FROM businesses").all();
  } else {
    rows = db.prepare("SELECT * FROM businesses WHERE id = ?").all(req.user!.businessId);
  }

  const businesses = rows.map((b) => ({
    ...b,
    openingHours: JSON.parse(b.opening_hours_json || "[]"),
    products: JSON.parse(b.products_json || "[]"),
    services: JSON.parse(b.services_json || "[]"),
    brandProfile: JSON.parse(b.brand_profile_json || "{}"),
  }));

  res.json({ businesses });
});

app.put("/api/businesses/:id", authenticate, requireMarketingPermission("business.write"), requireTenantAccess, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const parsed = businessUpdateSchema.safeParse(req.body);
  if (!parsed.success) {
    const firstIssue = parsed.error.issues[0]?.message || "Profile data failed validation.";
    return res.status(400).json({
      error:`Invalid business profile update: ${firstIssue}`,
      details:parsed.error.flatten(),
    });
  }
  const updates = parsed.data;

  const existing = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Business not found" });

  const nextSlug = updates.slug ?? existing.slug;
  if (nextSlug !== existing.slug) {
    const collision = db.prepare("SELECT id FROM businesses WHERE slug=? AND id<>?").get(nextSlug, id);
    if (collision) return res.status(409).json({ error:"That public profile URL is already in use." });
  }

  let existingBrand:any = {};
  try { existingBrand = JSON.parse(existing.brand_profile_json || "{}"); } catch {}
  const incomingBrand = updates.brandProfile || undefined;
  const nextBrand = incomingBrand ? {
    ...existingBrand,
    ...incomingBrand,
    fonts:incomingBrand.fonts ? { ...(existingBrand.fonts || {}), ...incomingBrand.fonts } : existingBrand.fonts,
  } : existingBrand;

  try {
    db.prepare(`
      UPDATE businesses
      SET name = ?, slug = ?, logo_url = ?, cover_image_url = ?, industry = ?, description = ?, location = ?,
          phone = ?, email = ?, website = ?, whatsapp = ?, opening_hours_json = ?, products_json = ?,
          services_json = ?, brand_profile_json = ?, plan = ?
      WHERE id = ?
    `).run(
      updates.name ?? existing.name,
      nextSlug,
      updates.logoUrl ?? existing.logo_url,
      updates.coverImageUrl ?? existing.cover_image_url,
      updates.industry ?? existing.industry,
      updates.description ?? existing.description,
      updates.location ?? existing.location,
      updates.phone ?? existing.phone,
      updates.email ?? existing.email,
      updates.website ?? existing.website,
      updates.whatsapp ?? existing.whatsapp,
      updates.openingHours !== undefined ? JSON.stringify(updates.openingHours) : existing.opening_hours_json,
      updates.products !== undefined ? JSON.stringify(updates.products) : existing.products_json,
      updates.services !== undefined ? JSON.stringify(updates.services) : existing.services_json,
      JSON.stringify(nextBrand),
      existing.plan,
      id
    );
  } catch (error:any) {
    if (String(error?.message || "").toLowerCase().includes("unique")) {
      return res.status(409).json({ error:"That public profile URL is already in use." });
    }
    throw error;
  }

  const updated = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id) as any;
  res.json({
    success: true,
    business: {
      id:updated.id,
      name:updated.name,
      slug:updated.slug,
      logoUrl:updated.logo_url || "",
      coverImageUrl:updated.cover_image_url || "",
      industry:updated.industry || "",
      description:updated.description || "",
      location:updated.location || "",
      phone:updated.phone || "",
      email:updated.email || "",
      website:updated.website || "",
      whatsapp:updated.whatsapp || "",
      openingHours:JSON.parse(updated.opening_hours_json || "[]"),
      products:JSON.parse(updated.products_json || "[]"),
      services:JSON.parse(updated.services_json || "[]"),
      brandProfile:JSON.parse(updated.brand_profile_json || "{}"),
      plan:updated.plan,
      createdAt:updated.created_at,
    },
  });
});

app.get("/api/credits/balance", authenticate, requireMarketingPermission("credits.read"), (req: AuthenticatedRequest, res) => {
  const balance = getCreditBalance(req.user!.businessId);
  res.json({ balance, costs: CREDIT_COSTS });
});

app.post("/api/credits/buy", authenticate, (_req, res) => {
  return res.status(410).json({
    error: "Marketing credits and subscription entitlements are managed through V79 Hub.",
    code: "HUB_BILLING_MANAGED",
  });
});

app.get("/api/posts", authenticate, requireMarketingPermission("content.read"), (req: AuthenticatedRequest, res) => {
  let rows: any[];
  if (req.user!.role === "PLATFORM_ADMIN") {
    rows = db.prepare("SELECT * FROM posts ORDER BY created_at DESC").all();
  } else {
    rows = db.prepare("SELECT * FROM posts WHERE business_id = ? ORDER BY created_at DESC").all(req.user!.businessId);
  }

  const posts = rows.map((p) => ({
    id: p.id,
    businessId: p.business_id,
    authorId: p.author_id,
    authorName: p.author_name,
    title: p.title,
    content: JSON.parse(p.content_json),
    mediaUrls: JSON.parse(p.media_urls_json || "[]"),
    scheduledFor: p.scheduled_for,
    status: p.status,
    campaignId: p.campaign_id,
    analytics: p.analytics_json ? JSON.parse(p.analytics_json) : undefined,
    createdAt: p.created_at,
  }));

  res.json({ posts });
});

app.post("/api/posts", authenticate, requireMarketingPermission("content.write"), (req: AuthenticatedRequest, res) => {
  try {
    const data = createPostSchema.parse(req.body);
    if (req.user!.role !== "PLATFORM_ADMIN" && data.businessId !== req.user!.businessId) {
      return res.status(403).json({ error: "Forbidden: Cannot create post for another business" });
    }

    if (data.campaignId) {
      const campaign = db.prepare("SELECT id FROM campaigns WHERE id=? AND business_id=?").get(data.campaignId, data.businessId);
      if (!campaign) return res.status(400).json({ error:"Campaign does not belong to this Marketing workspace." });
    }

    const postId = `post-${crypto.randomUUID()}`;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO posts (id, business_id, author_id, author_name, title, content_json, media_urls_json, scheduled_for, status, campaign_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'SCHEDULED', ?, ?)
    `).run(
      postId,
      data.businessId,
      req.user!.id,
      req.user!.name,
      data.title,
      JSON.stringify(data.content),
      JSON.stringify(data.mediaUrls || []),
      data.scheduledFor,
      data.campaignId || null,
      now
    );
    const publishablePlatforms = ["facebook","instagram","linkedin","tiktok","youtube","google_business"]
      .filter(platform => Object.prototype.hasOwnProperty.call(data.content || {}, platform));
    const insertDelivery = db.prepare(`
      INSERT OR IGNORE INTO post_deliveries
        (post_id,business_id,platform,status,attempts,updated_at)
      VALUES (?,?,?,'QUEUED',0,?)
    `);
    for (const platform of publishablePlatforms) {
      insertDelivery.run(postId, data.businessId, platform, now);
    }
    queueMarketingEvent({
      businessId: data.businessId,
      type: "marketing.post_scheduled",
      subjectId: postId,
      payload: {
        scheduledFor: data.scheduledFor,
        platformCount: Object.keys(data.content || {}).length,
        campaignLinked: Boolean(data.campaignId),
      },
    });

    res.json({
      success: true,
      post: {
        id: postId,
        businessId: data.businessId,
        authorId: req.user!.id,
        authorName: req.user!.name,
        title: data.title,
        content: data.content,
        mediaUrls: data.mediaUrls || [],
        scheduledFor: data.scheduledFor,
        status: "SCHEDULED",
        campaignId: data.campaignId,
        createdAt: now,
      },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Invalid post data" });
  }
});

app.get("/api/post-deliveries", authenticate, requireMarketingPermission("content.read"), (req: AuthenticatedRequest, res) => {
  const rows = db.prepare(`
    SELECT d.post_id,d.platform,d.status,d.provider_post_id,d.last_error,d.attempts,d.published_at,d.updated_at,
           p.title,p.scheduled_for,p.status AS post_status
    FROM post_deliveries d
    JOIN posts p ON p.id=d.post_id AND p.business_id=d.business_id
    WHERE d.business_id=?
    ORDER BY d.updated_at DESC
    LIMIT 250
  `).all(req.user!.businessId) as any[];
  res.json({
    deliveries:rows.map(row => ({
      postId:row.post_id,
      postTitle:row.title,
      platform:row.platform,
      status:row.status,
      providerPostId:row.provider_post_id || undefined,
      lastError:row.last_error || undefined,
      attempts:Number(row.attempts || 0),
      publishedAt:row.published_at || undefined,
      updatedAt:row.updated_at,
      scheduledFor:row.scheduled_for,
      postStatus:row.post_status,
    })),
  });
});

app.post("/api/post-deliveries/:postId/:platform/retry", authenticate, requireMarketingPermission("content.write"), (req: AuthenticatedRequest, res) => {
  const platform = socialPlatformSchema.safeParse(req.params.platform);
  if (!platform.success) return res.status(400).json({ error:"Unsupported publishing platform." });
  const row = db.prepare(`
    SELECT d.post_id FROM post_deliveries d
    JOIN posts p ON p.id=d.post_id AND p.business_id=d.business_id
    WHERE d.post_id=? AND d.platform=? AND d.business_id=?
  `).get(req.params.postId, platform.data, req.user!.businessId);
  if (!row) return res.status(404).json({ error:"Delivery record not found." });
  const now = new Date().toISOString();
  db.prepare(`
    UPDATE post_deliveries
    SET status='QUEUED', attempts=0, last_error=NULL, provider_post_id=NULL, published_at=NULL, updated_at=?
    WHERE post_id=? AND platform=? AND business_id=?
  `).run(now, req.params.postId, platform.data, req.user!.businessId);
  db.prepare("UPDATE posts SET status='SCHEDULED' WHERE id=? AND business_id=?").run(req.params.postId, req.user!.businessId);
  res.json({ success:true, postId:req.params.postId, platform:platform.data, status:"QUEUED", updatedAt:now });
});

// --- CAMPAIGNS & CHANNELS ---

app.get("/api/campaigns", authenticate, requireMarketingPermission("content.read"), (req: AuthenticatedRequest, res) => {
  const rows = db.prepare("SELECT * FROM campaigns WHERE business_id=? ORDER BY created_at DESC").all(req.user!.businessId) as any[];
  res.json({
    campaigns: rows.map(row => ({
      id: row.id,
      businessId: row.business_id,
      name: row.name,
      objective: row.objective,
      startDate: row.start_date,
      endDate: row.end_date,
      status: row.status,
      steps: JSON.parse(row.steps_json || "[]"),
      aiPlanGenerated: Boolean(row.ai_plan_generated),
      createdAt: row.created_at,
    })),
  });
});

app.post("/api/campaigns", authenticate, requireMarketingPermission("content.write"), (req: AuthenticatedRequest, res) => {
  try {
    const data = createCampaignSchema.parse(req.body);
    const businessId = req.user!.businessId;
    const id = `campaign-${crypto.randomUUID()}`;
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO campaigns(id,business_id,name,objective,start_date,end_date,status,steps_json,ai_plan_generated,created_at)
      VALUES(?,?,?,?,?,?,?,?,?,?)
    `).run(id,businessId,data.name,data.objective,data.startDate,data.endDate,data.status,JSON.stringify(data.steps),data.aiPlanGenerated?1:0,now);
    queueMarketingEvent({
      businessId,
      type:"marketing.campaign_created",
      subjectId:id,
      payload:{ status:data.status, stepCount:data.steps.length, aiPlanGenerated:data.aiPlanGenerated },
    });
    res.status(201).json({ campaign:{ id,businessId,...data,createdAt:now } });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Invalid campaign." });
  }
});

app.get("/api/social-providers", authenticate, requireMarketingPermission("social.read"), (_req, res) => {
  res.json({ providers:providerStatus() });
});

app.get("/api/social-accounts", authenticate, requireMarketingPermission("social.read"), (req: AuthenticatedRequest, res) => {
  const rows = db.prepare(`
    SELECT id,business_id,platform,account_name,account_handle,connected,follower_count,last_synced_at,
           provider_account_id,expires_at,token_scopes,legal_version,legal_consented_at
    FROM social_accounts WHERE business_id=? ORDER BY platform
  `).all(req.user!.businessId) as any[];
  res.json({
    socialAccounts: rows.map(row => ({
      id:row.id,
      businessId:row.business_id,
      platform:row.platform,
      accountName:row.account_name,
      accountHandle:row.account_handle,
      connected:Boolean(row.connected),
      followerCount:Number(row.follower_count || 0),
      lastSyncedAt:row.last_synced_at,
      providerAccountId:row.provider_account_id || undefined,
      expiresAt:row.expires_at || undefined,
      scopes:String(row.token_scopes || "").split(" ").filter(Boolean),
      legalVersion:row.legal_version || undefined,
      legalConsentedAt:row.legal_consented_at || undefined,
    })),
  });
});

function socialOAuthRedirectUri(platform:string) {
  const configured = String(process.env.APP_URL || "").trim();
  if (!configured) throw new Error("APP_URL must be configured before social OAuth can be used.");
  return new URL(`/api/social-accounts/oauth/${platform}/callback`, configured).toString();
}

function socialReturnUrl(status:"connected"|"error", platform:string, message?:string) {
  const configured = String(process.env.APP_URL || "").trim();
  const base = configured || "https://marketing.v79sl.com";
  const url = new URL("/", base);
  url.searchParams.set("view", "social-channels");
  url.searchParams.set("social", status);
  url.searchParams.set("platform", platform);
  if (message) url.searchParams.set("message", message.slice(0,300));
  return url.toString();
}

app.post("/api/social-accounts/connect", authenticate, requireMarketingPermission("social.write"), (req: AuthenticatedRequest, res) => {
  try {
    const data = socialConnectSchema.parse(req.body || {});
    const provider = providerStatus().find(item => item.platform === data.platform);
    if (!provider?.configured) {
      return res.status(503).json({
        error:`${data.platform.replace("_"," ")} OAuth credentials are not configured on this V79 Marketing server.`,
        code:"PROVIDER_NOT_CONFIGURED",
      });
    }

    const state = crypto.randomBytes(32).toString("base64url");
    const stateHash = crypto.createHash("sha256").update(state).digest("hex");
    const now = new Date();
    const expires = new Date(now.getTime() + 10 * 60 * 1000);
    db.prepare("DELETE FROM social_oauth_states WHERE expires_at < ?").run(now.toISOString());
    db.prepare(`
      INSERT INTO social_oauth_states
        (state_hash,business_id,user_id,platform,account_hint,legal_version,consented_at,expires_at,created_at)
      VALUES(?,?,?,?,?,?,?,?,?)
    `).run(
      stateHash,
      req.user!.businessId,
      req.user!.id,
      data.platform,
      data.accountHandle,
      data.legalVersion,
      now.toISOString(),
      expires.toISOString(),
      now.toISOString()
    );

    const redirectUri = socialOAuthRedirectUri(data.platform);
    const authorizationUrl = buildAuthorizationUrl(data.platform as ProviderPlatform, state, redirectUri);
    res.json({ authorizationUrl, expiresAt:expires.toISOString() });
  } catch (error:any) {
    if (error instanceof z.ZodError) return res.status(400).json({ error:"Invalid social provider connection request.", details:error.flatten() });
    res.status(400).json({ error:error?.message || "Could not start provider OAuth." });
  }
});

app.get("/api/social-accounts/oauth/:platform/callback", async (req, res) => {
  const platformParsed = socialPlatformSchema.safeParse(req.params.platform);
  const platform = platformParsed.success ? platformParsed.data : null;
  if (!platform) return res.status(400).send("Unsupported social provider.");

  const state = cleanValue(req.query.state);
  const code = cleanValue(req.query.code);
  const providerError = cleanValue(req.query.error_description) || cleanValue(req.query.error);
  if (providerError) return res.redirect(302, socialReturnUrl("error", platform, providerError));
  if (!state || !code) return res.redirect(302, socialReturnUrl("error", platform, "Provider callback was missing the OAuth code or state."));

  const stateHash = crypto.createHash("sha256").update(state).digest("hex");
  const saved = db.prepare("SELECT * FROM social_oauth_states WHERE state_hash=?").get(stateHash) as any;
  if (!saved) return res.redirect(302, socialReturnUrl("error", platform, "This provider connection request is invalid or has already been used."));
  db.prepare("DELETE FROM social_oauth_states WHERE state_hash=?").run(stateHash);

  if (saved.platform !== platform || Date.parse(saved.expires_at) < Date.now()) {
    return res.redirect(302, socialReturnUrl("error", platform, "This provider connection request has expired. Start the connection again."));
  }
  const liveUser = db.prepare("SELECT id FROM users WHERE id=? AND business_id=?").get(saved.user_id, saved.business_id);
  if (!liveUser) return res.redirect(302, socialReturnUrl("error", platform, "V79 Hub access for this workspace is no longer active."));

  try {
    const redirectUri = socialOAuthRedirectUri(platform);
    const connection = await exchangeOAuthCode(platform as ProviderPlatform, code, redirectUri, String(saved.account_hint || ""));
    if (!connection.providerAccountId) throw new Error("Provider account identity was not returned.");

    const now = new Date().toISOString();
    const existing = db.prepare(`
      SELECT id FROM social_accounts WHERE business_id=? AND platform=? AND provider_account_id=?
    `).get(saved.business_id, platform, connection.providerAccountId) as any;
    const id = existing?.id || `social-${crypto.randomUUID()}`;
    const accessTokenEnc = encryptToken(connection.accessToken);
    const refreshTokenEnc = encryptToken(connection.refreshToken || null);
    const metadata = JSON.stringify(connection.metadata || {});
    const scopes = (connection.scopes || []).join(" ");

    if (existing) {
      db.prepare(`
        UPDATE social_accounts SET account_name=?, account_handle=?, connected=1, access_token_enc=?,
          refresh_token_enc=?, expires_at=?, provider_metadata_json=?, token_scopes=?,
          legal_version=?, legal_consented_at=?, last_synced_at=?
        WHERE id=? AND business_id=?
      `).run(
        connection.accountName, connection.accountHandle, accessTokenEnc, refreshTokenEnc,
        connection.expiresAt || null, metadata, scopes,
        String(saved.legal_version || LEGAL_VERSION), String(saved.consented_at || now),
        now, id, saved.business_id
      );
    } else {
      db.prepare(`
        INSERT INTO social_accounts
          (id,business_id,platform,account_name,account_handle,connected,follower_count,access_token_enc,
           refresh_token_enc,expires_at,provider_account_id,provider_metadata_json,token_scopes,
           legal_version,legal_consented_at,last_synced_at)
        VALUES(?,?,?,?,?,1,0,?,?,?,?,?,?,?,?,?)
      `).run(
        id, saved.business_id, platform, connection.accountName, connection.accountHandle,
        accessTokenEnc, refreshTokenEnc, connection.expiresAt || null, connection.providerAccountId,
        metadata, scopes, String(saved.legal_version || LEGAL_VERSION), String(saved.consented_at || now), now
      );
    }

    db.prepare(`
      INSERT INTO audit_logs(id,business_id,user_id,user_name,action,details,ip_address,timestamp)
      SELECT ?,?,?,?,?,?,?,?
    `).run(
      `audit-${crypto.randomUUID()}`,
      saved.business_id,
      saved.user_id,
      "V79 Hub User",
      "SOCIAL_PROVIDER_CONNECTED",
      JSON.stringify({ platform, providerAccountId:connection.providerAccountId, legalVersion:String(saved.legal_version || LEGAL_VERSION) }),
      String(req.ip || "unknown"),
      now
    );

    return res.redirect(302, socialReturnUrl("connected", platform));
  } catch (error:any) {
    console.warn(`[Social OAuth] ${platform} connection failed:`, error?.message || error);
    return res.redirect(302, socialReturnUrl("error", platform, error?.message || "Provider connection failed."));
  }
});

app.get("/api/social-accounts/tiktok/creator-info", authenticate, requireMarketingPermission("social.read"), async (req: AuthenticatedRequest, res) => {
  const row = db.prepare(`
    SELECT * FROM social_accounts
    WHERE business_id=? AND platform='tiktok' AND connected=1
    ORDER BY last_synced_at DESC LIMIT 1
  `).get(req.user!.businessId) as any;
  if (!row) return res.status(404).json({ error:"Connect TikTok before loading creator publishing options." });

  try {
    let account:ProviderAccountRecord = {
      platform:"tiktok",
      providerAccountId:String(row.provider_account_id || ""),
      accessToken:decryptToken(row.access_token_enc),
      refreshToken:row.refresh_token_enc ? decryptToken(row.refresh_token_enc) : undefined,
      expiresAt:row.expires_at || null,
      metadata:JSON.parse(row.provider_metadata_json || "{}"),
    };
    const refreshed = await refreshProviderAccess(account);
    if (refreshed.accessToken !== account.accessToken || refreshed.refreshToken !== account.refreshToken || refreshed.expiresAt !== account.expiresAt) {
      db.prepare(`
        UPDATE social_accounts
        SET access_token_enc=?, refresh_token_enc=?, expires_at=?, last_synced_at=?
        WHERE id=? AND business_id=?
      `).run(
        encryptToken(refreshed.accessToken),
        encryptToken(refreshed.refreshToken || null),
        refreshed.expiresAt || null,
        new Date().toISOString(),
        row.id,
        req.user!.businessId
      );
      account = refreshed;
    }
    const creator = await queryTikTokCreatorInfo(account);
    res.json({ creator });
  } catch (error:any) {
    res.status(502).json({ error:error?.message || "TikTok creator publishing options could not be loaded." });
  }
});

app.delete("/api/social-accounts/:id", authenticate, requireMarketingPermission("social.write"), async (req: AuthenticatedRequest, res) => {
  const existing = db.prepare("SELECT * FROM social_accounts WHERE id=? AND business_id=?").get(req.params.id, req.user!.businessId) as any;
  if (!existing) return res.status(404).json({ error:"Social connection not found." });

  try {
    if ((existing.platform === "youtube" || existing.platform === "google_business") && existing.access_token_enc) {
      const account:ProviderAccountRecord = {
        platform:existing.platform,
        providerAccountId:String(existing.provider_account_id || ""),
        accessToken:decryptToken(existing.access_token_enc),
        refreshToken:existing.refresh_token_enc ? decryptToken(existing.refresh_token_enc) : undefined,
        expiresAt:existing.expires_at || null,
        metadata:JSON.parse(existing.provider_metadata_json || "{}"),
      };
      await revokeProviderAuthorization(account);
    }

    const now = new Date().toISOString();
    db.transaction(() => {
      db.prepare("DELETE FROM social_accounts WHERE id=? AND business_id=?").run(req.params.id, req.user!.businessId);
      db.prepare(`
        INSERT INTO audit_logs(id,business_id,user_id,user_name,action,details,ip_address,timestamp)
        VALUES(?,?,?,?,?,?,?,?)
      `).run(
        `audit-${crypto.randomUUID()}`,
        req.user!.businessId,
        req.user!.id,
        req.user!.name,
        "SOCIAL_PROVIDER_DISCONNECTED",
        JSON.stringify({ platform:existing.platform, providerAccountId:existing.provider_account_id || null }),
        String(req.ip || "unknown"),
        now
      );
    })();

    res.json({ success:true, id:req.params.id, platform:existing.platform, providerAuthorizationRevoked:true });
  } catch (error:any) {
    console.warn("[Social OAuth] Provider disconnect/revocation failed:", error?.message || error);
    res.status(502).json({
      error:"Provider authorization could not be revoked safely. No local connection data was deleted; retry the disconnect.",
    });
  }
});

app.post("/api/social-accounts", authenticate, requireMarketingPermission("social.write"), (_req, res) => {
  res.status(410).json({
    error:"Use the official provider OAuth connection flow.",
    code:"USE_PROVIDER_OAUTH",
  });
});

// --- TENANT COMPETITOR TRACKING ---

app.get("/api/competitors", authenticate, requireMarketingPermission("social.read"), (req: AuthenticatedRequest, res) => {
  const rows = db.prepare("SELECT * FROM competitors WHERE business_id=? ORDER BY last_analyzed DESC")
    .all(req.user!.businessId) as any[];
  res.json({
    competitors: rows.map(row => ({
      id:row.id,
      businessId:row.business_id,
      name:row.name,
      handle:row.handle,
      platform:row.platform,
      postingFrequency:row.posting_frequency,
      estimatedReach:row.estimated_reach,
      topTopics:JSON.parse(row.top_topics_json || "[]"),
      opportunityGap:row.opportunity_gap,
      lastAnalyzed:row.last_analyzed,
    })),
  });
});

app.post("/api/competitors", authenticate, requireMarketingPermission("content.write"), (req: AuthenticatedRequest, res) => {
  try {
    const data = competitorSchema.parse(req.body);
    const id = `comp-${crypto.randomUUID()}`;
    const lastAnalyzed = new Date().toISOString();
    const record = {
      id,
      businessId:req.user!.businessId,
      name:data.name,
      handle:data.handle,
      platform:data.platform,
      postingFrequency:"Not measured",
      estimatedReach:"Not measured",
      topTopics:[],
      opportunityGap:"Connect an approved data source before V79 calculates competitor benchmarks.",
      lastAnalyzed,
    };
    db.prepare(`
      INSERT INTO competitors
        (id,business_id,name,handle,platform,posting_frequency,estimated_reach,top_topics_json,opportunity_gap,last_analyzed)
      VALUES (?,?,?,?,?,?,?,?,?,?)
    `).run(
      record.id,record.businessId,record.name,record.handle,record.platform,
      record.postingFrequency,record.estimatedReach,JSON.stringify(record.topTopics),
      record.opportunityGap,record.lastAnalyzed
    );
    res.status(201).json({ competitor:record });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Invalid competitor record" });
  }
});

app.delete("/api/competitors/:id", authenticate, requireMarketingPermission("content.write"), (req: AuthenticatedRequest, res) => {
  const result = db.prepare("DELETE FROM competitors WHERE id=? AND business_id=?")
    .run(req.params.id, req.user!.businessId);
  if (!result.changes) return res.status(404).json({ error:"Competitor record not found" });
  res.json({ success:true, id:req.params.id });
});

// --- TENANT MEDIA ASSETS ---

app.get("/api/assets", authenticate, requireMarketingPermission("content.read"), (req: AuthenticatedRequest, res) => {
  const rows = db.prepare("SELECT * FROM media_assets WHERE business_id=? ORDER BY created_at DESC LIMIT 200")
    .all(req.user!.businessId) as any[];
  res.json({
    assets: rows.map(row => ({
      id:row.id,
      businessId:row.business_id,
      prompt:row.prompt,
      dimension:row.dimension,
      platformTarget:row.platform_target,
      imageUrl:row.image_url,
      createdAt:row.created_at,
    })),
  });
});

app.post("/api/assets", authenticate, requireMarketingPermission("content.write"), (req: AuthenticatedRequest, res) => {
  try {
    const data = generatedAssetSchema.parse(req.body);
    const id = `asset-${crypto.randomUUID()}`;
    const createdAt = new Date().toISOString();
    db.prepare(`
      INSERT INTO media_assets (id,business_id,prompt,dimension,platform_target,image_url,created_at)
      VALUES (?,?,?,?,?,?,?)
    `).run(id,req.user!.businessId,data.prompt,data.dimension,data.platformTarget,data.imageUrl,createdAt);
    res.status(201).json({
      asset:{ id,businessId:req.user!.businessId,...data,createdAt },
    });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Invalid media asset" });
  }
});

// --- AI GENERATION ENDPOINTS WITH CREDIT DEDUCTION & MODEL ROUTING ---

app.post("/api/ai/generate-text", authenticate, requireMarketingPermission("ai.use"), aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt } = generateTextSchema.parse(req.body);
    const businessId = req.user!.businessId;
    const balance = getCreditBalance(businessId);
    if (balance.remainingCredits < CREDIT_COSTS.aiPost) {
      return res.status(402).json({
        error:`Monthly V79 AI allowance reached. Required: ${CREDIT_COSTS.aiPost}, Available: ${balance.remainingCredits}. Manage your plan in V79 Hub.`,
      });
    }

    const business = db.prepare("SELECT name,industry,description,location,brand_profile_json,products_json,services_json FROM businesses WHERE id=?")
      .get(businessId) as any;
    if (!business) return res.status(404).json({ error:"Business workspace not found" });
    const brainRow = db.prepare("SELECT brain_json FROM business_brains WHERE business_id=?").get(businessId) as any;
    const verifiedContext = {
      businessName:business.name,
      industry:business.industry,
      description:business.description || "",
      location:business.location || "",
      brandProfile:JSON.parse(business.brand_profile_json || "{}"),
      products:JSON.parse(business.products_json || "[]"),
      services:JSON.parse(business.services_json || "[]"),
      businessBrain:brainRow ? JSON.parse(brainRow.brain_json || "{}") : {},
    };

    const generationPrompt = `You are an expert Caribbean and global digital marketing strategist for V79 Marketing.
Create accurate, useful, platform-specific marketing copy. Use ONLY facts in VERIFIED_CONTEXT plus the user's requested marketing goal.
Do not invent discounts, prices, addresses, awards, stock levels, customer results, guarantees, opening hours, products, services or promotions.

VERIFIED_CONTEXT:
${JSON.stringify(verifiedContext)}

USER_GOAL:
${prompt}

Return only JSON with this exact shape:
{
  "facebook": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "instagram": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "linkedin": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "tiktok": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "youtube": { "caption": "Video description...", "hashtags": ["#tag1", "#tag2"] },
  "google_business": { "caption": "...", "hashtags": ["#tag1"] },
  "whatsapp": { "caption": "...", "hashtags": [] }
}`;

    let generated:any = null;
    let source = "";
    const ollamaData:any = await tryOllamaJson(generationPrompt);
    if (ollamaData) {
      const parsed = generatedSocialCopySchema.safeParse(ollamaData);
      if (parsed.success) {
        generated = parsed.data;
        source = "ollama";
      }
    }

    if (!generated) {
      const ai = getGenAI();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            contents: generationPrompt,
            config: { responseMimeType:"application/json" },
          });
          if (response.text) {
            const parsed = generatedSocialCopySchema.safeParse(JSON.parse(response.text));
            if (parsed.success) {
              generated = parsed.data;
              source = "gemini";
            }
          }
        } catch (error:any) {
          console.warn("[V79 Marketing] Gemini content generation unavailable:", error?.message || error);
        }
      }
    }

    if (generated) {
      const deduction = deductCredits(
        businessId,
        req.user!.id,
        req.user!.name,
        CREDIT_COSTS.aiPost,
        "AI social content generation",
        req.ip || "unknown"
      );
      if (!deduction.success) return res.status(402).json({ error:deduction.error });
      return res.json({
        success:true,
        data:generated,
        source,
        creditsCharged:CREDIT_COSTS.aiPost,
        remainingCredits:deduction.remainingCredits,
      });
    }

    const brandProfile = verifiedContext.brandProfile || {};
    const bName = String(business.name || "Your Business");
    const fallbackData = {
      facebook: { caption:`${bName}: ${prompt}. Contact us through our official channels for verified details.`, hashtags:["#CaribbeanBusiness","#V79Marketing"] },
      instagram: { caption:`${prompt} — from ${bName}. Contact us through our official profile for details.`, hashtags:["#SupportLocal","#CaribbeanBusiness"] },
      linkedin: { caption:`${bName} is sharing an update: "${prompt}". Contact us for verified details.`, hashtags:["#BusinessGrowth","#CaribbeanEnterprise"] },
      tiktok: { caption:`${bName}: ${prompt}. Check our official profile for details.`, hashtags:["#CaribbeanBusiness","#LocalBusiness"] },
      youtube: { caption:`${bName}: ${prompt}. Subscribe to our official YouTube channel for verified updates.`, hashtags:["#CaribbeanBusiness","#V79Digital"] },
      google_business: { caption:`${bName}: ${prompt}. Contact us through our official business channels for verified details.`, hashtags:["#CaribbeanBusiness"] },
      whatsapp: { caption:`Update from ${bName}: ${prompt}. Reply if you would like more information.`, hashtags:[] },
    };
    return res.json({
      success:true,
      data:fallbackData,
      source:"template",
      creditsCharged:0,
      remainingCredits:balance.remainingCredits,
      notice: brandProfile?.brandVoice ? "AI provider unavailable; returned a no-charge verified-context template." : "AI provider unavailable; returned a no-charge template.",
    });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Failed to generate marketing copy" });
  }
});

app.post("/api/ai/generate-image", authenticate, requireMarketingPermission("ai.use"), aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const data = visualTemplateSchema.parse(req.body);
    const businessId = req.user!.businessId;
    const business = db.prepare("SELECT name,brand_profile_json FROM businesses WHERE id=?").get(businessId) as any;
    if (!business) return res.status(404).json({ error:"Business workspace not found" });

    let width = 1080;
    let height = 1080;
    if (data.dimension === "1080x1920") { width = 1080; height = 1920; }
    else if (data.dimension === "1200x630" || data.dimension === "1200x627") {
      width = 1200;
      height = data.dimension === "1200x627" ? 627 : 630;
    }

    const brandProfile = JSON.parse(business.brand_profile_json || "{}");
    const requestedColor = String(brandProfile?.primaryColor || "");
    const brandCol = /^#[0-9A-Fa-f]{6}$/.test(requestedColor) ? requestedColor : "#EA580C";
    const escapeXml = (value:unknown) => String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&apos;");
    const titleText = escapeXml(data.prompt);
    const subText = escapeXml(String(business.name || "V79 Marketing").toUpperCase());

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${brandCol}"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${width * 0.3}" fill="#FFFFFF" opacity="0.08"/>
      <rect x="${width * 0.08}" y="${height * 0.08}" width="${width * 0.84}" height="${height * 0.84}" rx="24" fill="#0F172A" opacity="0.4" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2"/>
      <text x="${width * 0.12}" y="${height * 0.2}" font-family="sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF" letter-spacing="2">${subText}</text>
      <text x="${width * 0.12}" y="${height * 0.42}" font-family="sans-serif" font-size="${width > 1000 ? 52 : 40}" font-weight="800" fill="#FFFFFF">
        <tspan x="${width * 0.12}" dy="0">${titleText.slice(0, 28)}</tspan>
        <tspan x="${width * 0.12}" dy="64">${titleText.slice(28, 60) || "Official Promotion"}</tspan>
      </text>
      <rect x="${width * 0.12}" y="${height * 0.72}" width="${width * 0.4}" height="64" rx="32" fill="${brandCol}"/>
      <text x="${width * 0.2}" y="${height * 0.72 + 40}" font-family="sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">EXPLORE NOW →</text>
    </svg>`;

    const base64Svg = Buffer.from(svgString).toString("base64");
    return res.json({
      success:true,
      imageUrl:`data:image/svg+xml;base64,${base64Svg}`,
      source:"brand-template",
      creditsCharged:0,
      remainingCredits:getCreditBalance(businessId).remainingCredits,
    });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Visual generation failed" });
  }
});

// --- AI CAMPAIGN PLAN GENERATION ---
app.post("/api/ai/generate-campaign-plan", authenticate, requireMarketingPermission("ai.use"), aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignName, objective } = generateCampaignPlanSchema.parse(req.body);
    const businessId = req.user!.businessId;
    const balance = getCreditBalance(businessId);
    if (balance.remainingCredits < CREDIT_COSTS.campaign30Day) {
      return res.status(402).json({
        error:`Monthly V79 AI allowance reached. Required: ${CREDIT_COSTS.campaign30Day}, Available: ${balance.remainingCredits}. Manage your plan in V79 Hub.`,
      });
    }

    const business = db.prepare("SELECT name,industry,description,location,brand_profile_json,products_json,services_json FROM businesses WHERE id=?")
      .get(businessId) as any;
    if (!business) return res.status(404).json({ error:"Business workspace not found" });
    const brainRow = db.prepare("SELECT brain_json FROM business_brains WHERE business_id=?").get(businessId) as any;
    const verifiedContext = {
      businessName:business.name,
      industry:business.industry,
      description:business.description || "",
      location:business.location || "",
      brandProfile:JSON.parse(business.brand_profile_json || "{}"),
      products:JSON.parse(business.products_json || "[]"),
      services:JSON.parse(business.services_json || "[]"),
      businessBrain:brainRow ? JSON.parse(brainRow.brain_json || "{}") : {},
    };

    const campaignPrompt = `You are a marketing strategist.
Use ONLY facts in VERIFIED_CONTEXT and the supplied campaign objective. Do not invent discounts, prices, results, awards, availability, stock levels or product claims.
VERIFIED_CONTEXT:
${JSON.stringify(verifiedContext)}

CAMPAIGN_TITLE: ${campaignName}
OBJECTIVE: ${objective}

Return JSON only:
{
  "steps": [
    { "dayNumber": 1, "channel": "facebook", "postTitle": "...", "caption": "...", "suggestedTime": "10:00 AM" },
    { "dayNumber": 3, "channel": "instagram", "postTitle": "...", "caption": "...", "suggestedTime": "04:30 PM" },
    { "dayNumber": 7, "channel": "linkedin", "postTitle": "...", "caption": "...", "suggestedTime": "11:00 AM" },
    { "dayNumber": 10, "channel": "google_business", "postTitle": "...", "caption": "...", "suggestedTime": "09:00 AM" },
    { "dayNumber": 12, "channel": "youtube", "postTitle": "...", "caption": "...", "suggestedTime": "06:00 PM" },
    { "dayNumber": 14, "channel": "whatsapp", "postTitle": "...", "caption": "...", "suggestedTime": "09:30 AM" }
  ]
}`;

    let steps:any[] | null = null;
    let source = "";
    const parseSteps = (value:any) => {
      const result = z.array(generatedCampaignStepSchema).min(1).max(30).safeParse(value?.steps);
      return result.success ? result.data : null;
    };

    const ollamaPlan:any = await tryOllamaJson(campaignPrompt);
    steps = parseSteps(ollamaPlan);
    if (steps) source = "ollama";

    if (!steps) {
      const ai = getGenAI();
      if (ai) {
        try {
          const response = await ai.models.generateContent({
            model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
            contents:campaignPrompt,
            config:{ responseMimeType:"application/json" },
          });
          if (response.text) {
            steps = parseSteps(JSON.parse(response.text));
            if (steps) source = "gemini";
          }
        } catch (error:any) {
          console.warn("[V79 Marketing] Gemini campaign generation unavailable:", error?.message || error);
        }
      }
    }

    if (steps) {
      const deduction = deductCredits(
        businessId,
        req.user!.id,
        req.user!.name,
        CREDIT_COSTS.campaign30Day,
        `AI campaign plan: "${campaignName}"`,
        req.ip || "unknown"
      );
      if (!deduction.success) return res.status(402).json({ error:deduction.error });
      return res.json({
        success:true,
        steps,
        source,
        creditsCharged:CREDIT_COSTS.campaign30Day,
        remainingCredits:deduction.remainingCredits,
      });
    }

    const bName = String(business.name || "Your Business");
    const fallbackSteps = [
      { dayNumber:1, channel:"facebook", postTitle:"Campaign kickoff", caption:`${bName}: ${objective}. Contact us for verified details and next steps.`, suggestedTime:"10:00 AM" },
      { dayNumber:3, channel:"instagram", postTitle:"Visual spotlight", caption:`${campaignName} from ${bName}. Follow our official profile for details.`, suggestedTime:"04:30 PM" },
      { dayNumber:7, channel:"linkedin", postTitle:"Business value spotlight", caption:`A closer look at ${campaignName} from ${bName}. Contact us for verified information.`, suggestedTime:"11:00 AM" },
      { dayNumber:10, channel:"google_business", postTitle:"Google Business update", caption:`${bName}: ${campaignName}. Contact us for verified information.`, suggestedTime:"09:00 AM" },
      { dayNumber:12, channel:"youtube", postTitle:"YouTube video", caption:`${bName}: ${campaignName}. Watch our official video for verified details.`, suggestedTime:"06:00 PM" },
      { dayNumber:14, channel:"whatsapp", postTitle:"Customer follow-up", caption:`Update from ${bName}: ${campaignName}. Reply if you would like more information.`, suggestedTime:"09:30 AM" },
    ];
    return res.json({
      success:true,
      steps:fallbackSteps,
      source:"template",
      creditsCharged:0,
      remainingCredits:balance.remainingCredits,
      notice:"AI provider unavailable; returned a no-charge verified-context campaign template.",
    });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Failed to generate campaign plan" });
  }
});

// --- CUSTOMER PIPELINE CRM ENDPOINTS ---
app.get("/api/customers", authenticate, requireMarketingPermission("customers.read"), (req: AuthenticatedRequest, res) => {
  try {
    let rows: any[];
    if (req.user!.role === "PLATFORM_ADMIN") {
      rows = db.prepare("SELECT * FROM customers ORDER BY created_at DESC").all();
    } else {
      rows = db.prepare("SELECT * FROM customers WHERE business_id = ? ORDER BY created_at DESC").all(req.user!.businessId);
    }

    const customers = rows.map((c) => ({
      id: c.id,
      businessId: c.business_id,
      name: c.name,
      phone: c.phone,
      email: c.email || undefined,
      channel: c.channel,
      status: c.status,
      notes: c.notes || undefined,
      lastContactedAt: c.last_contacted_at || undefined,
      createdAt: c.created_at,
    }));

    res.json({ success: true, customers });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch customer pipeline" });
  }
});

app.post("/api/customers", authenticate, requireMarketingPermission("customers.write"), (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, email, channel, status, notes } = customerCreateSchema.parse(req.body);

    const customerId = `cust-${crypto.randomUUID()}`;
    const businessId = req.user!.businessId;
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO customers (id, business_id, name, phone, email, channel, status, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      customerId,
      businessId,
      name.trim(),
      phone.trim(),
      email ? email.trim() : null,
      channel || "whatsapp",
      status || "NEW_INQUIRY",
      notes ? notes.trim() : null,
      now
    );
    queueMarketingEvent({
      businessId,
      type: "marketing.lead_created",
      subjectId: customerId,
      payload: { channel: channel || "whatsapp", hasEmail: Boolean(email) },
    });

    res.json({
      success: true,
      customer: {
        id: customerId,
        businessId,
        name: name.trim(),
        phone: phone.trim(),
        email: email ? email.trim() : undefined,
        channel: channel || "whatsapp",
        status: status || "NEW_INQUIRY",
        notes: notes ? notes.trim() : undefined,
        createdAt: now,
      },
    });
  } catch (err: any) {
    if (err instanceof z.ZodError) return res.status(400).json({ error:"Invalid customer inquiry.", details:err.flatten() });
    res.status(500).json({ error: "Failed to create customer inquiry" });
  }
});

app.patch("/api/customers/:id/status", authenticate, requireMarketingPermission("customers.write"), (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const allowedStatuses = ["NEW_INQUIRY", "INTERESTED", "FOLLOW_UP", "CUSTOMER", "REPEAT_CUSTOMER"];
    if (!allowedStatuses.includes(String(status || ""))) {
      return res.status(400).json({ error: "Invalid customer status" });
    }

    const existing = db.prepare("SELECT * FROM customers WHERE id = ?").get(id) as any;
    if (!existing) {
      return res.status(404).json({ error: "Customer not found" });
    }

    if (req.user!.role !== "PLATFORM_ADMIN" && existing.business_id !== req.user!.businessId) {
      return res.status(403).json({ error: "Unauthorized access to customer record" });
    }

    db.prepare("UPDATE customers SET status = ?, last_contacted_at = ? WHERE id = ?").run(
      status,
      new Date().toISOString(),
      id
    );
    queueMarketingEvent({
      businessId: existing.business_id,
      type: "marketing.customer_status_changed",
      subjectId: id,
      payload: { from: existing.status, to: status },
    });

    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update customer status" });
  }
});

// --- BUSINESS MEMORY ENDPOINTS ---
app.get("/api/memory", authenticate, requireMarketingPermission("memory.read"), (req: AuthenticatedRequest, res) => {
  try {
    const memory = db.prepare("SELECT * FROM business_memories WHERE business_id = ?").get(req.user!.businessId) as any;
    if (!memory) {
      return res.json({
        success: true,
        memory: {
          businessId: req.user!.businessId,
          approvedClaims: [],
          usps: [],
          faqs: [],
          preferredCtas: [],
          brandVoice: "Professional, authoritative and client-focused",
          updatedAt: new Date().toISOString(),
        },
      });
    }

    res.json({
      success: true,
      memory: {
        businessId: memory.business_id,
        approvedClaims: JSON.parse(memory.approved_claims_json || "[]"),
        usps: JSON.parse(memory.usps_json || "[]"),
        faqs: JSON.parse(memory.faqs_json || "[]"),
        preferredCtas: JSON.parse(memory.preferred_ctas_json || "[]"),
        brandVoice: memory.brand_voice,
        updatedAt: memory.updated_at,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to fetch business memory" });
  }
});

app.put("/api/memory", authenticate, requireMarketingPermission("memory.write"), (req: AuthenticatedRequest, res) => {
  try {
    const { approvedClaims, usps, faqs, preferredCtas, brandVoice } = req.body;
    const businessId = req.user!.businessId;
    const now = new Date().toISOString();

    const existing = db.prepare("SELECT * FROM business_memories WHERE business_id = ?").get(businessId);
    if (existing) {
      db.prepare(`
        UPDATE business_memories
        SET approved_claims_json = ?, usps_json = ?, faqs_json = ?, preferred_ctas_json = ?, brand_voice = ?, updated_at = ?
        WHERE business_id = ?
      `).run(
        JSON.stringify(approvedClaims || []),
        JSON.stringify(usps || []),
        JSON.stringify(faqs || []),
        JSON.stringify(preferredCtas || []),
        brandVoice || "Professional and trustworthy",
        now,
        businessId
      );
    } else {
      db.prepare(`
        INSERT INTO business_memories (business_id, approved_claims_json, usps_json, faqs_json, preferred_ctas_json, brand_voice, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(
        businessId,
        JSON.stringify(approvedClaims || []),
        JSON.stringify(usps || []),
        JSON.stringify(faqs || []),
        JSON.stringify(preferredCtas || []),
        brandVoice || "Professional and trustworthy",
        now
      );
    }

    res.json({
      success: true,
      memory: {
        businessId,
        approvedClaims: approvedClaims || [],
        usps: usps || [],
        faqs: faqs || [],
        preferredCtas: preferredCtas || [],
        brandVoice: brandVoice || "Professional and trustworthy",
        updatedAt: now,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update business memory" });
  }
});

// --- PERSISTED AI BUSINESS BRAIN ---

function defaultBusinessBrain(businessId: string) {
  const business = db.prepare("SELECT * FROM businesses WHERE id=?").get(businessId) as any;
  const brandProfile = business ? JSON.parse(business.brand_profile_json || "{}") : {};
  const products = business ? JSON.parse(business.products_json || "[]") : [];
  const services = business ? JSON.parse(business.services_json || "[]") : [];
  return {
    businessId,
    description: business?.description || "",
    productsAndServices: [...products, ...services]
      .map((item:any) => [item?.name, item?.description].filter(Boolean).join(": "))
      .filter(Boolean)
      .slice(0, 100),
    brandVoiceAndTone: brandProfile?.brandVoice || "Professional and trustworthy",
    targetAudience: brandProfile?.targetAudience || "",
    customerDemographics: "",
    primaryGoals: [],
    frequentlyAskedQuestions: [],
    seasonalPromotions: [],
    preferredPostingTimes: "",
    preferredHashtags: Array.isArray(brandProfile?.keywords) ? brandProfile.keywords : [],
    previousCampaignNotes: "",
  };
}

app.get("/api/brain", authenticate, requireMarketingPermission("memory.read"), (req: AuthenticatedRequest, res) => {
  try {
    const row = db.prepare("SELECT brain_json,updated_at FROM business_brains WHERE business_id=?").get(req.user!.businessId) as any;
    const brain = row ? { businessId:req.user!.businessId, ...businessBrainSchema.parse(JSON.parse(row.brain_json || "{}")) } : defaultBusinessBrain(req.user!.businessId);
    res.json({ success:true, brain, updatedAt:row?.updated_at || null });
  } catch (error:any) {
    res.status(500).json({ error:error?.message || "Failed to load business brain" });
  }
});

app.put("/api/brain", authenticate, requireMarketingPermission("memory.write"), (req: AuthenticatedRequest, res) => {
  try {
    const parsed = businessBrainSchema.parse(req.body?.brain || req.body || {});
    const now = new Date().toISOString();
    db.prepare(`
      INSERT INTO business_brains (business_id,brain_json,updated_at)
      VALUES (?,?,?)
      ON CONFLICT(business_id) DO UPDATE SET brain_json=excluded.brain_json, updated_at=excluded.updated_at
    `).run(req.user!.businessId, JSON.stringify(parsed), now);
    res.json({ success:true, brain:{ businessId:req.user!.businessId, ...parsed }, updatedAt:now });
  } catch (error:any) {
    res.status(400).json({ error:error?.message || "Invalid business brain" });
  }
});

app.post("/api/ai/optimize-brain", authenticate, requireMarketingPermission("ai.use"), aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  const businessId = req.user!.businessId;
  const ip = req.ip || "unknown";
  let charged = false;
  try {
    const current = businessBrainSchema.parse(req.body?.brain || {});
    const business = db.prepare("SELECT name,industry,description,location,products_json,services_json,brand_profile_json FROM businesses WHERE id=?").get(businessId) as any;
    if (!business) return res.status(404).json({ error:"Business workspace not found" });

    const deduction = deductCredits(
      businessId,
      req.user!.id,
      req.user!.name,
      CREDIT_COSTS.brainOptimize,
      "AI Business Brain optimisation",
      ip
    );
    if (!deduction.success) return res.status(402).json({ error:deduction.error });
    charged = true;

    const verifiedContext = {
      businessName:business.name,
      industry:business.industry,
      description:business.description || "",
      location:business.location || "",
      products:JSON.parse(business.products_json || "[]"),
      services:JSON.parse(business.services_json || "[]"),
      brandProfile:JSON.parse(business.brand_profile_json || "{}"),
      currentBrain:current,
    };
    const prompt = `You are improving a business marketing knowledge profile.
Use ONLY facts in VERIFIED_CONTEXT. Do not invent customers, demographics, awards, prices, opening hours, locations, promotions, guarantees, results, products, services or FAQs.
You may improve wording, organise supplied facts, and leave fields empty when the verified context does not support them.

VERIFIED_CONTEXT:
${JSON.stringify(verifiedContext)}

Return JSON only with exactly these fields:
description, productsAndServices, brandVoiceAndTone, targetAudience, customerDemographics, primaryGoals, frequentlyAskedQuestions, seasonalPromotions, preferredPostingTimes, preferredHashtags, previousCampaignNotes.`;

    let candidate:any = await tryOllamaJson(prompt);
    if (!candidate) {
      const ai = getGenAI();
      if (ai) {
        const response = await ai.models.generateContent({
          model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
          contents: prompt,
          config: { responseMimeType:"application/json" },
        });
        if (response.text) candidate = JSON.parse(response.text);
      }
    }
    if (!candidate) throw new Error("No configured AI provider returned a result.");

    const optimized = businessBrainSchema.parse(candidate);
    res.json({
      success:true,
      brain:{ businessId, ...optimized },
      remainingCredits:deduction.remainingCredits,
      persisted:false,
      notice:"AI suggestions are ready for review. Save the Business Brain to make them authoritative.",
    });
  } catch (error:any) {
    if (charged) {
      refundCredits(businessId, req.user!.id, req.user!.name, CREDIT_COSTS.brainOptimize, "AI Business Brain optimisation failed", ip);
    }
    res.status(503).json({ error:error?.message || "Business Brain optimisation failed" });
  }
});

// --- ADMIN METRICS & AUDIT LOGS ---

app.get("/api/admin/metrics", authenticate, requireRole(["PLATFORM_ADMIN"]), (req, res) => {
  const businesses = db.prepare("SELECT * FROM businesses").all();
  const users = db.prepare("SELECT * FROM users").all();
  const posts = db.prepare("SELECT * FROM posts").all();
  const invoices = db.prepare("SELECT * FROM invoices").all() as any[];
  const auditLogs = db.prepare("SELECT * FROM audit_logs ORDER BY timestamp DESC LIMIT 50").all();

  const totalRevenueXCD = invoices.reduce((sum, inv) => sum + inv.amount_xcd, 0);
  const totalRevenueUSD = invoices.reduce((sum, inv) => sum + inv.amount_usd, 0);

  res.json({
    totalBusinesses: businesses.length,
    totalUsers: users.length,
    totalPostsScheduled: posts.filter((p: any) => p.status === "SCHEDULED").length,
    activeSubscriptions: businesses.filter((b: any) => b.plan !== "FREE").length,
    revenueXCD: totalRevenueXCD,
    revenueUSD: totalRevenueUSD,
    systemHealth: "Application responding",
    auditLogs,
    invoices,
  });
});

app.get("/api/docs", (req, res) => {
  res.json({
    title: "V79 Marketing API Documentation",
    version: "3.0.0",
    description: "V79 Marketing API for Hub-managed business marketing workflows",
    endpoints: [
      { method: "GET", path: "/api/platform/start", description: "Start Hub-managed access to V79 Marketing" },
      { method: "POST", path: "/api/platform/provision", description: "Signed V79 Hub workspace provisioning" },
      { method: "POST", path: "/api/auth/login", description: "Authenticate user & issue HTTP-Only JWT token" },
      { method: "GET", path: "/api/auth/me", description: "Get currently authenticated user & business session" },
      { method: "GET", path: "/api/health", description: "System health check" },
      { method: "POST", path: "/api/ai/generate-text", description: "Generate platform-customized marketing posts with credit validation" },
      { method: "POST", path: "/api/ai/generate-image", description: "Generate social graphics & flyers" },
      { method: "GET", path: "/api/businesses/public/:slug", description: "Get public storefront business profile" },
      { method: "GET", path: "/api/posts", description: "List all scheduled and published posts for authenticated tenant" },
      { method: "POST", path: "/api/posts", description: "Create or schedule a social post for authenticated tenant" },
      { method: "GET", path: "/api/credits/balance", description: "Get remaining V79 AI credits for workspace" },
      { method: "POST", path: "/api/credits/buy", description: "Purchase additional V79 AI credits" },
      { method: "GET", path: "/api/admin/metrics", description: "Platform administrator metrics and revenue analytics" },
    ],
  });
});

function assertProductionConfiguration() {
  if (process.env.NODE_ENV !== "production") return;
  const required = [
    ["JWT_SECRET", process.env.JWT_SECRET],
    ["V79_MARKETING_LAUNCH_SECRET", process.env.V79_MARKETING_LAUNCH_SECRET],
    ["V79_HUB_PROVISION_SECRET", process.env.V79_HUB_PROVISION_SECRET],
    ["V79_PLATFORM_SHARED_SECRET", process.env.V79_PLATFORM_SHARED_SECRET],
  ] as const;
  const missing = required
    .filter(([,value]) => String(value || "").trim().length < 32)
    .map(([name]) => name);
  if (missing.length) throw new Error(`Production configuration missing strong secrets: ${missing.join(", ")}`);
  const connectedProviderTokens = Number(
    (db.prepare("SELECT COUNT(*) AS count FROM social_accounts WHERE connected=1 AND access_token_enc IS NOT NULL").get() as any)?.count || 0
  );
  if (
    (providerStatus().some(provider => provider.configured) || connectedProviderTokens > 0) &&
    String(process.env.SOCIAL_TOKEN_ENCRYPTION_KEY || "").trim().length < 32
  ) {
    throw new Error("SOCIAL_TOKEN_ENCRYPTION_KEY must be configured with at least 32 characters whenever social providers or stored provider tokens are present.");
  }
}

async function startServer() {
  assertProductionConfiguration();
  startPublisherWorker(15000);
  startPlatformEventPump(30000);
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`V79 Marketing server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
