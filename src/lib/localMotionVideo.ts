import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {createHash} from 'node:crypto';
import type {ProductionBrand} from './productionContract.js';
const execute=promisify(execFile);
const font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf';
export function decodePersonalSourceImage(image:string){
  const parsed=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(image);
  if(!parsed||image.length>1500000)throw Error('Use a PNG or JPEG image under 1MB');
  const bytes=Buffer.from(parsed[2],'base64');
  const png=parsed[1]==='png'&&bytes.subarray(0,8).toString('hex')==='89504e470d0a1a0a';
  const jpeg=parsed[1]==='jpeg'&&bytes.subarray(0,3).toString('hex')==='ffd8ff';
  if(bytes.length<100||bytes.length>1000000||!png&&!jpeg)throw Error('Invalid local image bytes');
  return {bytes,extension:png?'png':'jpg',sha256:createHash('sha256').update(bytes).digest('hex')};
}
function safeLine(value:string,max=110){
  return value.replace(/[\r\n\t]+/g,' ').replace(/[\u0000-\u001f\u007f]/g,'').slice(0,max).trim();
}
export async function composeLocalMotionVideo(input:{imageData:string;brand:ProductionBrand;factId:string},
 options:{root?:string;ffmpegPath?:string;maxDurationMs?:number}={}){
  // No URLs or external services. Only verified brand facts from a trusted
  // signed record may become a text overlay, never user-provided claims.
  const image=decodePersonalSourceImage(input.imageData);
  const fact=input.brand.facts.find(x=>x.id===input.factId);
  if(!fact)throw Error('Approved service fact required for local video');
  const label=safeLine(fact.service,70);
  const claim=safeLine(fact.statement,110);
  const website=new URL(input.brand.website);
  if(website.protocol!=='https:'||website.username||website.password)throw Error('Verified HTTPS business website required');
  const cta=safeLine(input.brand.cta,60);
  const temp=await fs.mkdtemp(path.join(options.root||os.tmpdir(),'v79-personal-video-'));
  try{
    await fs.chmod(temp,0o700);
    const source='source.'+image.extension;
    await fs.writeFile(path.join(temp,source),image.bytes,{mode:0o600});
    // Decode dimensions with ffprobe before allocating a 1080x1920 encoder.
    // Reject unsupported or oversized media rather than trusting extensions.
    const probe=await execute('ffprobe',['-v','error','-select_streams','v:0',
      '-show_entries','stream=width,height,codec_name','-of','json',source],
      {cwd:temp,timeout:10000,maxBuffer:4096});
    const stream=JSON.parse(probe.stdout).streams?.[0];
    if(!stream||!Number.isInteger(stream.width)||!Number.isInteger(stream.height)||
      stream.width<100||stream.height<100||stream.width>4096||stream.height>4096||
      !['png','mjpeg'].includes(stream.codec_name))
      throw Error('Invalid or oversized local source image');
    await fs.writeFile(path.join(temp,'hook.txt'),label+'\n'+claim,{mode:0o600});
    await fs.writeFile(path.join(temp,'end.txt'),cta+'\n'+website.hostname,{mode:0o600});
    await fs.access(font);
    const vf=[
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      "zoompan=z='min(zoom+0.00065\\,1.13)':d=1:s=1080x1920:fps=24",
      'drawbox=x=0:y=1250:w=iw:h=670:color=black@0.67:t=fill',
      `drawtext=fontfile=${font}:textfile=hook.txt:expansion=none:fontcolor=white:fontsize=42:line_spacing=18:x=70:y=1370`,
      `drawtext=fontfile=${font}:textfile=end.txt:expansion=none:fontcolor=white:fontsize=36:line_spacing=16:x=70:y=1730:enable='gte(t\\,6)'`,
    ].join(',');
    await execute(options.ffmpegPath||'ffmpeg',[
      '-hide_banner','-loglevel','error','-nostdin','-loop','1','-framerate','24','-i',source,
      '-vf',vf,'-t','9','-c:v','libx264','-pix_fmt','yuv420p','-preset','ultrafast','-crf','27',
      '-threads','1','-movflags','+faststart','-an','-y','preview.mp4',
    ],{cwd:temp,timeout:options.maxDurationMs||120000,maxBuffer:2048});
    const video=await fs.readFile(path.join(temp,'preview.mp4'));
    if(video.length<2048||video.length>7*1024*1024)throw Error('Local video size outside safe range');
    // Browser builds without H.264 decoding still need actual playback.
    // A deliberately small VP8 WebM is a local preview; the original MP4
    // remains the exact uploaded/exported release asset.
    await execute(options.ffmpegPath||'ffmpeg',[
      '-hide_banner','-loglevel','error','-nostdin','-i','preview.mp4',
      '-vf','scale=360:640:flags=bicubic,fps=12','-t','9',
      '-c:v','libvpx','-deadline','realtime','-cpu-used','7','-b:v','350k',
      '-threads','2','-an','-y','browser-preview.webm'
    ],{cwd:temp,timeout:90000,maxBuffer:2048});
    const webm=await fs.readFile(path.join(temp,'browser-preview.webm'));
    if(webm.length<1024||webm.length>2*1024*1024||
      webm.subarray(0,4).toString('hex')!=='1a45dfa3')
      throw Error('Browser video preview encoding unavailable');
    const sha256=createHash('sha256').update(video).digest('hex');
    const subtitles=`1\n00:00:00,000 --> 00:00:06,000\n${label}. ${claim}\n\n2\n00:00:06,000 --> 00:00:09,000\n${cta}. ${website.hostname}\n`;
    return {source:'local-motion-composition' as const,mediaGenerated:true,generatedFootage:false,
      mimeType:'video/mp4' as const,sourceImageSha256:image.sha256,sha256,bytes:video.length,
      videoUrl:'data:video/mp4;base64,'+video.toString('base64'),
      previewWebmUrl:'data:video/webm;base64,'+webm.toString('base64'),
      previewMimeType:'video/webm' as const,
      subtitles,notice:'Motion composition from user-provided media and owner-approved business facts. No AI-generated footage or provider publication.'};
  }finally{await fs.rm(temp,{recursive:true,force:true});}
}
