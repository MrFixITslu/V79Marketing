import React, { useState } from 'react';
import { Business } from '../types';
import {
  Palette,
  Sparkles,
  Download,
  Copy,
  Check,
  Building2,
  FileText
} from 'lucide-react';

interface AiBrandKitViewProps {
  business: Business;
  onUpdateBusinessBrand: (updatedBrand: Business['brandProfile']) => void;
}

export const AiBrandKitView: React.FC<AiBrandKitViewProps> = ({
  business,
  onUpdateBusinessBrand,
}) => {
  const [brand, setBrand] = useState(business.brandProfile);
  const [copiedHex, setCopiedHex] = useState<string | null>(null);
  const [downloaded, setDownloaded] = useState(false);

  const handleCopy = (hex: string) => {
    navigator.clipboard.writeText(hex);
    setCopiedHex(hex);
    setTimeout(() => setCopiedHex(null), 2000);
  };

  const handleDownloadStyleGuide = () => {
    setDownloaded(true);
    setTimeout(() => setDownloaded(false), 3000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-yellow-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-amber-100 uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full w-fit">
              <Palette className="w-4 h-4 text-white" />
              <span>AI Brand Identity & Visual Kit</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              {business.name} Style Guide
            </h1>
            <p className="text-xs sm:text-sm text-amber-100 max-w-2xl leading-relaxed">
              Consistently enforced across all AI generated flyers, social media graphics, video stories, and landing pages.
            </p>
          </div>

          <button
            onClick={handleDownloadStyleGuide}
            className="px-5 py-3 bg-white hover:bg-slate-50 text-slate-900 font-bold text-xs rounded-2xl shadow-xl transition-all flex items-center gap-2 cursor-pointer"
          >
            {downloaded ? (
              <>
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Downloaded Brand PDF!</span>
              </>
            ) : (
              <>
                <Download className="w-4 h-4 text-orange-600" />
                <span>Download Brand Style Guide (PDF)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Colors Grid */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
        <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
          <Palette className="w-4 h-4 text-orange-600" />
          <span>Brand Color Palette</span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div
              className="w-full h-24 rounded-xl shadow-inner border border-black/10 flex items-end p-2"
              style={{ backgroundColor: brand.primaryColor }}
            >
              <span className="text-[10px] font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                Primary
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Primary Color</span>
                <p className="text-xs font-mono text-slate-500">{brand.primaryColor}</p>
              </div>
              <button
                onClick={() => handleCopy(brand.primaryColor)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                {copiedHex === brand.primaryColor ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div
              className="w-full h-24 rounded-xl shadow-inner border border-black/10 flex items-end p-2"
              style={{ backgroundColor: brand.secondaryColor }}
            >
              <span className="text-[10px] font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                Secondary
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Secondary Color</span>
                <p className="text-xs font-mono text-slate-500">{brand.secondaryColor}</p>
              </div>
              <button
                onClick={() => handleCopy(brand.secondaryColor)}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                {copiedHex === brand.secondaryColor ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="w-full h-24 rounded-xl shadow-inner border border-black/10 bg-slate-900 flex items-end p-2">
              <span className="text-[10px] font-mono font-bold text-white bg-black/40 px-2 py-0.5 rounded backdrop-blur-xs">
                Neutral Dark
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Charcoal Slate</span>
                <p className="text-xs font-mono text-slate-500">#0F172A</p>
              </div>
              <button
                onClick={() => handleCopy('#0F172A')}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                {copiedHex === '#0F172A' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          <div className="p-4 rounded-2xl border border-slate-200 bg-slate-50 space-y-3">
            <div className="w-full h-24 rounded-xl shadow-inner border border-black/10 bg-amber-50 flex items-end p-2">
              <span className="text-[10px] font-mono font-bold text-slate-800 bg-white/80 px-2 py-0.5 rounded backdrop-blur-xs">
                Background Tint
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-slate-800">Warm Sand</span>
                <p className="text-xs font-mono text-slate-500">#FFFBEB</p>
              </div>
              <button
                onClick={() => handleCopy('#FFFBEB')}
                className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg cursor-pointer"
              >
                {copiedHex === '#FFFBEB' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Typography & Assets */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            <span>Typography Pairing</span>
          </h3>

          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
            <div>
              <span className="text-[11px] font-bold text-slate-400 uppercase">Primary Display Font</span>
              <p className="text-2xl font-black text-slate-900 tracking-tight font-serif">
                Plus Jakarta Sans & Playfair Display
              </p>
            </div>
            <div className="pt-2 border-t border-slate-200 text-xs text-slate-600 leading-relaxed">
              Used for headlines, promotional posters, call-to-action badges, and pricing cards.
            </div>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span>Brand Logo & Watermark</span>
          </h3>

          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-2xl border border-slate-200">
            <img
              src={business.logoUrl}
              alt={business.name}
              className="w-16 h-16 rounded-2xl object-cover border border-slate-300 shadow-sm"
            />
            <div>
              <h4 className="font-bold text-slate-900 text-sm">{business.name} Logo</h4>
              <p className="text-xs text-slate-500 mt-0.5">Vector SVG & High-Res PNG stored</p>
              <span className="text-[10px] text-emerald-700 font-bold bg-emerald-100 px-2 py-0.5 rounded mt-2 inline-block">
                Auto-Watermarked on AI Flyers
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
