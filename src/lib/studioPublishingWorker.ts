import type Database from 'better-sqlite3';
import {decryptToken} from './tokenVault.js';
import {publishWithProvider,type ProviderAccountRecord,
  type ProviderPlatform,type ProviderPublishPayload} from './socialProviders.js';
import {verifyMarketingBackgroundEntitlement} from './auth.js';
import {claimStudioDelivery,expireInterruptedStudioAttempts,
  finaliseStudioDelivery,verifyStudioDispatch,studioMediaToken,
  type PublicationRecord} from './studioPublicationBridge.js';

export type StudioDispatchResult={providerPostId:string;publishedAt:string};
export type StudioWorkerDeps={
  entitled:(organizationId:string,hubUserId:string)=>Promise<boolean>;
  dispatch:(row:PublicationRecord,account:ProviderAccountRecord,
    payload:ProviderPublishPayload)=>Promise<StudioDispatchResult>;
  now?:()=>number;
};
function liveIdentity(db:Database.Database,row:PublicationRecord){
  const creator=db.prepare(`SELECT b.hub_organization_id AS org,u.hub_user_id AS hub,
    u.role AS creatorRole FROM users u JOIN businesses b ON b.id=u.business_id
    WHERE u.id=? AND b.id=?`).get(row.creator_user_id,row.business_id) as
    {org:string|null;hub:string|null;creatorRole:string}|undefined;
  const approver=db.prepare('SELECT role FROM users WHERE id=? AND business_id=?')
    .get(row.approver_user_id,row.business_id) as {role:string}|undefined;
  if(!creator?.org||!creator.hub||!approver||
     !['BUSINESS_OWNER','MARKETING_MANAGER'].includes(approver.role))
    throw Error('Creator or independent publishing approver no longer authorised');
  return creator as {org:string;hub:string;creatorRole:string};
}
export function studioWorkerDeps():StudioWorkerDeps{
  return {
    entitled:async(org,hub)=>{
      if(process.env.V79_ENTITLEMENT_RECHECK_ENABLED!=='1'||!verifyMarketingBackgroundEntitlement)
        return false;
      try{return await verifyMarketingBackgroundEntitlement({
        organizationId:org,scopedUserId:hub});}
      catch{return false;}
    },
    dispatch:async(_row,account,payload)=>{
      const result=await publishWithProvider(account,payload);
      return {providerPostId:result.providerPostId,publishedAt:result.publishedAt};
    }
  };
}
// The adapter has no general-purpose execution, cross-provider fallback,
// credential rotation or retries. It only sends an exact immutable package.
export function createStudioPublisher(db:Database.Database,secret:string,
 options:{deps?:StudioWorkerDeps;env?:NodeJS.ProcessEnv}={}){
  const env=options.env||process.env,deps=options.deps||studioWorkerDeps();
  const clock=deps.now||Date.now;
  const active=()=>env.V79_STUDIO_PUBLISH_ENABLED==='1'&&env.V79_ENTITLEMENT_RECHECK_ENABLED==='1';
  function mediaOrigin(){
    const v=new URL(env.APP_URL||'');
    if(v.protocol!=='https:'||v.username||v.password||v.pathname!=='/'||v.search||v.hash)
      throw Error('Canonical HTTPS Marketing APP_URL required');
    return v.origin;
  }
  const history=(businessId:string)=>db.prepare(`SELECT id,package_id AS packageId,
      channel,scheduled_at AS scheduledAt,status,created_at AS createdAt,
      provider_post_id AS providerPostId,last_issue AS issue
    FROM studio_publication_deliveries WHERE business_id=?
    ORDER BY created_at DESC LIMIT 50`).all(businessId);
  let running=false;
  async function tick(){
    if(!active()||running)return {skipped:true};
    running=true;
    try{
      expireInterruptedStudioAttempts(db,clock());
      const job=claimStudioDelivery(db,secret,clock());
      if(!job)return {claimed:false};
      let dispatched=false;
      try{
        const identity=liveIdentity(db,job);
        if(!await deps.entitled(identity.org,identity.hub))
          throw Error('Live original creator Hub entitlement denied');
        const checked=verifyStudioDispatch(db,job,secret);
        const row=checked.account,platform=job.channel as ProviderPlatform;
        if(!['facebook','instagram','youtube'].includes(platform))
          throw Error('Publishing channel not approved');
        // Secure exact media URL is usable only while the signed delivery is
        // dispatching (or has a receipt), and expires after 25 minutes.
        const asset=(checked.media as {id:string;kind:string;mime:string;sha256:string}[])
          .find(a=>platform==='youtube'?a.mime==='video/mp4':
            a.kind==='image'&&['image/jpeg','image/png'].includes(a.mime));
        if(!asset)throw Error('Approved media format unavailable');
        const expires=clock()+25*60000;
        const token=studioMediaToken(job,asset.id,asset.sha256,expires,secret);
        const mediaUrl=mediaOrigin()+'/media/studio/'+job.id+'/'+asset.id+'/'+expires+'/'+token;
        const account:ProviderAccountRecord={
          platform,providerAccountId:String(row.provider_account_id),
          accessToken:decryptToken(String(row.access_token_enc)),
          metadata:JSON.parse(String(row.provider_metadata_json||'{}')),
        };
        // Recheck the selected account after entitlement check and before any
        // external dispatch. Token owner/metadata must still match approval.
        verifyStudioDispatch(db,job,secret);
        const payload:ProviderPublishPayload={caption:checked.package.caption,
          hashtags:[],mediaUrls:platform==='youtube'?[]:[mediaUrl]};
        if(platform==='youtube')payload.youtube={
          title:checked.package.caption.slice(0,95),videoUrl:mediaUrl,
          privacyStatus:'private',categoryId:'28',madeForKids:false,containsSyntheticMedia:false};
        dispatched=true; // Any subsequent exception is UNKNOWN, never retry.
        const receipt=await deps.dispatch(job,account,payload);
        if(!receipt.providerPostId||!receipt.publishedAt)throw Error('Provider receipt incomplete');
        return finaliseStudioDelivery(db,job,'PUBLISHED',{providerPostId:receipt.providerPostId});
      }catch{
        return finaliseStudioDelivery(db,job,dispatched?'UNKNOWN':'BLOCKED',{
          issue:dispatched?'Provider may have accepted the request. Manual reconciliation required':
            'Dispatch stopped before provider invocation; permission, media or destination changed'});
      }
    }finally{running=false;}
  }
  let interval:NodeJS.Timeout|null=null;
  return {tick,history,active,
    start:()=>{
      if(!active()||interval)return;
      // Do not perform I/O during app startup; the first poll is delayed.
      interval=setInterval(()=>{void tick().catch(()=>{});},30000);
      interval.unref?.();
    },
    stop:()=>{if(interval)clearInterval(interval);interval=null;}
  };
}
