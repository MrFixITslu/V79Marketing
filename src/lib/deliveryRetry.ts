import type Database from 'better-sqlite3';

// A confirmed receipt must survive retries, including concurrent retry requests.
export function resetBlockedDelivery(db: Database.Database, businessId: string, postId: string, platform: string, now: string) {
  return db.prepare(`
    UPDATE post_deliveries
    SET status='QUEUED', attempts=0, last_error=NULL, updated_at=?
    WHERE post_id=? AND platform=? AND business_id=?
      AND status IN ('FAILED','NEEDS_ACTION','AWAITING_CONNECTION')
      AND provider_post_id IS NULL AND published_at IS NULL
  `).run(now, postId, platform, businessId).changes > 0;
}
