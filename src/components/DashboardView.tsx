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

      {/* Marketing Score & Priority AI Tasks Widget */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Score Radial Card */}
        <div className="lg:col-span-4 bg-gradient-to-br from-slate-900 to-indigo-950 rounded-3xl p-6 text-white shadow-xl flex flex-col justify-between border border-slate-800 relative overflow-hidden">
          <div className="space-y-1">
            <span className="text-[10px] font-black uppercase tracking-widest bg-emerald-500/20 text-emerald-300 px-2.5 py-1 rounded-full">
              AI Marketing Health Engine
            </span>
            <h3 className="text-lg font-black text-white pt-2">Overall Marketing Score</h3>
          </div>

          <div className="my-6 flex items-center justify-center relative">
            <div className="w-36 h-36 rounded-full border-8 border-emerald-500/20 flex flex-col items-center justify-center text-center relative bg-slate-900/80 shadow-inner">
              <span className="text-4xl font-black font-mono text-emerald-400">84</span>
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-0.5">/ 100 HEALTH</span>
            </div>
          </div>

          <div className="space-y-2 text-xs">
            <div className="flex justify-between text-slate-300 font-medium">
              <span>Brand Completeness</span>
              <span className="font-bold text-emerald-400">92%</span>
            </div>
            <div className="flex justify-between text-slate-300 font-medium">
              <span>Posting Consistency</span>
              <span className="font-bold text-emerald-400">85%</span>
            </div>
            <div className="flex justify-between text-slate-300 font-medium">
              <span>Review Activity</span>
              <span className="font-bold text-emerald-400">88%</span>
            </div>
          </div>
        </div>

        {/* Priority AI Tasks Card */}
        <div className="lg:col-span-8 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-black text-slate-900 text-lg">AI Priority Recommended Actions</h3>
              <p className="text-xs text-slate-500">Complete tasks to improve your marketing health score</p>
            </div>
            <span className="bg-amber-100 text-amber-800 font-bold text-xs px-3 py-1 rounded-full">
              +750 Potential Bonus Credits
            </span>
          </div>

          <div className="space-y-3">
            <div
              onClick={() => onNavigate('reviews')}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100 text-blue-700 flex items-center justify-center font-bold">
                  <MessageSquare className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Connect Google Business review auto-responder</h4>
                  <p className="text-[11px] text-slate-500">14 unhandled customer reviews awaiting response</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                +150 Credits
              </span>
            </div>

            <div
              onClick={() => onNavigate('ai-assistant')}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-purple-100 text-purple-700 flex items-center justify-center font-bold">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Generate 30-Day Saint Lucia Creole Month Campaign</h4>
                  <p className="text-[11px] text-slate-500">Automated 30-day posting schedule for Caribbean event</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                +300 Credits
              </span>
            </div>

            <div
              onClick={() => onNavigate('ai-video')}
              className="p-3.5 bg-slate-50 hover:bg-blue-50/60 rounded-2xl border border-slate-200 hover:border-blue-300 transition-all cursor-pointer flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-pink-100 text-pink-700 flex items-center justify-center font-bold">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-xs">Publish vertical Video Reel for Friday Sunset Happy Hour</h4>
                  <p className="text-[11px] text-slate-500">Boost engagement on Instagram Reels & TikTok</p>
                </div>
              </div>
              <span className="text-xs font-bold text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                +200 Credits
              </span>
            </div>
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
                placeholder="Describe your campaign e.g., 2-for-1 Rum Punch Sunset Happy Hour this Friday..."
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
            onClick={() => onNavigate('ai-video')}
            className="p-3.5 rounded-2xl bg-slate-50 hover:bg-pink-50 border border-slate-200 hover:border-pink-300 text-left space-y-1 transition-all group cursor-pointer"
          >
            <Video className="w-5 h-5 text-pink-600 group-hover:scale-110 transition-transform" />
            <p className="font-bold text-slate-900">AI Video Studio</p>
            <p className="text-[10px] text-slate-500">9:16 Reels & TikTok</p>
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

