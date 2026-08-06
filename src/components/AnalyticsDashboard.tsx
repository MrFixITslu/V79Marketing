import React, { useState } from 'react';
import { Business, Post } from '../types';
import {
  BarChart3,
  TrendingUp,
  Users,
  Eye,
  MousePointer,
  Share2,
  Calendar,
  Sparkles
} from 'lucide-react';

interface AnalyticsDashboardProps {
  business: Business;
  posts: Post[];
  currency: 'XCD' | 'USD';
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({
  business,
  posts,
  currency,
}) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>ROI & Engagement Analytics</span>
          </div>
          <h1 className="text-2xl font-black text-white">Marketing Performance Dashboard</h1>
          <p className="text-xs text-slate-400 mt-1">
            Real-time tracking of reach, audience growth, engagement rates & website clicks for {business.name}
          </p>
        </div>

        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['7d', '30d', '90d'] as const).map((range) => (
            <button
              key={range}
              onClick={() => setTimeRange(range)}
              className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${
                timeRange === range ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Last {range}
            </button>
          ))}
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Social Reach</span>
            <Eye className="w-4 h-4 text-orange-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">48,900</span>
            <span className="text-xs text-emerald-400 font-semibold">+22.4%</span>
          </div>
          <p className="text-[11px] text-slate-500">Unique user impressions</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Engagement Rate</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">8.6%</span>
            <span className="text-xs text-emerald-400 font-semibold">+3.1%</span>
          </div>
          <p className="text-[11px] text-slate-500">Likes, comments & shares</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Website & Store Clicks</span>
            <MousePointer className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">1,420</span>
            <span className="text-xs text-emerald-400 font-semibold">+14.8%</span>
          </div>
          <p className="text-[11px] text-slate-500">Direct referral traffic</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>WhatsApp Lead Inquiries</span>
            <Users className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">184</span>
            <span className="text-xs text-emerald-400 font-semibold">+18.0%</span>
          </div>
          <p className="text-[11px] text-slate-500">Direct message leads</p>
        </div>
      </div>

      {/* SVG Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* SVG Reach Trend Line Chart */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">30-Day Reach & Impression Trend</h3>
          <div className="h-64 w-full flex items-end justify-between gap-2 pt-8 px-2 relative border-b border-slate-800">
            {/* Background Grid Lines */}
            <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10">
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
              <div className="border-b border-white w-full" />
            </div>

            {/* SVG Wave */}
            <svg className="absolute inset-0 w-full h-full p-2" viewBox="0 0 500 150" preserveAspectRatio="none">
              <path
                d="M 0,120 Q 80,40 160,90 T 320,30 T 500,10 L 500,150 L 0,150 Z"
                fill="rgba(234, 88, 12, 0.15)"
              />
              <path
                d="M 0,120 Q 80,40 160,90 T 320,30 T 500,10"
                fill="none"
                stroke="#EA580C"
                strokeWidth="4"
              />
            </svg>

            <div className="relative z-10 w-full flex justify-between text-[10px] text-slate-500 pt-2 font-mono">
              <span>Aug 1</span>
              <span>Aug 8</span>
              <span>Aug 15</span>
              <span>Aug 22</span>
              <span>Today</span>
            </div>
          </div>
        </div>

        {/* Channel Breakdown Bar Chart */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Channel Performance Share</h3>
          <div className="space-y-3 pt-2">
            {[
              { channel: 'Instagram Business', reach: '18,400', pct: 85, color: 'bg-pink-500' },
              { channel: 'Facebook Page', reach: '14,200', pct: 68, color: 'bg-blue-500' },
              { channel: 'TikTok', reach: '12,100', pct: 58, color: 'bg-teal-500' },
              { channel: 'LinkedIn', reach: '2,900', pct: 25, color: 'bg-sky-500' },
              { channel: 'Google Business Profile', reach: '1,300', pct: 18, color: 'bg-amber-500' },
            ].map((c) => (
              <div key={c.channel} className="space-y-1">
                <div className="flex items-center justify-between text-xs text-slate-300">
                  <span className="font-semibold">{c.channel}</span>
                  <span className="font-mono text-slate-400">{c.reach} reach</span>
                </div>
                <div className="w-full bg-slate-950 h-2.5 rounded-full overflow-hidden">
                  <div className={`${c.color} h-full rounded-full transition-all duration-500`} style={{ width: `${c.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Best Performing Posts Table */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base">Top Performing Content</h3>
        <div className="space-y-3">
          {posts.map((post) => (
            <div
              key={post.id}
              className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs"
            >
              <div className="space-y-1">
                <h4 className="font-bold text-white text-sm">{post.title}</h4>
                <p className="text-slate-400 text-xs">
                  {post.content.facebook?.caption || post.content.instagram?.caption || 'Social post'}
                </p>
              </div>

              <div className="flex items-center gap-6 text-slate-300 font-mono text-xs">
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Reach</span>
                  <strong className="text-white">{post.analytics?.reach.toLocaleString() || '3,400'}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block uppercase">Clicks</span>
                  <strong className="text-amber-300">{post.analytics?.clicks || '88'}</strong>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
