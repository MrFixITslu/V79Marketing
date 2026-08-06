import React, { useState } from 'react';
import { Business, GeneratedImage } from '../types';
import {
  ImageIcon,
  Sparkles,
  Download,
  RefreshCw,
  Sliders,
  Check,
  Layout,
  Palette,
  Layers,
  Save
} from 'lucide-react';

interface AiImageGeneratorProps {
  business: Business;
  onSaveToLibrary: (img: GeneratedImage) => void;
}

export const AiImageGenerator: React.FC<AiImageGeneratorProps> = ({
  business,
  onSaveToLibrary,
}) => {
  const [prompt, setPrompt] = useState('Smoked wood-fired jerk ribs with plantain mash and tropical sunset vibes');
  const [dimension, setDimension] = useState<'1080x1080' | '1080x1920' | '1200x630' | '1200x627'>('1080x1080');
  const [stylePreset, setStylePreset] = useState('Social Graphic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('https://images.unsplash.com/photo-1544025162-d76694265947?w=800');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleGenerateImage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!prompt.trim()) return;

    setIsGenerating(true);
    try {
      const response = await fetch('/api/ai/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${stylePreset}: ${prompt}`,
          dimension,
          businessName: business.name,
          primaryColor: business.brandProfile?.primaryColor || '#EA580C',
        }),
      });

      const data = await response.json();
      if (data.success && data.imageUrl) {
        setCurrentImage(data.imageUrl);
      }
    } catch (err) {
      console.error('Error generating image:', err);
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveImage = () => {
    const newImg: GeneratedImage = {
      id: `img-${Date.now()}`,
      businessId: business.id,
      prompt,
      dimension,
      platformTarget: stylePreset,
      imageUrl: currentImage,
      createdAt: new Date().toISOString(),
    };
    onSaveToLibrary(newImg);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 uppercase tracking-wider mb-1">
            <ImageIcon className="w-4 h-4" />
            <span>Gemini AI Visual Studio</span>
          </div>
          <h1 className="text-2xl font-black text-white">AI Image & Flyer Generator</h1>
          <p className="text-xs text-slate-400 mt-1">
            Generate exact-dimension social graphics, story flyers, and ad banners with brand colors.
          </p>
        </div>

        <button
          onClick={handleSaveImage}
          className="px-6 py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-xs shadow-lg flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap"
        >
          {savedSuccess ? <Check className="w-4 h-4" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Saved to Media Assets!' : 'Save Asset to Library'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Settings Panel */}
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Prompt Description</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-orange-500"
              placeholder="Describe the image you want Gemini to generate..."
            />
          </div>

          {/* Dimension Selector */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Target Social Dimensions</label>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                { id: '1080x1080', label: 'Instagram Square', size: '1080 × 1080' },
                { id: '1080x1920', label: 'Story / Reel / TikTok', size: '1080 × 1920' },
                { id: '1200x630', label: 'Facebook Cover', size: '1200 × 630' },
                { id: '1200x627', label: 'LinkedIn Banner', size: '1200 × 627' },
              ].map((d) => (
                <button
                  key={d.id}
                  onClick={() => setDimension(d.id as any)}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    dimension === d.id
                      ? 'bg-orange-500/10 border-orange-500 text-orange-400 font-bold'
                      : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <p className="font-semibold text-xs text-white">{d.label}</p>
                  <p className="text-[10px] text-slate-500">{d.size}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style Preset */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-300 block">Visual Style Preset</label>
            <select
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
            >
              <option value="Social Graphic">Social Media Graphic</option>
              <option value="Promotional Flyer">Event / Promotional Flyer</option>
              <option value="Product Showcase">Product Showcase Photo</option>
              <option value="Minimalist Banner">Minimalist Brand Banner</option>
            </select>
          </div>

          <button
            onClick={() => handleGenerateImage()}
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white font-bold text-xs rounded-xl shadow-md hover:scale-105 transition-transform flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Gemini Generating Image...' : 'Generate AI Image'}</span>
          </button>
        </div>

        {/* Right Live Canvas Preview */}
        <div className="lg:col-span-2 bg-slate-900 rounded-2xl p-6 border border-slate-800 flex flex-col items-center justify-center space-y-4 min-h-[400px]">
          <div className="flex items-center justify-between w-full border-b border-slate-800 pb-3 text-xs text-slate-400">
            <span className="font-bold text-slate-200 flex items-center gap-2">
              <Layout className="w-4 h-4 text-orange-400" />
              <span>Canvas Preview ({dimension})</span>
            </span>
            <a
              href={currentImage}
              download="v79-marketing-asset.png"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-amber-400 font-semibold hover:underline"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Image</span>
            </a>
          </div>

          {/* Rendered Asset Container */}
          <div className="relative max-w-md w-full overflow-hidden rounded-2xl border-2 border-slate-800 shadow-2xl bg-slate-950 flex items-center justify-center p-2">
            <img
              src={currentImage}
              alt={prompt}
              className="w-full h-auto max-h-[500px] object-contain rounded-xl"
            />
          </div>
        </div>
      </div>
    </div>
  );
};
