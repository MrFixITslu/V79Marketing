import React, { useEffect, useMemo, useState } from 'react';
import { Business, Post, SocialAccount, SocialPlatform, TikTokCreatorInfo } from '../types';
import {
  Sparkles,
  Copy,
  Check,
  Calendar,
  RefreshCw,
  Facebook,
  Instagram,
  Linkedin,
  Video,
  Youtube,
  MessageCircle,
  Gift,
  CalendarDays,
  ShoppingBag,
  Megaphone,
  Heart,
  Globe2,
  AlertTriangle,
  Image as ImageIcon,
  Clock3,
} from 'lucide-react';

interface AiContentGeneratorProps {
  business: Business;
  socialAccounts: SocialAccount[];
  onSchedulePost: (newPost: Partial<Post>) => Promise<void>;
  initialPrompt?: string;
}

const PUBLISH_PLATFORMS = ['facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'google_business'] as const;
type PublishPlatform = (typeof PUBLISH_PLATFORMS)[number];

function defaultScheduleValue() {
  const date = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000);
  date.setSeconds(0, 0);
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

const platformLabel: Record<PublishPlatform, string> = {
  facebook: 'Facebook',
  instagram: 'Instagram',
  linkedin: 'LinkedIn',
  tiktok: 'TikTok',
  youtube: 'YouTube',
  google_business: 'Google Business',
};

export const AiContentGenerator: React.FC<AiContentGeneratorProps> = ({
  business,
  socialAccounts,
  onSchedulePost,
  initialPrompt = '',
}) => {
  const [selectedCategory, setSelectedCategory] = useState<'offer' | 'product' | 'event' | 'story' | 'holiday'>('offer');
  const [itemName, setItemName] = useState('');
  const [specialDetail, setSpecialDetail] = useState('');
  const [prompt, setPrompt] = useState(initialPrompt);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState('');
  const [activePlatform, setActivePlatform] = useState<SocialPlatform | 'whatsapp'>('facebook');
  const [copied, setCopied] = useState(false);
  const [scheduledSuccess, setScheduledSuccess] = useState(false);
  const [schedulePending, setSchedulePending] = useState(false);
  const [scheduleError, setScheduleError] = useState('');
  const [generatedContent, setGeneratedContent] = useState<any>({});

  const [selectedPublishPlatforms, setSelectedPublishPlatforms] = useState<PublishPlatform[]>([]);
  const [mediaUrl, setMediaUrl] = useState(business.coverImageUrl || '');
  const [youtubeVideoUrl, setYoutubeVideoUrl] = useState('');
  const [youtubeTitle, setYoutubeTitle] = useState('');
  const [youtubePrivacy, setYoutubePrivacy] = useState<'private' | 'unlisted' | 'public'>('private');
  const [youtubeCategoryId, setYoutubeCategoryId] = useState('22');
  const [youtubeMadeForKids, setYoutubeMadeForKids] = useState(false);
  const [youtubeSyntheticMedia, setYoutubeSyntheticMedia] = useState(false);
  const [scheduledForLocal, setScheduledForLocal] = useState(defaultScheduleValue);

  const [tiktokCreator, setTikTokCreator] = useState<TikTokCreatorInfo | null>(null);
  const [tiktokCreatorError, setTikTokCreatorError] = useState('');
  const [tiktokPrivacy, setTikTokPrivacy] = useState('');
  const [tiktokDisableComment, setTikTokDisableComment] = useState(false);
  const [tiktokAutoAddMusic, setTikTokAutoAddMusic] = useState(true);
  const [tiktokCommercialDisclosure, setTikTokCommercialDisclosure] = useState(false);
  const [tiktokOwnBrand, setTikTokOwnBrand] = useState(false);
  const [tiktokBrandedContent, setTikTokBrandedContent] = useState(false);
  const [tiktokIsAigc, setTikTokIsAigc] = useState(false);
  const [tiktokMusicConfirmed, setTikTokMusicConfirmed] = useState(false);

  const categories = [
    { id: 'offer', label: 'Special Offer / Sale', icon: Gift, defaultItem: '', defaultDetail: '' },
    { id: 'product', label: 'Product / Service', icon: ShoppingBag, defaultItem: '', defaultDetail: '' },
    { id: 'event', label: 'Event', icon: CalendarDays, defaultItem: '', defaultDetail: '' },
    { id: 'story', label: 'Customer / Brand Story', icon: Heart, defaultItem: '', defaultDetail: '' },
    { id: 'holiday', label: 'Holiday & Festival', icon: Megaphone, defaultItem: '', defaultDetail: '' },
  ] as const;

  const connectedByPlatform = useMemo(() => {
    const connected = new Set<string>();
    for (const account of socialAccounts) {
      if (account.connected) connected.add(account.platform);
    }
    return connected;
  }, [socialAccounts]);

  useEffect(() => {
    setMediaUrl((current) => current || business.coverImageUrl || '');
  }, [business.coverImageUrl]);

  useEffect(() => {
    if (!selectedPublishPlatforms.includes('tiktok')) {
      setTikTokCreator(null);
      setTikTokCreatorError('');
      return;
    }
    if (!connectedByPlatform.has('tiktok')) {
      setTikTokCreator(null);
      setTikTokCreatorError('Connect TikTok in Social Media Connections before scheduling a TikTok Direct Post.');
      return;
    }

    let cancelled = false;
    setTikTokCreatorError('');
    void fetch('/api/social-accounts/tiktok/creator-info', { credentials:'same-origin' })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (!response.ok || !body.creator) throw new Error(body.error || 'TikTok publishing options could not be loaded.');
        if (cancelled) return;
        setTikTokCreator(body.creator);
        setTikTokPrivacy((current) => {
          if (current && body.creator.privacyLevelOptions?.includes(current)) return current;
          return body.creator.privacyLevelOptions?.[0] || '';
        });
        if (body.creator.commentDisabled) setTikTokDisableComment(true);
      })
      .catch(error => {
        if (!cancelled) {
          setTikTokCreator(null);
          setTikTokCreatorError(error instanceof Error ? error.message : 'TikTok publishing options could not be loaded.');
        }
      });
    return () => { cancelled = true; };
  }, [selectedPublishPlatforms, connectedByPlatform]);

  const handleCategorySelect = (catId: typeof categories[number]['id']) => {
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
    setGenerationError('');
    try {
      const response = await fetch('/api/ai/generate-text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: fullPrompt }),
      });

      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data.success || !data.data) throw new Error(data.error || 'Could not generate marketing content.');
      setGeneratedContent(data.data);
      if (!youtubeTitle.trim()) setYoutubeTitle(itemName || 'V79 Marketing video');

      if (selectedPublishPlatforms.length === 0) {
        const connected = PUBLISH_PLATFORMS.filter(platform => connectedByPlatform.has(platform));
        setSelectedPublishPlatforms(connected);
      }
      if (Number(data.creditsCharged || 0) > 0) window.dispatchEvent(new Event('v79:credits-updated'));
    } catch (err) {
      setGenerationError(err instanceof Error ? err.message : 'Could not generate marketing content.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleCopyToClipboard = (text: string) => {
    void navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const togglePublishPlatform = (platform: PublishPlatform) => {
    setScheduleError('');
    setSelectedPublishPlatforms(current =>
      current.includes(platform) ? current.filter(item => item !== platform) : [...current, platform]
    );
  };

  const validateTikTok = () => {
    if (!selectedPublishPlatforms.includes('tiktok')) return '';
    if (!connectedByPlatform.has('tiktok')) return 'TikTok must be connected before a TikTok post can be scheduled.';
    if (!tiktokCreator) return tiktokCreatorError || 'TikTok creator publishing options are still loading.';
    if (!tiktokPrivacy) return 'Choose a TikTok privacy setting.';
    if (!tiktokMusicConfirmed) return 'Confirm TikTok Music Usage and explicit posting consent.';
    if (tiktokCommercialDisclosure && !tiktokOwnBrand && !tiktokBrandedContent) {
      return 'TikTok commercial disclosure is enabled. Select Your brand, Branded content, or both.';
    }
    if (tiktokBrandedContent && tiktokPrivacy === 'SELF_ONLY') {
      return 'TikTok branded content cannot use Only me/private visibility.';
    }
    return '';
  };

  const handleScheduleCurrent = async () => {
    setScheduleError('');
    if (!Object.keys(generatedContent || {}).length) {
      setScheduleError('Generate the marketing copy before scheduling it.');
      return;
    }
    if (!selectedPublishPlatforms.length) {
      setScheduleError('Choose at least one publishing channel.');
      return;
    }

    const publicMedia = mediaUrl.trim();
    if ((selectedPublishPlatforms.includes('instagram') || selectedPublishPlatforms.includes('tiktok')) && !/^https:\/\//i.test(publicMedia)) {
      setScheduleError('Instagram and TikTok require a publicly reachable HTTPS image URL.');
      return;
    }

    const tiktokValidation = validateTikTok();
    if (tiktokValidation) {
      setScheduleError(tiktokValidation);
      return;
    }

    if (selectedPublishPlatforms.includes('youtube')) {
      if (!/^https:\/\//i.test(youtubeVideoUrl.trim())) {
        setScheduleError('YouTube requires a publicly reachable HTTPS video URL.');
        return;
      }
      if (!youtubeTitle.trim()) {
        setScheduleError('YouTube requires a video title.');
        return;
      }
      if (!connectedByPlatform.has('youtube')) {
        setScheduleError('Connect a YouTube channel before scheduling a YouTube upload.');
        return;
      }
    }

    const scheduledDate = new Date(scheduledForLocal);
    if (Number.isNaN(scheduledDate.getTime())) {
      setScheduleError('Choose a valid schedule date and time.');
      return;
    }

    const content: Record<string, any> = {};
    for (const platform of selectedPublishPlatforms) {
      const base = generatedContent[platform];
      if (!base) continue;
      content[platform] = { ...base };
      if (platform === 'tiktok') {
        content[platform].tiktok = {
          privacyLevel: tiktokPrivacy,
          disableComment: tiktokCreator?.commentDisabled ? true : tiktokDisableComment,
          autoAddMusic: tiktokAutoAddMusic,
          commercialDisclosure: tiktokCommercialDisclosure,
          brandOrganicToggle: tiktokCommercialDisclosure && tiktokOwnBrand,
          brandContentToggle: tiktokCommercialDisclosure && tiktokBrandedContent,
          isAigc: tiktokIsAigc,
          musicUsageConfirmed: tiktokMusicConfirmed,
        };
      }
      if (platform === 'youtube') {
        content[platform].youtube = {
          title: youtubeTitle.trim(),
          videoUrl: youtubeVideoUrl.trim(),
          privacyStatus: youtubePrivacy,
          categoryId: youtubeCategoryId,
          madeForKids: youtubeMadeForKids,
          containsSyntheticMedia: youtubeSyntheticMedia,
        };
      }
    }

    if (!Object.keys(content).length) {
      setScheduleError('The selected channels do not have generated content yet.');
      return;
    }

    const newPost: Partial<Post> = {
      title: itemName || 'AI Generated Campaign Post',
      businessId: business.id,
      content,
      scheduledFor: scheduledDate.toISOString(),
      status: 'SCHEDULED',
      mediaUrls: publicMedia ? [publicMedia] : [],
    };

    setSchedulePending(true);
    try {
      await onSchedulePost(newPost);
      window.dispatchEvent(new Event('v79:deliveries-updated'));
      setScheduledSuccess(true);
      setTimeout(() => setScheduledSuccess(false), 3000);
    } catch (error) {
      setScheduleError(error instanceof Error ? error.message : 'Could not save this post. Try again.');
    } finally {
      setSchedulePending(false);
    }
  };

  const platformIcons: Record<string, React.ReactNode> = {
    facebook: <Facebook className="w-4 h-4 text-blue-600" />,
    instagram: <Instagram className="w-4 h-4 text-pink-600" />,
    linkedin: <Linkedin className="w-4 h-4 text-sky-600" />,
    tiktok: <Video className="w-4 h-4 text-teal-600" />,
    youtube: <Youtube className="w-4 h-4 text-red-600" />,
    google_business: <Globe2 className="w-4 h-4 text-amber-600" />,
    whatsapp: <MessageCircle className="w-4 h-4 text-emerald-600" />,
  };

  const previewPlatforms: Array<PublishPlatform | 'whatsapp'> = [
    'facebook',
    'instagram',
    'linkedin',
    'tiktok',
    'youtube',
    'google_business',
    'whatsapp',
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col xl:flex-row xl:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-orange-600 uppercase tracking-wider mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Verified Multi-Channel Content Creator</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Create & Schedule a Post</h1>
          <p className="text-sm text-slate-500 mt-1">
            Generate channel-specific copy, choose exactly where it should publish, and review provider requirements before it enters the queue.
          </p>
        </div>

        <button
          onClick={handleScheduleCurrent}
          disabled={schedulePending}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold rounded-2xl text-sm shadow-md flex items-center justify-center gap-2 transition-all cursor-pointer whitespace-nowrap disabled:opacity-50"
        >
          {scheduledSuccess ? <Check className="w-4 h-4" /> : <Calendar className="w-4 h-4" />}
          <span>{schedulePending ? 'Scheduling…' : scheduledSuccess ? 'Queued Successfully' : 'Schedule Selected Channels'}</span>
        </button>
      </div>

      {scheduleError && (
        <div role="alert" className="rounded-xl border border-red-300 bg-red-50 px-4 py-3 text-sm font-medium text-red-800">
          {scheduleError}
        </div>
      )}

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 1: What would you like to promote?</h3>
          <p className="text-sm text-slate-500 mt-1">V79 AI uses only your verified business profile and the details you enter here.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
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
                <p className="text-xs font-extrabold leading-tight">{cat.label}</p>
              </button>
            );
          })}
        </div>

        <form onSubmit={handleGenerate} className="space-y-4 pt-2 border-t border-slate-100">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">Promotion / Product Title</label>
              <input
                type="text"
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
                placeholder="e.g. October service special"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>
            <div>
              <label className="font-bold text-slate-800 block mb-1.5">Verified Details / Offer</label>
              <input
                type="text"
                value={specialDetail}
                onChange={(e) => setSpecialDetail(e.target.value)}
                placeholder="Only enter a discount or claim that is actually approved"
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500 font-medium"
              />
            </div>
          </div>

          <div>
            <label className="font-bold text-slate-800 block mb-1.5 text-sm">Extra direction</label>
            <textarea
              rows={2}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="What should this post achieve?"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none focus:ring-2 focus:ring-orange-500"
            />
          </div>

          {generationError && <p role="alert" className="text-sm text-red-700">{generationError}</p>}

          <div className="flex justify-end pt-2">
            <button
              type="submit"
              disabled={isGenerating}
              className="w-full sm:w-auto px-8 py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-sm rounded-2xl shadow-md hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>{isGenerating ? 'V79 AI Generating…' : 'Generate Channel Copy'}</span>
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div>
          <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">Step 2: Choose publishing channels</h3>
          <p className="text-sm text-slate-500 mt-1">Connected channels can publish automatically. Unconnected channels may be queued, except TikTok which needs live creator settings first.</p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          {PUBLISH_PLATFORMS.map((platform) => {
            const selected = selectedPublishPlatforms.includes(platform);
            const connected = connectedByPlatform.has(platform);
            return (
              <button
                type="button"
                key={platform}
                onClick={() => togglePublishPlatform(platform)}
                className={`rounded-2xl border p-4 text-left transition-all ${
                  selected ? 'border-orange-400 bg-orange-50 ring-2 ring-orange-100' : 'border-slate-200 bg-slate-50 hover:bg-slate-100'
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 font-bold text-slate-900">
                    {platformIcons[platform]}
                    <span>{platformLabel[platform]}</span>
                  </div>
                  <div className={`h-4 w-4 rounded border ${selected ? 'border-orange-500 bg-orange-500' : 'border-slate-300 bg-white'}`}>
                    {selected && <Check className="h-3.5 w-3.5 text-white" />}
                  </div>
                </div>
                <div className={`mt-3 text-xs font-semibold ${connected ? 'text-emerald-700' : 'text-amber-700'}`}>
                  {connected ? 'Provider connected' : 'Not connected — will wait in queue'}
                </div>
              </button>
            );
          })}
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <ImageIcon className="h-4 w-4" />
              Public HTTPS media URL
            </label>
            <input
              value={mediaUrl}
              onChange={(e) => setMediaUrl(e.target.value)}
              placeholder="https://your-domain.com/media/campaign-photo.jpg"
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              Required for Instagram and TikTok. TikTok also requires the URL/domain to be verified in its developer console.
            </p>
            {/^https:\/\//i.test(mediaUrl.trim()) && (
              <img src={mediaUrl.trim()} alt="Publishing preview" className="mt-3 max-h-44 w-full rounded-xl border border-slate-200 object-cover" />
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
            <label className="flex items-center gap-2 text-sm font-bold text-slate-900">
              <Clock3 className="h-4 w-4" />
              Schedule date & time
            </label>
            <input
              type="datetime-local"
              value={scheduledForLocal}
              onChange={(e) => setScheduledForLocal(e.target.value)}
              className="mt-2 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-orange-500 focus:outline-none"
            />
            <p className="mt-2 text-xs leading-5 text-slate-500">
              V79 keeps each provider delivery separate, so one provider failure does not falsely mark the others as published.
            </p>
          </div>
        </div>

        {selectedPublishPlatforms.includes('youtube') && (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-5 space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-black text-slate-900">
                <Youtube className="h-4 w-4 text-red-600" />
                YouTube video upload
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-600">
                YouTube uploads require a publicly reachable HTTPS video. Google forces uploads from unverified API projects to private visibility until the project passes its YouTube API compliance audit.
              </p>
            </div>

            <div>
              <label className="text-sm font-bold text-slate-800">Public HTTPS video URL</label>
              <input
                value={youtubeVideoUrl}
                onChange={(e) => setYoutubeVideoUrl(e.target.value)}
                placeholder="https://your-domain.com/video/campaign.mp4"
                className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-red-500 focus:outline-none"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label className="text-sm font-bold text-slate-800">Video title</label>
                <input
                  value={youtubeTitle}
                  maxLength={100}
                  onChange={(e) => setYoutubeTitle(e.target.value)}
                  placeholder="Video title"
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 focus:border-red-500 focus:outline-none"
                />
                <p className="mt-1 text-xs text-slate-500">{youtubeTitle.length}/100</p>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-800">Privacy</label>
                <select
                  value={youtubePrivacy}
                  onChange={(e) => setYoutubePrivacy(e.target.value as 'private' | 'unlisted' | 'public')}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
                >
                  <option value="private">Private</option>
                  <option value="unlisted">Unlisted</option>
                  <option value="public">Public</option>
                </select>
              </div>

              <div>
                <label className="text-sm font-bold text-slate-800">Category</label>
                <select
                  value={youtubeCategoryId}
                  onChange={(e) => setYoutubeCategoryId(e.target.value)}
                  className="mt-1.5 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900"
                >
                  <option value="22">People & Blogs</option>
                  <option value="24">Entertainment</option>
                  <option value="26">Howto & Style</option>
                  <option value="27">Education</option>
                  <option value="28">Science & Technology</option>
                </select>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={youtubeMadeForKids}
                  onChange={(e) => setYoutubeMadeForKids(e.target.checked)}
                />
                <span>This video is made for kids</span>
              </label>
              <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-white p-3 text-sm text-slate-700">
                <input
                  className="mt-1"
                  type="checkbox"
                  checked={youtubeSyntheticMedia}
                  onChange={(e) => setYoutubeSyntheticMedia(e.target.checked)}
                />
                <span>This video contains realistic altered or synthetic media</span>
              </label>
            </div>
          </div>
        )}

        {selectedPublishPlatforms.includes('tiktok') && (
          <div className="rounded-2xl border border-slate-300 bg-slate-950 p-5 text-white space-y-4">
            <div>
              <div className="flex items-center gap-2 text-sm font-black">
                <Video className="h-4 w-4 text-teal-300" />
                TikTok Direct Post settings
              </div>
              <p className="mt-1 text-xs leading-5 text-slate-400">
                TikTok requires current creator settings, explicit privacy selection, content disclosure controls and user consent before Direct Post.
              </p>
            </div>

            {tiktokCreatorError && (
              <div className="flex items-start gap-2 rounded-xl border border-amber-400/30 bg-amber-400/10 p-3 text-sm text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>{tiktokCreatorError}</span>
              </div>
            )}

            {tiktokCreator && (
              <>
                <div className="flex items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-3">
                  {tiktokCreator.creatorAvatarUrl && <img src={tiktokCreator.creatorAvatarUrl} alt="" className="h-10 w-10 rounded-full object-cover" />}
                  <div>
                    <div className="text-sm font-bold">{tiktokCreator.creatorNickname || tiktokCreator.creatorUsername || 'TikTok creator'}</div>
                    {tiktokCreator.creatorUsername && <div className="text-xs text-slate-400">@{tiktokCreator.creatorUsername}</div>}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-bold text-slate-200">Who can view this post?</label>
                  <select
                    value={tiktokPrivacy}
                    onChange={(e) => {
                      const next = e.target.value;
                      setTikTokPrivacy(next);
                      if (next === 'SELF_ONLY') setTikTokBrandedContent(false);
                    }}
                    className="mt-1.5 w-full rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2.5 text-sm text-white"
                  >
                    {tiktokCreator.privacyLevelOptions.map(option => (
                      <option key={option} value={option}>{option.replaceAll('_',' ')}</option>
                    ))}
                  </select>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
                    <input
                      type="checkbox"
                      checked={tiktokDisableComment}
                      disabled={tiktokCreator.commentDisabled}
                      onChange={(e) => setTikTokDisableComment(e.target.checked)}
                    />
                    Disable comments
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
                    <input type="checkbox" checked={tiktokAutoAddMusic} onChange={(e) => setTikTokAutoAddMusic(e.target.checked)} />
                    Auto-add recommended music
                  </label>
                  <label className="flex items-center gap-2 rounded-xl border border-slate-800 bg-slate-900 p-3 text-sm">
                    <input type="checkbox" checked={tiktokIsAigc} onChange={(e) => setTikTokIsAigc(e.target.checked)} />
                    The photo itself is AI-generated
                  </label>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900 p-4 space-y-3">
                  <label className="flex items-start gap-3 text-sm">
                    <input
                      className="mt-1"
                      type="checkbox"
                      checked={tiktokCommercialDisclosure}
                      onChange={(e) => {
                        const enabled = e.target.checked;
                        setTikTokCommercialDisclosure(enabled);
                        if (!enabled) {
                          setTikTokOwnBrand(false);
                          setTikTokBrandedContent(false);
                        }
                      }}
                    />
                    <span>
                      <strong>Content disclosure:</strong> this post promotes a brand, product or service.
                    </span>
                  </label>

                  {tiktokCommercialDisclosure && (
                    <div className="ml-6 grid gap-2 sm:grid-cols-2">
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input type="checkbox" checked={tiktokOwnBrand} onChange={(e) => setTikTokOwnBrand(e.target.checked)} />
                        Your brand / own business
                      </label>
                      <label className="flex items-center gap-2 text-sm text-slate-200">
                        <input
                          type="checkbox"
                          checked={tiktokBrandedContent}
                          disabled={tiktokPrivacy === 'SELF_ONLY'}
                          onChange={(e) => setTikTokBrandedContent(e.target.checked)}
                        />
                        Branded content / paid partnership
                      </label>
                    </div>
                  )}

                  {tiktokCommercialDisclosure && (tiktokOwnBrand || tiktokBrandedContent) && (
                    <p className="ml-6 text-xs text-amber-200">
                      {tiktokBrandedContent ? "TikTok will label this as 'Paid partnership'." : "TikTok will label this as 'Promotional content'."}
                    </p>
                  )}
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-teal-400/30 bg-teal-400/10 p-4 text-sm text-teal-100">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={tiktokMusicConfirmed}
                    onChange={(e) => setTikTokMusicConfirmed(e.target.checked)}
                  />
                  <span>
                    I reviewed the preview, authorise V79 to send this content to TikTok, and agree to TikTok&apos;s Music Usage Confirmation
                    {tiktokBrandedContent ? ' and Branded Content Policy' : ''}.
                  </span>
                </label>
              </>
            )}
          </div>
        )}
      </div>

      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-center gap-2 border-b border-slate-100 pb-3 overflow-x-auto no-scrollbar">
          {previewPlatforms.map((platform) => (
            <button
              key={platform}
              onClick={() => setActivePlatform(platform)}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold capitalize transition-all cursor-pointer whitespace-nowrap ${
                activePlatform === platform
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              {platformIcons[platform]}
              <span>{platform === 'google_business' ? 'Google Business' : platform === 'youtube' ? 'YouTube' : platform}</span>
              {platform === 'whatsapp' && <span className="text-[10px] font-medium opacity-70">copy only</span>}
            </button>
          ))}
        </div>

        {generatedContent[activePlatform] ? (
          <div className="space-y-4">
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 border-b border-slate-200/80 pb-2">
                <span className="font-bold text-slate-900 flex items-center gap-2">
                  {platformIcons[activePlatform]}
                  <span>{activePlatform === 'google_business' ? 'Google Business' : activePlatform === 'youtube' ? 'YouTube' : activePlatform} caption</span>
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

              <p className="text-sm text-slate-800 leading-relaxed whitespace-pre-wrap">
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
        ) : (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm text-slate-500">
            Generate channel copy to preview it here.
          </div>
        )}
      </div>
    </div>
  );
};
