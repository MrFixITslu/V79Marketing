import React, { useState } from 'react';
import { CustomerReview, Business } from '../types';
import {
  MessageSquare,
  Star,
  Sparkles,
  CheckCircle2,
  Send,
  AlertTriangle,
  ThumbsUp,
  Share2,
  RefreshCw,
  Filter
} from 'lucide-react';

interface AiReviewAssistantViewProps {
  reviews: CustomerReview[];
  business: Business;
  onUpdateReviews: (reviews: CustomerReview[]) => void;
  onConvertToSocialPost: (review: CustomerReview) => void;
  onDeductCredits?: (amount: number, reason: string) => boolean;
}

export const AiReviewAssistantView: React.FC<AiReviewAssistantViewProps> = ({
  reviews,
  business,
  onUpdateReviews,
  onConvertToSocialPost,
  onDeductCredits,
}) => {
  const [reviewList, setReviewList] = useState<CustomerReview[]>(reviews);
  const [filterSentiment, setFilterSentiment] = useState<'ALL' | 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE'>('ALL');
  const [generatingId, setGeneratingId] = useState<string | null>(null);

  const filtered = reviewList.filter((r) => {
    if (filterSentiment === 'ALL') return true;
    return r.sentiment === filterSentiment;
  });

  const avgRating = (reviewList.reduce((sum, r) => sum + r.rating, 0) / reviewList.length).toFixed(1);

  const handleGenerateResponse = (reviewId: string) => {
    if (onDeductCredits && !onDeductCredits(15, 'AI Review Response Generation')) return;

    setGeneratingId(reviewId);
    setTimeout(() => {
      setReviewList((prev) =>
        prev.map((r) => {
          if (r.id === reviewId) {
            return {
              ...r,
              aiSuggestedResponse: `Warm greetings from ${business.name}! Thank you for your review. We take great pride in our wood-fired flavors and island hospitality. Looking forward to welcoming you back soon! 🌴✨`
            };
          }
          return r;
        })
      );
      setGeneratingId(null);
    }, 1000);
  };

  const handleSendResponse = (reviewId: string) => {
    setReviewList((prev) =>
      prev.map((r) => {
        if (r.id === reviewId) {
          return { ...r, responded: true };
        }
        return r;
      })
    );
    onUpdateReviews(reviewList);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300 uppercase tracking-widest bg-cyan-500/20 px-3 py-1 rounded-full w-fit">
              <MessageSquare className="w-4 h-4 text-cyan-300" />
              <span>AI Review Assistant & Sentiment Engine</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Customer Feedback & Reputation Hub
            </h1>
            <p className="text-xs sm:text-sm text-blue-200/90 max-w-2xl leading-relaxed">
              Import Google, Facebook, and TripAdvisor reviews. Automatically detect recurring feedback, reply in your authentic brand voice, and convert 5-star customer praise into high-converting social media posts.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/20 text-center min-w-[160px]">
            <div className="flex items-center justify-center gap-1 text-amber-400">
              <Star className="w-5 h-5 fill-amber-400" />
              <span className="text-2xl font-black text-white">{avgRating}</span>
              <span className="text-xs text-blue-200 font-bold">/ 5.0</span>
            </div>
            <p className="text-[11px] text-blue-200 mt-1 font-medium">{reviewList.length} Total Reviews Logged</p>
          </div>
        </div>
      </div>

      {/* Sentiment Analytics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Positive Sentiment</span>
            <p className="text-2xl font-black text-emerald-600 mt-1">
              {reviewList.filter((r) => r.sentiment === 'POSITIVE').length} Reviews
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ThumbsUp className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Constructive / Neutral</span>
            <p className="text-2xl font-black text-amber-600 mt-1">
              {reviewList.filter((r) => r.sentiment === 'NEUTRAL').length} Reviews
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
            <RefreshCw className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-slate-500 uppercase">Negative / Complaints</span>
            <p className="text-2xl font-black text-red-600 mt-1">
              {reviewList.filter((r) => r.sentiment === 'NEGATIVE').length} Reviews
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="flex items-center justify-between bg-white p-3 rounded-2xl border border-slate-200">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-700">
          <Filter className="w-4 h-4 text-slate-400" />
          <span>Filter Sentiment:</span>
          {(['ALL', 'POSITIVE', 'NEUTRAL', 'NEGATIVE'] as const).map((s) => (
            <button
              key={s}
              onClick={() => setFilterSentiment(s)}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                filterSentiment === s
                  ? 'bg-blue-600 text-white font-bold'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {s}
            </button>
          ))}
        </div>

        <span className="text-xs text-slate-400">
          Showing {filtered.length} of {reviewList.length} reviews
        </span>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filtered.map((rev) => (
          <div
            key={rev.id}
            className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4 hover:border-blue-200 transition-all"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center">
                  {rev.customerName[0]}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-sm">{rev.customerName}</h4>
                    <span className="text-[10px] font-bold text-slate-400 uppercase bg-slate-100 px-2 py-0.5 rounded">
                      {rev.platform.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 text-amber-400 mt-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3.5 h-3.5 ${
                          i < rev.rating ? 'fill-amber-400' : 'text-slate-200'
                        }`}
                      />
                    ))}
                    <span className="text-[11px] text-slate-400 font-semibold ml-1">
                      {new Date(rev.date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-full uppercase ${
                    rev.sentiment === 'POSITIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : rev.sentiment === 'NEUTRAL'
                      ? 'bg-amber-100 text-amber-800'
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {rev.sentiment}
                </span>

                {rev.rating >= 4 && (
                  <button
                    onClick={() => onConvertToSocialPost(rev)}
                    className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Create Social Post Flyer</span>
                  </button>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed italic bg-slate-50 p-3 rounded-2xl border border-slate-100">
              "{rev.comment}"
            </p>

            {/* AI Response Block */}
            <div className="pt-2 border-t border-slate-100 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                  <span>AI Suggested Official Response (15 Credits)</span>
                </span>

                {!rev.aiSuggestedResponse && (
                  <button
                    onClick={() => handleGenerateResponse(rev.id)}
                    disabled={generatingId === rev.id}
                    className="px-3 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs rounded-lg transition-colors cursor-pointer"
                  >
                    {generatingId === rev.id ? 'Generating...' : 'Generate Response'}
                  </button>
                )}
              </div>

              {rev.aiSuggestedResponse && (
                <div className="p-3 bg-blue-50/60 rounded-2xl border border-blue-200 space-y-3">
                  <textarea
                    rows={2}
                    value={rev.aiSuggestedResponse}
                    onChange={(e) => {
                      const val = e.target.value;
                      setReviewList((prev) =>
                        prev.map((r) => (r.id === rev.id ? { ...r, aiSuggestedResponse: val } : r))
                      );
                    }}
                    className="w-full bg-white border border-blue-200 rounded-xl p-2.5 text-xs text-slate-900"
                  />

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-blue-700 font-medium">
                      {rev.responded ? '✓ Response Published to Google/Facebook' : 'Ready to publish to platform'}
                    </span>

                    <button
                      onClick={() => handleSendResponse(rev.id)}
                      disabled={rev.responded}
                      className={`px-4 py-1.5 rounded-xl font-bold text-xs transition-all flex items-center gap-1.5 cursor-pointer ${
                        rev.responded
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-blue-600 hover:bg-blue-700 text-white shadow-xs'
                      }`}
                    >
                      {rev.responded ? (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Responded</span>
                        </>
                      ) : (
                        <>
                          <Send className="w-3.5 h-3.5" />
                          <span>Post Official Response</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
