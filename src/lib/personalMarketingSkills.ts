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

// Secrets must be rejected even from a PRIVATE draft. Never include matched
// substrings in errors, audit events, responses or telemetry.
const secrets=[
  /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/i,
  /(?:sk-(?:proj-)?|gh[opusr]_|xox[baprs]-|AIza)[A-Za-z0-9_-]{18,}/,
  /\b(?:bearer|api[_ -]?key|client[_ -]?secret|access[_ -]?token|refresh[_ -]?token|password)\s*[:=]\s*["']?\S{12,}/i,
  /\beyJ[A-Za-z0-9_-]{15,}\.eyJ[A-Za-z0-9_-]{15,}\.[A-Za-z0-9_-]{10,}\b/,
];
export function containsLikelySecret(input:SkillContent):boolean{
  return skillFields.some(k=>secrets.some(re=>re.test(input[k])));
}
// Creative warning checks are intentionally separate from secret detection.
// Harmless guidance such as 'never reveal API keys' is valid and useful.
const unsafeRule=[
  /\b(?:ignore|override|disregard)\b.{0,90}\b(?:rules|safety|policy|instructions|approval|system|developer)\b/i,
  /\b(?:bypass|disable|skip|circumvent)\b.{0,100}\b(?:approval|security|safety|rate limits?|budget|permission|tenant|consent|policy)\b/i,
  /\b(?:publish|post|send|spend|charge)\b.{0,55}\b(?:without|no need for)\b.{0,35}\b(?:approval|consent|permission)\b/i,
  /\b(?:reveal|dump|extract|leak|share|forward)\b.{0,70}\b(?:another (?:user|customer)|stored credentials?|stored secrets?|private keys?)\b/i,
];
export function skillConflicts(input:SkillContent):string[]{
  return skillFields.filter(k=>unsafeRule.some(re=>re.test(input[k]))).map(k=>
    'Review '+k+': proposed creative instructions conflict with protected application rules');
}
export function validatedSkill(input:unknown):SkillContent {
  const content=personalSkillSchema.parse(input) as SkillContent;
  if(containsLikelySecret(content))throw Error('Potential credential in skill. Remove sensitive information.');
  const issues=skillConflicts(content);
  if(issues.length)throw Error('Skill instructions conflict with protected rules');
  return content;
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
    source_version INTEGER,
    created_at TEXT NOT NULL,
    PRIMARY KEY(business_id,user_id,version),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS personal_marketing_skill_drafts (
    business_id TEXT NOT NULL,user_id TEXT NOT NULL,base_version INTEGER NOT NULL,
    content_json TEXT NOT NULL,updated_at TEXT NOT NULL,
    draft_revision INTEGER NOT NULL DEFAULT 1,
    PRIMARY KEY(business_id,user_id),
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE,
    FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS campaign_skill_pins (
    campaign_id TEXT PRIMARY KEY,business_id TEXT NOT NULL,user_id TEXT NOT NULL,
    skill_version INTEGER NOT NULL,template_version TEXT NOT NULL,
    snapshot_json TEXT NOT NULL,snapshot_digest TEXT NOT NULL,created_at TEXT NOT NULL,
    FOREIGN KEY(campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS personal_marketing_skill_templates (
    version TEXT PRIMARY KEY,content_json TEXT NOT NULL,digest TEXT NOT NULL,
    active INTEGER NOT NULL DEFAULT 0 CHECK(active IN (0,1))
  );`);
  // Non-destructive migrations for previously created development databases.
  const cols=(table:string)=>db.pragma('table_info('+table+')') as {name:string}[];
  if(!cols('personal_marketing_skill_versions').some(v=>v.name==='source_version'))
    db.exec('ALTER TABLE personal_marketing_skill_versions ADD COLUMN source_version INTEGER');
  if(!cols('personal_marketing_skill_drafts').some(v=>v.name==='draft_revision'))
    db.exec('ALTER TABLE personal_marketing_skill_drafts ADD COLUMN draft_revision INTEGER NOT NULL DEFAULT 1');
  db.prepare(`INSERT OR IGNORE INTO personal_marketing_skill_templates
    (version,content_json,digest,active) VALUES (?,?,?,1)`)
    .run(MASTER_SKILL_VERSION,JSON.stringify(MASTER_SKILL),MASTER_SKILL_DIGEST);
}
type Master={version:string;content:SkillContent;digest:string};
export function activeMasterTemplate(db:Database.Database):Master{
  const row=db.prepare('SELECT version,content_json,digest FROM personal_marketing_skill_templates WHERE active=1 ORDER BY version DESC LIMIT 1')
    .get() as {version:string;content_json:string;digest:string}|undefined;
  return row?{version:row.version,content:personalSkillSchema.parse(JSON.parse(row.content_json)) as SkillContent,digest:row.digest}
    :{version:MASTER_SKILL_VERSION,content:{...MASTER_SKILL},digest:MASTER_SKILL_DIGEST};
}
// ONLY server-side migration scripts call this; no HTTP route exposes it.
// Existing versions are immutable. A new release must use a new ID.
export function activateMasterTemplate(db:Database.Database,version:string,content:SkillContent){
  const parsed=validatedSkill(content),digest=hash({version,content:parsed});
  if(!/^[0-9A-Za-z.-]{4,50}$/.test(version))throw Error('Invalid template release ID');
  return db.transaction(()=>{
    const prior=db.prepare('SELECT digest FROM personal_marketing_skill_templates WHERE version=?')
      .get(version) as {digest:string}|undefined;
    if(prior&&prior.digest!==digest)throw Error('Template version already exists with different content');
    db.prepare('INSERT OR IGNORE INTO personal_marketing_skill_templates(version,content_json,digest,active) VALUES (?,?,?,0)')
      .run(version,JSON.stringify(parsed),digest);
    db.prepare('UPDATE personal_marketing_skill_templates SET active=0 WHERE active=1').run();
    db.prepare('UPDATE personal_marketing_skill_templates SET active=1 WHERE version=?').run(version);
    return {version,digest};
  }).immediate();
}
type VersionRow={version:number;template_version:string;template_json:string;content_json:string;digest:string;kind:string;created_at:string;source_version:number|null};
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
  const active=activeMasterTemplate(db);
  // Deleted personal preferences remain pinned to the tombstone's exact
  // template snapshot until the owner accepts an update; never silently adopt.
  const content=row?personalSkillSchema.parse(JSON.parse(row.content_json)) as SkillContent:
    {...active.content};
  const version=row?.version||0,templateVersion=row?.template_version||active.version;
  return {businessId:actor.businessId,userId:actor.id,version,templateVersion,content,
    digest:hash({businessId:actor.businessId,userId:actor.id,version,templateVersion,content})};
}
export function getSkillWorkspace(db:Database.Database,actor:SkillActor){
  const current=currentSkill(db,actor),head=latest(db,actor);
  const draft=db.prepare(`SELECT base_version,content_json,updated_at,draft_revision FROM personal_marketing_skill_drafts
    WHERE business_id=? AND user_id=?`).get(actor.businessId,actor.id) as
    {base_version:number;content_json:string;updated_at:string;draft_revision:number}|undefined;
  const history=db.prepare(`SELECT version,template_version,digest,kind,created_at FROM personal_marketing_skill_versions
    WHERE business_id=? AND user_id=? ORDER BY version DESC LIMIT 80`)
    .all(actor.businessId,actor.id) as Record<string,unknown>[];
  const master=activeMasterTemplate(db);
  return {current,master,
    draft:draft?{baseVersion:draft.base_version,revision:draft.draft_revision,
      digest:hash(JSON.parse(draft.content_json)),content:JSON.parse(draft.content_json),updatedAt:draft.updated_at}:null,
    history,templateUpdateAvailable:current.templateVersion!==master.version};
}
export function saveSkillDraft(db:Database.Database,actor:SkillActor,baseVersion:number,content:unknown,expectedDraftRevision=0){
  const input=personalSkillSchema.parse(content) as SkillContent;
  if(containsLikelySecret(input))throw Error('Potential credential in draft; remove sensitive information');
  return db.transaction(()=>{
    const current=currentSkill(db,actor);
    if(current.version!==baseVersion)throw Error('Skill version changed; reload before editing');
    const previous=db.prepare(`SELECT base_version,draft_revision FROM personal_marketing_skill_drafts
      WHERE business_id=? AND user_id=?`).get(actor.businessId,actor.id) as
      {base_version:number;draft_revision:number}|undefined;
    const revision=previous?.draft_revision||0;
    if(revision!==expectedDraftRevision||previous&&previous.base_version!==baseVersion)
      throw Error('Draft version changed; keep your unsaved edits and compare before retrying');
    const now=new Date().toISOString();
    db.prepare(`INSERT INTO personal_marketing_skill_drafts
      (business_id,user_id,base_version,content_json,updated_at,draft_revision) VALUES (?,?,?,?,?,?)
      ON CONFLICT(business_id,user_id) DO UPDATE SET
        base_version=excluded.base_version,content_json=excluded.content_json,
        updated_at=excluded.updated_at,draft_revision=excluded.draft_revision`)
      .run(actor.businessId,actor.id,baseVersion,JSON.stringify(input),now,revision+1);
    return {baseVersion,revision:revision+1,digest:hash(input),
      conflicts:skillConflicts(input),updatedAt:now};
  }).immediate();
}
export function requireNoUnpublishedDraft(db:Database.Database,actor:SkillActor,expectedDraftRevision=0){
  own(db,actor);
  const d=db.prepare('SELECT draft_revision FROM personal_marketing_skill_drafts WHERE business_id=? AND user_id=?')
    .get(actor.businessId,actor.id) as {draft_revision:number}|undefined;
  if(d&&d.draft_revision!==expectedDraftRevision)
    throw Error('An unpublished draft exists. Preserve it or explicitly discard before changing the active skill');
  if(d&&expectedDraftRevision===0)throw Error('An unpublished draft exists. Preserve or discard it');
}
export function discardOwnDraft(db:Database.Database,actor:SkillActor,expectedDraftRevision:number){
  return db.transaction(()=>{
    own(db,actor);
    const row=db.prepare('SELECT draft_revision FROM personal_marketing_skill_drafts WHERE business_id=? AND user_id=?')
      .get(actor.businessId,actor.id) as {draft_revision:number}|undefined;
    if(!row||row.draft_revision!==expectedDraftRevision)throw Error('Draft version changed');
    db.prepare('DELETE FROM personal_marketing_skill_drafts WHERE business_id=? AND user_id=?')
      .run(actor.businessId,actor.id);
    return {discarded:true};
  }).immediate();
}
function writeVersion(db:Database.Database,actor:SkillActor,expected:number,content:SkillContent,
 kind:'saved'|'reset'|'restore'|'template_update'|'deleted',templateVersion:string,baseTemplate:SkillContent,sourceVersion:number|null=null) {
  return db.transaction(()=>{
    const current=currentSkill(db,actor);
    if(current.version!==expected)throw Error('Skill version changed; reload before saving');
    if(kind!=='saved')requireNoUnpublishedDraft(db,actor);
    if(kind!=='deleted')validatedSkill(content);
    const version=expected+1,createdAt=new Date().toISOString();
    const item={businessId:actor.businessId,userId:actor.id,version,templateVersion,content};
    const digest=hash(item);
    db.prepare(`INSERT INTO personal_marketing_skill_versions
      (business_id,user_id,version,template_version,template_json,content_json,digest,kind,source_version,created_at)
      VALUES (?,?,?,?,?,?,?,?,?,?)`)
      .run(actor.businessId,actor.id,version,templateVersion,JSON.stringify(baseTemplate),
        JSON.stringify(content),digest,kind,sourceVersion,createdAt);
    db.prepare('DELETE FROM personal_marketing_skill_drafts WHERE business_id=? AND user_id=?')
      .run(actor.businessId,actor.id);
    return {...item,digest};
  }).immediate();
}
export function publishOwnSkill(db:Database.Database,actor:SkillActor,expected:number,
 expectedDraftRevision?:number,expectedDigest?:string){
  if(!Number.isInteger(expectedDraftRevision)||!expectedDigest)throw Error('Exact reviewed draft revision required');
  return db.transaction(()=>{
    const draft=db.prepare(`SELECT * FROM personal_marketing_skill_drafts
      WHERE business_id=? AND user_id=?`).get(actor.businessId,actor.id) as
      {base_version:number;draft_revision:number;content_json:string}|undefined;
    if(!draft||draft.base_version!==expected||draft.draft_revision!==expectedDraftRevision)
      throw Error('Draft version changed; reload and compare');
    const parsed=validatedSkill(JSON.parse(draft.content_json));
    if(hash(parsed)!==expectedDigest)throw Error('Reviewed draft changed; reload and compare');
    const head=latest(db,actor),master=activeMasterTemplate(db);
    const template=head?.template_version||master.version;
    const base=head?personalSkillSchema.parse(JSON.parse(head.template_json)) as SkillContent:master.content;
    return writeVersion(db,actor,expected,parsed,'saved',template,base);
  }).immediate();
}
export function resetOwnSkill(db:Database.Database,actor:SkillActor,expected:number){
  const m=activeMasterTemplate(db);
  return writeVersion(db,actor,expected,{...m.content},'reset',m.version,m.content);
}
export function deleteOwnSkill(db:Database.Database,actor:SkillActor,expected:number){
  const m=activeMasterTemplate(db);
  return writeVersion(db,actor,expected,{...m.content},'deleted',m.version,m.content);
}
export function skillVersion(db:Database.Database,actor:SkillActor,version:number){
  own(db,actor);
  const row=db.prepare(`SELECT * FROM personal_marketing_skill_versions
    WHERE business_id=? AND user_id=? AND version=?`).get(actor.businessId,actor.id,version) as VersionRow|undefined;
  if(!row)throw Error('Skill version not found');
  return {version:row.version,templateVersion:row.template_version,kind:row.kind,sourceVersion:row.source_version,
    template:personalSkillSchema.parse(JSON.parse(row.template_json)) as SkillContent,
    content:personalSkillSchema.parse(JSON.parse(row.content_json)) as SkillContent,
    createdAt:row.created_at,digest:row.digest};
}
export function restoreOwnSkill(db:Database.Database,actor:SkillActor,expected:number,version:number){
  const historical=skillVersion(db,actor,version);
  if(historical.kind==='deleted')throw Error('Cannot restore a tombstone');
  return writeVersion(db,actor,expected,historical.content,'restore',historical.templateVersion,
    historical.template,version);
}
export function mergeTemplateFields(current:SkillContent,oldMaster:SkillContent,newMaster:SkillContent):SkillContent{
  // Three-way field merge: only fields still equal to the old template are
  // refreshed; explicit personal changes must survive master updates.
  return Object.fromEntries(skillFields.map(k=>
    [k,current[k]===oldMaster[k]?newMaster[k]:current[k]])) as SkillContent;
}
export function templateUpdatePreview(db:Database.Database,actor:SkillActor){
  const current=currentSkill(db,actor),head=latest(db,actor),master=activeMasterTemplate(db);
  const oldBase=head?personalSkillSchema.parse(JSON.parse(head.template_json)) as SkillContent:
    {...master.content};
  const proposed=mergeTemplateFields(current.content,oldBase,master.content);
  const changed=skillFields.filter(k=>current.content[k]!==proposed[k]);
  const digest=hash({userId:actor.id,businessId:actor.businessId,expected:current.version,
    from:current.templateVersion,to:master.version,proposed});
  return {from:current.templateVersion,to:master.version,expectedVersion:current.version,
    current:current.content,proposed,changed,digest,available:current.templateVersion!==master.version};
}
export function acceptTemplateUpdate(db:Database.Database,actor:SkillActor,expected:number,proposalDigest:string){
  const preview=templateUpdatePreview(db,actor);
  if(!preview.available||preview.expectedVersion!==expected||preview.digest!==proposalDigest)
    throw Error('Template update proposal changed or unavailable');
  const master=activeMasterTemplate(db);
  return writeVersion(db,actor,expected,preview.proposed,'template_update',master.version,master.content);
}
// Explicitly requested merge of an unpublished draft during a protected action.
// Compute changed fields against the active base, then apply only those deltas
// to the target version. No original draft is lost on validation/transaction
// failure. Existing campaign pins are never rewritten.
export function mergeUnpublishedDraft(db:Database.Database,actor:SkillActor,expected:number,
  expectedDraftRevision:number,action:'reset'|'restore'|'template_update',
  version?:number,proposalDigest?:string){
  return db.transaction(()=>{
    const active=currentSkill(db,actor);
    if(active.version!==expected)throw Error('Skill version changed');
    const row=db.prepare('SELECT base_version,draft_revision,content_json FROM personal_marketing_skill_drafts WHERE business_id=? AND user_id=?')
      .get(actor.businessId,actor.id) as {base_version:number;draft_revision:number;content_json:string}|undefined;
    if(!row||row.base_version!==expected||row.draft_revision!==expectedDraftRevision)
      throw Error('Draft version changed');
    const draft=validatedSkill(JSON.parse(row.content_json));
    const m=activeMasterTemplate(db);
    let target:SkillContent,templateVersion:string,base:SkillContent,sourceVersion:number|null=null;
    if(action==='reset'){target={...m.content};templateVersion=m.version;base=m.content;}
    else if(action==='restore'){
      if(!version)throw Error('Missing historical skill version');
      const history=skillVersion(db,actor,version);
      if(history.kind==='deleted')throw Error('Cannot restore tombstone');
      target=history.content;templateVersion=history.templateVersion;base=history.template;sourceVersion=version;
    }else{
      const preview=templateUpdatePreview(db,actor);
      if(!preview.available||preview.digest!==proposalDigest)throw Error('Template proposal changed');
      target=preview.proposed;templateVersion=m.version;base=m.content;
    }
    const merged=mergeTemplateFields(target,active.content,draft);
    return writeVersion(db,actor,expected,merged,action==='reset'?'reset':action==='restore'?'restore':'template_update',
      templateVersion,base,sourceVersion);
  }).immediate();
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
