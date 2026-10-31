import {describe,it,expect,afterEach} from 'vitest';
import Database from 'better-sqlite3';
import {randomBytes} from 'node:crypto';
import {ensureMediaKeyTable,saveOwnMediaKey,readOwnMediaKey,
  listOwnMediaKeys,deleteOwnMediaKey,mediaVaultConfigured} from '../src/lib/mediaProviderVault.js';

const original=process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
afterEach(()=>{
  if(original===undefined)delete process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
  else process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=original;
});
function fixture(){
  const db=new Database(':memory:');
  db.exec(`PRAGMA foreign_keys=ON;
    CREATE TABLE businesses(id TEXT PRIMARY KEY);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT NOT NULL);
    INSERT INTO businesses VALUES ('tenant-a'),('tenant-b');
    INSERT INTO users VALUES ('member-a','tenant-a'),('member-b','tenant-a'),('member-c','tenant-b');`);
  ensureMediaKeyTable(db);
  process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=randomBytes(32).toString('base64url');
  return db;
}
describe('personal AI/MCP provider key isolation',()=>{
  const alice={businessId:'tenant-a',id:'member-a'},bob={businessId:'tenant-a',id:'member-b'},
    other={businessId:'tenant-b',id:'member-c'};
  it('encrypts each user key at rest; never discloses it through list/save responses',()=>{
    const db=fixture();try{
      const secret='fake-user-owned-test-key-DO-NOT-USE';
      const saved=saveOwnMediaKey(db,alice,'gemini',secret);
      expect(saved).toEqual({provider:'gemini',configured:true});
      const raw=db.prepare('SELECT ciphertext FROM media_provider_keys').get() as {ciphertext:string};
      expect(raw.ciphertext).toMatch(/^v1\./);
      expect(raw.ciphertext).not.toContain(secret);
      expect(JSON.stringify(listOwnMediaKeys(db,alice))).not.toContain(secret);
      expect(readOwnMediaKey(db,alice,'gemini')).toBe(secret);
      expect(readOwnMediaKey(db,bob,'gemini')).toBeNull();
      expect(readOwnMediaKey(db,other,'gemini')).toBeNull();
      expect(listOwnMediaKeys(db,bob)).toEqual([]);
    }finally{db.close();}
  });
  it('binds AEAD to tenant, user and provider; ciphertext copy/tampering fails authentication',()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,alice,'fal','fake-long-alice-key-example');
      saveOwnMediaKey(db,bob,'fal','fake-long-bob-key-example');
      const copied=(db.prepare(`SELECT ciphertext FROM media_provider_keys
        WHERE business_id='tenant-a' AND user_id='member-a'`).get() as any).ciphertext;
      db.prepare(`UPDATE media_provider_keys SET ciphertext=? WHERE business_id='tenant-a' AND user_id='member-b'`).run(copied);
      expect(()=>readOwnMediaKey(db,bob,'fal')).toThrow(/unavailable/);
      db.prepare(`UPDATE media_provider_keys SET ciphertext=? WHERE business_id='tenant-a' AND user_id='member-a'`).run(copied.slice(0,-4)+'AAAA');
      expect(()=>readOwnMediaKey(db,alice,'fal')).toThrow(/unavailable/);
      expect(readOwnMediaKey(db,other,'fal')).toBeNull();
    }finally{db.close();}
  });
  it('replaces and revokes only the current member key, without touching other members',()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,alice,'gemini','fake-original-alice-key');
      saveOwnMediaKey(db,bob,'gemini','fake-original-bob-key');
      saveOwnMediaKey(db,alice,'gemini','fake-replacement-alice-key');
      expect(listOwnMediaKeys(db,alice)[0].revision).toBe(2);
      expect(readOwnMediaKey(db,alice,'gemini')).toBe('fake-replacement-alice-key');
      expect(readOwnMediaKey(db,bob,'gemini')).toBe('fake-original-bob-key');
      expect(deleteOwnMediaKey(db,alice,'gemini').deleted).toBe(true);
      expect(readOwnMediaKey(db,alice,'gemini')).toBeNull();
      expect(readOwnMediaKey(db,bob,'gemini')).toBe('fake-original-bob-key');
    }finally{db.close();}
  });
  it('fails closed without a distinct, valid encryption key; missing user or arbitrary provider is rejected',()=>{
    const db=fixture();try{
      delete process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY;
      expect(mediaVaultConfigured()).toBe(false);
      expect(()=>saveOwnMediaKey(db,alice,'gemini','fake-secret-example-123')).toThrow(/unavailable/);
      expect((db.prepare('SELECT COUNT(*) n FROM media_provider_keys').get() as any).n).toBe(0);
      process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=randomBytes(32).toString('base64url');
      expect(()=>saveOwnMediaKey(db,{businessId:'tenant-b',id:'member-a'},'gemini','fake-secret-example-123')).toThrow(/owner/);
      expect(()=>saveOwnMediaKey(db,alice,'unknown','fake-secret-example-123')).toThrow(/Unsupported/);
      expect(()=>saveOwnMediaKey(db,alice,'gemini',' fake-secret-example-123')).toThrow(/format/);
      expect(()=>saveOwnMediaKey(db,alice,'gemini','fake-secret-example-123\n')).toThrow(/format/);
    }finally{db.close();}
  });
  it('never decrypts with an unknown or rotated master key; no automatic plaintext fallback',()=>{
    const db=fixture();try{
      saveOwnMediaKey(db,other,'mcp','fake-secret-mcp-tool-key');
      process.env.V79_MEDIA_CREDENTIALS_MASTER_KEY=randomBytes(32).toString('base64url');
      expect(()=>readOwnMediaKey(db,other,'mcp')).toThrow(/unavailable/);
      expect(listOwnMediaKeys(db,other)[0].provider).toBe('mcp');
    }finally{db.close();}
  });
});
