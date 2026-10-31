import {describe,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import express from 'express';
import request from 'supertest';
import {randomUUID,createHash} from 'node:crypto';
import {ensurePersonalSkillTables,pinCampaignSkill} from '../src/lib/personalMarketingSkills.js';
import {ensureStudioCampaignTables,createOwnStudioPackage,
  reviewOwnStudioPackage} from '../src/lib/studioCampaignAssets.js';
import {installStudioPublishingRoutes} from '../src/lib/studioPublishingRoutes.js';
import {encryptToken} from '../src/lib/tokenVault.js';
import {signPlatformRequest} from '../src/lib/platform.js';
vi.mock('../src/lib/auth.js',async importOriginal=>{
  const real=await importOriginal<typeof import('../src/lib/auth.js')>();
  return {...real,verifyMarketingBackgroundEntitlement:async()=>true};
});
const creativeKey='synthetic-creative-signing-key-at-least-32-characters';
const hubKey='different-synthetic-hub-mfa-signing-key-at-least-32';
const organisation='synthetic-organisation-123456';
const hash=(v:Buffer)=>createHash('sha256').update(v).digest('hex');
function setup(){
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY='synthetic-test-encryption-key-more-than-thirty-two-characters';
  const db=new Database(':memory:');
  db.pragma('foreign_keys=ON');
  db.exec(`CREATE TABLE businesses(id TEXT PRIMARY KEY,hub_organization_id TEXT);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT,hub_user_id TEXT,role TEXT);
    CREATE TABLE campaigns(id TEXT PRIMARY KEY,business_id TEXT);
    CREATE TABLE social_accounts(id TEXT PRIMARY KEY,business_id TEXT,
      connected_by_user_id TEXT,connected INTEGER,platform TEXT,account_name TEXT,
      account_handle TEXT,provider_account_id TEXT,access_token_enc TEXT,
      refresh_token_enc TEXT,token_scopes TEXT,provider_metadata_json TEXT,
      legal_version TEXT,legal_consented_at TEXT,expires_at TEXT);
    INSERT INTO businesses VALUES('synthetic-biz','synthetic-organisation-123456');
    INSERT INTO users VALUES('creator','synthetic-biz','hub-creator-123456','CONTENT_CREATOR'),
      ('manager','synthetic-biz','hub-manager-123456','MARKETING_MANAGER');`);
  ensurePersonalSkillTables(db);
  ensureStudioCampaignTables(db);
  const campaign='campaign-'+randomUUID();
  db.prepare('INSERT INTO campaigns VALUES(?,?)').run(campaign,'synthetic-biz');
  db.prepare(`INSERT INTO social_accounts(id,business_id,connected_by_user_id,connected,
    platform,account_name,account_handle,provider_account_id,access_token_enc,token_scopes,
    provider_metadata_json)VALUES(?,?,?,?,?,?,?,?,?,?,?)`).run(
    'personal-page','synthetic-biz','creator',1,'facebook','Synthetic Page','@test',
    'page-123',encryptToken('synthetic-test-access-token'),'pages_manage_posts','{}');
  const pin=pinCampaignSkill(db,{id:'creator',businessId:'synthetic-biz'},campaign);
  const media=Buffer.from('isolated-review-media-bytes-no-social-publishing');
  const mediaId=randomUUID();
  db.prepare(`INSERT INTO studio_campaign_assets
    (id,business_id,user_id,campaign_id,kind,mime,bytes,sha256,size_bytes,created_at)
    VALUES(?,?,?,?,?,?,?,?,?,?)`).run(mediaId,'synthetic-biz','creator',campaign,
      'image','image/jpeg',media,hash(media),media.length,new Date().toISOString());
  const scheduledAt=new Date(Date.now()+10*60000).toISOString();
  const pkg=createOwnStudioPackage(db,{id:'creator',businessId:'synthetic-biz'},campaign,{
    expectedSkillDigest:pin.skillDigest,assetIds:[mediaId],
    caption:'Synthetic campaign only: no real post will be sent.',
    channel:'facebook',connectedAccountId:'personal-page',scheduledAt},creativeKey);
  reviewOwnStudioPackage(db,{id:'creator',businessId:'synthetic-biz'},
    campaign,pkg.id,pkg.exactDigest,creativeKey);
  const app=express();
  app.use(express.json({verify:(req:express.Request & {rawBody?:Buffer},_res,buf)=>{
    req.rawBody=Buffer.from(buf);
  }}));
  installStudioPublishingRoutes(app,db,{
    V79_STUDIO_PUBLISH_ENABLED:'1',
    V79_ENTITLEMENT_RECHECK_ENABLED:'1',
    V79_MARKETING_STUDIO_REVIEW_KEY:creativeKey,
    V79_STUDIO_HUB_SHARED_SECRET:hubKey
  } as NodeJS.ProcessEnv);
  return {db,app,campaign,pkg};
}
function signed(envelope:unknown,key=hubKey){
  const timestamp=String(Date.now()),body=JSON.stringify(envelope);
  const pathname='/api/platform/studio-publishing/approve';
  const signature=signPlatformRequest({method:'POST',pathname,timestamp,body,secret:key});
  return {timestamp,body,signature};
}
describe('NEW signed Hub MFA happy-path, replay and stale session integration',()=>{
 it('creates exactly one durable approval with valid Hub HMAC and fresh MFA; no publisher dispatch',async()=>{
   const {db,app,campaign,pkg}=setup();
   try{
     const envelope={organizationId:organisation,actorHubUserId:'hub-manager-123456',
       mfaVerifiedAt:Date.now(),requestNonce:randomUUID(),
       request:{creatorUserId:'creator',campaignId:campaign,packageId:pkg.id,
         exactDigest:pkg.exactDigest,confirmExactPublication:true}};
     const sig=signed(envelope);
     const post=()=>request(app).post('/api/platform/studio-publishing/approve')
       .set('x-v79-service-id','v79-hub').set('x-v79-timestamp',sig.timestamp)
       .set('x-v79-signature',sig.signature).set('content-type','application/json')
       .send(sig.body);
     const first=await post();
     expect(first.status,JSON.stringify(first.body)).toBe(201);
     expect(first.body.delivery).toMatchObject({status:'APPROVED',dispatchPerformed:false,
       exactDigest:pkg.exactDigest});
     const replay=await post();
     expect(replay.status).toBe(409);
     expect((db.prepare('SELECT COUNT(*) n FROM studio_publication_deliveries').get() as any).n).toBe(1);
     expect((db.prepare("SELECT status FROM studio_publication_deliveries").get() as any).status).toBe('APPROVED');
   }finally{db.close();}
 });
 it('rejects forged signed bytes and stale MFA without inserting approvals',async()=>{
   const {db,app,campaign,pkg}=setup();
   try{
     const base={organizationId:organisation,actorHubUserId:'hub-manager-123456',
       mfaVerifiedAt:Date.now()-600001,requestNonce:randomUUID(),
       request:{creatorUserId:'creator',campaignId:campaign,packageId:pkg.id,
         exactDigest:pkg.exactDigest,confirmExactPublication:true}};
     const s=signed(base);
     const stale=await request(app).post('/api/platform/studio-publishing/approve')
       .set('x-v79-service-id','v79-hub').set('x-v79-timestamp',s.timestamp)
       .set('x-v79-signature',s.signature).set('content-type','application/json').send(s.body);
     expect(stale.status).toBe(403);
     const forged=await request(app).post('/api/platform/studio-publishing/approve')
       .set('x-v79-service-id','v79-hub').set('x-v79-timestamp',s.timestamp)
       .set('x-v79-signature','f'.repeat(64))
       .send({...base,mfaVerifiedAt:Date.now()});
     expect(forged.status).toBe(401);
     expect((db.prepare('SELECT COUNT(*) n FROM studio_publication_deliveries').get() as any).n).toBe(0);
   }finally{db.close();}
 });
});
