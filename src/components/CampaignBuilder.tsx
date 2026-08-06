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
  onCreateCampaign: (campaign: Campaign) => void;
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  business,
  campaigns,
  onCreateCampaign,
}) => {
  const [campaignName, setCampaignName] = useState('Summer Waterfront Sunset Series 2026');
  const [objective, setObjective] = useState('Drive Friday sunset cocktail reservations & boost waterfront dinner foot traffic by 35%');
  const [isGenerating, setIsGenerating] = useState(false);

  const [activeCampaign, setActiveCampaign] = useState<Campaign>(campaigns[0]);

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
        const newCamp: Campaign = {
          id: `camp-${Date.now()}`,
          businessId: business.id,
          name: campaignName,
          objective,
          startDate: new Date().toISOString().split('T')[0],
          endDate: new Date(Date.now() + 86400000 * 30).toISOString().split('T')[0],
          status: 'ACTIVE',
          steps: data.steps,
          aiPlanGenerated: true,
          createdAt: new Date().toISOString(),
        };
        onCreateCampaign(newCamp);
        setActiveCampaign(newCamp);
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
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-teal-400 uppercase tracking-wider mb-1">
            <Layers className="w-4 h-4" />
            <span>Automated AI Marketing Campaigns</span>
          </div>
          <h1 className="text-2xl font-black text-white">Campaign Manager</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate 30-day structured multi-channel campaign roadmaps with Gemini AI
          </p>
        </div>
      </div>

      {/* AI Campaign Generator Form */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-amber-400" />
          <span>Launch New AI 30-Day Campaign Roadmap</span>
        </h3>

        <form onSubmit={handleGenerateAiPlan} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Campaign Name</label>
              <input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                placeholder="e.g. Mother's Day Special, New Product Launch"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">Campaign Core Objective</label>
              <input
                type="text"
                value={objective}
                onChange={(e) => setObjective(e.target.value)}
                placeholder="e.g. Increase weekend reservations by 30%"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isGenerating}
            className="px-6 py-3 bg-gradient-to-r from-teal-500 via-amber-500 to-orange-500 text-white font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Gemini Building 30-Day Campaign Plan...' : 'Generate 30-Day Campaign Plan'}</span>
          </button>
        </form>
      </div>

      {/* Campaign Details View */}
      {activeCampaign && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div>
              <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider bg-teal-500/10 px-2 py-0.5 rounded">
                Active Campaign
              </span>
              <h2 className="text-xl font-bold text-white mt-1">{activeCampaign.name}</h2>
              <p className="text-xs text-slate-400 mt-0.5">{activeCampaign.objective}</p>
            </div>

            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>{activeCampaign.startDate} to {activeCampaign.endDate}</span>
            </div>
          </div>

          {/* Steps Timeline */}
          <div className="space-y-3">
            <h3 className="font-bold text-white text-sm">Campaign Step Schedule ({activeCampaign.steps.length} Steps)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {activeCampaign.steps.map((step, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-400">Day {step.dayNumber} • {step.suggestedTime}</span>
                    <span className="capitalize text-[10px] bg-slate-800 text-slate-300 font-bold px-2 py-0.5 rounded">
                      {step.channel.replace('_', ' ')}
                    </span>
                  </div>
                  <h4 className="font-bold text-white text-sm">{step.postTitle}</h4>
                  <p className="text-xs text-slate-400">{step.captionPrompt}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
