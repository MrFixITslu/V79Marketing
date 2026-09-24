import { db } from "./db.js";

export interface PublishResult {
  postId: string;
  platform: string;
  status: "PUBLISHED" | "FAILED";
  publishedAt?: string;
  error?: string;
}

function simulationEnabled() {
  return process.env.NODE_ENV !== "production" && process.env.V79_ENABLE_SIMULATED_PUBLISHER === "1";
}

export function processScheduledPosts(): PublishResult[] {
  // V79 never reports fake publishing or fake engagement in production.
  // Real social-provider adapters will consume SCHEDULED rows when configured.
  if (!simulationEnabled()) return [];

  const now = new Date().toISOString();
  const duePosts = db.prepare("SELECT * FROM posts WHERE status='SCHEDULED' AND scheduled_for <= ?").all(now) as any[];
  const results: PublishResult[] = [];

  for (const post of duePosts) {
    try {
      const content = JSON.parse(post.content_json || "{}");
      const platforms = Object.keys(content);
      db.prepare("UPDATE posts SET status='PUBLISHED', analytics_json=? WHERE id=?")
        .run(JSON.stringify({ reach: 0, impressions: 0, engagement: 0, clicks: 0, simulated: true }), post.id);
      results.push({ postId: post.id, platform: platforms.join(", "), status: "PUBLISHED", publishedAt: now });
    } catch (error:any) {
      db.prepare("UPDATE posts SET status='FAILED' WHERE id=?").run(post.id);
      results.push({ postId: post.id, platform: "all", status: "FAILED", error: error?.message || "Simulation failed" });
    }
  }
  return results;
}

let workerInterval: NodeJS.Timeout | null = null;

export function startPublisherWorker(intervalMs = 15000) {
  if (workerInterval || !simulationEnabled()) {
    if (process.env.NODE_ENV === "production") {
      console.log("[Publisher Queue] No social-provider adapter configured; scheduled content will remain queued.");
    }
    return;
  }
  console.log(`[Publisher Queue] Development simulation enabled (polling every ${intervalMs / 1000}s)`);
  workerInterval = setInterval(() => processScheduledPosts(), intervalMs);
  workerInterval.unref?.();
}

export function stopPublisherWorker() {
  if (workerInterval) clearInterval(workerInterval);
  workerInterval = null;
}
