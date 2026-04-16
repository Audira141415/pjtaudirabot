import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FileText, Plus, Trash2, Edit, Search, X, Layers, Globe, Zap, MessageSquare, ChevronRight, Activity } from 'lucide-react';

const CATEGORIES = ['GREETING','AWAY','QUICK_REPLY','NOTIFICATION','FOLLOW_UP','CLOSING','PROMOTION','CUSTOM'];
const PLATFORMS = ['ALL','WHATSAPP','TELEGRAM'];

export default function TemplateManager() {
  const [items, setItems] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', category: 'QUICK_REPLY', platform: 'ALL', language: 'id', subject: '', body: '' });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getTemplates(filterCat || undefined); 
      setItems(r.data ?? []); 
    } catch {} 
    finally { setLoading(false); } 
  };

  useEffect(() => { load(); }, [filterCat]);

  const save = async () => {
    if (!form.name || !form.body) return;
    if (editing) { await api.updateTemplate(editing.id, form); } else { await api.createTemplate(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', category: 'QUICK_REPLY', platform: 'ALL', language: 'id', subject: '', body: '' }); load();
  };

  const remove = async (id: string) => { 
    if (!confirm('Purge this response blueprint?')) return;
    await api.deleteTemplate(id); load(); 
  };

  const startEdit = (t: Record<string, any>) => {
    setEditing(t); setForm({ name: t.name, category: t.category, platform: t.platform, language: t.language || 'id', subject: t.subject || '', body: t.body }); setShowForm(true);
  };

  const filtered = items.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.body?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Accessing Blueprint Repository...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileText className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Communication Blueprints</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Template Architect</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Design standardized responses, dynamic placeholders, and automated communiqué structures.</p>
        </div>

        <button 
           onClick={() => { setEditing(null); setForm({ name: '', category: 'QUICK_REPLY', platform: 'ALL', language: 'id', subject: '', body: '' }); setShowForm(true); }} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Manifest New Template
        </button>
      </div>

      {/* Global Filter & Search Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="md:col-span-2 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="QUER_BLUEPRINT_DATABASE..." 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] pl-14 pr-8 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm dark:shadow-none"
           />
        </div>
        <div className="relative group">
           <select 
              value={filterCat} 
              onChange={e => setFilterCat(e.target.value)} 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer shadow-sm dark:shadow-none"
           >
              <option value="">Omni-Category</option>
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
           </select>
           <Layers className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Construction Chamber (Form) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{editing ? 'Update Blueprint' : 'Manifest Response Matrix'}</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Internal Code *</label>
                 <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. WELCOME_PROTO_01" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Protocol Category</label>
                 <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 shadow-inner appearance-none cursor-pointer">
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Target Hub</label>
                 <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 shadow-inner appearance-none cursor-pointer">
                    {PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Subject Handle</label>
                 <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Optional header..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-indigo-500 shadow-inner" />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Message Payload *</label>
               <textarea 
                  value={form.body} 
                  onChange={e => setForm({...form, body: e.target.value})} 
                  placeholder="Enter communiqué body... Use {{variable}} for dynamic injection." 
                  rows={6} 
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-inner leading-relaxed" 
               />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort Manifest</button>
             <button onClick={save} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">
                {editing ? 'Recalibrate Blueprint' : 'Commit Strategy'}
             </button>
          </div>
        </div>
      )}

      {/* Blueprint Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {filtered.map(t => (
          <div key={t.id} className="group relative bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl">
             <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-indigo-600 hidden group-hover:block" />
             
             <div className="flex flex-col h-full">
                <div className="flex items-start justify-between mb-6">
                   <div className="space-y-2">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white italic leading-tight uppercase tracking-tight line-clamp-1">{t.name}</h3>
                      <div className="flex flex-wrap gap-2">
                         <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest">{t.category}</span>
                         <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800 uppercase tracking-widest">{t.platform}</span>
                      </div>
                   </div>
                   <div className="flex gap-1 ml-3 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => startEdit(t)} className="p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:text-indigo-500 transition-all"><Edit className="w-4 h-4" /></button>
                      <button onClick={() => remove(t.id)} className="p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-400 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                   </div>
                </div>

                <div className="flex-1 bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-950/50 transition-all mb-6">
                   {t.subject && <p className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-2 italic">Sub: {t.subject}</p>}
                   <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed line-clamp-4 italic">"{t.body}"</p>
                </div>

                <div className="flex items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-6">
                   <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                         <MessageSquare className="w-3 h-3" /> {t.usageCount || 0} hits
                      </div>
                      <div className="flex items-center gap-1.5 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                         <Globe className="w-3 h-3" /> {new Date(t.createdAt).toLocaleDateString()}
                      </div>
                   </div>
                   <button onClick={() => startEdit(t)} className="flex items-center gap-1 text-[9px] font-black text-slate-300 dark:text-slate-700 hover:text-indigo-600 dark:hover:text-white uppercase tracking-widest transition-all">
                      Configure Matrix <ChevronRight className="w-3 h-3" />
                   </button>
                </div>
             </div>
          </div>
        ))}

        {filtered.length === 0 && (
          <div className="col-span-full py-24 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50 grayscale">
             <Layers className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">Zero Blueprints Synced</h3>
          </div>
        )}
      </div>
    </div>
  );
}
