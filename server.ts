import express from "express";
import path from "path";
import { GoogleGenAI, Type } from "@google/genai";
import { createServer as createViteServer } from "vite";
import {
  INITIAL_BUSINESSES,
  INITIAL_USERS,
  INITIAL_SOCIAL_ACCOUNTS,
  INITIAL_POSTS,
  INITIAL_CAMPAIGNS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INVOICES,
  INITIAL_USAGE_LIMITS
} from "./src/data/mockData.js";

const app = express();
const PORT = 3000;

app.use(express.json({ limit: "10mb" }));

// Initialize GenAI client lazily or when available
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

// Memory stores for live session state
let businesses = [...INITIAL_BUSINESSES];
let users = [...INITIAL_USERS];
let socialAccounts = [...INITIAL_SOCIAL_ACCOUNTS];
let posts = [...INITIAL_POSTS];
let campaigns = [...INITIAL_CAMPAIGNS];
let auditLogs = [...INITIAL_AUDIT_LOGS];
let invoices = [...INITIAL_INVOICES];
let usageLimits = { ...INITIAL_USAGE_LIMITS };

// API Routes
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "V79 Marketing Hub",
    owner: "V79 Digital",
    version: "1.0.0",
    timestamp: new Date().toISOString(),
  });
});

// AI Text Generation Endpoint
app.post("/api/ai/generate-text", async (req, res) => {
  try {
    const { prompt, businessName, industry, brandVoice, location, targetAudience } = req.body;

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
              facebook: {
                type: Type.OBJECT,
                properties: {
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["caption", "hashtags"],
              },
              instagram: {
                type: Type.OBJECT,
                properties: {
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["caption", "hashtags"],
              },
              linkedin: {
                type: Type.OBJECT,
                properties: {
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["caption", "hashtags"],
              },
              tiktok: {
                type: Type.OBJECT,
                properties: {
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["caption", "hashtags"],
              },
              whatsapp: {
                type: Type.OBJECT,
                properties: {
                  caption: { type: Type.STRING },
                  hashtags: { type: Type.ARRAY, items: { type: Type.STRING } },
                },
                required: ["caption", "hashtags"],
              },
            },
            required: ["facebook", "instagram", "linkedin", "tiktok", "whatsapp"],
          },
        },
      });

      if (response.text) {
        const parsed = JSON.parse(response.text);
        return res.json({ success: true, data: parsed, source: "gemini" });
      }
    }

    // Fallback smart generator if Gemini key isn't provided
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

    return res.json({ success: true, data: fallbackData, source: "fallback" });
  } catch (error: any) {
    console.error("Error generating AI text:", error);
    res.status(500).json({ error: error.message || "Failed to generate AI text" });
  }
});

