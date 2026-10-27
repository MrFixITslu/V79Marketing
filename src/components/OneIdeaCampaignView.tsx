import React, { useState } from 'react';
import { Business, Campaign, CampaignStep } from '../types';
import { CheckCircle2, Layers, RefreshCw, Sparkles } from 'lucide-react';
import { buildCampaignBrief } from '../lib/campaignBrief';

interface OneIdeaCampaignViewProps {
  business: Business;
  onCreateCampaign: (newCampaign: Campaign) => Promise<Campaign>;
}

type GeneratedCampaign = {
  name: string;
  objective: string;
  steps: CampaignStep[];
  source?: string;
};

export const OneIdeaCampaignView: React.FC<OneIdeaCampaignViewProps> = ({ business, onCreateCampaign }) => {
  const [ideaPrompt, setIdeaPrompt] = useState('');
  const [targetAudience, setTargetAudience] = useState(business.brandProfile?.targetAudience || '');
  const [desiredAction, setDesiredAction] = useState('');
  const [confirmedFacts, setConfirmedFacts] = useState('');
  const [isSaved, setIsSaved] = useState(false);

  const invalidatePreview = () => {
    setGeneratedCampaign(null);
    setIsSaved(false);
    setApprovedSuccess(false);
    setError('');
  };
  const [generatedCampaign, setGeneratedCampaign] = useState<GeneratedCampaign | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaPrompt.trim() || !targetAudience.trim() || !desiredAction.trim()) return;
    setIsGenerating(true);
    setGeneratedCampaign(null);
    setError('');
    try {
      const { name: campaignName, objective } = buildCampaignBrief({
        idea:ideaPrompt, audience:targetAudience, nextAction:desiredAction, confirmedFacts
      });
      const response = await fetch('/api/ai/generate-campaign-plan', {
        method: 'POST',
        headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ campaignName, objective, businessName:business.name, industry:business.industry }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !Array.isArray(body.steps)) throw new Error(body.error || 'Campaign generation failed.');
      if (Number(body.creditsCharged || 0) > 0) window.dispatchEvent(new Event('v79:credits-updated'));
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

  const handleSavePlan = async () => {
    if (!generatedCampaign || isSaving || isSaved) return;
    const now = new Date();
    setIsSaving(true);
    setError('');
    try {
      await onCreateCampaign({
        id:`campaign-${Date.now()}`,
        businessId:business.id,
        name:generatedCampaign.name,
        objective:generatedCampaign.objective,
        startDate:now.toISOString().slice(0,10),
        endDate:new Date(now.getTime()+30*86400000).toISOString().slice(0,10),
        status:'PLANNED',
        steps:generatedCampaign.steps,
        aiPlanGenerated:generatedCampaign.source === 'ollama' || generatedCampaign.source === 'gemini',
        createdAt:now.toISOString(),
      });
      setApprovedSuccess(true);
      setIsSaved(true);
    } catch (err) {
      setApprovedSuccess(false);
      setError(err instanceof Error ? err.message : 'Could not save the campaign.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1"><Sparkles className="w-4 h-4"/><span>One idea campaign builder</span></div>
          <h1 className="text-2xl font-black text-slate-900">One Idea → Campaign Plan</h1>
          <p className="text-sm text-slate-600 mt-1">Tell us what you offer, who it helps and what customers should do next. Review the proposed plan before using any copy.</p>
        </div>
        <button type="button" disabled={!generatedCampaign || isSaving || isSaved} onClick={() => void handleSavePlan()} className="px-6 py-3 bg-slate-950 disabled:opacity-40 text-white font-bold rounded-2xl text-sm flex items-center justify-center gap-2">
          {approvedSuccess ? <CheckCircle2 className="w-4 h-4"/> : <Layers className="w-4 h-4"/>}
          <span>{isSaving ? 'Saving…' : approvedSuccess ? 'Plan saved' : 'Save campaign plan'}</span>
        </button>
      </div>

      <form onSubmit={handleGenerate} className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="md:col-span-2">
            <label htmlFor="marketing-campaign-idea" className="text-sm font-bold text-slate-800 block mb-2">1. What are you promoting?</label>
            <input id="marketing-campaign-idea" required maxLength={240} value={ideaPrompt} onChange={e=>{setIdeaPrompt(e.target.value);invalidatePreview();}} placeholder="E.g. Introduce Tiquet to local service businesses" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          </div>
          <div>
            <label htmlFor="marketing-campaign-audience" className="text-sm font-bold text-slate-800 block mb-2">2. Who needs it?</label>
            <input id="marketing-campaign-audience" required maxLength={160} value={targetAudience} onChange={e=>{setTargetAudience(e.target.value);invalidatePreview();}} placeholder="E.g. Small businesses struggling with service follow-ups" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          </div>
          <div>
            <label htmlFor="marketing-campaign-action" className="text-sm font-bold text-slate-800 block mb-2">3. What should they do next?</label>
            <input id="marketing-campaign-action" required maxLength={100} value={desiredAction} onChange={e=>{setDesiredAction(e.target.value);invalidatePreview();}} placeholder="E.g. Request a demo, book a call or visit the website" className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
          </div>
        </div>
        <details className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <summary className="cursor-pointer text-sm font-bold text-slate-800">Add confirmed offer details (optional)</summary>
          <label htmlFor="marketing-campaign-facts" className="mt-3 mb-2 block text-xs text-slate-600">Include only prices, claims, offer terms or benefits your business can substantiate.</label>
          <textarea id="marketing-campaign-facts" maxLength={350} rows={2} value={confirmedFacts} onChange={e=>{setConfirmedFacts(e.target.value);invalidatePreview();}} placeholder="E.g. Free 14-day pilot — if this offer is approved and available" className="w-full bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"/>
        </details>
        <div className="flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
          <p className="text-xs text-slate-600">Creates a reviewable plan only. Nothing is published or scheduled here.</p>
          <button type="submit" disabled={isGenerating || !ideaPrompt.trim() || !targetAudience.trim() || !desiredAction.trim()} className="px-8 py-3 bg-gradient-to-r from-orange-500 to-amber-500 disabled:opacity-40 text-white font-bold text-sm rounded-2xl flex items-center justify-center gap-2">
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin"/> : <Sparkles className="w-4 h-4"/>}
            <span>{isGenerating ? 'Generating…' : 'Build campaign plan'}</span>
          </button>
        </div>
        {error && <p className="text-xs font-medium text-red-600">{error}</p>}
      </form>

      {generatedCampaign ? (
        <section className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div className="flex flex-col gap-1 border-b border-slate-100 pb-4">
            <h2 className="font-extrabold text-slate-900">{generatedCampaign.name}</h2>
            <p className="text-xs text-slate-500">{generatedCampaign.objective}</p>
            <p className="text-xs text-slate-500">Generation source: {generatedCampaign.source === 'template' ? 'Basic template (AI unavailable)' : generatedCampaign.source || 'V79 AI'}</p>
            <p className="text-xs text-amber-700 mt-2">Review all claims, details, channel suggestions and times. Saving this plan does not authorise publishing.</p>
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
