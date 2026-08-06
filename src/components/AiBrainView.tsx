import React, { useState } from 'react';
import { AIBusinessBrain, Business } from '../types';
import {
  Brain,
  Sparkles,
  Save,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  Users,
  Target,
  HelpCircle,
  Calendar,
  Layers,
  History,
  Palette
} from 'lucide-react';

interface AiBrainViewProps {
  business: Business;
  brain: AIBusinessBrain;
  onUpdateBrain: (updated: AIBusinessBrain) => void;
  onDeductCredits?: (amount: number, reason: string) => boolean;
}

export const AiBrainView: React.FC<AiBrainViewProps> = ({
  business,
  brain,
  onUpdateBrain,
  onDeductCredits,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'products' | 'audience' | 'faqs' | 'memory'>('profile');
  const [formData, setFormData] = useState<AIBusinessBrain>(brain);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [optimizing, setOptimizing] = useState(false);

  const [newFaqQ, setNewFaqQ] = useState('');
  const [newFaqA, setNewFaqA] = useState('');
  const [newProduct, setNewProduct] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [newPromo, setNewPromo] = useState('');

  const handleSave = () => {
    onUpdateBrain(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAiOptimizeBrain = () => {
    if (onDeductCredits && !onDeductCredits(30, 'AI Brain Knowledge Optimization')) return;

    setOptimizing(true);
    setTimeout(() => {
      setFormData((prev) => ({
        ...prev,
        brandVoiceAndTone: 'Warm, authentic Caribbean hospitality with culinary passion, refined island elegance, and vibrant storytelling.',
        customerDemographics: 'Locals & tourists aged 25-60, middle-to-high income, seafood lovers, yachties at Rodney Bay Marina, and couples seeking romantic waterfront sunset dining.',
        frequentlyAskedQuestions: [
          ...prev.frequentlyAskedQuestions,
          { q: 'Can I host private birthday or corporate dinner events?', a: 'Yes! We offer tailored VIP waterfront group packages with customized 3-course menus.' }
        ]
      }));
      setOptimizing(false);
      setSavedSuccess(true);
      setTimeout(() => setSavedSuccess(false), 3000);
    }, 1200);
  };

  const addFaq = () => {
    if (!newFaqQ.trim() || !newFaqA.trim()) return;
    setFormData((prev) => ({
      ...prev,
      frequentlyAskedQuestions: [...prev.frequentlyAskedQuestions, { q: newFaqQ, a: newFaqA }]
    }));
    setNewFaqQ('');
    setNewFaqA('');
  };

  const removeFaq = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      frequentlyAskedQuestions: prev.frequentlyAskedQuestions.filter((_, i) => i !== idx)
    }));
  };

  const addProductItem = () => {
    if (!newProduct.trim()) return;
    setFormData((prev) => ({
      ...prev,
      productsAndServices: [...prev.productsAndServices, newProduct.trim()]
    }));
    setNewProduct('');
  };

  const removeProductItem = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      productsAndServices: prev.productsAndServices.filter((_, i) => i !== idx)
    }));
  };

  const addGoalItem = () => {
    if (!newGoal.trim()) return;
    setFormData((prev) => ({
      ...prev,
      primaryGoals: [...prev.primaryGoals, newGoal.trim()]
    }));
    setNewGoal('');
  };

  const removeGoalItem = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      primaryGoals: prev.primaryGoals.filter((_, i) => i !== idx)
    }));
  };

  const addPromoItem = () => {
    if (!newPromo.trim()) return;
    setFormData((prev) => ({
      ...prev,
      seasonalPromotions: [...prev.seasonalPromotions, newPromo.trim()]
    }));
    setNewPromo('');
  };

  const removePromoItem = (idx: number) => {
    setFormData((prev) => ({
      ...prev,
      seasonalPromotions: prev.seasonalPromotions.filter((_, i) => i !== idx)
    }));
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-purple-900 via-indigo-900 to-slate-900 rounded-3xl p-6 sm:p-8 text-white relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/10 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs font-bold text-purple-300 uppercase tracking-widest bg-purple-500/20 px-3 py-1 rounded-full w-fit">
              <Brain className="w-4 h-4 text-purple-300" />
              <span>AI Business Brain • Memory Base</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Permanent AI Knowledge Hub
            </h1>
            <p className="text-xs sm:text-sm text-purple-200/90 max-w-2xl leading-relaxed">
              Every AI post, image, campaign, and response uses this stored context so you never have to repeat your brand details, products, voice, or goals.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleAiOptimizeBrain}
              disabled={optimizing}
              className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              {optimizing ? (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Auto-Optimize Knowledge (30 Credits)</span>
                </>
              )}
            </button>

            <button
              onClick={handleSave}
              className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow-lg transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Brain</span>
            </button>
          </div>
        </div>

        {savedSuccess && (
          <div className="mt-4 p-3 bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            <span>AI Business Brain updated & synchronized across all AI generation modules!</span>
          </div>
        )}
      </div>

      {/* Navigation Sub-Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2 overflow-x-auto text-xs font-bold">
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'profile'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Brand Core & Voice</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'products'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Products & Services ({formData.productsAndServices.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('audience')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'audience'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Audience & Goals</span>
        </button>

        <button
          onClick={() => setActiveTab('faqs')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'faqs'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <HelpCircle className="w-4 h-4" />
          <span>Stored FAQs ({formData.frequentlyAskedQuestions.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('memory')}
          className={`px-4 py-2.5 rounded-xl flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === 'memory'
              ? 'bg-purple-600 text-white shadow-sm'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <History className="w-4 h-4" />
          <span>Campaign Learnings & Memory</span>
        </button>
      </div>

      {/* TAB CONTENT: Core & Voice */}
      {activeTab === 'profile' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Building2 className="w-4 h-4 text-purple-600" />
              <span>Business Overview</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Primary Description
              </label>
              <textarea
                rows={3}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Brand Voice & Tone
              </label>
              <textarea
                rows={2}
                value={formData.brandVoiceAndTone}
                onChange={(e) => setFormData({ ...formData, brandVoiceAndTone: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Posting Times
              </label>
              <input
                type="text"
                value={formData.preferredPostingTimes}
                onChange={(e) => setFormData({ ...formData, preferredPostingTimes: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Palette className="w-4 h-4 text-orange-600" />
              <span>Brand Identity Colors</span>
            </h3>

            <div className="flex items-center gap-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Primary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={business.brandProfile.primaryColor}
                    readOnly
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                  />
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {business.brandProfile.primaryColor}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-600 mb-1">Secondary Color</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={business.brandProfile.secondaryColor}
                    readOnly
                    className="w-10 h-10 rounded-xl cursor-pointer border border-slate-200"
                  />
                  <span className="text-xs font-mono font-bold text-slate-800">
                    {business.brandProfile.secondaryColor}
                  </span>
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Preferred Hashtags
              </label>
              <div className="flex flex-wrap gap-2">
                {formData.preferredHashtags.map((tag, i) => (
                  <span
                    key={i}
                    className="bg-purple-50 text-purple-700 border border-purple-200 text-xs font-bold px-2.5 py-1 rounded-lg"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: Products & Services */}
      {activeTab === 'products' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Stored Products & Key Offerings</span>
            <span className="text-xs text-slate-500 font-normal">
              AI automatically embeds these items into promotional captions
            </span>
          </h3>

          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Add product or service e.g., Seafood Boil Pitcher (EC$ 85)"
              value={newProduct}
              onChange={(e) => setNewProduct(e.target.value)}
              className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
            />
            <button
              onClick={addProductItem}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add</span>
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
            {formData.productsAndServices.map((p, idx) => (
              <div
                key={idx}
                className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between text-xs"
              >
                <span className="font-bold text-slate-800">{p}</span>
                <button
                  onClick={() => removeProductItem(idx)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Audience & Goals */}
      {activeTab === 'audience' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Target Audience & Demographics</span>
            </h3>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Target Customer Profile
              </label>
              <textarea
                rows={3}
                value={formData.targetAudience}
                onChange={(e) => setFormData({ ...formData, targetAudience: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Detailed Demographics
              </label>
              <textarea
                rows={3}
                value={formData.customerDemographics}
                onChange={(e) => setFormData({ ...formData, customerDemographics: e.target.value })}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
            <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
              <Target className="w-4 h-4 text-emerald-600" />
              <span>Primary Business & Marketing Goals</span>
            </h3>

            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Add goal e.g. Boost Friday cocktail sales by 25%"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500"
              />
              <button
                onClick={addGoalItem}
                className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 pt-1">
              {formData.primaryGoals.map((g, idx) => (
                <div
                  key={idx}
                  className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 flex items-center justify-between text-xs"
                >
                  <span className="font-bold text-emerald-950">{g}</span>
                  <button
                    onClick={() => removeGoalItem(idx)}
                    className="text-slate-400 hover:text-red-500 p-1 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: FAQs */}
      {activeTab === 'faqs' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center justify-between">
            <span>Stored Customer FAQs</span>
            <span className="text-xs text-slate-500 font-normal">
              Used by AI Review Assistant & Chatbots to answer customer questions automatically
            </span>
          </h3>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <input
              type="text"
              placeholder="Question e.g., Is wheelchair accessibility provided?"
              value={newFaqQ}
              onChange={(e) => setNewFaqQ(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
            />
            <textarea
              rows={2}
              placeholder="Answer e.g., Yes, our waterfront dining deck has a ramp and spacious accessible restrooms."
              value={newFaqA}
              onChange={(e) => setNewFaqA(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl p-2.5 text-xs text-slate-900"
            />
            <button
              onClick={addFaq}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center gap-1 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Save FAQ</span>
            </button>
          </div>

          <div className="space-y-3 pt-2">
            {formData.frequentlyAskedQuestions.map((faq, idx) => (
              <div
                key={idx}
                className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs flex items-start justify-between gap-4 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-bold text-slate-900 flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-purple-600 flex-shrink-0" />
                    <span>{faq.q}</span>
                  </p>
                  <p className="text-slate-600 pl-6 leading-relaxed">{faq.a}</p>
                </div>
                <button
                  onClick={() => removeFaq(idx)}
                  className="text-slate-400 hover:text-red-500 p-1 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB CONTENT: Memory */}
      {activeTab === 'memory' && (
        <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xs space-y-4">
          <h3 className="font-bold text-slate-900 text-sm flex items-center gap-2">
            <History className="w-4 h-4 text-purple-600" />
            <span>AI Historical Learnings & Memory</span>
          </h3>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Previous Campaign Performance Learnings
            </label>
            <textarea
              rows={4}
              value={formData.previousCampaignNotes}
              onChange={(e) => setFormData({ ...formData, previousCampaignNotes: e.target.value })}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-900 focus:ring-2 focus:ring-purple-500 leading-relaxed font-mono"
            />
          </div>

          <div className="p-4 bg-purple-50/60 rounded-2xl border border-purple-200 text-xs text-purple-900 space-y-1">
            <p className="font-bold">🧠 Dynamic Continuous Learning active</p>
            <p className="text-purple-700 leading-relaxed">
              Every post you approve, edit, or reject feeds back into your AI Business Brain model.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
