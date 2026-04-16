import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Tag, Plus, Trash2, Edit, X, Layers, Activity, ChevronRight, Zap, Info, ShieldCheck } from 'lucide-react';

const COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b'];

export default function TagsLabels() {
  const [tags, setTags] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', description: '', category: '' });

  const load = async () => { setLoading(true); try { const r = await api.getTags(); setTags(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    if (editing) { await api.updateTag(editing.id, form); } else { await api.createTag(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', color: '#6366f1', description: '', category: '' }); load();
  };
  const remove = async (id: string) => { 
    if (!confirm('Purge this metadata marker?')) return;
    await api.deleteTag(id); load(); 
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Scanning Metadata Registry...</span>
    </div>
  );

  const categories = [...new Set(tags.map(t => t.category).filter(Boolean))];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Tag className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Metadata Taxonomy</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Tags & Labels</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Define organizational markers, priority flags, and system-wide categorization protocols.</p>
        </div>

        <button 
           onClick={() => { setEditing(null); setForm({ name: '', color: '#6366f1', description: '', category: '' }); setShowForm(true); }} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Manifest New Tag
        </button>
      </div>

      {/* Logic Construction Chamber (Form) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{editing ? 'Update Metadata Marker' : 'Execute Tag Manifestation'}</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-8 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Label Designation *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. CRITICAL_INCIDENT" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Registry Category</label>
                  <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="e.g. SUPPORT / OPS" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Chromatic Signature</label>
                  <div className="flex flex-wrap gap-2 p-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-inner">
                     {COLORS.map(c => (
                        <button 
                           key={c} 
                           onClick={() => setForm({...form, color: c})} 
                           className={`w-6 h-6 rounded-full border-2 transition-all hover:scale-110 ${form.color === c ? 'border-indigo-500 scale-125 shadow-lg' : 'border-white dark:border-slate-900'}`} 
                           style={{backgroundColor: c}} 
                        />
                     ))}
                  </div>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Functional Description</label>
               <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Quantify the intent of this marker..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 italic" />
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
             <button onClick={save} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">
                {editing ? 'Recalibrate Tag' : 'Initialize Protocol'}
             </button>
          </div>
        </div>
      )}

      {/* Taxonomy Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        {['', ...categories].map(cat => {
          const catTags = tags.filter(t => cat === '' ? !t.category : t.category === cat);
          if (catTags.length === 0) return null;
          return (
            <div key={cat || '__uncategorized'} className="group bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl">
               <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                     <Layers className="w-5 h-5 text-indigo-500" />
                     <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{cat || 'UNCLASSIFIED_NODES'}</h3>
                  </div>
                  <span className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">{catTags.length} entities discovered</span>
               </div>

               <div className="flex flex-wrap gap-3">
                 {catTags.map(t => (
                   <div 
                     key={t.id} 
                     className="group/tag flex items-center gap-3 px-6 py-3 rounded-2xl border transition-all hover:scale-105 backdrop-blur-md shadow-sm" 
                     style={{ 
                        borderColor: `${t.color}30`, 
                        backgroundColor: `${t.color}08`,
                        color: t.color 
                     }}
                   >
                     <div className="w-2.5 h-2.5 rounded-full shadow-[0_0_10px_currentColor]" style={{ backgroundColor: t.color }} />
                     <span className="text-[11px] font-black uppercase tracking-widest">{t.name}</span>
                     <span className="text-[9px] font-black opacity-40 group-hover/tag:opacity-100 transition-opacity">({t.usageCount || 0})</span>
                     
                     <div className="flex gap-2 ml-2 opacity-0 group-hover/tag:opacity-100 transition-all scale-90 group-hover/tag:scale-100">
                        <button onClick={() => { setEditing(t); setForm({ name: t.name, color: t.color, description: t.description || '', category: t.category || '' }); setShowForm(true); }} className="p-1 hover:text-indigo-600 transition-colors"><Edit className="w-3 h-3" /></button>
                        <button onClick={() => remove(t.id)} className="p-1 hover:text-rose-600 transition-colors"><Trash2 className="w-3 h-3" /></button>
                     </div>
                   </div>
                 ))}
               </div>

               <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800/50 flex justify-between items-center opacity-0 group-hover:opacity-100 transition-opacity">
                  <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">
                     <ShieldCheck className="w-3 h-3" /> System Managed Protocols
                  </div>
                  <button onClick={() => { setForm({ name: '', color: '#6366f1', description: '', category: cat }); setShowForm(true); }} className="flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-all">
                     Inject Directive <ChevronRight className="w-3 h-3" />
                  </button>
               </div>
            </div>
          );
        })}
      </div>

      {tags.length === 0 && (
        <div className="py-24 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50 grayscale">
           <Tag className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
           <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Taxonomy Markers Indexed</p>
        </div>
      )}

      {/* Analytics Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
               <Activity className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Index Intelligence</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">High Tag Density Detected in Operational Logic</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Tags automatically propagate across all CRM & Ticket hubs.</span>
         </div>
      </div>
    </div>
  );
}
