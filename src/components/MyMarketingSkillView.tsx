import React,{useEffect,useMemo,useState} from 'react';
import {BookOpen,Save,RefreshCw,Eye,RotateCcw,History,ShieldCheck,Trash2,GitCompare,AlertTriangle,Check} from 'lucide-react';

const fields=[
  {id:'audienceMarkets',label:'Audience and markets',hint:'Who are you helping and where? Focus on audience preferences—not customer lists.',example:'Speak to small business owners in the Eastern Caribbean.'},
  {id:'voiceLanguage',label:'Brand voice and language',hint:'Tone, formality, languages and spelling.',example:'Friendly, confident, UK English, with practical examples.'},
  {id:'productClaimRules',label:'Products, services and approved claims',hint:'Describe how to use verified offers. Actual offers belong in your business profile.',example:'Explain benefits without promising savings or discounts unless verified.'},
  {id:'visualStyle',label:'Visual style and preferred formats',hint:'Photography, real screenshots, proportions and accessibility.',example:'Use realistic photography, 4:5 feed images and captioned vertical video.'},
  {id:'ctaWebsiteRules',label:'Calls to action and website rules',hint:'CTA style only; use your verified business website and contact details.',example:'One invitation to enquire, using the verified business contact route.'},
  {id:'cadenceCreative',label:'Content frequency and creative preferences',hint:'How often to draft and how varied concepts should be.',example:'Prepare three different concepts per week with short, helpful captions.'},
  {id:'advancedInstructions',label:'Advanced instructions',hint:'Optional creative guidance. Security, consent and publishing controls remain enforced.',example:'Prefer concrete examples over buzzwords.'},
] as const;
type Key=typeof fields[number]['id'];
type Content=Record<Key,string>;
type Version={version:number;template_version:string;kind:string;digest:string;created_at:string};
type Workspace={
  current:{version:number;templateVersion:string;content:Content;digest:string};
  master:{version:string;content:Content;digest:string};
  history:Version[];
  draft:{baseVersion:number;content:Content;updatedAt:string}|null;
  templateUpdateAvailable:boolean;
};
const order=fields.map(v=>v.id);
async function api(path:string,method='GET',data?:unknown){
  const result=await fetch('/api/my-marketing-skill'+path,{method,credentials:'same-origin',cache:'no-store',
    headers:{'content-type':'application/json'},body:data===undefined?undefined:JSON.stringify(data)});
  const json=await result.json().catch(()=>({}));
  if(!result.ok)throw Error(json.error||'Skill settings could not be updated.');
  return json;
}
export function MyMarketingSkillView(){
  const [workspace,setWorkspace]=useState<Workspace|null>(null);
  const [form,setForm]=useState<Content|null>(null);
  const [baseline,setBaseline]=useState('');
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const [preview,setPreview]=useState<any>(null);
  const [comparison,setComparison]=useState<any>(null);
  const [historyVersion,setHistoryVersion]=useState<number|null>(null);
  const [advanced,setAdvanced]=useState(false);
  const unsaved=useMemo(()=>!!form&&JSON.stringify(form)!==baseline,[form,baseline]);
  const refresh=async()=>{
    const data=await api('') as Workspace;
    const edited=data.draft?.baseVersion===data.current.version?data.draft.content:data.current.content;
    setWorkspace(data);setForm({...edited});setBaseline(JSON.stringify(edited));
  };
  useEffect(()=>{
    let alive=true;api('').then((data:Workspace)=>{if(!alive)return;
      const edited=data.draft?.baseVersion===data.current.version?data.draft.content:data.current.content;
      setWorkspace(data);setForm({...edited});setBaseline(JSON.stringify(edited));
    }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[]);
  async function run(task:()=>Promise<void>){
    if(busy)return;setBusy(true);setError('');setNotice('');
    try{await task();}catch(e){setError(e instanceof Error?e.message:'Operation unavailable');}
    finally{setBusy(false);}
  }
  async function draft(){
    if(!workspace||!form)return;
    const response=await api('/draft','PUT',{expectedVersion:workspace.current.version,content:form});
    setBaseline(JSON.stringify(form));setPreview(null);
    setNotice(response.conflicts?.length?'Draft saved. Protected-rule conflicts must be resolved before publishing.':'Private draft saved. This does not change any running campaign.');
    await refresh();
  }
  async function publish(){
    if(!workspace||!form)return;
    // Saving is always based on the exact displayed version; the server
    // checks this again inside its transaction.
    const p=await api('/draft','PUT',{expectedVersion:workspace.current.version,content:form});
    if(p.conflicts?.length){setError(p.conflicts.join(' '));return;}
    await api('/save','POST',{expectedVersion:workspace.current.version});
    await refresh();setPreview(null);setNotice('New personal version saved. Existing campaigns retain their pinned instructions.');
  }
  async function doPreview(){
    if(!form)return;
    setPreview(await api('/preview','POST',{content:form}));
  }
  async function compare(){
    setComparison(await api('/template-update'));
  }
  async function accept(){
    if(!workspace||!comparison||!window.confirm('Apply the proposed template changes? Your customised sections remain yours.'))return;
    await api('/accept-template','POST',{expectedVersion:workspace.current.version,proposalDigest:comparison.digest});
    await refresh();setComparison(null);setNotice('Template update accepted as a new personal version.');
  }
  async function restore(version:number){
    if(!workspace||!window.confirm('Restore personal version '+version+' as a new version? This will not alter existing campaigns.'))return;
    await api('/restore','POST',{expectedVersion:workspace.current.version,version});
    await refresh();setHistoryVersion(null);setPreview(null);setNotice('Earlier instructions restored as a new version.');
  }
  async function reset(){
    if(!workspace||!window.confirm('Reset only your skill to the current master template? Historical versions remain available.'))return;
    await api('/reset','POST',{expectedVersion:workspace.current.version});
    await refresh();setPreview(null);setNotice('Your skill has been reset. Other users are unaffected.');
  }
  async function remove(){
    if(!workspace||!window.confirm('Delete your personalised skill? Your history is retained for recovery; existing campaign pins do not change.'))return;
    await api('','DELETE',{expectedVersion:workspace.current.version});
    await refresh();setPreview(null);setNotice('Your personal customisation was deleted. You now use the generic master.');
  }
  return <main className="mx-auto max-w-6xl space-y-6 pb-16 text-[#0b1f33]">
    <header className="rounded-3xl bg-[#faf8f4] px-5 py-6 shadow-sm sm:px-8 sm:py-8">
      <div className="flex items-center gap-2 text-sm font-semibold text-[#0e8f88]"><BookOpen size={18}/> Settings / My marketing skill</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Your campaigns, your creative rules</h1>
      <p className="mt-2 max-w-3xl text-sm leading-6 text-slate-600">Fine-tune the audience, message and style you want your marketing assistant to follow. Your business profile holds your actual logo, services, offers and contact information.</p>
      <p className="mt-4 flex items-center gap-2 rounded-xl border border-teal-200 bg-white p-3 text-sm font-semibold text-[#0b1f33]"><ShieldCheck className="shrink-0 text-[#0e8f88]" size={18}/> Only affects your campaigns. It cannot change another user’s settings, access credentials or bypass publishing approval.</p>
    </header>
    {loading&&<p role="status" className="rounded-xl bg-white p-5 text-sm text-slate-700">Loading your personal skill…</p>}
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm text-teal-900">{notice}</p>}
    {form&&workspace&&<div className="grid gap-6 lg:grid-cols-[minmax(0,1.75fr)_minmax(280px,1fr)]">
      <div className="space-y-4">
        <section className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-white p-4 shadow-sm">
          <div><h2 className="font-semibold">Your personal instructions · v{workspace.current.version||'master'}</h2>
            <p className="text-xs text-slate-600">Based on master {workspace.current.templateVersion} {unsaved?'· Unsaved changes':'· All edits on screen saved to draft'}</p>
          </div>
          <span className={unsaved?'rounded-full bg-amber-50 px-3 py-1 text-xs text-amber-900':'rounded-full bg-teal-50 px-3 py-1 text-xs text-teal-800'}>{unsaved?'Unsaved changes':'No unsaved changes'}</span>
        </section>
        {fields.filter(f=>f.id!=='advancedInstructions').map(f=><section key={f.id} className="rounded-2xl bg-[#faf8f4] p-5 shadow-sm">
          <label className="block text-sm font-bold" htmlFor={'skill-'+f.id}>{f.label}</label>
          <p className="mt-1 text-xs text-slate-600">{f.hint}</p>
          <textarea id={'skill-'+f.id} value={form[f.id]} maxLength={1600} rows={3}
            onChange={e=>{setForm(current=>current?{...current,[f.id]:e.target.value}:current);setPreview(null);}}
            placeholder={f.example} className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm leading-6 text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e8f88]"/>
        </section>)}
        <section className="rounded-2xl bg-[#faf8f4] p-5 shadow-sm">
          <button type="button" aria-expanded={advanced} onClick={()=>setAdvanced(v=>!v)}
            className="w-full text-left text-sm font-bold text-[#0b1f33]">{advanced?'−':'+'} Advanced instructions (optional)</button>
          {advanced&&<><p className="mt-2 text-xs text-slate-600">Creative-only instructions. Never enter API keys, personal contact details or instructions to bypass approvals.</p>
            <textarea value={form.advancedInstructions} rows={6} maxLength={1600}
              onChange={e=>{setForm(current=>current?{...current,advancedInstructions:e.target.value}:current);setPreview(null);}}
              placeholder="Creative guidance only" className="mt-3 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#0e8f88]"/></>}
        </section>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={()=>void run(draft)} disabled={busy||!unsaved}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-[#0e8f88] bg-white px-4 py-2.5 text-sm font-semibold text-[#0b1f33] disabled:opacity-40"><Save size={16}/> Save draft</button>
          <button type="button" onClick={()=>void run(publish)} disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#0e8f88] px-5 py-2.5 text-sm font-bold text-white disabled:opacity-40"><Check size={16}/> Save new version</button>
          <button type="button" onClick={()=>void run(doPreview)} disabled={busy}
            className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold"><Eye size={16}/> Preview campaign style</button>
        </div>
      </div>
      <aside className="space-y-4">
        <section className="rounded-2xl bg-[#faf8f4] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold"><Eye size={18} className="text-[#0e8f88]"/> Creative preview</h2>
          {preview?<div className="mt-4 space-y-3">
            {preview.conflicts?.length>0&&<p className="rounded-xl bg-amber-50 p-3 text-xs text-amber-900"><AlertTriangle size={14} className="inline"/> {preview.conflicts.join(' ')}</p>}
            <div className="overflow-hidden rounded-2xl bg-[#0b1f33] p-6 text-white">
              <span className="text-xs font-semibold tracking-widest text-teal-200">ILLUSTRATIVE CAMPAIGN</span>
              <p className="mt-5 text-2xl font-bold leading-snug">{preview.headline}</p>
              <div className="mt-8 h-1 w-20 rounded bg-[#e8622f]"/>
              <p className="mt-3 text-xs text-slate-300">No client logo, results or claims invented</p>
            </div>
            <p className="text-sm leading-6 text-slate-700">{preview.sampleCaption}</p>
            <p className="text-xs text-slate-500">{preview.note}</p>
          </div>:<p className="mt-3 text-sm leading-6 text-slate-600">Preview a safe, sample campaign before saving. This preview does not generate or publish media.</p>}
        </section>
        <section className="rounded-2xl bg-[#faf8f4] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold"><GitCompare size={18} className="text-[#0e8f88]"/> Master template</h2>
          <p className="mt-2 text-xs text-slate-600">Current master: {workspace.master.version}. The master cannot be edited here.</p>
          {workspace.templateUpdateAvailable?
            <button type="button" disabled={busy} onClick={()=>void run(compare)} className="mt-3 rounded-xl border border-teal-600 px-3 py-2 text-sm font-semibold text-teal-800">Compare available update</button>:
            <p className="mt-3 text-sm text-teal-700">Your skill uses the current master version.</p>}
          {comparison?.available&&<div className="mt-3 space-y-2 border-t pt-3 text-xs">
            <p>From {comparison.from} → {comparison.to}. Your custom sections are preserved.</p>
            {order.filter(k=>comparison.current[k]!==comparison.proposed[k]).map(k=><div className="rounded-lg bg-white p-2" key={k}>
              <p className="font-bold">{fields.find(f=>f.id===k)?.label}</p>
              <p className="mt-1 text-slate-500">Before: {comparison.current[k]}</p>
              <p className="mt-1 text-teal-800">After: {comparison.proposed[k]}</p>
            </div>)}
            <button type="button" disabled={busy||unsaved} onClick={()=>void run(accept)}
              className="rounded-lg bg-[#0e8f88] px-3 py-2 font-semibold text-white disabled:opacity-40">Accept template update</button>
          </div>}
        </section>
        <section className="rounded-2xl bg-[#faf8f4] p-5 shadow-sm">
          <h2 className="flex items-center gap-2 font-bold"><History size={18} className="text-[#0e8f88]"/> Version history</h2>
          <p className="mt-1 text-xs text-slate-600">Restoring creates a new version. Existing jobs retain their pinned instructions.</p>
          <div className="mt-3 max-h-64 space-y-2 overflow-y-auto">
            {workspace.history.length===0&&<p className="text-xs text-slate-500">No saved versions yet.</p>}
            {workspace.history.map(v=><div key={v.version} className="rounded-xl border border-slate-200 bg-white p-3 text-xs">
              <div className="flex items-center justify-between gap-2">
                <span className="font-semibold">v{v.version} · {v.kind}</span>
                <button type="button" disabled={busy} onClick={()=>void run(async()=>{
                  const result=await api('/history/'+v.version);
                  setHistoryVersion(v.version);setPreview({headline:'Historical skill v'+v.version,
                    sampleCaption:Object.entries(result.content).map(([k,s])=>k+': '+s).join('\n\n'),
                    note:'Read-only historical snapshot. Restore separately; credentials and business data are never stored here.',conflicts:[]});
                })} className="text-teal-800 underline">Inspect</button>
              </div>
              <p className="text-slate-500">{new Date(v.created_at).toLocaleString()}</p>
              {historyVersion===v.version&&v.kind!=='deleted'&&<button type="button" disabled={busy} onClick={()=>void run(()=>restore(v.version))}
                className="mt-2 rounded-lg border px-2 py-1 font-semibold text-slate-800">Restore as new version</button>}
            </div>)}
          </div>
        </section>
        <section className="rounded-2xl bg-white p-5 shadow-sm">
          <h2 className="text-sm font-bold">Personal maintenance</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <button type="button" disabled={busy||unsaved} onClick={()=>void run(reset)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold disabled:opacity-40"><RotateCcw size={14}/> Reset mine</button>
            <button type="button" disabled={busy||unsaved} onClick={()=>void run(remove)}
              className="inline-flex items-center gap-2 rounded-xl border border-red-200 px-3 py-2 text-xs font-semibold text-red-700 disabled:opacity-40"><Trash2 size={14}/> Delete customisation</button>
          </div>
        </section>
      </aside>
    </div>}
  </main>;
}
