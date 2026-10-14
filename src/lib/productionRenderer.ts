import fs from 'node:fs/promises';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { createHash } from 'node:crypto';
import type { ProductionBrand, Material, Asset } from './productionContract.js';

const execute=promisify(execFile);
export const ASSET_NAMES=['poster-square.png','poster-wide.png','short.mp4','subtitles.srt','newsletter.html','copy.json'] as const;
export const productionAssetRoot=()=>path.resolve(process.env.V79_PRODUCTION_ASSET_DIR || path.join(process.cwd(),'data','production-assets'));
export function assetPath(jobId:string,name:string,root=productionAssetRoot()) {
  if (!/^[a-f0-9-]{36}$/.test(jobId) || !(ASSET_NAMES as readonly string[]).includes(name)) throw Error('Invalid asset reference');
  return path.join(root,jobId,name);
}
export async function verifyAsset(jobId:string,asset:Asset,root=productionAssetRoot()) {
  const filename=assetPath(jobId,asset.name,root), stat=await fs.lstat(filename);
  if (!stat.isFile() || stat.isSymbolicLink() || stat.size!==asset.bytes || stat.size>16*1024*1024) throw Error('Asset metadata changed');
  const bytes=await fs.readFile(filename);
  if (createHash('sha256').update(bytes).digest('hex')!==asset.sha256) throw Error('Approved asset bytes changed');
  return bytes;
}
function wrap(text:string,cols:number):string {
  const words=text.replace(/[\r\n]/g,' ').split(/\s+/), lines:string[]=[];let line='';
  for(const word of words){if((line+' '+word).trim().length>cols&&line){lines.push(line);line=word;}else line=(line+' '+word).trim();}
  if(line)lines.push(line);return lines.join('\n');
}
function srtTime(seconds:number){const s=String(seconds%60).padStart(2,'0'),m=String(Math.floor(seconds/60)).padStart(2,'0');return `00:${m}:${s},000`;}
export async function renderProductionAssets(jobId:string,brand:ProductionBrand,materials:Material[],
  options:{root?:string;width?:number;height?:number}={}):Promise<Asset[]> {
  const root=options.root||productionAssetRoot(),dir=path.join(root,jobId);
  assetPath(jobId,'copy.json',root);
  await fs.mkdir(root,{recursive:true,mode:0o700});
  if((await fs.lstat(root)).isSymbolicLink())throw Error('Asset root must not be a symlink');
  // A failed generation never overwrites an existing package or approved asset.
  await fs.mkdir(dir,{mode:0o700});
  let font='';
  for(const f of ['/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf','/usr/share/fonts/dejavu/DejaVuSans.ttf']){
    try{await fs.access(f);font=f;break;}catch{}
  }
  if(!font)throw Error('Local rendering font unavailable');
  const first=materials[0];if(!first)throw Error('Material package empty');
  const fact=brand.facts.find(f=>f.id===first.factId);if(!fact)throw Error('Verified fact missing');
  const hook=first.caption.split('\n')[0];
  if(brand.logoPng){
    const logo=Buffer.from(brand.logoPng.split(',')[1],'base64');
    if(logo.length<24||logo.length>1024*1024||logo.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||
       logo.readUInt32BE(16)>2048||logo.readUInt32BE(20)>2048)throw Error('Brand logo PNG invalid or exceeds limits');
    await fs.writeFile(path.join(dir,'logo.png'),logo,{mode:0o600});
  }
  async function image(filename:string,text:string,width:number,height:number){
    const textname=filename+'.txt';await fs.writeFile(path.join(dir,textname),wrap(text,Math.floor(width/(width/22))),{mode:0o600});
    await fs.writeFile(path.join(dir,'brand.txt'),wrap(brand.name+'\n'+brand.tagline,32),{mode:0o600});
    const filter=`drawbox=x=0:y=0:w=iw:h=ih*0.035:color=${brand.accentColor.replace('#','0x')}:t=fill,`+
      `drawtext=fontfile=${font}:textfile=${textname}:expansion=none:fontcolor=white:fontsize=${Math.round(width/18)}:line_spacing=${Math.round(width/55)}:x=(w-tw)/2:y=(h-th)/2,`+
      `drawtext=fontfile=${font}:textfile=brand.txt:expansion=none:fontcolor=white:fontsize=${Math.round(width/35)}:x=(w-tw)/2:y=h*0.87`;
    const args=['-hide_banner','-loglevel','error','-nostdin','-f','lavfi','-i',
      `color=c=${brand.primaryColor.replace('#','0x')}:s=${width}x${height}:r=1`];
    if(brand.logoPng)args.push('-i','logo.png','-filter_complex',`[0:v]${filter}[base];[1:v]scale=${Math.round(width/5)}:-1[logo];[base][logo]overlay=(W-w)/2:H*0.08`);
    else args.push('-vf',filter);
    args.push('-frames:v','1','-threads','1','-y',filename);
    // No shell, URL input, model-supplied filters, dynamic executable or host paths.
    await execute('ffmpeg',args,{cwd:dir,timeout:45000,maxBuffer:8192});
    await fs.unlink(path.join(dir,textname));
  }
  const w=options.width||1080,h=options.height||1920;
  await image('poster-square.png',hook+'\n\n'+fact.service,w,w);
  await image('poster-wide.png',hook+'\n\n'+fact.service,options.width||1200,options.width?Math.round(w*0.523):628);
  const scenes=first.videoScenes.map((text,i)=>({text,seconds:i===1?14:8}));
  let seconds=0,srt='';
  for(let i=0;i<scenes.length;i++){
    await image(`scene-${i}.png`,scenes[i].text,w,h);
    srt+=`${i+1}\n${srtTime(seconds)} --> ${srtTime(seconds+scenes[i].seconds)}\n${scenes[i].text}\n\n`;seconds+=scenes[i].seconds;
  }
  await fs.writeFile(path.join(dir,'scene-list.txt'),scenes.map((s,i)=>`file 'scene-${i}.png'\nduration ${s.seconds}\n`).join('')+`file 'scene-${scenes.length-1}.png'\n`);
  await execute('ffmpeg',['-hide_banner','-loglevel','error','-nostdin','-f','concat','-safe','1','-i','scene-list.txt',
    '-vf','fps=12,format=yuv420p','-t',String(seconds),'-c:v','libx264','-preset','ultrafast','-crf','25',
    '-threads','1','-movflags','+faststart','-y','short.mp4'],{cwd:dir,timeout:180000,maxBuffer:8192});
  await fs.writeFile(path.join(dir,'subtitles.srt'),srt);
  await fs.writeFile(path.join(dir,'copy.json'),JSON.stringify(materials,null,2));
  const newsletter=materials.find(m=>m.channel==='newsletter');
  if(newsletter?.newsletterHtml)await fs.writeFile(path.join(dir,'newsletter.html'),newsletter.newsletterHtml);
  // Never publish working frames, text inputs, source configuration or secrets.
  for(const name of ['brand.txt','scene-list.txt',...scenes.map((_s,i)=>`scene-${i}.png`),...(brand.logoPng?['logo.png']:[])])await fs.unlink(path.join(dir,name));
  const assets:Asset[]=[];
  for(const name of ASSET_NAMES){
    let bytes:Buffer;try{bytes=await fs.readFile(path.join(dir,name));}catch{continue;}
    if(bytes.length>16*1024*1024)throw Error('Rendered asset exceeds limit');
    assets.push({name,bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),
      mime:name.endsWith('.png')?'image/png':name.endsWith('.mp4')?'video/mp4':name.endsWith('.html')?'text/html':name.endsWith('.json')?'application/json':'text/plain'});
  }
  return assets;
}
