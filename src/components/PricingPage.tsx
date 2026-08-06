import React, { useState } from 'react';
import { PlanTier, Business } from '../types';
import {
  Check,
  CreditCard,
  Zap,
  Sparkles,
  ShieldCheck,
  Building2,
  Lock
} from 'lucide-react';

interface PricingPageProps {
  currentBusiness: Business;
  currency: 'XCD' | 'USD';
  onUpgradePlan: (plan: PlanTier) => void;
}

export const PricingPage: React.FC<PricingPageProps> = ({
  currentBusiness,
  currency,
  onUpgradePlan,
}) => {
  const [selectedPlan, setSelectedPlan] = useState<PlanTier>(currentBusiness.plan);
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [targetUpgradePlan, setTargetUpgradePlan] = useState<PlanTier>('BUSINESS');
  const [isProcessing, setIsProcessing] = useState(false);

  const formatPrice = (xcd: number, usd: number) => {
    if (xcd === 0) return currency === 'XCD' ? 'EC$ 0' : '$0';
    return currency === 'XCD' ? `EC$ ${xcd}` : `$${usd}`;
  };

  const plans = [
    {
      id: 'FREE' as PlanTier,
      name: 'Free Starter',
      priceXCD: 0,
      priceUSD: 0,
      description: 'Ideal for new business startups establishing an online presence.',
      features: [
        'Digital Storefront Webpage',
        '5 AI Posts / month',
        '1 Social Account Connection',
        'Basic Contact Forms',
      ],
    },
    {
      id: 'STARTER' as PlanTier,
      name: 'Starter Growth',
      priceXCD: 49,
      priceUSD: 18,
      popular: false,
      description: 'Perfect for local shops, cafes and solo entrepreneurs.',
      features: [
        'Digital Storefront Webpage',
        'Unlimited AI Copywriting Posts',
        '100 AI Image Generations / mo',
        '3 Social Channels (FB, IG, WhatsApp)',
        'Content Scheduling Calendar',
      ],
    },
    {
      id: 'BUSINESS' as PlanTier,
      name: 'Business Pro',
      priceXCD: 149,
      priceUSD: 55,
      popular: true,
      description: 'Comprehensive marketing automation for growing businesses.',
      features: [
        'All Starter Features included',
        '30-Day Automated AI Campaigns',
        'All 6 Social Platforms (FB, IG, TikTok, LinkedIn, WhatsApp, Google)',
        'Multi-User Team Role Access',
        'Advanced Analytics Dashboard',
        'WhatsApp Reservation Leads',
      ],
    },
    {
      id: 'ENTERPRISE' as PlanTier,
      name: 'Enterprise Custom',
      priceXCD: 399,
      priceUSD: 150,
      description: 'Tailored for hospitality chains, franchises & agencies.',
      features: [
        'Dedicated V79 Account Specialist',
        'Custom Domain Binding',
        'Unlimited AI Image & Video Studio',
        'Custom API Integrations',
        'Priority 24/7 SLA Support',
      ],
    },
  ];

  const handleCheckout = (planId: PlanTier) => {
    setTargetUpgradePlan(planId);
    setShowCheckoutModal(true);
  };

  const handleConfirmPayment = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setTimeout(() => {
      onUpgradePlan(targetUpgradePlan);
      setIsProcessing(false);
      setShowCheckoutModal(false);
    }, 1500);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Header */}
      <div className="text-center max-w-3xl mx-auto space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/30 text-orange-400 text-xs font-semibold">
          <CreditCard className="w-3.5 h-3.5" />
          <span>Simple, Transparent Local Pricing</span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-black text-white">Choose the Right Plan for Your Business</h1>
        <p className="text-sm text-slate-400">
          Scale your online presence with affordable Caribbean pricing in EC$ or USD.
        </p>
      </div>

      {/* Pricing Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {plans.map((p) => {
          const isCurrent = currentBusiness.plan === p.id;
          return (
            <div
              key={p.id}
              className={`bg-slate-900 rounded-2xl p-6 border flex flex-col justify-between space-y-6 relative ${
                p.popular
                  ? 'border-orange-500 shadow-2xl shadow-orange-500/10 ring-1 ring-orange-500'
                  : 'border-slate-800'
              }`}
            >
              {p.popular && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-orange-500 to-amber-500 text-white text-[10px] font-black uppercase px-3 py-1 rounded-full shadow-md">
                  MOST POPULAR
                </span>
              )}

              <div className="space-y-4">
                <div>
                  <h3 className="font-bold text-white text-lg">{p.name}</h3>
                  <p className="text-xs text-slate-400 mt-1 min-h-[36px]">{p.description}</p>
                </div>

                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-white">{formatPrice(p.priceXCD, p.priceUSD)}</span>
                  <span className="text-xs text-slate-400">/ month</span>
                </div>

                <ul className="space-y-2.5 pt-2 border-t border-slate-800 text-xs text-slate-300">
                  {p.features.map((f, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <Check className="w-4 h-4 text-emerald-400 flex-shrink-0 mt-0.5" />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
              </div>

              <button
                disabled={isCurrent}
                onClick={() => handleCheckout(p.id)}
                className={`w-full py-3 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                    : p.popular
                    ? 'bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-lg hover:scale-105'
                    : 'bg-slate-800 hover:bg-slate-700 text-white border border-slate-700'
                }`}
              >
                {isCurrent ? 'Current Plan' : `Upgrade to ${p.name}`}
              </button>
            </div>
          );
        })}
      </div>

      {/* Stripe Payment Simulation Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <Lock className="w-4 h-4 text-emerald-400" />
                <span>Secure Stripe Checkout</span>
              </h3>
              <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded">
                Plan: {targetUpgradePlan}
              </span>
            </div>

            <form onSubmit={handleConfirmPayment} className="space-y-4">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs space-y-1">
                <div className="flex justify-between text-slate-300">
                  <span>Subscription Upgrade:</span>
                  <strong className="text-white">{targetUpgradePlan}</strong>
                </div>
                <div className="flex justify-between text-slate-300">
                  <span>Monthly Fee:</span>
                  <strong className="text-amber-300">
                    {formatPrice(
                      plans.find((p) => p.id === targetUpgradePlan)?.priceXCD || 0,
                      plans.find((p) => p.id === targetUpgradePlan)?.priceUSD || 0
                    )}
                  </strong>
                </div>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="text-slate-300 font-bold block mb-1">Cardholder Name</label>
                  <input
                    type="text"
                    required
                    defaultValue="Janelle Auguste"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
                  />
                </div>

                <div>
                  <label className="text-slate-300 font-bold block mb-1">Card Number (Stripe Simulation)</label>
                  <input
                    type="text"
                    required
                    defaultValue="4242 •••• •••• 4242"
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white font-mono focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCheckoutModal(false)}
                  className="px-4 py-2 bg-slate-800 text-slate-300 text-xs rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer"
                >
                  {isProcessing ? 'Processing Payment...' : 'Confirm Subscription Upgrade'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
