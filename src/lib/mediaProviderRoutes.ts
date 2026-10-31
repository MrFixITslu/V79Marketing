import type Database from 'better-sqlite3';
import type express from 'express';
import { z } from 'zod';
import { authenticate,requireMarketingPermission,type AuthenticatedRequest } from './auth.js';
import {deleteOwnMediaKey,listOwnMediaKeys,mediaKeyProviders,mediaVaultConfigured,saveOwnMediaKey} from './mediaProviderVault.js';

const keyInput=z.object({
  provider:z.enum(mediaKeyProviders),
  apiKey:z.string().min(12).max(4096),
}).strict();
const providerInput=z.enum(mediaKeyProviders);

// No route returns ciphertext, API tokens or reusable provider credentials.
// Each operation derives the actor exclusively from the verified Hub-managed
// Marketing session; client-supplied user or business IDs are not accepted.
export function installMediaCredentialRoutes(app:express.Express,db:Database.Database){
  const middleware=[authenticate,requireMarketingPermission('ai.use')] as const;
  app.get('/api/media-provider-keys',...middleware,(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    try {return res.json({vaultReady:mediaVaultConfigured(),providers:[...mediaKeyProviders],
      keys:listOwnMediaKeys(db,req.user!)});}
    catch {return res.status(503).json({error:'Media credential service unavailable'});}
  });
  app.put('/api/media-provider-keys',...middleware,(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    const input=keyInput.safeParse(req.body);
    if(!input.success)return res.status(400).json({error:'Invalid provider or credential'});
    if(!mediaVaultConfigured())return res.status(503).json({error:'Encrypted media key storage not configured'});
    try {return res.json(saveOwnMediaKey(db,req.user!,input.data.provider,input.data.apiKey));}
    catch{return res.status(400).json({error:'Could not securely save your provider key'});}
  });
  app.delete('/api/media-provider-keys/:provider',...middleware,(req:AuthenticatedRequest,res)=>{
    res.setHeader('Cache-Control','no-store');
    const provider=providerInput.safeParse(req.params.provider);
    if(!provider.success)return res.status(400).json({error:'Unsupported provider'});
    try{return res.json(deleteOwnMediaKey(db,req.user!,provider.data));}
    catch{return res.status(503).json({error:'Could not disconnect provider key'});}
  });
}
