import React, { useState } from 'react';
import { SeoHead } from './SeoHead';
import { UtmTrackingParams } from '../types';
import {
  Sparkles,
  Building2,
  Share2,
  Calendar,
  Layers,
  BarChart3,
  CheckCircle2,
  ArrowRight,
  ShieldCheck,
  Zap,
  Globe,
  HeartHandshake,
  Image as ImageIcon,
  MessageSquare,
  Award,
  Target,
  Gift,
  Check,
  ChevronRight,
  Users,
  Video
} from 'lucide-react';

interface LandingPageProps {
  onStartDemo: () => void;
  currency: 'XCD' | 'USD';
  onViewPricing: () => void;
  utmParams?: UtmTrackingParams | null;
}

export const LandingPage: React.FC<LandingPageProps> = ({
  onStartDemo,
  currency,
  onViewPricing,
  utmParams,
}) => {
  const [activeMockupTab, setActiveMockupTab] = useState<'create' | 'calendar' | 'health'>('create');

  return (
    <div className="bg-slate-50 text-slate-900 min-h-screen font-sans">
      <SeoHead
        title="V79 Marketing Hub | Simple Marketing Automation for Small Businesses"
        description="The intuitive digital marketing platform built for small business owners. Create social posts, design graphics, schedule content, and get more customers without marketing expertise."
        image="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 bg-gradient-to-b from-white via-slate-50 to-slate-100 border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-orange-100/80 border border-orange-200 text-orange-800 text-xs font-bold shadow-xs">
              <Sparkles className="w-3.5 h-3.5 text-orange-600" />
              <span>V79 Digital Platform • Built for Small & Micro Businesses</span>
            </div>

            {/* UTM Attribution Pill if present */}
            {utmParams && (utmParams.source || utmParams.campaign) && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-50 border border-teal-200 text-teal-800 text-xs font-mono font-medium shadow-xs">
                <Target className="w-3.5 h-3.5 text-teal-600" />
                <span>Attributed Campaign:</span>
                <span className="font-bold text-teal-900">
                  {utmParams.source || 'direct'} / {utmParams.campaign || 'default'}
                </span>
              </div>
            )}

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-slate-900 leading-tight">
              Get your business noticed{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-600 via-amber-500 to-teal-600">
                without being a marketing expert.
              </span>
            </h1>

            <p className="text-base sm:text-lg text-slate-600 font-normal leading-relaxed max-w-2xl mx-auto">
              V79 Marketing Hub acts as your digital marketing assistant. Create social promotions, design branded graphics, and schedule posts across Facebook, Instagram, TikTok, and WhatsApp in under 3 minutes.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <button
                onClick={onStartDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-600 hover:to-amber-600 text-white font-black text-base shadow-lg shadow-orange-500/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Start Free in 60 Seconds</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onViewPricing}
                className="w-full sm:w-auto px-6 py-4 rounded-2xl bg-white border border-slate-300 text-slate-800 font-bold text-base hover:bg-slate-50 shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>See Pricing ({currency === 'XCD' ? 'EC$' : '$'})</span>
              </button>
            </div>

            {/* Trust Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-500 font-semibold">
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> No credit card required</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Free monthly AI credits</span>
              <span className="flex items-center gap-1.5"><Check className="w-4 h-4 text-emerald-600" /> Caribbean & Global support</span>
            </div>
          </div>

          {/* Interactive Live App UI Mockup */}
          <div className="mt-12 max-w-5xl mx-auto rounded-3xl bg-white border border-slate-200/90 shadow-2xl p-4 sm:p-6 overflow-hidden">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400" />
                <div className="w-3 h-3 rounded-full bg-amber-400" />
                <div className="w-3 h-3 rounded-full bg-emerald-400" />
                <span className="text-xs font-mono font-bold text-slate-400 ml-2">v79marketing.com/dashboard</span>
              </div>
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-bold">
                <button
                  onClick={() => setActiveMockupTab('create')}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeMockupTab === 'create' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Zero-Prompt Creator
                </button>
                <button
                  onClick={() => setActiveMockupTab('calendar')}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeMockupTab === 'calendar' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Content Calendar
                </button>
                <button
                  onClick={() => setActiveMockupTab('health')}
                  className={`px-3 py-1 rounded-lg transition-colors ${activeMockupTab === 'health' ? 'bg-orange-500 text-white' : 'text-slate-600 hover:text-slate-900'}`}
                >
                  Marketing Health
                </button>
              </div>
            </div>

            {/* Mockup Display */}
            {activeMockupTab === 'create' && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 space-y-4 text-left">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-orange-600 uppercase">What are you promoting today?</span>
                  <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2.5 py-0.5 rounded-full">Guided Mode</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div className="p-3 bg-orange-500 text-white rounded-xl font-bold shadow-xs">1. Special Offer / Sale</div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold">2. Product / Dish</div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold">3. Live Event</div>
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-slate-700 font-semibold">4. Announcement</div>
                </div>
                <div className="p-4 bg-white rounded-xl border border-slate-200 text-xs space-y-2">
                  <div className="font-bold text-slate-900">Generated Instagram Caption:</div>
                  <p className="text-slate-600">"Golden hour at Isle Spice Grill hits different 🌅✨ 2-for-1 Rum Punch every Friday 5-7 PM. Reserve your waterfront table now! 🥂🔥"</p>
                </div>
              </div>
            )}

            {activeMockupTab === 'calendar' && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-3">
                <div className="flex items-center justify-between text-xs font-bold">
                  <span className="text-slate-900">Scheduled Posts for Isle Spice Grill</span>
                  <span className="text-blue-600">August 2026</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="p-3 bg-white rounded-xl border border-emerald-200 space-y-1">
                    <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">Friday 5:00 PM</span>
                    <p className="font-bold text-slate-900">Sunset Rum Punch Reel</p>
                    <p className="text-[10px] text-slate-500">Facebook & Instagram • 3.4k Reach</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-blue-200 space-y-1">
                    <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded">Sunday 12:00 PM</span>
                    <p className="font-bold text-slate-900">Waterfront Lobster Showcase</p>
                    <p className="text-[10px] text-slate-500">TikTok & WhatsApp Broadcast</p>
                  </div>
                  <div className="p-3 bg-white rounded-xl border border-purple-200 space-y-1">
                    <span className="bg-purple-100 text-purple-800 text-[10px] font-bold px-2 py-0.5 rounded">Next Wed 11:30 AM</span>
                    <p className="font-bold text-slate-900">Wood-Fired Jerk Ribs Promo</p>
                    <p className="text-[10px] text-slate-500">Google Business & LinkedIn</p>
                  </div>
                </div>
              </div>
            )}

            {activeMockupTab === 'health' && (
              <div className="bg-slate-50 rounded-2xl p-6 border border-slate-200 text-left space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-base">Marketing Health Score</h4>
                    <p className="text-xs text-slate-500">Calculated weekly based on consistency and customer responses</p>
                  </div>
                  <div className="text-3xl font-black text-emerald-600 font-mono">84 / 100</div>
                </div>
                <div className="p-3 bg-white rounded-xl border border-slate-200 text-xs space-y-1">
                  <span className="font-bold text-slate-900">Recommended Action Today:</span>
                  <p className="text-slate-600">Connect Google Business auto-responder to auto-reply to 14 customer reviews.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Outcome & Benefits Grid */}
      <section className="py-16 bg-white border-b border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900">
              Stop stressing over social media. Let V79 do the heavy lifting.
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Everything small business owners need to run consistent, high-converting marketing in one place.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-orange-500 text-white flex items-center justify-center font-bold">
                <Sparkles className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Zero Prompt Engineering</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Choose what you want to promote (Product, Sale, Event) and V79 generates customized captions for Facebook, Instagram, TikTok, and WhatsApp automatically.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center font-bold">
                <ImageIcon className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">Instant Graphic Studio</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Create promotional posters, flyers, and social banners formatted in 1080x1080 and 9:16 vertical stories with your brand colors and logo applied.
              </p>
            </div>

            <div className="p-6 rounded-3xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500 text-white flex items-center justify-center font-bold">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">WhatsApp Broadcast Promos</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                WhatsApp is the primary business connection channel. Send formatted promotional direct messages to turn repeat customers into loyal regulars.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple Pricing & Call to Action */}
      <section className="py-16 bg-slate-900 text-white">
        <div className="max-w-4xl mx-auto px-4 text-center space-y-8">
          <div className="space-y-3">
            <h2 className="text-3xl font-black text-white">Start growing your business today</h2>
            <p className="text-slate-300 text-sm max-w-xl mx-auto">
              Join small businesses elevating their brand and reaching more customers every week with V79 Marketing Hub.
            </p>
          </div>

          <button
            onClick={onStartDemo}
            className="px-10 py-5 rounded-2xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:scale-105 active:scale-95 transition-all text-white font-black text-lg shadow-xl cursor-pointer"
          >
            Launch Marketing Workspace Free →
          </button>
        </div>
      </section>
    </div>
  );
};
