import {describe,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {randomUUID} from 'node:crypto';
import {ensurePersonalSkillTables,pinCampaignSkill} from '../src/lib/personalMarketingSkills.js';
import {ensureStudioCampaignTables,attachOwnStudioAsset,readOwnStudioAsset,
  listOwnStudioAssets,exactOwnedSocialAccounts,createOwnStudioPackage,
  readOwnStudioPackage,reviewOwnStudioPackage} from '../src/lib/studioCampaignAssets.js';

const a={id:'a',businessId:'b1'},b={id:'b',businessId:'b1'},c={id:'c',businessId:'b2'};
const cid='campaign-'+randomUUID();
const secret='synthetic-v79-studio-signature-key-32-characters-long';
const png=Buffer.concat([Buffer.from('89504e470d0a1a0a','hex'),Buffer.alloc(150,0)]);
function fixture(){
  const db=new Database(':memory:');db.pragma('foreign_keys=ON');
  db.exec(`CREATE TABLE businesses(id TEXT PRIMARY KEY);
    CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT NOT NULL);
    CREATE TABLE campaigns(id TEXT PRIMARY KEY,business_id TEXT NOT NULL);
    CREATE TABLE social_accounts(id TEXT PRIMARY KEY,business_id TEXT,connected_by_user_id TEXT,
      connected INTEGER,platform TEXT,account_name TEXT,account_handle TEXT,provider_account_id TEXT,
      access_token_enc TEXT,token_scopes TEXT,provider_metadata_json TEXT,legal_version TEXT,
      legal_consented_at TEXT,expires_at TEXT);
    INSERT INTO businesses VALUES ('b1'),('b2');
    INSERT INTO users VALUES ('a','b1'),('b','b1'),('c','b2');`);
  db.prepare('INSERT INTO campaigns(id,business_id) VALUES (?,?)').run(cid,'b1');
  ensurePersonalSkillTables(db);ensureStudioCampaignTables(db);
  const pin=pinCampaignSkill(db,a,cid);
  db.prepare(`INSERT INTO social_accounts
    (id,business_id,connected_by_user_id,connected,platform,account_name,account_handle,
      provider_account_id,access_token_enc,token_scopes,provider_metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run('mine','b1','a',1,'instagram','My channel','@mine',
      'provider-A','encrypted-user-token-A','publish','{}');
  db.prepare(`INSERT INTO social_accounts
    (id,business_id,connected_by_user_id,connected,platform,account_name,account_handle,
      provider_account_id,access_token_enc,token_scopes,provider_metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run('another','b1','b',1,'instagram','Another user','@another',
      'provider-B','encrypted-user-token-B','publish','{}');
  db.prepare(`INSERT INTO social_accounts
    (id,business_id,connected_by_user_id,connected,platform,account_name,account_handle,
      provider_account_id,access_token_enc,token_scopes,provider_metadata_json)
    VALUES (?,?,?,?,?,?,?,?,?,?,?)`).run('legacy','b1',null,1,'instagram','Legacy team','@legacy',
      'provider-C','encrypted-legacy-token','publish','{}');
  return {db,pin};
}
const req=(digest:string,ids:string[])=>({
  expectedSkillDigest:digest,assetIds:ids,caption:'Synthetic verified caption: book a consultation.',
  channel:'instagram' as const,connectedAccountId:null,scheduledAt:null,
});
describe('Studio exact private media packages',()=>{
 it('isolates assets for the same-business user and across businesses; never grants a publishing action',()=>{
  const {db,pin}=fixture();try{
    const image=attachOwnStudioAsset(db,a,cid,'image',png);
    expect(readOwnStudioAsset(db,a,cid,image.id).bytes).toEqual(png);
    expect(()=>readOwnStudioAsset(db,b,cid,image.id)).toThrow();
    expect(()=>readOwnStudioAsset(db,c,cid,image.id)).toThrow();
    expect(()=>attachOwnStudioAsset(db,b,cid,'image',png)).toThrow();
    expect(listOwnStudioAssets(db,a,cid)).toHaveLength(1);
    const item=createOwnStudioPackage(db,a,cid,req(pin.skillDigest,[image.id]),secret);
    expect(item.publicationAuthorized).toBe(false);
    const ack=reviewOwnStudioPackage(db,a,cid,item.id,item.exactDigest,secret);
    expect(ack.status).toBe('CREATIVE_REVIEWED_PRIVATE');
    expect(ack.publicationAuthorized).toBe(false);
    expect(ack.schedulingActivated).toBe(false);
    expect(()=>readOwnStudioPackage(db,b,cid,item.id,secret)).toThrow();
    expect(()=>reviewOwnStudioPackage(db,b,cid,item.id,item.exactDigest,secret)).toThrow();
    expect(db.prepare('SELECT count(*) n FROM studio_campaign_private_reviews').get()).toEqual({n:1});
  }finally{db.close();}
 });
 it('requires exact bytes, caption, tenant, current credential owner and frozen skill digest',()=>{
  const {db,pin}=fixture();try{
    const asset=attachOwnStudioAsset(db,a,cid,'image',png);
    expect(()=>attachOwnStudioAsset(db,a,cid,'image',Buffer.from('<svg/>'))).toThrow();
    expect(()=>createOwnStudioPackage(db,a,cid,req('a'.repeat(64),[asset.id]),secret)).toThrow();
    expect(()=>createOwnStudioPackage(db,a,cid,req(pin.skillDigest,[asset.id,asset.id]),secret)).toThrow();
    const row=createOwnStudioPackage(db,a,cid,req(pin.skillDigest,[asset.id]),secret);
    expect(()=>reviewOwnStudioPackage(db,a,cid,row.id,'0'.repeat(64),secret)).toThrow(/changed/);
    expect(()=>db.prepare('UPDATE studio_campaign_assets SET sha256=? WHERE id=?').run('0'.repeat(64),asset.id)).toThrow();
    expect(()=>db.prepare('UPDATE studio_campaign_packages SET caption=? WHERE id=?').run('Altered',row.id)).toThrow();
    expect(()=>db.prepare('DELETE FROM studio_campaign_assets WHERE id=?').run(asset.id)).toThrow();
    const saved=readOwnStudioPackage(db,a,cid,row.id,secret);
    expect(saved.caption).toContain('Synthetic verified caption');
  }finally{db.close();}
 });
 it('personal OAuth ownership blocks another member and legacy shared account as destination',()=>{
  const {db,pin}=fixture();try{
    const asset=attachOwnStudioAsset(db,a,cid,'image',png);
    expect(exactOwnedSocialAccounts(db,a)).toHaveLength(1);
    expect(exactOwnedSocialAccounts(db,b)).toHaveLength(1);
    const when=new Date(Date.now()+3600000).toISOString();
    expect(()=>createOwnStudioPackage(db,a,cid,{...req(pin.skillDigest,[asset.id]),
      connectedAccountId:'another',scheduledAt:when},secret)).toThrow();
    expect(()=>createOwnStudioPackage(db,a,cid,{...req(pin.skillDigest,[asset.id]),
      connectedAccountId:'legacy',scheduledAt:when},secret)).toThrow();
    const pkg=createOwnStudioPackage(db,a,cid,{...req(pin.skillDigest,[asset.id]),
      connectedAccountId:'mine',scheduledAt:when},secret);
    expect(pkg.accountId).toBe('mine');
    expect(pkg.scheduledAt).toBe(when);
    expect(readOwnStudioPackage(db,a,cid,pkg.id,secret).schedulingActivated).toBe(false);
    expect(db.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name='post_deliveries'").get()).toBeUndefined(); // This review store does not create publisher work.
  }finally{db.close();}
 });
 it('editing creative content creates a different signed package requiring fresh exact review',()=>{
  const {db,pin}=fixture();try{
    const image=attachOwnStudioAsset(db,a,cid,'image',png);
    const first=createOwnStudioPackage(db,a,cid,req(pin.skillDigest,[image.id]),secret);
    reviewOwnStudioPackage(db,a,cid,first.id,first.exactDigest,secret);
    const changed=createOwnStudioPackage(db,a,cid,{...req(pin.skillDigest,[image.id]),
      caption:'New exact caption, needs its own review.'},secret);
    expect(changed.exactDigest).not.toBe(first.exactDigest);
    expect(changed.revision).toBe(2);
    expect(readOwnStudioPackage(db,a,cid,changed.id,secret).status).toBe('NEEDS_REVIEW');
    expect(readOwnStudioPackage(db,a,cid,first.id,secret).status).toBe('CREATIVE_REVIEWED_PRIVATE');
    expect(()=>reviewOwnStudioPackage(db,a,cid,changed.id,first.exactDigest,secret)).toThrow();
  }finally{db.close();}
 });
 it('rejects package and review database manipulation via HMAC, even if an attacker bypasses an immutable trigger',()=>{
  const {db,pin}=fixture();try{
    const asset=attachOwnStudioAsset(db,a,cid,'image',png);
    const pkg=createOwnStudioPackage(db,a,cid,req(pin.skillDigest,[asset.id]),secret);
    db.exec('DROP TRIGGER studio_package_immutable');
    db.prepare('UPDATE studio_campaign_packages SET caption=? WHERE id=?')
      .run('Tampered exact caption',pkg.id);
    expect(()=>readOwnStudioPackage(db,a,cid,pkg.id,secret)).toThrow(/integrity/);
  }finally{db.close();}
 });
});
