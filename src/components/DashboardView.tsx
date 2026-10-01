import React from 'react';
import { Business, Post, SocialAccount, User, UsageLimits } from '../types';
import {
  ArrowRight,
  BarChart3,
  Brain,
  Building2,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Image as ImageIcon,
  Megaphone,
  MessageSquare,
  Radio,
  Sparkles,
  TrendingUp,
  Users,
  Zap,
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
  onNavigate,
  onQuickGenerate,
  onViewPublicProfile,
}) => {
  const [quickPrompt, setQuickPrompt] = React.useState('');

  const connectedChannels = socialAccounts.filter((account) => account.connected).length;
  const totalFollowers = socialAccounts.reduce(
    (sum, account) => sum + (account.connected ? Number(account.followerCount || 0) : 0),
    0,
  );
  const scheduledPosts = posts.filter((post) => post.status === 'SCHEDULED');
  const publishedPosts = posts.filter((post) => post.status === 'PUBLISHED');
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
  const activitySignals = [
    profileReadiness >= 75,
    connectedChannels > 0,
    scheduledPosts.length > 0 || publishedPosts.length > 0,
  ];
  const workspaceReadiness = Math.round((activitySignals.filter(Boolean).length / activitySignals.length) * 100);

  const handlePromptSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!quickPrompt.trim()) return;
    onQuickGenerate(quickPrompt);
  };

  const metrics = [
    {
      label: 'Workspace readiness',
      value: `${workspaceReadiness}%`,
      note: `${profileReadiness}% profile completion`,
      icon: CheckCircle2,
      accent: '#0A86FF',
      className: 'text-[#66caff]',
    },
    {
      label: 'Connected channels',
      value: connectedChannels.toLocaleString(),
      note: connectedChannels ? 'Verified provider connections' : 'No verified channel connected',
      icon: Radio,
      accent: '#FF7A00',
      className: 'text-[#ff9a3d]',
    },
    {
      label: 'Scheduled content',
      value: scheduledPosts.length.toLocaleString(),
      note: `${publishedPosts.length} published item${publishedPosts.length === 1 ? '' : 's'}`,
      icon: Calendar,
      accent: '#8B5CF6',
      className: 'text-[#b39aff]',
    },
    {
      label: 'Verified audience',
      value: totalFollowers.toLocaleString(),
      note: 'Followers from connected channels',
      icon: Users,
      accent: '#10B981',
      className: 'text-[#52e6c2]',
    },
  ];

  const actions = [
    ...(profileReadiness < 100
      ? [{
          title: 'Complete your business profile',
          detail: 'Better business context improves campaign and content generation.',
          tab: 'profile-builder',
          icon: Building2,
          iconClass: 'text-[#66caff]',
        }]
      : []),
    ...(connectedChannels === 0
      ? [{
          title: 'Connect a verified marketing channel',
          detail: 'Publishing and provider analytics require an official channel connection.',
          tab: 'social-channels',
          icon: ExternalLink,
          iconClass: 'text-[#ff9a3d]',
        }]
      : []),
    ...(scheduledPosts.length === 0
      ? [{
          title: 'Create your next content item',
          detail: 'Build content now and queue it for publishing when your channel is ready.',
          tab: 'ai-assistant',
          icon: Sparkles,
          iconClass: 'text-[#b39aff]',
        }]
      : []),
  ];

  return (
    <div className="space-y-4 pb-12">
      <section className="relative overflow-hidden rounded-[24px] border border-[#1a3854] bg-[#091728] shadow-[0_24px_70px_rgba(0,0,0,.24)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_78%_18%,rgba(255,122,0,.20),transparent_30%),radial-gradient(circle_at_92%_68%,rgba(124,58,237,.18),transparent_34%),radial-gradient(circle_at_20%_0%,rgba(10,134,255,.15),transparent_30%)]" />
        <div className="relative px-5 sm:px-7 py-6 flex flex-col xl:flex-row xl:items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div className="w-14 h-14 rounded-2xl overflow-hidden border border-white/10 bg-white shrink-0">
              <img src={currentBusiness.logoUrl} alt={currentBusiness.name} className="w-full h-full object-cover" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.2em] text-[#ff9a3d]">
                <Megaphone className="w-3.5 h-3.5" />
                Growth command center
              </div>
              <h1 className="mt-2 text-3xl sm:text-[38px] leading-tight font-black tracking-[-0.035em] text-white truncate">
                {currentBusiness.name}
              </h1>
              <p className="mt-1 text-sm text-slate-400">
                Campaign creation, customers, content and verified growth signals in one workspace.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => onNavigate('ai_brain')}
              className="px-4 py-2.5 rounded-xl border border-[#8B5CF6]/35 bg-[#8B5CF6]/12 text-[#c1adff] text-[10px] font-black uppercase tracking-wider hover:bg-[#8B5CF6]/20 transition-colors flex items-center gap-2"
            >
              <Brain className="w-4 h-4" />
              Business Brain
            </button>
            <button
              onClick={onViewPublicProfile}
              className="px-4 py-2.5 rounded-xl border border-[#1f4668] bg-[#07121f]/75 text-[#72ccff] text-[10px] font-black uppercase tracking-wider hover:bg-[#0d1e32] transition-colors flex items-center gap-2"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              Storefront
            </button>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {metrics.map(({ label, value, note, icon: Icon, accent, className }) => (
          <div key={label} className="relative overflow-hidden rounded-2xl border border-[#1a3854] bg-[#0a1727] p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2b5275]">
            <div className="absolute inset-0 opacity-45 pointer-events-none" style={{ background: `radial-gradient(circle at 100% 0%, ${accent}33, transparent 50%)` }} />
            <div className="relative">
              <div className="flex items-start justify-between">
                <div className="w-10 h-10 rounded-xl bg-[#07111f]/80 border border-white/10 flex items-center justify-center">
                  <Icon className={`w-5 h-5 ${className}`} />
                </div>
                <span className="text-[8px] font-black uppercase tracking-[0.15em] text-slate-600">Live</span>
              </div>
              <div className="mt-4 text-[9px] uppercase tracking-[0.14em] text-slate-600 font-bold">{label}</div>
              <div className="mt-1 text-[25px] leading-none font-black tracking-tight text-white">{value}</div>
              <div className="mt-2 text-[9px] text-slate-600">{note}</div>
            </div>
          </div>
        ))}
      </section>

      <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.15fr)_minmax(340px,.85fr)] gap-4">
        <div className="rounded-[22px] border border-[#1a3854] bg-[#091728] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#18324b]">
            <div className="flex items-center gap-2 text-[9px] font-black uppercase tracking-[0.18em] text-[#b39aff]">
              <Sparkles className="w-3.5 h-3.5" /> AI creation
            </div>
            <h2 className="mt-1.5 text-lg font-black text-white">Turn one idea into marketing content.</h2>
            <p className="mt-1 text-[10px] text-slate-500">Describe the product, service, event or offer you want to promote.</p>
          </div>
          <form onSubmit={handlePromptSubmit} className="p-5">
            <div className="rounded-2xl border border-[#284964] bg-[#07121f] p-2 flex flex-col sm:flex-row gap-2">
              <input
                type="text"
                value={quickPrompt}
                onChange={(event) => setQuickPrompt(event.target.value)}
                placeholder="Example: Promote our October small-business network support package..."
                className="flex-1 bg-transparent border-0 px-3 py-3 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:ring-0"
              />
              <button
                type="submit"
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-[#FF7A00] to-[#8B5CF6] text-white text-[10px] font-black uppercase tracking-wider shadow-[0_8px_28px_rgba(255,122,0,.14)] hover:brightness-110 transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                Create content
              </button>
            </div>
          </form>
        </div>

        <div className="rounded-[22px] border border-[#1a3854] bg-[#091728] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#18324b] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-white">Recommended next actions</h2>
              <p className="text-[10px] text-slate-500 mt-0.5">Based only on verified workspace gaps</p>
            </div>
            <Zap className="w-4 h-4 text-[#ff9a3d]" />
          </div>
          <div className="p-4 space-y-2">
            {actions.length ? actions.map(({ title, detail, tab, icon: Icon, iconClass }) => (
              <button
                key={title}
                onClick={() => onNavigate(tab)}
                className="w-full rounded-xl border border-[#18324b] bg-[#07121f] hover:border-[#2b5275] p-3 text-left flex items-start gap-3 transition-colors"
              >
                <div className="w-8 h-8 shrink-0 rounded-lg border border-white/10 bg-[#0b1a2c] flex items-center justify-center">
                  <Icon className={`w-4 h-4 ${iconClass}`} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-[11px] font-bold text-slate-200">{title}</div>
                  <div className="mt-1 text-[9px] text-slate-600 leading-relaxed">{detail}</div>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-600 mt-1" />
              </button>
            )) : (
              <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/[0.07] p-4 flex items-start gap-3">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 mt-0.5" />
                <div>
                  <div className="text-[11px] font-bold text-emerald-200">Core workspace is ready</div>
                  <div className="mt-1 text-[9px] text-slate-500">Continue monitoring real campaign and customer activity.</div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="rounded-[22px] border border-[#1a3854] bg-[#091728] overflow-hidden">
        <div className="px-5 py-4 border-b border-[#18324b] flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-white">Marketing workspace</h2>
            <p className="text-[10px] text-slate-500 mt-0.5">Jump directly into the tools you use most</p>
          </div>
          <BarChart3 className="w-4 h-4 text-[#66caff]" />
        </div>
        <div className="p-4 grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
          <WorkspaceTile onClick={() => onNavigate('one-idea-campaign')} icon={Megaphone} title="Campaign" note="One idea � campaign" accent="#FF7A00" />
          <WorkspaceTile onClick={() => onNavigate('ai-assistant')} icon={Sparkles} title="AI Content" note="Multi-channel copy" accent="#8B5CF6" />
          <WorkspaceTile onClick={() => onNavigate('ai-image')} icon={ImageIcon} title="Image Studio" note="Creative assets" accent="#0A86FF" />
          <WorkspaceTile onClick={() => onNavigate('customers')} icon={MessageSquare} title="Customers" note="Pipeline & inquiries" accent="#10B981" />
          <WorkspaceTile onClick={() => onNavigate('calendar')} icon={Calendar} title="Calendar" note="Publishing schedule" accent="#38BDF8" />
          <WorkspaceTile onClick={() => onNavigate('analytics')} icon={TrendingUp} title="Analytics" note="Verified performance" accent="#F59E0B" />
        </div>
      </section>

      <footer className="px-1 pt-1 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[9px] text-slate-700">
        <span>V79 Digital Marketing � From Idea to Advantage.</span>
        <span>Growth metrics are shown only when sourced from connected providers or stored workspace activity.</span>
      </footer>
    </div>
  );
};

function WorkspaceTile({
  onClick,
  icon: Icon,
  title,
  note,
  accent,
}: {
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  note: string;
  accent: string;
}) {
  return (
    <button
      onClick={onClick}
      className="group relative overflow-hidden rounded-2xl border border-[#1a3854] bg-[#07121f] p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-[#2b5275]"
    >
      <div className="absolute -right-8 -bottom-10 w-24 h-24 rounded-full blur-2xl opacity-20" style={{ backgroundColor: accent }} />
      <div className="relative">
        <div className="w-9 h-9 rounded-xl border border-white/10 bg-[#0b1a2c] flex items-center justify-center">
          <Icon className="w-4 h-4" style={{ color: accent } as React.CSSProperties} />
        </div>
        <div className="mt-3 text-[11px] font-black text-white">{title}</div>
        <div className="mt-1 text-[9px] text-slate-600">{note}</div>
      </div>
    </button>
  );
}