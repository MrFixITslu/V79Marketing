import express from 'express';
import type Database from 'better-sqlite3';
import {z} from 'zod';
import {ensureStudioPublicationTables} from './studioPublicationBridge.js';
import {authenticate,requireMarketingPermission,type AuthenticatedRequest} from './auth.js';
import {attachOwnStudioAsset,createOwnStudioPackage,readOwnStudioAsset,
  readOwnStudioPackage,reviewOwnStudioPackage,listOwnStudioAssets,
  exactOwnedSocialAccounts,studioPackageSchema,ensureStudioCampaignTables} from './studioCampaignAssets.js';

const uuid=z.string().uuid();
const mediaKind=z.enum(['image','video']);
const review=z.object({exactDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
export function installStudioCampaignRoutes(app:express.Express,db:Database.Database){
  ensureStudioCampaignTables(db);
  ensureStudioPublicationTables(db);
  const gate=[authenticate,requireMarketingPermission('content.write')] as const;
  const safe=(res:express.Response)=>{
    res.setHeader('Cache-Control','no-store');
    res.setHeader('X-Content-Type-Options','nosniff');
  };
  const blocked=(res:express.Response)=>res.status(409).json({
    error:'Private campaign asset/review unavailable. Check creator ownership, selected media and exact review version.',
  });
  app.get('/api/studio/my-accounts',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    try{return res.json({accounts:exactOwnedSocialAccounts(db,req.user!),
      notice:'Only OAuth connections authorised by this user are offered; legacy shared accounts must be reconnected.'});}
    catch{return res.status(503).json({error:'Personal connections unavailable'});}
  });
  app.post('/api/campaigns/:campaignId/studio-asset',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    const id=uuid.safeParse(req.params.campaignId.replace(/^campaign-/,'')); // Existing campaigns use campaign-UUID.
    const kind=mediaKind.safeParse(req.query.kind);
    if(!id.success||!kind.success||!Buffer.isBuffer(req.body))
      return res.status(400).json({error:'Select a valid campaign, media type and raw image/video bytes'});
    try{
      const saved=attachOwnStudioAsset(db,req.user!,req.params.campaignId,kind.data,req.body);
      return res.status(201).json({asset:saved,publicationAuthorized:false});
    }catch{return blocked(res);}
  });
  app.get('/api/campaigns/:campaignId/studio-assets',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    try{return res.json({assets:listOwnStudioAssets(db,req.user!,req.params.campaignId)});}
    catch{return blocked(res);}
  });
  app.get('/api/campaigns/:campaignId/studio-assets/:assetId',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    if(!uuid.safeParse(req.params.assetId).success)return res.status(404).end();
    try{
      const item=readOwnStudioAsset(db,req.user!,req.params.campaignId,req.params.assetId);
      // No SVG or HTML; returned media has a verified signature and digest.
      return res.type(item.mime).send(item.bytes);
    }catch{return res.status(404).end();}
  });
  app.post('/api/campaigns/:campaignId/studio-package',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    const parsed=studioPackageSchema.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:'Invalid exact campaign caption, schedule, destination or media selection'});
    try{
      const result=createOwnStudioPackage(db,req.user!,req.params.campaignId,parsed.data,
        process.env.V79_MARKETING_STUDIO_REVIEW_KEY||'');
      return res.status(201).json({package:result});
    }catch{return blocked(res);}
  });
  app.get('/api/campaigns/:campaignId/studio-package/:packageId',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    if(!uuid.safeParse(req.params.packageId).success)return res.status(404).json({error:'Private review not found'});
    try{
      const result=readOwnStudioPackage(db,req.user!,req.params.campaignId,
        req.params.packageId,process.env.V79_MARKETING_STUDIO_REVIEW_KEY||'');
      return res.json({package:result});
    }catch{return res.status(404).json({error:'Private review not found or integrity changed'});}
  });
  app.post('/api/campaigns/:campaignId/studio-package/:packageId/review',...gate,(req:AuthenticatedRequest,res)=>{
    safe(res);
    const parsed=review.safeParse(req.body);
    if(!parsed.success||!uuid.safeParse(req.params.packageId).success)
      return res.status(400).json({error:'Exact creative-review digest required'});
    try{
      const result=reviewOwnStudioPackage(db,req.user!,req.params.campaignId,
        req.params.packageId,parsed.data.exactDigest,process.env.V79_MARKETING_STUDIO_REVIEW_KEY||'');
      return res.json({package:result,
        notice:'Creative review complete. This receipt grants NO publication or scheduling permission.'});
    }catch{return blocked(res);}
  });
}
