import {describe,it,expect,vi} from 'vitest';
import Database from 'better-sqlite3';
import {randomUUID} from 'node:crypto';
import {createMaterials,reviewMaterials,digest,type ProductionBrand,type ProductionPlan} from '../src/lib/productionContract.js';
import {deliveryDigest,type ProductionJob,type Delivery} from '../src/lib/productionStore.js';
import {installProductionTracking,recordProductionPublication,productionManagedPost} from '../src/lib/productionTracking.js';
import {publicationUrl} from '../src/lib/publicationLinks.js';
import {createProductionWorkflow,type ProductionDependencies} from '../src/lib/productionWorkflow.js';

const actor={businessId:'biz',organizationId:'org',localUserId:'owner',hubUserId:'hub-owner'};
const key='synthetic-production-audit-key-32-characters';
const brand:ProductionBrand={name:'V79 Digital',tagline:'From Idea to Advantage.',audience:'Caribbean businesses',tone:'Practical',website:'https://v79sl.com',cta:'Discuss your next step',primaryColor:'#081827',accentColor:'#00D5C9',logoPng:null,mailingAddress:null,facts:[{id:'ict',service:'ICT support',statement:'V79 Digital provides ICT support.'}]};
const plan:ProductionPlan={automaticDrafts:false,cadenceDays:7,channels:['youtube'],publishDelayHours:1,newsletterFrom:null,newsletterSegmentId:null,newsletterConsentConfirmed:false,youtubePrivacy:'private'};
function fixture(){
 const db=new Database(':memory:');db.pragma('foreign_keys=ON');db.exec(`
 CREATE TABLE businesses(id TEXT PRIMARY KEY,hub_organization_id TEXT);
 CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT,name TEXT,hub_user_id TEXT,email TEXT,role TEXT);
 CREATE TABLE social_accounts(id TEXT PRIMARY KEY,business_id TEXT,platform TEXT);
 CREATE TABLE posts(id TEXT PRIMARY KEY,business_id TEXT,author_id TEXT,author_name TEXT,title TEXT,content_json TEXT,media_urls_json TEXT,scheduled_for TEXT,status TEXT,campaign_id TEXT,analytics_json TEXT,created_at TEXT);
 CREATE TABLE post_deliveries(post_id TEXT,business_id TEXT,platform TEXT,social_account_id TEXT,status TEXT,provider_post_id TEXT,last_error TEXT,attempts INTEGER,published_at TEXT,updated_at TEXT,PRIMARY KEY(post_id,platform));
 INSERT INTO businesses VALUES('biz','org'); INSERT INTO businesses VALUES('other-biz','other-org');
 INSERT INTO users VALUES('owner','biz','Synthetic owner','hub-owner','vision79slu@gmail.com','BUSINESS_OWNER');
 INSERT INTO social_accounts VALUES('account','biz','youtube');`);installProductionTracking(db);
 const materials=createMaterials(brand,plan,'ict',{hook:'Make business technology practical',tip:'Review a recurring task with your team.'});
 const bundle={schemaVersion:1 as const,source:'brand-template' as const,brand,factId:'ict',angle:'Practical ICT',materials,assets:[],review:reviewMaterials(brand,materials)};
 const job:ProductionJob={id:randomUUID(),key:'synthetic-package-key',inputDigest:'',factId:'ict',angle:'Practical ICT',configRevision:1,status:'awaiting_owner',createdAt:'2026-10-14T19:00:00Z',bundle,bundleDigest:digest(bundle),deliveries:[]};
 const delivery:Delivery={id:randomUUID(),channel:'youtube',accountId:'account',providerAccountId:'exact-channel',accountFingerprint:digest('account'),scheduledAt:'2026-10-14T20:00:00Z',payload:{caption:'Exact approved caption',hashtags:['Exact'],youtube:{title:'Exact uploaded title',privacyStatus:'private'}},digest:'',status:'succeeded',result:{providerPostId:'dQw4w9WgXcQ',at:'2026-10-14T20:00:05Z'}};
 delivery.digest=deliveryDigest(job,delivery);delivery.approval={by:actor.hubUserId,digest:delivery.digest,at:'2026-10-14T19:30:00Z',expiresAt:'2026-10-14T21:00:00Z'};job.deliveries=[delivery];
 return {db,job,delivery};
}
describe('Production receipts become normal Marketing records without publishing twice',()=>{
 it('records one exact published post/delivery with privacy, account, timestamp and full YouTube link; never invents analytics',()=>{
  const f=fixture();try{
   const first=recordProductionPublication(f.db,actor,f.job,f.delivery);expect(recordProductionPublication(f.db,actor,f.job,f.delivery)).toEqual(first);
   const post:any=f.db.prepare('SELECT * FROM posts').get(),delivery:any=f.db.prepare('SELECT * FROM post_deliveries').get(),link:any=f.db.prepare('SELECT * FROM production_post_links').get();
   expect(post.status).toBe('PUBLISHED');expect(post.title).toBe('Exact uploaded title');expect(post.business_id).toBe('biz');expect(post.analytics_json).toBeNull();
   expect(JSON.parse(post.content_json).youtube).toMatchObject({caption:'Exact approved caption',youtube:{privacyStatus:'private'}});
   expect(delivery).toMatchObject({status:'PUBLISHED',provider_post_id:'dQw4w9WgXcQ',social_account_id:'account',published_at:f.delivery.result!.at,attempts:1});
   expect(link).toMatchObject({provider_url:'https://www.youtube.com/watch?v=dQw4w9WgXcQ',job_id:f.job.id,delivery_id:f.delivery.id,provider_account_id:'exact-channel'});
   expect(f.db.prepare('SELECT COUNT(*) n FROM posts').get()).toEqual({n:1});expect(productionManagedPost(f.db,first.postId,'biz')).toBe(true);
  }finally{f.db.close();}
 });
 it('rejects approval-only, uncertain, changed payload, changed bundle and cross-workspace records',()=>{
  for(const mutate of [(j:ProductionJob,d:Delivery)=>d.status='approved',(j:ProductionJob,d:Delivery)=>d.status='uncertain',
   (j:ProductionJob,d:Delivery)=>d.payload.caption='Changed',(j:ProductionJob)=>j.bundle!.brand.name='Changed']){
   const f=fixture();try{mutate(f.job,f.delivery);expect(()=>recordProductionPublication(f.db,actor,f.job,f.delivery)).toThrow();expect(f.db.prepare('SELECT COUNT(*) n FROM posts').get()).toEqual({n:0});}finally{f.db.close();}
  }
  const f=fixture();try{expect(()=>recordProductionPublication(f.db,{...actor,businessId:'other-biz',organizationId:'other-org'},f.job,f.delivery)).toThrow();expect(f.db.prepare('SELECT COUNT(*) n FROM posts').get()).toEqual({n:0});}finally{f.db.close();}
 });
 it('never overwrites a colliding normal post or a conflicting provider receipt',()=>{
  const f=fixture();try{
   f.db.prepare('INSERT INTO posts(id,business_id,title) VALUES(?,?,?)').run('production-'+f.delivery.id,'other-biz','Preserve this');
   expect(()=>recordProductionPublication(f.db,actor,f.job,f.delivery)).toThrow();expect(f.db.prepare('SELECT title FROM posts').get()).toEqual({title:'Preserve this'});
   f.db.prepare('DELETE FROM posts').run();recordProductionPublication(f.db,actor,f.job,f.delivery);f.delivery.result!.providerPostId='abcdefghijk';
   expect(()=>recordProductionPublication(f.db,actor,f.job,f.delivery)).toThrow(/Conflicting/);
  }finally{f.db.close();}
 });
 it('rolls back a partial local projection, retains the signed receipt, and repairs it later without any provider dispatch',async()=>{
  const f=fixture();const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});
  try{
   const dispatch=vi.fn(async()=>({providerPostId:'unused',publishedAt:'2026-10-14T20:00:05Z'}));
   const deps:ProductionDependencies={authorized:async()=>true,generate:async()=>{throw Error('No generation');},render:async()=>[],destinations:async()=>[],verifyAssets:async()=>{},destinationUnchanged:async()=>true,dispatch,recordPublished:(a,j,d)=>recordProductionPublication(f.db,a,j,d)};
   const w=createProductionWorkflow(f.db,key,deps);w.store.transact('biz',s=>{s.ownerHubUserId=actor.hubUserId;s.configRevision=1;s.brand=brand;s.plan=plan;s.paused=false;s.jobs=[f.job];});
   f.db.exec("CREATE TRIGGER fail_projection BEFORE INSERT ON production_post_links BEGIN SELECT RAISE(ABORT,'synthetic disk error'); END;");
   await w.tick(actor);expect(dispatch).not.toHaveBeenCalled();expect(f.db.prepare('SELECT COUNT(*) n FROM posts').get()).toEqual({n:0});
   let saved=w.store.read('biz').jobs[0].deliveries[0];expect(saved.status).toBe('succeeded');expect(saved.result!.providerPostId).toBe('dQw4w9WgXcQ');expect(saved.result!.marketingPostId).toBeUndefined();
   f.db.exec('DROP TRIGGER fail_projection');await w.tick(actor);await w.tick(actor);
   saved=w.store.read('biz').jobs[0].deliveries[0];expect(saved.result!.marketingPostId).toBe('production-'+f.delivery.id);expect(dispatch).not.toHaveBeenCalled();
   expect(f.db.prepare('SELECT COUNT(*) n FROM posts').get()).toEqual({n:1});expect(w.store.read('biz').events.filter(e=>e.type==='marketing_post_recorded')).toHaveLength(1);
   expect(w.status(actor).jobs[0].deliveries[0].result).toMatchObject({providerUrl:'https://www.youtube.com/watch?v=dQw4w9WgXcQ'});
  }finally{warn.mockRestore();f.db.close();}
 });
 it('stores a newly confirmed upload in Marketing during the same worker cycle, then never dispatches it again',async()=>{
  const f=fixture();try{
   let now=Date.parse('2026-10-14T19:00:00Z');const d=f.delivery;d.status='awaiting_owner';delete d.result;delete d.approval;
   const dispatch=vi.fn(async()=>({providerPostId:'dQw4w9WgXcQ',publishedAt:new Date(now).toISOString()}));
   const w=createProductionWorkflow(f.db,key,{now:()=>now,authorized:async()=>true,generate:async()=>{throw Error('No generation');},render:async()=>[],destinations:async()=>[],verifyAssets:async()=>{},destinationUnchanged:async()=>true,dispatch,recordPublished:(a,j,d)=>recordProductionPublication(f.db,a,j,d)});
   w.store.transact('biz',s=>{s.ownerHubUserId=actor.hubUserId;s.configRevision=1;s.brand=brand;s.plan=plan;s.paused=false;s.jobs=[f.job];});
   w.decision(actor,{jobId:f.job.id,deliveryId:d.id,decision:'approve',digest:d.digest});await w.tick(actor);expect(dispatch).not.toHaveBeenCalled();
   now=Date.parse(d.scheduledAt)+1;await w.tick(actor);await w.tick(actor);expect(dispatch).toHaveBeenCalledTimes(1);
   expect(f.db.prepare('SELECT status FROM posts').get()).toEqual({status:'PUBLISHED'});expect(w.store.read('biz').jobs[0].deliveries[0].result!.marketingPostId).toBeDefined();
  }finally{f.db.close();}
 });
 it('a local receipt-read failure after provider success does not downgrade or resend the confirmed upload',async()=>{
  const f=fixture();const warn=vi.spyOn(console,'warn').mockImplementation(()=>{});try{
   let now=Date.parse('2026-10-14T19:00:00Z'),uploaded=false,failRead=true;const d=f.delivery;d.status='awaiting_owner';delete d.result;delete d.approval;
   const dispatch=vi.fn(async()=>{uploaded=true;return {providerPostId:'dQw4w9WgXcQ',publishedAt:new Date(now).toISOString()};});
   const w=createProductionWorkflow(f.db,key,{now:()=>now,authorized:async()=>true,generate:async()=>{throw Error('No generation');},render:async()=>[],destinations:async()=>[],verifyAssets:async()=>{},destinationUnchanged:async()=>true,dispatch,recordPublished:(a,j,d)=>recordProductionPublication(f.db,a,j,d)});
   w.store.transact('biz',s=>{s.ownerHubUserId=actor.hubUserId;s.configRevision=1;s.brand=brand;s.plan=plan;s.paused=false;s.jobs=[f.job];});
   w.decision(actor,{jobId:f.job.id,deliveryId:d.id,decision:'approve',digest:d.digest});
   const read=w.store.read;w.store.read=(id)=>{if(uploaded&&failRead){failRead=false;throw Error('Synthetic receipt read outage');}return read(id);};
   now=Date.parse(d.scheduledAt)+1;expect(await w.tick(actor)).toMatchObject({state:'published'});
   expect(w.store.read('biz').jobs[0].deliveries[0].status).toBe('succeeded');await w.tick(actor);expect(dispatch).toHaveBeenCalledTimes(1);
   expect(f.db.prepare('SELECT COUNT(*) n FROM posts').get()).toEqual({n:1});
  }finally{warn.mockRestore();f.db.close();}
 });
 it('only builds canonical links from recognized YouTube video IDs',()=>{
  expect(publicationUrl('youtube','dQw4w9WgXcQ')).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
  for(const id of ['javascript:alert(1)','https://evil.test','../secret','short','a'.repeat(12)])expect(publicationUrl('youtube',id)).toBeUndefined();
  expect(publicationUrl('facebook','dQw4w9WgXcQ')).toBeUndefined();
 });
});
