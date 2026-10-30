import type Database from 'better-sqlite3';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';

// Master version is a deliberately neutral creative guideline, never a V79
// business profile. Brands, approved offers, real contact routes and media live
// in tenant-owned business records; they are not copied into another user.
export const MASTER_SKILL_VERSION='2026-10-30.1';
export const skillFields=['audienceMarkets','voiceLanguage','productClaimRules','visualStyle','ctaWebsiteRules','cadenceCreative','advancedInstructions'] as const;
const field=z.string().max(1600).refine(v=>!/\u0000|[\u0001-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(v),'Unsafe text');
export const personalSkillSchema=z.object(Object.fromEntries(skillFields.map(k=>[k,field])) as
  Record<typeof skillFields[number],typeof field>).strict();
export type SkillContent={ [K in typeof skillFields[number]]:string };
export const MASTER_SKILL:Readonly<SkillContent>=Object.freeze({
  audienceMarkets:'Address the intended customers and region from the authorised business brief. Make benefits relevant to their real work.',
  voiceLanguage:'Write in clear, accessible language. Use the customer’s documented brand voice and preferred spelling conventions.',
  productClaimRules:'Refer only to verified products, current services and approved offers in the business profile. Do not invent results, guarantees, endorsements or pricing.',
  visualStyle:'Prefer authentic, licensed imagery, clear hierarchy, phone-readable typography and verified product demonstrations. Mark synthetic images as illustrative.',
  ctaWebsiteRules:'Include one clear action, using the currently verified destination in the customer’s own business profile. Do not invent links or contact details.',
  cadenceCreative:'Prepare varied platform-native concepts and post formats. Treat proposed publishing times as experiments without analytics evidence.',
  advancedInstructions:'',
});
export type SkillActor={id:string;businessId:string};
export type SkillSnapshot={businessId:string;userId:string;version:number;templateVersion:string;content:SkillContent;digest:string};
const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const MASTER_SKILL_DIGEST=hash({version:MASTER_SKILL_VERSION,content:MASTER_SKILL});

// Conflict scans are defense in depth; the actual worker must enforce
// permissions, verified claims, key scope, provider policy and approval in code.
const forbidden=[
  /\b(?:api[ _-]?key|access[ _-]?token|refresh[ _-]?token|password|client[ _-]?secret|bearer[ _-]?token|private[ _-]?key)\b/i,
  /\b(?:ignore|override|disregard)\b.{0,90}\b(?:rules|safety|policy|instructions|approval|system|developer)\b/i,
  /\b(?:bypass|disable|skip|circumvent)\b.{0,100}\b(?:approval|security|safety|rate limit|budget|permission|tenant|consent|policy)\b/i,
  /\b(?:publish|post|send|spend|charge)\b.{0,55}\b(?:without|no need for)\b.{0,35}\b(?:approval|consent|permission)\b/i,
  /\b(?:reveal|dump|extract|leak|share|forward)\b.{0,70}\b(?:credentials?|secrets?|tokens?|keys?|another (?:user|customer))\b/i,
  /\b(?:https?:\/\/|www\.)\S+/i,
  /\b[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}\b/i,
  /\+?\d[\d ().-]{8,}\d/,
];
export function skillConflicts(input:SkillContent):string[]{
  return skillFields.filter(k=>forbidden.some(re=>re.test(input[k]||''))).map(k=>
    'Review '+k+': instructions contain credentials, contact data, or a possible conflict with protected rules');
}
export function validatedSkill(input:unknown):SkillContent {
  const content=personalSkillSchema.parse(input);
  const issues=skillConflicts(content);
  if(issues.length)throw Error('Skill conflicts with protected rules: '+issues.join('; '));
  return content as SkillContent;
}
export function ensurePersonalSkillTables(db:Database.Database){
  db.exec(`CREATE TABLE IF NOT EXISTS personal_marketing_skill_versions (
    business_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    version INTEGER NOT NULL,
    template_version TEXT NOT NULL,
    template_json TEXT NOT NULL,
    content_json TEXT NOT NULL,
    digest TEXT NOT NULL,
    kind TEXT NOT NULL CHECK(kind IN ('saved','reset','restore','template_update','deleted')),
    created_at TEXT NOT NULL,
    PRIMARY KEY(business_id,user_id,version),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS personal_marketing_skill_drafts (
    business_id TEXT NOT NULL,user_id TEXT NOT NULL,base_version INTEGER NOT NULL,
    content_json TEXT NOT NULL,updated_at TEXT NOT NULL,
    PRIMARY KEY(business_id,user_id),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS campaign_skill_pins (
    campaign_id TEXT PRIMARY KEY,business_id TEXT NOT NULL,user_id TEXT NOT NULL,
    skill_version INTEGER NOT NULL,template_version TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,snapshot_digest TEXT NOT NULL,created_at TEXT NOT NULL,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE RESTRICT
  );`);
}
type VersionRow={version:number;template_version:string;template_json:string;content_json:string;digest:string;kind:string;created_at:string};
function latest(db:Database.Database,actor:SkillActor):VersionRow|undefined {
  return db.prepare(`SELECT * FROM personal_marketing_skill_versions
    WHERE business_id=? AND user_id=? ORDER BY version DESC LIMIT 1`)
    .get(actor.businessId,actor.id) as VersionRow|undefined;
}
function own(db:Database.Database,actor:SkillActor){
  if(!db.prepare('SELECT 1 FROM users WHERE id=? AND business_id=?').get(actor.id,actor.businessId))
    throw Error('Skill owner unavailable');
}
export function currentSkill(db:Database.Database,actor:SkillActor):SkillSnapshot {
  own(db,actor);
  const row=latest(db,actor);
  const content=row&&row.kind!=='deleted'?personalSkillSchema.parse(JSON.parse(row.content_json)) as SkillContent:
    {...MASTER_SKILL};
  const version=row?.version||0,templateVersion=row?.template_version||MASTER_SKILL_VERSION;
  return {businessId:actor.businessId,userId:actor.id,version,templateVersion,content,
    digest:hash({businessId:actor.businessId,userId:actor.id,version,templateVersion,content})};
}
export function getSkillWorkspace(db:Database.Database,actor:SkillActor){
  const current=currentSkill(db,actor),head=latest(db,actor);
  const draft=db.prepare(`SELECT base_version,content_json,updated_at FROM personal_marketing_skill_drafts
    WHERE business_id=? AND user_id=?`).get(actor.businessId,actor.id) as
    {base_version:number;content_json:string;updated_at:string}|undefined;
  const history=db.prepare(`SELECT version,template_version,digest,kind,created_at FROM personal_marketing_skill_versions
    WHERE business_id=? AND user_id=? ORDER BY version DESC LIMIT 80`)
    .all(actor.businessId,actor.id) as Record<string,unknown>[];
  return {current,master:{version:MASTER_SKILL_VERSION,digest:MASTER_SKILL_DIGEST,content:MASTER_SKILL},
    draft:draft?{baseVersion:draft.base_version,content:JSON.parse(draft.content_json),updatedAt:draft.updated_at}:null,
    history,templateUpdateAvailable:!!head&&head.kind!=='deleted'&&head.template_version!==MASTER_SKILL_VERSION};
}
export function saveSkillDraft(db:Database.Database,actor:SkillActor,baseVersion:number,content:unknown){
  const input=personalSkillSchema.parse(content);
  const current=currentSkill(db,actor);
  if(current.version!==baseVersion)throw Error('Skill version changed; reload before editing');
  const now=new Date().toISOString();
  db.prepare(`INSERT INTO personal_marketing_skill_drafts
    (business_id,user_id,base_version,content_json,updated_at) VALUES (?,?,?,?,?)
    ON CONFLICT(business_id,user_id) DO UPDATE SET
      base_version=excluded.base_version,content_json=excluded.content_json,updated_at=excluded.updated_at`)
    .run(actor.businessId,actor.id,baseVersion,JSON.stringify(input),now);
  return {baseVersion,content:input,conflicts:skillConflicts(input),updatedAt:now};
}
function writeVersion(db:Database.Database,actor:SkillActor,expected:number,content:SkillContent,
 kind:'saved'|'reset'|'restore'|'template_update'|'deleted',templateVersion:string,baseTemplate:SkillContent) {
  return db.transaction(()=>{
    const current=currentSkill(db,actor);
    if(current.version!==expected)throw Error('Skill version changed; reload before saving');
    if(kind!=='deleted')validatedSkill(content);
    const version=expected+1,createdAt=new Date().toISOString();
    const item={businessId:actor.businessId,userId:actor.id,version,templateVersion,content};
    const digest=hash(item);
    db.prepare(`INSERT INTO personal_marketing_skill_versions
      (business_id,user_id,version,template_version,template_json,content_json,digest,kind,created_at)
      VALUES (?,?,?,?,?,?,?,?,?)`)
      .run(actor.businessId,actor.id,version,templateVersion,JSON.stringify(baseTemplate),
        JSON.stringify(content),digest,kind,createdAt);
    db.prepare('DELETE FROM personal_marketing_skill_drafts WHERE business_id=? AND user_id=?')
      .run(actor.businessId,actor.id);
    return {...item,digest};
  }).immediate();
}
export function publishOwnSkill(db:Database.Database,actor:SkillActor,expected:number){
  const draft=db.prepare(`SELECT * FROM personal_marketing_skill_drafts
    WHERE business_id=? AND user_id=?`).get(actor.businessId,actor.id) as
    {base_version:number;content_json:string}|undefined;
  if(!draft||draft.base_version!==expected)throw Error('Save a current draft first');
  const head=latest(db,actor),template=head&&head.kind!=='deleted'?head.template_version:MASTER_SKILL_VERSION;
  const base=head&&head.kind!=='deleted'?personalSkillSchema.parse(JSON.parse(head.template_json)) as SkillContent:{...MASTER_SKILL};
  return writeVersion(db,actor,expected,validatedSkill(JSON.parse(draft.content_json)),'saved',template,base);
}
export function resetOwnSkill(db:Database.Database,actor:SkillActor,expected:number){
  return writeVersion(db,actor,expected,{...MASTER_SKILL},'reset',MASTER_SKILL_VERSION,{...MASTER_SKILL});
}
export function deleteOwnSkill(db:Database.Database,actor:SkillActor,expected:number){
  // Tombstone preserves historical revision references and pinned jobs.
  return writeVersion(db,actor,expected,{...MASTER_SKILL},'deleted',MASTER_SKILL_VERSION,{...MASTER_SKILL});
}
export function skillVersion(db:Database.Database,actor:SkillActor,version:number){
  own(db,actor);
  const row=db.prepare(`SELECT * FROM personal_marketing_skill_versions
    WHERE business_id=? AND user_id=? AND version=?`).get(actor.businessId,actor.id,version) as VersionRow|undefined;
  if(!row)throw Error('Skill version not found');
  return {version:row.version,templateVersion:row.template_version,kind:row.kind,
    content:personalSkillSchema.parse(JSON.parse(row.content_json)),createdAt:row.created_at,digest:row.digest};
}
export function restoreOwnSkill(db:Database.Database,actor:SkillActor,expected:number,version:number){
  const row=skillVersion(db,actor,version);
  if(row.kind==='deleted')throw Error('Cannot restore a tombstone');
  const base=latest(db,actor);
  return writeVersion(db,actor,expected,row.content,'restore',row.templateVersion,
    base&&base.kind!=='deleted'?personalSkillSchema.parse(JSON.parse(base.template_json)) as SkillContent:{...MASTER_SKILL});
}
export function templateUpdatePreview(db:Database.Database,actor:SkillActor){
  const current=currentSkill(db,actor),head=latest(db,actor);
  const oldBase=head&&head.kind!=='deleted'?personalSkillSchema.parse(JSON.parse(head.template_json)) as SkillContent:
    {...MASTER_SKILL};
  const proposed=Object.fromEntries(skillFields.map(k=>
    [k,current.content[k]===oldBase[k]?MASTER_SKILL[k]:current.content[k]])) as SkillContent;
  const changed=skillFields.filter(k=>current.content[k]!==proposed[k]);
  const digest=hash({userId:actor.id,businessId:actor.businessId,expected:current.version,
    from:current.templateVersion,to:MASTER_SKILL_VERSION,proposed});
  return {from:current.templateVersion,to:MASTER_SKILL_VERSION,expectedVersion:current.version,
    current:current.content,proposed,changed,digest,available:current.templateVersion!==MASTER_SKILL_VERSION};
}
export function acceptTemplateUpdate(db:Database.Database,actor:SkillActor,expected:number,proposalDigest:string){
  const preview=templateUpdatePreview(db,actor);
  if(!preview.available||preview.expectedVersion!==expected||preview.digest!==proposalDigest)
    throw Error('Template update proposal changed or unavailable');
  return writeVersion(db,actor,expected,preview.proposed,'template_update',MASTER_SKILL_VERSION,{...MASTER_SKILL});
}
export function skillPreview(content:unknown){
  const data=personalSkillSchema.parse(content),conflicts=skillConflicts(data);
  // Fixed illustrative example; never a fictional customer or user brand.
  return {conflicts,headline:'A simpler way to manage recurring work',
    sampleCaption:'Busy teams need dependable processes. Identify one repeated task, document its steps, and review how technology could reduce friction. Learn more through your verified business contact route.',
    note:'Illustrative only. Final claims, branding, offer and CTA are supplied by your own authorised business profile.',
    preferences:{markets:data.audienceMarkets,voice:data.voiceLanguage,visuals:data.visualStyle}};
}
export function snapshotOwnSkill(db:Database.Database,actor:SkillActor):SkillSnapshot {
  const skill=currentSkill(db,actor);
  if(skillConflicts(skill.content).length)throw Error('Unsafe skill version');
  return skill;
}
export function pinCampaignSkill(db:Database.Database,actor:SkillActor,campaignId:string){
  const snapshot=snapshotOwnSkill(db,actor);
  const exists=db.prepare('SELECT 1 FROM campaigns WHERE id=? AND business_id=?')
    .get(campaignId,actor.businessId);
  if(!exists)throw Error('Campaign not found in your business');
  db.prepare(`INSERT INTO campaign_skill_pins
    (campaign_id,business_id,user_id,skill_version,template_version,snapshot_json,snapshot_digest,created_at)
    VALUES (?,?,?,?,?,?,?,?)`)
    .run(campaignId,actor.businessId,actor.id,snapshot.version,snapshot.templateVersion,
      JSON.stringify(snapshot),snapshot.digest,new Date().toISOString());
  return {campaignId,creatorUserId:actor.id,skillVersion:snapshot.version,skillDigest:snapshot.digest};
}
export function readCampaignSkillPin(db:Database.Database,actor:SkillActor,campaignId:string) {
  const row=db.prepare(`SELECT snapshot_json,snapshot_digest FROM campaign_skill_pins
    WHERE campaign_id=? AND business_id=? AND user_id=?`)
    .get(campaignId,actor.businessId,actor.id) as {snapshot_json:string;snapshot_digest:string}|undefined;
  if(!row)throw Error('Campaign creator or pinned skill unavailable');
  const snapshot=JSON.parse(row.snapshot_json) as SkillSnapshot;
  if(snapshot.businessId!==actor.businessId||snapshot.userId!==actor.id||
     snapshot.digest!==row.snapshot_digest||hash({businessId:snapshot.businessId,userId:snapshot.userId,
        version:snapshot.version,templateVersion:snapshot.templateVersion,content:snapshot.content})!==snapshot.digest)
    throw Error('Pinned campaign skill integrity failed');
  return snapshot;
}
