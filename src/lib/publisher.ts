import { db } from "./db.js";
import { decryptToken, encryptToken } from "./tokenVault.js";
import { publishWithProvider, refreshProviderAccess, type ProviderAccountRecord, type ProviderPlatform } from "./socialProviders.js";

export interface PublishResult {
  postId: string;
  platform: string;
  status: "PUBLISHED" | "FAILED" | "QUEUED" | "AWAITING_CONNECTION" | "NEEDS_ACTION";
  publishedAt?: string;
  error?: string;
  providerPostId?: string;
}

const PUBLISHABLE = new Set(["facebook", "instagram", "linkedin", "tiktok", "youtube", "google_business"]);

function simulationEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.V79_ENABLE_SIMULATED_PUBLISHER === "1";
}

function deliveryBackoffReady(delivery:any) {
  if (!delivery || delivery.status === "QUEUED" || delivery.status === "AWAITING_CONNECTION") return true;
  if (delivery.status === "PUBLISHED" || delivery.status === "NEEDS_ACTION") return false;
  const attempts = Number(delivery.attempts || 0);
  if (attempts >= 3) return false;
  const updated = Date.parse(delivery.updated_at || "") || 0;
  const delayMs = Math.min(300, Math.max(60, attempts * 60)) * 1000;
  return Date.now() - updated >= delayMs;
}

function needsAction(error: unknown) {
  const message = String((error as any)?.message || error || "").toLowerCase();
  return (
    message.includes("requires a publicly reachable") ||
    message.includes("explicitly select") ||
    message.includes("declare whether") ||
    message.includes("verified domain") ||
    message.includes("reconnect") ||
    message.includes("expired")
  );
}

function ensureDelivery(post:any, platform:string, now:string) {
  db.prepare(`
    INSERT OR IGNORE INTO post_deliveries
      (post_id,business_id,platform,status,attempts,updated_at)
    VALUES (?,?,?,'QUEUED',0,?)
  `).run(post.id, post.business_id, platform, now);
  return db.prepare("SELECT * FROM post_deliveries WHERE post_id=? AND platform=?").get(post.id, platform) as any;
}

function updatePostAggregateStatus(postId:string, platforms:string[]) {
  if (!platforms.length) return;
  const rows = db.prepare(
    `SELECT platform,status,attempts FROM post_deliveries WHERE post_id=? AND platform IN (${platforms.map(() => "?").join(",")})`
  ).all(postId, ...platforms) as any[];
  if (rows.length !== platforms.length) return;
  if (rows.every(row => row.status === "PUBLISHED")) {
    db.prepare("UPDATE posts SET status='PUBLISHED' WHERE id=?").run(postId);
    return;
  }
  if (rows.some(row => row.status === "FAILED" && Number(row.attempts || 0) >= 3)) {
    db.prepare("UPDATE posts SET status='FAILED' WHERE id=?").run(postId);
  }
}

async function loadUsableAccount(businessId:string, platform:ProviderPlatform) {
  const row = db.prepare(`
    SELECT * FROM social_accounts
    WHERE business_id=? AND platform=? AND connected=1
    ORDER BY last_synced_at DESC LIMIT 1
  `).get(businessId, platform) as any;
  if (!row) return null;

  const record:ProviderAccountRecord = {
    platform,
    providerAccountId:String(row.provider_account_id || ""),
    accessToken:decryptToken(row.access_token_enc),
    refreshToken:row.refresh_token_enc ? decryptToken(row.refresh_token_enc) : undefined,
    expiresAt:row.expires_at || null,
    metadata:JSON.parse(row.provider_metadata_json || "{}"),
  };

  const refreshed = await refreshProviderAccess(record);
  if (refreshed.accessToken !== record.accessToken || refreshed.refreshToken !== record.refreshToken || refreshed.expiresAt !== record.expiresAt) {
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
      businessId
    );
  }
  return { row, account:refreshed };
}

