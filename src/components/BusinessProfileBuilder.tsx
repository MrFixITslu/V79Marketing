import React, { useState } from 'react';
import { Business, ProductService, OpeningHours, BrandProfile } from '../types';
import {
  Building2,
  Image as ImageIcon,
  MapPin,
  Phone,
  Mail,
  Globe,
  Clock,
  Palette,
  Plus,
  Trash2,
  Save,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Tag
} from 'lucide-react';

interface BusinessProfileBuilderProps {
  business: Business;
  onUpdateBusiness: (updated: Business) => void;
  onViewPublicProfile: () => void;
}

export const BusinessProfileBuilder: React.FC<BusinessProfileBuilderProps> = ({
  business,
  onUpdateBusiness,
  onViewPublicProfile,
}) => {
  const [formData, setFormData] = useState<Business>({ ...business });
  const [isSaved, setIsSaved] = useState(false);
  const [activeSubTab, setActiveSubTab] = useState<'info' | 'branding' | 'hours' | 'products'>('info');

  const [newProductName, setNewProductName] = useState('');
  const [newProductPrice, setNewProductPrice] = useState('');
  const [newProductDesc, setNewProductDesc] = useState('');
  const [newProductCategory, setNewProductCategory] = useState('Mains');

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await fetch(`/api/businesses/${formData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const data = await response.json();
      if (data.success) {
        onUpdateBusiness(formData);
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 3000);
      }
    } catch (err) {
      onUpdateBusiness(formData);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    }
  };

  const handleAddProduct = () => {
    if (!newProductName || !newProductPrice) return;
    const newProd: ProductService = {
      id: `prod-${Date.now()}`,
      name: newProductName,
      price: newProductPrice,
      description: newProductDesc,
      category: newProductCategory,
    };
    setFormData({
      ...formData,
      products: [...formData.products, newProd],
    });
    setNewProductName('');
    setNewProductPrice('');
    setNewProductDesc('');
  };

  const handleRemoveProduct = (id: string) => {
    setFormData({
      ...formData,
      products: formData.products.filter((p) => p.id !== id),
    });
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-md">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-orange-400 uppercase tracking-wider mb-1">
            <Building2 className="w-4 h-4" />
            <span>Digital Presence & Storefront Builder</span>
          </div>
          <h1 className="text-2xl font-black text-white">Business Profile Management</h1>
          <p className="text-xs text-slate-400 mt-1">
            Configure your public profile page hosted at <code className="text-amber-300 font-mono">v79marketing.com/business/{formData.slug}</code>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewPublicProfile}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
            <span>Preview Public Page</span>
          </button>

          <button
            onClick={handleSave}
            className="px-6 py-2 bg-gradient-to-r from-orange-500 to-amber-500 hover:opacity-90 text-white font-bold rounded-xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            {isSaved ? <Check className="w-4 h-4 text-white" /> : <Save className="w-4 h-4" />}
            <span>{isSaved ? 'Changes Saved!' : 'Save Profile'}</span>
          </button>
        </div>
      </div>

      {/* Profile Builder Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 text-xs">
        <button
          onClick={() => setActiveSubTab('info')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeSubTab === 'info' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          Core Business Details
        </button>
        <button
          onClick={() => setActiveSubTab('branding')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeSubTab === 'branding' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          Brand Colors & AI Voice
        </button>
        <button
          onClick={() => setActiveSubTab('hours')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeSubTab === 'hours' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          Opening Hours
        </button>
        <button
          onClick={() => setActiveSubTab('products')}
          className={`px-4 py-2 rounded-lg font-bold transition-colors ${
            activeSubTab === 'products' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:bg-slate-900'
          }`}
        >
          Products & Services Catalog ({formData.products.length})
        </button>
      </div>

      {/* Sub-Tab 1: Core Details */}
      {activeSubTab === 'info' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Business Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Profile URL Slug</label>
              <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-slate-400">
                <span className="text-xs text-slate-500 mr-1">/business/</span>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value.toLowerCase().replace(/\s+/g, '-') })}
                  className="bg-transparent text-amber-300 font-mono w-full focus:outline-none"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Industry / Sector</label>
              <input
                type="text"
                value={formData.industry}
                onChange={(e) => setFormData({ ...formData, industry: e.target.value })}
                placeholder="e.g. Food & Hospitality, Retail, Tourism"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Location Address</label>
              <input
                type="text"
                value={formData.location}
                onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Phone Number</label>
              <input
                type="text"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">WhatsApp Direct Number (With Country Code)</label>
              <input
                type="text"
                value={formData.whatsapp}
                onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
                placeholder="+17584529789"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-emerald-300 focus:outline-none focus:border-emerald-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Email Address</label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Official Website URL</label>
              <input
                type="text"
                value={formData.website}
                onChange={(e) => setFormData({ ...formData, website: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-xs font-bold text-slate-300">Business Description & Story</label>
            <textarea
              rows={4}
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-orange-500"
            />
          </div>

          {/* Logo & Cover URLs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Logo Image URL</label>
              <input
                type="text"
                value={formData.logoUrl}
                onChange={(e) => setFormData({ ...formData, logoUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none"
              />
              <img src={formData.logoUrl} alt="Logo preview" className="w-16 h-16 rounded-xl object-cover border border-slate-800 mt-2" />
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-slate-300">Cover Banner URL</label>
              <input
                type="text"
                value={formData.coverImageUrl}
                onChange={(e) => setFormData({ ...formData, coverImageUrl: e.target.value })}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none"
              />
              <img src={formData.coverImageUrl} alt="Cover preview" className="w-full h-16 rounded-xl object-cover border border-slate-800 mt-2" />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 2: Brand Profile & AI Voice */}
      {activeSubTab === 'branding' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div>
            <h3 className="font-bold text-white text-base flex items-center gap-2">
              <Palette className="w-5 h-5 text-orange-400" />
              <span>Brand Identity & AI Customization</span>
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Gemini AI reads these guidelines when generating captions, social copy, and AI images.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Primary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.brandProfile?.primaryColor || '#EA580C'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandProfile: { ...formData.brandProfile, primaryColor: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border-0"
                />
                <input
                  type="text"
                  value={formData.brandProfile?.primaryColor || '#EA580C'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandProfile: { ...formData.brandProfile, primaryColor: e.target.value },
                    })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Secondary Brand Color</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.brandProfile?.secondaryColor || '#0D9488'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandProfile: { ...formData.brandProfile, secondaryColor: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border-0"
                />
                <input
                  type="text"
                  value={formData.brandProfile?.secondaryColor || '#0D9488'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandProfile: { ...formData.brandProfile, secondaryColor: e.target.value },
                    })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Accent Gold/Highlight</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={formData.brandProfile?.accentColor || '#F59E0B'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandProfile: { ...formData.brandProfile, accentColor: e.target.value },
                    })
                  }
                  className="w-10 h-10 rounded-lg cursor-pointer bg-slate-950 border-0"
                />
                <input
                  type="text"
                  value={formData.brandProfile?.accentColor || '#F59E0B'}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      brandProfile: { ...formData.brandProfile, accentColor: e.target.value },
                    })
                  }
                  className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white font-mono"
                />
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Brand Tagline</label>
              <input
                type="text"
                value={formData.brandProfile?.tagline || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    brandProfile: { ...formData.brandProfile, tagline: e.target.value },
                  })
                }
                placeholder="e.g. Savor the spice of the islands."
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Brand Voice & Personality</label>
              <textarea
                rows={3}
                value={formData.brandProfile?.brandVoice || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    brandProfile: { ...formData.brandProfile, brandVoice: e.target.value },
                  })
                }
                placeholder="e.g. Warm, vibrant, welcoming Caribbean hospitality with culinary passion"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-300">Target Audience Description</label>
              <input
                type="text"
                value={formData.brandProfile?.targetAudience || ''}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    brandProfile: { ...formData.brandProfile, targetAudience: e.target.value },
                  })
                }
                placeholder="e.g. Locals, food enthusiasts, tourists, sunset diners"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Sub-Tab 3: Hours */}
      {activeSubTab === 'hours' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-4">
          <h3 className="font-bold text-white text-base">Opening Hours Schedule</h3>
          <div className="space-y-2">
            {formData.openingHours.map((oh, idx) => (
              <div key={oh.day} className="flex items-center justify-between p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs">
                <span className="font-bold text-slate-200 w-28">{oh.day}</span>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-slate-400 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={oh.closed}
                      onChange={(e) => {
                        const newHours = [...formData.openingHours];
                        newHours[idx].closed = e.target.checked;
                        setFormData({ ...formData, openingHours: newHours });
                      }}
                      className="rounded border-slate-700 bg-slate-900 text-orange-500 focus:ring-0"
                    />
                    <span>Closed Today</span>
                  </label>

                  {!oh.closed && (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={oh.open}
                        onChange={(e) => {
                          const newHours = [...formData.openingHours];
                          newHours[idx].open = e.target.value;
                          setFormData({ ...formData, openingHours: newHours });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs text-center w-24"
                      />
                      <span className="text-slate-500">to</span>
                      <input
                        type="text"
                        value={oh.close}
                        onChange={(e) => {
                          const newHours = [...formData.openingHours];
                          newHours[idx].close = e.target.value;
                          setFormData({ ...formData, openingHours: newHours });
                        }}
                        className="bg-slate-900 border border-slate-800 rounded-lg px-2.5 py-1 text-slate-200 text-xs text-center w-24"
                      />
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Sub-Tab 4: Products & Services */}
      {activeSubTab === 'products' && (
        <div className="bg-slate-900 rounded-2xl p-6 border border-slate-800 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-white text-base">Showcase Catalog Items</h3>
            <span className="text-xs text-slate-400">{formData.products.length} Items Listed</span>
          </div>

          {/* Add New Product Form */}
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <p className="text-xs font-bold text-orange-400">Add New Product or Service Item</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <input
                type="text"
                placeholder="Item Name (e.g., Jerk Glazed Pork Ribs)"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Price (e.g., EC$ 65.00)"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
              <input
                type="text"
                placeholder="Category (e.g., Mains, Apparel)"
                value={newProductCategory}
                onChange={(e) => setNewProductCategory(e.target.value)}
                className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              />
            </div>
            <textarea
              placeholder="Short Description..."
              value={newProductDesc}
              onChange={(e) => setNewProductDesc(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-xs text-white focus:outline-none"
              rows={2}
            />
            <button
              onClick={handleAddProduct}
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Catalog</span>
            </button>
          </div>

          {/* Existing Products List */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {formData.products.map((prod) => (
              <div key={prod.id} className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-white text-sm">{prod.name}</span>
                    <span className="text-[10px] bg-slate-800 text-amber-300 font-bold px-2 py-0.5 rounded-full">{prod.price}</span>
                  </div>
                  <p className="text-xs text-slate-400">{prod.description}</p>
                  <span className="text-[10px] text-slate-500 block">Category: {prod.category}</span>
                </div>
                <button
                  onClick={() => handleRemoveProduct(prod.id)}
                  className="p-1.5 text-slate-500 hover:text-red-400 bg-slate-900 rounded-lg"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