// AI Image Generation Endpoint
app.post("/api/ai/generate-image", async (req, res) => {
  try {
    const { prompt, dimension, businessName, primaryColor } = req.body;
    const ai = getGenAI();

    let width = 1080;
    let height = 1080;

    if (dimension === "1080x1920") {
      width = 1080;
      height = 1920;
    } else if (dimension === "1200x630") {
      width = 1200;
      height = 630;
    } else if (dimension === "1200x627") {
      width = 1200;
      height = 627;
    }

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.1-flash-lite-image",
          contents: {
            parts: [
              {
                text: `Create a professional high quality social media marketing visual for "${businessName || "V79 Business"}". Prompt: ${prompt}. Clean layout, vibrant color, brand primary color accent ${primaryColor || "#EA580C"}.`,
              },
            ],
          },
        });

        if (response.candidates?.[0]?.content?.parts) {
          for (const part of response.candidates[0].content.parts) {
            if (part.inlineData) {
              const base64Data = part.inlineData.data;
              return res.json({
                success: true,
                imageUrl: `data:image/png;base64,${base64Data}`,
                source: "gemini-image",
              });
            }
          }
        }
      } catch (geminiImgError) {
        console.warn("Gemini Image generation fallback:", geminiImgError);
      }
    }

    // Dynamic SVG Canvas Fallback Generator
    const brandCol = primaryColor || "#EA580C";
    const titleText = prompt || "Special Promotional Visual";
    const subText = businessName || "V79 Marketing Hub";

    const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <defs>
        <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${brandCol}"/>
          <stop offset="100%" stop-color="#1E293B"/>
        </linearGradient>
        <filter id="shadow">
          <feDropShadow dx="0" dy="8" stdDeviation="12" flood-opacity="0.3"/>
        </filter>
      </defs>
      <rect width="${width}" height="${height}" fill="url(#bgGrad)"/>
      <circle cx="${width * 0.85}" cy="${height * 0.15}" r="${width * 0.3}" fill="#FFFFFF" opacity="0.08"/>
      <circle cx="${width * 0.1}" cy="${height * 0.85}" r="${width * 0.25}" fill="#FFFFFF" opacity="0.05"/>
      <rect x="${width * 0.08}" y="${height * 0.08}" width="${width * 0.84}" height="${height * 0.84}" rx="24" fill="#0F172A" opacity="0.4" stroke="#FFFFFF" stroke-opacity="0.2" stroke-width="2"/>
      
      <g filter="url(#shadow)">
        <rect x="${width * 0.12}" y="${height * 0.15}" width="${width * 0.35}" height="42" rx="21" fill="#FFFFFF" opacity="0.2"/>
        <text x="${width * 0.15}" y="${height * 0.15 + 27}" font-family="sans-serif" font-size="20" font-weight="bold" fill="#FFFFFF" letter-spacing="2">
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
      </g>
    </svg>`;

    const base64Svg = Buffer.from(svgString).toString("base64");
    return res.json({
      success: true,
      imageUrl: `data:image/svg+xml;base64,${base64Svg}`,
      source: "svg-canvas",
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || "Image generation failed" });
  }
});

// AI 30-Day Campaign Plan Endpoint
app.post("/api/ai/generate-campaign-plan", async (req, res) => {
  try {
    const { campaignName, objective, businessName, industry } = req.body;
    const ai = getGenAI();

    if (ai) {
      try {
        const response = await ai.models.generateContent({
          model: "gemini-3.6-flash",
          contents: `Generate a 6-step marketing plan for a campaign titled "${campaignName}" for business "${businessName}" (${industry}). Objective: "${objective}".
Return a JSON array of steps where each object has: dayNumber (number), channel ("facebook"|"instagram"|"tiktok"|"linkedin"|"whatsapp"|"google_business"), postTitle (string), captionPrompt (string), suggestedTime (string), completed (boolean).`,
          config: {
            responseMimeType: "application/json",
            responseSchema: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  dayNumber: { type: Type.INTEGER },
                  channel: { type: Type.STRING },
                  postTitle: { type: Type.STRING },
                  captionPrompt: { type: Type.STRING },
                  suggestedTime: { type: Type.STRING },
                  completed: { type: Type.BOOLEAN },
                },
                required: ["dayNumber", "channel", "postTitle", "captionPrompt", "suggestedTime", "completed"],
              },
            },
          },
        });

        if (response.text) {
          const steps = JSON.parse(response.text);
          return res.json({ success: true, steps });
        }
      } catch (err) {
        console.warn("Campaign generation fallback:", err);
      }
    }

    // Default fallback campaign steps
    const defaultSteps = [
      { dayNumber: 1, channel: "facebook", postTitle: "Campaign Teaser & Offer Kickoff", captionPrompt: `Announce ${campaignName} kickoff offer`, suggestedTime: "10:00 AM", completed: true },
      { dayNumber: 3, channel: "instagram", postTitle: "Visual Showcase & Carousel", captionPrompt: "High impact product imagery with brand story", suggestedTime: "03:00 PM", completed: false },
      { dayNumber: 7, channel: "tiktok", postTitle: "Behind the Scenes Video Clip", captionPrompt: "Authentic short video highlighting team preparation", suggestedTime: "06:00 PM", completed: false },
      { dayNumber: 14, channel: "whatsapp", postTitle: "Exclusive VIP Subscriber Discount", captionPrompt: "Broadcast direct coupon code to top customers", suggestedTime: "09:30 AM", completed: false },
      { dayNumber: 21, channel: "linkedin", postTitle: "Industry Impact & Community Update", captionPrompt: "Professional milestone post sharing campaign success", suggestedTime: "11:00 AM", completed: false },
      { dayNumber: 30, channel: "google_business", postTitle: "Final Call Special Review & Offer", captionPrompt: "Google review drive and last chance campaign offer", suggestedTime: "02:00 PM", completed: false },
    ];

    res.json({ success: true, steps: defaultSteps });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// REST API Business Endpoints
app.get("/api/businesses", (req, res) => {
  res.json({ businesses });
});

app.get("/api/businesses/:slug", (req, res) => {
  const business = businesses.find((b) => b.slug === req.params.slug || b.id === req.params.slug);
  if (!business) {
    return res.status(404).json({ error: "Business profile not found" });
  }
  res.json({ business });
});

app.put("/api/businesses/:id", (req, res) => {
  const index = businesses.findIndex((b) => b.id === req.params.id);
  if (index === -1) {
    return res.status(404).json({ error: "Business not found" });
  }
  businesses[index] = { ...businesses[index], ...req.body };
  res.json({ success: true, business: businesses[index] });
});

// REST API Posts & Calendar
app.get("/api/posts", (req, res) => {
  res.json({ posts });
});

app.post("/api/posts", (req, res) => {
  const newPost = {
    id: `post-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  posts.unshift(newPost);
  auditLogs.unshift({
    id: `al-${Date.now()}`,
    businessId: newPost.businessId,
    userId: newPost.authorId || "user-owner-1",
    userName: newPost.authorName || "User",
    action: "POST_CREATED",
    details: `Created post: "${newPost.title}"`,
    ipAddress: req.ip || "190.102.45.12",
    timestamp: new Date().toISOString(),
  });
  res.json({ success: true, post: newPost });
});

