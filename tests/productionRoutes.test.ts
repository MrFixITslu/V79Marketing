import { describe,it,expect } from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import {randomUUID} from 'node:crypto';
import { installProductionRoutes } from '../src/lib/productionRoutes.js';
import { signPlatformRequest } from '../src/lib/platform.js';
import type { ProductionDependencies } from '../src/lib/productionWorkflow.js';

function fixture(){
  const db=new Database(':memory:');db.exec(`CREATE TABLE businesses(id TEXT PRIMARY KEY,hub_organization_id TEXT);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT,hub_user_id TEXT,email TEXT,role TEXT);
    INSERT INTO businesses VALUES ('biz-owner','synthetic-owner-org');
    INSERT INTO users VALUES ('local-owner','biz-owner','synthetic-hub-owner','vision79slu@gmail.com','BUSINESS_OWNER');`);
  const key='synthetic-dedicated-signing-key-32-characters';
  const env={V79_MARKETING_PRODUCTION_ENABLED:'1',V79_MARKETING_PRODUCTION_PUBLISH_ENABLED:'0',
    V79_MARKETING_PRODUCTION_OWNER_ORG_ID:'synthetic-owner-org',V79_MARKETING_PRODUCTION_SHARED_SECRET:key,
    V79_MARKETING_PRODUCTION_AUDIT_KEY:'synthetic-separate-audit-key-32-characters'};
  const deps:ProductionDependencies={authorized:async()=>true,generate:async()=>({source:'brand-template',creative:{hook:'hook',tip:'tip'}}),
    render:async()=>[],destinations:async()=>[],verifyAssets:async()=>{},destinationUnchanged:async()=>true,dispatch:async()=>{throw Error('No providers allowed');}};
  const app=express();app.use(express.json({verify:(req:any,_res,body)=>req.rawBody=Buffer.from(body)}));installProductionRoutes(app,db,{env,deps});
  const path='/api/platform/marketing-production';
  function send(overrides:any={},headers:any={}){
    const envelope={organizationId:'synthetic-owner-org',actorHubUserId:'synthetic-hub-owner',mfaVerifiedAt:Date.now(),requestNonce:randomUUID(),request:{action:'list'},...overrides};
    const body=JSON.stringify(envelope),timestamp=String(Date.now());
    return request(app).post(path).set({'content-type':'application/json','x-v79-service-id':'v79-hub','x-v79-timestamp':timestamp,
      'x-v79-signature':signPlatformRequest({method:'POST',pathname:path,timestamp,body,secret:key}),...headers}).send(body);
  }
  return {db,app,send,env};
}
describe('Founder-only production boundary',()=>{
  it('accepts only dedicated signatures and persisted founder mapping',async()=>{
    const f=fixture();try{
      const nonce=randomUUID();expect((await f.send({requestNonce:nonce})).status).toBe(200);
      expect((await f.send({requestNonce:nonce})).status).toBe(409);
      expect((await f.send({}, {'x-v79-signature':'0'.repeat(64)})).status).toBe(401);
      expect((await f.send({}, {cookie:'synthetic=1'})).status).toBe(401);
      expect((await f.send({}, {origin:'https://attacker.invalid'})).status).toBe(401);
      expect((await f.send({organizationId:'synthetic-other-org'})).status).toBe(403);
      expect((await f.send({actorHubUserId:'synthetic-other-user'})).status).toBe(403);
      f.db.prepare("UPDATE users SET role='MARKETING_STAFF'").run();expect((await f.send()).status).toBe(403);
    }finally{f.db.close();}
  });
  it('fresh MFA, exact fields and coordinated feature gates fail closed',async()=>{
    const f=fixture();try{
      expect((await f.send({mfaVerifiedAt:Date.now()-300001,request:{action:'pause',paused:true}})).status).toBe(403);
      expect((await f.send({request:{action:'list',publish:true}})).status).toBe(409);
      f.env.V79_MARKETING_PRODUCTION_ENABLED='0';expect((await f.send()).status).toBe(503);
    }finally{f.db.close();}
  });
  it('requires fresh founder MFA and the explicit publishing flag for batch approvals',async()=>{
    const f=fixture();try{
      const action={action:'approve_batch',batchDigest:'a'.repeat(64)};
      expect((await f.send({mfaVerifiedAt:Date.now()-300001,request:action})).status).toBe(403);
      expect((await f.send({request:action})).status).toBe(503);
      f.env.V79_MARKETING_PRODUCTION_PUBLISH_ENABLED='1';
      expect((await f.send({request:action})).status).toBe(409); // No exact reviewable batch exists.
    }finally{f.db.close();}
  });
  it('draft assets and arbitrary file paths are never publicly exposed',async()=>{
    const f=fixture();try{
      expect((await request(f.app).get('/media/production/00000000-0000-4000-8000-000000000000/'+ '0'.repeat(64)+'/copy.json')).status).toBe(404);
      expect((await f.send({request:{action:'asset',jobId:'00000000-0000-4000-8000-000000000000',name:'../secrets'}})).status).toBe(409);
    }finally{f.db.close();}
  });
});
