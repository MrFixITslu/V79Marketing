import type Database from 'better-sqlite3';
import type { ProductionActor } from './productionWorkflow.js';
import { deliveryDigest, type Delivery, type ProductionJob } from './productionStore.js';
import { digest } from './productionContract.js';
import { publicationUrl } from './publicationLinks.js';

export function installProductionTracking(db:Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS production_post_links (
    post_id TEXT PRIMARY KEY REFERENCES posts(id) ON DELETE CASCADE,
    business_id TEXT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
    job_id TEXT NOT NULL, delivery_id TEXT NOT NULL UNIQUE,
    bundle_digest TEXT NOT NULL, delivery_digest TEXT NOT NULL,
    provider_post_id TEXT NOT NULL, provider_account_id TEXT NOT NULL,
    provider_url TEXT, published_at TEXT NOT NULL, assets_json TEXT NOT NULL,
    UNIQUE(business_id,job_id,delivery_id));`);
}

// This is a local projection of an already signed provider receipt. It never
// schedules work, calls a provider, expands approval or retries an upload.
export function recordProductionPublication(db:Database.Database,actor:ProductionActor,job:ProductionJob,d:Delivery) {
  if(d.status!=='succeeded'||!d.result?.providerPostId||!Number.isFinite(Date.parse(d.result.at))||
     !d.approval||d.approval.by!==actor.hubUserId||d.approval.digest!==d.digest||deliveryDigest(job,d)!==d.digest||!job.bundle||digest(job.bundle)!==job.bundleDigest)
    throw Error('A confirmed signed production receipt is required');
  const material=job.bundle.materials.find(m=>m.channel===d.channel);
  if(!material||!/^[0-9a-f-]{36}$/i.test(d.id))throw Error('Exact delivery material required');
  const postId='production-'+d.id,providerUrl=publicationUrl(d.channel,d.result.providerPostId);
  return db.transaction(()=>{
    const author=db.prepare(`SELECT u.id,u.name FROM users u JOIN businesses b ON b.id=u.business_id
      WHERE u.id=? AND u.business_id=? AND u.hub_user_id=? AND b.hub_organization_id=? AND u.role='BUSINESS_OWNER' AND u.email='vision79slu@gmail.com'`).get(
        actor.localUserId,actor.businessId,actor.hubUserId,actor.organizationId) as {id:string;name:string}|undefined;
    if(!author)throw Error('Marketing author/workspace mapping changed');
    const existing=db.prepare('SELECT * FROM production_post_links WHERE post_id=? OR delivery_id=?').all(postId,d.id) as any[];
    if(existing.length){
      const row=existing[0];
      if(existing.length!==1||row.post_id!==postId||row.business_id!==actor.businessId||row.job_id!==job.id||row.delivery_id!==d.id||
         row.bundle_digest!==job.bundleDigest||row.delivery_digest!==d.digest||row.provider_post_id!==d.result!.providerPostId||
         row.provider_account_id!==d.providerAccountId||row.published_at!==d.result!.at)
        throw Error('Conflicting production tracking record');
      const post=db.prepare('SELECT business_id,status FROM posts WHERE id=?').get(postId) as any;
      const delivery=db.prepare('SELECT business_id,status,provider_post_id,published_at FROM post_deliveries WHERE post_id=? AND platform=?').get(postId,d.channel) as any;
      if(post?.business_id!==actor.businessId||post.status!=='PUBLISHED'||delivery?.business_id!==actor.businessId||
         delivery.status!=='PUBLISHED'||delivery.provider_post_id!==d.result!.providerPostId||delivery.published_at!==d.result!.at)
        throw Error('Published tracking record changed; reconcile locally');
      return {postId};
    }
    if(db.prepare('SELECT id FROM posts WHERE id=?').get(postId))throw Error('Post identifier is already in use');
    // Store the frozen approved content and visibility. Provider ingestion URLs
    // expire; durable asset names/hashes are retained in the provenance record.
    const content={[d.channel]:{...d.payload,caption:typeof d.payload.caption==='string'?d.payload.caption:material.caption,
      hashtags:Array.isArray(d.payload.hashtags)?d.payload.hashtags:material.hashtags}};
    const youtube=d.payload.youtube as {title?:string}|undefined;
    const title=(d.channel==='youtube'&&typeof youtube?.title==='string'?youtube.title:material.title).slice(0,100);
    db.prepare(`INSERT INTO posts(id,business_id,author_id,author_name,title,content_json,media_urls_json,
      scheduled_for,status,campaign_id,analytics_json,created_at) VALUES(?,?,?,?,?,?,?,?,'PUBLISHED',NULL,NULL,?)`).run(
        postId,actor.businessId,author.id,author.name,title,JSON.stringify(content),'[]',d.scheduledAt,job.createdAt);
    const account=db.prepare('SELECT id FROM social_accounts WHERE id=? AND business_id=? AND platform=?').get(d.accountId,actor.businessId,d.channel) as any;
    db.prepare(`INSERT INTO post_deliveries(post_id,business_id,platform,social_account_id,status,provider_post_id,
      last_error,attempts,published_at,updated_at) VALUES(?,?,?,?,'PUBLISHED',?,NULL,1,?,?)`).run(
        postId,actor.businessId,d.channel,account?.id||null,d.result!.providerPostId,d.result!.at,d.result!.at);
    db.prepare(`INSERT INTO production_post_links(post_id,business_id,job_id,delivery_id,bundle_digest,delivery_digest,
      provider_post_id,provider_account_id,provider_url,published_at,assets_json) VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
        postId,actor.businessId,job.id,d.id,job.bundleDigest!,d.digest,d.result!.providerPostId,d.providerAccountId,
        providerUrl||null,d.result!.at,JSON.stringify(job.bundle!.assets));
    return {postId};
  }).immediate();
}

export function productionManagedPost(db:Database.Database,postId:string,businessId:string) {
  return postId.startsWith('production-')||!!db.prepare('SELECT post_id FROM production_post_links WHERE post_id=? AND business_id=?').get(postId,businessId);
}