// REST API Campaigns
app.get("/api/campaigns", (req, res) => {
  res.json({ campaigns });
});

app.post("/api/campaigns", (req, res) => {
  const newCampaign = {
    id: `camp-${Date.now()}`,
    createdAt: new Date().toISOString(),
    ...req.body,
  };
  campaigns.unshift(newCampaign);
  res.json({ success: true, campaign: newCampaign });
});

// REST API Social Accounts
app.get("/api/social-accounts", (req, res) => {
  res.json({ socialAccounts });
});

app.post("/api/social-accounts/connect", (req, res) => {
  const { platform, accountName, accountHandle } = req.body;
  const existing = socialAccounts.find((sa) => sa.platform === platform);
  if (existing) {
    existing.connected = true;
    existing.accountName = accountName || existing.accountName;
    existing.accountHandle = accountHandle || existing.accountHandle;
    existing.lastSyncedAt = new Date().toISOString();
    return res.json({ success: true, account: existing });
  }
  const newAccount = {
    id: `sa-${Date.now()}`,
    businessId: "bus-1",
    platform,
    accountName: accountName || `${platform} Business Page`,
    accountHandle: accountHandle || `@${platform}_page`,
    connected: true,
    followerCount: Math.floor(Math.random() * 5000) + 1000,
    lastSyncedAt: new Date().toISOString(),
  };
  socialAccounts.push(newAccount);
  res.json({ success: true, account: newAccount });
});

// REST API Admin Metrics & Audit Logs
app.get("/api/admin/metrics", (req, res) => {
  const totalRevenueXCD = invoices.reduce((sum, inv) => sum + inv.amountXCD, 0);
  const totalRevenueUSD = invoices.reduce((sum, inv) => sum + inv.amountUSD, 0);
  res.json({
    totalBusinesses: businesses.length,
    totalUsers: users.length,
    totalPostsScheduled: posts.filter((p) => p.status === "SCHEDULED").length,
    activeSubscriptions: businesses.filter((b) => b.plan !== "FREE").length,
    revenueXCD: totalRevenueXCD,
    revenueUSD: totalRevenueUSD,
    systemHealth: "99.98% Operational",
    auditLogs,
    invoices,
    usageLimits,
  });
});

// API Documentation Endpoint
app.get("/api/docs", (req, res) => {
  res.json({
    title: "V79 Marketing Hub API Documentation",
    version: "1.0.0",
    description: "SaaS REST API for digital marketing automation, business profiles, social scheduling & Gemini AI",
    endpoints: [
      { method: "GET", path: "/api/health", description: "System health check" },
      { method: "POST", path: "/api/ai/generate-text", description: "Generate platform-customized marketing posts" },
      { method: "POST", path: "/api/ai/generate-image", description: "Generate social graphics & flyers" },
      { method: "POST", path: "/api/ai/generate-campaign-plan", description: "Generate 30-day AI campaign plan" },
      { method: "GET", path: "/api/businesses/:slug", description: "Get public/private business profile" },
      { method: "GET", path: "/api/posts", description: "List all scheduled and published posts" },
      { method: "POST", path: "/api/posts", description: "Create or schedule a social post" },
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
