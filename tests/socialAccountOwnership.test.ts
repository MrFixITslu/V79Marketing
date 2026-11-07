import {describe,it,expect} from 'vitest';
import Database from 'better-sqlite3';
import {ensureScopedSocialAccountIndexes,mayDisconnectSocialAccount}
  from '../src/lib/socialAccountOwnership.js';

describe('NEW personal social OAuth ownership isolation',()=>{
  it('migrates a legacy unique provider index without data loss; same Page can be independently connected by two members',()=>{
    const db=new Database(':memory:');try{
      db.exec(`CREATE TABLE social_accounts(
        id TEXT PRIMARY KEY,business_id TEXT,connected_by_user_id TEXT,
        platform TEXT,provider_account_id TEXT,access_token_enc TEXT
      );
      CREATE UNIQUE INDEX idx_social_provider_account
        ON social_accounts(business_id,platform,provider_account_id)
        WHERE provider_account_id IS NOT NULL;
      INSERT INTO social_accounts VALUES
        ('legacy','org-a',NULL,'facebook','page-123','legacy-secret-encrypted');`);
      ensureScopedSocialAccountIndexes(db);
      // Newly authorised members own independent encrypted tokens and refresh
      // state, even when Facebook returns the same Page identifier.
      db.prepare('INSERT INTO social_accounts VALUES (?,?,?,?,?,?)')
        .run('mine','org-a','member-a','facebook','page-123','encrypted-member-A');
      db.prepare('INSERT INTO social_accounts VALUES (?,?,?,?,?,?)')
        .run('yours','org-a','member-b','facebook','page-123','encrypted-member-B');
      const alice=db.prepare(`SELECT id,access_token_enc FROM social_accounts
        WHERE business_id=? AND connected_by_user_id=? AND platform=?
          AND provider_account_id=?`).get('org-a','member-a','facebook','page-123') as any;
      const bob=db.prepare(`SELECT id,access_token_enc FROM social_accounts
        WHERE business_id=? AND connected_by_user_id=? AND platform=?
          AND provider_account_id=?`).get('org-a','member-b','facebook','page-123') as any;
      expect(alice).toEqual({id:'mine',access_token_enc:'encrypted-member-A'});
      expect(bob).toEqual({id:'yours',access_token_enc:'encrypted-member-B'});
      expect(db.prepare('SELECT COUNT(*) AS n FROM social_accounts').get()).toEqual({n:3});
      expect(()=>db.prepare('INSERT INTO social_accounts VALUES (?,?,?,?,?,?)')
        .run('hijack','org-a','member-a','facebook','page-123','evil')).toThrow();
      expect(db.prepare('SELECT access_token_enc FROM social_accounts WHERE id=?').get('mine'))
        .toEqual({access_token_enc:'encrypted-member-A'});
      ensureScopedSocialAccountIndexes(db); // idempotent migration
      expect(db.prepare('SELECT COUNT(*) AS n FROM social_accounts').get()).toEqual({n:3});
    }finally{db.close();}
  });
  it('never lets one member disconnect another; legacy owner-only revocation remains explicit',()=>{
    expect(mayDisconnectSocialAccount('member-a','member-a','CONTENT_CREATOR')).toBe(true);
    expect(mayDisconnectSocialAccount('member-a','member-b','BUSINESS_OWNER')).toBe(false);
    expect(mayDisconnectSocialAccount('member-a','member-b','MARKETING_MANAGER')).toBe(false);
    expect(mayDisconnectSocialAccount(null,'member-b','MARKETING_STAFF')).toBe(false);
    expect(mayDisconnectSocialAccount(null,'member-b','BUSINESS_OWNER')).toBe(true);
  });
});
