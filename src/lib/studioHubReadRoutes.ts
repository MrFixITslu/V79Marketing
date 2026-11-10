import type express from 'express';
import type Database from 'better-sqlite3';
import {timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {signPlatformRequest} from './platform.js';
import {verifyMarketingBackgroundEntitlement} from './auth.js';
import {readOwnStudioPackage,readOwnStudioAsset} from './studioCampaignAssets.js';

// Hub's signed, read-only bridge prevents the approver browser from needing
// another member's Marketing cookie or a client-supplied business identity.
// This module does NOT create approvals, publication jobs or remote API calls.
const uuid=z.string().uuid();
const envelope=z.object({
  organizationId:z.string().min(8).max(180),
  actorHubUserId:z.string().min(8).max(180),
  request:z.discriminatedUnion('action',[
    z.object({action:z.literal('list')}).strict(),
    z.object({action:z.literal('history')}).strict(),
    z.object({action:z.literal('asset'),packageId:uuid,assetId:uuid}).strict(),
  ]),
}).strict();
type HubActor={id:string;businessId:string;role:string};
export function installStudioHubReadRoutes(app:express.Express,db:Database.Database,
  env:NodeJS.ProcessEnv=process.env){
  async function actor(req:express.Request,action:'list'|'asset'|'history'){
    const key=env.V79_STUDIO_HUB_SHARED_SECRET||'';
    const timestamp=req.get('x-v79-timestamp')||'';
    const supplied=req.get('x-v79-signature')||'';
    const raw=(req as express.Request&{rawBody?:Buffer}).rawBody?.toString('utf8')||'';
    const pathname='/api/platform/studio-publishing/'+(action==='list'?'inbox':action);
    if(key.length<32||env.V79_ENTITLEMENT_RECHECK_ENABLED!=='1'||
       !verifyMarketingBackgroundEntitlement||req.get('x-v79-service-id')!=='v79-hub'||
       req.get('origin')||req.get('cookie')||!/^\d{13}$/.test(timestamp)||
       Math.abs(Date.now()-Number(timestamp))>300000||
       !/^[0-9a-f]{64}$/.test(supplied)||!raw)return null;
    const exact=signPlatformRequest({method:'POST',pathname,timestamp,body:raw,secret:key});
    if(!timingSafeEqual(Buffer.from(exact,'hex'),Buffer.from(supplied,'hex')))return null;
    const parsed=envelope.safeParse(req.body);
    if(!parsed.success||parsed.data.request.action!==action)return null;
    const e=parsed.data;
    const matches=db.prepare(`SELECT u.id,u.business_id AS businessId,u.role
      FROM users u JOIN businesses b ON b.id=u.business_id
      WHERE b.hub_organization_id=? AND u.hub_user_id=?
        AND u.role IN ('BUSINESS_OWNER','MARKETING_MANAGER')`)
      .all(e.organizationId,e.actorHubUserId) as HubActor[];
    if(matches.length!==1)return null;
    if(!await verifyMarketingBackgroundEntitlement({
      organizationId:e.organizationId,scopedUserId:e.actorHubUserId}))return null;
    return {actor:matches[0],request:e.request};
  }
  const secure=(res:express.Response)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
  };
  app.post('/api/platform/studio-publishing/inbox',async(req,res)=>{
    secure(res);
    try{
      const identity=await actor(req,'list');
      if(!identity)return res.status(403).json({error:'Signed Hub Marketing inbox access denied'});
      const businessId=identity.actor.businessId;
      const rows=db.prepare(`SELECT p.id,p.user_id,p.campaign_id,p.revision
        FROM studio_campaign_packages p JOIN studio_campaign_private_reviews r
        ON r.package_id=p.id AND r.business_id=p.business_id
        WHERE p.business_id=? AND p.connected_account_id IS NOT NULL
          AND p.scheduled_at IS NOT NULL
          AND p.revision=(SELECT MAX(n.revision) FROM studio_campaign_packages n
            WHERE n.business_id=p.business_id AND n.user_id=p.user_id AND n.campaign_id=p.campaign_id)
          AND NOT EXISTS(SELECT 1 FROM studio_publication_deliveries d WHERE d.package_id=p.id)
        ORDER BY p.created_at DESC LIMIT 40`).all(businessId) as
        {id:string;user_id:string;campaign_id:string;revision:number}[];
      const packages=rows.flatMap(row=>{
        try{
          const p=readOwnStudioPackage(db,{id:row.user_id,businessId},
            row.campaign_id,row.id,env.V79_MARKETING_STUDIO_REVIEW_KEY||'');
          if(!p.reviewed)return [];
          return [{packageId:row.id,campaignId:row.campaign_id,creatorUserId:row.user_id,
            exactDigest:p.exactDigest,caption:p.caption,channel:p.channel,
            scheduledAt:p.scheduledAt,accountId:p.connectedAccountId,
            providerAccountId:p.providerAccountId,assets:p.assetDigests,
            reviewedAt:p.reviewed.reviewedAt,publicationAuthorized:false}];
        }catch{return [];}
      });
      return res.json({packages,
        approvalEnabled:env.V79_STUDIO_PUBLISH_ENABLED==='1',
        notice:'Private creative review is not publication authorisation'});
    }catch{return res.status(503).json({error:'Studio signed inbox unavailable'});}
  });
  app.post('/api/platform/studio-publishing/history',async(req,res)=>{
    secure(res);
    try{
      const identity=await actor(req,'history');
      if(!identity)return res.status(403).json({error:'Signed Hub Marketing history access denied'});
      const rows=db.prepare(`SELECT id,package_id AS packageId,channel,scheduled_at AS scheduledAt,
          status,provider_post_id AS providerPostId,last_issue AS issue,created_at AS createdAt
        FROM studio_publication_deliveries
        WHERE business_id=? ORDER BY created_at DESC LIMIT 50`)
        .all(identity.actor.businessId);
      return res.json({deliveries:rows,
        note:'Uncertain provider outcomes require manual reconciliation; no automatic retries'});
    }catch{return res.status(503).json({error:'Signed publishing history unavailable'});}
  });
  app.post('/api/platform/studio-publishing/asset',async(req,res)=>{
    secure(res);
    try{
      const identity=await actor(req,'asset');
      if(!identity||identity.request.action!=='asset')
        return res.status(403).json({error:'Signed Hub media access denied'});
      const businessId=identity.actor.businessId;
      const {packageId,assetId}=identity.request;
      const row=db.prepare(`SELECT user_id,campaign_id,revision
        FROM studio_campaign_packages WHERE id=? AND business_id=?`)
        .get(packageId,businessId) as
        {user_id:string;campaign_id:string;revision:number}|undefined;
      if(!row)return res.status(404).json({error:'Private asset unavailable'});
      const latest=db.prepare(`SELECT MAX(revision) AS n FROM studio_campaign_packages
        WHERE business_id=? AND user_id=? AND campaign_id=?`)
        .get(businessId,row.user_id,row.campaign_id) as {n:number};
      if(latest.n!==row.revision)return res.status(404).json({error:'Outdated review'});
      const original={id:row.user_id,businessId};
      const p=readOwnStudioPackage(db,original,row.campaign_id,packageId,
        env.V79_MARKETING_STUDIO_REVIEW_KEY||'');
      const entry=(p.assetDigests as {id:string;mime:string;sha256:string}[])
        .find(x=>x.id===assetId);
      if(!p.reviewed||!entry)return res.status(404).json({error:'Media not reviewed'});
      const blob=readOwnStudioAsset(db,original,row.campaign_id,assetId);
      if(blob.mime!==entry.mime||blob.sha256!==entry.sha256||blob.bytes.length>7*1024*1024)
        throw Error('Reviewed byte integrity changed');
      return res.json({mime:blob.mime,sha256:blob.sha256,base64:blob.bytes.toString('base64')});
    }catch{return res.status(404).json({error:'Private media unavailable'});}
  });
}
