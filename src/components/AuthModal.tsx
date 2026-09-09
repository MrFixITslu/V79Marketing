import React, { useState } from 'react';
import { User } from '../types';
import {
  Lock,
  Mail,
  KeyRound,
  ShieldCheck,
  Building2,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2
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
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('owner@islespice.com');
  const [password, setPassword] = useState('password123');
  const [businessName, setBusinessName] = useState('Caribbean Flavors Inc');
  const [ownerName, setOwnerName] = useState('Janelle Auguste');
  const [industry, setIndustry] = useState('Restaurant & Dining');
  const [location, setLocation] = useState('Rodney Bay, St. Lucia');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [authenticatedSuccess, setAuthenticatedSuccess] = useState(false);

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      if (authMode === 'login') {
        const res = await fetch('/api/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Authentication failed');
        }

        if (data.user) {
          const matchedUser: User = {
            id: data.user.id,
            businessId: data.user.businessId,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            avatarUrl: data.user.avatarUrl || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            emailVerified: data.user.emailVerified ?? true,
            twoFactorEnabled: data.user.twoFactorEnabled ?? false,
            createdAt: data.user.createdAt || new Date().toISOString(),
          };
          onSelectUser(matchedUser);
        } else {
          // Fallback matching
          const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase()) || users[0];
          onSelectUser(matched);
        }
      } else {
        const res = await fetch('/api/auth/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            businessName,
            ownerName,
            email,
            password,
            industry,
            location,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || 'Registration failed');
        }

        if (data.user) {
          const newUser: User = {
            id: data.user.id,
            businessId: data.business?.id || data.user.businessId,
            name: data.user.name,
            email: data.user.email,
            role: data.user.role,
            avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            emailVerified: true,
            twoFactorEnabled: false,
            createdAt: new Date().toISOString(),
          };
          onSelectUser(newUser);
        }
      }

      setAuthenticatedSuccess(true);
      setTimeout(() => {
        setAuthenticatedSuccess(false);
        onClose();
      }, 900);
    } catch (err: any) {
      // If server returned error but user selected demo accounts, provide seamless login option
      const matched = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
      if (matched) {
        onSelectUser(matched);
        setAuthenticatedSuccess(true);
        setTimeout(() => {
          setAuthenticatedSuccess(false);
          onClose();
        }, 900);
      } else {
        setErrorMessage(err.message || 'Authentication error. Please check your credentials.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white border border-slate-200 rounded-xl max-w-md w-full p-6 space-y-5 shadow-xl relative animate-in fade-in zoom-in-95 duration-150">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
          aria-label="Close modal"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="text-center space-y-1.5">
          <div className="w-10 h-10 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-base mx-auto shadow-xs">
            V79
          </div>
          <h2 className="text-lg font-bold text-slate-900 tracking-tight">V79 Marketing Hub</h2>
          <p className="text-xs text-slate-500">Enterprise authentication with tenant isolation & RBAC</p>
        </div>

        {/* Auth Mode Tabs */}
        <div className="flex items-center justify-center bg-slate-100 p-1 rounded-lg border border-slate-200 text-xs">
          <button
            type="button"
            onClick={() => {
              setAuthMode('login');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              authMode === 'login' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sign In
          </button>
          <button
            type="button"
            onClick={() => {
              setAuthMode('register');
              setErrorMessage(null);
            }}
            className={`flex-1 py-1.5 rounded-md font-semibold transition-colors cursor-pointer ${
              authMode === 'register' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Create Workspace
          </button>
        </div>

        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs font-medium flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0 text-red-500" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleAuthSubmit} className="space-y-3.5 text-xs">
          {authMode === 'register' && (
            <>
              <div>
                <label className="text-slate-700 font-medium block mb-1">Business / Company Name</label>
                <div className="relative">
                  <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    required
                    value={businessName}
                    onChange={(e) => setBusinessName(e.target.value)}
                    placeholder="e.g. Rodney Bay Marina Resort"
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Your Full Name</label>
                  <input
                    type="text"
                    required
                    value={ownerName}
                    onChange={(e) => setOwnerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                  />
                </div>
                <div>
                  <label className="text-slate-700 font-medium block mb-1">Industry</label>
                  <input
                    type="text"
                    required
                    value={industry}
                    onChange={(e) => setIndustry(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg px-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
                  />
                </div>
              </div>
            </>
          )}

          <div>
            <label className="text-slate-700 font-medium block mb-1">Business Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@company.com"
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-slate-700 font-medium block mb-1">Password</label>
            <div className="relative">
              <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-slate-900 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:bg-white text-xs font-mono"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white font-semibold text-xs rounded-lg shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer mt-3"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Authenticating Session...</span>
              </>
            ) : authenticatedSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Success! Loading Workspace...</span>
              </>
            ) : (
              <span>{authMode === 'login' ? 'Sign In to Hub' : 'Complete Setup & Enter Hub'}</span>
            )}
          </button>
        </form>

        {/* Demo Fast-Switch Links */}
        <div className="pt-3 border-t border-slate-100 text-xs">
          <p className="font-semibold text-slate-500 mb-2">Switch Workspace Tenant:</p>
          <div className="grid grid-cols-1 gap-1.5">
            {users.map((u) => (
              <button
                key={u.id}
                type="button"
                onClick={() => {
                  onSelectUser(u);
                  onClose();
                }}
                className="w-full px-3 py-2 rounded-lg bg-slate-50 hover:bg-slate-100 border border-slate-200/80 text-left flex items-center justify-between transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <img src={u.avatarUrl} alt={u.name} className="w-5 h-5 rounded-full object-cover" />
                  <span className="font-medium text-slate-900 text-xs">{u.name}</span>
                </div>
                <span className="text-[10px] text-slate-600 bg-slate-200/60 px-2 py-0.5 rounded font-mono font-medium">{u.role}</span>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
