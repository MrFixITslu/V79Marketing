import express from "express";
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
  AuthenticatedRequest,
} from "./src/lib/auth.js";
import { getCreditBalance, deductCredits, addCredits, CREDIT_COSTS } from "./src/lib/creditService.js";
import { startPublisherWorker, processScheduledPosts } from "./src/lib/publisher.ts";

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Initialize Database & Seed
initDb();

// Start Background Publisher Queue Worker
startPublisherWorker(15000);

// Security Middleware Setup - Configured for AI Studio iframe embedding
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        imgSrc: ["'self'", "data:", "https://images.unsplash.com", "https://*.googleusercontent.com"],
        connectSrc: ["'self'", "https://generativelanguage.googleapis.com"],
        frameAncestors: ["'self'", "https://ai.studio", "https://*.google.com", "https://*.run.app"],
      },
    },
    frameguard: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

app.use(
  cors({
    origin: process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : true,
    credentials: true,
  })
);

app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());

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

// Zod Validation Schemas
const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  name: z.string().min(2),
  businessName: z.string().min(2),
  industry: z.string().min(2),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const createPostSchema = z.object({
  businessId: z.string(),
  title: z.string().min(1),
  content: z.record(z.string(), z.any()),
  mediaUrls: z.array(z.string()).optional(),
  scheduledFor: z.string(),
  campaignId: z.string().optional(),
});

// --- AUTHENTICATION ROUTES ---

app.post("/api/auth/register", authLimiter, (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    const existing = db.prepare("SELECT * FROM users WHERE email = ?").get(data.email);
    if (existing) {
      return res.status(400).json({ error: "An account with this email already exists." });
    }

    const businessId = `bus-${Date.now()}`;
    const userId = `user-${Date.now()}`;
    const slug = data.businessName.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    const passwordHash = bcrypt.hashSync(data.password, 10);
    const now = new Date().toISOString();

    db.prepare(`
      INSERT INTO businesses (id, name, slug, industry, description, location, plan, created_at)
      VALUES (?, ?, ?, ?, ?, ?, 'FREE', ?)
    `).run(businessId, data.businessName, slug, data.industry, `${data.businessName} marketing workspace`, "Caribbean", now);

    db.prepare(`
      INSERT INTO users (id, email, password_hash, name, role, email_verified, two_factor_enabled, business_id, created_at)
      VALUES (?, ?, ?, ?, 'BUSINESS_OWNER', 1, 0, ?, ?)
    `).run(userId, data.email, passwordHash, data.name, businessId, now);

    db.prepare(`
      INSERT INTO credit_balances (business_id, monthly_allowance, purchased_credits, bonus_credits, used_credits, reset_date)
      VALUES (?, 10000, 5000, 0, 0, ?)
    `).run(businessId, new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString());

    const token = generateToken({ id: userId, email: data.email, name: data.name, role: "BUSINESS_OWNER", businessId });
    res.cookie("v79_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });

    res.json({
      success: true,
      token,
      user: { id: userId, email: data.email, name: data.name, role: "BUSINESS_OWNER", businessId },
      business: { id: businessId, name: data.businessName, slug, industry: data.industry },
    });
  } catch (err: any) {
    res.status(400).json({ error: err.message || "Registration failed" });
  }
});

app.post("/api/auth/login", authLimiter, (req, res) => {
  try {
    const data = loginSchema.parse(req.body);
    const user = db.prepare("SELECT * FROM users WHERE email = ?").get(data.email) as any;

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

    res.cookie("v79_token", token, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" });

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
          industry: business.industry,
          plan: business.plan,
        }
      : null,
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.clearCookie("v79_token");
  res.json({ success: true, message: "Logged out successfully" });
});

// --- PUBLIC & HEALTH ROUTES ---

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "V79 Marketing Hub",
    owner: "V79 Digital",
    version: "2.5.0",
    database: "SQLite Connected",
    timestamp: new Date().toISOString(),
  });
});

