import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  BookOpen, 
  Plus, 
  Trash2, 
  Edit, 
  X, 
  Search, 
  Layers, 
  Activity, 
  Zap, 
  Info, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  Hash, 
  Quote, 
  Clock, 
  ShieldCheck, 
  BarChart3,
  Filter
} from 'lucide-react';
import { toast } from '../components/Toast';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  aliases: string[];
  priority: number;
  matchCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function FAQManager() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [fQuestion, setFQuestion] = useState('');
  const [fAnswer, setFAnswer] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fKeywords, setFKeywords] = useState('');
  const [fAliases, setFAliases] = useState('');
  const [fPriority, setFPriority] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (category) filters.category = category;
      if (search) filters.search = search;
      const res = await api.getFAQ(1, filters);
      setItems(res.data as unknown as FAQItem[]);
      setCategories(res.categories || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [category, search]);

  const resetForm = () => {
    setFQuestion(''); setFAnswer(''); setFCategory(''); setFKeywords(''); setFAliases(''); setFPriority(0);
    setEditing(null); setShowForm(false);
  };

  const handleEdit = (item: FAQItem) => {
    setEditing(item);
    setFQuestion(item.question);
    setFAnswer(item.answer);
    setFCategory(item.category || '');
    setFKeywords((item.keywords || []).join(', '));
    setFAliases((item.aliases || []).join(', '));
    setFPriority(item.priority);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!fQuestion.trim() || !fAnswer.trim()) return;
    const payload = {
      question: fQuestion.trim(),
      answer: fAnswer.trim(),
      category: fCategory.trim() || undefined,
      keywords: fKeywords.split(',').map(k => k.trim()).filter(Boolean),
      aliases: fAliases.split(',').map(a => a.trim()).filter(Boolean),
      priority: fPriority,
    };
    try {
      if (editing) {
        await api.updateFAQ(editing.id, payload);
      } else {
        await api.createFAQ(payload);
      }
      toast({ type: 'success', title: 'INTELLIGENCE_COMMITTED', message: 'FAQ node established.' });
      resetForm();
      load();
    } catch {
      toast({ type: 'error', title: 'SYNC_FAILURE', message: 'Failed to establish neural node.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Purge this FAQ blueprint?')) return;
    try {
      await api.deleteFAQ(id);
      toast({ type: 'info', title: 'NODE_PURGED', message: 'FAQ removed from indices.' });
      load();
    } catch {}
  };

  const totalMatches = items.reduce((s, i) => s + (i.matchCount || 0), 0);

  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Semantic Memory...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BookOpen className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Semantic Intel Hub</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">FAQ Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Manage automated response blueprints, keyword semantic filters, and inquiry resolution logs.</p>
        </div>

        <button 
           onClick={() => { resetForm(); setShowForm(true); }} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Manifest New FAQ
        </button>
      </div>

      {/* Logic Stats Cluster */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'Intel Blueprints', value: items.length, icon: Layers, color: 'text-slate-400' },
           { label: 'Active Protocols', value: items.filter(i => i.isActive).length, icon: ShieldCheck, color: 'text-emerald-500' },
           { label: 'Topic Hubs', value: categories.length, icon: Filter, color: 'text-sky-500' },
           { label: 'Semantic Hits', value: totalMatches, icon: Activity, color: 'text-indigo-500' },
         ].map((card, i) => (
           <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-6 rounded-[32px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all" />
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <card.icon className="w-3.5 h-3.5" /> {card.label}
              </p>
              <p className={`text-3xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
           </div>
         ))}
      </div>

      {/* Global Filter & Query Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="md:col-span-2 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="QUERY_SEMANTIC_BLUEPRINTS..." 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] pl-14 pr-8 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm dark:shadow-none"
           />
        </div>
        <div className="relative group">
           <select 
              value={category} 
              onChange={e => setCategory(e.target.value)} 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer shadow-sm dark:shadow-none"
           >
              <option value="">Omni-Category Hub</option>
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <Layers className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Manifestation Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{editing ? 'Reprogram FAQ' : 'Manifest Semantic Entry'}</h3>
            </div>
            <button onClick={resetForm} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Inquiry String (Question) *</label>
                <input value={fQuestion} onChange={e => setFQuestion(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" placeholder="e.g. How do I synchronize my neural link?" />
             </div>
             
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Response Matrix (Answer) *</label>
                <textarea value={fAnswer} onChange={e => setFAnswer(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 leading-relaxed min-h-[140px]" placeholder="Provide the resolution communiqué..." />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Topic Hub</label>
                   <input value={fCategory} onChange={e => setFCategory(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" placeholder="e.g. CORE_LOGIC" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Priority Index (0=High)</label>
                   <input type="number" value={fPriority} onChange={e => setFPriority(Number(e.target.value))} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Semantic Keywords (Comma-Separated)</label>
                   <input value={fKeywords} onChange={e => setFKeywords(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs font-black shadow-inner outline-none focus:border-indigo-500 transition-all font-mono" placeholder="sync, neural, link, reset" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Inquiry Aliases (Comma-Separated)</label>
                   <input value={fAliases} onChange={e => setFAliases(e.target.value)} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs font-black shadow-inner outline-none focus:border-indigo-500 transition-all font-mono italic" placeholder="link frozen, neural sync failed" />
                </div>
             </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={resetForm} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
             <button onClick={handleSubmit} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">
                {editing ? 'Commit Reprogram' : 'Manifest FAQ'}
             </button>
          </div>
        </div>
      )}

      {/* Intel Ledger */}
      <div className="space-y-6">
        {items.length === 0 ? (
          <div className="py-24 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50 grayscale">
             <BookOpen className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero FAQ Blueprints Indexed</p>
          </div>
        ) : (
          items.map(item => (
            <div key={item.id} className="group relative bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl">
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all ${item.isActive ? 'bg-emerald-500 shadow-[2px_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-800'}`} />
               
               <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 relative z-10">
                  <div className="flex-1 space-y-4">
                     <div className="flex flex-wrap items-center gap-3">
                        <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{item.question}</h3>
                        {item.category && <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest shadow-sm">{item.category}</span>}
                        <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest flex items-center gap-1.5">
                           <Activity className="w-3 h-3" /> Hits: {item.matchCount || 0}
                        </span>
                     </div>
                     
                     <div className="bg-white/50 dark:bg-slate-900/60 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-950/40 transition-all italic text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                        "{item.answer}"
                     </div>

                     <div className="flex flex-wrap gap-x-6 gap-y-2 pt-2">
                        {item.keywords && item.keywords.length > 0 && (
                          <div className="flex items-center gap-2">
                             <Hash className="w-3.5 h-3.5 text-indigo-500" />
                             <div className="flex flex-wrap gap-1">
                               {item.keywords.map((kw, i) => (
                                 <span key={i} className="text-[9px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest italic">{kw}</span>
                               ))}
                             </div>
                          </div>
                        )}
                        {item.aliases && item.aliases.length > 0 && (
                          <div className="flex items-center gap-2">
                             <Quote className="w-3.5 h-3.5 text-purple-500" />
                             <div className="flex flex-wrap gap-1">
                               {item.aliases.map((a, i) => (
                                 <span key={i} className="text-[9px] font-black text-purple-600 dark:text-purple-400 uppercase tracking-[0.05em] italic">"{a}"</span>
                               ))}
                             </div>
                          </div>
                        )}
                     </div>
                  </div>

                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 origin-right">
                     <button onClick={() => handleEdit(item)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-indigo-600 hover:border-indigo-500/30 rounded-2xl transition-all shadow-xl active:scale-95">
                        <Edit className="w-5 h-5" />
                     </button>
                     <button onClick={() => handleDelete(item.id)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/20 rounded-2xl transition-all shadow-xl active:scale-95">
                        <Trash2 className="w-5 h-5" />
                     </button>
                  </div>
               </div>
            </div>
          ))
        )}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Intelligence Asset</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Automated FAQ Semantic Recognition Engaged</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Semantic hits improve automatic response accuracy over time.</span>
         </div>
      </div>
    </div>
  );
}
