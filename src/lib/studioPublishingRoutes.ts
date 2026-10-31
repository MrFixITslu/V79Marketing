import type express from 'express';
import type Database from 'better-sqlite3';
import {z} from 'zod';
import {authenticate,requireRole,type AuthenticatedRequest,
  verifyMarketingBackgroundEntitlement} from './auth.js';
import {readOwnStudioPackage} from './studioCampaignAssets.js';
import {ensureStudioPublicationTables,authoriseStudioPublication,
  readStudioApprovedMedia,studioPublishApprovalSchema} from './studioPublicationBridge.js';
import {createStudioPublisher} from './studioPublishingWorker.js';

const approverRoles=['BUSINESS_OWNER','MARKETING_MANAGER'];
export function installStudioPublishingRoutes(app:express.Express,db:Database.Database,
  env:NodeJS.ProcessEnv=process.env){
  ensureStudioPublicationTables(db);
  const secret=env.V79_MARKETING_STUDIO_REVIEW_KEY||'';
  const publisher=createStudioPublisher(db,secret,{env});
  const guard=[authenticate,requireRole(approverRoles)] as const;
  const safe=(res:express.Response)=>{res.setHeader('Cache-Control','no-store');res.setHeader('X-Content-Type-Options','nosniff');};
  const enabled=()=>env.V79_STUDIO_PUBLISH_ENABLED==='1'&&
    env.V79_ENTITLEMENT_RECHECK_ENABLED==='1'&&secret.length>=32;
  const onlyHubs=async(req:AuthenticatedRequest)=>{
    if(!verifyMarketingBackgroundEntitlement)return false;
    const row=db.prepare(`SELECT b.hub_organization_id org,u.hub_user_id hub
      FROM users u JOIN businesses b ON b.id=u.business_id
      WHERE b.id=? AND u.id=?`).get(req.user!.businessId,req.user!.id) as {org:string|null;hub:string|null}|undefined;
    return !!row?.org&&!!row.hub&&await verifyMarketingBackgroundEntitlement({
      organizationId:row.org,scopedUserId:row.hub});
  };
  app.get('/api/studio/publishing/inbox',...guard,(req:AuthenticatedRequest,res)=>{
    safe(res);
    try{
      const rows=db.prepare(`SELECT p.id,p.user_id,p.campaign_id,p.exact_digest,p.revision
        FROM studio_campaign_packages p
        JOIN studio_campaign_private_reviews r ON r.package_id=p.id AND r.business_id=p.business_id
        WHERE p.business_id=? AND p.connected_account_id IS NOT NULL AND p.scheduled_at IS NOT NULL
          AND p.revision=(SELECT MAX(n.revision) FROM studio_campaign_packages n
            WHERE n.business_id=p.business_id AND n.user_id=p.user_id AND n.campaign_id=p.campaign_id)
          AND NOT EXISTS(SELECT 1 FROM studio_publication_deliveries d WHERE d.package_id=p.id)
        ORDER BY p.created_at DESC LIMIT 40`).all(req.user!.businessId) as
        {id:string;user_id:string;campaign_id:string;exact_digest:string;revision:number}[];
      const packages=rows.flatMap(row=>{
        try{
          const p=readOwnStudioPackage(db,{id:row.user_id,businessId:req.user!.businessId},
            row.campaign_id,row.id,secret);
          return [{packageId:row.id,campaignId:row.campaign_id,creatorUserId:row.user_id,
            exactDigest:p.exactDigest,caption:p.caption,channel:p.channel,scheduledAt:p.scheduledAt,
            accountId:p.connectedAccountId,providerAccountId:p.providerAccountId,
            assets:p.assetDigests,reviewedAt:p.reviewed?.reviewedAt,
            publicationAuthorized:false}];
        }catch{return [];}
      });
      return res.json({packages,publicationEnabled:enabled(),
        notice:'Creator creative review is not publication consent. Approving requires your current Hub entitlement.'});
    }catch{return res.status(503).json({error:'Signed review inbox unavailable'});}
  });
  app.post('/api/studio/publishing/approve',...guard,async(req:AuthenticatedRequest,res)=>{
    safe(res);
    if(!enabled())return res.status(503).json({error:'Multi-user publishing is disabled pending release acceptance'});
    const parsed=studioPublishApprovalSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:'Exact publication approval and creator identifiers required'});
    try{
      if(!await onlyHubs(req))return res.status(403).json({error:'Current approving user Hub subscription required'});
      const receipt=authoriseStudioPublication(db,{...req.user!,hubUserId:undefined},
        parsed.data.creatorUserId,parsed.data.campaignId,parsed.data.packageId,
        parsed.data.exactDigest,parsed.data.confirmExactPublication,secret);
      return res.status(201).json({delivery:receipt});
    }catch{return res.status(409).json({error:'Approval rejected; verify exact creative review, owner account, entitlement and schedule'});}
  });
  app.get('/api/studio/publishing/history',...guard,(req:AuthenticatedRequest,res)=>{
    safe(res);
    try{return res.json({deliveries:publisher.history(req.user!.businessId),
      note:'UNKNOWN and BLOCKED outcomes require reconciliation; this endpoint never retries'});
    }catch{return res.status(503).json({error:'Publishing history unavailable'});}
  });
  // Capability-bearing public media route for platform content fetching. URLs
  // are bound to a single signed DISPATCHING/PUBLISHED attempt, exact bytes and
  // a short expiry. No original user key or token in URL or response.
  app.get('/media/studio/:deliveryId/:assetId/:expires/:token',(req,res)=>{
    safe(res);
    try{
      const parsed=z.object({
        deliveryId:z.string().uuid(),assetId:z.string().uuid(),
        expires:z.string().regex(/^\d{13}$/),token:z.string().regex(/^[a-f0-9]{64}$/),
      }).strict().parse(req.params);
      const asset=readStudioApprovedMedia(db,parsed.deliveryId,parsed.assetId,
        Number(parsed.expires),parsed.token,secret);
      res.setHeader('Content-Security-Policy',"default-src 'none'");
      return res.type(asset.mime).send(asset.bytes);
    }catch{return res.status(404).end();}
  });
  return publisher;
}
