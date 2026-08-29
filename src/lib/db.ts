import Database from "better-sqlite3";
import path from "path";
import fs from "fs";
import bcrypt from "bcryptjs";
import {
  INITIAL_BUSINESSES,
  INITIAL_USERS,
  INITIAL_SOCIAL_ACCOUNTS,
  INITIAL_POSTS,
  INITIAL_CAMPAIGNS,
  INITIAL_AUDIT_LOGS,
  INITIAL_INVOICES,
  INITIAL_CREDIT_BALANCE,
  INITIAL_REVIEWS,
  INITIAL_COMPETITORS
} from "../data/mockData.js";

const dataDir = path.join(process.cwd(), "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, "v79_marketing.sqlite");
export const db = new Database(dbPath);

// Enable WAL mode for high concurrency
db.pragma("journal_mode = WAL");

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      name TEXT NOT NULL,
      role TEXT NOT NULL,
      avatar_url TEXT,
      email_verified INTEGER NOT NULL DEFAULT 1,
      verification_token TEXT,
      two_factor_enabled INTEGER NOT NULL DEFAULT 0,
      business_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS businesses (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      slug TEXT UNIQUE NOT NULL,
      logo_url TEXT,
      cover_image_url TEXT,
      industry TEXT NOT NULL,
      description TEXT,
      location TEXT,
      phone TEXT,
      email TEXT,
      website TEXT,
      whatsapp TEXT,
      opening_hours_json TEXT,
      products_json TEXT,
      services_json TEXT,
      brand_profile_json TEXT,
      plan TEXT NOT NULL DEFAULT 'FREE',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS social_accounts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      platform TEXT NOT NULL,
      account_name TEXT NOT NULL,
      account_handle TEXT NOT NULL,
      connected INTEGER NOT NULL DEFAULT 1,
      follower_count INTEGER NOT NULL DEFAULT 0,
      access_token_enc TEXT,
      refresh_token_enc TEXT,
      expires_at TEXT,
      last_synced_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      author_id TEXT NOT NULL,
      author_name TEXT NOT NULL,
      title TEXT NOT NULL,
      content_json TEXT NOT NULL,
      media_urls_json TEXT NOT NULL,
      scheduled_for TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      campaign_id TEXT,
      analytics_json TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      objective TEXT NOT NULL,
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'ACTIVE',
      steps_json TEXT NOT NULL,
      ai_plan_generated INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS credit_balances (
      business_id TEXT PRIMARY KEY,
      monthly_allowance INTEGER NOT NULL DEFAULT 200000,
      purchased_credits INTEGER NOT NULL DEFAULT 0,
      bonus_credits INTEGER NOT NULL DEFAULT 0,
      used_credits INTEGER NOT NULL DEFAULT 0,
      reset_date TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS audit_logs (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      user_name TEXT NOT NULL,
      action TEXT NOT NULL,
      details TEXT NOT NULL,
      ip_address TEXT NOT NULL,
      timestamp TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS invoices (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      business_name TEXT NOT NULL,
      amount_xcd REAL NOT NULL,
      amount_usd REAL NOT NULL,
      status TEXT NOT NULL DEFAULT 'PAID',
      date TEXT NOT NULL,
      pdf_url TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customer_reviews (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      customer_name TEXT NOT NULL,
      platform TEXT NOT NULL,
      rating INTEGER NOT NULL,
      comment TEXT NOT NULL,
      date TEXT NOT NULL,
      sentiment TEXT NOT NULL,
      ai_suggested_response TEXT,
      responded INTEGER NOT NULL DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS competitors (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      handle TEXT NOT NULL,
      platform TEXT NOT NULL,
      posting_frequency TEXT NOT NULL,
      estimated_reach TEXT NOT NULL,
      top_topics_json TEXT NOT NULL,
      opportunity_gap TEXT NOT NULL,
      last_analyzed TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS customers (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      channel TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'NEW_INQUIRY',
      notes TEXT,
      last_contacted_at TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS growth_plans (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      week_number INTEGER NOT NULL,
      title TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      completed INTEGER NOT NULL DEFAULT 0,
      action_view TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS business_memories (
      business_id TEXT PRIMARY KEY,
      approved_claims_json TEXT NOT NULL,
      usps_json TEXT NOT NULL,
      faqs_json TEXT NOT NULL,
      preferred_ctas_json TEXT NOT NULL,
      brand_voice TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS marketing_audits (
      id TEXT PRIMARY KEY,
      business_id TEXT NOT NULL,
      title TEXT NOT NULL,
      severity TEXT NOT NULL,
      category TEXT NOT NULL,
      issue_description TEXT NOT NULL,
      fix_recommendation TEXT NOT NULL,
      resolved INTEGER NOT NULL DEFAULT 0,
      action_target TEXT,
      FOREIGN KEY (business_id) REFERENCES businesses(id) ON DELETE CASCADE
    );
  `);

  seedInitialData();
}

function seedInitialData() {
  const userCount = (db.prepare("SELECT COUNT(*) as count FROM users").get() as any).count;
  if (userCount > 0) return;

  const defaultPasswordHash = bcrypt.hashSync("V79Marketing2026!", 10);

  const insertBusiness = db.prepare(`
    INSERT INTO businesses (id, name, slug, logo_url, cover_image_url, industry, description, location, phone, email, website, whatsapp, opening_hours_json, products_json, services_json, brand_profile_json, plan, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const b of INITIAL_BUSINESSES) {
    insertBusiness.run(
      b.id,
      b.name,
      b.slug,
      b.logoUrl,
      b.coverImageUrl,
      b.industry,
      b.description,
      b.location,
      b.phone,
      b.email,
      b.website,
      b.whatsapp,
      JSON.stringify(b.openingHours),
      JSON.stringify(b.products),
      JSON.stringify(b.services),
      JSON.stringify(b.brandProfile),
      b.plan,
      b.createdAt
    );
  }

  const insertUser = db.prepare(`
    INSERT INTO users (id, email, password_hash, name, role, avatar_url, email_verified, two_factor_enabled, business_id, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const u of INITIAL_USERS) {
    insertUser.run(
      u.id,
      u.email,
      defaultPasswordHash,
      u.name,
      u.role,
      u.avatarUrl || null,
      u.emailVerified ? 1 : 0,
      u.twoFactorEnabled ? 1 : 0,
      u.businessId,
      u.createdAt
    );
  }

  const insertSocial = db.prepare(`
    INSERT INTO social_accounts (id, business_id, platform, account_name, account_handle, connected, follower_count, last_synced_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const sa of INITIAL_SOCIAL_ACCOUNTS) {
    insertSocial.run(
      sa.id,
      sa.businessId,
      sa.platform,
      sa.accountName,
      sa.accountHandle,
      sa.connected ? 1 : 0,
      sa.followerCount,
      sa.lastSyncedAt
    );
  }

  const insertPost = db.prepare(`
    INSERT INTO posts (id, business_id, author_id, author_name, title, content_json, media_urls_json, scheduled_for, status, created_at, analytics_json)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const p of INITIAL_POSTS) {
    insertPost.run(
      p.id,
      p.businessId,
      p.authorId,
      p.authorName,
      p.title,
      JSON.stringify(p.content),
      JSON.stringify(p.mediaUrls),
      p.scheduledFor,
      p.status,
      p.createdAt,
      JSON.stringify(p.analytics || null)
    );
  }

  const insertCampaign = db.prepare(`
    INSERT INTO campaigns (id, business_id, name, objective, start_date, end_date, status, steps_json, ai_plan_generated, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const c of INITIAL_CAMPAIGNS) {
    insertCampaign.run(
      c.id,
      c.businessId,
      c.name,
      c.objective,
      c.startDate,
      c.endDate,
      c.status,
      JSON.stringify(c.steps),
      c.aiPlanGenerated ? 1 : 0,
      c.createdAt
    );
  }

  const insertCredit = db.prepare(`
    INSERT INTO credit_balances (business_id, monthly_allowance, purchased_credits, bonus_credits, used_credits, reset_date)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  insertCredit.run(
    INITIAL_CREDIT_BALANCE.businessId,
    INITIAL_CREDIT_BALANCE.monthlyAllowance,
    INITIAL_CREDIT_BALANCE.purchasedCredits,
    INITIAL_CREDIT_BALANCE.bonusCredits,
    INITIAL_CREDIT_BALANCE.usedCredits,
    INITIAL_CREDIT_BALANCE.resetDate
  );

  const insertAudit = db.prepare(`
    INSERT INTO audit_logs (id, business_id, user_id, user_name, action, details, ip_address, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const al of INITIAL_AUDIT_LOGS) {
    insertAudit.run(al.id, al.businessId, al.userId, al.userName, al.action, al.details, al.ipAddress, al.timestamp);
  }

  const insertInvoice = db.prepare(`
    INSERT INTO invoices (id, business_id, business_name, amount_xcd, amount_usd, status, date, pdf_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const inv of INITIAL_INVOICES) {
    insertInvoice.run(inv.id, inv.businessId, inv.businessName, inv.amountXCD, inv.amountUSD, inv.status, inv.date, inv.pdfUrl);
  }

  const insertReview = db.prepare(`
    INSERT INTO customer_reviews (id, business_id, customer_name, platform, rating, comment, date, sentiment, ai_suggested_response, responded)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const r of INITIAL_REVIEWS) {
    insertReview.run(r.id, r.businessId, r.customerName, r.platform, r.rating, r.comment, r.date, r.sentiment, r.aiSuggestedResponse || null, r.responded ? 1 : 0);
  }

  const insertCompetitor = db.prepare(`
    INSERT INTO competitors (id, business_id, name, handle, platform, posting_frequency, estimated_reach, top_topics_json, opportunity_gap, last_analyzed)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  for (const comp of INITIAL_COMPETITORS) {
    insertCompetitor.run(comp.id, comp.businessId, comp.name, comp.handle, comp.platform, comp.postingFrequency, comp.estimatedReach, JSON.stringify(comp.topTopics), comp.opportunityGap, comp.lastAnalyzed);
  }
}
