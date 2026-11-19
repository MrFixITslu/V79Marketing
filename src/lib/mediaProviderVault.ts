import crypto from 'node:crypto';
import type Database from 'better-sqlite3';

// BYOK provider definitions identify credentials only. They do not imply that
// provider adapters have been approved, paid for or connected.
export const mediaKeyProviders = ['gemini', 'openai', 'fal', 'replicate', 'runway', 'mcp'] as const;
export type MediaKeyProvider = typeof mediaKeyProviders[number];
export type MediaKeyActor = {businessId:string;id:string};
const isProvider = (value:string):value is MediaKeyProvider =>
  (mediaKeyProviders as readonly string[]).includes(value);

function masterKey(env:NodeJS.ProcessEnv=process.env):Buffer {
  // Deliberately separate from JWT, social OAuth and the production audit key.
  // 32 independent random bytes, unpadded base64url (openssl rand -base64 32
  // may be converted to base64url without padding).
  const encoded=String(env.V79_MEDIA_CREDENTIALS_MASTER_KEY||'');
  if(!/^[A-Za-z0-9_-]{43}$/.test(encoded))throw Error('Media credential vault unavailable');
  const bytes=Buffer.from(encoded,'base64url');
  if(bytes.length!==32||bytes.toString('base64url')!==encoded)
    throw Error('Media credential vault unavailable');
  return bytes;
}
export function mediaVaultConfigured(env:NodeJS.ProcessEnv=process.env):boolean {
  try {masterKey(env);return true;}catch{return false;}
}
function aad(actor:MediaKeyActor,provider:MediaKeyProvider):Buffer {
  return Buffer.from(['v79-media-byok-v1',actor.businessId,actor.id,provider].join('\n'),'utf8');
}
function encrypt(value:string,actor:MediaKeyActor,provider:MediaKeyProvider):string {
  const nonce=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv('aes-256-gcm',masterKey(),nonce);
  cipher.setAAD(aad(actor,provider));
  const encrypted=Buffer.concat([cipher.update(value,'utf8'),cipher.final()]);
  return ['v1',nonce.toString('base64url'),cipher.getAuthTag().toString('base64url'),
    encrypted.toString('base64url')].join('.');
}
function decrypt(value:string,actor:MediaKeyActor,provider:MediaKeyProvider):string {
  const parts=value.split('.');
  if(parts.length!==4||parts[0]!=='v1')throw Error('Stored media credential unavailable');
  try{
    const nonce=Buffer.from(parts[1],'base64url'),tag=Buffer.from(parts[2],'base64url');
    if(nonce.length!==12||tag.length!==16)throw Error('Invalid vault record');
    const decipher=crypto.createDecipheriv('aes-256-gcm',masterKey(),nonce);
    decipher.setAAD(aad(actor,provider));decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(Buffer.from(parts[3],'base64url')),decipher.final()]).toString('utf8');
  }catch {throw Error('Stored media credential unavailable');}
}

