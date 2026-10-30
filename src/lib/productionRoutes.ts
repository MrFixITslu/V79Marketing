import express from 'express';
import type Database from 'better-sqlite3';
import { timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { signPlatformRequest } from './platform.js';
import { createProductionWorkflow, type ProductionActor, type ProductionDependencies } from './productionWorkflow.js';
import { productionAdapters } from './productionAdapters.js';
import { verifyAsset } from './productionRenderer.js';

const id=z.string().uuid();
const requestSchema=z.discriminatedUnion('action',[
  z.object({action:z.literal('list')}).strict(),
  z.object({action:z.literal('configure'),config:z.unknown()}).strict(),
  z.object({action:z.literal('queue'),request:z.unknown()}).strict(),
  z.object({action:z.literal('decision'),jobId:id,deliveryId:id,decision:z.enum(['approve','reject']),digest:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  z.object({action:z.literal('approve_batch'),batchDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict(),
  z.object({action:z.literal('pause'),paused:z.boolean()}).strict(),
  z.object({action:z.literal('cancel'),jobId:id}).strict(),
  z.object({action:z.literal('asset'),jobId:id,name:z.enum(['poster-square.png','poster-wide.png','short.mp4','subtitles.srt','newsletter.html','copy.json'])}).strict(),
]);
export function installProductionRoutes(app:express.Express,db:Database.Database,options:{deps?:ProductionDependencies;env?:NodeJS.ProcessEnv}={}) {
  const env=options.env||process.env;
  let workflow:ReturnType<typeof createProductionWorkflow>|null=null;
  function active(){return env.V79_MARKETING_PRODUCTION_ENABLED==='1';}
  function ready(){
    if(!active())throw Error('Marketing production disabled');
    if(!env.V79_MARKETING_PRODUCTION_OWNER_ORG_ID||!env.V79_MARKETING_PRODUCTION_SHARED_SECRET||
       env.V79_MARKETING_PRODUCTION_SHARED_SECRET.length<32||!env.V79_MARKETING_PRODUCTION_AUDIT_KEY||env.V79_MARKETING_PRODUCTION_AUDIT_KEY.length<32)
      throw Error('Dedicated production configuration missing');
    workflow??=createProductionWorkflow(db,env.V79_MARKETING_PRODUCTION_AUDIT_KEY,options.deps||productionAdapters(db));
    return workflow;
  }
  function actor(org:string,userId?:string):ProductionActor|null {
    if(org!==env.V79_MARKETING_PRODUCTION_OWNER_ORG_ID)return null;
    const rows=db.prepare(`SELECT b.id businessId,u.id localUserId,u.hub_user_id hubUserId,b.hub_organization_id organizationId
      FROM businesses b JOIN users u ON u.business_id=b.id WHERE b.hub_organization_id=?
      AND u.email='vision79slu@gmail.com' AND u.role='BUSINESS_OWNER'`).all(org) as ProductionActor[];
    if(rows.length!==1||!rows[0].hubUserId||userId&&rows[0].hubUserId!==userId)return null;
    return rows[0];
  }
  app.post('/api/platform/marketing-production',async(req:any,res)=>{
    res.setHeader('Cache-Control','no-store');
    if(!active())return res.status(503).json({error:'Marketing production disabled'});
    try{
      const envelope=z.object({organizationId:z.string().min(8).max(180),actorHubUserId:z.string().min(8).max(180),
        mfaVerifiedAt:z.number().nullable(),requestNonce:z.string().uuid(),request:requestSchema}).strict().parse(req.body);
      const ts=req.get('x-v79-timestamp')||'',supplied=req.get('x-v79-signature')||'';
      const key=env.V79_MARKETING_PRODUCTION_SHARED_SECRET||'';
      const body=req.rawBody?.toString('utf8')||JSON.stringify(req.body);
      const expected=signPlatformRequest({method:req.method,pathname:req.path,timestamp:ts,body,secret:key});
      if(key.length<32||req.get('x-v79-service-id')!=='v79-hub'||req.get('origin')||req.get('cookie')||
         !/^\d{13}$/.test(ts)||Math.abs(Date.now()-Number(ts))>300000||!/^[a-f0-9]{64}$/.test(supplied)||
         !timingSafeEqual(Buffer.from(expected),Buffer.from(supplied)))return res.status(401).json({error:'Trusted Hub signature required'});
      const identity=actor(envelope.organizationId,envelope.actorHubUserId);
      if(!identity)return res.status(403).json({error:'Exact V79 founder identity required'});
      const w=ready(),request=envelope.request;
      if(!['list','asset'].includes(request.action)){
        const at=envelope.mfaVerifiedAt;
        if(at===null||Date.now()-at<0||Date.now()-at>300000)return res.status(403).json({error:'Fresh founder MFA required'});
      }
      w.store.transact(identity.businessId,s=>{
        s.seenRequests=s.seenRequests.filter(n=>n.expiresAt>Date.now());
        if(s.seenRequests.some(n=>n.id===envelope.requestNonce)||s.seenRequests.length>=1000)throw Error('Hub request replay or request capacity');
        s.seenRequests.push({id:envelope.requestNonce,expiresAt:Number(ts)+300000});
      });
      if(request.action==='list'){
        const state=w.status(identity);
        return res.json({mode:'owner-approved-marketing-production',...state,
          publishEnabled:env.V79_MARKETING_PRODUCTION_PUBLISH_ENABLED==='1',
          nextSteps:state.jobs.flatMap(j=>j.deliveries.filter(d=>['blocked','uncertain','awaiting_owner'].includes(d.status))
            .map(d=>({jobId:j.id,channel:d.channel,status:d.status,message:d.blocker||'Review the exact material, destination and schedule'}))).slice(0,20)});
      }
      if(request.action==='configure')return res.json(w.configure(identity,request.config));
      if(request.action==='queue')return res.status(201).json({job:w.queue(identity,request.request)});
      if((request.action==='decision'&&request.decision==='approve'||request.action==='approve_batch')&&env.V79_MARKETING_PRODUCTION_PUBLISH_ENABLED!=='1')return res.status(503).json({error:'Provider publication disabled'});
       if(request.action==='approve_batch')return res.json(w.approveBatch(identity,request.batchDigest));
      if(request.action==='decision')return res.json({delivery:w.decision(identity,request)});
      if(request.action==='pause')return res.json(w.pause(identity,request.paused));
      if(request.action==='cancel')return res.json(w.cancel(identity,request.jobId));
      const job=w.store.read(identity.businessId).jobs.find(j=>j.id===request.jobId);
      const asset=job?.bundle?.assets.find(a=>a.name===request.name);
      if(!job||!asset)return res.status(404).json({error:'Package asset unavailable'});
      const bytes=await verifyAsset(job.id,asset);
      return res.json({name:asset.name,mime:asset.mime,sha256:asset.sha256,base64:bytes.toString('base64')});
    }catch{return res.status(409).json({error:'Production request rejected. Check exact configuration, revision, approval and ledger integrity.'});}
  });
  app.get('/media/production/:jobId/:digest/:name',async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');res.setHeader('Cache-Control','no-store');
    try{
      const identity=actor(env.V79_MARKETING_PRODUCTION_OWNER_ORG_ID||'');if(!identity)throw Error('Scope unavailable');
      const w=ready(),state=w.store.read(identity.businessId),job=state.jobs.find(j=>j.id===req.params.jobId);
      // Drafts and newsletter HTML never have public serving URLs.
      if(!job||job.bundleDigest!==req.params.digest||!['poster-square.png','poster-wide.png','short.mp4'].includes(req.params.name))throw Error('Private draft');
      const hasPublicApproval=job.deliveries.some(d=>['running','succeeded','uncertain'].includes(d.status)&&Date.now()<Date.parse(d.result?.at||d.scheduledAt)+3600000&&
        d.approval?.digest===d.digest&&Array.isArray(d.payload.mediaUrls)&&
        d.payload.mediaUrls.some((u:unknown)=>typeof u==='string'&&u.endsWith('/'+req.params.name)));
      if(!hasPublicApproval)throw Error('Asset not approved for release');
      const asset=job.bundle?.assets.find(a=>a.name===req.params.name);if(!asset)throw Error('Asset missing');
      return res.type(asset.mime).send(await verifyAsset(job.id,asset));
    }catch{return res.status(404).end();}
  });
  let interval:NodeJS.Timeout|null=null;
  async function tick(){try{
    if(!active())return;const identity=actor(env.V79_MARKETING_PRODUCTION_OWNER_ORG_ID||'');
    if(identity)await ready().tick(identity);
  }catch{console.warn('Marketing production cycle stopped; inspect protected configuration and ledger');}}
  return {tick,start:()=>{if(active()&&!interval){void tick();interval=setInterval(()=>void tick(),60000);interval.unref?.();}},
    stop:()=>{if(interval)clearInterval(interval);interval=null;}};
}
