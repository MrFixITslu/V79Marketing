import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

vi.mock('../src/lib/auth.js', () => ({ verifyMarketingBackgroundEntitlement: undefined }));
vi.mock('../src/lib/tokenVault.js', () => ({ decryptToken: (v: string) => v, encryptToken: (v: string) => v }));
vi.mock('../src/lib/socialProviders.js', () => ({
  refreshProviderAccess: async (account: unknown) => account,
  publishWithProvider: vi.fn(async () => ({ providerPostId: 'abcdefghijk', publishedAt: new Date().toISOString() })),
}));

describe('Legacy scheduler publication hold', () => {
  let db: any, processPosts: any, publish: any;
  const temp = mkdtempSync(join(tmpdir(), 'v79-publisher-payload-'));
  const youtube = {title:'Reviewed title',videoUrl:'https://example.invalid/video.mp4',
    privacyStatus:'private',madeForKids:false,containsSyntheticMedia:true,categoryId:'22'};
  beforeAll(async () => {
    vi.stubEnv('DATABASE_PATH', join(temp, 'test.sqlite'));
    vi.stubEnv('V79_MARKETING_SEED_DEMO', '0');
    vi.stubEnv('V79_ENABLE_SIMULATED_PUBLISHER', '0');
    const storage = await import('../src/lib/db.js'); db = storage.db; storage.initDb();
    const now = new Date().toISOString();
    db.prepare('INSERT INTO businesses(id,name,slug,industry,created_at) VALUES(?,?,?,?,?)')
      .run('own','Synthetic','synthetic','ICT',now);
    db.prepare('INSERT INTO users(id,email,password_hash,name,role,business_id,created_at) VALUES(?,?,?,?,?,?,?)')
      .run('owner','owner@example.invalid','unused','Synthetic','BUSINESS_OWNER','own',now);
    db.prepare(`INSERT INTO social_accounts(id,business_id,platform,account_name,account_handle,connected,last_synced_at,
      provider_account_id,access_token_enc,provider_metadata_json) VALUES(?,?,?,?,?,1,?,?,?,'{}')`)
      .run('account','own','youtube','Synthetic','synthetic',now,'channel','synthetic-token');
    db.prepare(`INSERT INTO posts(id,business_id,author_id,author_name,title,content_json,media_urls_json,scheduled_for,status,created_at)
      VALUES('post','own','owner','Synthetic','Video',?,'[]',?,'SCHEDULED',?)`)
      .run(JSON.stringify({youtube:{caption:'Reviewed description',hashtags:['#Test'],youtube}}),now,now);
    processPosts = (await import('../src/lib/publisher.js')).processScheduledPosts;
    publish = (await import('../src/lib/socialProviders.js')).publishWithProvider;
  });
  afterAll(() => { db?.close(); rmSync(temp, {recursive:true,force:true}); vi.unstubAllEnvs(); });
  it('holds unpinned legacy posts without provider dispatch or fabricated receipts', async () => {
    expect(await processPosts()).toEqual([]);
    expect(publish).not.toHaveBeenCalled();
    expect(db.prepare("SELECT count(*) AS count FROM post_deliveries WHERE post_id='post'").get().count).toBe(0);
    const post = db.prepare("SELECT status,content_json FROM posts WHERE id='post'").get();
    expect(post.status).toBe('SCHEDULED');
    expect(JSON.parse(post.content_json)).toEqual({youtube:{caption:'Reviewed description',hashtags:['#Test'],youtube}});
  });
  it('keeps the publication hold on later worker ticks', async () => {
    expect(await processPosts()).toEqual([]);
    expect(publish).not.toHaveBeenCalled();
    expect(db.prepare("SELECT count(*) AS count FROM post_deliveries WHERE post_id='post'").get().count).toBe(0);
  });
});
