import React,{useEffect,useState} from 'react';
import {KeyRound,ShieldCheck,Trash2,LockKeyhole,RefreshCw} from 'lucide-react';

type Provider='gemini'|'openai'|'fal'|'replicate'|'runway'|'mcp';
type Stored={provider:Provider;configured:true;revision:number;updatedAt:string};
const providers:{id:Provider;label:string;note:string}[]=[
  {id:'gemini',label:'Google Gemini',note:'Personal key for explicitly requested cloud copy generation'},
  {id:'openai',label:'OpenAI',note:'Credential storage; model adapter not yet enabled'},
  {id:'fal',label:'fal.ai',note:'Credential storage; media adapter not yet enabled'},
  {id:'replicate',label:'Replicate',note:'Credential storage; media adapter not yet enabled'},
  {id:'runway',label:'Runway',note:'Credential storage; video adapter not yet enabled'},
  {id:'mcp',label:'MCP gateway',note:'Credential storage only; execution requires a vetted gateway'},
];
export function MediaProviderKeysPanel(){
  const [provider,setProvider]=useState<Provider>('gemini');
  const [value,setValue]=useState('');
  const [keys,setKeys]=useState<Stored[]>([]);
  const [ready,setReady]=useState(false);
  const [loading,setLoading]=useState(true);
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const [message,setMessage]=useState('');
  async function load(){
    const response=await fetch('/api/media-provider-keys',{credentials:'same-origin',cache:'no-store'});
    const body=await response.json().catch(()=>({}));
    if(!response.ok)throw Error('Could not read your media provider settings');
    setReady(body.vaultReady===true);
    setKeys(Array.isArray(body.keys)?body.keys:[]);
  }
  useEffect(()=>{
    let active=true;
    fetch('/api/media-provider-keys',{credentials:'same-origin',cache:'no-store'})
      .then(r=>r.ok?r.json():Promise.reject(Error('Could not read your media provider settings')))
      .then(body=>{if(active){setReady(body.vaultReady===true);setKeys(Array.isArray(body.keys)?body.keys:[]);}})
      .catch(()=>{if(active)setError('Provider settings are currently unavailable');})
      .finally(()=>{if(active)setLoading(false);});
    return()=>{active=false;};
  },[]);
  const selected=keys.find(k=>k.provider===provider);
  const save=async(e:React.FormEvent)=>{
    e.preventDefault();
    if(busy||!ready)return;
    setBusy(true);setError('');setMessage('');
    try{
      const r=await fetch('/api/media-provider-keys',{method:'PUT',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({provider,apiKey:value}),cache:'no-store'});
      if(!r.ok)throw Error(r.status===503?'Secure storage is not configured':'Could not securely save this key');
      setValue('');await load();setMessage('Your personal provider key was encrypted and saved.');
    }catch{setError('Key was not saved. Verify its format and secure storage configuration.');}
    finally{setValue('');setBusy(false);}
  };
  const remove=async()=>{
    if(busy||!selected||!window.confirm('Remove your personal '+provider+' API key? Future requests must use a different key or local generation.'))return;
    setBusy(true);setError('');setMessage('');
    try{
      const r=await fetch('/api/media-provider-keys/'+encodeURIComponent(provider),{
        method:'DELETE',credentials:'same-origin',cache:'no-store'});
      if(!r.ok)throw Error();
      setValue('');await load();setMessage('Your provider key was removed.');
    }catch{setError('The provider key could not be removed.');}
    finally{setBusy(false);}
  };
  return <section aria-label="Personal API keys" className="rounded-2xl border border-slate-700 bg-slate-900 p-5 space-y-4">
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex gap-3"><div className="rounded-xl bg-teal-500/10 p-2 text-teal-300"><LockKeyhole className="h-5 w-5"/></div>
        <div><h2 className="font-bold text-lg text-white">Your private AI provider keys</h2>
          <p className="text-sm text-slate-300">Every member uses their own credentials. Keys are encrypted on the server and are never shown after saving.</p>
        </div>
      </div>
      <span className="text-xs font-semibold text-slate-300 flex items-center gap-1"><ShieldCheck className="h-4 w-4"/> Personal access only</span>
    </div>
    {loading?<p className="text-sm text-slate-400">Checking encryption configuration…</p>:!ready?
      <p role="status" className="rounded-lg border border-amber-700 bg-amber-950 p-3 text-sm text-amber-100">
        Encrypted key storage is not enabled on this server. Contact the V79 administrator; no key can be saved until encryption is configured.
      </p>:null}
    <form onSubmit={save} className="flex flex-col gap-3">
      <label className="text-sm text-slate-200">AI provider
        <select value={provider} onChange={e=>{setProvider(e.target.value as Provider);setValue('');setMessage('');}}
          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5 text-white">
          {providers.map(p=><option key={p.id} value={p.id}>{p.label}</option>)}
        </select>
      </label>
      <p className="text-xs text-slate-400">{providers.find(p=>p.id===provider)?.note}</p>
      <p className="text-sm text-slate-300">{selected?'Configured · revision '+selected.revision:'Not connected'}</p>
      <label className="text-sm text-slate-200">Your API key {selected?'(replace existing)':''}
        <input type="password" autoComplete="new-password" spellCheck={false} value={value}
          onChange={e=>setValue(e.target.value)} placeholder="Paste your private provider API key"
          className="mt-1 block w-full rounded-lg border border-slate-600 bg-slate-950 p-2.5 text-white"
          minLength={12} maxLength={4096} disabled={!ready||busy}/>
      </label>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" disabled={!ready||busy||value.length<12}
          className="inline-flex items-center gap-2 rounded-lg bg-teal-400 px-4 py-2.5 font-semibold text-slate-950 disabled:opacity-40">
          {busy?<RefreshCw className="h-4 w-4 animate-spin"/>:<KeyRound className="h-4 w-4"/>}
          {selected?'Replace encrypted key':'Save encrypted key'}
        </button>
        {selected&&<button type="button" onClick={()=>void remove()} disabled={busy}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-600 px-4 py-2.5 font-semibold text-slate-100 disabled:opacity-40">
          <Trash2 className="h-4 w-4"/> Disconnect
        </button>}
      </div>
    </form>
    {error&&<p role="alert" className="text-sm text-rose-300">{error}</p>}
    {message&&<p role="status" className="text-sm text-teal-200">{message}</p>}
    <p className="text-xs text-slate-400">Local generation needs no API key. Cloud charges, if any, belong to your own provider account. Saving a key never authorises generation, spending, publishing or MCP tool execution.</p>
  </section>;
}
