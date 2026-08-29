import React, { useState } from 'react';
import { CustomerInquiry, CustomerStatus, Business } from '../types';
import {
  Users,
  MessageCircle,
  Phone,
  Mail,
  Plus,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Sparkles,
  ArrowRight,
  AlertCircle,
  FileText,
  UserCheck
} from 'lucide-react';

interface CustomerPipelineViewProps {
  business: Business;
  customers: CustomerInquiry[];
  onAddCustomer: (customer: CustomerInquiry) => void;
  onUpdateCustomerStatus: (id: string, status: CustomerStatus) => void;
}

export const CustomerPipelineView: React.FC<CustomerPipelineViewProps> = ({
  business,
  customers,
  onAddCustomer,
  onUpdateCustomerStatus,
}) => {
  const [activeTab, setActiveTab] = useState<'all' | 'needs_attention'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerInquiry | null>(null);

  // Form State
  const [newName, setNewName] = useState('');
  const [newPhone, setNewPhone] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newChannel, setNewChannel] = useState<'whatsapp' | 'facebook' | 'google_business' | 'website'>('whatsapp');

  const pipelineStages: { key: CustomerStatus; label: string; bg: string; border: string; text: string }[] = [
    { key: 'NEW_INQUIRY', label: 'New Inquiries', bg: 'bg-blue-50', border: 'border-blue-200', text: 'text-blue-700' },
    { key: 'INTERESTED', label: 'Interested', bg: 'bg-amber-50', border: 'border-amber-200', text: 'text-amber-700' },
    { key: 'FOLLOW_UP', label: 'Follow Up Needed', bg: 'bg-purple-50', border: 'border-purple-200', text: 'text-purple-700' },
    { key: 'CUSTOMER', label: 'Customers', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' },
    { key: 'REPEAT_CUSTOMER', label: 'VIP Repeat', bg: 'bg-indigo-50', border: 'border-indigo-200', text: 'text-indigo-700' },
  ];

  const handleCreateCustomer = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName || !newPhone) return;

    const newInquiry: CustomerInquiry = {
      id: `cust-${Date.now()}`,
      businessId: business.id,
      name: newName,
      phone: newPhone,
      email: newEmail || undefined,
      channel: newChannel,
      status: 'NEW_INQUIRY',
      createdAt: new Date().toISOString(),
    };

    onAddCustomer(newInquiry);
    setNewName('');
    setNewPhone('');
    setNewEmail('');
    setShowAddModal(false);
  };

  const handleOpenWhatsApp = (customer: CustomerInquiry) => {
    const formattedPhone = customer.phone.replace(/[^0-9+]/g, '');
    const text = encodeURIComponent(`Hi ${customer.name}! Thank you for contacting ${business.name}. How can we assist you today?`);
    window.open(`https://wa.me/${formattedPhone}?text=${text}`, '_blank');
  };

  const filteredCustomers = customers.filter((c) => {
    if (activeTab === 'needs_attention') return c.status === 'NEW_INQUIRY' || c.status === 'FOLLOW_UP';
    if (searchQuery.trim()) {
      return (
        c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        c.phone.includes(searchQuery) ||
        (c.email && c.email.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }
    return true;
  });

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-600 uppercase tracking-wider mb-1">
            <Users className="w-4 h-4" />
            <span>SMB Customer Pipeline & WhatsApp Engine</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900">Customer Inquiries & Relationships</h1>
          <p className="text-xs text-slate-500 mt-1">
            Track inquiries from WhatsApp, Facebook, Google Business, and website in one simple pipeline
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-5 py-3 bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold rounded-2xl text-xs shadow-md hover:scale-105 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Add New Customer Inquiry</span>
        </button>
      </div>

      {/* Follow-Up Warning Engine Banner */}
      {customers.filter((c) => c.status === 'NEW_INQUIRY' || c.status === 'FOLLOW_UP').length > 0 && (
        <div className="bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 rounded-3xl p-5 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center font-bold shrink-0">
              <AlertCircle className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-sm">Follow-Up Action Required</h3>
              <p className="text-xs text-amber-100 mt-0.5">
                You have {customers.filter((c) => c.status === 'NEW_INQUIRY' || c.status === 'FOLLOW_UP').length} customer inquiries awaiting reply. Quick responses double conversion rates.
              </p>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('needs_attention')}
            className="px-4 py-2.5 bg-white text-slate-900 font-bold text-xs rounded-xl hover:bg-slate-100 transition-colors shadow-xs shrink-0 cursor-pointer"
          >
            View Pending Follow-Ups
          </button>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveTab('all')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'all'
                ? 'bg-slate-900 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            All Customers ({customers.length})
          </button>
          <button
            onClick={() => setActiveTab('needs_attention')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === 'needs_attention'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
          >
            Needs Attention ({customers.filter((c) => c.status === 'NEW_INQUIRY' || c.status === 'FOLLOW_UP').length})
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by name or phone..."
            className="w-full bg-white border border-slate-200 rounded-xl pl-9 pr-4 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>
      </div>

      {/* Kanban Pipeline Board */}
      <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {pipelineStages.map((stage) => {
          const stageCustomers = filteredCustomers.filter((c) => c.status === stage.key);
          return (
            <div key={stage.key} className="bg-slate-100/70 border border-slate-200/80 rounded-2xl p-3 space-y-3">
              <div className={`p-2.5 rounded-xl border ${stage.bg} ${stage.border} flex items-center justify-between`}>
                <span className={`text-xs font-black ${stage.text}`}>{stage.label}</span>
                <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full bg-white border ${stage.border} ${stage.text}`}>
                  {stageCustomers.length}
                </span>
              </div>

              <div className="space-y-2 max-h-[500px] overflow-y-auto no-scrollbar">
                {stageCustomers.length === 0 ? (
                  <div className="p-4 text-center text-slate-400 text-xs border border-dashed border-slate-200 rounded-xl bg-white/50">
                    No inquiries in this stage
                  </div>
                ) : (
                  stageCustomers.map((cust) => (
                    <div
                      key={cust.id}
                      className="p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs space-y-2 hover:border-emerald-300 transition-colors"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{cust.name}</h4>
                          <span className="text-[10px] text-slate-400 font-mono">{cust.phone}</span>
                        </div>
                        <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                          {cust.channel}
                        </span>
                      </div>

                      {cust.notes && <p className="text-[11px] text-slate-500 line-clamp-2">{cust.notes}</p>}

                      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1">
                        <button
                          onClick={() => handleOpenWhatsApp(cust)}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[10px] rounded-lg border border-emerald-200 flex items-center gap-1 cursor-pointer"
                        >
                          <MessageCircle className="w-3 h-3 text-emerald-600" />
                          <span>WhatsApp</span>
                        </button>

                        <select
                          value={cust.status}
                          onChange={(e) => onUpdateCustomerStatus(cust.id, e.target.value as CustomerStatus)}
                          className="text-[10px] font-bold bg-slate-50 border border-slate-200 rounded px-1.5 py-1 text-slate-700 focus:outline-none"
                        >
                          <option value="NEW_INQUIRY">New Inquiry</option>
                          <option value="INTERESTED">Interested</option>
                          <option value="FOLLOW_UP">Follow Up</option>
                          <option value="CUSTOMER">Customer</option>
                          <option value="REPEAT_CUSTOMER">VIP Repeat</option>
                        </select>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add New Customer Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-4 shadow-2xl border border-slate-200">
            <h3 className="text-lg font-black text-slate-900">Add Customer Inquiry</h3>

            <form onSubmit={handleCreateCustomer} className="space-y-3 text-xs">
              <div>
                <label className="font-bold text-slate-700 block mb-1">Customer Full Name</label>
                <input
                  type="text"
                  required
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  placeholder="e.g. Marcus Thorne"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Phone / WhatsApp Number</label>
                <input
                  type="text"
                  required
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  placeholder="e.g. +1 (758) 555-0199"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="font-bold text-slate-700 block mb-1">Channel Source</label>
                <select
                  value={newChannel}
                  onChange={(e) => setNewChannel(e.target.value as any)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 focus:outline-none font-medium"
                >
                  <option value="whatsapp">WhatsApp Direct</option>
                  <option value="facebook">Facebook Page Message</option>
                  <option value="google_business">Google Business Profile</option>
                  <option value="website">Website Form</option>
                </select>
              </div>

              <div className="flex gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 bg-emerald-600 text-white font-bold rounded-xl hover:bg-emerald-700 shadow-md"
                >
                  Save Inquiry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
