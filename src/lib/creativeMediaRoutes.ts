import type express from 'express';
import type Database from 'better-sqlite3';
import {authenticate,requireMarketingPermission,verifyMarketingBackgroundEntitlement,
  type AuthenticatedRequest} from './auth.js';
import {creativeCapabilities} from './creativeCapabilityRegistry.js';
import {cloudImageInput,requestGeminiImage} from './personalGeminiImage.js';
import {productionStore} from './productionStore.js';
import {composeLocalMotionVideo} from './localMotionVideo.js';
import {z} from 'zod';

export function installCreativeMediaRoutes(app:express.Express,db:Database.Database){
  const gate=[authenticate,requireMarketingPermission('ai.use')] as const;
  app.get('/api/creative/capabilities',...gate,(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{return res.json(creativeCapabilities(db,req.user!));}
    catch{return res.status(503).json({error:'Creative providers currently unavailable'});}
  });
  function approvedBrief(businessId:string){
    const auditKey=process.env.V79_MARKETING_PRODUCTION_AUDIT_KEY||'';
    if(auditKey.length<32)throw Error('Approved production profile unavailable');
    const state=productionStore(db,auditKey).read(businessId);
    if(!state.brand||!state.ownerLocalUserId||!state.brand.facts.length)
      throw Error('No owner-approved business facts');
    return state.brand;
  }
  app.get('/api/creative/verified-brief',...gate,(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    try{
      const brand=approvedBrief(req.user!.businessId);
      return res.json({approved:true,businessName:brand.name,
        facts:brand.facts.map(x=>({id:x.id,service:x.service,statement:x.statement})),
        website:brand.website});
    }catch{return res.json({approved:false,facts:[],message:'Business facts require owner approval before local video composition'});}
  });
  let localVideoBusy=false;
  app.post('/api/creative/local-video',...gate,async(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    const parsed=z.object({sourceImageData:z.string().min(150).max(1500000),factId:z.string().min(1).max(40)}).strict().safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:'Choose a permitted local photo and approved service fact'});
    if(localVideoBusy)return res.status(429).json({error:'Local video renderer is busy; no work was queued'});
    localVideoBusy=true;
    try{
      const brand=approvedBrief(req.user!.businessId);
      const result=await composeLocalMotionVideo({imageData:parsed.data.sourceImageData,
        brand,factId:parsed.data.factId});
      return res.json(result);
    }catch{return res.status(422).json({error:'Local video unavailable. Verify an approved business profile, input image format and renderer capacity.'});}
    finally{localVideoBusy=false;}
  });
  app.post('/api/creative/personal-image',...gate,async(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    const parsed=cloudImageInput.safeParse(req.body);
    if(!parsed.success)return res.status(400).json({error:'Invalid image request or missing individual consent'});
    // The operating business must have APPROVED a model/provider cost policy.
    // User consent does not substitute for the operator's global spending gate.
    if(process.env.V79_PERSONAL_IMAGE_GENERATION_ENABLED!=='1'||
      process.env.V79_MEDIA_CLOUD_SPEND_POLICY_ENABLED!=='1')
      return res.status(503).json({error:'Personal cloud image generation is not enabled'});
    if(!verifyMarketingBackgroundEntitlement)
      return res.status(503).json({error:'Live Hub entitlement verification is required for paid generation'});
    try{
      const identity=(db.prepare(`SELECT b.hub_organization_id AS org,u.hub_user_id AS hub
        FROM users u JOIN businesses b ON b.id=u.business_id
        WHERE u.id=? AND u.business_id=?`).get(req.user!.id,req.user!.businessId)) as
        {org:string|null;hub:string|null}|undefined;
      if(!identity?.org||!identity.hub||
        !await verifyMarketingBackgroundEntitlement({
          organizationId:identity.org,scopedUserId:identity.hub}))
        return res.status(403).json({error:'Current personal Hub entitlement required'});
      const result=await requestGeminiImage(db,req.user!,parsed.data,{enabled:true,hubAuthorised:true});
      return res.json(result);
    }catch{
      // Never relay the provider SDK error. It may contain raw headers, signed
      // URLs, request bodies or parts of the personal credential.
      return res.status(409).json({error:'Image request unavailable or outcome uncertain. Review your provider account before trying again.'});
    }
  });
}
