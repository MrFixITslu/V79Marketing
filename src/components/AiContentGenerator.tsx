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
  Tag,
  Gift,
  CalendarDays,
  ShoppingBag,
  Megaphone,
  Heart
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
  const [selectedCategory, setSelectedCategory] = useState<'offer' | 'product' | 'event' | 'story' | 'holiday'>('offer');
  const [itemName, setItemName] = useState('Friday Sunset 2-for-1 Rum Punch');
  const [specialDetail, setSpecialDetail] = useState('50% off tropical pitchers from 5-7 PM with live reggae music');
  const [prompt, setPrompt] = useState(initialPrompt || "Create a Friday sunset happy hour promotion with 2-for-1 cocktails");
  const [isGenerating, setIsGenerating] = useState(false);
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'whatsapp'>('facebook');
  const [copied, setCopied] = useState(false);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);

  const categories = [
    { id: 'offer', label: 'Special Offer / Sale', icon: Gift, defaultItem: 'Friday Sunset 2-for-1 Cocktail Special', defaultDetail: '50% off pitchers 5-7 PM' },
    { id: 'product', label: 'Product / Menu Dish', icon: ShoppingBag, defaultItem: 'Jerk Glazed Pork Ribs', defaultDetail: 'Slow-smoked over pimento wood with plantain mash' },
    { id: 'event', label: 'Event / Party', icon: CalendarDays, defaultItem: 'Live Reggae Sunset Sessions', defaultDetail: 'Every Friday night from 6:30 PM' },
    { id: 'story', label: 'Customer Appreciation', icon: Heart, defaultItem: 'Thank you Rodney Bay Community', defaultDetail: 'Celebrating our 5-star customer milestone' },
    { id: 'holiday', label: 'Holiday & Festival', icon: Megaphone, defaultItem: 'Creole Heritage Month Feast', defaultDetail: 'Authentic kwéyòl dishes & cultural music' },
  ];

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

  const handleCategorySelect = (catId: any) => {
    const cat = categories.find((c) => c.id === catId);
    if (!cat) return;
    setSelectedCategory(catId);
    setItemName(cat.defaultItem);
    setSpecialDetail(cat.defaultDetail);
    setPrompt(`Promote ${cat.defaultItem}: ${cat.defaultDetail}`);
  };

  const handleGenerate = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const fullPrompt = `${categories.find((c) => c.id === selectedCategory)?.label}: "${itemName}". Details: "${specialDetail}". ${prompt}`;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: fullPrompt,
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
      title: itemName || 'AI Generated Campaign Post',
      businessId: business.id,
      authorId: 'user-owner-1',
      authorName: 'AI Marketing Assistant',
      content: generatedContent,
      scheduledFor: new Date(Date.now() + 86400000 * 2).toISOString(),
      status: 'SCHEDULED',
      mediaUrls: [business.coverImageUrl],
    };
    onSchedulePost(newPost);
    setScheduledSuccess(true);
    setTimeout(() => setScheduledSuccess(false), 3000);
  };

  const platformIcons: Record<string, React.ReactNode> = {
    facebook: <Facebook className="w-4 h-4 text-blue-600" />,
    instagram: <Instagram className="w-4 h-4 text-pink-600" />,
    linkedin: <Linkedin className="w-4 h-4 text-sky-600" />,
    tiktok: <Video className="w-4 h-4 text-teal-600" />,
    whatsapp: <MessageCircle className="w-4 h-4 text-emerald-600" />,
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header Banner */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Zero-Prompt Marketing Creator</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Create a Post or Promotion</h1>
          <p className="text-xs text-slate-500 mt-1">
            Guiding content generation specifically for <strong className="text-slate-800">{business.name}</strong>
          </p>
        </div>

        <button
          onClick={handleScheduleCurrent}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-xs shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap"
        >
          {scheduledSuccess ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
          <span>{scheduledSuccess ? 'Scheduled to Calendar!' : 'Schedule All Platforms'}</span>
        </button>
      </div>

      {/* Guided Category Selection */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 1: What would you like to promote today?</h3>
          <p className="text-xs text-slate-500 mt-0.5">Select a category below — no prompt writing required</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {categories.map((cat) => {
            const Icon = cat.icon;
            const isSelected = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                type="button"
                onClick={() => handleCategorySelect(cat.id)}
                className={`p-4 rounded-2xl text-left border transition-all cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected
                    ? 'bg-orange-50 border-orange-500 ring-2 ring-orange-500/20 text-orange-950 font-bold shadow-xs'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                }`}
              >
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${isSelected ? 'bg-orange-500 text-white' : 'bg-white text-slate-600 border border-slate-200'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div>
                  <p className="text-xs font-extrabold leading-tight">{cat.label}</p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Guided Inputs */}
        <form onSubmit={handleGenerate} className="space-y-4 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">Promotion / Product Title</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g., Weekend Sunset Rum Punch Special"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">Special Details / Discount Offer</label>
              <input
                type="text"
                value={specialDetail}
                onChange={(e) => setSpecialDetail(e.target.value)}
                placeholder="e.g., Buy 1 get 1 free from 5-7 PM on Fridays"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>
          </div>

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs rounded-2xl shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? 'V79 AI Generating...' : 'Generate 5-Channel Promotion'}</span>
            </button>
          </div>
        </form>
      </div>

      {/* Output Platform Preview Tabs */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto no-scrollbar">
          {['facebook', 'instagram', 'linkedin', 'tiktok', 'whatsapp'].map((platform) => (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform as any)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer ${
                activePlatform === platform
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
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
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/80 pb-2">
                <span className="capitalize font-bold text-slate-900 flex items-center gap-2">
                  {platformIcons[activePlatform]}
                  <span>{activePlatform} Optimized Caption</span>
                </span>
                <button
                  onClick={() =>
                    handleCopyToClipboard(
                      `${generatedContent[activePlatform].caption}\n\n${(generatedContent[activePlatform].hashtags || []).join(' ')}`
                    )
                  }
                  className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-200 shadow-xs cursor-pointer font-semibold text-xs"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied!' : 'Copy Text'}</span>
                </button>
              </div>

              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap font-sans">
                {generatedContent[activePlatform].caption}
              </p>

              {generatedContent[activePlatform].hashtags?.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pt-2">
                  {generatedContent[activePlatform].hashtags.map((tag: string, i: number) => (
                    <span key={i} className="text-xs text-orange-600 font-semibold bg-orange-50 px-2 py-0.5 rounded-md border border-orange-200/60">
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
