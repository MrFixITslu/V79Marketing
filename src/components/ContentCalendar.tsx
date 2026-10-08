import React, { useMemo, useState } from 'react';
import { Post, PostDelivery, SocialPlatform } from '../types';
import {
  Calendar as CalendarIcon,
  Plus,
  Filter,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Clock3,
  Link2Off,
} from 'lucide-react';

interface ContentCalendarProps {
  posts: Post[];
  deliveries: PostDelivery[];
  onRetryDelivery: (delivery: PostDelivery) => Promise<void>;
  onSelectPost: (post: Post) => void;
  onCreateNewPost: () => void;
}

function isoDateLocal(year:number, month:number, day:number) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function scheduledLocalDateKey(value:string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return isoDateLocal(date.getFullYear(), date.getMonth(), date.getDate());
}

function statusClasses(status:PostDelivery['status']) {
  switch (status) {
    case 'PUBLISHED': return 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300';
    case 'AWAITING_CONNECTION': return 'border-amber-500/30 bg-amber-500/10 text-amber-300';
    case 'NEEDS_ACTION': return 'border-orange-500/30 bg-orange-500/10 text-orange-300';
    case 'FAILED': return 'border-red-500/30 bg-red-500/10 text-red-300';
    default: return 'border-sky-500/30 bg-sky-500/10 text-sky-300';
  }
}

function statusIcon(status:PostDelivery['status']) {
  if (status === 'PUBLISHED') return <CheckCircle2 className="h-3.5 w-3.5" />;
  if (status === 'AWAITING_CONNECTION') return <Link2Off className="h-3.5 w-3.5" />;
  if (status === 'FAILED' || status === 'NEEDS_ACTION') return <AlertTriangle className="h-3.5 w-3.5" />;
  return <Clock3 className="h-3.5 w-3.5" />;
}

