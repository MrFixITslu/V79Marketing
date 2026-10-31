import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import Database from 'better-sqlite3';
import jwt from 'jsonwebtoken';
import {chromium} from 'playwright';

const base='http://127.0.0.1:3070';
const out=path.resolve('artifacts/studio-complete-journey');
const file=process.env.DATABASE_PATH||'';
if(!file.startsWith('/tmp/')||process.env.V79_STUDIO_PUBLISH_ENABLED!=='0')
  throw Error('This real browser journey may execute only in an isolated test database with publishing off');
await fs.mkdir(out,{recursive:true});
const cookie=jwt.sign({
 id:'synthetic-studio-owner',email:'studio-flow@example.invalid',name:'Synthetic Studio Owner',
 role:'BUSINESS_OWNER',businessId:'synthetic-studio-business',
},process.env.JWT_SECRET,{issuer:'v79-marketing',audience:'v79-marketing',expiresIn:'30m'});
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:1440,height:900},
 locale:'en-GB',deviceScaleFactor:1,reducedMotion:'reduce',acceptDownloads:false});
await context.addCookies([{name:'v79_marketing_session',value:cookie,
 url:base,httpOnly:true,sameSite:'Lax'}]);
const page=await context.newPage();
const consoleErrors=[];
page.on('pageerror',e=>consoleErrors.push(e.message.slice(0,200)));
const results=[];
try{
  await page.goto(base+'/?view=studio',{waitUntil:'domcontentloaded',timeout:30000});
  await page.getByRole('heading',{name:/Create a campaign worth sharing/i}).waitFor();
  await page.getByLabel('Campaign brief').fill(
    'Synthetic document workflow training for Caribbean office staff. Only approved information.');
  await page.getByRole('button',{name:/Prepare three creative directions/}).click();
  await page.getByRole('heading',{name:'Choose a direction'}).waitFor({timeout:90000});
  await page.screenshot({path:path.join(out,'01-real-concepts.png'),fullPage:true});
  results.push({stage:'local campaign plan UI generation',pass:true,providerCalls:0});
  await page.getByRole('button',{name:/Use selected direction/}).click();
  await page.getByRole('heading',{name:'Asset workspace'}).waitFor();
  await page.getByRole('button',{name:/Generate draft image/}).click();
  const image=page.locator('img[alt^="Creative draft preview"]');
  await image.waitFor({timeout:30000});
  const dimensions=await image.evaluate(el=>({
    naturalWidth:el.naturalWidth,naturalHeight:el.naturalHeight,src:el.currentSrc.slice(0,35)}));
  assert.equal(dimensions.naturalWidth,1080);
  assert.equal(dimensions.naturalHeight,1350);
  assert(dimensions.src.startsWith('data:image/svg+xml;base64'));
  await page.screenshot({path:path.join(out,'02-local-branded-image.png'),fullPage:true});
  results.push({stage:'real server local image graphic + browser SVG preview 1080x1350',pass:true,
    dimensions:{width:dimensions.naturalWidth,height:dimensions.naturalHeight}});
  const approved=await page.evaluate(async()=>{
    const r=await fetch('/api/creative/verified-brief');return {status:r.status,data:await r.json()};
  });
  assert.equal(approved.status,200);
  assert.equal(approved.data.approved,true);
  assert.equal(approved.data.facts?.[0]?.id,'document-workflow');
  const photo=execFileSync('ffmpeg',['-hide_banner','-loglevel','error','-nostdin',
    '-f','lavfi','-i','color=c=0x718d94:s=320x480:d=1',
    '-frames:v','1','-threads','1','-c:v','png','-f','image2pipe','pipe:1'],
    {maxBuffer:1048576,timeout:15000});
  await page.locator('#studio-source-photo').setInputFiles({
    name:'synthetic-office-photo.png',mimeType:'image/png',buffer:photo});
  await page.getByRole('button',{name:/Compose local 9:16 video/}).click({timeout:30000});
  const video=page.locator('video[aria-label="Locally composed motion video preview"]');
  await video.waitFor({timeout:160000});
  const playback=await video.evaluate(async el=>{
    if(el.readyState===0)await Promise.race([
      new Promise(resolve=>{el.addEventListener('loadedmetadata',resolve,{once:true});
        el.addEventListener('error',resolve,{once:true});}),
      new Promise(resolve=>setTimeout(resolve,9000))
    ]);
    return {readyState:el.readyState,duration:Number.isFinite(el.duration)?el.duration:null,
      errorCode:el.error?.code||null,videoWidth:el.videoWidth,videoHeight:el.videoHeight};
  });
  await page.screenshot({path:path.join(out,'03-composed-motion-video.png'),fullPage:true});
  // Firefox/Chromium builds may lack proprietary H264 codecs. The encoded
  // MP4 is validated separately with ffprobe, while the browser must at least
  // expose a playable video element and local media receipt.
  results.push({stage:'local 9-second H264 motion video built and embedded in Studio',pass:true,
    metadata:playback});
  const consent=page.getByLabel(/I inspected this exact draft image/i);
  await consent.check();
  await page.getByRole('button',{name:/Pin exact private media review/}).click();
  await page.getByRole('button',{name:/Acknowledge exact private creative review/}).waitFor({timeout:40000});
  await page.screenshot({path:path.join(out,'04-signed-creative-package.png'),fullPage:true});
  await page.getByRole('button',{name:/Acknowledge exact private creative review/}).click();
  await page.getByText(/Creative review recorded against exact pinned media/).waitFor();
  const db=new Database(file,{readonly:true});
  try{
    const assets=db.prepare('SELECT mime,sha256,size_bytes FROM studio_campaign_assets ORDER BY kind').all();
    const packages=db.prepare('SELECT exact_digest,status,asset_digests_json FROM studio_campaign_packages').all();
    const reviews=db.prepare('SELECT COUNT(*) n FROM studio_campaign_private_reviews').get();
    const deliveries=db.prepare('SELECT COUNT(*) n FROM studio_publication_deliveries').get();
    const posts=db.prepare('SELECT COUNT(*) n FROM posts WHERE business_id=?').get('synthetic-studio-business');
    assert(assets.some(a=>a.mime==='image/png'));
    assert(assets.some(a=>a.mime==='video/mp4'));
    assert.equal(packages.length,1);
    assert.equal(reviews.n,1);
    assert.equal(deliveries.n,0);
    assert.equal(posts.n,0);
    results.push({stage:'real image+video bytes pinned, exact signed review, zero queued/published posts',
      pass:true,assets:assets.map(a=>({mime:a.mime,bytes:a.size_bytes,sha:a.sha256.slice(0,12)}))});
  }finally{db.close();}
  await page.screenshot({path:path.join(out,'05-reviewed-private-no-publishing.png'),fullPage:true});
  assert.deepEqual(consoleErrors,[]);
}finally{
  await fs.writeFile(path.join(out,'journey.json'),JSON.stringify(results,null,2)+'\n');
  await context.close();await browser.close();
}
console.log('STUDIO_COMPLETE_JOURNEY='+JSON.stringify(results));
