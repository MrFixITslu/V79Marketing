import { describe,it,expect,vi } from 'vitest';
import Database from 'better-sqlite3';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { brandSchema,createMaterials,reviewMaterials,digest,type ProductionBrand,type ProductionPlan } from '../src/lib/productionContract.js';
import { createProductionWorkflow,type ProductionDependencies } from '../src/lib/productionWorkflow.js';
import { renderProductionAssets,verifyAsset,assetPath } from '../src/lib/productionRenderer.js';

const brand:ProductionBrand={name:'V79 Digital',tagline:'From Idea to Advantage.',audience:'Caribbean SMBs',tone:'Clear and practical',
  website:'https://v79sl.com',cta:'Discuss your business needs',primaryColor:'#081827',accentColor:'#00D5C9',logoPng:null,mailingAddress:null,
  facts:[{id:'ict',service:'ICT support',statement:'V79 Digital provides ICT support.'}]};
const plan:ProductionPlan={automaticDrafts:false,cadenceDays:7,channels:['linkedin','youtube','newsletter'],publishDelayHours:24,
  newsletterSegmentId:null,newsletterFrom:null,newsletterConsentConfirmed:false,youtubePrivacy:'private'};
const actor={businessId:'biz-a',localUserId:'local-owner',hubUserId:'synthetic-hub-owner',organizationId:'synthetic-org-a'};
const creative={hook:'Make business technology practical',tip:'Choose one recurring problem and review the next step with your team.'};
function fixture(overrides:Partial<ProductionDependencies>={}){
  const db=new Database(':memory:');db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE businesses (id TEXT PRIMARY KEY);
    CREATE TABLE users (id TEXT PRIMARY KEY,business_id TEXT NOT NULL);
    INSERT INTO businesses VALUES ('biz-a');
    INSERT INTO users VALUES ('local-owner','biz-a');`);
  let now=Date.parse('2026-10-14T19:00:00Z');const dispatch=vi.fn(async()=>({providerPostId:'synthetic-provider-post',publishedAt:new Date(now).toISOString()}));
  const deps:ProductionDependencies={now:()=>now,authorized:async()=>true,generate:async()=>({source:'brand-template',creative}),render:async()=>[],
    verifyAssets:async()=>{},destinationUnchanged:async()=>true,dispatch,
    destinations:async()=>[{channel:'linkedin',accountId:'exact-account',providerAccountId:'exact-provider-id',accountFingerprint:digest('synthetic-account'),
      scheduledAt:new Date(now+3600000).toISOString(),payload:{caption:'Exact frozen material'}}],...overrides};
  const w=createProductionWorkflow(db,'synthetic-audit-key-at-least-32-characters',deps);
  w.configure(actor,{brand,plan,expectedRevision:0});
  return {db,w,dispatch,advance:(ms:number)=>now+=ms,now:()=>now};
}
async function produce(f:ReturnType<typeof fixture>){f.w.queue(actor,{factId:'ict',angle:'Practical ICT next step',idempotencyKey:'synthetic_package_key_0001'});await f.w.tick(actor);return f.w.store.read(actor.businessId).jobs[0];}
describe('Marketing production red-team controls',()=>{
  it('produces complete private materials; neither generation nor CEO checks authorize publication',async()=>{
    const f=fixture();try{const j=await produce(f);expect(j.status).toBe('awaiting_owner');expect(j.bundle?.materials).toHaveLength(3);
      expect(j.bundle?.materials.find(m=>m.channel==='newsletter')?.newsletterHtml).toContain('RESEND_UNSUBSCRIBE_URL');
      expect(j.bundle?.review.blockers).toEqual([]);expect(f.dispatch).not.toHaveBeenCalled();f.advance(7200000);await f.w.tick(actor);expect(f.dispatch).not.toHaveBeenCalled();
    }finally{f.db.close();}
  });
  it('pins a creator skill, leaves queued and approved jobs immutable, and requires explicit regeneration',async()=>{
    const f=fixture();try{
      const first=await produce(f);
      expect(first.skillPin?.userId).toBe('local-owner');
      expect(first.skillPin?.version).toBe(0);
      const pinned=first.skillPin!.digest;
      // Personal changes may be saved later, but do not rewrite running jobs.
      const {saveSkillDraft,publishOwnSkill}=await import('../src/lib/personalMarketingSkills.js');
      const updated={...first.skillPin!.content,voiceLanguage:'Use concise professional UK English.'};
      saveSkillDraft(f.db,{id:'local-owner',businessId:'biz-a'},0,updated);
      publishOwnSkill(f.db,{id:'local-owner',businessId:'biz-a'},0);
      expect(f.w.store.read(actor.businessId).jobs[0].skillPin!.digest).toBe(pinned);
      const preview=f.w.status(actor).approvalBatch;
      expect(preview.deliveries.length).toBeGreaterThan(0);
      f.w.approveBatch(actor,preview.batchDigest!);
      expect(f.w.store.read(actor.businessId).jobs[0].skillPin!.digest).toBe(pinned);
      const next=f.w.regenerate(actor,first.id,'synthetic_skill_regenerate_0001');
      expect(next.skillPin?.version).toBe(1);
      expect(next.skillPin?.digest).not.toBe(pinned);
      const old=f.w.store.read(actor.businessId).jobs.find(j=>j.id===first.id)!;
      expect(old.status).toBe('cancelled');
      expect(old.deliveries.every(d=>d.status==='cancelled')).toBe(true);
      expect(next.deliveries).toHaveLength(0);
      expect(()=>f.w.regenerate({...actor,localUserId:'another'},next.id,'another_skill_regen_key_0002')).toThrow();
    }finally{f.db.close();}
  });
  it('approves an entire exact batch once, atomically, without any standing permission',async()=>{
    const f=fixture({destinations:async()=>[
      {channel:'linkedin',accountId:'business-page',providerAccountId:'p1',accountFingerprint:digest('page-1'),
        scheduledAt:new Date(future()).toISOString(),payload:{caption:'Approved LinkedIn copy'}},
      {channel:'youtube',accountId:'business-channel',providerAccountId:'p2',accountFingerprint:digest('page-2'),
        scheduledAt:new Date(future()+3600000).toISOString(),payload:{caption:'Approved video copy'}},
    ]});
    function future(){return Date.parse('2026-10-14T20:00:00Z');}
    try{
      await produce(f);
      const preview=f.w.status(actor).approvalBatch;
      expect(preview.deliveries).toHaveLength(2);
      expect(preview.batchDigest).toMatch(/^[a-f0-9]{64}$/);
      expect(()=>f.w.approveBatch(actor,digest('stale batch'))).toThrow();
      expect(f.w.store.read(actor.businessId).jobs[0].deliveries.every(d=>d.status==='awaiting_owner')).toBe(true);
      expect(f.w.approveBatch(actor,preview.batchDigest!)).toEqual({approved:2,batchDigest:preview.batchDigest});
      expect(f.w.store.read(actor.businessId).jobs[0].deliveries.every(d=>d.status==='approved')).toBe(true);
      expect(()=>f.w.approveBatch(actor,preview.batchDigest!)).toThrow();
      expect(f.dispatch).not.toHaveBeenCalled();
      f.advance(3600001);await f.w.tick(actor);
      expect(f.dispatch).toHaveBeenCalledTimes(1);
      f.advance(3600000);await f.w.tick(actor);await f.w.tick(actor);
      expect(f.dispatch).toHaveBeenCalledTimes(2);
    }finally{f.db.close();}
  });
  it('keeps TikTok individual-consent publications outside the bulk approval shortcut',async()=>{
    const f=fixture({destinations:async()=>[
      {channel:'linkedin',accountId:'page',providerAccountId:'p1',accountFingerprint:digest('p1'),
        scheduledAt:'2026-10-14T20:00:00.000Z',payload:{caption:'Reviewed LinkedIn'}},
      {channel:'tiktok',accountId:'creator',providerAccountId:'t1',accountFingerprint:digest('t1'),
        scheduledAt:'2026-10-14T21:00:00.000Z',payload:{caption:'Creator approval needed',tiktok:{privacyLevel:'SELF_ONLY'}}},
    ]});
    try{
      await produce(f);
      const preview=f.w.status(actor).approvalBatch;
      expect(preview.deliveries.map(d=>d.channel)).toEqual(['linkedin']);
      f.w.approveBatch(actor,preview.batchDigest!);
      const job=f.w.store.read(actor.businessId).jobs[0];
      expect(job.deliveries.map(d=>d.status)).toEqual(['approved','awaiting_owner']);
    }finally{f.db.close();}
  });
  it('rejects the entire batch when a reviewed account or scheduled instant changes',async()=>{
    const f=fixture({destinations:async()=>[
      {channel:'linkedin',accountId:'one',providerAccountId:'p1',accountFingerprint:digest('p1'),
        scheduledAt:'2026-10-14T20:00:00.000Z',payload:{caption:'First'}},
      {channel:'youtube',accountId:'two',providerAccountId:'p2',accountFingerprint:digest('p2'),
        scheduledAt:'2026-10-14T21:00:00.000Z',payload:{caption:'Second'}},
    ]});
    try{
      await produce(f);const old=f.w.status(actor).approvalBatch;
      f.w.store.transact(actor.businessId,s=>{s.jobs[0].deliveries[1].providerAccountId='different-account';});
      expect(()=>f.w.approveBatch(actor,old.batchDigest!)).toThrow();
      expect(f.w.store.read(actor.businessId).jobs[0].deliveries.map(d=>d.status)).toEqual(['awaiting_owner','awaiting_owner']);
    }finally{f.db.close();}
  });
  it('keeps V79 homepage untracked and permits opt-in UTM for other customer brands',()=>{
    const v79=createMaterials(brand,plan,'ict',creative);
    expect(v79.every(m=>m.caption.includes('https://v79sl.com'))).toBe(true);
    expect(v79.every(m=>!m.caption.includes('utm_'))).toBe(true);
    const customer={...brand,website:'https://example.org',linkTracking:'utm' as const};
    expect(createMaterials(customer,plan,'ict',creative)[0].caption).toContain('utm_campaign=');
    expect(createMaterials({...brand,linkTracking:'utm'},plan,'ict',creative)[0].caption).not.toContain('utm_');
  });
  it('binds one publication to content, destination, assets and schedule, and never replays a success',async()=>{
    const f=fixture();try{const j=await produce(f),d=j.deliveries[0];
      expect(()=>f.w.decision(actor,{jobId:j.id,deliveryId:d.id,decision:'approve',digest:digest('wrong')})).toThrow();
      f.w.decision(actor,{jobId:j.id,deliveryId:d.id,decision:'approve',digest:d.digest});
      await f.w.tick(actor);expect(f.dispatch).not.toHaveBeenCalled();f.advance(3600001);await f.w.tick(actor);await f.w.tick(actor);
      expect(f.dispatch).toHaveBeenCalledTimes(1);expect(f.w.store.read(actor.businessId).jobs[0].deliveries[0].status).toBe('succeeded');
    }finally{f.db.close();}
  });
  it('rejects payload edits, account substitution, past schedules and owner revocation',async()=>{
    const f=fixture({destinationUnchanged:async()=>false});try{const j=await produce(f),d=j.deliveries[0];
      f.w.store.transact(actor.businessId,s=>{s.jobs[0].deliveries[0].payload.caption='Substituted';});
      expect(()=>f.w.decision(actor,{jobId:j.id,deliveryId:d.id,decision:'approve',digest:d.digest})).toThrow();
    }finally{f.db.close();}
    const g=fixture({destinationUnchanged:async()=>false});try{const j=await produce(g),d=j.deliveries[0];g.w.decision(actor,{jobId:j.id,deliveryId:d.id,decision:'approve',digest:d.digest});g.advance(3600001);
      await g.w.tick(actor);expect(g.dispatch).not.toHaveBeenCalled();expect(g.w.store.read(actor.businessId).jobs[0].deliveries[0].status).toBe('blocked');
    }finally{g.db.close();}
  });
  it('pause, reconfiguration and expiration stop future dispatch',async()=>{
    for(const mode of ['pause','reconfigure','expire']){const f=fixture();try{const j=await produce(f),d=j.deliveries[0];f.w.decision(actor,{jobId:j.id,deliveryId:d.id,decision:'approve',digest:d.digest});
      if(mode==='pause')f.w.pause(actor,true);if(mode==='reconfigure')f.w.configure(actor,{brand:{...brand,tone:'Updated tone'},plan,expectedRevision:1});
      f.advance(mode==='expire'?7200001:3600001);await f.w.tick(actor);expect(f.dispatch).not.toHaveBeenCalled();
    }finally{f.db.close();}}
  });
  it('lost provider receipts become uncertain and never retry automatically',async()=>{
    const dispatch=vi.fn(async()=>{throw Error('Synthetic timeout after possible acceptance');});const f=fixture({dispatch});
    try{const j=await produce(f),d=j.deliveries[0];f.w.decision(actor,{jobId:j.id,deliveryId:d.id,decision:'approve',digest:d.digest});f.advance(3600001);
      await f.w.tick(actor);await f.w.tick(actor);expect(dispatch).toHaveBeenCalledTimes(1);expect(f.w.store.read(actor.businessId).jobs[0].deliveries[0].status).toBe('uncertain');
    }finally{f.db.close();}
  });
  it('rejects direct SQLite tampering and a conflicting idempotency key',async()=>{
    const f=fixture();try{await produce(f);expect(()=>f.w.queue(actor,{factId:'ict',angle:'Changed scope',idempotencyKey:'synthetic_package_key_0001'})).toThrow();
      const row=f.db.prepare('SELECT envelope FROM marketing_production_state').get() as any;const value=JSON.parse(row.envelope);value.state.paused=false;value.state.jobs[0].angle='Tampered';
      f.db.prepare('UPDATE marketing_production_state SET envelope=?').run(JSON.stringify(value));expect(()=>f.w.store.read(actor.businessId)).toThrow(/integrity/);
    }finally{f.db.close();}
  });
  it('signed envelopes cannot be transplanted to another business row',async()=>{
    const f=fixture();try{await produce(f);const row=f.db.prepare('SELECT envelope FROM marketing_production_state').get() as any;
      f.db.prepare('INSERT INTO businesses VALUES (?)').run('biz-b');
      f.db.prepare('INSERT INTO marketing_production_state(business_id,revision,envelope,updated_at) VALUES (?,1,?,?)').run('biz-b',row.envelope,new Date().toISOString());
      expect(()=>f.w.store.read('biz-b')).toThrow(/integrity/);
    }finally{f.db.close();}
  });
  it('automatic standing draft plan never becomes standing publication authority',async()=>{
    const f=fixture();try{f.w.configure(actor,{brand,plan:{...plan,automaticDrafts:true},expectedRevision:1});await f.w.tick(actor);expect(f.w.store.read(actor.businessId).jobs).toHaveLength(1);
      await f.w.tick(actor);expect(f.w.store.read(actor.businessId).jobs).toHaveLength(1);f.advance(7*86400000+1);await f.w.tick(actor);
      expect(f.w.store.read(actor.businessId).jobs).toHaveLength(2);expect(f.dispatch).not.toHaveBeenCalled();
    }finally{f.db.close();}
  });
  it('screens invented numeric claims, external CTA injection and HTML injection',()=>{
    const materials=createMaterials(brand,plan,'ict',{hook:'Guaranteed 90% savings',tip:'Visit https://attacker.invalid now'});
    expect(reviewMaterials(brand,materials).blockers).toContain('Unverified number');expect(reviewMaterials(brand,materials).blockers).toContain('Unapproved CTA destination');
    const html=createMaterials({...brand,name:'<script>bad()</script>'},plan,'ict',creative).find(m=>m.channel==='newsletter')?.newsletterHtml;
    expect(html).not.toContain('<script>');expect(()=>brandSchema.parse({...brand,website:'file:///etc/passwd'})).toThrow();
  });
  it('renders actual PNG/video/subtitles locally, verifies hashes and rejects replaced bytes or traversal',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'v79-production-render-')),jobId=randomUUID();
    try{const assets=await renderProductionAssets(jobId,brand,createMaterials(brand,plan,'ict',creative),{root,width:360,height:640});
      expect(assets.map(a=>a.name)).toContain('short.mp4');expect(assets.map(a=>a.name)).toContain('subtitles.srt');
      const feed=await fs.readFile(assetPath(jobId,'poster-feed.png',root));
      expect(feed.subarray(0,8).toString('hex')).toBe('89504e470d0a1a0a');
      expect(feed.readUInt32BE(16)).toBe(360);
      expect(feed.readUInt32BE(20)).toBe(450); // 4:5; 1080x1350 in production.
      for(const asset of assets)await verifyAsset(jobId,asset,root);
      const png=assets.find(a=>a.name==='poster-square.png')!;await fs.writeFile(assetPath(jobId,png.name,root),'replaced');await expect(verifyAsset(jobId,png,root)).rejects.toThrow();
      expect(()=>assetPath('../escape','copy.json',root)).toThrow();expect(()=>assetPath(jobId,'../secret',root)).toThrow();
    }finally{await fs.rm(root,{recursive:true,force:true});}
  },180000);
});
