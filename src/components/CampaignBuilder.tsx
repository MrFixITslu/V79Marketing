import React, { useState } from 'react';
import { ArrowRight, CalendarDays, CheckCircle2, ClipboardList, Layers, Plus, Sparkles } from 'lucide-react';
import type { Business, Campaign, CampaignStep, Post } from '../types';
import type { CampaignOutcome } from '../lib/campaignAttribution';

interface CampaignBuilderProps {
  business: Business;
  campaigns: Campaign[];
  posts: Post[];
  outcomes: CampaignOutcome[] | null;
  onCreateNewPlan: () => void;
  onPrepareStep: (campaign: Campaign, step: CampaignStep) => void;
}

export const CampaignBuilder: React.FC<CampaignBuilderProps> = ({
  business, campaigns, posts, outcomes, onCreateNewPlan, onPrepareStep
}) => {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const ownCampaigns = campaigns.filter(campaign => campaign.businessId === business.id);
  const activeCampaign = ownCampaigns.find(campaign => campaign.id === selectedId) || ownCampaigns[0];
  const campaignPosts = activeCampaign
    ? posts.filter(post => post.businessId === business.id && post.campaignId === activeCampaign.id)
    : [];
  const scheduledCount = campaignPosts.filter(post => post.status === 'SCHEDULED').length;
  const publishedCount = campaignPosts.filter(post => post.status === 'PUBLISHED').length;
  const outcome = activeCampaign && outcomes ? outcomes.find(row=>row.campaignId === activeCampaign.id) : undefined;

  return (
    <div className="space-y-6 pb-12">
      <section className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-orange-700 uppercase tracking-wider">
              <Layers className="h-4 w-4" /> Guided campaign workflow
            </div>
            <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Your Campaign Plans</h1>
            <p className="mt-1 text-sm text-slate-600">Pick a saved plan, prepare one piece of content, review it and choose whether to schedule it.</p>
          </div>
          <button type="button" onClick={onCreateNewPlan}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-5 py-3 text-sm font-bold text-white hover:bg-orange-700 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600">
            <Plus className="h-4 w-4" /> Create a campaign
          </button>
        </div>
        <ol className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-3" aria-label="Campaign stages">
          <li className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><span className="font-bold text-slate-900">1. Plan</span> — set goal and audience</li>
          <li className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><span className="font-bold text-slate-900">2. Create</span> — generate and review a post</li>
          <li className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-700"><span className="font-bold text-slate-900">3. Schedule</span> — choose connected channels</li>
        </ol>
      </section>

      {ownCampaigns.length === 0 ? (
        <section className="rounded-3xl border border-dashed border-slate-300 bg-white p-8 text-center">
          <ClipboardList className="mx-auto h-9 w-9 text-orange-500" />
          <h2 className="mt-3 text-lg font-bold text-slate-900">No saved campaign plans yet</h2>
          <p className="mt-2 text-sm text-slate-600">Start with one idea. AI will suggest steps for you to review.</p>
          <button type="button" onClick={onCreateNewPlan} className="mt-4 rounded-xl bg-slate-900 px-5 py-3 text-sm font-bold text-white">Build your first plan</button>
        </section>
      ) : (
        <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(220px,300px)_minmax(0,1fr)]">
          <section className="rounded-2xl border border-slate-200 bg-white p-4" aria-label="Saved campaign plans">
            <h2 className="mb-3 text-sm font-bold text-slate-900">Saved plans ({ownCampaigns.length})</h2>
            <div className="space-y-2">
              {ownCampaigns.map(campaign => (
                <button type="button" key={campaign.id} onClick={() => setSelectedId(campaign.id)}
                  aria-pressed={activeCampaign?.id === campaign.id}
                  className={`block w-full rounded-xl border p-3 text-left transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-orange-600 ${activeCampaign?.id === campaign.id ? 'border-orange-500 bg-orange-50' : 'border-slate-200 bg-slate-50 hover:border-orange-300'}`}>
                  <span className="block truncate text-sm font-bold text-slate-900">{campaign.name}</span>
                  <span className="mt-1 block text-xs text-slate-600">
                    {campaign.status === 'PLANNED' ? 'Saved plan — not published' : campaign.status === 'ACTIVE' ? 'Marked active — check publication separately' : 'Completed plan'}
                  </span>
                </button>
              ))}
            </div>
          </section>

          {activeCampaign && (
            <section className="min-w-0 space-y-4 rounded-2xl border border-slate-200 bg-white p-4 sm:p-6">
              <div className="border-b border-slate-200 pb-4">
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-600">
                  <CalendarDays className="h-4 w-4" />
                  <span>{activeCampaign.startDate} to {activeCampaign.endDate}</span>
                  <span className="rounded-md bg-slate-100 px-2 py-1 font-medium">{activeCampaign.status}</span>
                </div>
                <h2 className="mt-2 text-xl font-extrabold text-slate-900">{activeCampaign.name}</h2>
                <p className="mt-2 whitespace-pre-line break-words text-sm text-slate-700">{activeCampaign.objective}</p>
                <p className="mt-3 text-xs font-medium text-amber-800">A saved campaign plan is not approval to post. Every draft and platform must be reviewed.</p>
                <div className="mt-4 flex flex-wrap gap-3 text-xs font-semibold text-slate-700" aria-label="Verified campaign activity">
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{campaignPosts.length} linked posts</span>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{scheduledCount} scheduled</span>
                  <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2">{publishedCount} published</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">These counts come from saved post records, not estimates of reach, enquiries or sales.</p>
                <div className="mt-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4" aria-label="Manually linked CRM results">
                  <h3 className="text-sm font-bold text-emerald-950">Customer enquiry outcomes</h3>
                  {outcomes === null ? (
                    <p className="mt-2 text-sm text-emerald-900">Customer outcome data unavailable. We will not show zero as if it were verified.</p>
                  ) : (
                    <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                      <div><strong className="block text-2xl text-emerald-950">{outcome?.attributedEnquiries ?? 0}</strong><span>Manually linked enquiries</span></div>
                      <div><strong className="block text-2xl text-emerald-950">{outcome?.customerStatuses ?? 0}</strong><span>Records marked as customers</span></div>
                    </div>
                  )}
                  <p className="mt-2 text-xs text-emerald-900">These are actual customer-pipeline records with a manually selected campaign. They do not prove an ad click, confirmed sale or revenue.</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-orange-600" />
                <h3 className="text-base font-bold text-slate-900">Choose a step to prepare</h3>
              </div>
              {activeCampaign.steps.length ? (
                <div className="grid grid-cols-1 gap-3 lg:grid-cols-2">
                  {activeCampaign.steps.map((step, index) => (
                    <article key={`${activeCampaign.id}-${index}`} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold text-orange-700">
                        <CheckCircle2 className="h-4 w-4" /> Day {step.dayNumber} · {step.channel.replace('_', ' ')}
                      </div>
                      <h4 className="mt-2 text-sm font-bold text-slate-900">{step.postTitle}</h4>
                      <p className="mt-2 break-words text-xs leading-relaxed text-slate-600">{step.captionPrompt || 'Review this campaign step and prepare content.'}</p>
                      <p className="mt-2 text-xs text-slate-500">Suggested time: {step.suggestedTime} (not scheduled)</p>
                      <button type="button" onClick={() => onPrepareStep(activeCampaign, step)}
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-bold text-white hover:bg-slate-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-900">
                        Prepare content <ArrowRight className="h-4 w-4" />
                      </button>
                    </article>
                  ))}
                </div>
              ) : <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-600">This plan has no steps. Create another campaign to start from a fresh brief.</p>}
            </section>
          )}
        </div>
      )}
    </div>
  );
};