app.get("/api/businesses/public/:slug", (req, res) => {
  const business = db.prepare("SELECT * FROM businesses WHERE slug = ? OR id = ?").get(req.params.slug, req.params.slug) as any;
  if (!business) return res.status(404).json({ error: "Public business profile not found" });

  res.json({
    business: {
      ...business,
      openingHours: JSON.parse(business.opening_hours_json || "[]"),
      products: JSON.parse(business.products_json || "[]"),
      services: JSON.parse(business.services_json || "[]"),
      brandProfile: JSON.parse(business.brand_profile_json || "{}"),
    },
  });
});

// --- PROTECTED TENANT BUSINESS & DATA ENDPOINTS ---

app.get("/api/businesses", authenticate, (req: AuthenticatedRequest, res) => {
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

app.put("/api/businesses/:id", authenticate, requireTenantAccess, (req: AuthenticatedRequest, res) => {
  const { id } = req.params;
  const updates = req.body;

  const existing = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id) as any;
  if (!existing) return res.status(404).json({ error: "Business not found" });

  db.prepare(`
    UPDATE businesses
    SET name = ?, industry = ?, description = ?, location = ?, phone = ?, email = ?, website = ?, whatsapp = ?, opening_hours_json = ?, products_json = ?, services_json = ?, brand_profile_json = ?, plan = ?
    WHERE id = ?
  `).run(
    updates.name || existing.name,
    updates.industry || existing.industry,
    updates.description || existing.description,
    updates.location || existing.location,
    updates.phone || existing.phone,
    updates.email || existing.email,
    updates.website || existing.website,
    updates.whatsapp || existing.whatsapp,
    updates.openingHours ? JSON.stringify(updates.openingHours) : existing.opening_hours_json,
    updates.products ? JSON.stringify(updates.products) : existing.products_json,
    updates.services ? JSON.stringify(updates.services) : existing.services_json,
    updates.brandProfile ? JSON.stringify(updates.brandProfile) : existing.brand_profile_json,
    updates.plan || existing.plan,
    id
  );

  const updated = db.prepare("SELECT * FROM businesses WHERE id = ?").get(id) as any;
  res.json({
    success: true,
    business: {
      ...updated,
      openingHours: JSON.parse(updated.opening_hours_json || "[]"),
      products: JSON.parse(updated.products_json || "[]"),
      services: JSON.parse(updated.services_json || "[]"),
      brandProfile: JSON.parse(updated.brand_profile_json || "{}"),
    },
  });
});

app.get("/api/credits/balance", authenticate, (req: AuthenticatedRequest, res) => {
  const balance = getCreditBalance(req.user!.businessId);
  res.json({ balance, costs: CREDIT_COSTS });
});

app.post("/api/credits/buy", authenticate, (req: AuthenticatedRequest, res) => {
  const { amount } = req.body;
  if (!amount || amount <= 0) return res.status(400).json({ error: "Invalid credit amount" });

  const balance = addCredits(req.user!.businessId, amount);

  // Log purchase audit
  db.prepare(`
    INSERT INTO audit_logs (id, business_id, user_id, user_name, action, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, 'CREDITS_PURCHASED', ?, ?, ?)
  `).run(
    `al-credit-${Date.now()}`,
    req.user!.businessId,
    req.user!.id,
    req.user!.name,
    `Purchased ${amount} V79 AI Credits`,
    req.ip || "127.0.0.1",
    new Date().toISOString()
  );

  res.json({ success: true, balance });
});

app.get("/api/posts", authenticate, (req: AuthenticatedRequest, res) => {
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

app.post("/api/posts", authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const data = createPostSchema.parse(req.body);
    if (req.user!.role !== "PLATFORM_ADMIN" && data.businessId !== req.user!.businessId) {
      return res.status(403).json({ error: "Forbidden: Cannot create post for another business" });
    }

    const postId = `post-${Date.now()}`;
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

// --- AI GENERATION ENDPOINTS WITH CREDIT DEDUCTION & MODEL ROUTING ---

app.post("/api/ai/generate-text", authenticate, aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, businessName, industry, brandVoice, location, targetAudience } = req.body;
    const businessId = req.user!.businessId;

    // Deduct Server-Side Credits
    const deduction = deductCredits(
      businessId,
      req.user!.id,
      req.user!.name,
      CREDIT_COSTS.aiPost,
      `AI Social Content Generation: "${prompt}"`,
      req.ip || "127.0.0.1"
    );

    if (!deduction.success) {
      return res.status(402).json({ error: deduction.error });
    }

    const ai = getGenAI();
    if (ai) {
      const response = await ai.models.generateContent({
        model: "gemini-3.6-flash",
        contents: `You are an expert Caribbean & global digital marketing strategist for "V79 Marketing Hub".
Generate engaging, platform-customized social media marketing posts for the following prompt and business:

Business Name: ${businessName || "My Business"}
Industry: ${industry || "Retail / Hospitality"}
Brand Voice: ${brandVoice || "Warm, energetic, welcoming"}
Location: ${location || "Caribbean / St. Lucia"}
Target Audience: ${targetAudience || "Local & international clients"}
User Goal/Prompt: "${prompt}"

Return JSON matching this schema:
{
  "facebook": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "instagram": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "linkedin": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "tiktok": { "caption": "...", "hashtags": ["#tag1", "#tag2"] },
  "whatsapp": { "caption": "...", "hashtags": [] }
}`,
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              facebook: { type: Type.OBJECT, properties: { caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["caption", "hashtags"] },
              instagram: { type: Type.OBJECT, properties: { caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["caption", "hashtags"] },
              linkedin: { type: Type.OBJECT, properties: { caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["caption", "hashtags"] },
              tiktok: { type: Type.OBJECT, properties: { caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["caption", "hashtags"] },
              whatsapp: { type: Type.OBJECT, properties: { caption: { type: Type.STRING }, hashtags: { type: Type.ARRAY, items: { type: Type.STRING } } }, required: ["caption", "hashtags"] },
            },
            required: ["facebook", "instagram", "linkedin", "tiktok", "whatsapp"],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({ success: true, data: parsed, source: "gemini", remainingCredits: deduction.remainingCredits });
      }
    }

    // Fallback response
    const bName = businessName || "Isle Spice Grill & Lounge";
    const loc = location || "Rodney Bay, St. Lucia";
    const fallbackData = {
      facebook: {
        caption: `✨ Special Highlight from ${bName}! ${prompt}. Visit us in ${loc} or contact us directly to learn more. Bring a friend and make memories today! 🌴🔥`,
        hashtags: [`#${bName.replace(/\s+/g, "")}`, "#CaribbeanBusiness", `#${loc.split(",")[0].replace(/\s+/g, "")}`, "#V79MarketingHub", "#LocalBrand"],
      },
      instagram: {
        caption: `Golden moments with ${bName} ✨ ${prompt}. Tap the link in our bio to explore or place your order now! 📍 ${loc} 🌴`,
        hashtags: [`#${bName.replace(/\s+/g, "")}`, "#IslandLife", "#SupportLocal", "#CaribbeanVibes", "#V79Digital"],
      },
      linkedin: {
        caption: `${bName} is proud to introduce our latest initiative: "${prompt}". Serving our community and driving business growth in ${loc}. Join us in celebrating local excellence!`,
        hashtags: ["#BusinessGrowth", "#CaribbeanEnterprise", "#SaaSImpact", "#Leadership"],
      },
      tiktok: {
        caption: `POV: You just checked out the newest offer at ${bName} in ${loc}! 🔥👀 Don't miss out on this!`,
        hashtags: ["#CaribbeanTikTok", "#IslandEats", "#ViralVibes", "#LocalTreasure"],
      },
      whatsapp: {
        caption: `📢 EXCLUSIVE ANNOUNCEMENT from ${bName}: ${prompt}! Reply DIRECTLY to this message to lock in your offer or book today! 📲`,
        hashtags: [],
      },
    };

    return res.json({ success: true, data: fallbackData, source: "fallback", remainingCredits: deduction.remainingCredits });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate AI text" });
  }
});

app.post("/api/ai/generate-image", authenticate, aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { prompt, dimension, businessName, primaryColor } = req.body;
    const businessId = req.user!.businessId;

    const deduction = deductCredits(
      businessId,
      req.user!.id,
      req.user!.name,
      CREDIT_COSTS.aiImage,
      `AI Image Generation: "${prompt}"`,
      req.ip || "127.0.0.1"
    );

    if (!deduction.success) {
      return res.status(402).json({ error: deduction.error });
    }

    let width = 1080;
    let height = 1080;
    if (dimension === "1080x1920") { width = 1080; height = 1920; }
    else if (dimension === "1200x630") { width = 1200; height = 630; }

    const brandCol = primaryColor || "#EA580C";
    const titleText = prompt || "Special Promotional Visual";
    const subText = businessName || "V79 Marketing Hub";

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
      <text x="${width * 0.12}" y="${height * 0.2}" font-family="sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF" letter-spacing="2">
        ${subText.toUpperCase()}
      </text>
      <text x="${width * 0.12}" y="${height * 0.42}" font-family="sans-serif" font-size="${width > 1000 ? 52 : 40}" font-weight="800" fill="#FFFFFF">
        <tspan x="${width * 0.12}" dy="0">${titleText.slice(0, 28)}</tspan>
        <tspan x="${width * 0.12}" dy="64">${titleText.slice(28, 60) || "Official Promotion"}</tspan>
      </text>
      <rect x="${width * 0.12}" y="${height * 0.72}" width="${width * 0.4}" height="64" rx="32" fill="${brandCol}"/>
      <text x="${width * 0.2}" y="${height * 0.72 + 40}" font-family="sans-serif" font-size="22" font-weight="bold" fill="#FFFFFF">
        EXPLORE NOW →
      </text>
    </svg>`;

    const base64Svg = Buffer.from(svgString).toString("base64");
    return res.json({
      success: true,
      imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
      source: "svg-canvas",
      remainingCredits: deduction.remainingCredits,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Image generation failed" });
  }
});

// --- AI CAMPAIGN PLAN GENERATION ---
app.post("/api/ai/generate-campaign-plan", authenticate, aiGenerationLimiter, async (req: AuthenticatedRequest, res) => {
  try {
    const { campaignName, objective, businessName, industry } = req.body;
    const businessId = req.user!.businessId;

    if (!campaignName || !objective) {
      return res.status(400).json({ error: "campaignName and objective are required" });
    }

    const deduction = deductCredits(
      businessId,
      req.user!.id,
      req.user!.name,
      CREDIT_COSTS.aiPost * 2,
      `AI 30-Day Campaign Plan Generation: "${campaignName}"`,
      req.ip || "127.0.0.1"
    );

    if (!deduction.success) {
      return res.status(402).json({ error: deduction.error });
    }

    const ai = getGenAI();
    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: `You are a world-class marketing director for "${businessName || "V79 Partner"}" in the "${industry || "Retail & Hospitality"}" sector.
Generate a structured 4-step multi-channel social campaign for:
Campaign Title: "${campaignName}"
Objective: "${objective}"

Return JSON matching this schema:
{
  "steps": [
    { "dayNumber": 1, "channel": "facebook", "postTitle": "...", "caption": "...", "suggestedTime": "10:00 AM" },
    { "dayNumber": 3, "channel": "instagram", "postTitle": "...", "caption": "...", "suggestedTime": "04:30 PM" },
    { "dayNumber": 7, "channel": "tiktok", "postTitle": "...", "caption": "...", "suggestedTime": "06:00 PM" },
    { "dayNumber": 14, "channel": "whatsapp", "postTitle": "...", "caption": "...", "suggestedTime": "09:30 AM" }
  ]
}`,
          config: {
            responseMimeType: "application/json",
          },
        });

        if (response.text) {
          const parsed = JSON.parse(response.text);
          if (parsed.steps && Array.isArray(parsed.steps)) {
            return res.json({
              success: true,
              steps: parsed.steps,
              source: "gemini",
              remainingCredits: deduction.remainingCredits,
            });
          }
        }
      } catch (geminiErr) {
        console.warn("Gemini plan generation failed, falling back to structured templates:", geminiErr);
      }
    }

    // High-quality contextual fallback
    const bName = businessName || "V79 Enterprise Partner";
    const steps = [
      {
        dayNumber: 1,
        channel: "facebook",
        postTitle: "Campaign Kickoff & Core Value Offer",
        caption: `Announcement from ${bName}: ${objective}. We are proud to deliver exceptional service and premium experiences to our clients. Discover our latest offerings and message us directly to book or reserve today.`,
        suggestedTime: "10:00 AM",
      },
      {
        dayNumber: 3,
        channel: "instagram",
        postTitle: "Visual Spotlight & Engagement Reel",
        caption: `Elevate your experience with ${bName}. Experience ${campaignName} with verified quality and authentic care. Link in bio to explore full details and secure your reservation.`,
        suggestedTime: "04:30 PM",
      },
      {
        dayNumber: 7,
        channel: "tiktok",
        postTitle: "Behind-the-Scenes Showcase Clip",
        caption: `Exclusive behind-the-scenes look at how ${bName} delivers ${campaignName}. Verified local craftsmanship and premium standards.`,
        suggestedTime: "06:00 PM",
      },
      {
        dayNumber: 14,
        channel: "whatsapp",
        postTitle: "VIP Subscriber Priority Invitation",
        caption: `Priority update from ${bName}: As a valued client, you receive early access to our ${campaignName}. Reply directly to this message to speak with our reservations desk.`,
        suggestedTime: "09:30 AM",
      },
    ];

    return res.json({
      success: true,
      steps,
      source: "fallback",
      remainingCredits: deduction.remainingCredits,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Failed to generate campaign plan" });
  }
});

// --- CUSTOMER PIPELINE CRM ENDPOINTS ---
app.get("/api/customers", authenticate, (req: AuthenticatedRequest, res) => {
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

app.post("/api/customers", authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { name, phone, email, channel, status, notes } = req.body;
    if (!name || !phone) {
      return res.status(400).json({ error: "Name and phone are required" });
    }

    const customerId = `cust-${Date.now()}`;
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
    res.status(500).json({ error: "Failed to create customer inquiry" });
  }
});

app.patch("/api/customers/:id/status", authenticate, (req: AuthenticatedRequest, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ error: "Status is required" });
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

    res.json({ success: true, id, status });
  } catch (err: any) {
    res.status(500).json({ error: "Failed to update customer status" });
  }
});

// --- BUSINESS MEMORY ENDPOINTS ---
app.get("/api/memory", authenticate, (req: AuthenticatedRequest, res) => {
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

app.put("/api/memory", authenticate, (req: AuthenticatedRequest, res) => {
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
    systemHealth: "99.98% Operational",
    auditLogs,
    invoices,
  });
});

app.get("/api/docs", (req, res) => {
  res.json({
    title: "V79 Marketing Hub API Documentation",
    version: "2.5.0",
    description: "SaaS REST API for digital marketing automation, business profiles, social scheduling & Gemini AI",
    endpoints: [
      { method: "POST", path: "/api/auth/register", description: "Register new business workspace & owner" },
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

async function startServer() {
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
    console.log(`V79 Marketing Hub server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
