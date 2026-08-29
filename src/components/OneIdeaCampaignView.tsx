import React, { useState } from 'react';
import { Business, Campaign } from '../types';
import {
  Sparkles,
  Layers,
  Calendar,
  CheckCircle2,
  Share2,
  Printer,
  Clock,
  ArrowRight,
  RefreshCw,
  FileText
} from 'lucide-react';

interface OneIdeaCampaignViewProps {
  business: Business;
  onCreateCampaign: (newCampaign: Campaign) => void;
}

export const OneIdeaCampaignView: React.FC<OneIdeaCampaignViewProps> = ({
  business,
  onCreateCampaign,
}) => {
  const [ideaPrompt, setIdeaPrompt] = useState('Promote our new Jerk Glazed Pork Ribs & Waterfront Sunset Cocktails');
  const [isGenerating, setIsGenerating] = useState(false);
  const [approvedSuccess, setApprovedSuccess] = useState(false);

  const [generatedCampaign, setGeneratedCampaign] = useState<{
    name: string;
    objective: string;
    steps: Array<{ dayNumber: number; channel: string; postTitle: string; caption: string; suggestedTime: string }>;
    flyerVisual: string;
  }>({
    name: 'Jerk Glazed Pork Ribs & Sunset Cocktail Showcase',
    objective: 'Drive weekend waterfront dinner bookings & 2-for-1 cocktail special',
    steps: [
      { dayNumber: 1, channel: 'facebook', postTitle: 'Campaign Kickoff & Teaser Offer', caption: `🔥 Smoked over pimento wood for 6 hours! Join us at ${business.name} for our signature Jerk Glazed Pork Ribs & waterfront cocktails. Tag who you are dining with!`, suggestedTime: '10:00 AM' },
      { dayNumber: 3, channel: 'instagram', postTitle: 'Golden Hour Sunset Reel', caption: `Sizzle, smoke & spice 🌅✨ Jerk Glazed Ribs paired with Pitons Rum Punch at ${business.name}. Link in bio to reserve balcony seating! 🍹🦞`, suggestedTime: '04:30 PM' },
      { dayNumber: 7, channel: 'tiktok', postTitle: 'Chef Kitchen POV Video', caption: `POV: You just ordered the freshest Jerk Ribs in Rodney Bay St. Lucia 🔥👀`, suggestedTime: '06:00 PM' },
      { dayNumber: 14, channel: 'whatsapp', postTitle: 'VIP Subscriber Discount Code', caption: `📢 EXCLUSIVE OFFER from ${business.name}: Enjoy EC$15 OFF Jerk Ribs this weekend! Reply "RIB15" to claim your table code! 📲`, suggestedTime: '09:30 AM' },
    ],
    flyerVisual: `data:image/svg+xml;utf8,${encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="800" height="1000" viewBox="0 0 800 1000">
        <rect width="800" height="1000" fill="#0F172A"/>
        <rect x="40" y="40" width="720" height="920" rx="32" fill="#1E293B" stroke="#EA580C" stroke-width="4"/>
        <text x="80" y="140" font-family="sans-serif" font-size="24" font-weight="bold" fill="#EA580C" letter-spacing="3">${business.name.toUpperCase()}</text>
        <text x="80" y="240" font-family="sans-serif" font-size="52" font-weight="900" fill="#FFFFFF">
          <tspan x="80" dy="0">JERK GLAZED</tspan>
          <tspan x="80" dy="64">PORK RIBS SPECIAL</tspan>
        </text>
        <text x="80" y="400" font-family="sans-serif" font-size="28" font-weight="medium" fill="#94A3B8">
          Slow-smoked over pimento wood with plantain mash.
        </text>
        <rect x="80" y="480" width="400" height="80" rx="20" fill="#EA580C"/>
        <text x="120" y="530" font-family="sans-serif" font-size="32" font-weight="bold" fill="#FFFFFF">WATERFRONT DINING</text>
        <text x="80" y="860" font-family="sans-serif" font-size="20" fill="#CBD5E1">📍 ${business.location} | 📞 ${business.phone}</text>
      </svg>
    `)}`,
  });

  const handleGenerate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!ideaPrompt.trim()) return;

    setIsGenerating(true);
    setTimeout(() => {
      setGeneratedCampaign({
        name: `${ideaPrompt.slice(0, 30)} Campaign`,
        objective: `Promote ${ideaPrompt} and increase customer bookings`,
        steps: [
          { dayNumber: 1, channel: 'facebook', postTitle: 'Campaign Launch & Offer Announcement', caption: `✨ Special Announcement from ${business.name}: ${ideaPrompt}! Visit us or contact us directly to learn more.`, suggestedTime: '10:00 AM' },
          { dayNumber: 3, channel: 'instagram', postTitle: 'Visual Showcase & Reel', caption: `Golden moments with ${business.name} ✨ ${ideaPrompt}. Tap the link in our bio to book your table today! 🌴`, suggestedTime: '04:00 PM' },
          { dayNumber: 7, channel: 'tiktok', postTitle: 'Behind-the-Scenes Clip', caption: `POV: Checking out the newest highlight at ${business.name}! 🔥👀`, suggestedTime: '06:00 PM' },
          { dayNumber: 12, channel: 'whatsapp', postTitle: 'VIP Customer Offer Broadcast', caption: `📢 EXCLUSIVE ANNOUNCEMENT from ${business.name}: ${ideaPrompt}! Reply DIRECTLY to this message to claim! 📲`, suggestedTime: '09:30 AM' },
        ],
        flyerVisual: generatedCampaign.flyerVisual,
      });
      setIsGenerating(false);
    }, 1200);
  };

  const handleApproveAll = () => {
    const newCamp: Campaign = {
      id: `camp-${Date.now()}`,
      businessId: business.id,
      name: generatedCampaign.name,
      objective: generatedCampaign.objective,
      startDate: new Date().toISOString().split('T')[0],
      endDate: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      status: 'ACTIVE',
      steps: generatedCampaign.steps.map((s) => ({
        dayNumber: s.dayNumber,
        channel: s.channel as any,
        postTitle: s.postTitle,
        captionPrompt: s.caption,
        suggestedTime: s.suggestedTime,
        completed: false,
      })),
      aiPlanGenerated: true,
      createdAt: new Date().toISOString(),
    };

    onCreateCampaign(newCamp);
    setApprovedSuccess(true);
    setTimeout(() => setApprovedSuccess(false), 3000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>1-Click Campaign Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">One Idea → Complete Campaign</h1>
          <p className="text-xs text-slate-500 mt-1">
            Turn a single promotion idea into social captions, printable flyer visuals, and a 30-day schedule instantly
          </p>
        </div>

        <button
          onClick={handleApproveAll}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          {approvedSuccess ? <CheckCircle2 className="w-4 h-4" /> : <Layers className="w-4 h-4" />}
          <span>{approvedSuccess ? 'Campaign Approved & Scheduled!' : 'Approve & Launch Full Campaign'}</span>
        </button>
      </div>

      {/* Idea Prompt Input Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <label className="text-xs font-bold text-slate-800 block">
          What business offer or idea do you want to promote this month?
        </label>

        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={ideaPrompt}
            onChange={(e) => setIdeaPrompt(e.target.value)}
            placeholder="e.g. Promote our new Jerk Glazed Pork Ribs & Waterfront Sunset Cocktails..."
            className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs rounded-2xl shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Generating Campaign...' : 'Generate Complete Campaign'}</span>
          </button>
        </form>
      </div>

      {/* Campaign Output Preview Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Step-by-Step Multi-Channel Posts */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="font-extrabold text-slate-900 text-base">{generatedCampaign.name}</h3>
              <p className="text-xs text-slate-500">{generatedCampaign.objective}</p>
            </div>
            <span className="bg-orange-100 text-orange-800 font-bold text-[10px] px-2.5 py-1 rounded-full">
              4 Schedule Steps
            </span>
          </div>

          <div className="space-y-3">
            {generatedCampaign.steps.map((step, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-orange-600 bg-orange-100 px-2 py-0.5 rounded text-[10px]">
                    Day {step.dayNumber} • {step.channel.toUpperCase()} ({step.suggestedTime})
                  </span>
                  <span className="font-bold text-slate-700">{step.postTitle}</span>
                </div>
                <p className="text-slate-700 leading-relaxed">{step.caption}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Branded Graphic Flyer Visual */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="font-extrabold text-slate-900 text-base">Printable & Digital Flyer</h3>
            <button
              onClick={() => window.open(generatedCampaign.flyerVisual, '_blank')}
              className="text-xs font-bold text-orange-600 hover:underline flex items-center gap-1 cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Full Resolution</span>
            </button>
          </div>

          <div className="rounded-2xl overflow-hidden border border-slate-200 shadow-md">
            <img src={generatedCampaign.flyerVisual} alt="Campaign Flyer" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};
