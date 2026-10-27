import { test, expect } from '@playwright/test';

const business={
  id:'business-test',name:'Synthetic Demo Services',slug:'synthetic-demo',
  industry:'Business Services',description:'Synthetic test data, not real customer claims',
  location:'Saint Lucia',phone:'',email:'',website:'',whatsapp:'',
  logoUrl:'',coverImageUrl:'',plan:'HUB',openingHours:[],products:[],services:[],
  brandProfile:{primaryColor:'#f97316',secondaryColor:'#0f172a',accentColor:'#22c55e',
    brandVoice:'Professional',targetAudience:'Saint Lucia service businesses',keywords:[],tagline:''},
  createdAt:'2026-10-27T00:00:00.000Z'
};
const user={id:'owner-test',businessId:business.id,email:'test-owner@example.invalid',name:'Test Owner',
  role:'BUSINESS_OWNER',avatarUrl:'',emailVerified:true,twoFactorEnabled:true,createdAt:'2026-10-27T00:00:00.000Z'};
const campaign={
  id:'campaign-test-1',businessId:business.id,name:'Synthetic service follow-ups',
  objective:'Help service teams; request a demonstration',status:'PLANNED',startDate:'2026-10-27',endDate:'2026-11-27',
  aiPlanGenerated:true,createdAt:'2026-10-27T00:00:00.000Z',
  steps:[{dayNumber:1,channel:'linkedin',postTitle:'Service requests walkthrough',
    captionPrompt:'Explain better organisation of customer enquiries',suggestedTime:'10:00 AM',completed:false}]
};

async function syntheticApi(page) {
  const state={campaigns:[campaign],customers:[],posts:[],outcomes:[]};
  await page.route('**/api/**',async route=>{
    const req=route.request(),pathname=new URL(req.url()).pathname,method=req.method();
    let body={};
    try{body=req.postDataJSON()||{};}catch{}
    let response={},status=200;
    if(pathname==='/api/auth/me')response={user,business};
    else if(pathname==='/api/posts')response={posts:state.posts};
    else if(pathname==='/api/post-deliveries')response={deliveries:[]};
    else if(pathname==='/api/customers' && method==='GET')response={customers:state.customers};
    else if(pathname==='/api/customers' && method==='POST'){
      const c={...body,id:'customer-test-'+(state.customers.length+1),businessId:business.id,createdAt:new Date().toISOString(),
        attributionMethod:body.campaignId?'manual':undefined};
      state.customers.unshift(c);response={customer:c,success:true};
    }else if(pathname==='/api/campaigns' && method==='GET')response={campaigns:state.campaigns};
    else if(pathname==='/api/campaigns' && method==='POST'){
      const c={...body,id:'campaign-test-'+(state.campaigns.length+1),businessId:business.id,createdAt:new Date().toISOString()};
      state.campaigns.unshift(c);response={campaign:c};
    }else if(pathname==='/api/campaigns/outcomes'){
      response={success:true,method:'manual',outcomes:state.campaigns.map(c=>({
        campaignId:c.id,attributedEnquiries:state.customers.filter(x=>x.campaignId===c.id).length,
        customerStatuses:state.customers.filter(x=>x.campaignId===c.id&&['CUSTOMER','REPEAT_CUSTOMER'].includes(x.status)).length
      }))};
    }else if(pathname==='/api/ai/generate-campaign-plan'){
      response={success:true,source:'template',creditsCharged:0,steps:[{
        dayNumber:1,channel:'linkedin',postTitle:'Synthetic campaign post',
        caption:'Describe a verified product benefit and request a demonstration',
        suggestedTime:'10:00 AM'
      }]};
    }else if(pathname==='/api/ai/generate-text'){
      response={success:true,creditsCharged:0,data:Object.fromEntries(
        ['facebook','instagram','linkedin','tiktok','youtube','google_business','whatsapp'].map(p=>[p,{caption:'Synthetic demonstration content',hashtags:[]}]))};
    }else if(pathname==='/api/credits/balance'){
      response={balance:{businessId:business.id,monthlyAllowance:100,usedCredits:0,purchasedCredits:0,bonusCredits:0,resetDate:'2026-11-27'},costs:{}};
    }else if(pathname==='/api/social-accounts')response={socialAccounts:[]};
    else if(pathname==='/api/brain')response={brain:null};
    else if(pathname==='/api/assets')response={assets:[]};
    else if(pathname==='/api/competitors')response={competitors:[]};
    else if(pathname==='/api/social-providers')response={providers:[]};
    else if(pathname==='/api/auth/logout')response={success:true};
    else {status=404;response={error:'No synthetic response for '+pathname};}
    await route.fulfill({status,contentType:'application/json',body:JSON.stringify(response)});
  });
}

for(const device of [{name:'desktop',width:1440,height:900},{name:'mobile',width:390,height:844}]){
  test(device.name+' — campaign creation, resume, manual enquiry attribution and no auto-publish',async ({browser})=>{
    const context=await browser.newContext({viewport:{width:device.width,height:device.height}});
    const page=await context.newPage();
    try{
      await syntheticApi(page);
      await page.goto('http://127.0.0.1:4173/?view=one-idea-campaign');
      await expect(page.getByRole('heading',{name:/One Idea.*Campaign Plan/i})).toBeVisible({timeout:10000});
      await page.getByLabel('1. What are you promoting?').fill('Synthetic Tiquet campaign');
      await page.getByLabel('2. Who needs it?').fill('Small service businesses');
      await page.getByLabel('3. What should they do next?').fill('Request a demonstration');
      await page.getByRole('button',{name:'Build campaign plan'}).click();
      await expect(page.getByText('Basic template (AI unavailable)')).toBeVisible();
      await page.getByRole('button',{name:'Save campaign plan'}).click();
      await expect(page.getByText('Plan saved — not published')).toBeVisible();
      await page.getByRole('button',{name:'Continue to your plans'}).click();
      await expect(page.getByRole('heading',{name:'Your Campaign Plans'})).toBeVisible();
      await page.getByRole('button',{name:/Synthetic Tiquet campaign.*Saved plan/s}).click();
      await expect(page.getByText('Customer enquiry outcomes')).toBeVisible();
      await page.getByRole('button',{name:'Prepare content'}).first().click();
      await expect(page.getByRole('heading',{name:'Prepare Campaign Content'})).toBeVisible();
      await expect(page.getByText('No platform is automatically selected.')).toBeVisible();
      await page.screenshot({path:'test-results/marketing-'+device.name+'-campaign.png',fullPage:true});
      const hasOverflow=await page.evaluate(()=>document.documentElement.scrollWidth>window.innerWidth+2);
      expect(hasOverflow).toBe(false);
      await page.goto('http://127.0.0.1:4173/?view=customers');
      await expect(page.getByRole('heading',{name:/Customer Inquiries/})).toBeVisible();
      await page.getByRole('button',{name:'Add New Customer Inquiry'}).click();
      await page.getByPlaceholder('e.g. Marcus Thorne').fill('Synthetic Enquiry');
      await page.getByPlaceholder('e.g. +1 (758) 555-0199').fill('17585550199');
      await page.getByLabel('Related marketing campaign (optional)').selectOption('campaign-test-1');
      await page.getByRole('button',{name:'Save Inquiry'}).click();
      await expect(page.getByText('Manually attributed: Synthetic service follow-ups')).toBeVisible();
      await page.screenshot({path:'test-results/marketing-'+device.name+'-customers.png',fullPage:true});
    }finally{await context.close();}
  });
}
