import {describe,it,expect,afterAll,beforeAll} from 'vitest';
import express from 'express';
import request from 'supertest';
import {randomBytes,randomUUID} from 'node:crypto';
import {db,initDb} from '../src/lib/db.js';
import {generateToken} from '../src/lib/auth.js';
import {installMediaCredentialRoutes} from '../src/lib/mediaProviderRoutes.js';

const masterBefore=process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
const businessId='vault-test-biz-'+randomUUID();
const memberA='vault-test-a-'+randomUUID(),memberB='vault-test-b-'+randomUUID();
const secret='synthetic-private-key-not-a-real-credential-123';
const app=express();app.use(express.json());installMediaCredentialRoutes(app,db);
function bearer(id:string,role='BUSINESS_OWNER') {
  return 'Bearer '+generateToken({id,businessId,name:'Synthetic User',role,email:id+'@example.invalid'});
}
describe('authenticated BYOK routes',()=>{
  beforeAll(()=>{
    process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=randomBytes(32).toString('base64url');
    initDb();
    const now=new Date().toISOString();
    db.prepare('INSERT INTO businesses (id,name,slug,industry,created_at) VALUES (?,?,?,?,?)')
      .run(businessId,'Isolated media vault test','vault-test-'+randomUUID(),'ICT',now);
    for(const id of [memberA,memberB])
      db.prepare('INSERT INTO users (id,email,password_hash,name,role,business_id,created_at) VALUES (?,?,?,?,?,?,?)')
        .run(id,id+'@example.invalid','unused','Synthetic User','BUSINESS_OWNER',businessId,now);
  });
  afterAll(()=>{
    db.prepare('DELETE FROM businesses WHERE id=?').run(businessId);
    db.prepare('DELETE FROM users WHERE id IN (?,?)').run(memberA,memberB);
    if(masterBefore===undefined)delete process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
    else process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=masterBefore;
  });
  it('refuses unauthenticated access and caller-supplied tenant or user identifiers',async()=>{
    expect((await request(app).get('/api/media-provider-keys')).status).toBe(401);
    const r=await request(app).put('/api/media-provider-keys').set('Authorization',bearer(memberA))
      .send({provider:'gemini',apiKey:secret,userId:memberB,businessId});
    expect(r.status).toBe(400);
    expect(JSON.stringify(r.body)).not.toContain(secret);
  });
  it('stores a user-owned encrypted provider key; never returns plaintext or ciphertext',async()=>{
    const r=await request(app).put('/api/media-provider-keys').set('Authorization',bearer(memberA))
      .send({provider:'gemini',apiKey:secret});
    expect(r.status).toBe(200);expect(r.body).toEqual({provider:'gemini',configured:true});
    const a=await request(app).get('/api/media-provider-keys').set('Authorization',bearer(memberA));
    expect(a.status).toBe(200);expect(a.body.keys.map((x:any)=>x.provider)).toEqual(['gemini']);
    expect(JSON.stringify(a.body)).not.toContain(secret);
    expect(JSON.stringify(a.body)).not.toContain('ciphertext');
    const b=await request(app).get('/api/media-provider-keys').set('Authorization',bearer(memberB));
    expect(b.body.keys).toEqual([]);
    const row=db.prepare('SELECT ciphertext FROM media_provider_keys WHERE business_id=? AND user_id=?').get(businessId,memberA) as any;
    expect(row.ciphertext).not.toContain(secret);
  });
  it('deletes only the caller key and refuses a missing server master key on write',async()=>{
    const deleted=await request(app).delete('/api/media-provider-keys/gemini')
      .set('Authorization',bearer(memberB));expect(deleted.body.deleted).toBe(false);
    const own=await request(app).delete('/api/media-provider-keys/gemini')
      .set('Authorization',bearer(memberA));expect(own.body.deleted).toBe(true);
    const copy=process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
    delete process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
    try{
      const denied=await request(app).put('/api/media-provider-keys')
        .set('Authorization',bearer(memberA)).send({provider:'fal',apiKey:secret});
      expect(denied.status).toBe(503);
      expect(JSON.stringify(denied.body)).not.toContain(secret);
    }finally{process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=copy;}
  });
});
