import React,{useEffect,useState} from 'react';
import {Clapperboard,Image as ImageIcon,ShieldCheck,PlayCircle,ArrowRight,Check,AlertTriangle,
  RefreshCw,CalendarDays,SlidersHorizontal,FileText,ExternalLink} from 'lucide-react';
import type {Business,Campaign,CampaignStep} from '../types';

type Capability={provider:string;type:string;credentialSaved:boolean;connectionVerified:boolean;
  generationImplemented:boolean;generationEnabled:boolean;availability:string;description:string};
type DraftStep={dayNumber:number;channel:string;postTitle:string;caption:string;captionPrompt?:string;suggestedTime:string};
type ImageResult={imageUrl:string;source:string;imageSha256?:string;model?:string;provider?:string};
type Stage='draft'|'generating'|'needs_review'|'asset_reviewed'|'saved';
export function CampaignStudioView({business,onCreateCampaign}:{
  business:Business;onCreateCampaign:(campaign:Campaign)=>Promise<Campaign>;
}){
  const [brief,setBrief]=useState('');
  const [step,setStep]=useState(0);
  const [concepts,setConcepts]=useState<DraftStep[]>([]);
  const [selected,setSelected]=useState(0);
  const [asset,setAsset]=useState<ImageResult|null>(null);
  const [assetApproved,setAssetApproved]=useState(false);
  const [plan,setPlan]=useState<{name:string;objective:string;skillDigest:string;steps:DraftStep[]}|null>(null);
  const [generationMode,setGenerationMode]=useState<'local'|'gemini'>('local');
  const [format,setFormat]=useState<'4:5'|'1:1'|'9:16'>('4:5');
  const [capabilities,setCapabilities]=useState<Capability[]>([]);
  const [capError,setCapError]=useState('');
  const [cloudConsent,setCloudConsent]=useState(false);
  const [running,setRunning]=useState(false);
  const [error,setError]=useState('');
  const [status,setStatus]=useState<Stage>('draft');
  const [saved,setSaved]=useState<Campaign|null>(null);
  const [showInspector,setShowInspector]=useState(true);
  const [verifiedFacts,setVerifiedFacts]=useState<{id:string;service:string;statement:string}[]>([]);
  const [verifiedAvailable,setVerifiedAvailable]=useState(false);
  const [videoSource,setVideoSource]=useState('');
  const [selectedFact,setSelectedFact]=useState('');
  const [video,setVideo]=useState<{videoUrl:string;sha256:string;subtitles:string;notice:string}|null>(null);
  const [videoBusy,setVideoBusy]=useState(false);
  const [videoError,setVideoError]=useState('');

  useEffect(()=>{
    let active=true;
    fetch('/api/creative/capabilities',{credentials:'same-origin',cache:'no-store'})
      .then(r=>r.ok?r.json():Promise.reject(Error('Connections unavailable')))
      .then(v=>{if(active)setCapabilities(v.providers||[]);})
      .catch(()=>{if(active)setCapError('Provider availability could not be checked. Local composition remains the fallback.');});
    fetch('/api/creative/verified-brief',{credentials:'same-origin',cache:'no-store'})
      .then(r=>r.ok?r.json():Promise.reject(Error('Approved facts unavailable')))
      .then(v=>{if(active){setVerifiedAvailable(v.approved===true);
        setVerifiedFacts(Array.isArray(v.facts)?v.facts:[]);
        setSelectedFact(v.facts?.[0]?.id||'');}}).catch(()=>{});
    return()=>{active=false;};
  },[]);
  const imageProvider=capabilities.find(x=>x.provider==='gemini'&&x.type==='image');
  const planStep=concepts[selected];
  const generationAvailable=generationMode==='local'||!!(imageProvider?.generationEnabled&&imageProvider.credentialSaved);
  async function createBrief(){
    if(running||brief.trim().length<12)return;
    setRunning(true);setStatus('generating');setError('');
    try{
      const campaignName=brief.trim().slice(0,120);
      const objective='Draft a factual multi-platform campaign plan from this business brief: '+brief.trim();
      const r=await fetch('/api/ai/generate-campaign-plan',{method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({campaignName,objective,
          businessName:business.name,industry:business.industry,useOwnCloudKey:false})});
      const result=await r.json().catch(()=>({}));
      if(!r.ok||!Array.isArray(result.steps)||!result.skillDigest)throw Error('Could not prepare a pinned campaign plan');
      const steps=result.steps as DraftStep[];
      const draftDirections=steps.slice(0,3);
      if(!draftDirections.length)throw Error('No concepts were produced');
      setConcepts(draftDirections);setSelected(0);setPlan({name:campaignName,objective,skillDigest:result.skillDigest,steps});
      setStatus('needs_review');setStep(1);setAsset(null);setAssetApproved(false);
    }catch{setError('Could not build a plan. Verify your Marketing entitlement and local AI availability.');setStatus('draft');}
    finally{setRunning(false);}
  }
  async function createImage(){
    if(!planStep||running||!generationAvailable)return;
    setRunning(true);setStatus('generating');setError('');
    try{
      const text=String(planStep.caption||planStep.captionPrompt||brief).slice(0,500);
      const url=generationMode==='local'?'/api/ai/generate-image':'/api/creative/personal-image';
      if(generationMode==='gemini'&&!cloudConsent)throw Error('Explicit personal cloud consent required');
      const payload=generationMode==='local'?
        {prompt:brief.slice(0,200)+' — '+text.slice(0,180),dimension:format==='9:16'?'1080x1920':format==='4:5'?'1080x1350':'1080x1080',
          businessName:business.name,primaryColor:business.brandProfile?.primaryColor||'#0e8f88'}:
        {prompt:brief.slice(0,250)+' — '+text.slice(0,450),aspectRatio:format,
          useMyKey:true,acknowledgeCost:true,acknowledgeExternalProcessing:true};
      const response=await fetch(url,{method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||typeof result.imageUrl!=='string')throw Error(result.error||'Image unavailable');
      setAsset({imageUrl:result.imageUrl,source:result.source||'brand-template',
        imageSha256:result.imageSha256,model:result.model,provider:result.provider});
      setAssetApproved(false);setStatus('needs_review');setStep(2);
    }catch{setError('Generation unavailable or outcome uncertain. Check your own provider account before requesting another paid image.');
      setStatus('needs_review');}
    finally{setRunning(false);}
  }
  async function saveDraft(){
    if(!plan||!asset||!assetApproved||running)return;
    setRunning(true);setError('');
    try{
      const now=new Date();
      const steps:CampaignStep[]=plan.steps.map(x=>({
        dayNumber:x.dayNumber,channel:x.channel as CampaignStep['channel'],
        postTitle:x.postTitle,captionPrompt:x.captionPrompt||x.caption||'',suggestedTime:x.suggestedTime,completed:false}));
      const result=await onCreateCampaign({
        id:'',businessId:business.id,name:plan.name,objective:plan.objective,
        startDate:now.toISOString().slice(0,10),
        endDate:new Date(now.getTime()+30*86400000).toISOString().slice(0,10),
        status:'PLANNED',steps,aiPlanGenerated:true,createdAt:now.toISOString(),skillDigest:plan.skillDigest,
      });
      setSaved(result);setStatus('saved');setStep(3);
    }catch{setError('Campaign save rejected. Your personal skill may have changed; regenerate the plan before saving.');}
    finally{setRunning(false);}
  }
  async function selectVideoSource(file:File|null){
    setVideo(null);setVideoSource('');setVideoError('');
    if(!file)return;
    if(file.size>1000000||!['image/png','image/jpeg'].includes(file.type)){
      setVideoError('Choose a personal PNG or JPEG image smaller than 1MB.');return;
    }
    const reader=new FileReader();
    reader.onload=()=>{if(typeof reader.result==='string')setVideoSource(reader.result);};
    reader.onerror=()=>setVideoError('Cannot read this local image.');
    reader.readAsDataURL(file);
  }
  async function composeVideo(){
    const image=videoSource||(asset?.imageUrl?.startsWith('data:image/png')||
      asset?.imageUrl?.startsWith('data:image/jpeg')?asset.imageUrl:'');
    if(!image||!selectedFact||videoBusy||!verifiedAvailable)return;
    setVideoBusy(true);setVideoError('');setVideo(null);
    try{
      const response=await fetch('/api/creative/local-video',{method:'POST',
        credentials:'same-origin',headers:{'content-type':'application/json'},
        body:JSON.stringify({sourceImageData:image,factId:selectedFact})});
      const result=await response.json().catch(()=>({}));
      if(!response.ok||typeof result.videoUrl!=='string'||result.source!=='local-motion-composition')
        throw Error('Local composition unavailable');
      setVideo(result);
    }catch{setVideoError('The local video could not be rendered. Verify the approved business facts, photo format and FFmpeg availability.');}
    finally{setVideoBusy(false);}
  }
  const stages=['Campaign brief','Creative concepts','Asset workspace','Review & save'];
  return <div className="mx-auto max-w-7xl space-y-6 pb-16 text-[#0b1f33]">
    <header className="rounded-3xl border border-slate-200 bg-[#faf8f4] px-5 py-6 sm:px-8">
      <div className="text-sm font-bold text-[#0e8f88]">V79 / Creative Studio</div>
      <h1 className="mt-1 text-3xl font-bold tracking-tight">Create a campaign worth sharing.</h1>
      <p className="mt-2 max-w-2xl text-sm leading-6 text-slate-600">
        Begin with your brief, choose a direction, generate an asset, then prepare the exact package for publishing review.
        Your personal marketing skill is included in the plan snapshot.
      </p>
      <ol className="mt-6 grid grid-cols-2 gap-2 md:grid-cols-4" aria-label="Campaign creation stages">
        {stages.map((title,i)=><li key={title} className={'rounded-xl border p-3 text-sm '+(i===step?
          'border-[#0e8f88] bg-teal-50 font-bold':'border-slate-200 bg-white text-slate-600')}>
          <span className="mr-2 text-xs font-bold">{i+1}.</span>{title}
        </li>)}
      </ol>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {capError&&<p role="status" className="rounded-xl bg-amber-50 p-3 text-sm text-amber-900">{capError}</p>}
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(280px,.72fr)]">
      <div className="space-y-5">
        {step===0&&<section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="flex items-center gap-2 text-lg font-bold"><FileText size={20}/> What are we promoting?</h2>
          <label htmlFor="studio-brief" className="mt-4 block text-sm font-semibold">Campaign brief</label>
          <textarea id="studio-brief" rows={5} minLength={12} maxLength={1200} value={brief}
            onChange={e=>setBrief(e.target.value)}
            placeholder="Describe the business problem, audience and approved offer. Include only facts you can verify."
            className="mt-2 w-full rounded-xl border border-slate-300 bg-white p-4 text-base leading-7 focus:outline-none focus:ring-2 focus:ring-teal-600"/>
          <p className="mt-2 text-xs text-slate-600">The local planner is used first. This creates private concepts, not scheduled posts.</p>
          <button type="button" onClick={()=>void createBrief()} disabled={running||brief.trim().length<12}
            className="mt-5 flex min-h-12 items-center gap-2 rounded-xl bg-[#0e8f88] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
            {running?<RefreshCw className="animate-spin" size={17}/>:<ArrowRight size={17}/>} Prepare three creative directions
          </button>
        </section>}
        {step===1&&<section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <h2 className="text-lg font-bold">Choose a direction</h2>
          <p className="mt-1 text-sm text-slate-600">These are draft post ideas from your personal-skill plan, not three finished ads.</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            {concepts.map((item,i)=><button type="button" key={i} onClick={()=>{setSelected(i);setAsset(null);setAssetApproved(false);}}
              aria-pressed={selected===i}
              className={'min-h-44 rounded-2xl border p-4 text-left focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700 '+
              (selected===i?'border-[#0e8f88] bg-teal-50':'border-slate-200 bg-[#faf8f4]')}>
              <span className="text-xs font-bold text-teal-800">Direction {i+1} · {item.channel}</span>
              <h3 className="mt-3 text-base font-bold">{item.postTitle}</h3>
              <p className="mt-2 line-clamp-3 text-xs leading-5 text-slate-600">{item.caption||item.captionPrompt}</p>
            </button>)}
          </div>
          <button type="button" onClick={()=>setStep(2)}
            className="mt-5 min-h-12 rounded-xl bg-[#0e8f88] px-5 py-3 text-sm font-bold text-white">Use selected direction</button>
        </section>}
        {step>=2&&<section className="rounded-2xl border border-slate-200 bg-white p-5 sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><h2 className="text-lg font-bold">Asset workspace</h2>
              <p className="mt-1 text-sm text-slate-600">{planStep?.postTitle||'Your private campaign'}</p></div>
            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold">{status.replaceAll('_',' ')}</span>
          </div>
          <div className={'mt-5 flex min-h-[300px] items-center justify-center overflow-hidden rounded-2xl bg-[#e9eeed] sm:min-h-[440px] '+
            (format==='9:16'?'mx-auto max-w-xs':'')}>
            {asset?<img alt="Creative draft preview; inspect claims and accuracy before use"
              src={asset.imageUrl} className="max-h-[560px] w-full object-contain"/>:
              <div className="p-8 text-center text-slate-600"><ImageIcon size={43} className="mx-auto mb-3 text-slate-400"/>
                <p className="font-semibold">No image generated yet</p><p className="mt-2 text-sm">Choose a format and generate a private preview.</p>
              </div>}
          </div>
          {asset&&<a href={asset.imageUrl} download={'v79-campaign-draft.'+(asset.imageUrl.startsWith('data:image/svg')?'svg':asset.imageUrl.startsWith('data:image/jpeg')?'jpg':'png')}
            className="mt-3 inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold text-[#0b1f33]">
            Save this preview image to your device
          </a>}
          {asset&&<p className="mt-2 text-xs text-slate-600">Source: {asset.source==='brand-template'?'Basic local layout — not an AI photo':asset.source==='cloud-ai-image'?'External AI image — requires human review':asset.source}. Images remain drafts until reviewed.</p>}
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <label className="text-sm font-semibold" htmlFor="studio-format">Format</label>
            <select id="studio-format" value={format} onChange={e=>{setFormat(e.target.value as typeof format);setAsset(null);setAssetApproved(false);}}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
              <option value="4:5">Feed · 4:5</option><option value="1:1">Square · 1:1</option><option value="9:16">Story · 9:16</option>
            </select>
            <label htmlFor="studio-provider" className="text-sm font-semibold">Engine</label>
            <select id="studio-provider" value={generationMode} onChange={e=>{setGenerationMode(e.target.value as typeof generationMode);setAsset(null);setAssetApproved(false);setCloudConsent(false);}}
              className="min-h-11 rounded-xl border border-slate-300 bg-white px-3 text-sm">
              <option value="local">Local · basic composition</option><option value="gemini">My Gemini · AI image (optional)</option>
            </select>
          </div>
          {generationMode==='gemini'&&<div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm">
            <p className="font-semibold">{imageProvider?.credentialSaved?'Personal key saved':'Connect a personal Gemini key in Settings → Connections'}</p>
            <p className="mt-1 text-xs">Key saved is NOT connection verified. Your prompt will be sent to Google's service. Your own provider account may be charged; exact price is not verified.</p>
            <label className="mt-3 flex gap-2"><input type="checkbox" checked={cloudConsent} onChange={e=>setCloudConsent(e.target.checked)}/>
              <span>I consent to external processing and possible charges on my personal account for this one request.</span>
            </label>
          </div>}
          <button type="button" disabled={running||!generationAvailable||(generationMode==='gemini'&&!cloudConsent)}
            onClick={()=>void createImage()} className="mt-5 flex min-h-12 items-center gap-2 rounded-xl bg-[#0e8f88] px-5 py-3 text-sm font-bold text-white disabled:opacity-40">
            {running?<RefreshCw className="animate-spin" size={17}/>:<ImageIcon size={17}/>}
            {asset?'Regenerate this image':'Generate draft image'}
          </button>
          <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
            <h3 className="flex items-center gap-2 text-sm font-bold"><PlayCircle size={17}/> Local motion video · 9:16</h3>
            <p className="text-sm text-slate-600">Compose a real, captioned MP4 from your own photograph and an owner-approved business statement. Gentle motion is added locally—no AI footage or external video charges.</p>
            {!verifiedAvailable&&<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900">An owner-approved brand and service claim are required. No video can be produced from unverified offers.</p>}
            {verifiedAvailable&&<>
              <label htmlFor="studio-verified-fact" className="block text-sm font-semibold">Approved service statement</label>
              <select id="studio-verified-fact" value={selectedFact} onChange={e=>{setSelectedFact(e.target.value);setVideo(null);}}
                className="min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm">
                {verifiedFacts.map(x=><option key={x.id} value={x.id}>{x.service}</option>)}
              </select>
              <label htmlFor="studio-source-photo" className="block text-sm font-semibold">Your own photo (PNG/JPEG, up to 1MB)</label>
              <input id="studio-source-photo" type="file" accept="image/png,image/jpeg"
                onChange={e=>void selectVideoSource(e.target.files?.[0]||null)}
                className="w-full rounded-xl border border-slate-300 bg-white p-3 text-sm"/>
              <p className="text-xs text-slate-600">You can also use the generated image above if it is a PNG/JPEG under 1MB. SVG layout previews cannot be used as video source.</p>
              <button type="button" onClick={()=>void composeVideo()} disabled={videoBusy||(!videoSource&&!asset?.imageUrl?.match(/^data:image\/(png|jpeg);base64,/))}
                className="flex min-h-11 items-center gap-2 rounded-xl bg-[#0b1f33] px-4 py-2.5 text-sm font-bold text-white disabled:opacity-40">
                {videoBusy?<RefreshCw size={16} className="animate-spin"/>:<Clapperboard size={16}/>}
                Compose local 9:16 video
              </button>
            </>}
            {videoError&&<p role="alert" className="rounded-xl bg-red-50 p-3 text-xs text-red-800">{videoError}</p>}
            {video&&<div className="space-y-3">
              <video controls playsInline preload="metadata" src={video.videoUrl}
                aria-label="Locally composed motion video preview"
                className="mx-auto max-h-[540px] w-full max-w-xs rounded-xl bg-slate-900"/>
              <a download="v79-local-motion-draft.mp4" href={video.videoUrl}
                className="inline-flex min-h-11 items-center rounded-xl border border-slate-300 bg-white px-3 text-sm font-semibold">
                Save playable MP4 draft
              </a>
              <p className="text-xs text-slate-600">{video.notice}</p>
            </div>}
          </div>
        </section>}
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-bold"><SlidersHorizontal size={18}/> Inspector</h2>
          <button type="button" onClick={()=>setShowInspector(v=>!v)} className="mt-2 text-xs font-semibold text-teal-700 underline"
            aria-expanded={showInspector}>{showInspector?'Hide details':'Show details'}</button>
          {showInspector&&<div className="mt-4 space-y-3 text-sm">
            <div><p className="font-semibold">Caption draft</p>
              <p className="mt-1 whitespace-pre-wrap rounded-xl bg-[#faf8f4] p-3 text-slate-700">
                {planStep?.caption||planStep?.captionPrompt||'Prepare a brief first.'}</p></div>
            <div><p className="font-semibold">Suggested local scheduling</p>
              <p className="mt-1 text-slate-600">{planStep?.suggestedTime||'Not proposed'} · Not yet scheduled</p></div>
            <div className="text-xs text-slate-600"><p>Personal skill: {plan?.skillDigest?'Pinned in draft':'Awaiting generation'}</p>
              <p>Media: {asset?asset.source:'None'}</p>
              <p>Publishing approval: Not granted</p></div>
          </div>}
        </section>
        {step>=2&&<section className="rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="flex items-center gap-2 font-bold"><ShieldCheck size={18}/> Review your draft</h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">Check every claim, screenshot, contact route and platform restriction. This review does not authorise publication.</p>
          <p className="mt-2 rounded-xl bg-amber-50 p-3 text-xs text-amber-900">This is a private visual preview. Image-to-campaign media pinning and the final publishing approval workflow are still under development. Do not treat this as a publishable package.</p>
          <label className="mt-4 flex items-start gap-2 text-sm">
            <input type="checkbox" checked={assetApproved} disabled={!asset||running}
              onChange={e=>setAssetApproved(e.target.checked)} className="mt-1"/>
            I inspected this exact draft image and confirm it is suitable for the next approval stage.
          </label>
          <button type="button" disabled={running||!assetApproved||!asset||status==='saved'}
            onClick={()=>void saveDraft()} className="mt-4 flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0e8f88] px-4 py-3 text-sm font-bold text-white disabled:opacity-40">
            {running?<RefreshCw size={17} className="animate-spin"/>:<Check size={17}/>} Save private campaign draft
          </button>
          {saved&&<p role="status" className="mt-3 text-sm text-teal-800">Saved campaign plan {saved.name}. The preview image is NOT yet attached to the server-side campaign package; save it locally. Publishing still requires exact platform approval and a verified destination.</p>}
        </section>}
        <section className="rounded-2xl border border-slate-200 bg-[#faf8f4] p-5">
          <h2 className="text-sm font-bold">Connections and production truth</h2>
          {capabilities.filter(x=>['local-svg-layout','local-ffmpeg-composition','gemini'].includes(x.provider)&&x.type!=='text').map((x,i)=>
            <p key={i} className="mt-3 text-xs leading-5 text-slate-700">
              <strong>{x.provider}</strong>: {x.availability.replaceAll('-',' ')} · {x.description}
            </p>)}
          <p className="mt-4 flex items-start gap-2 text-xs text-slate-600"><AlertTriangle size={16} className="shrink-0"/> Prepared is not scheduled. Scheduled is not published. Provider responses require verification.</p>
        </section>
      </aside>
    </div>
  </div>;
}
