import React, { useState } from 'react';
import { Business, Campaign, CampaignStep } from '../types';
import {
  Layers,
  Sparkles,
  Plus,
  CheckCircle2,
  Clock,
  Calendar,
  Share2,
  RefreshCw,
  Target
} from 'lucide-react';

interface CampaignBuilderProps {
  business: Business;
  campaigns: Campaign[];
  onCreateCampaign: (campaign: Campaign) => Promise<Campaign>;
  onRegeneratedCampaign?: (campaign:Campaign)=>void;
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  business,
  campaigns,
  onCreateCampaign,
  onRegeneratedCampaign,
}) => {
  const [campaignName, setCampaignName] = useState('');
  const [objective, setObjective] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [regenerating,setRegenerating]=useState(false);
  const [regenMessage,setRegenMessage]=useState('');

  const [activeCampaign, setActiveCampaign] = useState<Campaign>(campaigns[0]);

  const regenerate=async()=>{
    if(!activeCampaign?.skillPin||regenerating||!window.confirm(
      'Create a NEW campaign draft using your latest personal marketing skill? Existing approved or published content will remain unchanged.'))return;
    setRegenerating(true);setRegenMessage('');
    try{
      const r=await fetch('/api/my-marketing-skill',{credentials:'same-origin'});
      if(!r.ok)throw Error('Personal skill unavailable');
      const skill=await r.json();
      const response=await fetch('/api/campaigns/'+encodeURIComponent(activeCampaign.id)+'/regenerate',{
        method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},
        body:JSON.stringify({expectedSkillDigest:skill.current.digest})});
      const body=await response.json().catch(()=>({}));
      if(!response.ok||!body.campaign)throw Error(body.error||'Regeneration unavailable');
      setActiveCampaign(body.campaign);onRegeneratedCampaign?.(body.campaign);
      setRegenMessage('New draft created with the latest skill. Generate new content and review it before scheduling; previous approvals were not reused.');
    }catch{setRegenMessage('Only the original creator can regenerate a saved campaign. Refresh your skill and try again.');}
    finally{setRegenerating(false);}
  };
  const handleGenerateAiPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!campaignName || !objective) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-campaign-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          campaignName,
          objective,
          businessName: business.name,
          industry: business.industry,
        }),
      });

      const data = await response.json();
      if (data.success && data.steps) {
        const formattedSteps: CampaignStep[] = data.steps.map((s: any) => ({
          dayNumber: s.dayNumber || 1,
          channel: s.channel || 'facebook',
          postTitle: s.postTitle || 'Campaign Milestone',
          captionPrompt: s.captionPrompt || s.caption || '',
          suggestedTime: s.suggestedTime || '10:00 AM',
          completed: false,
        }));

        const newCamp: Campaign = {
          id: `camp-${Date.now()}`,
          businessId: business.id,
          name: campaignName,
          objective,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
          status: 'ACTIVE',
          steps: formattedSteps,
          aiPlanGenerated: true,
          skillDigest:data.skillDigest,
          createdAt: new Date().toISOString(),
        };
        const saved=await onCreateCampaign(newCamp);
        setActiveCampaign(saved);
      }
    } catch (err) {
      console.error('Error generating campaign plan:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4 text-slate-300" />
            <span>Automated AI Marketing Campaigns</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Campaign Manager</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate a structured multi-channel campaign roadmap with V79 AI
          </p>
        </div>
      </div>

      {/* AI Campaign Generator Form */}
      <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-semibold text-slate-900 text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-slate-700" />
          <span>Launch New 30-Day Campaign Strategy</span>
        </h3>

        <form onSubmit={handleGenerateAiPlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Campaign Title</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. September Customer Growth Campaign"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>

            <div>
              <label className="text-xs font-medium text-slate-700 block mb-1">Core Campaign Objective</label>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Generate qualified enquiries and increase repeat business"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3.5 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Synthesizing 30-Day Campaign Strategy...' : 'Generate 30-Day Campaign Plan'}</span>
          </button>
        </form>
      </div>

      {/* Campaign Details View */}
      {activeCampaign && (
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-100 pb-4">
            <div>
              <span className="text-[11px] font-semibold text-slate-700 uppercase tracking-wider bg-slate-100 border border-slate-200 px-2 py-0.5 rounded-md">
                Active Campaign
              </span>
              <h2 className="text-lg font-bold text-slate-900 mt-2">{activeCampaign.name}</h2>
              <p className="text-xs text-slate-500 mt-0.5">{activeCampaign.objective}</p>
              {activeCampaign.skillPin&&<p className="mt-1 text-xs text-teal-800">Creator skill v{activeCampaign.skillPin.skillVersion} · pinned for this campaign</p>}
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {activeCampaign.skillPin&&<button type="button" onClick={()=>void regenerate()} disabled={regenerating}
                className="min-h-10 rounded-xl border border-teal-600 px-3 py-2 text-xs font-semibold text-teal-900 disabled:opacity-40">Regenerate with my latest skill</button>}
                        <div className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
              <Calendar className="w-4 h-4 text-slate-500" />
              <span>{activeCampaign.startDate} to {activeCampaign.endDate}</span>
              </div>
            </div>
          </div>
          {regenMessage&&<p role="status" className="rounded-xl bg-teal-50 p-3 text-xs text-teal-900">{regenMessage}</p>}

          {/* Steps Timeline */}
          <div className="space-y-3">
            <h3 className="font-semibold text-slate-900 text-sm">Campaign Step Schedule ({activeCampaign.steps.length} Steps)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCampaign.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-slate-50 border border-slate-200 space-y-2 relative"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800">Day {step.dayNumber} • {step.suggestedTime}</span>
                    <span className="capitalize text-[10px] bg-white text-slate-700 font-medium px-2 py-0.5 rounded border border-slate-200">
                      {step.channel.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-900 text-xs">{step.postTitle}</h4>
                  <p className="text-xs text-slate-600 leading-relaxed">{step.captionPrompt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
