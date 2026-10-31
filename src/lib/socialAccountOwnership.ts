import type Database from 'better-sqlite3';

/** Non-destructive migration: an OAuth provider account may be connected by
 * two different members with independently encrypted tokens and consent. */
export function ensureScopedSocialAccountIndexes(db:Database.Database){
  const fields=db.pragma('table_info(social_accounts)') as {name:string}[];
  if(!fields.some(x=>x.name==='connected_by_user_id'))
    throw Error('Run social account owner column migration first');
  db.exec(`DROP INDEX IF EXISTS idx_social_provider_account;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_social_provider_owner_account
      ON social_accounts(business_id,connected_by_user_id,platform,provider_account_id)
      WHERE connected_by_user_id IS NOT NULL AND provider_account_id IS NOT NULL;
    CREATE UNIQUE INDEX IF NOT EXISTS idx_social_provider_legacy_account
      ON social_accounts(business_id,platform,provider_account_id)
      WHERE connected_by_user_id IS NULL AND provider_account_id IS NOT NULL;`);
}
export function mayDisconnectSocialAccount(ownerUserId:string|null|undefined,
  userId:string,role:string){
  // Existing business-level legacy accounts are visible to the owner only,
  // never reassigned to someone else's personal OAuth token.
  return ownerUserId?ownerUserId===userId:role==='BUSINESS_OWNER';
}
