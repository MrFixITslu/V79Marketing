import {describe,it,expect} from 'vitest';
import express from 'express';
import request from 'supertest';
import Database from 'better-sqlite3';
import {ensureStudioCampaignTables} from '../src/lib/studioCampaignAssets.js';
import {installStudioPublishingRoutes} from '../src/lib/studioPublishingRoutes.js';

function appFixture(){
  const db=new Database(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE businesses(id TEXT PRIMARY KEY,hub_organization_id TEXT);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT,role TEXT,hub_user_id TEXT);
    CREATE TABLE campaigns(id TEXT PRIMARY KEY,business_id TEXT);`);
  ensureStudioCampaignTables(db);
  const app=express();
  app.use(express.json({verify:(req:any,_res,body)=>{req.rawBody=Buffer.from(body);}}));
  installStudioPublishingRoutes(app,db,{
    V79_STUDIO_PUBLISH_ENABLED:'1',V79_ENTITLEMENT_RECHECK_ENABLED:'1',
    V79_MARKETING_STUDIO_REVIEW_KEY:'synthetic-studio-review-secret-longer-than-32',
    V79_STUDIO_HUB_SHARED_SECRET:'synthetic-different-hub-service-secret-longer-than-32',
  } as NodeJS.ProcessEnv);
  return {app,db};
}
describe('Studio publication Hub MFA boundary (new targeted contract)',()=>{
  it('rejects forged Hub signatures and direct browser approval without user session',async()=>{
    const {app,db}=appFixture();try{
      const bad=await request(app).post('/api/platform/studio-publishing/approve')
        .set('x-v79-service-id','v79-hub').set('x-v79-timestamp',String(Date.now()))
        .set('x-v79-signature','0'.repeat(64))
        .send({organizationId:'org12345',actorHubUserId:'user12345'});
      expect(bad.status).toBe(401);
      const direct=await request(app).post('/api/studio/publishing/approve')
        .send({creatorUserId:'forged'});
      expect(direct.status).toBe(401);
      const missing=await request(app).post('/api/platform/studio-publishing/approve')
        .set('origin','https://evil.invalid').send({});
      expect(missing.status).toBe(401);
      expect((db.prepare('SELECT COUNT(*) n FROM studio_publication_deliveries').get() as any).n).toBe(0);
    }finally{db.close();}
  });
});
