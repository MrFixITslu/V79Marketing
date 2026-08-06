import React, { useState } from 'react';
import { SocialAccount, SocialPlatform } from '../types';
import {
  Share2,
  CheckCircle2,
  AlertCircle,
  Plus,
  RefreshCw,
  Facebook,
  Instagram,
  Linkedin,
  Video,
  MessageCircle,
  Globe,
  KeyRound,
  ExternalLink
} from 'lucide-react';

interface SocialAccountsManagerProps {
  socialAccounts: SocialAccount[];
  onConnectChannel: (platform: SocialPlatform, handle: string) => void;
}

export const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({
  socialAccounts,
  onConnectChannel,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('facebook');
  const [handleInput, setHandleInput] = useState('@mybusiness');
  const [isConnecting, setIsConnecting] = useState(false);

  const availablePlatforms: { id: SocialPlatform; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'facebook', name: 'Facebook Page', icon: <Facebook className="w-5 h-5" />, color: 'text-blue-400' },
    { id: 'instagram', name: 'Instagram Business', icon: <Instagram className="w-5 h-5" />, color: 'text-pink-400' },
    { id: 'linkedin', name: 'LinkedIn Company', icon: <Linkedin className="w-5 h-5" />, color: 'text-sky-400' },
    { id: 'tiktok', name: 'TikTok Creator', icon: <Video className="w-5 h-5" />, color: 'text-teal-400' },
    { id: 'google_business', name: 'Google Business Profile', icon: <Globe className="w-5 h-5" />, color: 'text-amber-400' },
  ];

  const handleConnectSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setTimeout(() => {
      onConnectChannel(selectedPlatform, handleInput);
      setIsConnecting(false);
      setShowConnectModal(false);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Share2 className="w-4 h-4" />
            <span>OAuth Token & Publishing Queue Manager</span>
          </div>
          <h1 className="text-2xl font-black text-white">Social Media Connections</h1>
          <p className="text-xs text-slate-400 mt-1">
            Manage active tokens and API publishing credentials across all 6 social platforms
          </p>
        </div>

        <button
          onClick={() => setShowConnectModal(true)}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 hover:scale-105 transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Account</span>
        </button>
      </div>

      {/* Connected Accounts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {socialAccounts.map((sa) => {
          const platformObj = availablePlatforms.find((p) => p.id === sa.platform);
          return (
            <div
              key={sa.id}
              className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-md hover:border-slate-700 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${platformObj?.color}`}>
                    {platformObj?.icon || <Share2 className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div>
                    <h3 className="font-bold text-white text-sm capitalize">{sa.platform.replace('_', ' ')}</h3>
                    <p className="text-xs text-slate-400">{sa.accountHandle}</p>
                  </div>
                </div>

                <span className="flex items-center gap-1 text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  <span>Connected</span>
                </span>
              </div>

              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-xs text-slate-400">
                <span>Audience / Followers:</span>
                <span className="font-bold text-slate-100">{sa.followerCount.toLocaleString()}</span>
              </div>

              <div className="text-[10px] text-slate-500 flex items-center justify-between">
                <span>OAuth Token: Valid</span>
                <span>Synced: {new Date(sa.lastSyncedAt).toLocaleTimeString()}</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* OAuth Connect Modal */}
      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>OAuth 2.0 Account Connection</span>
            </h3>
            <p className="text-xs text-slate-400">
              Select platform and grant publishing permissions to V79 Marketing Hub.
            </p>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Select Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => setSelectedPlatform(e.target.value as any)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                >
                  {availablePlatforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-300 block mb-1">Account Handle or Page Name</label>
                <input
                  type="text"
                  required
                  value={handleInput}
                  onChange={(e) => setHandleInput(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer"
                >
                  {isConnecting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isConnecting ? 'Authenticating OAuth...' : 'Authenticate & Connect'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
