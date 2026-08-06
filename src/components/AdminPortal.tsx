import React, { useState } from 'react';
import { Business, User, AuditLog, Invoice } from '../types';
import {
  Shield,
  Building2,
  Users,
  CreditCard,
  Zap,
  Activity,
  Search,
  Lock,
  FileText,
  AlertTriangle,
  KeyRound,
  Eye,
  EyeOff,
  LogOut,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

interface AdminPortalProps {
  businesses: Business[];
  users: User[];
  auditLogs: AuditLog[];
  invoices: Invoice[];
  currency: 'XCD' | 'USD';
  onExitAdmin?: () => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  businesses,
  users,
  auditLogs,
  invoices,
  currency,
  onExitAdmin,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => sessionStorage.getItem('v79_admin_unlocked') === 'true'
  );
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleAuthenticate = (e: React.FormEvent) => {
    e.preventDefault();
    if (
      passwordInput === 'v79admin' ||
      passwordInput === 'admin123' ||
      passwordInput.toLowerCase() === 'admin'
    ) {
      setIsAuthenticated(true);
      sessionStorage.setItem('v79_admin_unlocked', 'true');
      setAuthError('');
    } else {
      setAuthError('Incorrect admin passcode. Try default passcode: v79admin');
    }
  };

  const handleLockPortal = () => {
    setIsAuthenticated(false);
    sessionStorage.removeItem('v79_admin_unlocked');
    setPasswordInput('');
    if (onExitAdmin) {
      onExitAdmin();
    }
  };

  // Render Password Lock Screen if not authenticated
  if (!isAuthenticated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-3xl p-8 border border-slate-200 shadow-xl text-slate-800 space-y-6 text-center relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-2 bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600" />
          
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-cyan-500 to-blue-600 flex items-center justify-center text-white mx-auto shadow-lg shadow-blue-200">
            <Lock className="w-8 h-8" />
          </div>

          <div>
            <span className="bg-purple-100 text-purple-800 text-[10px] font-black uppercase tracking-widest px-2.5 py-1 rounded-full">
              Route: /admin
            </span>
            <h2 className="text-2xl font-black text-slate-900 mt-2">Admin Portal Locked</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              This administrative area is restricted. Enter the master system passcode to access global tenant management and audit controls.
            </p>
          </div>

          <form onSubmit={handleAuthenticate} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Admin Passcode
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Enter admin passcode"
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl pl-9 pr-10 py-2.5 text-sm font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white transition-all"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-3 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {authError && (
              <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-xs font-semibold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 flex-shrink-0 text-red-500" />
                <span>{authError}</span>
              </div>
            )}

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between font-mono">
              <span className="text-[11px] text-slate-500">Default Passcode:</span>
              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                v79admin
              </span>
            </div>

            <button
              type="submit"
              className="w-full py-3 bg-gradient-to-r from-blue-600 via-cyan-600 to-indigo-600 hover:opacity-95 text-white font-black text-sm rounded-xl shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Shield className="w-4 h-4" />
              <span>Unlock Admin Portal</span>
            </button>
          </form>

          <div className="pt-2 border-t border-slate-100">
            <button
              onClick={onExitAdmin}
              className="w-full py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Return to Marketing Hub (/)</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const totalRevenueXCD = invoices.reduce((sum, inv) => sum + inv.amountXCD, 0);
  const totalRevenueUSD = invoices.reduce((sum, inv) => sum + inv.amountUSD, 0);

  const filteredBusinesses = businesses.filter((b) =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.industry.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 uppercase tracking-wider mb-1">
            <Shield className="w-4 h-4" />
            <span>Platform Administrator Portal (/admin)</span>
          </div>
          <h1 className="text-2xl font-black text-white">V79 Digital Platform Control</h1>
          <p className="text-xs text-slate-400 mt-1">
            Global tenant oversight, subscription billing, system health & audit security logs
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-3 py-1.5 rounded-xl">
            <Activity className="w-4 h-4" />
            <span>System Health: 99.98%</span>
          </div>
          <button
            onClick={handleLockPortal}
            className="flex items-center gap-1.5 text-xs font-bold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            <LogOut className="w-3.5 h-3.5 text-red-400" />
            <span>Lock & Exit (/admin)</span>
          </button>
        </div>
      </div>

      {/* Admin KPI Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Total Registered SMBs</span>
            <Building2 className="w-4 h-4 text-orange-400" />
          </div>
          <span className="text-2xl font-black text-white">{businesses.length}</span>
          <p className="text-[11px] text-slate-500">Multi-tenant isolates</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Platform Revenue</span>
            <CreditCard className="w-4 h-4 text-emerald-400" />
          </div>
          <span className="text-2xl font-black text-white">
            {currency === 'XCD' ? `EC$ ${totalRevenueXCD}` : `$${totalRevenueUSD}`}
          </span>
          <p className="text-[11px] text-slate-500">Active monthly subscriptions</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Platform Users</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <span className="text-2xl font-black text-white">{users.length}</span>
          <p className="text-[11px] text-slate-500">Role-based accounts</p>
        </div>

        <div className="bg-slate-900 rounded-xl p-4 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span>Gemini API Usage</span>
            <Zap className="w-4 h-4 text-purple-400" />
          </div>
          <span className="text-2xl font-black text-white">1,420 Ops</span>
          <p className="text-[11px] text-slate-500">Gemini 3.6 Flash calls</p>
        </div>
      </div>

      {/* Tenants Table */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="font-bold text-white text-base">Registered Business Tenants</h3>
          <div className="relative max-w-xs w-full">
            <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search business name or industry..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 uppercase tracking-wider text-[10px]">
              <tr>
                <th className="p-3">Business Name</th>
                <th className="p-3">Industry</th>
                <th className="p-3">Plan</th>
                <th className="p-3">Location</th>
                <th className="p-3">Joined Date</th>
                <th className="p-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filteredBusinesses.map((b) => (
                <tr key={b.id} className="hover:bg-slate-800/50">
                  <td className="p-3 font-bold text-white flex items-center gap-2">
                    <img src={b.logoUrl} alt={b.name} className="w-6 h-6 rounded-full object-cover" />
                    <span>{b.name}</span>
                  </td>
                  <td className="p-3 text-slate-400">{b.industry}</td>
                  <td className="p-3">
                    <span className="bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded text-[10px]">
                      {b.plan}
                    </span>
                  </td>
                  <td className="p-3 text-slate-400">{b.location}</td>
                  <td className="p-3 text-slate-500">{new Date(b.createdAt).toLocaleDateString()}</td>
                  <td className="p-3">
                    <button className="text-xs text-amber-400 hover:underline">Manage Limits</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Security Audit Logs */}
      <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
        <h3 className="font-bold text-white text-base flex items-center gap-2">
          <Lock className="w-4 h-4 text-amber-400" />
          <span>OWASP Security & Platform Audit Logs</span>
        </h3>

        <div className="space-y-2">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between text-xs"
            >
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-slate-200">{log.userName}</span>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.2 rounded font-mono">
                    {log.action}
                  </span>
                </div>
                <p className="text-slate-400 text-xs">{log.details}</p>
              </div>

              <div className="text-right text-[10px] text-slate-500 font-mono">
                <p>{log.ipAddress}</p>
                <p>{new Date(log.timestamp).toLocaleTimeString()}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
