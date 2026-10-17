import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createMaterials } from '../src/lib/productionContract.js';
import { renderProductionAssets, verifyAsset } from '../src/lib/productionRenderer.js';

const root=await fs.mkdtemp(path.join(os.tmpdir(),'v79-renderer-smoke-'));
try{
  const brand={name:'Synthetic Business',tagline:'Practical next steps',audience:'Synthetic audience',tone:'Clear',
    website:'https://synthetic.example.invalid',cta:'Read the synthetic guide',primaryColor:'#081827',accentColor:'#00D5C9',
    logoPng:null,mailingAddress:'Synthetic address only',facts:[{id:'test',service:'Synthetic service',statement:'This is a synthetic renderer test.'}]};
  const plan={automaticDrafts:false,cadenceDays:7,channels:['youtube','newsletter'] as ('youtube'|'newsletter')[],publishDelayHours:24,
    newsletterSegmentId:null,newsletterFrom:null,newsletterConsentConfirmed:false,youtubePrivacy:'private' as const};
  const jobId=randomUUID(),materials=createMaterials(brand,plan,'test',{hook:'See one practical improvement',tip:'Check the next step with your team.'});
  const assets=await renderProductionAssets(jobId,brand,materials,{root,width:360,height:640});
  assert(assets.some(a=>a.name==='short.mp4'));assert(assets.some(a=>a.name==='newsletter.html'));
  for(const asset of assets){const bytes=await verifyAsset(jobId,asset,root);
    if(asset.name.endsWith('.png'))assert.equal(bytes.subarray(0,8).toString('hex'),'89504e470d0a1a0a');
    if(asset.name.endsWith('.mp4'))assert.equal(bytes.subarray(4,8).toString(),'ftyp');}
  console.log('REAL_LOCAL_PNG_MP4_SUBTITLE_NEWSLETTER_RENDER_PASS');
}finally{await fs.rm(root,{recursive:true,force:true});}
