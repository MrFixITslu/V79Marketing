import type Database from 'better-sqlite3';
import {listOwnMediaKeys,type MediaKeyActor} from './mediaProviderVault.js';
export type CreativeProviderStatus={
  provider:string;type:'image'|'video'|'text'|'mcp';credentialSaved:boolean;
  connectionVerified:boolean;generationImplemented:boolean;generationEnabled:boolean;
  availability:'local-ready'|'awaiting-key-or-consent'|'disabled-by-policy'|'not-implemented';
  description:string;
};
export function creativeCapabilities(db:Database.Database,actor:MediaKeyActor,env:NodeJS.ProcessEnv=process.env){
  const saved=new Set(listOwnMediaKeys(db,actor).map(k=>k.provider));
  const cloudEnabled=env.V79_PERSONAL_IMAGE_GENERATION_ENABLED==='1'&&env.V79_MEDIA_CLOUD_SPEND_POLICY_ENABLED==='1';
  const status=(provider:string,type:CreativeProviderStatus['type'],implemented:boolean,
    enabled:boolean,description:string):CreativeProviderStatus=>({
      provider,type,credentialSaved:saved.has(provider),
      // A stored credential does not verify provider reachability, permissions,
      // billing or model availability. No paid reachability test is automatic.
      connectionVerified:false,generationImplemented:implemented,generationEnabled:enabled,
      availability:!implemented?'not-implemented':enabled?'awaiting-key-or-consent':'disabled-by-policy',description,
    });
  const local:CreativeProviderStatus[]=[
    {provider:'local-svg-layout',type:'image',credentialSaved:false,connectionVerified:false,
      generationImplemented:true,generationEnabled:true,availability:'local-ready',
      description:'Basic local branded graphics. Not photorealistic AI image generation.'},
    {provider:'local-ffmpeg-composition',type:'video',credentialSaved:false,connectionVerified:false,
      generationImplemented:true,generationEnabled:true,availability:'local-ready',
      description:'Captioned MP4 composition; generated footage not claimed. Server FFmpeg required.'},
  ];
  return {providers:[...local,
    status('gemini','image',true,cloudEnabled,'Personal Gemini image adapter; per-use consent required; live connection not verified.'),
    status('gemini','text',true,true,'Personal Gemini text fallback; only with explicit per-request opt-in.'),
    status('openai','image',false,false,'Credential storage only; image adapter not implemented.'),
    status('fal','image',false,false,'Credential storage only; image adapter not implemented.'),
    status('replicate','video',false,false,'Credential storage only; video adapter not implemented.'),
    status('runway','video',false,false,'Credential storage only; video adapter not implemented.'),
    status('mcp','mcp',false,false,'No remote tool execution; gateway review required.'),
  ]};
}
