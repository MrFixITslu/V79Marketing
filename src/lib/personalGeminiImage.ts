import {createHash,randomUUID} from 'node:crypto';
import type Database from 'better-sqlite3';
import {GoogleGenAI} from '@google/genai';
import {z} from 'zod';
import {readOwnMediaCredential,type MediaKeyActor} from './mediaProviderVault.js';

// Production closed by default. The server operator must first verify actual
// billing and configure an approved policy. User per-request opt-in is separate.
export const cloudImageInput=z.object({
  prompt:z.string().trim().min(20).max(800),
  aspectRatio:z.enum(['1:1','4:5','9:16']).default('4:5'),
  useMyKey:z.literal(true),
  acknowledgeCost:z.literal(true),
  acknowledgeExternalProcessing:z.literal(true),
}).strict();
export type CloudImageInput=z.infer<typeof cloudImageInput>;
export function ensureCloudImageAttempts(db:Database.Database){
  db.exec(`CREATE TABLE IF NOT EXISTS personal_media_generation_attempts(
    id TEXT PRIMARY KEY,business_id TEXT NOT NULL,user_id TEXT NOT NULL,
    provider TEXT NOT NULL,credential_generation TEXT NOT NULL,model TEXT NOT NULL,
    prompt_sha256 TEXT NOT NULL,status TEXT NOT NULL CHECK(status IN
      ('DISPATCHING','SUCCEEDED','UNKNOWN','BLOCKED')),
    created_at TEXT NOT NULL,finished_at TEXT,
    FOREIGN KEY(business_id) REFERENCES businesses(id) ON DELETE CASCADE
  );
  CREATE INDEX IF NOT EXISTS idx_media_attempts_user_month
    ON personal_media_generation_attempts(business_id,user_id,created_at);`);
}
const model='gemini-2.5-flash-image';
export type ProviderImage={mimeType:'image/png'|'image/jpeg';bytes:Buffer};
export async function requestGeminiImage(db:Database.Database,actor:MediaKeyActor,input:CloudImageInput,
  options:{enabled:boolean;hubAuthorised:boolean;generate?:(
    apiKey:string,prompt:string,aspectRatio:'1:1'|'4:5'|'9:16')=>Promise<ProviderImage>}){
  const req=cloudImageInput.parse(input);
  if(!options.enabled||!options.hubAuthorised)throw Error('Cloud image generation disabled pending policy and live entitlement');
  ensureCloudImageAttempts(db);
  const credential=readOwnMediaCredential(db,actor,'gemini');
  if(!credential)throw Error('Connect your own Gemini key to request a cloud image');
  // Prompt is data. Never allow the prompt to set model, tools, URL or provider.
  const prompt='Create one original illustrative marketing background image. No text, logos, celebrities, copied product screenshots, or invented numerical claims. '+
    'The business will add its real branded layer after review. Topic: '+req.prompt;
  const id=randomUUID(),created=new Date().toISOString();
  db.transaction(()=>{
    const identity=db.prepare('SELECT 1 FROM users WHERE id=? AND business_id=?').get(actor.id,actor.businessId);
    if(!identity)throw Error('Personal media authorisation expired');
    const beginMonth=new Date();beginMonth.setUTCDate(1);beginMonth.setUTCHours(0,0,0,0);
    const start=beginMonth.toISOString();
    const attempts=db.prepare(`SELECT COUNT(*) n FROM personal_media_generation_attempts
      WHERE user_id=? AND business_id=? AND created_at>=?`).get(actor.id,actor.businessId,start) as {n:number};
    const global=db.prepare(`SELECT COUNT(*) n FROM personal_media_generation_attempts
      WHERE created_at>=?`).get(start) as {n:number};
    const active=db.prepare(`SELECT COUNT(*) n FROM personal_media_generation_attempts
      WHERE status='DISPATCHING' AND business_id=? AND user_id=?`).get(actor.businessId,actor.id) as {n:number};
    if(attempts.n>=5||global.n>=20||active.n>0)
      throw Error('Monthly or concurrent media-generation limit reached');
    db.prepare(`INSERT INTO personal_media_generation_attempts
      (id,business_id,user_id,provider,credential_generation,model,prompt_sha256,status,created_at)
      VALUES (?,?,?,?,?,?,?,'DISPATCHING',?)`).run(id,actor.businessId,actor.id,'gemini',
        credential.generationId,model,createHash('sha256').update(prompt).digest('hex'),created);
  }).immediate();
  try{
    // The default adapter uses the official SDK. Tests substitute an inert
    // generator; no paid calls are ever made by CI.
    const generator=options.generate||(async(key:string,requestPrompt:string,aspect:'1:1'|'4:5'|'9:16')=>{
      const client=new GoogleGenAI({apiKey:key});
      const response=await client.models.generateContent({
        model,contents:requestPrompt,config:{imageConfig:{aspectRatio:aspect}},
      });
      const part=response.candidates?.flatMap(x=>x.content?.parts||[]).find(x=>x.inlineData?.data);
      if(!part?.inlineData?.data||!part.inlineData.mimeType)throw Error('No image returned');
      const mimeType=part.inlineData.mimeType;
      if(mimeType!=='image/png'&&mimeType!=='image/jpeg')throw Error('Unsupported image');
      return {mimeType,bytes:Buffer.from(part.inlineData.data,'base64')} as ProviderImage;
    });
    const image=await generator(credential.value,prompt,req.aspectRatio);
    const bytes=image.bytes;
    const png=image.mimeType==='image/png'&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
    const jpeg=image.mimeType==='image/jpeg'&&bytes.subarray(0,3).toString('hex')==='ffd8ff';
    if(bytes.length<128||bytes.length>5*1024*1024||!png&&!jpeg)
      throw Error('Invalid generated media');
    db.prepare("UPDATE personal_media_generation_attempts SET status='SUCCEEDED',finished_at=? WHERE id=?")
      .run(new Date().toISOString(),id);
    return {jobId:id,model,provider:'gemini',source:'cloud-ai-image',format:req.aspectRatio,
      imageSha256:createHash('sha256').update(bytes).digest('hex'),
      imageUrl:'data:'+image.mimeType+';base64,'+bytes.toString('base64'),
      connectionVerified:true,actualProviderCostUsd:null,priceStatus:'Provider charges may apply; exact amount unverified'};
  }catch{
    // Unknown provider outcome could still incur charges. No auto-retry, no
    // blind duplicate, no raw provider error/URL/headers/keys in logs or API.
    db.prepare("UPDATE personal_media_generation_attempts SET status='UNKNOWN',finished_at=? WHERE id=?")
      .run(new Date().toISOString(),id);
    throw Error('Image outcome uncertain; check your provider account before another request');
  }
}
