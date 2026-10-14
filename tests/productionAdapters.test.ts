import { describe,it,expect,vi,beforeEach,afterEach } from 'vitest';
import Database from 'better-sqlite3';
import { productionAdapters } from '../src/lib/productionAdapters.js';
import { createMaterials,reviewMaterials,digest,type ProductionBrand,type ProductionPlan,type ProductionBundle } from '../src/lib/productionContract.js';
import type { ProductionJob,Delivery } from '../src/lib/productionStore.js';
vi.mock('../src/lib/socialProviders.js',()=>({refreshProviderAccess:async(a:unknown)=>a,publishWithProvider:vi.fn(async()=>({providerPostId:'synthetic-post',publishedAt:new Date().toISOString()})),
  queryTikTokCreatorInfo:async()=>({privacyLevelOptions:['SELF_ONLY'],commentDisabled:false})}));
const brand:ProductionBrand={name:'V79 Digital',tagline:'From Idea to Advantage.',audience:'Caribbean SMBs',tone:'Practical',website:'https://v79sl.com',
  cta:'Discuss your next step',primaryColor:'#081827',accentColor:'#00D5C9',logoPng:null,mailingAddress:'Synthetic test mailing address',
  facts:[{id:'ict',service:'ICT support',statement:'V79 Digital provides ICT support.'}]};
const segment='00000000-0000-4000-8000-000000000111';
const plan:ProductionPlan={automaticDrafts:false,cadenceDays:7,channels:['newsletter'],publishDelayHours:24,
  newsletterSegmentId:segment,newsletterFrom:'synthetic@v79sl.test',newsletterConsentConfirmed:true,youtubePrivacy:'private'};
const actor={businessId:'biz',localUserId:'owner',hubUserId:'hub-owner',organizationId:'owner-org'};
function fixture(){const db=new Database(':memory:');db.exec(`CREATE TABLE social_accounts(id TEXT, business_id TEXT, platform TEXT, connected INTEGER,provider_account_id TEXT,provider_metadata_json TEXT,token_scopes TEXT,legal_version TEXT,legal_consented_at TEXT);
  CREATE TABLE users(id TEXT,business_id TEXT,hub_user_id TEXT,email TEXT,role TEXT);CREATE TABLE businesses(id TEXT,hub_organization_id TEXT);
  INSERT INTO users VALUES('owner','biz','hub-owner','vision79slu@gmail.com','BUSINESS_OWNER');INSERT INTO businesses VALUES('biz','owner-org');`);
  const materials=createMaterials(brand,plan,'ict',{hook:'Start with one practical improvement',tip:'Review a recurring task with your team.'});
  const bundle:ProductionBundle={schemaVersion:1,source:'brand-template',brand,factId:'ict',angle:'Business improvement',materials,assets:[],review:reviewMaterials(brand,materials)};
  const job:ProductionJob={id:'00000000-0000-4000-8000-000000000222',key:'synthetic-key',inputDigest:'',configRevision:1,factId:'ict',angle:'Business improvement',status:'awaiting_owner',createdAt:new Date().toISOString(),bundle,bundleDigest:digest(bundle),deliveries:[]};
  return {db,bundle,job,deps:productionAdapters(db)};}
beforeEach(()=>{vi.stubEnv('APP_URL','https://marketing.v79sl.test');vi.stubEnv('V79_MARKETING_PRODUCTION_PUBLISH_ENABLED','1');
  vi.stubEnv('V79_NEWSLETTER_SEGMENT_ID',segment);vi.stubEnv('V79_NEWSLETTER_FROM','synthetic@v79sl.test');vi.stubEnv('V79_NEWSLETTER_RESEND_API_KEY','synthetic-not-real');});
