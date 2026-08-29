import React from 'react';
import {
  LayoutDashboard,
  PlusCircle,
  Calendar,
  TrendingUp,
  CreditCard,
  Sparkles,
  Share2
} from 'lucide-react';

interface MobileBottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  onOpenCreateModal?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  setActiveTab,
}) => {
  const tabs = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'ai-assistant', label: 'Create', icon: PlusCircle, isPrimary: true },
    { id: 'calendar', label: 'Calendar', icon: Calendar },
    { id: 'reviews', label: 'Intel', icon: TrendingUp },
    { id: 'billing', label: 'Credits', icon: CreditCard },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200/90 px-2 py-1.5 shadow-2xl flex items-center justify-around">
      {tabs.map((tab) => {
        const Icon = tab.icon;
        const isActive = activeTab === tab.id;

        if (tab.isPrimary) {
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className="flex flex-col items-center justify-center cursor-pointer active:scale-95 transition-transform -mt-4"
              aria-label="Create new promotion"
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-r from-orange-500 to-amber-500 text-white flex items-center justify-center shadow-lg shadow-orange-500/30 border-2 border-white">
                <PlusCircle className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-extrabold text-orange-600 mt-0.5">
                {tab.label}
              </span>
            </button>
          );
        }

        return (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex flex-col items-center justify-center py-1 px-3 rounded-xl transition-all cursor-pointer active:scale-95 touch-target ${
              isActive
                ? 'text-orange-600 font-bold'
                : 'text-slate-500 hover:text-slate-800'
            }`}
            aria-label={tab.label}
          >
            <Icon className={`w-5 h-5 ${isActive ? 'text-orange-600 stroke-[2.5]' : 'stroke-[1.75]'}`} />
            <span className={`text-[10px] mt-0.5 ${isActive ? 'font-black' : 'font-medium'}`}>
              {tab.label}
            </span>
          </button>
        );
      })}
    </div>
  );
};
