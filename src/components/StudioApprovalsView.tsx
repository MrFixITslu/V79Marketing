import React,{useCallback,useEffect,useState} from 'react';
import {CheckCircle2,ShieldCheck,LockKeyhole,RefreshCw,AlertTriangle} from 'lucide-react';

type Reviewed={packageId:string;campaignId:string;creatorUserId:string;exactDigest:string;
  caption:string;channel:string;scheduledAt:string;accountId:string;providerAccountId:string;
  assets:{id:string;sha256:string;mime:string;kind:string}[];reviewedAt:string};
type Receipt={id:string;status:string;packageId:string;scheduledAt:string};
export function StudioApprovalsView(){
  const [items,setItems]=useState<Reviewed[]>([]);
  const [receipts,setReceipts]=useState<Receipt[]>([]);
  const [ready,setReady]=useState(false);
  const [selected,setSelected]=useState<string|null>(null);
  const [confirmed,setConfirmed]=useState(false);
  const [loading,setLoading]=useState(true);
  const [sending,setSending]=useState(false);
  const [error,setError]=useState('');
  const [notice,setNotice]=useState('');
  const load=useCallback(async()=>{
    const r=await fetch('/api/studio/publishing/inbox',{credentials:'same-origin',cache:'no-store'});
    const d=await r.json().catch(()=>({}));
    if(!r.ok)throw Error('Approval inbox requires business-owner or marketing-manager access');
    setItems(d.packages||[]);setReady(d.publicationEnabled===true);
    const h=await fetch('/api/studio/publishing/history',{credentials:'same-origin',cache:'no-store'});
    if(h.ok){const x=await h.json();setReceipts(x.deliveries||[]);}
  },[]);
  useEffect(()=>{
    let alive=true;
    load().catch(e=>{if(alive)setError(e.message);})
      .finally(()=>{if(alive)setLoading(false);});
    return()=>{alive=false;};
  },[load]);
  const approve=async(item:Reviewed)=>{
    if(!ready||!confirmed||sending)return;
    setSending(true);setError('');setNotice('');
    try{
      const r=await fetch('/api/studio/publishing/approve',{method:'POST',credentials:'same-origin',
        headers:{'content-type':'application/json'},body:JSON.stringify({
          creatorUserId:item.creatorUserId,campaignId:item.campaignId,
          packageId:item.packageId,exactDigest:item.exactDigest,confirmExactPublication:true,
        })});
      const result=await r.json().catch(()=>({}));
      if(!r.ok||!result.delivery?.id)throw Error('Exact approval was not accepted. Check your current Hub permission and destination.');
      setNotice('Exact scheduling approval recorded. This does NOT prove a post was published.');
      setSelected(null);setConfirmed(false);await load();
    }catch(e){setError(e instanceof Error?e.message:'Approval unavailable');}
    finally{setSending(false);}
  };
  return <main className="mx-auto max-w-6xl space-y-6 pb-16 text-[#0b1f33]">
    <header className="rounded-3xl border border-slate-200 bg-white p-6 sm:p-8">
      <div className="text-sm font-bold text-[#0e8f88]">V79 / Publishing control</div>
      <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">Review before anything goes live.</h1>
      <p className="mt-3 max-w-3xl text-sm leading-6 text-slate-600">
        Business owners and authorised managers review the exact creator-produced image/video,
        caption, social account and proposed time. A creative review alone is never permission to post.
      </p>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-900">{error}</p>}
    {notice&&<p role="status" className="rounded-xl border border-teal-200 bg-teal-50 p-4 text-sm">{notice}</p>}
    {!ready&&<section role="status" className="flex gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm">
      <LockKeyhole size={20} className="shrink-0 text-amber-800"/>
      <span><strong>Customer publishing is locked.</strong> Exact review is available, but delivery approvals remain disabled
      until Hub entitlement, operational checks, browser acceptance and owner release authorisation are complete.</span>
    </section>}
    <section className="space-y-4" aria-label="Pending exact campaign approvals">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold">Waiting for publishing review</h2>
        <button type="button" onClick={()=>void load().catch(e=>setError(e.message))}
          className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 bg-white px-4 text-sm font-semibold">
          <RefreshCw size={16}/> Refresh
        </button>
      </div>
      {loading?<p className="rounded-xl bg-white p-6 text-sm" role="status">Loading signed review packages…</p>:
        items.length===0?<p className="rounded-xl border border-slate-200 bg-white p-6 text-sm text-slate-600">
          No fully reviewed, scheduled customer packages are waiting.
        </p>:items.map(item=><article key={item.packageId} className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
          <div className="grid gap-5 p-5 md:grid-cols-[minmax(0,1fr)_minmax(0,1.1fr)]">
            <div className="space-y-3">
              {item.assets.map(asset=><div key={asset.id} className="overflow-hidden rounded-xl bg-slate-100">
                {asset.mime.startsWith('image/')?
                  <img alt={'Actual creator-reviewed image, SHA-256 '+asset.sha256.slice(0,12)}
                    loading="lazy" className="max-h-[430px] w-full object-contain"
                    src={'/api/studio/publishing/inbox/'+item.packageId+'/asset/'+asset.id}/>:
                  <video controls playsInline preload="metadata" className="max-h-[440px] w-full"
                    aria-label="Actual creator-reviewed video"
                    src={'/api/studio/publishing/inbox/'+item.packageId+'/asset/'+asset.id}/>}
                <p className="px-3 py-2 font-mono text-xs text-slate-500">{asset.kind} · SHA-256 {asset.sha256.slice(0,20)}…</p>
              </div>)}
            </div>
            <div className="space-y-4">
              <p className="text-xs font-bold uppercase tracking-wide text-teal-700">{item.channel}</p>
              <h3 className="text-lg font-bold">Exact creator review</h3>
              <div><p className="text-xs font-semibold text-slate-600">Caption</p>
                <p className="mt-1 whitespace-pre-wrap rounded-xl bg-[#faf8f4] p-4 text-sm leading-6">{item.caption}</p></div>
              <dl className="grid gap-2 text-sm">
                <div><dt className="font-semibold">Destination account ID</dt><dd className="break-all text-slate-600">{item.accountId}</dd></div>
                <div><dt className="font-semibold">Platform account identity</dt><dd className="break-all text-slate-600">{item.providerAccountId}</dd></div>
                <div><dt className="font-semibold">Proposed time</dt><dd className="text-slate-600">{new Date(item.scheduledAt).toLocaleString()}</dd></div>
                <div><dt className="font-semibold">Review digest</dt><dd className="break-all font-mono text-xs text-slate-500">{item.exactDigest}</dd></div>
              </dl>
              <button type="button" onClick={()=>{setSelected(v=>v===item.packageId?null:item.packageId);setConfirmed(false);}}
                aria-expanded={selected===item.packageId}
                className="min-h-11 w-full rounded-xl border border-slate-300 px-4 text-sm font-bold">
                {selected===item.packageId?'Close approval details':'Review exact publishing consent'}
              </button>
              {selected===item.packageId&&<div className="space-y-3 rounded-xl bg-[#faf8f4] p-4">
                <p className="flex items-start gap-2 text-xs text-slate-600"><AlertTriangle size={18} className="shrink-0"/>
                  Confirm that the media, claims, destination and timing are all correct.
                  A changed file or account requires fresh approval.</p>
                <label className="flex gap-2 text-sm">
                  <input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>
                  <span>I authorise publication of this exact reviewed package to the specified account at the specified time.</span>
                </label>
                <button type="button" disabled={!ready||!confirmed||sending}
                  onClick={()=>void approve(item)}
                  className="flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-[#0e8f88] px-4 text-sm font-bold text-white disabled:opacity-40">
                  <ShieldCheck size={18}/> {sending?'Submitting exact approval…':'Approve this exact delivery'}
                </button>
              </div>}
            </div>
          </div>
        </article>)}
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5" aria-label="Publishing outcome history">
      <h2 className="flex items-center gap-2 text-lg font-bold"><CheckCircle2 size={20}/> Provider receipts and held deliveries</h2>
      {receipts.length===0?<p className="mt-2 text-sm text-slate-600">No approved deliveries yet.</p>:
        <div className="mt-3 space-y-2">{receipts.map(x=><div key={x.id} className="rounded-xl border border-slate-200 p-3 text-sm">
          <strong>{x.status}</strong> · {x.channel} · {new Date(x.scheduledAt).toLocaleString()}
          {x.status==='UNKNOWN'&&<p className="mt-1 text-amber-900">Possible provider success. Check the platform manually. Automatic retry is prohibited.</p>}
          {x.providerPostId&&<p className="mt-1 font-mono text-xs">Provider receipt: {x.providerPostId}</p>}
        </div>)}</div>}
    </section>
  </main>;
}
