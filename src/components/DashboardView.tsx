import React from 'react';
import { Business, Post, SocialAccount, User, UsageLimits } from '../types';
import {
  Sparkles,
  Calendar,
  Layers,
  BarChart3,
  TrendingUp,
  Clock,
  CheckCircle2,
  Zap,
  Image as ImageIcon,
  Building2,
  ExternalLink,
  Users,
  Brain,
  MessageSquare,
  ShieldCheck,
  ArrowRight,
  Video
} from 'lucide-react';

interface DashboardViewProps {
  currentBusiness: Business;
  posts: Post[];
  socialAccounts: SocialAccount[];
  currentUser: User;
  usageLimits: UsageLimits;
  onNavigate: (tab: string) => void;
  onQuickGenerate: (prompt: string) => void;
  onViewPublicProfile: () => void;
  currency: 'XCD' | 'USD';
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  currentBusiness,
  posts,
  socialAccounts,
  currentUser,
  usageLimits,
  onNavigate,
  onQuickGenerate,
  onViewPublicProfile,
  currency,
}) => {
  const [quickPrompt, setQuickPrompt] = React.useState('');

  const totalFollowers = socialAccounts.reduce((sum, sa) => sum + (sa.connected ? sa.followerCount : 0), 0);
  const scheduledPosts = posts.filter((p) => p.status === 'SCHEDULED');
  const publishedPosts = posts.filter((p) => p.status === 'PUBLISHED');
  const profileSignals = [
    currentBusiness.name,
    currentBusiness.industry,
    currentBusiness.description,
    currentBusiness.location,
    currentBusiness.email,
    currentBusiness.website,
    currentBusiness.brandProfile?.brandVoice,
    currentBusiness.brandProfile?.targetAudience,
  ];
  const completedProfileSignals = profileSignals.filter((value) => String(value || '').trim()).length;
  const profileReadiness = Math.round((completedProfileSignals / profileSignals.length) * 100);
  const connectedChannels = socialAccounts.filter((account) => account.connected).length;
  const activitySignals = [profileReadiness >= 75, connectedChannels > 0, scheduledPosts.length > 0 || publishedPosts.length > 0];
  const workspaceReadiness = Math.round((activitySignals.filter(Boolean).length / activitySignals.length) * 100);

  const handlePromptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    onQuickGenerate(quickPrompt);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Welcome & AI Marketing Manager Header */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10">
          <div className="flex items-center gap-4">
            <img
              src={currentBusiness.logoUrl}
              alt={currentBusiness.name}
              className="w-16 h-16 rounded-2xl object-cover border-2 border-white/80 shadow-md bg-white"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black text-white tracking-tight">{currentBusiness.name}</h1>
                <span className="bg-orange-500 text-white text-[10px] px-2.5 py-0.5 rounded-full font-black uppercase tracking-wider">
                  {currentBusiness.plan} PLAN
                </span>
              </div>
              <p className="text-xs text-blue-200/90 mt-1 flex items-center gap-2 font-medium">
                <span>{currentBusiness.industry}</span>
                <span>•</span>
                <span>{currentBusiness.location}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => onNavigate('ai_brain')}
              className="px-4 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <Brain className="w-4 h-4" />
              <span>AI Business Brain</span>
            </button>
            <button
              onClick={onViewPublicProfile}
              className="px-4 py-2.5 bg-white/10 hover:bg-white/20 backdrop-blur-md border border-white/20 rounded-xl text-xs font-bold text-white flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-300" />
              <span>Storefront Preview</span>
            </button>
          </div>
        </div>
      </div>

      {/* Verified workspace readiness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between border border-slate-800">
          <div>
            <span className="text-[10px] font-black uppercase tracking-widest bg-cyan-500/20 text-cyan-200 px-2.5 py-1 rounded-full">
              Verified workspace signals
            </span>
            <h3 className="text-lg font-black text-white pt-3">Marketing readiness</h3>
            <p className="mt-1 text-xs leading-5 text-slate-400">Calculated only from information and activity currently stored in V79 Marketing.</p>
          </div>

          <div className="my-6 flex items-center justify-center">
            <div className="w-36 h-36 rounded-full border-8 border-cyan-500/20 flex flex-col items-center justify-center text-center bg-slate-900/80 shadow-inner">
              <span className="text-4xl font-black font-mono text-cyan-300">{workspaceReadiness}</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">/ 100 READY</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300"><span>Business profile</span><span className="font-bold text-white">{profileReadiness}%</span></div>
            <div className="flex justify-between text-slate-300"><span>Connected channels</span><span className="font-bold text-white">{connectedChannels}</span></div>
            <div className="flex justify-between text-slate-300"><span>Scheduled content</span><span className="font-bold text-white">{scheduledPosts.length}</span></div>
          </div>
        </div>

        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs">
          <div>
            <h3 className="font-black text-slate-900 text-lg">Recommended next actions</h3>
            <p className="text-xs text-slate-500">Based on gaps V79 can verify—not estimated reach or invented engagement.</p>
          </div>

          <div className="mt-5 space-y-3">
            {profileReadiness < 100 && (
              <button onClick={() => onNavigate('profile-builder')} className="w-full p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-200 text-left flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center"><Building2 className="w-4 h-4"/></div>
                  <div><div className="font-bold text-slate-900 text-xs">Complete your business profile</div><div className="text-[11px] text-slate-500">A complete profile improves the context used for campaign generation.</div></div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400"/>
              </button>
            )}
            {connectedChannels === 0 && (
              <button onClick={() => onNavigate('social-channels')} className="w-full p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-200 text-left flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center"><ExternalLink className="w-4 h-4"/></div>
                  <div><div className="font-bold text-slate-900 text-xs">Connect a verified marketing channel</div><div className="text-[11px] text-slate-500">Only official provider connections count as connected channels.</div></div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400"/>
              </button>
            )}
            {scheduledPosts.length === 0 && (
              <button onClick={() => onNavigate('ai-assistant')} className="w-full p-4 bg-slate-50 hover:bg-blue-50 rounded-2xl border border-slate-200 text-left flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center"><Sparkles className="w-4 h-4"/></div>
                  <div><div className="font-bold text-slate-900 text-xs">Build your next content item</div><div className="text-[11px] text-slate-500">Create content now; publishing remains queued until an official channel adapter is connected.</div></div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400"/>
              </button>
            )}
            {profileReadiness === 100 && connectedChannels > 0 && scheduledPosts.length > 0 && (
              <div className="p-4 bg-emerald-50 rounded-2xl border border-emerald-200 flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-emerald-700"/>
                <div><div className="font-bold text-emerald-900 text-xs">Core marketing workspace is ready</div><div className="text-[11px] text-emerald-700">Continue monitoring real campaign and customer activity.</div></div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick AI Generator Bar */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs relative overflow-hidden">
        <div className="bg-gradient-to-r from-blue-600 via-cyan-500 to-indigo-600 rounded-2xl p-6 text-white relative shadow-sm">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-cyan-100 mb-1">
            <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />
            <span>AI Marketing Assistant</span>
          </div>
          <h3 className="text-xl font-black text-white">Generate Social Content, Graphics & Captions in Seconds</h3>

          <form onSubmit={handlePromptSubmit} className="mt-4 flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="text"
                value={quickPrompt}
                onChange={(e) => setQuickPrompt(e.target.value)}
                placeholder="Describe the product, service, event or offer you want to promote..."
                className="w-full bg-white/20 border border-white/30 rounded-xl px-4 py-3 text-sm text-white placeholder-white/70 focus:outline-none focus:ring-2 focus:ring-white/50 backdrop-blur-sm font-medium"
              />
            </div>
            <button
              type="submit"
              className="px-6 py-3 bg-white text-blue-700 hover:bg-slate-50 font-black text-sm rounded-xl shadow-lg shadow-blue-900/20 transition-all flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-blue-600" />
              <span>Generate Content</span>
            </button>
          </form>
        </div>
      </div>

      {/* Workspace Quick Shortcuts Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-800 text-base">AI Marketing Suite Modules</h3>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 text-xs">
          <button
            onClick={() => onNavigate('ai_brain')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-purple-50 border border-slate-200 hover:border-purple-300 text-left space-y-1 transition-all group cursor-pointer"
          >
            <Brain className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-900">AI Business Brain</p>
            <p className="text-[10px] text-slate-500">Knowledge base</p>
          </button>

          <button
            onClick={() => onNavigate('ai-assistant')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-blue-50 border border-slate-200 hover:border-blue-300 text-left space-y-1 transition-all group cursor-pointer"
          >
            <Sparkles className="w-5 h-5 text-blue-600 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-900">AI Content</p>
            <p className="text-[10px] text-slate-500">Multi-channel copy</p>
          </button>

          <button
            onClick={() => onNavigate('ai-image')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-orange-50 border border-slate-200 hover:border-orange-300 text-left space-y-1 transition-all group cursor-pointer"
          >
            <ImageIcon className="w-5 h-5 text-orange-500 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-900">AI Image Studio</p>
            <p className="text-[10px] text-slate-500">Flyers & posters</p>
          </button>

          

          <button
            onClick={() => onNavigate('reviews')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-emerald-50 border border-slate-200 hover:border-emerald-300 text-left space-y-1 transition-all group cursor-pointer"
          >
            <MessageSquare className="w-5 h-5 text-emerald-600 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-900">Review Assistant</p>
            <p className="text-[10px] text-slate-500">Google & FB replies</p>
          </button>

          <button
            onClick={() => onNavigate('competitors')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 text-left space-y-1 transition-all group cursor-pointer"
          >
            <TrendingUp className="w-5 h-5 text-amber-600 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-900">Competitor Intel</p>
            <p className="text-[10px] text-slate-500">Market gaps</p>
          </button>
        </div>
      </div>
    </div>
  );
};

