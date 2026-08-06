import React, { useState } from 'react';
import { GeneratedVideo, Business } from '../types';
import {
  Video,
  Sparkles,
  Play,
  Pause,
  Download,
  Share2,
  Music,
  CheckCircle2,
  Plus
} from 'lucide-react';

interface AiVideoStudioViewProps {
  business: Business;
  onDeductCredits?: (amount: number, reason: string) => boolean;
}

export const AiVideoStudioView: React.FC<AiVideoStudioViewProps> = ({
  business,
  onDeductCredits,
}) => {
  const [theme, setTheme] = useState('Sunset Cocktail Special & Live Reggae Night');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1'>('9:16');
  const [musicTrack, setMusicTrack] = useState('Island Lo-Fi & Waves');
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [activeSceneIdx, setActiveSceneIdx] = useState(0);

  const initialVideo: GeneratedVideo = {
    id: 'vid-1',
    title: 'Waterfront Sunset Happy Hour Reel',
    aspectRatio: '9:16',
    durationSeconds: 15,
    thumbnailUrl: business.logoUrl,
    videoUrl: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=600&q=80',
    audioTrack: 'Island Lo-Fi & Waves',
    captions: [
      { timestamp: '0:00 - 0:05', text: 'Golden hour hits different at Sunset Grill & Bar! 🌅' },
      { timestamp: '0:05 - 0:10', text: 'Buy 1 Get 1 Free Rum Punch from 5 PM - 7 PM!' },
      { timestamp: '0:10 - 0:15', text: 'Rodney Bay Marina • Tag a friend to bring along!' },
    ],
    scenes: [
      {
        sceneNumber: 1,
        visualPrompt: 'Pan shot over sunset waters at Rodney Bay with vibrant Caribbean orange sky',
        overlayText: 'Golden hour hits different at Sunset Grill! 🌅'
      },
      {
        sceneNumber: 2,
        visualPrompt: 'Close up of fresh Caribbean Rum Punch with lime wedge and mint leaves',
        overlayText: 'Buy 1 Get 1 Free Rum Punch (5-7 PM)'
      },
      {
        sceneNumber: 3,
        visualPrompt: 'Guests laughing on wooden deck overlooking sailboats with warm tiki torches',
        overlayText: 'Tag a friend to bring along tonight! 🍹✨'
      }
    ],
    status: 'READY'
  };

  const [activeVideo, setActiveVideo] = useState<GeneratedVideo>(initialVideo);

  const handleGenerateVideo = () => {
    if (onDeductCredits && !onDeductCredits(500, 'AI Promotional Video Generation (500 Credits)')) return;

    setIsGenerating(true);
    setTimeout(() => {
      setActiveVideo({
        id: `vid-${Date.now()}`,
        title: theme,
        aspectRatio,
        durationSeconds: 15,
        thumbnailUrl: business.logoUrl,
        videoUrl: 'https://images.unsplash.com/photo-1510812431401-41d2bd2722f3?auto=format&fit=crop&w=600&q=80',
        audioTrack: musicTrack,
        captions: [
          { timestamp: '0:00 - 0:05', text: `Welcome to ${business.name}! ✨` },
          { timestamp: '0:05 - 0:10', text: theme },
          { timestamp: '0:10 - 0:15', text: `Visit us at ${business.location} or book online today!` }
        ],
        scenes: [
          { sceneNumber: 1, visualPrompt: 'Cinematic opening shot of venue atmosphere', overlayText: `Welcome to ${business.name}` },
          { sceneNumber: 2, visualPrompt: 'Dynamic motion shot highlighting special offer', overlayText: theme },
          { sceneNumber: 3, visualPrompt: 'High-energy closing call to action with brand logo', overlayText: 'Book or Call Us Today!' }
        ],
        status: 'READY'
      });
      setIsGenerating(false);
    }, 2000);
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Header */}
      <div className="bg-gradient-to-r from-pink-600 via-purple-600 to-indigo-600 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-pink-200 uppercase tracking-widest bg-white/20 px-3 py-1 rounded-full w-fit">
              <Video className="w-4 h-4 text-white" />
              <span>AI Video Studio • Reels & TikTok Generator</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Instant 9:16 Vertical Promo Reel
            </h1>
            <p className="text-xs sm:text-sm text-pink-100 max-w-2xl leading-relaxed">
              Generate 15-second animated story reels with Caribbean music tracks, dynamic text overlays, and AI voice narration script.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Generator Controls */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-600" />
            <span>Video Storyboard Parameters</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Video Objective / Promo Theme
            </label>
            <textarea
              rows={3}
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              placeholder="Describe what you want to promote e.g., Weekend Seafood Feast with live steel pan music"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Video Aspect Ratio
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setAspectRatio('9:16')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  aspectRatio === '9:16'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>9:16 Stories & Reels</span>
              </button>
              <button
                type="button"
                onClick={() => setAspectRatio('1:1')}
                className={`p-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer ${
                  aspectRatio === '1:1'
                    ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>1:1 Square Post</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
              <span>Background Audio Vibe</span>
              <Music className="w-3.5 h-3.5 text-purple-600" />
            </label>
            <select
              value={musicTrack}
              onChange={(e) => setMusicTrack(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 font-medium"
            >
              <option value="Island Lo-Fi & Waves">Island Lo-Fi & Sunset Waves</option>
              <option value="Soca Calypso Energy">Soca Calypso Party Energy</option>
              <option value="Reggae Lounge Sunset">Reggae Lounge Guitar</option>
              <option value="Upbeat Caribbean Afrobeat">Upbeat Caribbean Afrobeat</option>
            </select>
          </div>

          <button
            onClick={handleGenerateVideo}
            disabled={isGenerating}
            className="w-full py-3 bg-gradient-to-r from-purple-600 via-pink-600 to-indigo-600 hover:opacity-95 text-white font-bold text-xs rounded-2xl shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            {isGenerating ? (
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            ) : (
              <>
                <Video className="w-4 h-4" />
                <span>Generate Video Story (500 Credits)</span>
              </>
            )}
          </button>
        </div>

        {/* Player & Storyboard Preview */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900 rounded-3xl p-6 text-white shadow-xl flex flex-col md:flex-row gap-6 items-center">
            {/* Phone Mockup Frame */}
            <div className="w-56 h-[380px] bg-black rounded-[36px] p-3 border-4 border-slate-800 shadow-2xl relative overflow-hidden flex-shrink-0 flex flex-col justify-between">
              {/* Background Mock Video Scene Image */}
              <div
                className="absolute inset-0 bg-cover bg-center opacity-80"
                style={{
                  backgroundImage: `url(${activeVideo.videoUrl})`
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-black/40" />

              {/* Reel Header */}
              <div className="relative z-10 flex items-center justify-between text-[10px] text-white/80 font-bold p-1">
                <span className="bg-black/50 px-2 py-0.5 rounded-full backdrop-blur-xs">
                  Reel Preview
                </span>
                <span className="bg-pink-600 text-white px-2 py-0.5 rounded-full font-mono">
                  {activeVideo.durationSeconds}s
                </span>
              </div>

              {/* Scene Animated Overlay Text */}
              <div className="relative z-10 p-2 text-center space-y-1">
                <div className="bg-gradient-to-r from-pink-600/90 to-purple-600/90 backdrop-blur-md p-2.5 rounded-2xl border border-white/20 shadow-lg animate-bounce">
                  <p className="text-xs font-black text-white leading-tight">
                    {activeVideo.scenes[activeSceneIdx]?.overlayText}
                  </p>
                </div>
              </div>

              {/* Reel Bottom Controls */}
              <div className="relative z-10 space-y-2 p-1">
                <div className="flex items-center justify-between">
                  <button
                    onClick={() => setIsPlaying(!isPlaying)}
                    className="w-9 h-9 rounded-full bg-white text-slate-900 flex items-center justify-center shadow-lg hover:scale-105 transition-transform cursor-pointer"
                  >
                    {isPlaying ? <Pause className="w-4 h-4 fill-slate-900" /> : <Play className="w-4 h-4 fill-slate-900 ml-0.5" />}
                  </button>

                  <div className="text-[10px] text-white/80 font-mono font-bold flex items-center gap-1 bg-black/40 px-2 py-1 rounded-full backdrop-blur-xs">
                    <Music className="w-3 h-3 text-pink-400" />
                    <span className="truncate max-w-[90px]">{activeVideo.audioTrack}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Storyboard Details */}
            <div className="flex-1 space-y-4">
              <div>
                <span className="text-[10px] font-black uppercase tracking-widest bg-pink-500/20 text-pink-300 px-2.5 py-1 rounded-full">
                  AI Storyboard Breakdown
                </span>
                <h4 className="text-lg font-black text-white mt-2">{activeVideo.title}</h4>
              </div>

              <div className="space-y-2">
                {activeVideo.scenes.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setActiveSceneIdx(idx)}
                    className={`w-full text-left p-3 rounded-2xl border transition-all cursor-pointer ${
                      activeSceneIdx === idx
                        ? 'bg-purple-600/30 border-purple-400 text-white shadow-md'
                        : 'bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs font-bold mb-1">
                      <span>Scene #{s.sceneNumber}</span>
                      {activeSceneIdx === idx && (
                        <span className="text-[10px] text-pink-300 bg-pink-500/30 px-2 py-0.5 rounded">
                          Active Preview
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200 font-medium">{s.overlayText}</p>
                  </button>
                ))}
              </div>

              <div className="pt-2 flex items-center gap-2">
                <button
                  onClick={() => alert('Simulated MP4 video exported and downloaded!')}
                  className="flex-1 py-2.5 bg-pink-600 hover:bg-pink-700 text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download MP4</span>
                </button>
                <button
                  onClick={() => alert('Simulated publishing to Instagram Reels & TikTok!')}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Share2 className="w-4 h-4" />
                  <span>Publish</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
