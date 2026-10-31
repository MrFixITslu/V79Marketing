import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import jwt from 'jsonwebtoken';
import Database from 'better-sqlite3';
import {chromium} from 'playwright';

// Isolated GitHub runner ONLY. No live Marketing credentials or production URLs.
// End-to-end browser steps use the real Express API and SQLite-backed sessions.
const base=process.env.STUDIO_BROWSER_URL||'http://127.0.0.1:3070';
const database=process.env.DATABASE_PATH;
const secret=process.env.JWT_SECRET;
if(!database||!secret||process.env.V79_MARKETING_SEED_DEMO!=='1')
  throw Error('Isolated browser prerequisites missing');
const artifacts=path.resolve('artifacts/studio-browser-acceptance');
await fs.mkdir(artifacts,{recursive:true});
const db=new Database(database);
try{
  const ts=new Date().toISOString();
  db.prepare(`INSERT OR IGNORE INTO businesses
    (id,name,slug,industry,description,created_at)
    VALUES (?,?,?,?,?,?)`).run('studio-test-biz-1','Test Firm One','studio-test-firm-one','Consulting',
      'Synthetic example business',ts);
  db.prepare(`INSERT OR IGNORE INTO businesses
    (id,name,slug,industry,description,created_at)
    VALUES (?,?,?,?,?,?)`).run('studio-test-biz-2','Test Firm Two','studio-test-firm-two','Consulting',
      'Synthetic second business',ts);
  const users=[
    ['studio-browser-owner','studio-test-biz-1','BUSINESS_OWNER'],
    ['studio-browser-creator','studio-test-biz-1','CONTENT_CREATOR'],
    ['studio-browser-external','studio-test-biz-2','BUSINESS_OWNER'],
  ];
  for(const [id,businessId,role] of users)
    db.prepare(`INSERT OR IGNORE INTO users
      (id,email,password_hash,name,role,business_id,created_at)
      VALUES (?,?,?,?,?,?,?)`)
      .run(id,id+'@example.invalid','DISABLED','Synthetic Test User',role,businessId,ts);
}finally{db.close();}
function token(userId,businessId,role){
  return jwt.sign({id:userId,email:userId+'@example.invalid',name:'Synthetic Test User',
    role,businessId},secret,{issuer:'v79-marketing',audience:'v79-marketing',expiresIn:'30m'});
}
const browser=await chromium.launch({headless:true});
const results=[];
async function context(name,businessId,role,mobile=false){
  const c=await browser.newContext({
    viewport:mobile?{width:390,height:844}:{width:1440,height:900},
    deviceScaleFactor:1,isMobile:mobile,hasTouch:mobile,
    reducedMotion:'reduce',locale:'en-GB'
  });
  await c.addCookies([{name:'v79_marketing_session',value:token(name,businessId,role),
    url:base,httpOnly:true,sameSite:'Lax'}]);
  return c;
}
const call=async(page,method,url,body)=>{
  return page.evaluate(async ({method,url,body})=>{
    const options={method,credentials:'same-origin',headers:{}};
    if(body!==undefined){
      options.headers['content-type']='application/json';
      options.body=JSON.stringify(body);
    }
    const r=await fetch(url,options);
    return {status:r.status,data:await r.json().catch(()=>({}))};
  },{method,url,body});
};
const owner=await context('studio-browser-owner','studio-test-biz-1','BUSINESS_OWNER');
const creator=await context('studio-browser-creator','studio-test-biz-1','CONTENT_CREATOR');
const outsider=await context('studio-browser-external','studio-test-biz-2','BUSINESS_OWNER');
try{
  const page=await owner.newPage();
  const pageFaults=[];
  page.on('pageerror',error=>pageFaults.push(error.message.slice(0,350)));
  const pageResponse=await page.goto(base+'/?view=studio',{waitUntil:'domcontentloaded',timeout:30000});
  try{
    await page.getByRole('heading',{name:/Create a campaign worth sharing/i}).waitFor({timeout:15000});
  }catch(error){
    await page.screenshot({path:path.join(artifacts,'00-studio-browser-diagnostic.png'),fullPage:true});
    const visible=await page.locator('body').innerText().catch(()=>'(body unavailable)');
    const auth=await page.evaluate(async()=>{
      try{const r=await fetch('/api/auth/me');return {status:r.status};}
      catch{return {status:'unavailable'};}
    });
    console.error('STUDIO_BROWSER_DIAGNOSTIC='+JSON.stringify({
      httpStatus:pageResponse?.status(),pageUrl:new URL(page.url()).pathname,
      visibleText:visible.slice(0,1000),pageErrors:pageFaults.slice(0,5),auth,
    }));
    throw error;
  }
  await page.screenshot({path:path.join(artifacts,'01-studio-desktop.png'),fullPage:true});
  const dimension=await page.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,
    clientWidth:document.documentElement.clientWidth}));
  results.push({check:'desktop Studio',pass:dimension.scrollWidth<=dimension.clientWidth,dimension});

  await page.goto(base+'/?view=my-marketing-skill',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Your campaigns, your creative rules/i}).waitFor();
  await page.screenshot({path:path.join(artifacts,'02-personal-skill-desktop.png'),fullPage:true});
  const ownerSkill=await call(page,'GET','/api/my-marketing-skill');
  assert.equal(ownerSkill.status,200);
  assert(ownerSkill.data.current?.content);
  const changed={...ownerSkill.data.current.content,
    audienceMarkets:'Synthetic Caribbean legal and accounting firms'};
  const saved=await call(page,'PUT','/api/my-marketing-skill/draft',
    {expectedVersion:ownerSkill.data.current.version,expectedDraftRevision:ownerSkill.data.draft?.revision||0,
      content:changed});
  assert.equal(saved.status,200);
  const pCreator=await creator.newPage();
  await pCreator.goto(base+'/?view=my-marketing-skill',{waitUntil:'domcontentloaded'});
  await pCreator.getByRole('heading',{name:/Your campaigns, your creative rules/i}).waitFor();
  const creatorSkill=await call(pCreator,'GET','/api/my-marketing-skill');
  assert.equal(creatorSkill.status,200);
  assert.notEqual(creatorSkill.data.draft?.content?.audienceMarkets,changed.audienceMarkets);
  const pExternal=await outsider.newPage();
  await pExternal.goto(base+'/?view=my-marketing-skill',{waitUntil:'domcontentloaded'});
  await pExternal.getByRole('heading',{name:/Your campaigns, your creative rules/i}).waitFor();
  const otherSkill=await call(pExternal,'GET','/api/my-marketing-skill');
  assert.equal(otherSkill.status,200);
  assert.notEqual(otherSkill.data.draft?.content?.audienceMarkets,changed.audienceMarkets);
  results.push({check:'real API same-business and cross-business private draft isolation',pass:true});

  // Real end-to-end creator-owned media review through authenticated Express.
  const create=await call(pCreator,'POST','/api/campaigns',{
    name:'Synthetic Browser Review',objective:'Synthetic privacy and review test',
    startDate:'2026-11-01',endDate:'2026-11-30',status:'PLANNED',
    steps:[],aiPlanGenerated:false,
  });
  assert.equal(create.status,201);
  const campaign=create.data.campaign;
  assert(campaign?.id&&campaign?.skillPin?.skillDigest);
  const uploaded=await pCreator.evaluate(async(campaignId)=>{
    const canvas=document.createElement('canvas');
    canvas.width=200;canvas.height=200;
    const ctx=canvas.getContext('2d');
    ctx.fillStyle='#0e8f88';ctx.fillRect(0,0,200,200);
    const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/png'));
    const r=await fetch('/api/campaigns/'+encodeURIComponent(campaignId)+'/studio-asset?kind=image',{
      method:'POST',headers:{'content-type':'image/png'},body:blob
    });
    return {status:r.status,data:await r.json()};
  },campaign.id);
  assert.equal(uploaded.status,201);
  const asset=uploaded.data.asset;
  assert(asset?.id&&asset?.sha256);
  const pkg=await call(pCreator,'POST','/api/campaigns/'+campaign.id+'/studio-package',{
    expectedSkillDigest:campaign.skillPin.skillDigest,assetIds:[asset.id],
    caption:'Synthetic local browser test creative. No actual sale or claims.',
    channel:'facebook',connectedAccountId:null,scheduledAt:null,
  });
  assert.equal(pkg.status,201);
  const exact=pkg.data.package;
  const review=await call(pCreator,'POST','/api/campaigns/'+campaign.id+
    '/studio-package/'+exact.id+'/review',{exactDigest:exact.exactDigest});
  assert.equal(review.status,200);
  assert.equal(review.data.package.status,'CREATIVE_REVIEWED_PRIVATE');
  assert.equal(review.data.package.publicationAuthorized,false);
  const theft=await call(page,'GET','/api/campaigns/'+campaign.id+'/studio-package/'+exact.id);
  assert.notEqual(theft.status,200,'Another member must not read creator package');
  const cross=await call(pExternal,'GET','/api/campaigns/'+campaign.id+'/studio-package/'+exact.id);
  assert.notEqual(cross.status,200,'Another business must not read creator package');
  results.push({check:'real binary PNG upload, exact signed creative review and ID tampering denial',pass:true});

  await page.goto(base+'/?view=studio-approvals',{waitUntil:'domcontentloaded'});
  await page.getByRole('heading',{name:/Review before anything goes live/i}).waitFor();
  await page.getByText('Customer publishing is locked.',{exact:false}).waitFor();
  await page.screenshot({path:path.join(artifacts,'03-publishing-locked-desktop.png'),fullPage:true});
  results.push({check:'publishing UI visibly fail-closed',pass:true});

  const mobile=await context('studio-browser-owner','studio-test-biz-1','BUSINESS_OWNER',true);
  try{
    const mobilePage=await mobile.newPage();
    await mobilePage.goto(base+'/?view=studio',{waitUntil:'domcontentloaded'});
    await mobilePage.getByRole('heading',{name:/Create a campaign worth sharing/i}).waitFor();
    await mobilePage.screenshot({path:path.join(artifacts,'04-studio-mobile.png'),fullPage:true});
    const mobileDimension=await mobilePage.evaluate(()=>({scrollWidth:document.documentElement.scrollWidth,
      clientWidth:document.documentElement.clientWidth}));
    results.push({check:'mobile Studio responsive',pass:mobileDimension.scrollWidth<=mobileDimension.clientWidth,dimension:mobileDimension});
    await mobilePage.goto(base+'/?view=my-marketing-skill',{waitUntil:'domcontentloaded'});
    await mobilePage.getByRole('heading',{name:/Your campaigns, your creative rules/i}).waitFor();
    await mobilePage.screenshot({path:path.join(artifacts,'05-skill-mobile.png'),fullPage:true});
    results.push({check:'mobile skill editor visible',pass:true});
  }finally{await mobile.close();}
}finally{
  await owner.close();await creator.close();await outsider.close();await browser.close();
  await fs.writeFile(path.join(artifacts,'acceptance.json'),JSON.stringify(results,null,2)+'\n');
}
const failed=results.filter(x=>!x.pass);
console.log('ISOLATED_BROWSER_ACCEPTANCE='+(failed.length?'FAIL':'PASS')+' '+JSON.stringify(results));
if(failed.length)throw Error(failed.length+' browser acceptance checks failed');
