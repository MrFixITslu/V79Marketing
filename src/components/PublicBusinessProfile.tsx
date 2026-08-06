import React, { useState } from 'react';
import { Business } from '../types';
import { SeoHead } from './SeoHead';
import {
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  MessageSquare,
  CheckCircle2,
  ExternalLink,
  Share2,
  Calendar,
  Utensils,
  ShoppingBag,
  Sparkles,
  ArrowLeft
} from 'lucide-react';

interface PublicBusinessProfileProps {
  business: Business;
  onBackToApp?: () => void;
}

export const PublicBusinessProfile: React.FC<PublicBusinessProfileProps> = ({
  business,
  onBackToApp,
}) => {
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [inquiryName, setInquiryName] = useState('');
  const [inquiryMsg, setInquiryMsg] = useState('');
  const [inquirySent, setInquirySent] = useState(false);

  const categories = ['All', ...Array.from(new Set(business.products.map((p) => p.category)))];

  const filteredProducts =
    activeCategory === 'All'
      ? business.products
      : business.products.filter((p) => p.category === activeCategory);

  const handleInquirySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inquiryMsg) return;
    setInquirySent(true);
    setTimeout(() => {
      setInquirySent(false);
      setInquiryName('');
      setInquiryMsg('');
    }, 3000);
  };

  const whatsappClean = business.whatsapp.replace(/\D/g, '');

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans pb-16">
      <SeoHead
        title={`${business.name} | Official Storefront & Menu`}
        description={business.description || `${business.name} in ${business.location}. ${business.brandProfile?.tagline || ''}`}
        image={business.coverImageUrl || business.logoUrl}
        keywords={`${business.name}, ${business.industry}, ${business.location}, local store`}
      />
      {/* Optional Top Bar for AI Studio Navigation */}
      {onBackToApp && (
        <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-xs">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-1.5 text-orange-400 font-bold hover:underline"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Return to V79 Marketing Hub SaaS Dashboard</span>
          </button>
          <span className="text-slate-400">Public Business Page Preview • v79marketing.com/business/{business.slug}</span>
        </div>
      )}

      {/* Cover Photo Banner */}
      <div className="relative h-64 sm:h-80 w-full overflow-hidden bg-slate-900">
        <img
          src={business.coverImageUrl}
          alt={business.name}
          className="w-full h-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />
      </div>

      {/* Main Header Card */}
      <div className="max-w-4xl mx-auto px-4 -mt-20 relative z-10 space-y-8">
        <div className="bg-slate-900/95 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl backdrop-blur">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <img
                src={business.logoUrl}
                alt={business.name}
                className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-slate-900 shadow-xl"
                style={{ borderColor: business.brandProfile?.primaryColor || '#EA580C' }}
              />
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl sm:text-3xl font-black text-white">{business.name}</h1>
                  <CheckCircle2 className="w-5 h-5 text-teal-400" />
                </div>
                <p className="text-xs text-amber-300 font-medium italic">{business.brandProfile?.tagline}</p>
                <div className="flex items-center gap-2 text-xs text-slate-400 pt-1">
                  <MapPin className="w-3.5 h-3.5 text-orange-400" />
                  <span>{business.location}</span>
                </div>
              </div>
            </div>

            {/* Live WhatsApp CTA Button */}
            <div className="w-full sm:w-auto flex flex-col sm:flex-row gap-2">
              <a
                href={`https://wa.me/${whatsappClean}?text=Hello%20${encodeURIComponent(business.name)},%20I%20found%20your%20profile%20online!`}
                target="_blank"
                rel="noreferrer"
                className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer"
              >
                <MessageSquare className="w-4 h-4 fill-current" />
                <span>Chat on WhatsApp</span>
              </a>

              <a
                href={`tel:${business.phone}`}
                className="w-full sm:w-auto px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 border border-slate-700 transition-colors"
              >
                <Phone className="w-3.5 h-3.5 text-amber-400" />
                <span>Call Now</span>
              </a>
            </div>
          </div>

          <p className="text-sm text-slate-300 mt-6 leading-relaxed border-t border-slate-800/80 pt-4">
            {business.description}
          </p>

          {/* Contact Details Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-4 border-t border-slate-800/80 text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-orange-400" />
              <span className="truncate">{business.email}</span>
            </div>
            <div className="flex items-center gap-2">
              <Globe className="w-4 h-4 text-teal-400" />
              <a href={business.website} target="_blank" rel="noreferrer" className="hover:underline truncate">
                {business.website.replace('https://', '')}
              </a>
            </div>
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span className="text-emerald-400 font-semibold">Open Today (11 AM - 10 PM)</span>
            </div>
          </div>
        </div>

        {/* Product & Menu Showcase Section */}
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Utensils className="w-5 h-5 text-orange-400" />
                <span>Featured Showcase & Menu</span>
              </h2>
              <p className="text-xs text-slate-400">Explore authentic offerings and signature specials</p>
            </div>

            {/* Category Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full font-semibold whitespace-nowrap transition-all ${
                    activeCategory === cat
                      ? 'bg-orange-500 text-white shadow-md'
                      : 'bg-slate-900 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {filteredProducts.map((p) => (
              <div
                key={p.id}
                className="bg-slate-900 border border-slate-800 rounded-2xl p-5 hover:border-slate-700 transition-all flex items-start justify-between gap-4"
              >
                <div className="space-y-2">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded">
                    {p.category}
                  </span>
                  <h3 className="font-bold text-white text-base">{p.name}</h3>
                  <p className="text-xs text-slate-400 leading-normal">{p.description}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="text-sm font-extrabold text-amber-300 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 block">
                    {p.price}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Direct Customer Reservation & Inquiry Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-amber-400" />
            <span>Send Direct Reservation or Inquiry</span>
          </h2>
          <p className="text-xs text-slate-400">
            Reach out directly to {business.name}. Our staff will reply promptly via email or WhatsApp.
          </p>

          <form onSubmit={handleInquirySubmit} className="space-y-4 pt-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <input
                type="text"
                required
                placeholder="Your Full Name"
                value={inquiryName}
                onChange={(e) => setInquiryName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-500"
              />
              <input
                type="text"
                placeholder="WhatsApp Phone or Email"
                className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white focus:outline-none focus:border-orange-500"
              />
            </div>
            <textarea
              required
              rows={3}
              placeholder="How can we assist you? (e.g. Table reservation for 4 on Friday at 6:30 PM)..."
              value={inquiryMsg}
              onChange={(e) => setInquiryMsg(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500"
            />
            <button
              type="submit"
              className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{inquirySent ? 'Message Sent Successfully!' : 'Send Direct Message'}</span>
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center text-xs text-slate-500 pt-8 border-t border-slate-900">
          <p>© {new Date().getFullYear()} {business.name}. All rights reserved.</p>
          <p className="mt-1">Powered by <strong className="text-slate-400">V79 Marketing Hub</strong> • V79 Digital</p>
        </div>
      </div>
    </div>
  );
};
