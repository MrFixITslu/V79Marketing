import type Database from 'better-sqlite3';
import {randomUUID,createHmac,createHash,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {readOwnStudioPackage,readOwnStudioAsset,type StudioActor} from './studioCampaignAssets.js';
import {readCampaignSkillPin} from './personalMarketingSkills.js';
import {eligibleStudioPublishMedia,studioProductionChannelAllowed} from './studioPublishMediaPolicy.js';

const hashPattern=/^[a-f0-9]{64}$/;
const sign=(secret:string,businessId:string,value:string)=>{
  if(secret.length<32)throw Error('Dedicated Studio signing key required');
  return createHmac('sha256',secret).update('v79-studio-publication-v1\n'+businessId+'\n'+value).digest('hex');
};
const eq=(a:string,b:string)=>hashPattern.test(a)&&hashPattern.test(b)&&timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
export type PublicationActor=StudioActor&{role:string;hubUserId?:string};
export type PublicationRecord={id:string;package_id:string;campaign_id:string;business_id:string;
 creator_user_id:string;approver_user_id:string;exact_digest:string;approval_signature:string;
 channel:string;account_id:string;scheduled_at:string;status:string;attempt_id:string|null;
 claimed_at:string|null;provider_post_id:string|null;completed_at:string|null;
 last_issue:string|null;created_at:string};

export function ensureStudioPublicationTables(db:Database.Database){
  db.exec(`CREATE TABLE IF NOT EXISTS studio_publication_deliveries(
    id TEXT PRIMARY KEY,package_id TEXT NOT NULL UNIQUE,
    campaign_id TEXT NOT NULL,business_id TEXT NOT NULL,creator_user_id TEXT NOT NULL,
    approver_user_id TEXT NOT NULL,exact_digest TEXT NOT NULL,
    approval_signature TEXT NOT NULL,channel TEXT NOT NULL,account_id TEXT NOT NULL,
    scheduled_at TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN
      ('APPROVED','DISPATCHING','PUBLISHED','UNKNOWN','BLOCKED','CANCELLED')),
    attempt_id TEXT,claimed_at TEXT,provider_post_id TEXT,completed_at TEXT,
    last_issue TEXT,created_at TEXT NOT NULL,
    FOREIGN KEY(package_id) REFERENCES studio_campaign_packages(id) ON DELETE RESTRICT,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_studio_due
    ON studio_publication_deliveries(status,scheduled_at);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_studio_delivery_attempt
    ON studio_publication_deliveries(attempt_id) WHERE attempt_id IS NOT NULL;`);
}
function isApprover(actor:PublicationActor){
  if(!['BUSINESS_OWNER','MARKETING_MANAGER'].includes(actor.role))throw Error('Independent business publishing permission required');
}
function getRow(db:Database.Database,id:string){
  return db.prepare('SELECT * FROM studio_publication_deliveries WHERE id=?').get(id) as PublicationRecord|undefined;
}
function signatureFields(row:PublicationRecord){
  return JSON.stringify({id:row.id,packageId:row.package_id,campaignId:row.campaign_id,
    businessId:row.business_id,creatorUserId:row.creator_user_id,approverUserId:row.approver_user_id,
    exactDigest:row.exact_digest,channel:row.channel,accountId:row.account_id,
    scheduledAt:row.scheduled_at,createdAt:row.created_at});
}
function verifyApproval(row:PublicationRecord,secret:string){
  if(!eq(row.approval_signature,sign(secret,row.business_id,signatureFields(row))))
    throw Error('Exact approval signature changed');
}
export function currentOwnedAccount(db:Database.Database,owner:StudioActor,id:string,channel:string){
  const account=db.prepare(`SELECT id,platform,provider_account_id,access_token_enc,refresh_token_enc,
    token_scopes,provider_metadata_json,legal_version,legal_consented_at,expires_at
    FROM social_accounts WHERE id=? AND business_id=? AND connected_by_user_id=? AND platform=?
    AND connected=1 AND access_token_enc IS NOT NULL AND provider_account_id IS NOT NULL`)
    .get(id,owner.businessId,owner.id,channel) as Record<string,string|null>|undefined;
  if(!account||account.expires_at&&Date.parse(account.expires_at)<=Date.now())
    throw Error('Original creator personal account is not active');
  // Defence in depth: a stored grant must contain the scope for THIS
  // implementation's provider API. Recorded scopes are not proof that
  // Meta/Google still grants them; live provider verification remains a
  // separate release acceptance gate.
  const required:Record<string,string>={
    facebook:'pages_manage_posts',
    instagram:'instagram_content_publish',
    youtube:'https://www.googleapis.com/auth/youtube.upload',
  };
  const declared=new Set(String(account.token_scopes||'').split(/\s+/).filter(Boolean));
  if(required[channel]&&!declared.has(required[channel]))
    throw Error('Original creator connection lacks recorded publishing scope');
  return {account,fingerprint:packageFingerprint(account)};
}
// Same algorithm as the immutable package's exact account fingerprint,
// using SHA-256 of all signed fields, including encrypted token generation.
function packageFingerprint(row:Record<string,string|null>){
  const hex=(value:string)=>createHash('sha256').update(value).digest('hex');
  return hex(JSON.stringify([row.id,row.platform,row.provider_account_id,
    row.token_scopes,row.provider_metadata_json,row.legal_version,row.legal_consented_at,
    row.expires_at,hex(String(row.access_token_enc))]));
}
export function authoriseStudioPublication(db:Database.Database,approver:PublicationActor,
  creatorId:string,campaignId:string,packageId:string,digest:string,
  confirmExactPublication:boolean,secret:string,now=Date.now()){
  isApprover(approver);
  if(confirmExactPublication!==true||!hashPattern.test(digest))throw Error('Explicit exact publishing approval required');
  ensureStudioPublicationTables(db);
  return db.transaction(()=>{
    const current=db.prepare('SELECT role FROM users WHERE id=? AND business_id=?')
      .get(approver.id,approver.businessId) as {role:string}|undefined;
    if(!current||current.role!==approver.role)
      throw Error('Current approving user role changed');
    // A sole business owner may approve their own creative after fresh Hub MFA,
    // but a Marketing manager must not approve their own work.
    if(approver.id===creatorId&&current.role!=='BUSINESS_OWNER')
      throw Error('Independent manager approval required');
    const creator={id:creatorId,businessId:approver.businessId};
    const p=readOwnStudioPackage(db,creator,campaignId,packageId,secret);
    if(!p.reviewed||p.status!=='CREATIVE_REVIEWED_PRIVATE'||!eq(p.exactDigest,digest))
      throw Error('Exact creative package has not been reviewed');
    const latest=db.prepare(`SELECT MAX(revision) AS n FROM studio_campaign_packages
      WHERE business_id=? AND user_id=? AND campaign_id=?`)
      .get(approver.businessId,creatorId,campaignId) as {n:number};
    if(latest.n!==p.revision)throw Error('A newer campaign edit requires a new exact approval');
    if(!p.connectedAccountId||!p.scheduledAt||!p.providerAccountId||!p.accountFingerprint)
      throw Error('Exact personal destination and scheduled instant required');
    if(!studioProductionChannelAllowed(p.channel))
      throw Error('This channel needs signed content disclosures and a verified publishing contract');
    const kinds=p.assetDigests as {kind:string;mime:string;sha256:string;id:string}[];
    if(!eligibleStudioPublishMedia(p.channel,kinds))
      throw Error('Reviewed media format not accepted by selected publishing provider');
    const t=Date.parse(p.scheduledAt);
    if(!Number.isFinite(t)||t<=now+60000||t>now+14*86400000)
      throw Error('Schedule must allow time for review and be within fourteen days');
    const validAccount=currentOwnedAccount(db,creator,p.connectedAccountId,p.channel);
    if(validAccount.account.provider_account_id!==p.providerAccountId||
       !eq(packageFingerprint(validAccount.account),p.accountFingerprint))
      throw Error('Original creator account changed since review');
    const verified=db.prepare('SELECT id FROM users WHERE id=? AND business_id=? AND hub_user_id IS NOT NULL')
      .get(creatorId,approver.businessId);
    if(!verified)throw Error('Creator no longer has a Hub identity');
    const id=randomUUID(),createdAt=new Date(now).toISOString();
    const row:PublicationRecord={id,package_id:packageId,campaign_id:campaignId,
      business_id:approver.businessId,creator_user_id:creatorId,approver_user_id:approver.id,
      exact_digest:digest,channel:p.channel,account_id:p.connectedAccountId,
      scheduled_at:p.scheduledAt,status:'APPROVED',attempt_id:null,claimed_at:null,
      provider_post_id:null,completed_at:null,last_issue:null,created_at:createdAt,
      approval_signature:''};
    const signature=sign(secret,approver.businessId,signatureFields(row));
    db.prepare(`INSERT INTO studio_publication_deliveries
      (id,package_id,campaign_id,business_id,creator_user_id,approver_user_id,
      exact_digest,approval_signature,channel,account_id,scheduled_at,status,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,'APPROVED',?)`)
      .run(id,packageId,campaignId,approver.businessId,creatorId,approver.id,
        digest,signature,p.channel,p.connectedAccountId,p.scheduledAt,createdAt);
    return {id,packageId,channel:p.channel,scheduledAt:p.scheduledAt,status:'APPROVED',
      exactDigest:digest,receipt:signature,dispatchPerformed:false};
  }).immediate();
}
export function claimStudioDelivery(db:Database.Database,secret:string,now=Date.now()){
  ensureStudioPublicationTables(db);
  return db.transaction(()=>{
    const pending=db.prepare(`SELECT * FROM studio_publication_deliveries
      WHERE status='APPROVED' AND scheduled_at<=? ORDER BY scheduled_at,id LIMIT 1`)
      .get(new Date(now).toISOString()) as PublicationRecord|undefined;
    if(!pending)return null;
    verifyApproval(pending,secret);
    const attemptId=randomUUID(),started=new Date(now).toISOString();
    const changed=db.prepare(`UPDATE studio_publication_deliveries
      SET status='DISPATCHING',attempt_id=?,claimed_at=?
      WHERE id=? AND status='APPROVED'`).run(attemptId,started,pending.id);
    if(changed.changes!==1)return null;
    return {...pending,status:'DISPATCHING',attempt_id:attemptId,claimed_at:started};
  }).immediate();
}
export function getStudioDelivery(db:Database.Database,businessId:string,id:string,secret:string){
  const row=getRow(db,id);
  if(!row||row.business_id!==businessId)throw Error('Publication not found');
  verifyApproval(row,secret);
  return row;
}
export function verifyStudioDispatch(db:Database.Database,row:PublicationRecord,secret:string){
  const latest=getStudioDelivery(db,row.business_id,row.id,secret);
  if(latest.status!=='DISPATCHING'||!latest.attempt_id||latest.attempt_id!==row.attempt_id)
    throw Error('Publication claim is not active');
  const creator={id:row.creator_user_id,businessId:row.business_id};
  const p=readOwnStudioPackage(db,creator,row.campaign_id,row.package_id,secret);
  if(!p.reviewed||!eq(p.exactDigest,row.exact_digest)||p.channel!==row.channel||
    p.connectedAccountId!==row.account_id||p.scheduledAt!==row.scheduled_at)
    throw Error('Reviewed package changed');
  const newest=db.prepare(`SELECT MAX(revision) n FROM studio_campaign_packages
    WHERE business_id=? AND user_id=? AND campaign_id=?`)
    .get(row.business_id,row.creator_user_id,row.campaign_id) as {n:number};
  if(p.revision!==newest.n)throw Error('New media revision invalidates earlier publishing consent');
  const pin=readCampaignSkillPin(db,creator,row.campaign_id);
  if(pin.digest!==p.skillDigest)throw Error('Creator skill pin mismatch');
  const destination=currentOwnedAccount(db,creator,row.account_id,row.channel);
  if(!eq(packageFingerprint(destination.account),p.accountFingerprint!)||
    destination.account.provider_account_id!==p.providerAccountId)
    throw Error('Personal OAuth destination changed');
  const media=p.assetDigests as {id:string;kind:string;mime:string;sha256:string}[];
  for(const a of media){
    const saved=readOwnStudioAsset(db,creator,row.campaign_id,a.id);
    if(saved.mime!==a.mime||saved.sha256!==a.sha256)throw Error('Reviewed media no longer matches');
  }
  return {package:p,creator,account:destination.account,media};
}
export function finaliseStudioDelivery(db:Database.Database,row:PublicationRecord,
 status:'PUBLISHED'|'UNKNOWN'|'BLOCKED',details:{providerPostId?:string;issue?:string}={}){
  if(row.status!=='DISPATCHING'||!row.attempt_id)throw Error('An owned dispatch attempt is required');
  return db.transaction(()=>{
    const result=db.prepare(`UPDATE studio_publication_deliveries
      SET status=?,provider_post_id=?,completed_at=?,last_issue=?
      WHERE id=? AND business_id=? AND status='DISPATCHING' AND attempt_id=?`)
      .run(status,details.providerPostId||null,new Date().toISOString(),
        status==='PUBLISHED'?null:(details.issue||'Needs manual provider reconciliation').slice(0,180),
        row.id,row.business_id,row.attempt_id);
    if(result.changes!==1)throw Error('Dispatch state changed: never retry automatically');
    return {id:row.id,status,providerPostId:details.providerPostId||null};
  }).immediate();
}
export function expireInterruptedStudioAttempts(db:Database.Database,now=Date.now()){
  ensureStudioPublicationTables(db);
  return db.prepare(`UPDATE studio_publication_deliveries
    SET status='UNKNOWN',completed_at=?,last_issue='Uncertain provider outcome; manual reconciliation required'
    WHERE status='DISPATCHING' AND claimed_at<?`)
    .run(new Date(now).toISOString(),new Date(now-30*60000).toISOString()).changes;
}
export const studioPublishApprovalSchema=z.object({
  creatorUserId:z.string().min(1).max(180),campaignId:z.string().min(1).max(180),
  packageId:z.string().uuid(),exactDigest:z.string().regex(hashPattern),
  confirmExactPublication:z.literal(true),
}).strict();

export function studioMediaToken(row:PublicationRecord,assetId:string,sha256:string,expiresAt:number,secret:string){
  return sign(secret,row.business_id,JSON.stringify({
    purpose:'approved-media-lease-v1',deliveryId:row.id,packageId:row.package_id,
    exactDigest:row.exact_digest,attemptId:row.attempt_id,
    assetId,sha256,expiresAt
  }));
}
export function readStudioApprovedMedia(db:Database.Database,deliveryId:string,assetId:string,
 expiresAt:number,token:string,secret:string,now=Date.now()){
  if(!Number.isSafeInteger(expiresAt)||expiresAt<now||expiresAt>now+40*60000)
    throw Error('Media lease expired');
  const row=getRow(db,deliveryId);
  if(!row||!['DISPATCHING','PUBLISHED'].includes(row.status)||!row.attempt_id)
    throw Error('Media is not approved for provider retrieval');
  verifyApproval(row,secret);
  const creator={id:row.creator_user_id,businessId:row.business_id};
  const p=readOwnStudioPackage(db,creator,row.campaign_id,row.package_id,secret);
  const asset=(p.assetDigests as {id:string;sha256:string;kind:string;mime:string}[])
    .find(x=>x.id===assetId);
  if(!p.reviewed||p.exactDigest!==row.exact_digest||!asset)
    throw Error('Reviewed media reference changed');
  const expected=studioMediaToken(row,asset.id,asset.sha256,expiresAt,secret);
  if(!eq(expected,token))throw Error('Media lease signature failed');
  const saved=readOwnStudioAsset(db,creator,row.campaign_id,assetId);
  if(saved.sha256!==asset.sha256||saved.mime!==asset.mime)
    throw Error('Approved asset digest mismatch');
  return saved;
}
