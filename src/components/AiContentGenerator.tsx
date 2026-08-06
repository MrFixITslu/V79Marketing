import React, { useState } from 'react';
import { Business, Post, SocialPlatform } from '../types';
import {
  Sparkles,
  Send,
  Copy,
  Check,
  Calendar,
  Share2,
  RefreshCw,
  MessageSquare,
  Facebook,
  Instagram,
  Linkedin,
  Video,
  MessageCircle,
  Zap
} from 'lucide-react';

interface AiContentGeneratorProps {
  business: Business;
  onSchedulePost: (newPost: Partial<Post>) => void;
  initialPrompt?: string;
}

export const AiContentGenerator: React.FC<AiContentGeneratorProps> = ({
  business,
  onSchedulePost,
  initialPrompt = '',
}) => {
  const [prompt, setPrompt] = useState(initialPrompt || "Create a Friday sunset happy hour promotion with 2-for-1 cocktails");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'whatsapp'>('facebook');
  const [copied, setCopied] = useState(false);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  const [generatedContent, setGeneratedContent] = useState<any>({
    facebook: {
      caption: `🍹 Sunset looks better with a Pitons Rum Punch in hand! Join us at ${business.name} this Friday from 5 PM to 7 PM for 2-for-1 cocktails on our waterfront deck. Fresh passion fruit, local rum & live acoustic reggae! Tag who you are bringing! 🌴✨`,
      hashtags: [`#${business.name.replace(/\s+/g, '')}`, '#SunsetHappyHour', '#CaribbeanCocktails', '#StLuciaEats']
    },
    instagram: {
      caption: `Golden hour at ${business.name} hits different 🌅✨ 2-for-1 Rum Punch every Friday 5-7 PM. Reserve your waterfront sunset table via the link in our bio! 🥂🔥`,
      hashtags: ['#RodneyBayMarina', '#CaribbeanFoodie', '#RumPunchSpecial', '#V79Marketing']
    },
    linkedin: {
      caption: `Corporate Friday Sunset Mixer at ${business.name}: Networking, waterfront ambiance, and artisanal Caribbean cocktails. Treat your team to golden hour in Rodney Bay.`,
      hashtags: ['#HospitalityIndustry', '#CaribbeanBusiness', '#TeamMixer']
    },
    tiktok: {
      caption: `POV: You found the ultimate sunset happy hour in St. Lucia 🍹🔥 Tag your travel bestie!`,
      hashtags: ['#StLuciaTikTok', '#RodneyBay', '#CaribbeanVibes']
    },
    whatsapp: {
      caption: `🔥 FRIDAY SUNSET SPECIAL at ${business.name}! Enjoy 2-for-1 Rum Punch from 5-7 PM. Reply "RESERVE" to lock in your table now!`,
      hashtags: []
    }
  });

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          businessName: business.name,
          industry: business.industry,
          brandVoice: business.brandProfile?.brandVoice,
          location: business.location,
          targetAudience: business.brandProfile?.targetAudience,
        }),
      });

      const data = await response.json();
      if (data.success && data.data) {
        setGeneratedContent(data.data);
      }
    } catch (err) {
      console.error('Error calling AI text endpoint:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleScheduleCurrent = () => {
    const newPost: Partial<Post> = {
      title: prompt.slice(0, 40) || 'AI Generated Campaign Post',
      businessId: business.id,
      authorId: 'user-owner-1',
      authorName: 'AI Marketing Assistant',
      content: generatedContent,
      scheduledFor: new Date(Date.now() + 86400000 * 2).toISOString(), // 2 days from now
      status: 'SCHEDULED',
      mediaUrls: [business.coverImageUrl],
    };
    onSchedulePost(newPost);
    setScheduledSuccess(true);
    setTimeout(() => setScheduledSuccess(false), 3000);
  };

  const platformIcons: Record<string, React.ReactNode> = {
    facebook: <Facebook className="w-4 h-4 text-blue-400" />,
    instagram: <Instagram className="w-4 h-4 text-pink-400" />,
    linkedin: <Linkedin className="w-4 h-4 text-sky-400" />,
    tiktok: <Video className="w-4 h-4 text-teal-400" />,
    whatsapp: <MessageCircle className="w-4 h-4 text-emerald-400" />,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Gemini 3.6 Flash Multi-Platform Assistant</span>
          </div>
          <h1 className="text-2xl font-black text-white">AI Marketing Content Generator</h1>
          <p className="text-xs text-slate-400 mt-1">
            Creates brand-aligned copy tailored specifically for {business.name} ({business.industry})
          </p>
        </div>

        <button
          onClick={handleScheduleCurrent}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          {scheduledSuccess ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
          <span>{scheduledSuccess ? 'Scheduled to Calendar!' : 'Schedule All Platforms'}</span>
        </button>
      </div>

      {/* Generator Prompt Panel */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <label className="text-xs font-bold text-slate-300 block">
          What promotion, special offer, or announcement are you crafting today?
        </label>

        <form onSubmit={handleGenerate} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="e.g., Create a Mother's Day brunch discount with 2-for-1 cocktails..."
            className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-orange-500"
          />
          <button
            type="submit"
            disabled={isGenerating}
            className="px-8 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2 disabled:opacity-50 cursor-pointer"
          >
            {isGenerating ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Sparkles className="w-4 h-4" />
            )}
            <span>{isGenerating ? 'Gemini Generating...' : 'Generate Posts'}</span>
          </button>
        </form>

        {/* Preset Prompts */}
        <div className="flex flex-wrap items-center gap-2 pt-2 text-xs">
          <span className="text-slate-500 font-semibold">Quick Prompts:</span>
          {[
            "Mother's Day Brunch Discount",
            'Friday Sunset Happy Hour 2-for-1',
            'New Seafood Dinner Menu Rollout',
            'Weekend Hotel & Tour Voucher Giveaway',
            'Customer Appreciation Discount Code'
          ].map((p) => (
            <button
              key={p}
              onClick={() => setPrompt(p)}
              className="px-3 py-1 rounded-lg bg-slate-950 border border-slate-800 text-slate-300 hover:text-amber-300 hover:border-slate-700 transition-colors"
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Output Platform Preview Tabs */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-800 pb-3 overflow-x-auto no-scrollbar">
          {['facebook', 'instagram', 'linkedin', 'tiktok', 'whatsapp'].map((platform) => (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all ${
                activePlatform === platform
                  ? 'bg-slate-800 text-amber-300 border border-slate-700 shadow-md'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-950'
              }`}
            >
              {platformIcons[platform]}
              <span>{platform}</span>
            </button>
          ))}
        </div>

        {/* Platform Content Box */}
        {generatedContent[activePlatform] && (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-900 pb-2">
                <span className="capitalize font-bold text-slate-200 flex items-center gap-2">
                  {platformIcons[activePlatform]}
                  <span>{activePlatform} Preview</span>
                </span>
                <button
                  onClick={() =>
                    handleCopyToClipboard(
                      `${generatedContent[activePlatform].caption}\n\n${(generatedContent[activePlatform].hashtags || []).join(' ')}`
                    )
                  }
                  className="flex items-center gap-1.5 text-slate-300 hover:text-white bg-slate-900 px-3 py-1 rounded-lg border border-slate-800 cursor-pointer"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <p className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                {generatedContent[activePlatform].caption}
              </p>

              {generatedContent[activePlatform].hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {generatedContent[activePlatform].hashtags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs text-amber-400 font-medium">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
