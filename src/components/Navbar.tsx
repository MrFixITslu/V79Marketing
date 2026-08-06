import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Business, CreditBalance } from '../types';
import {
  Sparkles,
  Building2,
  Shield,
  Bell,
  ChevronDown,
  Globe,
  Calendar,
  Layers,
  BarChart3,
  CreditCard,
  Image as ImageIcon,
  Share2,
  Megaphone,
  KeyRound,
  ExternalLink,
  Brain,
  Video,
  MessageSquare,
  TrendingUp,
  Palette,
  Coins,
  Plus,
  Zap,
  LayoutGrid
} from 'lucide-react';

interface NavbarProps {
  currentUser: User;
  onSwitchUser: (user: User) => void;
  users: User[];
  currentBusiness: Business;
  creditBalance: CreditBalance;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  currency: 'XCD' | 'USD';
  setCurrency: (curr: 'XCD' | 'USD') => void;
  onOpenAuth: () => void;
  onViewPublicProfile: () => void;
  onOpenCreditStore: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onSwitchUser,
  users,
  currentBusiness,
  creditBalance,
  activeTab,
  setActiveTab,
  currency,
  setCurrency,
  onOpenAuth,
  onViewPublicProfile,
  onOpenCreditStore,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openGroupDropdown, setOpenGroupDropdown] = useState<string | null>(null);

  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenGroupDropdown(null);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const getRoleBadge = (role: UserRole) => {
    switch (role) {
      case 'PLATFORM_ADMIN':
        return <span className="bg-purple-100 text-purple-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Shield className="w-3 h-3" /> Admin</span>;
      case 'BUSINESS_OWNER':
        return <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Building2 className="w-3 h-3" /> Owner</span>;
      case 'MARKETING_STAFF':
        return <span className="bg-emerald-100 text-emerald-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Megaphone className="w-3 h-3" /> Marketing</span>;
      case 'CONTENT_CREATOR':
        return <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><ImageIcon className="w-3 h-3" /> Creator</span>;
    }
  };

  const totalCredits = creditBalance.monthlyAllowance + creditBalance.purchasedCredits + creditBalance.bonusCredits;
  const remainingCredits = Math.max(0, totalCredits - creditBalance.usedCredits);
  const creditPercent = Math.min(100, Math.round((remainingCredits / totalCredits) * 100));

  // Define logical grouped navigation hubs
  const navGroups = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: BarChart3,
      isSingle: true,
      tabId: 'dashboard',
    },
    {
      id: 'ai_studio',
      label: 'AI Studio',
      icon: Sparkles,
      badge: 'AI Powered',
      items: [
        { id: 'ai-assistant', label: 'AI Copy Generator', icon: Sparkles, desc: 'Captions, blogs & ad copy' },
        { id: 'ai-image', label: 'AI Image Studio', icon: ImageIcon, desc: 'Social posts & banner graphics' },
        { id: 'ai-video', label: 'AI Video Studio', icon: Video, badge: 'New', desc: 'Short-form Reels & TikToks' },
        { id: 'ai_brain', label: 'AI Business Brain', icon: Brain, badge: 'Knowledge', desc: 'Context & guidelines hub' },
      ],
    },
    {
      id: 'marketing_hub',
      label: 'Marketing Hub',
      icon: Layers,
      items: [
        { id: 'campaigns', label: 'Campaign Builder', icon: Layers, desc: 'Multi-channel campaigns' },
        { id: 'calendar', label: 'Content Calendar', icon: Calendar, desc: 'Scheduled posts overview' },
        { id: 'social-channels', label: 'Social Channels', icon: Share2, desc: 'Connected accounts' },
        { id: 'brand_kit', label: 'Brand Kit', icon: Palette, desc: 'Colors, logos & tone' },
      ],
    },
    {
      id: 'growth_intel',
      label: 'Growth & Intel',
      icon: TrendingUp,
      items: [
        { id: 'reviews', label: 'Review Assistant', icon: MessageSquare, desc: 'Google & Facebook responses' },
        { id: 'competitors', label: 'Competitor Intel', icon: TrendingUp, desc: 'Market benchmarking' },
      ],
    },
    {
      id: 'billing',
      label: 'Plans & Credits',
      icon: CreditCard,
      isSingle: true,
      tabId: 'billing',
    },
  ];

  // Helper to find which group is active
  const activeGroup = navGroups.find((g) => {
    if (g.isSingle) return g.tabId === activeTab;
    return g.items?.some((item) => item.id === activeTab);
  });

  return (
    <header className="bg-white border-b border-slate-200 text-slate-900 sticky top-0 z-50 shadow-xs">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 px-4 py-1 text-xs text-white flex items-center justify-between font-medium">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 px-2 py-0.5 rounded text-[10px] font-black tracking-wider uppercase">V79 DIGITAL</span>
          <span className="hidden sm:inline">Proactive AI Marketing Manager for SMBs</span>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setCurrency(currency === 'XCD' ? 'USD' : 'XCD')}
            className="hover:bg-white/10 flex items-center gap-1 bg-black/10 px-2.5 py-0.5 rounded text-xs transition-colors cursor-pointer"
          >
            <Globe className="w-3 h-3" /> Currency: <strong className="ml-1">{currency} ({currency === 'XCD' ? 'EC$' : '$'})</strong>
          </button>
          <button
            onClick={onViewPublicProfile}
            className="hover:underline flex items-center gap-1 font-bold text-amber-200 cursor-pointer"
          >
            <ExternalLink className="w-3 h-3" /> Public Storefront
          </button>
        </div>
      </div>

      {/* Main Navbar Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Tenant Selector */}
          <div className="flex items-center gap-3 sm:gap-5">
            <div
              onClick={() => setActiveTab('landing')}
              className="flex items-center gap-3 cursor-pointer group"
            >
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center font-black text-xl shadow-md shadow-blue-200 group-hover:scale-105 transition-transform text-white">
                V79
              </div>
              <div className="hidden sm:block">
                <span className="font-black text-lg tracking-tight text-slate-800">
                  Marketing Hub
                </span>
                <p className="text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                  AI Marketing Suite
                </p>
              </div>
            </div>

            {/* Tenant / Business Identifier */}
            <div className="hidden md:flex items-center gap-2 bg-slate-50 border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-700">
              <img
                src={currentBusiness.logoUrl}
                alt={currentBusiness.name}
                className="w-5 h-5 rounded-full object-cover border border-orange-500"
              />
              <span className="font-semibold truncate max-w-[130px] text-slate-800">{currentBusiness.name}</span>
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded font-bold">
                {currentBusiness.plan}
              </span>
            </div>
          </div>

          {/* V79 AI Credits Widget & User Profile */}
          <div className="flex items-center gap-3">
            {/* V79 AI Credits Badge */}
            <div
              onClick={onOpenCreditStore}
              className="flex items-center gap-2.5 bg-gradient-to-r from-amber-50 to-orange-50 hover:from-amber-100 hover:to-orange-100 border border-amber-200/80 rounded-xl px-3 py-1.5 text-xs text-slate-800 cursor-pointer shadow-xs transition-all group"
            >
              <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-xs group-hover:scale-105 transition-transform">
                <Coins className="w-4 h-4" />
              </div>
              <div className="text-left hidden sm:block">
                <div className="flex items-center gap-1">
                  <span className="font-black text-amber-900 font-mono">
                    {remainingCredits.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-amber-700 font-semibold">Credits</span>
                </div>
                <div className="w-20 bg-amber-200/60 rounded-full h-1 mt-0.5 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-amber-500 to-orange-500 h-1 rounded-full"
                    style={{ width: `${creditPercent}%` }}
                  />
                </div>
              </div>
              <button
                type="button"
                className="ml-1 px-2 py-0.5 rounded-lg bg-orange-600 text-white font-bold text-[10px] flex items-center gap-0.5 hover:bg-orange-700 shadow-xs transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>Top Up</span>
              </button>
            </div>

            {/* Quick Demo Role Switcher */}
            <div className="relative">
              <button
                onClick={() => setShowUserDropdown(!showUserDropdown)}
                className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-700 transition-colors cursor-pointer"
              >
                <img
                  src={currentUser.avatarUrl}
                  alt={currentUser.name}
                  className="w-6 h-6 rounded-full object-cover border border-amber-500"
                />
                <div className="text-left hidden xl:block">
                  <p className="font-semibold text-slate-800 leading-tight">{currentUser.name.split(' ')[0]}</p>
                  <p className="text-[10px] text-slate-500">{currentUser.role.replace('_', ' ')}</p>
                </div>
                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
              </button>

              {/* Role Switcher Modal Dropdown */}
              {showUserDropdown && (
                <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 text-xs">
                  <div className="px-3 py-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="font-semibold text-slate-800">Switch User Role (Demo Mode)</p>
                    <p className="text-[11px] text-slate-500">Test platform permissions by switching persona</p>
                  </div>
                  <div className="py-1">
                    {users.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => {
                          onSwitchUser(u);
                          setShowUserDropdown(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-slate-50 transition-colors ${
                          u.id === currentUser.id ? 'bg-blue-50/80 text-blue-700 font-semibold' : 'text-slate-700'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full" />
                          <div>
                            <p className="leading-tight text-slate-800 font-medium">{u.name}</p>
                            <p className="text-[10px] text-slate-400">{u.email}</p>
                          </div>
                        </div>
                        {getRoleBadge(u.role)}
                      </button>
                    ))}
                  </div>
                  <div className="border-t border-slate-100 pt-1 px-2">
                    <button
                      onClick={() => {
                        setShowUserDropdown(false);
                        onOpenAuth();
                      }}
                      className="w-full text-left px-2 py-1.5 text-slate-700 hover:text-slate-900 flex items-center gap-2 hover:bg-slate-50 rounded"
                    >
                      <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                      Security & Auth Settings
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Notifications Bell */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200 relative hover:bg-slate-100 transition-colors cursor-pointer"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full animate-ping" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-orange-500 rounded-full" />
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-xl p-3 z-50 text-xs">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-2">
                    <span className="font-semibold text-slate-800">System Notifications</span>
                    <span className="text-[10px] bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded font-bold">3 New</span>
                  </div>
                  <div className="space-y-2">
                    <div className="p-2 bg-slate-50 rounded border-l-2 border-orange-500">
                      <p className="font-medium text-slate-800">Emancipation Event Radar</p>
                      <p className="text-[11px] text-slate-500">Suggested campaign ready for Caribbean Cultural Feast</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border-l-2 border-blue-500">
                      <p className="font-medium text-slate-800">AI Weekly Health Report</p>
                      <p className="text-[11px] text-slate-500">Marketing score updated to 84/100 (+4 pts)</p>
                    </div>
                    <div className="p-2 bg-slate-50 rounded border-l-2 border-emerald-500">
                      <p className="font-medium text-slate-800">5-Star Google Review</p>
                      <p className="text-[11px] text-slate-500">Marcus Thorne left a review — AI response generated</p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Clean, Grouped Nav Bar (No Scrollbar, Uncluttered) */}
        <div className="border-t border-slate-100 py-2 relative" ref={dropdownRef}>
          <nav className="flex items-center justify-between sm:justify-start gap-1 sm:gap-2 no-scrollbar text-xs">
            {navGroups.map((group) => {
              const Icon = group.icon;
              const isGroupActive = activeGroup?.id === group.id;

              if (group.isSingle && group.tabId) {
                return (
                  <button
                    key={group.id}
                    onClick={() => {
                      setActiveTab(group.tabId);
                      setOpenGroupDropdown(null);
                    }}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                      activeTab === group.tabId
                        ? 'bg-blue-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{group.label}</span>
                  </button>
                );
              }

              const isOpen = openGroupDropdown === group.id;

              return (
                <div key={group.id} className="relative">
                  <button
                    onClick={() => setOpenGroupDropdown(isOpen ? null : group.id)}
                    className={`flex items-center gap-1.5 px-3 py-2 rounded-xl font-semibold transition-all cursor-pointer ${
                      isGroupActive
                        ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100/80'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isGroupActive ? 'text-blue-600' : 'text-slate-500'}`} />
                    <span>{group.label}</span>
                    {group.badge && (
                      <span className="bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-0.5">
                        {group.badge}
                      </span>
                    )}
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform ${
                        isOpen ? 'rotate-180 text-blue-600' : ''
                      }`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isOpen && group.items && (
                    <div className="absolute left-0 mt-2 w-64 bg-white border border-slate-200 rounded-2xl shadow-xl p-2 z-50 text-xs animate-in fade-in zoom-in-95 duration-150">
                      <div className="px-3 py-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1 flex items-center justify-between">
                        <span>{group.label} Tools</span>
                        <Zap className="w-3 h-3 text-amber-500" />
                      </div>
                      <div className="space-y-1">
                        {group.items.map((subItem) => {
                          const SubIcon = subItem.icon;
                          const isSubActive = activeTab === subItem.id;
                          return (
                            <button
                              key={subItem.id}
                              onClick={() => {
                                setActiveTab(subItem.id);
                                setOpenGroupDropdown(null);
                              }}
                              className={`w-full text-left p-2.5 rounded-xl flex items-start gap-3 transition-colors cursor-pointer ${
                                isSubActive
                                  ? 'bg-blue-50 text-blue-800 font-bold border border-blue-200/60'
                                  : 'text-slate-700 hover:bg-slate-50 hover:text-slate-900'
                              }`}
                            >
                              <div
                                className={`p-1.5 rounded-lg mt-0.5 ${
                                  isSubActive
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                <SubIcon className="w-4 h-4" />
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center justify-between">
                                  <span className="font-semibold text-slate-900 leading-tight">
                                    {subItem.label}
                                  </span>
                                  {subItem.badge && (
                                    <span className="bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-[9px] px-1.5 py-0.2 rounded-full font-bold ml-1">
                                      {subItem.badge}
                                    </span>
                                  )}
                                </div>
                                <p className="text-[11px] text-slate-400 font-normal leading-normal truncate mt-0.5">
                                  {subItem.desc}
                                </p>
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </nav>

          {/* Quick Sub-Pills Ribbon for Active Hub (1-Click Switch between Sibling Tools) */}
          {activeGroup && !activeGroup.isSingle && activeGroup.items && (
            <div className="flex items-center gap-1.5 mt-2 pt-2 border-t border-slate-100/80 no-scrollbar overflow-x-hidden text-xs">
              <span className="text-[11px] font-semibold text-slate-400 flex items-center gap-1 mr-1">
                <LayoutGrid className="w-3 h-3 text-slate-400" />
                {activeGroup.label}:
              </span>
              <div className="flex items-center gap-1.5 flex-wrap no-scrollbar">
                {activeGroup.items.map((sub) => {
                  const SubIcon = sub.icon;
                  const isSubActive = activeTab === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => setActiveTab(sub.id)}
                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                        isSubActive
                          ? 'bg-slate-900 text-white font-bold shadow-xs scale-[1.02]'
                          : 'bg-slate-100/90 text-slate-600 hover:bg-slate-200 hover:text-slate-900'
                      }`}
                    >
                      <SubIcon className={`w-3 h-3 ${isSubActive ? 'text-amber-400' : 'text-slate-500'}`} />
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
