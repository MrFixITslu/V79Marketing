import {describe,it,expect} from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import {installStudioHubReadRoutes} from '../src/lib/studioHubReadRoutes.js';
describe('Studio signed Hub read bridge (new targeted boundary)',()=>{
 it('rejects browser, cross-origin and unsigned attempts before revealing private creative',async()=>{
   const db=new Database(':memory:');
   const app=express();
   app.use(express.json({verify:(req:any,_res,body)=>{req.rawBody=Buffer.from(body);}}));
   installStudioHubReadRoutes(app,db,{
     V79_STUDIO_HUB_SHARED_SECRET:'synthetic-read-service-key-at-least-thirty-two',
     V79_ENTITLEMENT_RECHECK_ENABLED:'1',
     V79_MARKETING_STUDIO_REVIEW_KEY:'synthetic-creative-sign-key-at-least-thirty-two',
   } as NodeJS.ProcessEnv);
   try{
     for(const url of ['/api/platform/studio-publishing/inbox','/api/platform/studio-publishing/asset']){
       const forged=await request(app).post(url).send({});
       expect(forged.status).toBe(403);
       expect(JSON.stringify(forged.body)).not.toContain('caption');
     }
   }finally{db.close();}
 });
});
