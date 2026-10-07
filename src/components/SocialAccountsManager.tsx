import React, { useEffect, useMemo, useState } from 'react';
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
  Youtube,
  Globe,
  KeyRound,
  Unplug,
} from 'lucide-react';

interface SocialAccountsManagerProps {
  socialAccounts: SocialAccount[];
  onDisconnectChannel: (id: string) => Promise<void>;
}

type ProviderStatus = {
  platform: SocialPlatform;
  configured: boolean;
  capabilities: string[];
};

export const SocialAccountsManager: React.FC<SocialAccountsManagerProps> = ({
  socialAccounts,
  onDisconnectChannel,
}) => {
  const [showConnectModal, setShowConnectModal] = useState(false);
  const [selectedPlatform, setSelectedPlatform] = useState<SocialPlatform>('facebook');
  const [handleInput, setHandleInput] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState('');
  const [connectionError, setConnectionError] = useState('');
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [providers, setProviders] = useState<ProviderStatus[]>([]);

  const callback = useMemo(() => {
    if (typeof window === 'undefined') return null;
    const params = new URLSearchParams(window.location.search);
    const status = params.get('social');
    if (!status) return null;
    return {
      status,
      platform: params.get('platform') || 'provider',
      message: params.get('message') || '',
    };
  }, []);

  useEffect(() => {
    void fetch('/api/social-providers', { credentials:'same-origin' })
      .then(async response => {
        const body = await response.json().catch(() => ({}));
        if (response.ok) setProviders(body.providers || []);
      })
      .catch(() => undefined);
  }, []);

  const availablePlatforms: { id: SocialPlatform; name: string; icon: React.ReactNode; color: string }[] = [
    { id: 'facebook', name: 'Facebook Page', icon: <Facebook className="w-5 h-5" />, color: 'text-blue-400' },
    { id: 'instagram', name: 'Instagram Business', icon: <Instagram className="w-5 h-5" />, color: 'text-pink-400' },
    { id: 'linkedin', name: 'LinkedIn Company', icon: <Linkedin className="w-5 h-5" />, color: 'text-sky-400' },
    { id: 'tiktok', name: 'TikTok Creator', icon: <Video className="w-5 h-5" />, color: 'text-teal-400' },
    { id: 'youtube', name: 'YouTube Channel', icon: <Youtube className="w-5 h-5" />, color: 'text-red-400' },
    { id: 'google_business', name: 'Google Business Profile', icon: <Globe className="w-5 h-5" />, color: 'text-amber-400' },
  ];

  const selectedProvider = providers.find(item => item.platform === selectedPlatform);

  const handleConnectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setConnectionError('');
    try {
      const response = await fetch('/api/social-accounts/connect', {
        method:'POST',
        credentials:'same-origin',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          platform:selectedPlatform,
          accountHandle:handleInput,
          acceptedPrivacy,
          acceptedTerms,
          legalVersion:'2026-10-06',
        }),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok || !body.authorizationUrl) throw new Error(body.error || 'Provider OAuth could not be started.');
      window.location.assign(body.authorizationUrl);
    } catch (error:any) {
      setConnectionError(error?.message || 'Connection failed.');
      setIsConnecting(false);
    }
  };

  const disconnect = async (id:string) => {
    setDisconnectingId(id);
    setConnectionError('');
    try {
      await onDisconnectChannel(id);
    } catch (error:any) {
      setConnectionError(error?.message || 'Could not disconnect this provider.');
    } finally {
      setDisconnectingId('');
    }
  };

  return (
    <div className="space-y-6 pb-12">
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
            <Share2 className="w-4 h-4" />
            <span>Official OAuth & Publishing Connections</span>
          </div>
          <h1 className="text-2xl font-black text-white">Social Media Connections</h1>
          <p className="text-sm text-slate-400 mt-1">
            Only provider-authorised accounts can publish. V79 stores access tokens encrypted at rest.
          </p>
        </div>

        <button
          onClick={() => {
            setConnectionError('');
            setAcceptedPrivacy(false);
            setAcceptedTerms(false);
            setShowConnectModal(true);
          }}
          className="px-5 py-2.5 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold rounded-xl text-sm shadow-md flex items-center gap-2 hover:scale-[1.02] transition-transform cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Connect New Account</span>
        </button>
      </div>

      {callback?.status === 'connected' && (
        <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{callback.platform.replace('_',' ')} connected successfully.</span>
        </div>
      )}
      {callback?.status === 'error' && (
        <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>{callback.message || `${callback.platform.replace('_',' ')} connection was not completed.`}</span>
        </div>
      )}
      {connectionError && (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          {connectionError}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {socialAccounts.length === 0 && (
          <div className="md:col-span-2 lg:col-span-3 rounded-2xl border border-dashed border-slate-700 bg-slate-900/60 p-8 text-center">
            <KeyRound className="mx-auto h-7 w-7 text-slate-500" />
            <p className="mt-3 text-sm font-semibold text-white">No social provider connected yet</p>
            <p className="mt-1 text-sm text-slate-400">Connect an official provider account before scheduled posts can publish.</p>
          </div>
        )}

        {socialAccounts.map((sa) => {
          const platformObj = availablePlatforms.find((p) => p.id === sa.platform);
          return (
            <div key={sa.id} className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4 shadow-md hover:border-slate-700 transition-colors">
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`p-2.5 rounded-xl bg-slate-950 border border-slate-800 ${platformObj?.color}`}>
                    {platformObj?.icon || <Share2 className="w-5 h-5 text-slate-400" />}
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm capitalize">{sa.platform.replace('_', ' ')}</h3>
                    <p className="text-sm text-slate-400 truncate">{sa.accountHandle}</p>
                  </div>
                </div>

                {sa.connected ? (
                  <span className="flex items-center gap-1 text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 px-2 py-1 rounded-full">
                    <CheckCircle2 className="w-3 h-3" />
                    <span>Connected</span>
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-xs font-bold bg-slate-800 text-slate-400 border border-slate-700 px-2 py-1 rounded-full">
                    <AlertCircle className="w-3 h-3" />
                    <span>Disconnected</span>
                  </span>
                )}
              </div>

              <div className="pt-2 border-t border-slate-800/80 space-y-2 text-sm text-slate-400">
                <div className="flex items-center justify-between gap-3">
                  <span>Provider account</span>
                  <span className="font-semibold text-slate-200 truncate max-w-[55%]">{sa.accountName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span>Last verified</span>
                  <span className="text-slate-300">{new Date(sa.lastSyncedAt).toLocaleString()}</span>
                </div>
                {sa.expiresAt && (
                  <div className="flex items-center justify-between gap-3">
                    <span>Token expiry</span>
                    <span className="text-slate-300">{new Date(sa.expiresAt).toLocaleDateString()}</span>
                  </div>
                )}
              </div>

              {sa.connected && (
                <button
                  onClick={() => void disconnect(sa.id)}
                  disabled={disconnectingId === sa.id}
                  className="w-full rounded-xl border border-red-500/20 bg-red-500/5 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {disconnectingId === sa.id ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Unplug className="w-4 h-4" />}
                  Disconnect
                </button>
              )}
            </div>
          );
        })}
      </div>

      <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
        <h3 className="font-bold text-white">Provider readiness</h3>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-6">
          {availablePlatforms.map(platform => {
            const status = providers.find(item => item.platform === platform.id);
            return (
              <div key={platform.id} className="rounded-xl border border-slate-800 bg-slate-950 p-3">
                <div className="flex items-center gap-2 text-sm font-semibold text-white">
                  <span className={platform.color}>{platform.icon}</span>
                  <span>{platform.name}</span>
                </div>
                <div className={`mt-2 text-xs font-semibold ${status?.configured ? 'text-emerald-400' : 'text-amber-300'}`}>
                  {status?.configured ? 'Server credentials ready' : 'Provider credentials required'}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showConnectModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl">
            <h3 className="font-bold text-white text-lg flex items-center gap-2">
              <KeyRound className="w-5 h-5 text-amber-400" />
              <span>Connect Official Provider</span>
            </h3>
            <p className="text-sm leading-6 text-slate-400">
              You will be sent to the provider to approve access. V79 never asks for your social-network password.
            </p>

            <form onSubmit={handleConnectSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-bold text-slate-300 block mb-1">Platform</label>
                <select
                  value={selectedPlatform}
                  onChange={(e) => { setSelectedPlatform(e.target.value as SocialPlatform); setConnectionError(''); }}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                >
                  {availablePlatforms.map((p) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {selectedPlatform !== 'tiktok' && selectedPlatform !== 'youtube' && (
                <div>
                  <label className="text-sm font-bold text-slate-300 block mb-1">Exact Page, company or location name</label>
                  <input
                    type="text"
                    required
                    value={handleInput}
                    onChange={(e) => setHandleInput(e.target.value)}
                    placeholder={selectedPlatform === 'instagram' ? 'Instagram username or linked Facebook Page' : 'Provider account name'}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
                  />
                  <p className="mt-1 text-xs text-slate-500">This lets V79 select the correct account when your login administers more than one.</p>
                </div>
              )}

              {selectedProvider && !selectedProvider.configured && (
                <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-sm text-amber-200">
                  This provider needs its developer app credentials configured on the V79 Marketing server first.
                </div>
              )}
              {selectedPlatform === 'tiktok' && (
                <div className="rounded-xl border border-sky-500/20 bg-sky-500/10 p-3 text-xs leading-5 text-sky-200">
                  TikTok Direct Post also requires approved Content Posting access, an audited client for public visibility, verified media URLs, and explicit privacy/commercial-content choices on each post.
                </div>
              )}
              {selectedPlatform === 'youtube' && (
                <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs leading-5 text-red-100">
                  YouTube uploads use the channel attached to the Google account you authorise. Google restricts uploads from unverified API projects to private visibility until the project passes its YouTube API compliance audit.
                </div>
              )}

              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4 space-y-3">
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={acceptedPrivacy}
                    onChange={(e) => setAcceptedPrivacy(e.target.checked)}
                  />
                  <span>
                    I have read and agree to the{' '}
                    <a
                      href="https://v79sl.com/privacy"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-cyan-300 underline underline-offset-2"
                    >
                      V79 Digital Privacy Policy
                    </a>.
                  </span>
                </label>
                <label className="flex items-start gap-3 text-sm text-slate-300">
                  <input
                    className="mt-1"
                    type="checkbox"
                    checked={acceptedTerms}
                    onChange={(e) => setAcceptedTerms(e.target.checked)}
                  />
                  <span>
                    I agree to the{' '}
                    <a
                      href="https://v79sl.com/terms"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-cyan-300 underline underline-offset-2"
                    >
                      V79 Digital Terms of Service
                    </a>
                    {selectedPlatform === 'youtube' ? ', including the linked YouTube Terms of Service' : ''}.
                  </span>
                </label>
                <p className="text-xs leading-5 text-slate-500">
                  Consent version: 6 October 2026. V79 records the policy version and time you approve this provider connection.
                </p>
              </div>

              {connectionError && <p className="text-sm leading-5 text-amber-300">{connectionError}</p>}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowConnectModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm rounded-xl font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isConnecting || selectedProvider?.configured === false || !acceptedPrivacy || !acceptedTerms}
                  className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-sm rounded-xl shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConnecting && <RefreshCw className="w-3.5 h-3.5 animate-spin" />}
                  <span>{isConnecting ? 'Opening provider…' : 'Continue to provider'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
