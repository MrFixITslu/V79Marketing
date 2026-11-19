import {describe,it,expect,afterEach} from 'vitest';
import Database from 'better-sqlite3';
import {randomBytes} from 'node:crypto';
import {ensureMediaKeyTable,saveOwnMediaKey,listOwnMediaKeys,deleteOwnMediaKey} from '../src/lib/mediaProviderVault.js';
import {creativeCapabilities} from '../src/lib/creativeCapabilityRegistry.js';
import {requestGeminiImage} from '../src/lib/personalGeminiImage.js';
const old=process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
afterEach(()=>{
  if(old===undefined)delete process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
  else process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=old;
});
function fixture(){
  const db=new Database(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE businesses(id TEXT PRIMARY KEY);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT NOT NULL);
    INSERT INTO businesses VALUES ('tenant-one'),('tenant-two');
    INSERT INTO users VALUES ('member-a','tenant-one'),('member-b','tenant-one'),('member-c','tenant-two');`);
  ensureMediaKeyTable(db);
  process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=randomBytes(32).toString('base64url');
  return db;
}
const alice={id:'member-a',businessId:'tenant-one'};
const bob={id:'member-b',businessId:'tenant-one'};
const carol={id:'member-c',businessId:'tenant-two'};
const input={prompt:'A bright editorial photograph of a Caribbean desk, with natural light',aspectRatio:'4:5' as const,
  useMyKey:true as const,acknowledgeCost:true as const,acknowledgeExternalProcessing:true as const};
const bytes=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(160,0)]);
describe('personal image adapter security and capability truthfulness',()=>{
  it('storage never means verified or available, and no remote video capability is invented',()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,alice,'gemini','test-personal-gemini-key-123456');
      const normal=creativeCapabilities(db,alice,{} as NodeJS.ProcessEnv).providers;
      expect(normal.find(x=>x.provider==='gemini'&&x.type==='image')).toMatchObject({
        credentialSaved:true,connectionVerified:false,generationImplemented:true,generationEnabled:false});
      expect(normal.find(x=>x.provider==='runway')?.generationImplemented).toBe(false);
      expect(normal.find(x=>x.provider==='local-ffmpeg-composition')?.description).toContain('Captioned MP4');
      expect(creativeCapabilities(db,bob,{} as NodeJS.ProcessEnv).providers.find(x=>x.provider==='gemini'&&x.type==='image')?.credentialSaved).toBe(false);
    }finally{db.close();}
  });
  it('requires both administrator policy and live Hub permission and the calling user own key',async()=>{
    const db=fixture();try{
      let calls=0;const generate=async()=>{calls++;return {mimeType:'image/png' as const,bytes};};
      await expect(requestGeminiImage(db,alice,input,{enabled:false,hubAuthorised:true,generate})).rejects.toThrow(/disabled/);
      await expect(requestGeminiImage(db,alice,input,{enabled:true,hubAuthorised:false,generate})).rejects.toThrow(/disabled/);
      saveOwnMediaKey(db,alice,'gemini','synthetic-own-gemini-key-12345');
      await expect(requestGeminiImage(db,bob,input,{enabled:true,hubAuthorised:true,generate})).rejects.toThrow(/Connect/);
      await expect(requestGeminiImage(db,carol,input,{enabled:true,hubAuthorised:true,generate})).rejects.toThrow(/Connect/);
      expect(calls).toBe(0);
    }finally{db.close();}
  });
  it('ties every attempt to the initiating member and durable credential generation, without plaintext logging',async()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,alice,'gemini','synthetic-own-gemini-key-12345');
      const firstKey=listOwnMediaKeys(db,alice)[0].credentialGeneration;
      const result=await requestGeminiImage(db,alice,input,{
        enabled:true,hubAuthorised:true,generate:async(key,prompt)=>{
          expect(key).toBe('synthetic-own-gemini-key-12345');
          expect(prompt).toContain(input.prompt);
          return {mimeType:'image/png',bytes};
        },
      });
      expect(result.source).toBe('cloud-ai-image');
      expect(result.imageSha256).toMatch(/^[a-f0-9]{64}$/);
      const entry=db.prepare('SELECT * FROM personal_media_generation_attempts').get() as any;
      expect(entry).toMatchObject({user_id:'member-a',business_id:'tenant-one',credential_generation:firstKey,
        status:'SUCCEEDED',provider:'gemini'});
      expect(JSON.stringify(entry)).not.toContain('synthetic-own-gemini');
      expect(JSON.stringify(entry)).not.toContain(input.prompt);
      saveOwnMediaKey(db,alice,'gemini','synthetic-replacement-gemini-key-67890');
      expect(listOwnMediaKeys(db,alice)[0].credentialGeneration).not.toBe(firstKey);
      deleteOwnMediaKey(db,alice,'gemini');
      saveOwnMediaKey(db,alice,'gemini','synthetic-recreated-gemini-key-abcdef');
      expect(listOwnMediaKeys(db,alice)[0].credentialGeneration).not.toBe(firstKey);
    }finally{db.close();}
  });
  it('prevents a revoked or replaced personal key from reaching the model after reservation',async()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,alice,'gemini','synthetic-original-user-key-111111');
      let calls=0;
      await expect(requestGeminiImage(db,alice,input,{
        enabled:true,hubAuthorised:true,
        revalidate:async()=>{
          saveOwnMediaKey(db,alice,'gemini','synthetic-replaced-user-key-222222');
          return true;
        },
        generate:async()=>{calls++;return {mimeType:'image/png',bytes};},
      })).rejects.toThrow(/blocked before provider dispatch/);
      expect(calls).toBe(0);
      expect((db.prepare('SELECT status FROM personal_media_generation_attempts').get() as any).status).toBe('BLOCKED');
      await expect(requestGeminiImage(db,alice,input,{
        enabled:true,hubAuthorised:true,revalidate:async()=>false,
        generate:async()=>{calls++;return {mimeType:'image/png',bytes};},
      })).rejects.toThrow(/blocked before provider dispatch/);
      expect(calls).toBe(0);
    }finally{db.close();}
  });
  it('records unknown outcomes without revealing provider error and blocks concurrent/manual overuse',async()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,alice,'gemini','synthetic-own-gemini-key-12345');
      await expect(requestGeminiImage(db,alice,input,{enabled:true,hubAuthorised:true,
        generate:async()=>{throw Error('Provider header key=synthetic-own-gemini-key-12345');}}))
        .rejects.toThrow('Image outcome uncertain');
      const row=db.prepare('SELECT status,prompt_sha256 FROM personal_media_generation_attempts').get() as any;
      expect(row.status).toBe('UNKNOWN');expect(row.prompt_sha256).toMatch(/^[a-f0-9]{64}$/);
      // A stalled external request must not be issued again by a second worker.
      db.prepare("UPDATE personal_media_generation_attempts SET status='DISPATCHING'").run();
      await expect(requestGeminiImage(db,alice,input,{enabled:true,hubAuthorised:true,
        generate:async()=>({mimeType:'image/png',bytes})})).rejects.toThrow(/limit/);
      expect((db.prepare('SELECT COUNT(*) n FROM personal_media_generation_attempts').get() as any).n).toBe(1);
    }finally{db.close();}
  });
});
