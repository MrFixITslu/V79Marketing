import type Database from 'better-sqlite3';
import {createHash,createHmac,randomUUID,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {readCampaignSkillPin,type SkillActor} from './personalMarketingSkills.js';

// This is a PRIVATE REVIEW store, not the production publishing ledger.
// No reader of these tables is allowed to dispatch or queue a provider post.
const assetKinds=['image','video'] as const;
const channel=z.enum(['facebook','instagram','linkedin','youtube','tiktok']);
export const studioPackageSchema=z.object({
  expectedSkillDigest:z.string().regex(/^[a-f0-9]{64}$/),
  assetIds:z.array(z.string().uuid()).min(1).max(4),
  caption:z.string().trim().min(1).max(2200),
  channel,
  connectedAccountId:z.string().max(180).nullable(),
  scheduledAt:z.string().datetime({offset:true}).nullable(),
}).strict().refine(x=>x.connectedAccountId===null||x.scheduledAt!==null,
  'An exact scheduled instant is required for a connected destination');
export type StudioPackageInput=z.infer<typeof studioPackageSchema>;
export type StudioAssetKind=typeof assetKinds[number];
export type StudioActor=SkillActor;
const hex=(buffer:Buffer|string)=>createHash('sha256').update(buffer).digest('hex');
function macKey(secret:string){
  if(secret.length<32)throw Error('Dedicated Studio review-signing key required');
  return secret;
}
function hmac(secret:string,scope:string,value:string){
  return createHmac('sha256',macKey(secret)).update('v79-studio-review-v1\n'+scope+'\n'+value).digest('hex');
}
function secureEq(a:string,b:string){return /^[0-9a-f]{64}$/.test(a)&&/^[0-9a-f]{64}$/.test(b)&&
  timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));}
