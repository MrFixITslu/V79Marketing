import React, { useMemo, useState } from 'react';
import { Business, Post } from '../types';
import { BarChart3, Eye, MousePointer, MessageSquare, Send } from 'lucide-react';

interface AnalyticsDashboardProps {
  business: Business;
  posts: Post[];
  currency: 'XCD' | 'USD';
}

export const AnalyticsDashboard: React.FC<AnalyticsDashboardProps> = ({ business, posts }) => {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const days = Number(timeRange.replace('d', ''));

  const inRange = useMemo(() => {
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return posts.filter((post) => {
      const when = new Date(post.createdAt || post.scheduledFor).getTime();
      return Number.isFinite(when) && when >= cutoff;
    });
  }, [posts, days]);

  const verified = inRange.filter((post) => post.analytics && post.status === 'PUBLISHED');
  const totals = verified.reduce(
    (sum, post) => ({
      reach: sum.reach + Number(post.analytics?.reach || 0),
      impressions: sum.impressions + Number(post.analytics?.impressions || 0),
      engagement: sum.engagement + Number(post.analytics?.engagement || 0),
      clicks: sum.clicks + Number(post.analytics?.clicks || 0),
    }),
    { reach: 0, impressions: 0, engagement: 0, clicks: 0 },
  );
  const engagementRate = totals.impressions > 0 ? (totals.engagement / totals.impressions) * 100 : null;
  const topPosts = [...verified].sort((a, b) => Number(b.analytics?.engagement || 0) - Number(a.analytics?.engagement || 0)).slice(0, 10);

  const metrics = [
    { label: 'Verified reach', value: totals.reach.toLocaleString(), icon: Eye, note: 'Reported by connected providers' },
    { label: 'Impressions', value: totals.impressions.toLocaleString(), icon: Send, note: 'Reported by connected providers' },
    { label: 'Engagement rate', value: engagementRate == null ? '—' : `${engagementRate.toFixed(1)}%`, icon: MessageSquare, note: 'Engagement ÷ impressions' },
    { label: 'Clicks', value: totals.clicks.toLocaleString(), icon: MousePointer, note: 'Reported by connected providers' },
  ];

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 uppercase tracking-wider mb-1">
            <BarChart3 className="w-4 h-4" />
            <span>Verified marketing analytics</span>
          </div>
          <h1 className="text-2xl font-black text-white">Marketing Performance</h1>
          <p className="text-xs text-slate-400 mt-1">Only metrics stored from verified publishing/provider data are shown for {business.name}.</p>
        </div>
        <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          {(['7d','30d','90d'] as const).map((range) => (
            <button key={range} onClick={() => setTimeRange(range)} className={`px-3 py-1.5 rounded-lg font-bold transition-colors ${timeRange === range ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
              Last {range}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {metrics.map(({label,value,icon:Icon,note}) => (
          <div key={label} className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between text-slate-400 text-xs"><span>{label}</span><Icon className="w-4 h-4 text-orange-400"/></div>
            <div className="text-2xl font-black text-white">{value}</div>
            <p className="text-[11px] text-slate-500">{note}</p>
          </div>
        ))}
      </div>

      {verified.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <h2 className="font-bold text-slate-900">No verified performance data yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-slate-500">
            Drafts and queued posts do not create reach or engagement. Metrics will appear only after an official provider connection reports real results.
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Top verified content</h3>
          <div className="space-y-3">
            {topPosts.map((post) => (
              <div key={post.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 text-xs">
                <div>
                  <h4 className="font-bold text-white text-sm">{post.title}</h4>
                  <p className="mt-1 text-slate-500">{new Date(post.createdAt || post.scheduledFor).toLocaleDateString()}</p>
                </div>
                <div className="flex items-center gap-6 font-mono text-xs">
                  <div><span className="text-[10px] text-slate-500 block uppercase">Reach</span><strong className="text-white">{Number(post.analytics?.reach || 0).toLocaleString()}</strong></div>
                  <div><span className="text-[10px] text-slate-500 block uppercase">Engagement</span><strong className="text-white">{Number(post.analytics?.engagement || 0).toLocaleString()}</strong></div>
                  <div><span className="text-[10px] text-slate-500 block uppercase">Clicks</span><strong className="text-amber-300">{Number(post.analytics?.clicks || 0).toLocaleString()}</strong></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
