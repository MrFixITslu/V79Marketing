import React from 'react';
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
  Tag
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
  return (
    <div className="bg-slate-950 text-slate-100 min-h-screen">
      <SeoHead
        title="V79 Marketing Hub | All-In-One AI Marketing Suite for SMBs"
        description="The ultimate AI marketing workspace built for small business owners. Combine Canva graphics, Hootsuite social scheduling, Mailchimp email campaigns, and Wix digital storefronts."
        image="https://images.unsplash.com/photo-1557804506-669a67965ba0?auto=format&fit=crop&w=1200&q=80"
      />

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 border-b border-slate-800/80 bg-gradient-to-b from-slate-900 via-slate-950 to-slate-950">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-96 bg-gradient-to-r from-orange-500/10 via-amber-500/10 to-teal-500/10 blur-3xl pointer-events-none" />

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-3xl mx-auto space-y-6">
            <div className="inline-flex flex-wrap items-center justify-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>V79 Digital Platform • Built for SMBs & Caribbean Businesses</span>
            </div>

            {/* UTM Attribution Pill if present */}
            {utmParams && (utmParams.source || utmParams.campaign) && (
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 text-xs font-mono font-medium shadow-sm">
                <Target className="w-3.5 h-3.5 text-teal-400" />
                <span>Attributed Signup Source:</span>
                <span className="font-bold text-teal-200">
                  {utmParams.source || 'direct'} / {utmParams.medium || 'organic'} / {utmParams.campaign || 'default'}
                </span>
              </div>
            )}

            <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-white leading-tight">
              Your business online.{' '}
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-orange-400 via-amber-300 to-teal-400">
                Your brand everywhere.
              </span>
            </h1>

            <p className="text-lg text-slate-300 font-normal leading-relaxed">
              The all-in-one AI marketing suite designed for small business owners. Combine Canva graphics, Hootsuite scheduling, Mailchimp campaigns, and Wix digital storefronts into one affordable, simple workspace.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
              <button
                onClick={onStartDemo}
                className="w-full sm:w-auto px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-base shadow-xl hover:shadow-orange-500/20 hover:scale-105 transition-all flex items-center justify-center gap-2 group cursor-pointer"
              >
                <span>Launch Marketing Workspace</span>
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>

              <button
                onClick={onViewPricing}
                className="w-full sm:w-auto px-6 py-4 rounded-xl bg-slate-900 border border-slate-700 text-slate-200 font-semibold text-base hover:bg-slate-800 transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>View Plans ({currency === 'XCD' ? 'EC$' : '$'})</span>
              </button>
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center justify-center gap-6 pt-4 text-xs text-slate-400 font-medium">
              <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4 text-teal-400" /> Enterprise OWASP Security</span>
              <span className="flex items-center gap-1.5"><Zap className="w-4 h-4 text-amber-400" /> Gemini 3.6 AI Engine</span>
              <span className="flex items-center gap-1.5"><Globe className="w-4 h-4 text-orange-400" /> Multi-Tenant SaaS</span>
            </div>
          </div>


          {/* Interactive Feature Preview Card */}
          <div className="mt-12 max-w-5xl mx-auto rounded-2xl bg-slate-900/90 border border-slate-800 p-4 sm:p-8 shadow-2xl shadow-orange-500/5 backdrop-blur">
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4 text-left">
              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-orange-500/20 text-orange-400 flex items-center justify-center">
                  <Building2 className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Wix Business Profile</h3>
                <p className="text-xs text-slate-400">Mobile-friendly public storefront at v79marketing.com/business/:slug</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Sparkles className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">AI Copywriter</h3>
                <p className="text-xs text-slate-400">Generate Facebook, IG, TikTok & WhatsApp copy in 1 click.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-teal-500/20 text-teal-400 flex items-center justify-center">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Canva AI Studio</h3>
                <p className="text-xs text-slate-400">Generate square posts, 9:16 stories & banners with brand colors.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center">
                  <Calendar className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">Hootsuite Calendar</h3>
                <p className="text-xs text-slate-400">Drag-and-drop posting schedule across 6 major platforms.</p>
              </div>

              <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700/50 space-y-2">
                <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <Layers className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-white text-sm">30-Day Campaigns</h3>
                <p className="text-xs text-slate-400">AI builds a complete monthly marketing plan automatically.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Why Caribbean SMBs Choose V79 */}
      <section className="py-16 bg-slate-900/50 border-b border-slate-800/60">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Designed specifically for local growth & island hospitality
            </h2>
            <p className="text-sm text-slate-400 mt-2">
              From waterfront restaurants in St. Lucia to boutiques across the Caribbean, V79 Marketing Hub makes professional digital marketing accessible to everyone.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center">
                <HeartHandshake className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">Affordable Local Pricing</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Priced in Eastern Caribbean Dollars (EC$) starting at EC$0 for startups and EC$49/mo for full AI capabilities. No expensive US Dollar surprises.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                <MessageSquare className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">WhatsApp Promotion First</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                WhatsApp is the Caribbean’s #1 communication tool. Our AI creates dedicated WhatsApp broadcast promos alongside Facebook & Instagram posts.
              </p>
            </div>

            <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/20 text-teal-400 flex items-center justify-center">
                <Award className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-white">V79 Digital Ecosystem</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Seamlessly integrated with local payment support, domain routing, and multi-tenant user access control for team members.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Footer */}
      <section className="py-16 text-center bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-3xl mx-auto px-4 space-y-6">
          <h2 className="text-3xl font-extrabold text-white">Ready to automate your digital brand?</h2>
          <p className="text-slate-300 text-sm">
            Join hundreds of Caribbean and global small businesses elevating their brand today with V79 Marketing Hub.
          </p>
          <button
            onClick={onStartDemo}
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-base shadow-lg hover:scale-105 transition-transform cursor-pointer"
          >
            Get Started Now — Launch Workspace
          </button>
        </div>
      </section>
    </div>
  );
};
