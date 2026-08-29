import React, { useState } from 'react';
import { MarketingAuditItem, Business } from '../types';
import {
  Wrench,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  Sparkles,
  Building2,
  Clock,
  MessageSquare
} from 'lucide-react';

interface FixMyMarketingModalProps {
  business: Business;
  onClose: () => void;
  onNavigateTab: (tab: string) => void;
}

export const FixMyMarketingModal: React.FC<FixMyMarketingModalProps> = ({
  business,
  onClose,
  onNavigateTab,
}) => {
  const [auditItems, setAuditItems] = useState<MarketingAuditItem[]>([
    {
      id: 'audit-1',
      businessId: business.id,
      title: 'Inconsistent Social Opening Hours',
      severity: 'HIGH',
      category: 'Business Consistency',
      issueDescription: 'Facebook profile hours differ from website listing (Closing 10:00 PM vs 11:00 PM).',
      fixRecommendation: 'Sync Facebook and Google Business opening hours to match website.',
      resolved: false,
      actionTarget: 'profile-builder',
    },
    {
      id: 'audit-2',
      businessId: 'bus-1',
      title: 'Posting Inactivity Warning (11 Days)',
      severity: 'HIGH',
      category: 'Social Consistency',
      issueDescription: 'No content published in the last 11 days. Consistent posting increases customer reach by 2.4×.',
      fixRecommendation: 'Generate 3 automated posts for this week.',
      resolved: false,
      actionTarget: 'ai-assistant',
    },
    {
      id: 'audit-3',
      businessId: 'bus-1',
      title: '14 Unanswered Customer Reviews',
      severity: 'MEDIUM',
      category: 'Customer Engagement',
      issueDescription: 'Google Business profile has 14 customer reviews awaiting responses.',
      fixRecommendation: 'Use AI Review Assistant to generate 1-click warm responses.',
      resolved: false,
      actionTarget: 'reviews',
    },
    {
      id: 'audit-4',
      businessId: 'bus-1',
      title: 'Missing Vertical Video Reels',
      severity: 'MEDIUM',
      category: 'Content Quality',
      issueDescription: 'Short vertical reels receive 3.2× higher engagement in St. Lucia than static images.',
      fixRecommendation: 'Generate 9:16 vertical video reel for Friday Sunset Happy Hour.',
      resolved: false,
      actionTarget: 'ai-video',
    },
  ]);

  const handleResolveItem = (id: string, target?: string) => {
    setAuditItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, resolved: true } : item))
    );
    if (target) {
      onNavigateTab(target);
      onClose();
    }
  };

  const resolvedCount = auditItems.filter((i) => i.resolved).length;
  const healthPercent = Math.round(((auditItems.length - (auditItems.length - resolvedCount)) / auditItems.length) * 100);

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 space-y-6 shadow-2xl relative border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-5 right-5 p-1 text-slate-400 hover:text-slate-700 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-500 text-white flex items-center justify-center font-bold shadow-md">
            <Wrench className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-slate-900">Fix My Marketing Audit Engine</h2>
            <p className="text-xs text-slate-500">Automated diagnostic report for {business.name}</p>
          </div>
        </div>

        {/* Audit Health Summary */}
        <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-4 text-white flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400">Marketing Diagnostic Health</span>
            <p className="text-sm font-extrabold text-slate-100">{auditItems.length - resolvedCount} Issues Requiring Action</p>
          </div>
          <div className="text-right font-mono font-black text-2xl text-emerald-400">
            {resolvedCount} / {auditItems.length} Fixed
          </div>
        </div>

        {/* Diagnostic Audit Items List */}
        <div className="space-y-3 max-h-96 overflow-y-auto no-scrollbar pr-1">
          {auditItems.map((item) => (
            <div
              key={item.id}
              className={`p-4 rounded-2xl border transition-colors space-y-2 text-xs ${
                item.resolved
                  ? 'bg-slate-50 border-slate-200 opacity-60'
                  : item.severity === 'HIGH'
                  ? 'bg-red-50/50 border-red-200'
                  : 'bg-amber-50/50 border-amber-200'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {item.resolved ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <AlertTriangle className={`w-4 h-4 ${item.severity === 'HIGH' ? 'text-red-500' : 'text-amber-500'}`} />
                  )}
                  <h4 className="font-bold text-slate-900 text-xs">{item.title}</h4>
                </div>
                <span
                  className={`text-[9px] font-extrabold px-2 py-0.5 rounded-md uppercase ${
                    item.severity === 'HIGH'
                      ? 'bg-red-100 text-red-800'
                      : 'bg-amber-100 text-amber-800'
                  }`}
                >
                  {item.severity} SEVERITY
                </span>
              </div>

              <p className="text-slate-700 leading-relaxed">{item.issueDescription}</p>

              <div className="pt-2 border-t border-slate-200/60 flex items-center justify-between">
                <span className="text-[11px] text-slate-500 font-medium">
                  Recommendation: {item.fixRecommendation}
                </span>
                {!item.resolved && (
                  <button
                    onClick={() => handleResolveItem(item.id, item.actionTarget)}
                    className="px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white font-bold rounded-lg flex items-center gap-1 text-[11px] shadow-xs cursor-pointer"
                  >
                    <span>Fix Issue Now</span>
                    <ArrowRight className="w-3 h-3" />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