export function ensureMediaKeyTable(db:Database.Database) {
  db.exec(`CREATE TABLE IF NOT EXISTS media_provider_keys (
    business_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    provider TEXT NOT NULL CHECK(provider IN ('gemini','openai','fal','replicate','runway','mcp')),
    ciphertext TEXT NOT NULL,
    revision INTEGER NOT NULL DEFAULT 1,
    credential_generation TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    PRIMARY KEY(business_id,user_id,provider),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );`);
  const cols=db.pragma('table_info(media_provider_keys)') as {name:string}[];
  if(!cols.some(v=>v.name==='credential_generation'))
    db.exec("ALTER TABLE media_provider_keys ADD COLUMN credential_generation TEXT NOT NULL DEFAULT ''");
}
function checkedProvider(provider:string):MediaKeyProvider {
  if(!isProvider(provider))throw Error('Unsupported media provider');
  return provider;
}
export function listOwnMediaKeys(db:Database.Database,actor:MediaKeyActor) {
  const rows=db.prepare(`SELECT provider,revision,credential_generation,created_at,updated_at FROM media_provider_keys
    WHERE business_id=? AND user_id=? ORDER BY provider`).all(actor.businessId,actor.id) as
    {provider:string;revision:number;credential_generation:string;created_at:string;updated_at:string}[];
  return rows.map(row=>({provider:row.provider,configured:true,revision:row.revision,credentialGeneration:row.credential_generation||null,
    createdAt:row.created_at,updatedAt:row.updated_at}));
}
export function saveOwnMediaKey(db:Database.Database,actor:MediaKeyActor,providerName:string,apiKey:string) {
  const provider=checkedProvider(providerName);
  if(typeof apiKey!=='string'||apiKey.length<12||apiKey.length>4096||apiKey.trim()!==apiKey||
    /[\u0000-\u001f\u007f]/.test(apiKey))throw Error('Invalid API key format');
  // Encrypt before any DB write. If vault key is absent no plaintext persists.
  const encrypted=encrypt(apiKey,actor,provider),now=new Date().toISOString(),generation=crypto.randomUUID();
  return db.transaction(()=>{
    // A DB user ID alone is not sufficient. Verify its business ownership too.
    const identity=db.prepare('SELECT 1 FROM users WHERE id=? AND business_id=?')
      .get(actor.id,actor.businessId);
    if(!identity)throw Error('Media credential owner unavailable');
    db.prepare(`INSERT INTO media_provider_keys
      (business_id,user_id,provider,ciphertext,revision,credential_generation,created_at,updated_at)
      VALUES (?,?,?,?,1,?,?,?)
      ON CONFLICT(business_id,user_id,provider) DO UPDATE SET
        ciphertext=excluded.ciphertext,revision=revision+1,credential_generation=excluded.credential_generation,updated_at=excluded.updated_at`)
      .run(actor.businessId,actor.id,provider,encrypted,generation,now,now);
    return {provider,configured:true}; // Never echo the key or ciphertext.
  })();
}
// This server-only accessor must NEVER be mounted as a browser/API route.
// Future generation workers must resolve the *current user* and re-check
// their Hub entitlement and consent before each paid provider call.
export function readOwnMediaKey(db:Database.Database,actor:MediaKeyActor,providerName:string):string|null {
  const provider=checkedProvider(providerName);
  const row=db.prepare(`SELECT ciphertext FROM media_provider_keys
    WHERE business_id=? AND user_id=? AND provider=? AND EXISTS
      (SELECT 1 FROM users WHERE id=? AND business_id=?)`)
    .get(actor.businessId,actor.id,provider,actor.id,actor.businessId) as {ciphertext:string}|undefined;
  return row?decrypt(row.ciphertext,actor,provider):null;
}
export function readOwnMediaCredential(db:Database.Database,actor:MediaKeyActor,providerName:string){
  const provider=checkedProvider(providerName);
  const row=db.prepare(`SELECT ciphertext,credential_generation FROM media_provider_keys
    WHERE business_id=? AND user_id=? AND provider=? AND EXISTS
      (SELECT 1 FROM users WHERE id=? AND business_id=?)`)
    .get(actor.businessId,actor.id,provider,actor.id,actor.businessId) as
    {ciphertext:string;credential_generation:string}|undefined;
  if(!row)return null;
  if(!/^[0-9a-f-]{36}$/.test(row.credential_generation))throw Error('Reconnect this personal credential for generation');
  return {value:decrypt(row.ciphertext,actor,provider),generationId:row.credential_generation};
}
export function deleteOwnMediaKey(db:Database.Database,actor:MediaKeyActor,providerName:string) {
  const provider=checkedProvider(providerName);
  const removed=db.prepare(`DELETE FROM media_provider_keys
    WHERE business_id=? AND user_id=? AND provider=?`)
    .run(actor.businessId,actor.id,provider);
  return {deleted:removed.changes===1};
}
