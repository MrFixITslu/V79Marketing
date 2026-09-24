import React, { useState } from 'react';
import { Business, Campaign, CampaignStep } from '../types';
import { CheckCircle2, Layers, RefreshCw, Sparkles } from 'lucide-react';

interface OneIdeaCampaignViewProps {
  business: Business;
  onCreateCampaign: (newCampaign: Campaign) => void;
}

type GeneratedCampaign = {
  name: string;
  objective: string;
  steps: CampaignStep[];
  source?: string;
};

export const OneIdeaCampaignView: React.FC<OneIdeaCampaignViewProps> = ({ business, onCreateCampaign }) => {
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaPrompt.trim()) return;
    setIsGenerating(true);
    setError('');
    try {
      const campaignName = ideaPrompt.trim().slice(0, 120);
      const objective = `Create a focused multi-channel campaign for this business idea: ${ideaPrompt.trim()}`;
      const response = await fetch('/api/ai/generate-campaign-plan', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ campaignName, objective, businessName:business.name, industry:business.industry }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(body.steps)) throw new Error(body.error || 'Campaign generation failed.');
      const steps: CampaignStep[] = body.steps.map((step:any) => ({
        dayNumber:Number(step.dayNumber || 1),
        channel:step.channel || 'facebook',
        postTitle:step.postTitle || 'Campaign step',
        captionPrompt:step.captionPrompt || step.caption || '',
        suggestedTime:step.suggestedTime || '10:00 AM',
        completed:false,
      }));
      setGeneratedCampaign({name:campaignName,objective,steps,source:body.source});
    } catch (err:any) {
      setError(err?.message || 'Could not generate the campaign.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleApproveAll = () => {
    if (!generatedCampaign) return;
    const now = new Date();
    onCreateCampaign({
      id:`campaign-${Date.now()}`,
      businessId:business.id,
      name:generatedCampaign.name,
      objective:generatedCampaign.objective,
      startDate:now.toISOString().slice(0,10),
      endDate:new Date(now.getTime()+30*86400000).toISOString().slice(0,10),
      status:'ACTIVE',
      steps:generatedCampaign.steps,
      aiPlanGenerated:true,
      createdAt:now.toISOString(),
    });
    setApprovedSuccess(true);
    setTimeout(() => setApprovedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1"><Sparkles className="w-4 h-4"/><span>One idea campaign builder</span></div>
          <h1 className="text-2xl font-black text-slate-900">One Idea → Campaign Plan</h1>
          <p className="text-xs text-slate-500 mt-1">Turn your own offer, service, product or event idea into a structured campaign using the configured V79 AI provider.</p>
        </div>
        <button disabled={!generatedCampaign} onClick={handleApproveAll} className="px-6 py-3 bg-slate-950 disabled:opacity-40 text-white font-bold rounded-2xl text-xs flex items-center justify-center gap-2">
          {approvedSuccess ? <CheckCircle2 className="w-4 h-4"/> : <Layers className="w-4 h-4"/>}
          <span>{approvedSuccess ? 'Campaign saved' : 'Approve campaign'}</span>
        </button>
      </div>

      <form onSubmit={handleGenerate} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <label className="text-xs font-bold text-slate-800 block">What do you want to promote?</label>
        <div className="flex flex-col sm:flex-row gap-3">
          <input value={ideaPrompt} onChange={e=>setIdeaPrompt(e.target.value)} placeholder="Describe the offer, product, service or event and the result you want…" className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          <button type="submit" disabled={isGenerating || !ideaPrompt.trim()} className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 disabled:opacity-40 text-white font-bold text-xs rounded-2xl flex items-center justify-center gap-2">
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
            <span>{isGenerating ? 'Generating…' : 'Build campaign'}</span>
          </button>
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </form>

      {generatedCampaign ? (
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
            <h2 className="font-extrabold text-slate-900">{generatedCampaign.name}</h2>
            <p className="text-xs text-slate-500">{generatedCampaign.objective}</p>
            <p className="text-[10px] uppercase tracking-wider text-slate-400">Generation source: {generatedCampaign.source || 'V79 AI'}</p>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2">
            {generatedCampaign.steps.map((step,index)=>(
              <div key={index} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-[10px] font-bold uppercase text-orange-700">Day {step.dayNumber} · {String(step.channel).replace('_',' ')}</div>
                <div className="mt-2 text-sm font-bold text-slate-900">{step.postTitle}</div>
                <p className="mt-2 text-xs leading-5 text-slate-600">{step.captionPrompt}</p>
                <div className="mt-3 text-[10px] text-slate-400">Suggested time: {step.suggestedTime}</div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center text-sm text-slate-500">Your generated campaign will appear here. Nothing is pre-filled or presented as your business data.</div>
      )}
    </div>
  );
};
