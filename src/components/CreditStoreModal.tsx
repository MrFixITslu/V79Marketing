import React, { useState } from 'react';
import { CreditBalance, CreditCostConfig, Business } from '../types';
import { Coins, X, Check, Zap, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';

interface CreditStoreModalProps {
  creditBalance: CreditBalance;
  creditCosts: CreditCostConfig;
  business: Business;
  currency: 'XCD' | 'USD';
  onClose: () => void;
  onBuyCredits: (amount: number) => void;
  onNavigateToBilling: () => void;
}

export const CreditStoreModal: React.FC<CreditStoreModalProps> = ({
  creditBalance,
  creditCosts,
  business,
  currency,
  onClose,
  onBuyCredits,
  onNavigateToBilling,
}) => {
  const [purchasingPack, setPurchasingPack] = useState<string | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<string | null>(null);

  const packs = [
    {
      id: 'pack-starter',
      name: 'Starter Credit Pack',
      credits: 10000,
      priceXCD: 15,
      priceUSD: 6,
      badge: 'Micro-Topup',
      description: 'Ideal for quick post generation or 2 high-res AI images',
    },
    {
      id: 'pack-growth',
      name: 'Growth Credit Pack',
      credits: 50000,
      priceXCD: 60,
      priceUSD: 22,
      badge: 'Popular',
      description: 'Generates ~200 AI social posts or 50 AI marketing images',
      popular: true,
    },
    {
      id: 'pack-business',
      name: 'Business Power Pack',
      credits: 150000,
      priceXCD: 150,
      priceUSD: 55,
      badge: 'Best Value',
      description: 'Power 10 full 30-day campaigns & 500 social media posts',
    },
    {
      id: 'pack-enterprise',
      name: 'Agency & Enterprise Pack',
      credits: 500000,
      priceXCD: 400,
      priceUSD: 148,
      badge: 'High Volume',
      description: 'Massive allowance with 12-month rollover and priority queue',
    },
  ];

  const totalAllowance = creditBalance.monthlyAllowance + creditBalance.purchasedCredits + creditBalance.bonusCredits;
  const remaining = Math.max(0, totalAllowance - creditBalance.usedCredits);
  const percentUsed = Math.min(100, Math.round((creditBalance.usedCredits / totalAllowance) * 100));

  const handleSimulatePurchase = (pack: typeof packs[0]) => {
    setPurchasingPack(pack.id);
    setTimeout(() => {
      onBuyCredits(pack.credits);
      setPurchasingPack(null);
      setPurchaseSuccess(`Successfully added ${pack.credits.toLocaleString()} V79 AI Credits!`);
      setTimeout(() => setPurchaseSuccess(null), 4000);
    }, 1000);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in">
      <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto border border-slate-200 shadow-2xl relative">
        {/* Header */}
        <div className="sticky top-0 bg-white/95 backdrop-blur-md px-6 py-4 border-b border-slate-100 flex items-center justify-between z-10">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <Coins className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">V79 AI Credit Add-On Store</h2>
              <p className="text-xs text-slate-500">
                Flexible AI Credits with 12-Month Rollover • No Unexpected Overages
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Current Balance Banner */}
          <div className="bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/50 border border-amber-200 rounded-2xl p-5 relative overflow-hidden">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full">
                  Current Tenant Balance ({business.name})
                </span>
                <div className="flex items-baseline gap-2 mt-1">
                  <span className="text-3xl font-black font-mono text-amber-950">
                    {remaining.toLocaleString()}
                  </span>
                  <span className="text-sm font-bold text-amber-800">Remaining V79 Credits</span>
                </div>
                <p className="text-xs text-amber-700/90 mt-1">
                  Monthly Allowance: {creditBalance.monthlyAllowance.toLocaleString()} • Purchased: {creditBalance.purchasedCredits.toLocaleString()} • Used: {creditBalance.usedCredits.toLocaleString()}
                </p>
              </div>

              <div className="text-right">
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToBilling();
                  }}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Upgrade Subscription Plan</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Usage Progress Bar */}
            <div className="mt-4 pt-3 border-t border-amber-200/60">
              <div className="flex items-center justify-between text-xs font-semibold text-amber-900 mb-1">
                <span>Cycle Usage ({percentUsed}% consumed)</span>
                <span>Resets on {new Date(creditBalance.resetDate).toLocaleDateString()}</span>
              </div>
              <div className="w-full bg-amber-200/80 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 h-2 rounded-full transition-all"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>
          </div>

          {/* Success Banner */}
          {purchaseSuccess && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-3 animate-fade-in">
              <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
              <span>{purchaseSuccess}</span>
            </div>
          )}

          {/* Credit Packs Grid */}
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider mb-3">
              Instant Credit Add-On Packs
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {packs.map((pack) => {
                const price = currency === 'XCD' ? `EC$ ${pack.priceXCD}` : `$ ${pack.priceUSD} USD`;
                const isBuying = purchasingPack === pack.id;

                return (
                  <div
                    key={pack.id}
                    className={`rounded-2xl border p-5 transition-all relative flex flex-col justify-between ${
                      pack.popular
                        ? 'bg-gradient-to-b from-white to-blue-50/30 border-blue-300 ring-2 ring-blue-500/20 shadow-md'
                        : 'bg-white border-slate-200 hover:border-slate-300'
                    }`}
                  >
                    {pack.badge && (
                      <span
                        className={`absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-widest px-2.5 py-0.5 rounded-full ${
                          pack.popular
                            ? 'bg-blue-600 text-white shadow-xs'
                            : 'bg-slate-800 text-slate-100'
                        }`}
                      >
                        {pack.badge}
                      </span>
                    )}

                    <div>
                      <h4 className="font-bold text-slate-900 text-base">{pack.name}</h4>
                      <div className="flex items-baseline gap-2 mt-2">
                        <span className="text-2xl font-black font-mono text-slate-900">
                          +{pack.credits.toLocaleString()}
                        </span>
                        <span className="text-xs font-bold text-amber-600 uppercase">Credits</span>
                      </div>
                      <p className="text-xs text-slate-500 mt-2 leading-relaxed">{pack.description}</p>
                    </div>

                    <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-xs text-slate-400 font-medium">One-time price</span>
                        <p className="text-lg font-black text-slate-900 font-mono">{price}</p>
                      </div>

                      <button
                        onClick={() => handleSimulatePurchase(pack)}
                        disabled={isBuying}
                        className={`px-4 py-2.5 rounded-xl font-bold text-xs transition-all shadow-xs flex items-center gap-1.5 cursor-pointer ${
                          pack.popular
                            ? 'bg-gradient-to-r from-blue-600 to-indigo-600 hover:opacity-95 text-white'
                            : 'bg-slate-900 hover:bg-slate-800 text-white'
                        }`}
                      >
                        {isBuying ? (
                          <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          <>
                            <Zap className="w-3.5 h-3.5" />
                            <span>Add Credits</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Credit Cost Reference Guide */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800 mb-3">
              <HelpCircle className="w-4 h-4 text-blue-600" />
              <span>How are V79 AI Credits consumed?</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">AI Social Post</span>
                <p className="font-bold font-mono text-slate-900 mt-0.5">{creditCosts.aiPost} Credits</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">AI Image Flyer</span>
                <p className="font-bold font-mono text-slate-900 mt-0.5">{creditCosts.aiImage} Credits</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">30-Day Campaign</span>
                <p className="font-bold font-mono text-slate-900 mt-0.5">{creditCosts.campaign30Day} Credits</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">AI Promotional Video</span>
                <p className="font-bold font-mono text-slate-900 mt-0.5">{creditCosts.aiVideo} Credits</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">AI Review Response</span>
                <p className="font-bold font-mono text-slate-900 mt-0.5">{creditCosts.reviewResponse} Credits</p>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200">
                <span className="text-slate-500 font-medium">Competitor Audit</span>
                <p className="font-bold font-mono text-slate-900 mt-0.5">{creditCosts.competitorAudit} Credits</p>
              </div>
            </div>
          </div>

          <div className="p-3 bg-blue-50/60 rounded-xl border border-blue-200/60 text-xs text-blue-800 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600 flex-shrink-0" />
            <span>Purchased V79 AI Credits roll over for 12 full months. No surprise overage charges ever.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
