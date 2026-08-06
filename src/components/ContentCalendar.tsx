import React, { useState } from 'react';
import { Post, SocialPlatform } from '../types';
import {
  Calendar as CalendarIcon,
  Clock,
  Plus,
  Filter,
  CheckCircle2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  Share2,
  Sparkles
} from 'lucide-react';

interface ContentCalendarProps {
  posts: Post[];
  onSelectPost: (post: Post) => void;
  onCreateNewPost: () => void;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
  posts,
  onSelectPost,
  onCreateNewPost,
}) => {
  const [viewMode, setViewMode] = useState<'monthly' | 'weekly' | 'timeline'>('monthly');
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');

  const filteredPosts = posts.filter((p) => {
    if (selectedPlatformFilter === 'all') return true;
    return p.content[selectedPlatformFilter as SocialPlatform] !== undefined;
  });

  const daysOfWeek = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span>Multi-Channel Publisher Calendar</span>
          </div>
          <h1 className="text-2xl font-black text-white">Marketing Content Calendar</h1>
          <p className="text-xs text-slate-400 mt-1">
            Schedule, manage and automate posts across all 6 social channels
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                viewMode === 'monthly' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Month View
            </button>
            <button
              onClick={() => setViewMode('weekly')}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                viewMode === 'weekly' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Week View
            </button>
          </div>

          <button
            onClick={onCreateNewPost}
            className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Create & Schedule</span>
          </button>
        </div>
      </div>

      {/* Channel Filters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs">
        <span className="text-slate-500 font-bold flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter Channel:
        </span>
        {['all', 'facebook', 'instagram', 'linkedin', 'tiktok', 'whatsapp', 'google_business'].map((ch) => (
          <button
            key={ch}
            onClick={() => setSelectedPlatformFilter(ch)}
            className={`px-3 py-1.5 rounded-full font-semibold capitalize whitespace-nowrap transition-all ${
              selectedPlatformFilter === ch
                ? 'bg-amber-400/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-900 text-slate-400 border border-slate-800 hover:bg-slate-800'
            }`}
          >
            {ch.replace('_', ' ')}
          </button>
        ))}
      </div>

      {/* Calendar Grid View */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <h3 className="font-bold text-white text-base">August 2026 Schedule</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button className="p-1.5 bg-slate-800 rounded-lg hover:text-white"><ChevronLeft className="w-4 h-4" /></button>
            <span className="font-bold text-slate-200">August 2026</span>
            <button className="p-1.5 bg-slate-800 rounded-lg hover:text-white"><ChevronRight className="w-4 h-4" /></button>
          </div>
        </div>

        {/* Days Header */}
        <div className="grid grid-cols-7 gap-2 mb-2 text-center text-xs font-bold text-slate-400 uppercase tracking-wider">
          {daysOfWeek.map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        {/* Monthly Grid Mock */}
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 31 }).map((_, i) => {
            const dayNum = i + 1;
            const dateStr = `2026-08-${dayNum < 10 ? '0' + dayNum : dayNum}`;
            const postsForDay = filteredPosts.filter((p) => p.scheduledFor.startsWith(dateStr));

            return (
              <div
                key={i}
                className={`min-h-[100px] p-2 rounded-xl border text-xs flex flex-col justify-between transition-all ${
                  postsForDay.length > 0
                    ? 'bg-slate-950 border-slate-700 hover:border-orange-500'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900'
                }`}
              >
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                  <span>{dayNum}</span>
                  {postsForDay.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                  )}
                </div>

                <div className="space-y-1 mt-1 flex-1 overflow-y-auto max-h-[80px]">
                  {postsForDay.map((post) => (
                    <div
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className="p-1.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-300 font-semibold text-[10px] truncate cursor-pointer hover:bg-orange-500/20"
                    >
                      {post.title}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