export const ContentCalendar: React.FC<ContentCalendarProps> = ({
  posts,
  deliveries,
  onRetryDelivery,
  onSelectPost,
  onCreateNewPost,
}) => {
  const now = new Date();
  const [cursorMonth, setCursorMonth] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedPlatformFilter, setSelectedPlatformFilter] = useState<string>('all');
  const [retryingKey, setRetryingKey] = useState('');
  const [retryError, setRetryError] = useState('');

  const filteredPosts = posts.filter((p) => {
    if (selectedPlatformFilter === 'all') return true;
    return p.content[selectedPlatformFilter as SocialPlatform] !== undefined;
  });

  const year = cursorMonth.getFullYear();
  const month = cursorMonth.getMonth();
  const monthLabel = cursorMonth.toLocaleDateString(undefined, { month:'long', year:'numeric' });
  const totalDays = new Date(year, month + 1, 0).getDate();
  const firstDayMondayIndex = (new Date(year, month, 1).getDay() + 6) % 7;
  const cells = useMemo(
    () => [...Array(firstDayMondayIndex).fill(null), ...Array.from({ length:totalDays }, (_,index) => index + 1)],
    [firstDayMondayIndex, totalDays]
  );

  const recentDeliveries = deliveries.slice(0, 10);
  const unresolvedCount = deliveries.filter(item => item.status !== 'PUBLISHED').length;
  const publishedCount = deliveries.filter(item => item.status === 'PUBLISHED').length;

  const retry = async (delivery:PostDelivery) => {
    const key = `${delivery.postId}:${delivery.platform}`;
    setRetryingKey(key);
    setRetryError('');
    try {
      await onRetryDelivery(delivery);
    } catch (error) {
      setRetryError(error instanceof Error ? error.message : 'Could not retry provider delivery.');
    } finally {
      setRetryingKey('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <CalendarIcon className="w-4 h-4" />
            <span>Verified Multi-Channel Publishing Calendar</span>
          </div>
          <h1 className="text-2xl font-black text-white">Marketing Content Calendar</h1>
          <p className="text-sm text-slate-400 mt-1">
            Track scheduled posts and the real delivery result returned for each provider.
          </p>
        </div>

        <button
          onClick={onCreateNewPost}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Create & Schedule</span>
        </button>
      </div>

      <section className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-white">Provider delivery status</h2>
            <p className="mt-1 text-sm text-slate-400">
              {unresolvedCount} queued or requiring attention · {publishedCount} verified published deliveries
            </p>
          </div>
          <div className="text-xs text-slate-500">Refreshes automatically while this workspace is open.</div>
        </div>

        {retryError && (
          <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300">
            {retryError}
          </div>
        )}

        <div className="mt-4 space-y-2">
          {recentDeliveries.length === 0 && (
            <div className="rounded-xl border border-dashed border-slate-700 p-5 text-sm text-slate-400">
              No provider deliveries yet. Schedule a post to create the first delivery records.
            </div>
          )}

          {recentDeliveries.map(delivery => {
            const key = `${delivery.postId}:${delivery.platform}`;
            const retryable = ['FAILED','NEEDS_ACTION','AWAITING_CONNECTION'].includes(delivery.status);
            return (
              <div key={key} className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold text-white">{delivery.postTitle}</span>
                      <span className="rounded-full border border-slate-700 bg-slate-900 px-2 py-0.5 text-xs font-semibold capitalize text-slate-300">
                        {delivery.platform.replace('_',' ')}
                      </span>
                      <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-bold ${statusClasses(delivery.status)}`}>
                        {statusIcon(delivery.status)}
                        {delivery.status.replaceAll('_',' ')}
                      </span>
                    </div>
                    <div className="mt-2 text-xs text-slate-500">
                      Scheduled {new Date(delivery.scheduledFor).toLocaleString()}
                      {delivery.publishedAt ? ` · Published ${new Date(delivery.publishedAt).toLocaleString()}` : ''}
                    </div>
                    {delivery.lastError && (
                      <p className="mt-2 max-w-4xl text-sm leading-5 text-amber-200">{delivery.lastError}</p>
                    )}
                  </div>

                  {retryable && (
                    <button
                      type="button"
                      onClick={() => void retry(delivery)}
                      disabled={retryingKey === key}
                      className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-3 py-2 text-sm font-semibold text-slate-200 hover:border-slate-600 hover:bg-slate-800 disabled:opacity-50"
                    >
                      <RotateCcw className={`h-4 w-4 ${retryingKey === key ? 'animate-spin' : ''}`} />
                      Retry
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar text-xs">
        <span className="text-slate-500 font-bold flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Filter channel:
        </span>
        {['all', 'facebook', 'instagram', 'linkedin', 'tiktok', 'youtube', 'google_business', 'whatsapp'].map((ch) => (
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

      <div className="bg-slate-900 rounded-2xl p-3 sm:p-6 border border-slate-800 shadow-md">
        <div className="flex items-center justify-between mb-6 border-b border-slate-800 pb-4">
          <h3 className="font-bold text-white text-base">{monthLabel}</h3>
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <button
              onClick={() => setCursorMonth(new Date(year, month - 1, 1))}
              className="p-1.5 bg-slate-800 rounded-lg hover:text-white"
              aria-label="Previous month"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCursorMonth(new Date(now.getFullYear(), now.getMonth(), 1))}
              className="rounded-lg bg-slate-800 px-3 py-1.5 font-semibold hover:text-white"
            >
              Today
            </button>
            <button
              onClick={() => setCursorMonth(new Date(year, month + 1, 1))}
              className="p-1.5 bg-slate-800 rounded-lg hover:text-white"
              aria-label="Next month"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2 text-center text-[10px] sm:text-xs font-bold text-slate-400 uppercase tracking-wider">
          {['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map((day) => (
            <div key={day} className="py-2">{day}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1 sm:gap-2">
          {cells.map((dayNum, index) => {
            if (dayNum === null) {
              return <div key={`empty-${index}`} className="min-h-[72px] sm:min-h-[108px]" aria-hidden="true" />;
            }
            const dateStr = isoDateLocal(year, month, dayNum);
            const postsForDay = filteredPosts.filter((p) => scheduledLocalDateKey(p.scheduledFor) === dateStr);
            const isToday =
              dayNum === now.getDate() &&
              month === now.getMonth() &&
              year === now.getFullYear();

            return (
              <div
                key={dateStr}
                className={`min-h-[72px] sm:min-h-[108px] p-1 sm:p-2 rounded-lg sm:rounded-xl border text-xs flex flex-col transition-all ${
                  postsForDay.length > 0
                    ? 'bg-slate-950 border-slate-700 hover:border-orange-500'
                    : 'bg-slate-950/40 border-slate-800/80 hover:bg-slate-900'
                } ${isToday ? 'ring-1 ring-cyan-400/60' : ''}`}
              >
                <div className="flex items-center justify-between text-slate-500 text-[11px] font-bold">
                  <span className={isToday ? 'text-cyan-300' : ''}>{dayNum}</span>
                  {postsForDay.length > 0 && <span className="w-2 h-2 rounded-full bg-orange-500" />}
                </div>

                <div className="space-y-1 mt-1 sm:mt-2 flex-1 overflow-y-auto max-h-[52px] sm:max-h-[84px]">
                  {postsForDay.map((post) => (
                    <button
                      key={post.id}
                      onClick={() => onSelectPost(post)}
                      className="block w-full p-1 sm:p-1.5 rounded-md sm:rounded-lg bg-orange-500/10 border border-orange-500/30 text-left text-orange-300 font-semibold text-[9px] sm:text-[10px] truncate cursor-pointer hover:bg-orange-500/20"
                      title={post.title}
                    >
                      {post.title}
                    </button>
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
