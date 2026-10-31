import {describe,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {ensurePersonalSkillTables,pinCampaignSkill} from '../src/lib/personalMarketingSkills.js';
import {ensureStudioCampaignTables,attachOwnStudioAsset,createOwnStudioPackage,
 reviewOwnStudioPackage,readOwnStudioPackage,readOwnStudioAsset} from '../src/lib/studioCampaignAssets.js';
import {ensureStudioPublicationTables} from '../src/lib/studioPublicationBridge.js';
const actor={id:'isolation-owner',businessId:'isolation-business'};
const signingKey='synthetic-isolated-backup-signature-key-not-a-production-secret';
const png=Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAIAAABMXPacAAABL0lEQVR4nO3RQQkAIADAQDWDVQXjG+Me7hIMNvc9I87SAb9rANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AGoA1AGsA1gCsAVgDsAZgDcAagDUAawDWAKwBWAOwBmANwBqANQBrANYArAFYA7AGYA3AHk+bAgHzxRDhAAAAAElFTkSuQmCC','base64');
describe('NEW isolated signed Studio backup/restore gate',()=>{
  it('restores actual immutable bytes, creator skill pin and creative review; fails closed if signing key was lost',async()=>{
    const root=await fs.mkdtemp(path.join(os.tmpdir(),'v79-studio-restore-'));
    const original=path.join(root,'original.sqlite'),backup=path.join(root,'backup.sqlite');
    let db:Database.Database|undefined;
    try{
      db=new Database(original);db.pragma('foreign_keys=ON');db.pragma('journal_mode=WAL');
      db.exec(`CREATE TABLE businesses(id TEXT PRIMARY KEY);
        CREATE TABLE users(id TEXT PRIMARY KEY,business_id TEXT);
        CREATE TABLE campaigns(id TEXT PRIMARY KEY,business_id TEXT);
        INSERT INTO businesses VALUES ('isolation-business');
        INSERT INTO users VALUES ('isolation-owner','isolation-business');`);
      ensurePersonalSkillTables(db);ensureStudioCampaignTables(db);ensureStudioPublicationTables(db);
      const campaign='campaign-'+randomUUID();
      db.prepare('INSERT INTO campaigns(id,business_id) VALUES (?,?)').run(campaign,actor.businessId);
      const pin=pinCampaignSkill(db,actor,campaign);
      const asset=attachOwnStudioAsset(db,actor,campaign,'image',png);
      const record=createOwnStudioPackage(db,actor,campaign,{
        expectedSkillDigest:pin.skillDigest,assetIds:[asset.id],
        caption:'Synthetic example — business process review only.',
        channel:'facebook',connectedAccountId:null,scheduledAt:null,
      },signingKey);
      reviewOwnStudioPackage(db,actor,campaign,record.id,record.exactDigest,signingKey);
      // SQLite ONLINE BACKUP API, NOT a naive filesystem copy of WAL data.
      await db.backup(backup);
      db.close();db=undefined;
      const recovered=new Database(backup,{readonly:true,fileMustExist:true});
      try{
        expect(recovered.pragma('integrity_check')).toEqual([{integrity_check:'ok'}]);
        const actual=readOwnStudioPackage(recovered,actor,campaign,record.id,signingKey);
        expect(actual.status).toBe('CREATIVE_REVIEWED_PRIVATE');
        expect(actual.exactDigest).toBe(record.exactDigest);
        expect(readOwnStudioAsset(recovered,actor,campaign,asset.id).bytes).toEqual(png);
        expect(()=>readOwnStudioPackage(recovered,actor,campaign,record.id,
          'synthetic-wrong-signing-key-32chars')).toThrow(/integrity/);
        expect(()=>readOwnStudioPackage(recovered,{id:'another-user',businessId:actor.businessId},
          campaign,record.id,signingKey)).toThrow();
        expect(recovered.prepare('SELECT COUNT(*) n FROM studio_publication_deliveries').get())
          .toEqual({n:0});
      }finally{recovered.close();}
    }finally{db?.close();await fs.rm(root,{recursive:true,force:true});}
  });
});
