import React, { useState, useRef, useEffect } from 'react';
import { User, UserRole, Business, CreditBalance, InAppNotification, NotificationCategory } from '../types';
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
  LayoutGrid,
  CheckCheck,
  Trash2,
  AlertTriangle,
  Trophy,
  Star,
  X
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
  notifications?: InAppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearNotification?: (id: string) => void;
  onSimulateNotification?: (category: NotificationCategory) => void;
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
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearNotification,
  onSimulateNotification,
}) => {
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [openGroupDropdown, setOpenGroupDropdown] = useState<string | null>(null);
  const [notifFilter, setNotifFilter] = useState<'all' | 'unread' | 'CAMPAIGN_MILESTONE' | 'LOW_CREDIT' | 'NEW_REVIEW'>('all');

  const dropdownRef = useRef<HTMLDivElement>(null);
  const notifRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpenGroupDropdown(null);
      }
      if (notifRef.current && !notifRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const unreadCount = notifications.filter((n) => !n.read).length;

  const filteredNotifications = notifications.filter((n) => {
    if (notifFilter === 'unread') return !n.read;
    if (notifFilter === 'CAMPAIGN_MILESTONE') return n.category === 'CAMPAIGN_MILESTONE';
    if (notifFilter === 'LOW_CREDIT') return n.category === 'LOW_CREDIT';
    if (notifFilter === 'NEW_REVIEW') return n.category === 'NEW_REVIEW';
    return true;
  });

  const formatRelativeTime = (isoString: string) => {
    const diff = Math.max(0, Math.floor((Date.now() - new Date(isoString).getTime()) / 1000));
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  };

  const getCategoryIcon = (category: NotificationCategory) => {
    switch (category) {
      case 'CAMPAIGN_MILESTONE':
        return <Trophy className="w-4 h-4 text-emerald-500" />;
      case 'LOW_CREDIT':
        return <AlertTriangle className="w-4 h-4 text-amber-500" />;
      case 'NEW_REVIEW':
        return <Star className="w-4 h-4 text-amber-400 fill-amber-400" />;
      default:
        return <Bell className="w-4 h-4 text-blue-500" />;
    }
  };

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

  // Define logical grouped navigation hubs aligned with Growth Platform architecture
  const navGroups = [
    {
      id: 'home',
      label: 'Home',
      icon: BarChart3,
      isSingle: true,
      tabId: 'dashboard',
    },
    {
      id: 'create_hub',
      label: 'Create',
      icon: Sparkles,
      badge: '1-Click',
      items: [
        { id: 'one-idea-campaign', label: 'One Idea → Campaign', icon: Layers, badge: 'Popular', desc: 'Single prompt to full campaign' },
        { id: 'ai-assistant', label: 'Zero-Prompt Creator', icon: Sparkles, desc: 'Guided post & promo captions' },
        { id: 'ai-image', label: 'Graphic Studio', icon: ImageIcon, desc: 'Social posters & banners' },
        { id: 'ai-video', label: 'Short Video Reels', icon: Video, desc: 'Vertical 9:16 TikTok & IG Reels' },
      ],
    },
    {
      id: 'calendar',
      label: 'Calendar',
      icon: Calendar,
      isSingle: true,
      tabId: 'calendar',
    },
    {
      id: 'customers_hub',
      label: 'Customers',
      icon: MessageSquare,
      items: [
        { id: 'customers', label: 'Customer Pipeline', icon: MessageSquare, badge: 'CRM', desc: 'Inquiries & WhatsApp messaging' },
        { id: 'reviews', label: 'Review Management', icon: Star, desc: 'Google & Facebook replies' },
      ],
    },
    {
      id: 'growth_hub',
      label: 'Growth',
      icon: TrendingUp,
      items: [
        { id: 'analytics', label: 'Simple Analytics', icon: BarChart3, desc: 'People reached & top posts' },
        { id: 'competitors', label: 'Market Benchmarks', icon: TrendingUp, desc: 'Competitor opportunity gaps' },
        { id: 'campaigns', label: '30-Day Growth Plans', icon: Layers, desc: 'Multi-week growth roadmaps' },
      ],
    },
    {
      id: 'business_hub',
      label: 'Business',
      icon: Building2,
      items: [
        { id: 'profile-builder', label: 'Business Profile', icon: Building2, desc: 'Public info, products & hours' },
        { id: 'ai_brain', label: 'Business Memory', icon: Brain, desc: 'Knowledge, FAQs & USPs' },
        { id: 'brand_kit', label: 'Brand Kit', icon: Palette, desc: 'Colors, logo & voice guidelines' },
        { id: 'billing', label: 'Plans & Credits', icon: CreditCard, desc: 'AI credit balance & top-ups' },
      ],
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

            {/* Notifications Bell & Popover Center */}
            <div className="relative" ref={notifRef}>
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-600 hover:text-slate-900 bg-slate-50 rounded-lg border border-slate-200 relative hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="View notifications"
              >
                <Bell className="w-4 h-4" />
                {unreadCount > 0 && (
                  <>
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-orange-500 rounded-full animate-ping" />
                    <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-orange-600 text-white font-bold text-[10px] rounded-full flex items-center justify-center border-2 border-white shadow-xs">
                      {unreadCount}
                    </span>
                  </>
                )}
              </button>

              {showNotifications && (
                <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-150">
                  {/* Popover Header */}
                  <div className="p-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Bell className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-sm tracking-tight">Notifications</span>
                      {unreadCount > 0 && (
                        <span className="bg-orange-500/30 border border-orange-400/40 text-orange-200 text-[10px] px-2 py-0.5 rounded-full font-bold">
                          {unreadCount} unread
                        </span>
                      )}
                    </div>
                    {unreadCount > 0 && onMarkAllNotificationsRead && (
                      <button
                        onClick={onMarkAllNotificationsRead}
                        className="text-[11px] text-amber-300 hover:text-amber-100 flex items-center gap-1 font-medium hover:underline cursor-pointer"
                      >
                        <CheckCheck className="w-3.5 h-3.5" />
                        Mark all read
                      </button>
                    )}
                  </div>

                  {/* Category Filter Pills */}
                  <div className="px-3 py-2 bg-slate-50 border-b border-slate-100 flex items-center gap-1.5 overflow-x-auto no-scrollbar text-[11px]">
                    <button
                      onClick={() => setNotifFilter('all')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notifFilter === 'all'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      All ({notifications.length})
                    </button>
                    <button
                      onClick={() => setNotifFilter('unread')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notifFilter === 'unread'
                          ? 'bg-slate-900 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Unread ({unreadCount})
                    </button>
                    <button
                      onClick={() => setNotifFilter('CAMPAIGN_MILESTONE')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notifFilter === 'CAMPAIGN_MILESTONE'
                          ? 'bg-emerald-700 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Milestones
                    </button>
                    <button
                      onClick={() => setNotifFilter('LOW_CREDIT')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notifFilter === 'LOW_CREDIT'
                          ? 'bg-amber-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Alerts
                    </button>
                    <button
                      onClick={() => setNotifFilter('NEW_REVIEW')}
                      className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                        notifFilter === 'NEW_REVIEW'
                          ? 'bg-indigo-600 text-white'
                          : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Reviews
                    </button>
                  </div>

                  {/* Notification List */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-100">
                    {filteredNotifications.length === 0 ? (
                      <div className="p-8 text-center text-slate-400">
                        <Bell className="w-8 h-8 mx-auto mb-2 opacity-30 text-slate-500" />
                        <p className="font-semibold text-slate-700">No notifications found</p>
                        <p className="text-[11px] text-slate-400 mt-0.5">You're all caught up!</p>
                      </div>
                    ) : (
                      filteredNotifications.map((n) => (
                        <div
                          key={n.id}
                          onClick={() => {
                            if (!n.read && onMarkNotificationRead) {
                              onMarkNotificationRead(n.id);
                            }
                            if (n.actionTab) {
                              setActiveTab(n.actionTab);
                              setShowNotifications(false);
                            }
                          }}
                          className={`p-3 transition-colors cursor-pointer relative group flex items-start gap-3 ${
                            n.read
                              ? 'bg-white hover:bg-slate-50 text-slate-600'
                              : 'bg-orange-50/40 hover:bg-orange-50/80 text-slate-900 border-l-3 border-orange-500'
                          }`}
                        >
                          <div className="mt-0.5 p-1.5 rounded-lg bg-slate-100 border border-slate-200/60 shrink-0">
                            {getCategoryIcon(n.category)}
                          </div>
                          <div className="flex-1 min-w-0 pr-6">
                            <div className="flex items-center justify-between gap-1">
                              <p className={`font-semibold text-xs truncate ${n.read ? 'text-slate-700' : 'text-slate-900'}`}>
                                {n.title}
                              </p>
                              <span className="text-[10px] text-slate-400 shrink-0">
                                {formatRelativeTime(n.timestamp)}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed">
                              {n.message}
                            </p>
                            {n.actionTab && (
                              <span className="inline-block mt-1 text-[10px] font-bold text-blue-600 hover:underline">
                                View in {n.actionTab} →
                              </span>
                            )}
                          </div>

                          {/* Delete/Clear Button */}
                          {onClearNotification && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onClearNotification(n.id);
                              }}
                              className="absolute top-2 right-2 p-1 text-slate-300 hover:text-red-500 rounded transition-colors opacity-0 group-hover:opacity-100"
                              title="Dismiss notification"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      ))
                    )}
                  </div>

                  {/* Real-time Notification Tester Toolbar */}
                  {onSimulateNotification && (
                    <div className="p-2.5 bg-slate-100/80 border-t border-slate-200 text-[10px]">
                      <p className="font-bold text-slate-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-500" /> Simulate Real-time Events:
                      </p>
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <button
                          onClick={() => onSimulateNotification('CAMPAIGN_MILESTONE')}
                          className="px-2 py-1 rounded bg-emerald-600 hover:bg-emerald-700 text-white font-semibold transition-colors cursor-pointer"
                        >
                          + Milestone
                        </button>
                        <button
                          onClick={() => onSimulateNotification('LOW_CREDIT')}
                          className="px-2 py-1 rounded bg-amber-600 hover:bg-amber-700 text-white font-semibold transition-colors cursor-pointer"
                        >
                          + Low Credit
                        </button>
                        <button
                          onClick={() => onSimulateNotification('NEW_REVIEW')}
                          className="px-2 py-1 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition-colors cursor-pointer"
                        >
                          + New Review
                        </button>
                      </div>
                    </div>
                  )}
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
