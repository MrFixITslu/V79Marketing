import {describe,it,expect} from 'vitest';
import {execFileSync} from 'node:child_process';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {randomUUID} from 'node:crypto';
import {composeLocalMotionVideo,decodePersonalSourceImage} from '../src/lib/localMotionVideo.js';
import type {ProductionBrand} from '../src/lib/productionContract.js';

const brand:ProductionBrand={name:'Synthetic Business',tagline:'Practical workflows',audience:'Business teams',
  tone:'Clear',website:'https://example.invalid',cta:'Read the approved service guide',linkTracking:'plain',
  primaryColor:'#0b1f33',accentColor:'#0e8f88',logoPng:null,mailingAddress:null,
  facts:[{id:'fact-indexing',service:'Document indexing',
    statement:'Synthetic Business provides document indexing services.'}]};
function png(){
  return execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i',
    'color=c=0x597d82:s=320x480:d=1','-frames:v','1','-c:v','png','-f','image2pipe','pipe:1'],
    {maxBuffer:1000000});
}
describe('local motion-video renderer — actual playable MP4 contract',()=>{
  it('does not fetch URLs, accept SVG, or allow unsupported business facts',async()=>{
    expect(()=>decodePersonalSourceImage('https://attacker.invalid/image.png')).toThrow();
    expect(()=>decodePersonalSourceImage('data:image/svg+xml;base64,PHN2Zz4=')).toThrow();
    const imageData='data:image/png;base64,'+png().toString('base64');
    await expect(composeLocalMotionVideo({imageData,brand,factId:'unknown'})).rejects.toThrow(/Approved service/);
    await expect(composeLocalMotionVideo({imageData,brand:{...brand,website:'http://attacker.invalid'},factId:'fact-indexing'}))
      .rejects.toThrow(/HTTPS/);
  });
  it('renders real H.264 1080x1920 playable video with captions, fixed approved facts and no external provider',async()=>{
    const imageData='data:image/png;base64,'+png().toString('base64');
    const temp=await fs.mkdtemp(path.join(os.tmpdir(),'v79-video-sample-'));
    try{
      const result=await composeLocalMotionVideo({imageData,brand,factId:'fact-indexing'},
        {root:temp,maxDurationMs:180000});
      expect(result.source).toBe('local-motion-composition');
      expect(result.generatedFootage).toBe(false);
      expect(result.mediaGenerated).toBe(true);
      expect(result.subtitles).toContain(brand.facts[0].statement);
      expect(result.videoUrl).toMatch(/^data:video\/mp4;base64,/);
      const bytes=Buffer.from(result.videoUrl.split(',')[1],'base64');
      const target=path.join(temp,'test-'+randomUUID()+'.mp4');
      await fs.writeFile(target,bytes);
      const output=execFileSync('ffprobe',['-v','error','-select_streams','v:0',
        '-show_entries','stream=width,height,codec_name,duration','-of','json',target],{encoding:'utf8'});
      const stream=JSON.parse(output).streams?.[0];
      expect(stream.codec_name).toBe('h264');
      expect(stream.width).toBe(1080);
      expect(stream.height).toBe(1920);
      expect(Number(stream.duration)).toBeGreaterThan(8);
    }finally{await fs.rm(temp,{recursive:true,force:true});}
  },190000);
});
