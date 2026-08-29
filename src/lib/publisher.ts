import { db } from "./db.js";

export interface PublishResult {
  postId: string;
  platform: string;
  status: "PUBLISHED" | "FAILED";
  publishedAt?: string;
  error?: string;
}

export function processScheduledPosts(): PublishResult[] {
  const now = new Date().toISOString();
  const duePosts = db.prepare(`
    SELECT * FROM posts WHERE status = 'SCHEDULED' AND scheduled_for <= ?
  `).all(now) as any[];

  const results: PublishResult[] = [];

  for (const post of duePosts) {
    try {
      const content = JSON.parse(post.content_json);
      const platforms = Object.keys(content);

      // Simulate external API publishing for each connected channel
      const simulatedAnalytics = {
        reach: Math.floor(Math.random() * 1500) + 500,
        impressions: Math.floor(Math.random() * 2500) + 800,
        engagement: Math.floor(Math.random() * 200) + 50,
        clicks: Math.floor(Math.random() * 60) + 10,
      };

      db.prepare(`
        UPDATE posts
        SET status = 'PUBLISHED', analytics_json = ?
        WHERE id = ?
      `).run(JSON.stringify(simulatedAnalytics), post.id);

      // Create audit log for publication
      const auditId = `al-pub-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      db.prepare(`
        INSERT INTO audit_logs (id, business_id, user_id, user_name, action, details, ip_address, timestamp)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        auditId,
        post.business_id,
        post.author_id,
        post.author_name,
        "POST_PUBLISHED",
        `Successfully published post "${post.title}" across ${platforms.length} platforms (${platforms.join(", ")})`,
        "127.0.0.1",
        now
      );

      results.push({
        postId: post.id,
        platform: platforms.join(", "),
        status: "PUBLISHED",
        publishedAt: now,
      });
    } catch (err: any) {
      db.prepare("UPDATE posts SET status = 'FAILED' WHERE id = ?").run(post.id);
      results.push({
        postId: post.id,
        platform: "all",
        status: "FAILED",
        error: err.message || "Failed publishing post",
      });
    }
  }

  return results;
}

let workerInterval: NodeJS.Timeout | null = null;

export function startPublisherWorker(intervalMs: number = 10000) {
  if (workerInterval) return;
  console.log(`[Publisher Queue] Background worker active (polling every ${intervalMs / 1000}s)`);
  workerInterval = setInterval(() => {
    const executed = processScheduledPosts();
    if (executed.length > 0) {
      console.log(`[Publisher Queue] Processed ${executed.length} scheduled posts.`);
    }
  }, intervalMs);
}

export function stopPublisherWorker() {
  if (workerInterval) {
    clearInterval(workerInterval);
    workerInterval = null;
  }
}
