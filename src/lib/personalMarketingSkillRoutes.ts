import type express from 'express';
import type Database from 'better-sqlite3';
import {z} from 'zod';
import {authenticate,requireMarketingPermission,type AuthenticatedRequest} from './auth.js';
import {
  getSkillWorkspace,personalSkillSchema,saveSkillDraft,publishOwnSkill,resetOwnSkill,
  deleteOwnSkill,restoreOwnSkill,skillVersion,skillPreview,templateUpdatePreview,acceptTemplateUpdate,
} from './personalMarketingSkills.js';

const number=z.number().int().min(0).max(1000000);
const draftSchema=z.object({expectedVersion:number,content:personalSkillSchema}).strict();
const saveSchema=z.object({expectedVersion:number}).strict();
const restoreSchema=z.object({expectedVersion:number,version:number.min(1)}).strict();
const acceptSchema=z.object({expectedVersion:number,proposalDigest:z.string().regex(/^[a-f0-9]{64}$/)}).strict();
const secure=(res:express.Response)=>res.setHeader('Cache-Control','no-store');
// Errors never echo user-provided skill data, URLs, hidden model instructions or credential strings.
function failure(res:express.Response,err:unknown){
  const reason=err instanceof Error?err.message:'';
  const conflict=/version changed|proposal changed|draft first|unavailable/.test(reason);
  return res.status(conflict?409:400).json({error:conflict?'Skill changed. Reload and compare your edits.':
    'Skill request rejected. Review protected rules and your personal skill version.'});
}
export function installPersonalSkillRoutes(app:express.Express,db:Database.Database){
  const middleware=[authenticate,requireMarketingPermission('ai.use')] as const;
  app.get('/api/my-marketing-skill',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);try{return res.json(getSkillWorkspace(db,req.user!));}
    catch{return res.status(503).json({error:'Personal skill unavailable'});}
  });
  app.get('/api/my-marketing-skill/template-update',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);try{return res.json(templateUpdatePreview(db,req.user!));}
    catch{return res.status(503).json({error:'Template comparison unavailable'});}
  });
  app.get('/api/my-marketing-skill/history/:version',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const version=number.min(1).safeParse(Number(req.params.version));
    if(!version.success)return res.status(400).json({error:'Invalid skill version'});
    try{return res.json(skillVersion(db,req.user!,version.data));}
    catch{return res.status(404).json({error:'Personal skill version not found'});}
  });
  app.post('/api/my-marketing-skill/preview',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const parsed=personalSkillSchema.safeParse(req.body?.content);
    if(!parsed.success)return res.status(400).json({error:'Invalid skill preferences'});
    return res.json(skillPreview(parsed.data));
  });
  app.put('/api/my-marketing-skill/draft',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const input=draftSchema.safeParse(req.body);
    if(!input.success)return res.status(400).json({error:'Invalid skill draft'});
    try{return res.json(saveSkillDraft(db,req.user!,input.data.expectedVersion,input.data.content));}
    catch(e){return failure(res,e);}
  });
  app.post('/api/my-marketing-skill/save',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const input=saveSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'Invalid save request'});
    try{return res.json({skill:publishOwnSkill(db,req.user!,input.data.expectedVersion)});}
    catch(e){return failure(res,e);}
  });
  app.post('/api/my-marketing-skill/reset',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const input=saveSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'Invalid reset request'});
    try{return res.json({skill:resetOwnSkill(db,req.user!,input.data.expectedVersion)});}
    catch(e){return failure(res,e);}
  });
  app.post('/api/my-marketing-skill/restore',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const input=restoreSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'Invalid restore request'});
    try{return res.json({skill:restoreOwnSkill(db,req.user!,input.data.expectedVersion,input.data.version)});}
    catch(e){return failure(res,e);}
  });
  app.post('/api/my-marketing-skill/accept-template',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const input=acceptSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'Invalid comparison acceptance'});
    try{return res.json({skill:acceptTemplateUpdate(db,req.user!,input.data.expectedVersion,input.data.proposalDigest)});}
    catch(e){return failure(res,e);}
  });
  app.delete('/api/my-marketing-skill',...middleware,(req:AuthenticatedRequest,res)=>{
    secure(res);const input=saveSchema.safeParse(req.body);if(!input.success)return res.status(400).json({error:'Invalid delete request'});
    try{return res.json({skill:deleteOwnSkill(db,req.user!,input.data.expectedVersion)});}
    catch(e){return failure(res,e);}
  });
}