afterEach(()=>{vi.unstubAllEnvs();vi.unstubAllGlobals();});
describe('Exact newsletter recipient scope and provider boundary',()=>{
  it('keeps subscriber records out of model/approval text, checks audience drift, and sends only after final authorization',async()=>{
    let changed=false;const calls:any[]=[];
    vi.stubGlobal('fetch',vi.fn(async(url:string,options:any)=>{
      calls.push({url,options});
      if(url.includes('/segments/'))return new Response(JSON.stringify({has_more:false,data:[{id:changed?'new-member':'confirmed-member',email:'synthetic-subscriber@example.invalid',unsubscribed:false}]}),{status:200});
      expect(url).toBe('https://api.resend.com/broadcasts');return new Response(JSON.stringify({id:'synthetic-broadcast'}),{status:200});
    }));
    const f=fixture();try{
      const destination=(await f.deps.destinations(actor,f.job,f.bundle,plan))[0];expect(destination.blocker).toBeUndefined();
      expect(JSON.stringify(destination)).not.toContain('synthetic-subscriber');expect(destination.audienceCount).toBe(1);
      const d={...destination,id:'delivery',digest:'hash',status:'running'} as Delivery;
      expect(await f.deps.destinationUnchanged(actor,d)).toBe(true);changed=true;expect(await f.deps.destinationUnchanged(actor,d)).toBe(false);
      await expect(f.deps.dispatch(actor,f.job,d,async()=>{})).rejects.toThrow(/Audience changed/);expect(calls.filter(c=>c.url.endsWith('/broadcasts'))).toHaveLength(0);
      changed=false;const authorize=vi.fn(async()=>{});const receipt=await f.deps.dispatch(actor,f.job,d,authorize);
      expect(authorize).toHaveBeenCalledTimes(1);expect(receipt.providerPostId).toBe('synthetic-broadcast');
      const body=JSON.parse(calls.find(c=>c.url.endsWith('/broadcasts')).options.body);expect(body.segment_id).toBe(segment);expect(body.send).toBe(true);expect(body.html).toContain('RESEND_UNSUBSCRIBE_URL');
    }finally{f.db.close();}
  });
  it('asks Hub for uncached current founder permission with scoped identity and a separate signature',async()=>{
    vi.stubEnv('V79_HUB_INTERNAL_URL','http://127.0.0.1:39999');vi.stubEnv('V79_MARKETING_PRODUCTION_SHARED_SECRET','synthetic-authorization-key-32-characters');
    let permitted=true;const mocked=vi.fn(async(url:URL,options:any)=>{
      expect(String(url)).toBe('http://127.0.0.1:39999/internal/marketing-production/authorization');
      expect(JSON.parse(options.body)).toEqual({organizationId:actor.organizationId,actorHubUserId:actor.hubUserId});
      expect(options.headers['x-v79-service-id']).toBe('v79-marketing');expect(options.headers['x-v79-signature']).toMatch(/^[a-f0-9]{64}$/);
      return new Response(JSON.stringify({allowed:permitted,cacheSeconds:0}));
    });vi.stubGlobal('fetch',mocked);const f=fixture();try{
      expect(await f.deps.authorized(actor)).toBe(true);permitted=false;expect(await f.deps.authorized(actor)).toBe(false);expect(mocked).toHaveBeenCalledTimes(2);
    }finally{f.db.close();}
  });
  it('missing consent, mailing address, oversized or incomplete audience cannot become sendable',async()=>{
    const fetchMock=vi.fn(async()=>new Response(JSON.stringify({has_more:true,data:[]})));vi.stubGlobal('fetch',fetchMock);
    const f=fixture();try{
      const noConsent=(await f.deps.destinations(actor,f.job,f.bundle,{...plan,newsletterConsentConfirmed:false}))[0];expect(noConsent.blocker).toBeTruthy();expect(fetchMock).not.toHaveBeenCalled();
      const incomplete=(await f.deps.destinations(actor,f.job,f.bundle,plan))[0];expect(incomplete.blocker).toContain('unavailable');
      const wrongSender=(await f.deps.destinations(actor,f.job,f.bundle,{...plan,newsletterFrom:'other@example.invalid'}))[0];expect(wrongSender.blocker).toBeTruthy();
    }finally{f.db.close();}
  });
});