export function ensureStudioCampaignTables(db:Database.Database){
  db.exec(`CREATE TABLE IF NOT EXISTS studio_campaign_assets(
    id TEXT PRIMARY KEY,business_id TEXT NOT NULL,user_id TEXT NOT NULL,campaign_id TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('image','video')),mime TEXT NOT NULL,
    bytes BLOB NOT NULL,sha256 TEXT NOT NULL,size_bytes INTEGER NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_studio_asset_owner
    ON studio_campaign_assets(business_id,user_id,campaign_id);
  CREATE TABLE IF NOT EXISTS studio_campaign_packages(
    id TEXT PRIMARY KEY,business_id TEXT NOT NULL,user_id TEXT NOT NULL,campaign_id TEXT NOT NULL,
    revision INTEGER NOT NULL,skill_digest TEXT NOT NULL,asset_ids_json TEXT NOT NULL,
    asset_digests_json TEXT NOT NULL,caption TEXT NOT NULL,channel TEXT NOT NULL,
    connected_account_id TEXT,provider_account_id TEXT,account_fingerprint TEXT,
    scheduled_at TEXT,exact_digest TEXT NOT NULL,signature TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'NEEDS_REVIEW' CHECK(status='NEEDS_REVIEW'),
    created_at TEXT NOT NULL,
    UNIQUE(business_id,user_id,campaign_id,revision),
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS studio_campaign_private_reviews(
    id TEXT PRIMARY KEY,package_id TEXT NOT NULL UNIQUE,
    business_id TEXT NOT NULL,reviewer_user_id TEXT NOT NULL,
    exact_digest TEXT NOT NULL,signature TEXT NOT NULL,reviewed_at TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind='CREATIVE_REVIEW_ONLY'),
    FOREIGN KEY(package_id) REFERENCES studio_campaign_packages(id) ON DELETE CASCADE
  );
  CREATE TRIGGER IF NOT EXISTS studio_asset_immutable
    BEFORE UPDATE ON studio_campaign_assets BEGIN SELECT RAISE(ABORT,'Immutable Studio asset'); END;
  CREATE TRIGGER IF NOT EXISTS studio_package_immutable
    BEFORE UPDATE ON studio_campaign_packages BEGIN SELECT RAISE(ABORT,'Immutable Studio package'); END;
  CREATE TRIGGER IF NOT EXISTS studio_review_immutable
    BEFORE UPDATE ON studio_campaign_private_reviews BEGIN SELECT RAISE(ABORT,'Immutable Studio review'); END;
  CREATE TRIGGER IF NOT EXISTS studio_asset_protect_delete
    BEFORE DELETE ON studio_campaign_assets
    WHEN EXISTS(SELECT 1 FROM studio_campaign_packages p
      WHERE p.business_id=OLD.business_id AND p.user_id=OLD.user_id AND p.campaign_id=OLD.campaign_id
        AND p.asset_ids_json LIKE '%'||OLD.id||'%')
    BEGIN SELECT RAISE(ABORT,'Pinned Studio media cannot be deleted'); END;`);
}
function campaignOwner(db:Database.Database,actor:StudioActor,campaignId:string){
  const pin=readCampaignSkillPin(db,actor,campaignId);
  if(!db.prepare('SELECT 1 FROM campaigns WHERE id=? AND business_id=?')
    .get(campaignId,actor.businessId))throw Error('Campaign not found');
  return pin;
}
// Defensive container checks, not a substitute for browser/FFprobe media
// playback acceptance. Disallow SVG/script-capable formats and oversized pixel
// allocations before letting a private creator stage binary data.
function imageMime(data:Buffer):string|null{
  if(data.length>=64&&data.subarray(0,8).toString('hex')==='89504e470d0a1a0a'&&
    data.readUInt32BE(8)===13&&data.toString('ascii',12,16)==='IHDR'&&
    data.subarray(-8,-4).toString('ascii')==='IEND'&&
    data.readUInt32BE(16)>=1&&data.readUInt32BE(16)<=4096&&
    data.readUInt32BE(20)>=1&&data.readUInt32BE(20)<=4096&&
    data.readUInt32BE(16)*data.readUInt32BE(20)<=8_000_000)
      return 'image/png';
  // JPEG compressed payloads can hide huge dimensions. Walk bounded header
  // markers to find a real Start of Frame width/height, fail closed on any
  // malformed length, unsupported frame or decompression bomb dimensions.
  if(data.length>=128&&data.subarray(0,3).toString('hex')==='ffd8ff'&&
    data.subarray(-2).toString('hex')==='ffd9'){
    let position=2;
    for(let count=0;count<80&&position+4<data.length;count++){
      if(data[position]!==0xff)return null;
      while(position<data.length&&data[position]===0xff)position++;
      const marker=data[position++];
      if(marker===0xd9||marker===0xda)break;
      if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
      if(position+2>data.length)return null;
      const length=data.readUInt16BE(position);
      if(length<2||position+length>data.length)return null;
      if([0xc0,0xc1,0xc2].includes(marker)){
        if(length<7)return null;
        const height=data.readUInt16BE(position+3),width=data.readUInt16BE(position+5);
        return width>=1&&height>=1&&width<=4096&&height<=4096&&
          width*height<=8_000_000?'image/jpeg':null;
      }
      position+=length;
    }
  }
  return null;
}
function hasMp4Atoms(data:Buffer){
  if(data.length<1024||data.subarray(4,8).toString('ascii')!=='ftyp')return false;
  let offset=0,ftyp=false,moov=false,mdat=false,count=0;
  while(offset+8<=data.length&&count++<200){
    const size=data.readUInt32BE(offset),name=data.toString('ascii',offset+4,offset+8);
    if(size<8||size>data.length-offset)return false;
    if(name==='ftyp')ftyp=true;
    if(name==='moov')moov=true;
    if(name==='mdat')mdat=true;
    offset+=size;
  }
  return offset===data.length&&ftyp&&moov&&mdat;
}
function mediaMime(data:Buffer,kind:StudioAssetKind):string{
  const mime=imageMime(data);
  if(kind==='image'&&mime&&data.length<=2*1024*1024)return mime;
  if(kind==='video'&&data.length<=7*1024*1024&&hasMp4Atoms(data))return 'video/mp4';
  throw Error('Invalid image/video bytes or size; SVG and external URLs cannot be pinned');
}
export function attachOwnStudioAsset(db:Database.Database,actor:StudioActor,
  campaignId:string,kind:StudioAssetKind,data:Buffer){
  campaignOwner(db,actor,campaignId);
  if(!Buffer.isBuffer(data))throw Error('Binary media required');
  const mime=mediaMime(data,kind),sha256=hex(data),createdAt=new Date().toISOString(),id=randomUUID();
  return db.transaction(()=>{
    campaignOwner(db,actor,campaignId);
    const n=db.prepare(`SELECT COUNT(*) AS n,COALESCE(SUM(size_bytes),0) AS bytes
      FROM studio_campaign_assets WHERE business_id=? AND user_id=? AND campaign_id=?`)
      .get(actor.businessId,actor.id,campaignId) as {n:number;bytes:number};
    if(n.n>=8||n.bytes+data.length>24*1024*1024)throw Error('Private campaign asset limit reached');
    const aggregate=db.prepare(`SELECT
      COALESCE(SUM(CASE WHEN user_id=? THEN size_bytes ELSE 0 END),0) AS userBytes,
      COALESCE(SUM(size_bytes),0) AS businessBytes
      FROM studio_campaign_assets WHERE business_id=?`)
      .get(actor.id,actor.businessId) as {userBytes:number;businessBytes:number};
    if(aggregate.userBytes+data.length>128*1024*1024||
       aggregate.businessBytes+data.length>512*1024*1024)
      throw Error('Personal or business private-media capacity reached');
    db.prepare(`INSERT INTO studio_campaign_assets
      (id,business_id,user_id,campaign_id,kind,mime,bytes,sha256,size_bytes,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(id,actor.businessId,actor.id,campaignId,kind,mime,data,sha256,data.length,createdAt);
    return {id,campaignId,kind,mime,size:data.length,sha256,createdAt};
  }).immediate();
}
export function listOwnStudioAssets(db:Database.Database,actor:StudioActor,campaignId:string){
  campaignOwner(db,actor,campaignId);
  return db.prepare(`SELECT id,kind,mime,size_bytes AS size,sha256,created_at AS createdAt
    FROM studio_campaign_assets WHERE business_id=? AND user_id=? AND campaign_id=?
    ORDER BY created_at DESC`).all(actor.businessId,actor.id,campaignId);
}
export function readOwnStudioAsset(db:Database.Database,actor:StudioActor,
 campaignId:string,assetId:string){
  campaignOwner(db,actor,campaignId);
  const row=db.prepare(`SELECT bytes,mime,sha256 FROM studio_campaign_assets
    WHERE id=? AND campaign_id=? AND business_id=? AND user_id=?`)
    .get(assetId,campaignId,actor.businessId,actor.id) as
      {bytes:Buffer;mime:string;sha256:string}|undefined;
  if(!row||!secureEq(hex(row.bytes),row.sha256))throw Error('Private asset missing or changed');
  return row;
}
export function exactOwnedSocialAccounts(db:Database.Database,actor:StudioActor){
  // Existing legacy shared connections have a NULL owner and must be
  // reauthorised by their user before private campaign scheduling.
  return db.prepare(`SELECT id,platform,account_name AS accountName,account_handle AS accountHandle
    FROM social_accounts WHERE business_id=? AND connected_by_user_id=?
    AND connected=1 AND access_token_enc IS NOT NULL AND provider_account_id IS NOT NULL
    ORDER BY platform,account_name`).all(actor.businessId,actor.id);
}
function ownedDestination(db:Database.Database,actor:StudioActor,id:string,platform:string){
  const row=db.prepare(`SELECT id,platform,provider_account_id,access_token_enc,
       token_scopes,provider_metadata_json,legal_version,legal_consented_at,expires_at
    FROM social_accounts WHERE id=? AND business_id=? AND connected_by_user_id=?
      AND connected=1 AND platform=? AND access_token_enc IS NOT NULL AND provider_account_id IS NOT NULL`)
    .get(id,actor.businessId,actor.id,platform) as Record<string,string>|undefined;
  if(!row||row.expires_at&&Date.parse(row.expires_at)<Date.now())throw Error('Selected personal OAuth account unavailable or expired');
  const fingerprint=hex(JSON.stringify([row.id,row.platform,row.provider_account_id,
    row.token_scopes,row.provider_metadata_json,row.legal_version,row.legal_consented_at,
    row.expires_at,hex(row.access_token_enc)]));
  return {providerAccountId:row.provider_account_id,accountFingerprint:fingerprint};
}
type PackageRow={id:string;business_id:string;user_id:string;campaign_id:string;revision:number;
 skill_digest:string;asset_ids_json:string;asset_digests_json:string;caption:string;channel:string;
 connected_account_id:string|null;provider_account_id:string|null;account_fingerprint:string|null;
 scheduled_at:string|null;exact_digest:string;signature:string;created_at:string};
function signedPackageFields(row:PackageRow){
  return {id:row.id,businessId:row.business_id,userId:row.user_id,campaignId:row.campaign_id,
    revision:row.revision,skillDigest:row.skill_digest,
    assetIds:JSON.parse(row.asset_ids_json),assetDigests:JSON.parse(row.asset_digests_json),
    caption:row.caption,channel:row.channel,connectedAccountId:row.connected_account_id,
    providerAccountId:row.provider_account_id,accountFingerprint:row.account_fingerprint,
    scheduledAt:row.scheduled_at,createdAt:row.created_at};
}
export function createOwnStudioPackage(db:Database.Database,actor:StudioActor,
 campaignId:string,input:StudioPackageInput,secret:string){
  const parsed=studioPackageSchema.parse(input);
  macKey(secret);
  return db.transaction(()=>{
    const skill=campaignOwner(db,actor,campaignId);
    if(skill.digest!==parsed.expectedSkillDigest)throw Error('Pinned creator skill changed');
    const assets=parsed.assetIds.map(id=>{
      const row=db.prepare(`SELECT id,kind,sha256,bytes,mime FROM studio_campaign_assets
        WHERE id=? AND campaign_id=? AND business_id=? AND user_id=?`)
        .get(id,campaignId,actor.businessId,actor.id) as
        {id:string;kind:string;sha256:string;bytes:Buffer;mime:string}|undefined;
      if(!row||!secureEq(hex(row.bytes),row.sha256))throw Error('Selected private asset missing or changed');
      return {id:row.id,kind:row.kind,mime:row.mime,sha256:row.sha256};
    });
    if(new Set(parsed.assetIds).size!==parsed.assetIds.length)throw Error('Duplicate media in review');
    let account:null|ReturnType<typeof ownedDestination>=null;
    if(parsed.connectedAccountId)account=ownedDestination(db,actor,parsed.connectedAccountId,parsed.channel);
    if(parsed.scheduledAt){
      const at=Date.parse(parsed.scheduledAt),now=Date.now();
      if(!Number.isFinite(at)||at<=now||at-now>14*86400000)
        throw Error('Schedule must be in the next fourteen days');
      if(!account)throw Error('Exact personal destination required for a proposed schedule');
    }
    const last=db.prepare(`SELECT COALESCE(MAX(revision),0) AS n FROM studio_campaign_packages
      WHERE campaign_id=? AND business_id=? AND user_id=?`)
      .get(campaignId,actor.businessId,actor.id) as {n:number};
    if(last.n>=32)throw Error('Private package revision limit reached');
    const id=randomUUID(),createdAt=new Date().toISOString();
    const row:PackageRow={id,business_id:actor.businessId,user_id:actor.id,campaign_id:campaignId,
      revision:last.n+1,skill_digest:skill.digest,asset_ids_json:JSON.stringify(parsed.assetIds),
      asset_digests_json:JSON.stringify(assets),caption:parsed.caption,channel:parsed.channel,
      connected_account_id:parsed.connectedAccountId,provider_account_id:account?.providerAccountId||null,
      account_fingerprint:account?.accountFingerprint||null,scheduled_at:parsed.scheduledAt,
      exact_digest:'',signature:'',created_at:createdAt};
    const exactDigest=hex(JSON.stringify(signedPackageFields(row)));
    const signature=hmac(secret,actor.businessId,exactDigest);
    db.prepare(`INSERT INTO studio_campaign_packages
      (id,business_id,user_id,campaign_id,revision,skill_digest,asset_ids_json,asset_digests_json,
       caption,channel,connected_account_id,provider_account_id,account_fingerprint,scheduled_at,
       exact_digest,signature,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`)
      .run(id,actor.businessId,actor.id,campaignId,last.n+1,skill.digest,row.asset_ids_json,
        row.asset_digests_json,parsed.caption,parsed.channel,parsed.connectedAccountId,
        row.provider_account_id,row.account_fingerprint,row.scheduled_at,exactDigest,signature,createdAt);
    return {id,campaignId,revision:row.revision,exactDigest,skillDigest:skill.digest,
      assetDigests:assets,channel:parsed.channel,accountId:parsed.connectedAccountId,
      scheduledAt:parsed.scheduledAt,
      publicationAuthorized:false,status:'NEEDS_REVIEW',notice:'Immutable private review package; not scheduled or published'};
  }).immediate();
}
export function readOwnStudioPackage(db:Database.Database,actor:StudioActor,campaignId:string,
 packageId:string,secret:string){
  campaignOwner(db,actor,campaignId);
  const row=db.prepare(`SELECT * FROM studio_campaign_packages WHERE id=? AND campaign_id=?
    AND business_id=? AND user_id=?`).get(packageId,campaignId,actor.businessId,actor.id) as PackageRow|undefined;
  if(!row)throw Error('Private package unavailable');
  const computed=hex(JSON.stringify(signedPackageFields(row)));
  if(!secureEq(computed,row.exact_digest)||!secureEq(row.signature,hmac(secret,actor.businessId,row.exact_digest)))
    throw Error('Signed package integrity failed');
  for(const asset of JSON.parse(row.asset_digests_json) as {id:string;sha256:string}[]){
    const actual=readOwnStudioAsset(db,actor,campaignId,asset.id);
    if(actual.sha256!==asset.sha256)throw Error('Attached asset digest changed');
  }
  const reviewed=db.prepare(`SELECT reviewer_user_id AS reviewerUserId,reviewed_at AS reviewedAt,
      exact_digest AS exactDigest,signature FROM studio_campaign_private_reviews
      WHERE package_id=? AND business_id=?`)
    .get(packageId,actor.businessId) as
      {reviewerUserId:string;reviewedAt:string;exactDigest:string;signature:string}|undefined;
  if(reviewed&&(!secureEq(reviewed.exactDigest,row.exact_digest)||
    !secureEq(reviewed.signature,hmac(secret,actor.businessId,JSON.stringify({
      packageId,exactDigest:row.exact_digest,reviewerUserId:reviewed.reviewerUserId,
      reviewedAt:reviewed.reviewedAt
    })))))throw Error('Creative review receipt integrity failed');
  return {...signedPackageFields(row),exactDigest:row.exact_digest,
    status:reviewed?'CREATIVE_REVIEWED_PRIVATE':'NEEDS_REVIEW',reviewed:reviewed||null,
    publicationAuthorized:false,schedulingActivated:false};
}
export function reviewOwnStudioPackage(db:Database.Database,actor:StudioActor,campaignId:string,
 packageId:string,exactDigest:string,secret:string){
  return db.transaction(()=>{
    const p=readOwnStudioPackage(db,actor,campaignId,packageId,secret);
    if(!secureEq(exactDigest,p.exactDigest))throw Error('Reviewed asset/caption/destination/schedule changed');
    if(p.reviewed)return p;
    const reviewedAt=new Date().toISOString(),id=randomUUID();
    db.prepare(`INSERT INTO studio_campaign_private_reviews
      (id,package_id,business_id,reviewer_user_id,exact_digest,signature,reviewed_at,kind)
      VALUES (?,?,?,?,?,?,?,'CREATIVE_REVIEW_ONLY')`)
      .run(id,packageId,actor.businessId,actor.id,p.exactDigest,
        hmac(secret,actor.businessId,JSON.stringify({packageId,exactDigest:p.exactDigest,
          reviewerUserId:actor.id,reviewedAt})),reviewedAt);
    return readOwnStudioPackage(db,actor,campaignId,packageId,secret);
  }).immediate();
}
