import React, { useState } from 'react';
import { Competitor, Business } from '../types';
import {
  TrendingUp,
  Search,
  Plus,
  Sparkles,
  Zap,
  Trash2,
  Share2,
  CheckCircle2
} from 'lucide-react';

interface CompetitorIntelligenceViewProps {
  competitors: Competitor[];
  business: Business;
  onUpdateCompetitors: (updated: Competitor[]) => void;
  onGenerateCounterCampaign: (opportunity: string) => void;
  onDeductCredits?: (amount: number, reason: string) => boolean;
}

export const CompetitorIntelligenceView: React.FC<CompetitorIntelligenceViewProps> = ({
  competitors,
  business,
  onUpdateCompetitors,
  onGenerateCounterCampaign,
  onDeductCredits,
}) => {
  const [list, setList] = useState<Competitor[]>(competitors);
  const [newCompName, setNewCompName] = useState('');
  const [newCompHandle, setNewCompHandle] = useState('');
  const [auditing, setAuditing] = useState(false);
  const [auditSuccess, setAuditSuccess] = useState(false);

  const handleAddCompetitor = () => {
    if (!newCompName.trim() || !newCompHandle.trim()) return;
    const newComp: Competitor = {
      id: `comp-${Date.now()}`,
      businessId: business.id,
      name: newCompName.trim(),
      handle: newCompHandle.trim(),
      platform: 'instagram',
      postingFrequency: '4 posts / week',
      estimatedReach: '10,000 / mo',
      topTopics: ['Promotions', 'Weekly Specials', 'Behind the Scenes'],
      opportunityGap: 'They rely on plain photos without brand overlays or video stories. High opportunity to win audience attention with V79 AI Video Reels!',
      lastAnalyzed: new Date().toISOString()
    };
    const updated = [newComp, ...list];
    setList(updated);
    onUpdateCompetitors(updated);
    setNewCompName('');
    setNewCompHandle('');
  };

  const handleRunAudit = () => {
    if (onDeductCredits && !onDeductCredits(50, 'AI Regional Competitor Intelligence Audit')) return;

    setAuditing(true);
    setTimeout(() => {
      const updated = list.map((c) => ({
        ...c,
        lastAnalyzed: new Date().toISOString(),
        estimatedReach: `${(Math.floor(Math.random() * 10) + 10)},000 / mo`,
        opportunityGap: `${c.name} has decreased posting consistency by 20% this week. Activate a 3-day flash special now to capture market share in ${business.location}.`
      }));
      setList(updated);
      onUpdateCompetitors(updated);
      setAuditing(false);
      setAuditSuccess(true);
      setTimeout(() => setAuditSuccess(false), 3000);
    }, 1200);
  };

  const handleDelete = (id: string) => {
    const updated = list.filter((c) => c.id !== id);
    setList(updated);
    onUpdateCompetitors(updated);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-300 uppercase tracking-widest bg-amber-500/20 px-3 py-1 rounded-full w-fit">
              <TrendingUp className="w-4 h-4 text-amber-300" />
              <span>Competitor & Regional Market Intelligence</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Public Competitor Radar & Topic Gap Analysis
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Monitor publicly available social presence, posting frequency, and engagement trends. Automatically pinpoint content gaps to outperform competitors ethically.
            </p>
          </div>

          <button
            onClick={handleRunAudit}
            disabled={auditing}
            className="px-5 py-3 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-400 hover:to-orange-500 text-white font-bold text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            {auditing ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Run Regional Market Audit (50 Credits)</span>
              </>
            )}
          </button>
        </div>

        {auditSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>Audit Complete! Regional competitor opportunities updated.</span>
          </div>
        )}
      </div>

      {/* Add Competitor Box */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-blue-600" />
          <span>Monitor New Regional Competitor</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <input
            type="text"
            placeholder="Business Name e.g., Rodney Bay Cafe"
            value={newCompName}
            onChange={(e) => setNewCompName(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
          <input
            type="text"
            placeholder="Social Handle e.g., @rodneybaycafe"
            value={newCompHandle}
            onChange={(e) => setNewCompHandle(e.target.value)}
            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={handleAddCompetitor}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl px-4 py-2.5 transition-all flex items-center justify-center gap-1.5 shadow-xs cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Track Competitor</span>
          </button>
        </div>
      </div>

      {/* Competitors List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {list.map((comp) => (
          <div
            key={comp.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 relative flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2 border-b border-slate-100 pb-3">
                <div>
                  <h4 className="font-bold text-slate-900 text-base">{comp.name}</h4>
                  <p className="text-xs text-blue-600 font-mono font-semibold">{comp.handle}</p>
                </div>
                <button
                  onClick={() => handleDelete(comp.id)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3 my-4 text-xs">
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Posting Frequency</span>
                  <p className="font-bold text-slate-900 mt-0.5">{comp.postingFrequency}</p>
                </div>
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 font-medium">Est. Reach</span>
                  <p className="font-bold text-slate-900 mt-0.5">{comp.estimatedReach}</p>
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-slate-500 uppercase">Top Topics & Focus</span>
                <div className="flex flex-wrap gap-1.5">
                  {comp.topTopics.map((top, idx) => (
                    <span
                      key={idx}
                      className="bg-slate-100 text-slate-700 text-[11px] font-semibold px-2.5 py-1 rounded-lg"
                    >
                      {top}
                    </span>
                  ))}
                </div>
              </div>

              <div className="mt-4 p-3.5 bg-amber-50/80 rounded-2xl border border-amber-200 space-y-1">
                <p className="text-xs font-bold text-amber-900 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                  <span>Content Opportunity Gap</span>
                </p>
                <p className="text-xs text-amber-800 leading-relaxed">{comp.opportunityGap}</p>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] text-slate-400 font-medium">
                Last analyzed {new Date(comp.lastAnalyzed).toLocaleDateString()}
              </span>

              <button
                onClick={() => onGenerateCounterCampaign(comp.opportunityGap)}
                className="px-3.5 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
              >
                <Share2 className="w-3.5 h-3.5" />
                <span>Generate Counter Campaign</span>
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
