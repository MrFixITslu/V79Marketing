import { describe, expect, it } from 'vitest';
import Database from 'better-sqlite3';
import { resetBlockedDelivery } from '../src/lib/deliveryRetry';

describe('Delivery retry preserves provider receipts', () => {
  function fixture(status: string, receipt: string | null = null, published: string | null = null) {
    const db = new Database(':memory:');
    db.exec(`CREATE TABLE post_deliveries(post_id TEXT, business_id TEXT, platform TEXT,
      status TEXT, attempts INTEGER, last_error TEXT, updated_at TEXT, provider_post_id TEXT, published_at TEXT)`);
    db.prepare('INSERT INTO post_deliveries VALUES(?,?,?,?,?,?,?,?,?)')
      .run('post','own','youtube',status,2,'Previous error','before',receipt,published);
    return db;
  }
  it('permits a blocked delivery exactly once and refuses foreign tenants', () => {
    const db = fixture('NEEDS_ACTION');
    try {
      expect(resetBlockedDelivery(db,'foreign','post','youtube','now')).toBe(false);
      expect(resetBlockedDelivery(db,'own','post','youtube','now')).toBe(true);
      expect(resetBlockedDelivery(db,'own','post','youtube','later')).toBe(false);
      expect(db.prepare('SELECT status, attempts, last_error FROM post_deliveries').get())
        .toEqual({status:'QUEUED',attempts:0,last_error:null});
    } finally { db.close(); }
  });
  for (const [status, receipt, published] of [
    ['PUBLISHED','video-id','published-time'], ['FAILED','video-id',null],
    ['NEEDS_ACTION',null,'published-time'], ['QUEUED',null,null],
  ]) it(`does not clear or replay ${status} with receipt=${receipt}, published=${published}`, () => {
    const db = fixture(status!,receipt,published);
    try {
      const before = db.prepare('SELECT * FROM post_deliveries').get();
      expect(resetBlockedDelivery(db,'own','post','youtube','now')).toBe(false);
      expect(db.prepare('SELECT * FROM post_deliveries').get()).toEqual(before);
    } finally { db.close(); }
  });
});
