import React, { useState } from 'react';
import { User, UserRole } from '../types';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Building2,
  X,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

interface AuthModalProps {
  users: User[];
  currentUser: User;
  onSelectUser: (user: User) => void;
  onClose: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({
  users,
  currentUser,
  onSelectUser,
  onClose,
}) => {
  const [authMode, setAuthMode] = useState<'login' | 'register' | '2fa'>('login');
  const [email, setEmail] = useState('owner@islespice.com');
  const [password, setPassword] = useState('••••••••••••');
  const [twoFactorCode, setTwoFactorCode] = useState('');
  const [authenticatedSuccess, setAuthenticatedSuccess] = useState(false);

  const handleAuthSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (authMode === 'login' && email.includes('admin')) {
      const adminUser = users.find((u) => u.role === 'PLATFORM_ADMIN') || users[0];
      onSelectUser(adminUser);
    } else {
      const ownerUser = users.find((u) => u.role === 'BUSINESS_OWNER') || users[0];
      onSelectUser(ownerUser);
    }
    setAuthenticatedSuccess(true);
    setTimeout(() => {
      setAuthenticatedSuccess(false);
      onClose();
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-6 shadow-2xl relative">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-white"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-orange-500 to-amber-400 flex items-center justify-center font-black text-xl text-white mx-auto shadow-lg">
            V79
          </div>
          <h2 className="text-xl font-extrabold text-white">V79 Enterprise Auth</h2>
          <p className="text-xs text-slate-400">JWT Authentication with Role-Based Access Control</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex items-center justify-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
          <button
            onClick={() => setAuthMode('login')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
              authMode === 'login' ? 'bg-orange-500 text-white' : 'text-slate-400'
            }`}
          >
            Email Login
          </button>
          <button
            onClick={() => setAuthMode('register')}
            className={`flex-1 py-1.5 rounded-lg font-bold transition-colors ${
              authMode === 'register' ? 'bg-orange-500 text-white' : 'text-slate-400'
            }`}
          >
            Register SMB
          </button>
        </div>

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-4 text-xs">
          <div>
            <label className="text-slate-300 font-bold block mb-1">Business Email</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="text-slate-300 font-bold block mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-white focus:outline-none font-mono"
            />
          </div>

          {/* Social OAuth Simulation Buttons */}
          <div className="space-y-2 pt-2">
            <p className="text-[10px] text-slate-500 text-center uppercase font-bold tracking-wider">Or Single Sign-On</p>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  onSelectUser(users[0]);
                  onClose();
                }}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2"
              >
                <span>Google OAuth</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  onSelectUser(users[1]);
                  onClose();
                }}
                className="py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 font-semibold text-xs flex items-center justify-center gap-2"
              >
                <span>Microsoft SSO</span>
              </button>
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-gradient-to-r from-orange-500 to-amber-500 text-white font-bold text-xs rounded-xl shadow-lg hover:scale-105 transition-transform flex items-center justify-center gap-2 cursor-pointer mt-4"
          >
            {authenticatedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Authenticated! Redirecting...</span>
              </>
            ) : (
              <span>Sign In to V79 Marketing Hub</span>
            )}
          </button>
        </form>

        {/* Demo Switcher Quick Links */}
        <div className="pt-4 border-t border-slate-800 text-xs">
          <p className="font-bold text-slate-400 mb-2">Instant Demo Role Logins:</p>
          <div className="space-y-1">
            {users.map((u) => (
              <button
                key={u.id}
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="w-full p-2 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-left flex items-center justify-between text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full" />
                  <span className="font-semibold text-xs">{u.name}</span>
                </div>
                <span className="text-[10px] text-amber-400 font-mono">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