export async function processScheduledPosts(): Promise<PublishResult[]> {
  const now = new Date().toISOString();
  const duePosts = db.prepare("SELECT * FROM posts WHERE status IN ('SCHEDULED','FAILED') AND scheduled_for <= ? ORDER BY scheduled_for LIMIT 50")
    .all(now) as any[];
  const results: PublishResult[] = [];

  for (const post of duePosts) {
    let content:any = {};
    let mediaUrls:string[] = [];
    try {
      content = JSON.parse(post.content_json || "{}");
      mediaUrls = JSON.parse(post.media_urls_json || "[]");
    } catch {
      db.prepare("UPDATE posts SET status='FAILED' WHERE id=?").run(post.id);
      results.push({ postId:post.id, platform:"all", status:"FAILED", error:"Stored post payload is invalid." });
      continue;
    }

    const platforms = Object.keys(content).filter(platform => PUBLISHABLE.has(platform));
    if (!platforms.length) continue;

    if (simulationEnabled()) {
      for (const platform of platforms) {
        ensureDelivery(post, platform, now);
        db.prepare(`
          UPDATE post_deliveries SET status='PUBLISHED', attempts=attempts+1, published_at=?, updated_at=?,
          provider_post_id=?, last_error=NULL WHERE post_id=? AND platform=?
        `).run(now, now, `simulated-${post.id}-${platform}`, post.id, platform);
        results.push({ postId:post.id, platform, status:"PUBLISHED", publishedAt:now, providerPostId:`simulated-${post.id}-${platform}` });
      }
      updatePostAggregateStatus(post.id, platforms);
      continue;
    }

    const business = db.prepare("SELECT website FROM businesses WHERE id=?").get(post.business_id) as any;

    for (const platform of platforms) {
      let delivery = ensureDelivery(post, platform, now);
      if (!deliveryBackoffReady(delivery)) continue;

      try {
        const connection = await loadUsableAccount(post.business_id, platform as ProviderPlatform);
        if (!connection) {
          db.prepare(`
            UPDATE post_deliveries SET status='AWAITING_CONNECTION', last_error=?, updated_at=?
            WHERE post_id=? AND platform=?
          `).run("Connect this provider before scheduled content can publish.", now, post.id, platform);
          results.push({ postId:post.id, platform, status:"AWAITING_CONNECTION", error:"Provider account is not connected." });
          continue;
        }

        const platformContent = content[platform] || {};
        db.prepare(`
          UPDATE post_deliveries SET social_account_id=?, status='QUEUED', attempts=attempts+1, last_error=NULL, updated_at=?
          WHERE post_id=? AND platform=?
        `).run(connection.row.id, now, post.id, platform);

        const published = await publishWithProvider(connection.account, {
          caption:String(platformContent.caption || post.title || ""),
          hashtags:Array.isArray(platformContent.hashtags) ? platformContent.hashtags : [],
          mediaUrls,
          website:String(business?.website || ""),
          tiktok:platformContent.tiktok || undefined,
        });

        db.prepare(`
          UPDATE post_deliveries SET status='PUBLISHED', provider_post_id=?, published_at=?, last_error=NULL, updated_at=?
          WHERE post_id=? AND platform=?
        `).run(published.providerPostId, published.publishedAt, published.publishedAt, post.id, platform);
        results.push({
          postId:post.id,
          platform,
          status:"PUBLISHED",
          publishedAt:published.publishedAt,
          providerPostId:published.providerPostId,
        });
      } catch (error:any) {
        delivery = db.prepare("SELECT attempts FROM post_deliveries WHERE post_id=? AND platform=?").get(post.id, platform) as any;
        const status = needsAction(error) ? "NEEDS_ACTION" : "FAILED";
        db.prepare(`
          UPDATE post_deliveries SET status=?, last_error=?, updated_at=?
          WHERE post_id=? AND platform=?
        `).run(status, String(error?.message || error || "Provider publishing failed").slice(0,2000), new Date().toISOString(), post.id, platform);
        results.push({ postId:post.id, platform, status, error:error?.message || "Provider publishing failed" });
        console.warn(`[Publisher Queue] ${platform} post ${post.id} failed:`, error?.message || error);
      }
    }

    updatePostAggregateStatus(post.id, platforms);
  }

  return results;
}

let workerInterval: NodeJS.Timeout | null = null;
let running = false;

export function startPublisherWorker(intervalMs = 15000) {
  if (workerInterval) return;
  console.log(`[Publisher Queue] Official provider worker active (polling every ${intervalMs / 1000}s)`);
  const tick = async () => {
    if (running) return;
    running = true;
    try { await processScheduledPosts(); }
    catch (error:any) { console.error("[Publisher Queue] worker cycle failed:", error?.message || error); }
    finally { running = false; }
  };
  void tick();
  workerInterval = setInterval(() => { void tick(); }, intervalMs);
  workerInterval.unref?.();
}

export function stopPublisherWorker() {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = null;
}
