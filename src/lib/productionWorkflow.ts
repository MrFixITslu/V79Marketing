import type Database from 'better-sqlite3';
import { randomUUID } from 'node:crypto';
import {ensurePersonalSkillTables,snapshotOwnSkill} from './personalMarketingSkills.js';
import { publicationUrl } from './publicationLinks.js';
import { configureSchema, queueSchema, creativeSchema, createMaterials, reviewMaterials, digest,
  type Creative, type ProductionBrand, type ProductionPlan, type ProductionBundle, type Asset } from './productionContract.js';
import { productionStore, productionEvent, queueProduction, decideDelivery, claimDelivery, deliveryDigest,
  type ProductionJob, type Destination, type Delivery, previewApprovalBatch, approveDeliveryBatch } from './productionStore.js';

export type ProductionActor={businessId:string;hubUserId:string;localUserId:string;organizationId:string};
export type ProductionDependencies={
  generate:(brand:ProductionBrand,plan:ProductionPlan,job:ProductionJob)=>Promise<{source:'ollama'|'brand-template';creative:Creative}>;
  render:(jobId:string,brand:ProductionBrand,materials:ReturnType<typeof createMaterials>)=>Promise<Asset[]>;
  destinations:(actor:ProductionActor,job:ProductionJob,bundle:ProductionBundle,plan:ProductionPlan)=>Promise<(Destination&{blocker?:string})[]>;
  verifyAssets:(job:ProductionJob)=>Promise<void>;
  authorized:(actor:ProductionActor)=>Promise<boolean>;
  destinationUnchanged:(actor:ProductionActor,d:Delivery)=>Promise<boolean>;
  dispatch:(actor:ProductionActor,job:ProductionJob,d:Delivery,authorize:()=>Promise<void>)=>Promise<{providerPostId:string;publishedAt:string}>;
  recordPublished?:(actor:ProductionActor,job:ProductionJob,d:Delivery)=>{postId:string};
  now?:()=>number;
};
export function createProductionWorkflow(db:Database.Database,key:string,deps:ProductionDependencies) {
  ensurePersonalSkillTables(db);
  const store=productionStore(db,key),clock=deps.now||Date.now;
  const creatorSkill=(actor:ProductionActor)=>snapshotOwnSkill(db,{id:actor.localUserId,businessId:actor.businessId});
  function configure(actor:ProductionActor,input:unknown) {
    const data=configureSchema.parse(input);
    return store.transact(actor.businessId,s=>{
      if(s.configRevision!==data.expectedRevision)throw Error('Configuration revision changed');
      if(s.ownerHubUserId&&s.ownerHubUserId!==actor.hubUserId)throw Error('Owner changed; reconcile before reconfiguration');
      if(s.jobs.some(j=>j.status==='generating'||j.deliveries.some(d=>d.status==='running')))throw Error('An active worker must finish before configuration changes');
      for(const j of s.jobs){if(j.status==='queued')j.status='cancelled';for(const d of j.deliveries)
        if(['awaiting_owner','approved'].includes(d.status))d.status='cancelled';}
      s.configRevision++;s.ownerHubUserId=actor.hubUserId;s.ownerLocalUserId=actor.localUserId;s.brand=data.brand;s.plan=data.plan;s.paused=false;
      productionEvent(s,'owner_brand_and_draft_plan_configured',actor.hubUserId,null,null,clock());
      return {configRevision:s.configRevision};
    });
  }
  function queue(actor:ProductionActor,input:unknown){const data=queueSchema.parse(input);
    const pin=creatorSkill(actor);
    return store.transact(actor.businessId,s=>queueProduction(s,data,actor.hubUserId,clock(),pin));}
  function regenerate(actor:ProductionActor,jobId:string,idempotencyKey:string){
    if(!/^[A-Za-z0-9_-]{16,96}$/.test(idempotencyKey))throw Error('Invalid regeneration key');
    const pin=creatorSkill(actor);
    return store.transact(actor.businessId,s=>{
      const previous=s.jobs.find(j=>j.id===jobId);
      if(!previous||!previous.skillPin||previous.skillPin.userId!==actor.localUserId||
         previous.status==='generating'||previous.deliveries.some(d=>['running','succeeded','uncertain'].includes(d.status)))
        throw Error('Started or unrelated job cannot be regenerated');
      const found=s.jobs.find(j=>j.key===idempotencyKey);
      if(found)throw Error('Regeneration key already used');
      previous.status='cancelled';
      for(const d of previous.deliveries)if(['awaiting_owner','approved','blocked'].includes(d.status))d.status='cancelled';
      const next=queueProduction(s,{factId:previous.factId,angle:previous.angle,
        idempotencyKey},actor.hubUserId,clock(),pin);
      productionEvent(s,'creator_explicit_regeneration',actor.hubUserId,next.id,null,clock());
      return next;
    });
  }
  function decision(actor:ProductionActor,input:{jobId:string;deliveryId:string;decision:'approve'|'reject';digest:string}) {
    return store.transact(actor.businessId,s=>decideDelivery(s,input.jobId,input.deliveryId,input.decision,input.digest,actor.hubUserId,clock()));
  }
  function approveBatch(actor:ProductionActor,batchDigest:string){return store.transact(actor.businessId,s=>approveDeliveryBatch(s,batchDigest,actor.hubUserId,clock()));}
  function pause(actor:ProductionActor,value:boolean){return store.transact(actor.businessId,s=>{
    s.paused=value;productionEvent(s,value?'owner_paused':'owner_resumed',actor.hubUserId,null,null,clock());return {paused:s.paused};});}
  function cancel(actor:ProductionActor,jobId:string){return store.transact(actor.businessId,s=>{
    const j=s.jobs.find(j=>j.id===jobId);if(!j)throw Error('Package not found');
    if(j.status==='generating'||j.deliveries.some(d=>['running','succeeded','uncertain'].includes(d.status)))throw Error('Started effects require operator reconciliation');
    j.status='cancelled';for(const d of j.deliveries)if(['awaiting_owner','approved','blocked'].includes(d.status))d.status='cancelled';
    productionEvent(s,'owner_cancelled_package',actor.hubUserId,jobId,null,clock());return {cancelled:true};});}
  function status(actor:ProductionActor){const s=store.read(actor.businessId);return {...s,approvalBatch:previewApprovalBatch(s,clock()),events:s.events.slice(-100),jobs:s.jobs.slice(-30).reverse().map(j=>({...j,
    deliveries:j.deliveries.map(d=>d.status==='succeeded'&&d.result?{...d,result:{...d.result,providerUrl:publicationUrl(d.channel,d.result.providerPostId)}}:d)}))};}
  function syncPublished(actor:ProductionActor){
    if(!deps.recordPublished)return;
    try{
    for(const job of store.read(actor.businessId).jobs)for(const delivery of job.deliveries){
      if(delivery.status!=='succeeded'||!delivery.result)continue;
      try{
        // Projection and its signed acknowledgment are atomic. The previously
        // saved provider receipt survives any local tracking failure.
        db.transaction(()=>{
          const tracked=deps.recordPublished!(actor,job,delivery);
          if(delivery.result!.marketingPostId===tracked.postId)return;
          store.transact(actor.businessId,s=>{
            const j=s.jobs.find(v=>v.id===job.id)!,d=j.deliveries.find(v=>v.id===delivery.id)!;
            if(d.status!=='succeeded'||!d.result||d.result.providerPostId!==delivery.result!.providerPostId)throw Error('Receipt changed');
            d.result.marketingPostId=tracked.postId;productionEvent(s,'marketing_post_recorded','coo-worker',j.id,d.id,clock());
          });
        }).immediate();
      }catch{console.warn('Confirmed production receipt retained; local Marketing tracking will be checked again.');}
    }
    }catch{console.warn('Confirmed receipt tracking unavailable; no upload retry was requested.');}
  }
  let running=false;
  async function tick(actor:ProductionActor){
    if(running)return {state:'busy'};running=true;
    try{
      // Read the current Hub permission before production and every publication.
      if(!await deps.authorized(actor))return {state:'owner_or_entitlement_unavailable'};
      syncPublished(actor);
      const claimed=store.transact(actor.businessId,s=>{
        if(s.paused||!s.brand||!s.plan||s.ownerHubUserId!==actor.hubUserId||s.ownerLocalUserId!==actor.localUserId)return null;
        if(s.plan.automaticDrafts&&(!s.lastAutomaticAt||clock()-Date.parse(s.lastAutomaticAt)>=s.plan.cadenceDays*86400000)){
          const index=s.jobs.length%s.brand.facts.length;
          const epoch=Math.floor(clock()/(s.plan.cadenceDays*86400000));
          queueProduction(s,{factId:s.brand.facts[index].id,angle:'Practical Caribbean SMB service spotlight',
            idempotencyKey:'automatic_draft_'+s.configRevision+'_'+epoch},'coo-worker',clock(),creatorSkill(actor));
          s.lastAutomaticAt=new Date(clock()).toISOString();
        }
        if(s.jobs.some(j=>j.status==='generating'))return null;
        const j=s.jobs.find(j=>j.status==='queued'&&j.configRevision===s.configRevision);
        if(!j)return null;j.status='generating';productionEvent(s,'coo_production_claimed','coo-worker',j.id,null,clock());
        return {job:j,brand:s.brand,plan:s.plan};
      });
      if(claimed){
        try{
          if(!claimed.job.skillPin||claimed.job.skillPin.userId!==actor.localUserId||claimed.job.skillPin.businessId!==actor.businessId)
            throw Error('Creator skill binding unavailable');
          const result=await deps.generate(claimed.brand,claimed.plan,claimed.job);
          const creative=creativeSchema.parse(result.creative);
          const materials=createMaterials(claimed.brand,claimed.plan,claimed.job.factId,creative,claimed.job.id);
          const review=reviewMaterials(claimed.brand,materials,new Date(clock()));
          const assets=review.blockers.length?[]:await deps.render(claimed.job.id,claimed.brand,materials);
          const bundle:ProductionBundle={schemaVersion:1,source:result.source,brand:claimed.brand,factId:claimed.job.factId,
            angle:claimed.job.angle,materials,assets,review};
          const destinations=review.blockers.length?[]:await deps.destinations(actor,claimed.job,bundle,claimed.plan);
          store.transact(actor.businessId,s=>{
            const j=s.jobs.find(j=>j.id===claimed.job.id)!;
            if(j.status!=='generating'||j.configRevision!==s.configRevision)throw Error('Generation claim changed');
            j.bundle=bundle;j.bundleDigest=digest(bundle);j.status=review.blockers.length?'blocked':'awaiting_owner';
            j.deliveries=destinations.map(destination=>({...destination,id:randomUUID(),digest:deliveryDigest(j,destination),
              status:destination.blocker?'blocked':'awaiting_owner',blocker:destination.blocker}));
            productionEvent(s,'ceo_checks_completed','ceo-review',j.id,null,clock());
          });
        }catch{
          store.transact(actor.businessId,s=>{const j=s.jobs.find(j=>j.id===claimed.job.id)!;
            j.status='blocked';j.failure='Generation or local rendering failed. Inspect the worker and queue a new package; no publication occurred.';
            productionEvent(s,'production_failed','coo-worker',j.id,null,clock());});
        }
      }
      const ready=store.transact(actor.businessId,s=>claimDelivery(s,clock()));
      if(!ready)return {state:claimed?'produced':'idle'};
      let attempted=false;
      try{
        if(!ready.job.skillPin||ready.job.skillPin.userId!==actor.localUserId||ready.job.skillPin.businessId!==actor.businessId)
          throw Error('Production creator skill or entitlement mismatch');
        await deps.verifyAssets(ready.job);
        if(!await deps.destinationUnchanged(actor,ready.delivery))throw Error('Destination changed');
        if(!await deps.authorized(actor))throw Error('Owner permission unavailable');
        const current=store.read(actor.businessId),j=current.jobs.find(j=>j.id===ready.job.id),d=j?.deliveries.find(d=>d.id===ready.delivery.id);
        if(current.paused||!j||!d||d.status!=='running'||j.configRevision!==current.configRevision||
          d.approval?.digest!==d.digest||deliveryDigest(j,d)!==d.digest||digest(j.bundle)!==j.bundleDigest||Date.parse(d.approval.expiresAt)<=clock())
          throw Error('Approval revoked, paused, expired or changed');
        // From here a provider may accept the request even if the response is lost.
        // No automatic retry or timeout-based reclaim is allowed.
        attempted=true;
        const authorize=async()=>{
          if(!await deps.authorized(actor))throw Error('Owner permission changed');
          const latest=store.read(actor.businessId),job=latest.jobs.find(v=>v.id===j.id),delivery=job?.deliveries.find(v=>v.id===d.id);
          if(latest.paused||!job||!delivery||delivery.status!=='running'||job.configRevision!==latest.configRevision||
             delivery.approval?.digest!==delivery.digest||deliveryDigest(job,delivery)!==delivery.digest||
             digest(job.bundle)!==job.bundleDigest||Date.parse(delivery.approval.expiresAt)<=clock())throw Error('Authorization changed');
        };
        const result=await deps.dispatch(actor,j,d,authorize);
        if(!result.providerPostId)throw Error('Provider receipt unavailable');
        store.transact(actor.businessId,s=>{const job=s.jobs.find(job=>job.id===ready.job.id)!,delivery=job.deliveries.find(d=>d.id===ready.delivery.id)!;
          if(delivery.status!=='running')throw Error('Dispatch state changed');
          delivery.status='succeeded';delivery.result={providerPostId:result.providerPostId,at:result.publishedAt};
          productionEvent(s,'provider_accepted','coo-worker',job.id,delivery.id,clock());});
        syncPublished(actor);
        return {state:'published',deliveryId:ready.delivery.id};
      }catch{
        store.transact(actor.businessId,s=>{const j=s.jobs.find(j=>j.id===ready.job.id)!,d=j.deliveries.find(d=>d.id===ready.delivery.id)!;
          d.status=attempted?'uncertain':'blocked';d.blocker=attempted?'Provider may have accepted the request. Inspect provider before any new approval.':'Dispatch stopped before provider call; review permission, assets, destination and approval.';
          productionEvent(s,attempted?'provider_outcome_uncertain':'dispatch_blocked','coo-worker',j.id,d.id,clock());});
        return {state:attempted?'uncertain':'blocked'};
      }
    }finally{running=false;}
  }
  return {store,configure,queue,regenerate,decision,approveBatch,pause,cancel,status,tick};
}
