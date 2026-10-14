import type Database from 'better-sqlite3';
import { createHmac, randomUUID, timingSafeEqual } from 'node:crypto';
import { canonical, digest, type ProductionBrand, type ProductionPlan, type ProductionBundle } from './productionContract.js';

export type Destination = {channel:string; accountId:string; providerAccountId:string; accountFingerprint:string;
  scheduledAt:string; payload:Record<string,unknown>; audienceFingerprint?:string; audienceCount?:number };
export type Delivery = Destination & {id:string; digest:string; status:'awaiting_owner'|'approved'|'running'|'succeeded'|'blocked'|'uncertain'|'rejected'|'cancelled';
  blocker?:string; approval?:{by:string; digest:string; expiresAt:string; at:string}; result?:{providerPostId:string; at:string} };
export type ProductionJob = {id:string; key:string; inputDigest:string; factId:string; angle:string; configRevision:number;
  status:'queued'|'generating'|'awaiting_owner'|'blocked'|'cancelled'; createdAt:string; source?:string;
  bundle?:ProductionBundle; bundleDigest?:string; deliveries:Delivery[]; failure?:string };
export type ProductionState = {version:1; paused:boolean; configRevision:number; ownerHubUserId:string;
  brand:ProductionBrand|null; plan:ProductionPlan|null; lastAutomaticAt:string|null;
  seenRequests:{id:string;expiresAt:number}[]; jobs:ProductionJob[]; events:{type:string; actor:string; at:string; jobId:string|null; deliveryId:string|null}[] };
export function initialProductionState():ProductionState {
  return {version:1,paused:true,configRevision:0,ownerHubUserId:'',brand:null,plan:null,lastAutomaticAt:null,seenRequests:[],jobs:[],events:[]};
}
export function productionStore(db:Database.Database, secret:string) {
  if (secret.length < 32) throw Error('Dedicated production audit key required');
  db.exec(`CREATE TABLE IF NOT EXISTS marketing_production_state (
    business_id TEXT PRIMARY KEY REFERENCES businesses(id), revision INTEGER NOT NULL,
    envelope TEXT NOT NULL, updated_at TEXT NOT NULL);`);
  const mac = (s:ProductionState,businessId:string) => createHmac('sha256',secret).update('v79-marketing-production-v1\n'+businessId+'\n'+canonical(s)).digest('hex');
  const read = (businessId:string):ProductionState => {
    const row = db.prepare('SELECT envelope FROM marketing_production_state WHERE business_id=?').get(businessId) as {envelope:string}|undefined;
    if (!row) return initialProductionState();
    const {state,hmac} = JSON.parse(row.envelope);
    if (!/^[a-f0-9]{64}$/.test(hmac||'') || !timingSafeEqual(Buffer.from(mac(state,businessId)),Buffer.from(hmac)) ||
        state.version!==1 || !Array.isArray(state.jobs) || !Array.isArray(state.events) || typeof state.paused!=='boolean') throw Error('Production ledger integrity failed');
    return structuredClone(state);
  };
  function transact<T>(businessId:string, fn:(s:ProductionState)=>T):T {
    return db.transaction(() => {
      const state = read(businessId);
      const result = fn(state);
      if (state.jobs.length>200 || state.events.length>4000) throw Error('Production history capacity reached');
      const envelope = canonical({state,hmac:mac(state,businessId)});
      db.prepare(`INSERT INTO marketing_production_state (business_id,revision,envelope,updated_at) VALUES (?,1,?,?)
        ON CONFLICT(business_id) DO UPDATE SET revision=revision+1,envelope=excluded.envelope,updated_at=excluded.updated_at`)
        .run(businessId,envelope,new Date().toISOString());
      return structuredClone(result);
    }).immediate();
  }
  return {read,transact};
}
export function productionEvent(s:ProductionState,type:string,actor:string,jobId:string|null=null,deliveryId:string|null=null,now=Date.now()) {
  s.events.push({type,actor,at:new Date(now).toISOString(),jobId,deliveryId});
}
export function queueProduction(s:ProductionState,input:{factId:string;angle:string;idempotencyKey:string},actor:string,now=Date.now()) {
  if (!s.brand || !s.plan || !s.brand.facts.some(f=>f.id===input.factId) || s.paused) throw Error('Approved active brand plan required');
  const inputDigest = digest({factId:input.factId,angle:input.angle,configRevision:s.configRevision});
  const prior = s.jobs.find(j=>j.key===input.idempotencyKey);
  if (prior) {if (prior.inputDigest!==inputDigest) throw Error('Idempotency conflict'); return prior;}
  if (s.jobs.length>=200) throw Error('Production history capacity reached');
  const job:ProductionJob={id:randomUUID(),key:input.idempotencyKey,inputDigest,factId:input.factId,
    angle:input.angle,configRevision:s.configRevision,status:'queued',createdAt:new Date(now).toISOString(),deliveries:[]};
  s.jobs.push(job); productionEvent(s,'coo_production_queued',actor,job.id,null,now); return job;
}
export function deliveryDigest(job:ProductionJob,d:Destination) {
  return digest({bundleDigest:job.bundleDigest,configRevision:job.configRevision,channel:d.channel,
    accountId:d.accountId,providerAccountId:d.providerAccountId,accountFingerprint:d.accountFingerprint,
    scheduledAt:d.scheduledAt,payload:d.payload,audienceFingerprint:d.audienceFingerprint||null,audienceCount:d.audienceCount||null});
}
export function decideDelivery(s:ProductionState,jobId:string,id:string,choice:'approve'|'reject',hash:string,actor:string,now=Date.now()) {
  const j=s.jobs.find(j=>j.id===jobId), d=j?.deliveries.find(d=>d.id===id);
  if (!j || !d || j.configRevision!==s.configRevision || s.paused || j.status!=='awaiting_owner' ||
      d.status!=='awaiting_owner' || d.digest!==hash || deliveryDigest(j,d)!==hash || !j.bundle ||
      digest(j.bundle)!==j.bundleDigest || j.bundle.review.blockers.length) throw Error('Exact reviewable delivery required');
  if (choice==='approve') {
    const scheduled=Date.parse(d.scheduledAt);
    if (!Number.isFinite(scheduled) || scheduled<=now || scheduled-now>14*86400000) throw Error('Review a future schedule within fourteen days');
    d.status='approved'; d.approval={by:actor,digest:hash,at:new Date(now).toISOString(),expiresAt:new Date(scheduled+3600000).toISOString()};
  } else if (choice==='reject') d.status='rejected'; else throw Error('Invalid decision');
  productionEvent(s,choice==='approve'?'owner_exact_publication_approved':'owner_publication_rejected',actor,j.id,d.id,now);
  return d;
}
export function claimDelivery(s:ProductionState,now=Date.now()) {
  if (s.paused) return null;
  for (const j of s.jobs) for (const d of j.deliveries) {
    if (d.status!=='approved') continue;
    if (j.configRevision!==s.configRevision || !j.bundle || digest(j.bundle)!==j.bundleDigest ||
        d.approval?.digest!==d.digest || deliveryDigest(j,d)!==d.digest || Date.parse(d.approval.expiresAt)<=now) {
      d.status='blocked';d.blocker='Approval expired or exact content/configuration changed';continue;
    }
    if (Date.parse(d.scheduledAt)>now) continue;
    d.status='running';productionEvent(s,'worker_dispatch_claimed','coo-worker',j.id,d.id,now);
    return {job:j,delivery:d};
  }
  // Running or uncertain deliveries are never reclaimed, even after a crash.
  return null;
}
