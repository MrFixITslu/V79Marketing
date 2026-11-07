import {describe,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {createHash,randomUUID} from 'node:crypto';
import {ensurePersonalSkillTables,pinCampaignSkill} from '../src/lib/personalMarketingSkills.js';
import {ensureStudioCampaignTables,createOwnStudioPackage,
  reviewOwnStudioPackage} from '../src/lib/studioCampaignAssets.js';
import {ensureStudioPublicationTables,authoriseStudioPublication,
  claimStudioDelivery,verifyStudioDispatch,finaliseStudioDelivery,
  expireInterruptedStudioAttempts,studioMediaToken,readStudioApprovedMedia
} from '../src/lib/studioPublicationBridge.js';
import {createStudioPublisher} from '../src/lib/studioPublishingWorker.js';
import {encryptToken} from '../src/lib/tokenVault.js';

const secret='isolated-publishing-approval-test-key-32-chars';
const creator={id:'creator',businessId:'biz1'};
const approver={id:'manager',businessId:'biz1',role:'MARKETING_MANAGER'};
const now=Date.now(),time=new Date(now+180000).toISOString();
const sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
function fixture(){
  process.env.SOCIAL_TOKEN_ENCRYPTION_KEY='isolated-browser-synthetic-social-encryption-key-123456';
  const db=new Database(':memory:');
  db.pragma('foreign_keys=ON');
  db.exec(`CREATE TABLE businesses(id TEXT PRIMARY KEY,hub_organization_id TEXT);
  CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT,hub_user_id TEXT,role TEXT);
  CREATE TABLE campaigns(id TEXT PRIMARY KEY,business_id TEXT);
  CREATE TABLE social_accounts(
    id TEXT PRIMARY KEY,business_id TEXT,connected_by_user_id TEXT,
    connected INTEGER,platform TEXT,account_name TEXT,account_handle TEXT,
    provider_account_id TEXT,access_token_enc TEXT,refresh_token_enc TEXT,
    token_scopes TEXT,provider_metadata_json TEXT,legal_version TEXT,
    legal_consented_at TEXT,expires_at TEXT
  );
  INSERT INTO businesses VALUES ('biz1','hub-org-1'),('biz2','hub-org-2');
  INSERT INTO users VALUES ('creator','biz1','hub-creator','CONTENT_CREATOR'),
    ('manager','biz1','hub-manager','MARKETING_MANAGER'),
    ('outsider','biz2','hub-outsider','BUSINESS_OWNER');`);
  const campaignId='campaign-'+randomUUID();
  db.prepare('INSERT INTO campaigns(id,business_id) VALUES (?,?)').run(campaignId,'biz1');
  db.prepare(`INSERT INTO social_accounts
    (id,business_id,connected_by_user_id,connected,platform,provider_account_id,
     account_name,account_handle,access_token_enc,token_scopes,provider_metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`)
    .run('personal-page','biz1','creator',1,'facebook','page-123','Page','@page',
      encryptToken('synthetic-facebook-page-access-token'),'pages_manage_posts','{}');
  ensurePersonalSkillTables(db);ensureStudioCampaignTables(db);ensureStudioPublicationTables(db);
  const pin=pinCampaignSkill(db,creator,campaignId);
  // Synthetic binary in a fixture: media decode validity belongs to the
  // already-covered upload tests; new cases target signed queue mechanics.
  const bytes=Buffer.from('synthetic-png-bytes-mock');
  const assetId=randomUUID();
  db.prepare(`INSERT INTO studio_campaign_assets
    (id,business_id,user_id,campaign_id,kind,mime,bytes,sha256,size_bytes,created_at)
    VALUES (?,?,?,?,?,?,?,?,?,?)`)
    .run(assetId,'biz1','creator',campaignId,'image','image/png',bytes,sha(bytes),bytes.length,new Date(now).toISOString());
  function packageIt(caption='Approved synthetic service caption'){
    const pkg=createOwnStudioPackage(db,creator,campaignId,{
      expectedSkillDigest:pin.skillDigest,assetIds:[assetId],caption,
      channel:'facebook',connectedAccountId:'personal-page',scheduledAt:time},secret);
    reviewOwnStudioPackage(db,creator,campaignId,pkg.id,pkg.exactDigest,secret);
    return pkg;
  }
  return {db,campaignId,assetId,packageIt,bytes};
}
describe('exact multi-member Studio publication bridge — new targeted tests',()=>{
  it('requires an independent authorised manager, latest reviewed media and exact destination',()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      expect(()=>authoriseStudioPublication(f.db,{...creator,role:'CONTENT_CREATOR'},creator.id,
        f.campaignId,pkg.id,pkg.exactDigest,true,secret,now)).toThrow(/permission/);
      expect(()=>authoriseStudioPublication(f.db,{id:'outsider',businessId:'biz2',role:'BUSINESS_OWNER'},
        creator.id,f.campaignId,pkg.id,pkg.exactDigest,true,secret,now)).toThrow();
      expect(()=>authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,false,secret,now)).toThrow(/Explicit/);
      expect(()=>authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,'0'.repeat(64),true,secret,now)).toThrow();
      const saved=authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now);
      expect(saved.status).toBe('APPROVED');expect(saved.dispatchPerformed).toBe(false);
      expect(()=>authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now)).toThrow();
    }finally{f.db.close();}
  });
  it('blocks manager self-approval but supports a sole business owner with fresh Hub-gated consent',()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      f.db.prepare("UPDATE users SET role='MARKETING_MANAGER' WHERE id='creator'").run();
      expect(()=>authoriseStudioPublication(f.db,{id:'creator',businessId:'biz1',role:'MARKETING_MANAGER'},
        creator.id,f.campaignId,pkg.id,pkg.exactDigest,true,secret,now)).toThrow(/Independent/);
      expect(()=>authoriseStudioPublication(f.db,{id:'manager',businessId:'biz1',role:'BUSINESS_OWNER'},
        creator.id,f.campaignId,pkg.id,pkg.exactDigest,true,secret,now)).toThrow(/role changed/);
      f.db.prepare("UPDATE users SET role='BUSINESS_OWNER' WHERE id='creator'").run();
      const sameOwner=authoriseStudioPublication(f.db,
        {id:'creator',businessId:'biz1',role:'BUSINESS_OWNER'},
        creator.id,f.campaignId,pkg.id,pkg.exactDigest,true,secret,now);
      expect(sameOwner.status).toBe('APPROVED');
    }finally{f.db.close();}
  });
  it('holds publishing if recorded original OAuth scopes are insufficient',()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      f.db.prepare("UPDATE social_accounts SET token_scopes='pages_show_list' WHERE id='personal-page'").run();
      expect(()=>authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now)).toThrow(/publishing scope/);
      expect((f.db.prepare('SELECT COUNT(*) AS n FROM studio_publication_deliveries').get() as {n:number}).n).toBe(0);
    }finally{f.db.close();}
  });
  it('revisions invalidate prior approvals and revoked original OAuth makes dispatch fail',()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now);
      // New content generates a new immutable version, not a mutation.
      f.packageIt('New caption: requires new signed publishing approval');
      const claim=claimStudioDelivery(f.db,secret,now+200000)!;
      expect(()=>verifyStudioDispatch(f.db,claim,secret)).toThrow(/New media revision/);
      finaliseStudioDelivery(f.db,claim,'BLOCKED',{issue:'New version'});
      const later=f.packageIt('Another caption');
      expect(()=>authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now)).toThrow(/newer/);
      // No accidental use of previous account after owner changed.
      const accepted=authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        later.id,later.exactDigest,true,secret,now);
      f.db.prepare('UPDATE social_accounts SET connected=0 WHERE id=?').run('personal-page');
      const claimed=claimStudioDelivery(f.db,secret,now+200000)!;
      expect(claimed.id).toBe(accepted.id);
      expect(()=>verifyStudioDispatch(f.db,claimed,secret)).toThrow();
    }finally{f.db.close();}
  });
  it('one atomic worker claim excludes other workers and provider uncertainty never requeues',()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now);
      const first=claimStudioDelivery(f.db,secret,now+200000)!;
      expect(first.status).toBe('DISPATCHING');
      expect(claimStudioDelivery(f.db,secret,now+200001)).toBeNull();
      expect(verifyStudioDispatch(f.db,first,secret).package.exactDigest).toBe(pkg.exactDigest);
      const urlToken=studioMediaToken(first,f.assetId,sha(f.bytes),now+220000,secret);
      expect(readStudioApprovedMedia(f.db,first.id,f.assetId,now+220000,urlToken,
        secret,now+200000).bytes).toEqual(f.bytes);
      expect(()=>readStudioApprovedMedia(f.db,first.id,f.assetId,now+220000,'0'.repeat(64),secret,now+200000)).toThrow();
      finaliseStudioDelivery(f.db,first,'UNKNOWN',{issue:'Synthetic timeout'});
      expect(claimStudioDelivery(f.db,secret,now+400000)).toBeNull();
      expect(()=>finaliseStudioDelivery(f.db,first,'PUBLISHED',{providerPostId:'duplicate'})).toThrow();
      expect(readStudioApprovedMedia.bind(null,f.db,first.id,f.assetId,now+220000,
        urlToken,secret,now+200000)).toThrow();
    }finally{f.db.close();}
  });
  it('stale dispatch transitions only to UNKNOWN; a late provider receipt cannot spawn a duplicate',()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now);
      const first=claimStudioDelivery(f.db,secret,now+200000)!;
      expect(expireInterruptedStudioAttempts(f.db,now+200000+30*60000+1)).toBe(1);
      expect(claimStudioDelivery(f.db,secret,now+99999999)).toBeNull();
      expect(()=>finaliseStudioDelivery(f.db,first,'PUBLISHED',{providerPostId:'late'})).toThrow();
    }finally{f.db.close();}
  });
  it('mocked provider success records one receipt for an exact personal account and signed media URL',async()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,pkg.id,pkg.exactDigest,true,secret,now);
      let calls=0;
      const worker=createStudioPublisher(f.db,secret,{
        env:{V79_STUDIO_PUBLISH_ENABLED:'1',V79_ENTITLEMENT_RECHECK_ENABLED:'1',
          APP_URL:'https://marketing.example.invalid'} as NodeJS.ProcessEnv,
        deps:{now:()=>now+200000,entitled:async()=>true,
          dispatch:async(_row,account,payload)=>{
            calls++;
            expect(account.providerAccountId).toBe('page-123');
            expect(account.accessToken).toBe('synthetic-facebook-page-access-token');
            expect(payload.mediaUrls?.[0]).toMatch(/^https:\/\/marketing\.example\.invalid\/media\/studio\//);
            expect(payload.caption).toBe('Approved synthetic service caption');
            return {providerPostId:'synthetic-platform-receipt-123',publishedAt:time};
          }},
      });
      const result=await worker.tick();
      expect(result).toMatchObject({status:'PUBLISHED',providerPostId:'synthetic-platform-receipt-123'});
      expect(calls).toBe(1);
      await worker.tick();
      expect(calls).toBe(1);
    }finally{f.db.close();}
  });
  it('ambiguous mocked provider timeout produces UNKNOWN and never blindly sends twice',async()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,pkg.id,pkg.exactDigest,true,secret,now);
      let calls=0;
      const worker=createStudioPublisher(f.db,secret,{
        env:{V79_STUDIO_PUBLISH_ENABLED:'1',V79_ENTITLEMENT_RECHECK_ENABLED:'1',
          APP_URL:'https://marketing.example.invalid'} as NodeJS.ProcessEnv,
        deps:{now:()=>now+200000,entitled:async()=>true,
          dispatch:async()=>{calls++;throw Error('Synthetic timeout after possible remote post');}},
      });
      const first=await worker.tick();
      expect(first).toMatchObject({status:'UNKNOWN'});
      expect(calls).toBe(1);
      await worker.tick();
      expect(calls).toBe(1);
      expect((worker.history('biz1') as {status:string}[])[0].status).toBe('UNKNOWN');
    }finally{f.db.close();}
  });
  it('background worker with revoked live Hub entitlement performs no provider call and records BLOCKED',async()=>{
    const f=fixture();try{
      const pkg=f.packageIt();
      authoriseStudioPublication(f.db,approver,creator.id,f.campaignId,
        pkg.id,pkg.exactDigest,true,secret,now);
      let dispatched=0;
      const worker=createStudioPublisher(f.db,secret,{
        env:{V79_STUDIO_PUBLISH_ENABLED:'1',V79_ENTITLEMENT_RECHECK_ENABLED:'1',APP_URL:'https://marketing.example.invalid'} as NodeJS.ProcessEnv,
        deps:{now:()=>now+200000,entitled:async()=>false,
          dispatch:async()=>{dispatched++;return {providerPostId:'unexpected',publishedAt:time};}},
      });
      const outcome=await worker.tick();
      expect((outcome as {status?:string}).status).toBe('BLOCKED');
      expect(dispatched).toBe(0);
      expect(worker.history('biz1')).toHaveLength(1);
      expect((worker.history('biz1') as {status:string}[])[0].status).toBe('BLOCKED');
    }finally{f.db.close();}
  });
});
