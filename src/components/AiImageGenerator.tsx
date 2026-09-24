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
  const [prompt, setPrompt] = useState('');
  const [dimension, setDimension] = useState<'1080x1080' | '1080x1920' | '1200x630' | '1200x627'>('1080x1080');
  const [stylePreset, setStylePreset] = useState('Social Graphic');
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentImage, setCurrentImage] = useState<string>('');
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
      <div className="bg-slate-900 p-6 rounded-xl border border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1">
            <ImageIcon className="w-4 h-4 text-slate-300" />
            <span>Branded Visual Generator</span>
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">Graphic & Flyer Studio</h1>
          <p className="text-xs text-slate-400 mt-1">
            Create exact-dimension branded graphics and promotional layouts using your saved business identity.
          </p>
        </div>

        <button
          disabled={!currentImage}
          onClick={handleSaveImage}
          className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-white font-medium rounded-lg text-xs border border-slate-700 flex items-center justify-center gap-2 cursor-pointer transition-colors whitespace-nowrap"
        >
          {savedSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4" />}
          <span>{savedSuccess ? 'Saved to Media Assets' : 'Save to Asset Library'}</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Settings Panel */}
        <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-xs space-y-5">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">Prompt & Visual Description</label>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg p-3 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
              placeholder="Describe the image subject, lighting, and mood..."
            />
          </div>

          {/* Dimension Selector */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">Target Social Format</label>
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
                  className={`p-2.5 rounded-lg border text-left transition-colors cursor-pointer ${
                    dimension === d.id
                      ? 'bg-slate-900 border-slate-900 text-white font-medium'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <p className={`font-semibold text-xs ${dimension === d.id ? 'text-white' : 'text-slate-900'}`}>{d.label}</p>
                  <p className={`text-[10px] ${dimension === d.id ? 'text-slate-300' : 'text-slate-500'}`}>{d.size}</p>
                </button>
              ))}
            </div>
          </div>

          {/* Style Preset */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-slate-700 block">Visual Style Preset</label>
            <select
              value={stylePreset}
              onChange={(e) => setStylePreset(e.target.value)}
              className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white"
            >
              <option value="Social Graphic">Social Media Graphic</option>
              <option value="Promotional Flyer">Event / Promotional Flyer</option>
                            <option value="Minimalist Banner">Minimalist Brand Banner</option>
            </select>
          </div>

          <button
            onClick={() => handleGenerateImage()}
            disabled={isGenerating || !prompt.trim()}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            {isGenerating ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            <span>{isGenerating ? 'Creating Visual Asset...' : 'Generate Branded Graphic'}</span>
          </button>
        </div>

        {/* Right Live Canvas Preview */}
        <div className="lg:col-span-2 bg-white rounded-xl p-6 border border-slate-200 shadow-xs flex flex-col items-center justify-center space-y-4 min-h-[400px]">
          <div className="flex items-center justify-between w-full border-b border-slate-100 pb-3 text-xs text-slate-500">
            <span className="font-semibold text-slate-800 flex items-center gap-2">
              <Layout className="w-4 h-4 text-slate-600" />
              <span>Canvas Preview ({dimension})</span>
            </span>
            <a
              href={currentImage}
              download="v79-marketing-asset.svg"
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1.5 text-slate-700 hover:text-slate-900 font-medium transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download Image</span>
            </a>
          </div>

          {/* Rendered Asset Container */}
          <div className="relative max-w-md w-full overflow-hidden rounded-xl border border-slate-200 shadow-xs bg-slate-50 flex items-center justify-center p-2 min-h-80">
            {currentImage ? (
              <img src={currentImage} alt={prompt} className="w-full h-auto max-h-[500px] object-contain rounded-lg" />
            ) : (
              <div className="px-8 text-center text-sm leading-6 text-slate-400">Describe the message you want on the graphic. V79 will generate a branded layout from your business profile.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
