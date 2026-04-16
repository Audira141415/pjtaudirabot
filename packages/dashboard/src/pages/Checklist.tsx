import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ClipboardCheck, 
  Plus, 
  Trash2, 
  X, 
  Square, 
  LayoutGrid, 
  ListChecks, 
  ChevronRight, 
  Tag, 
  Layers,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function ChecklistPage() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'templates' | 'items'>('templates');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', items: '' });

  const load = async () => {
    try {
      const [t, i] = await Promise.all([api.getChecklistTemplates(), api.getChecklistItems()]);
      setTemplates((t.data as any) ?? []);
      setItems((i.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    try {
      await api.createChecklistTemplate({
        name: form.name,
        description: form.description,
        category: form.category,
        items: form.items.split('\n').filter(Boolean).map((text, i) => ({ text: text.trim(), order: i })),
      });
      setShowForm(false);
      setForm({ name: '', description: '', category: '', items: '' });
      toast({ type: 'success', title: 'TEMPLATE_MANIFESTED', message: 'New procedural checklist established.' });
      load();
    } catch (err) { toast({ type: 'error', title: 'INIT_FAILURE', message: 'Failed to create template.' }); }
  };

  const remove = async (id: string) => {
    if (!confirm('Purge this operational template?')) return;
    try { 
      await api.deleteChecklistTemplate(id); 
      toast({ type: 'info', title: 'TEMPLATE_PURGED', message: 'The protocol has been removed.' });
      load(); 
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Loading Operational Procedures...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ClipboardCheck className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Procedural Compliance</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Checklist Matrices</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Standardized operational protocols, audit sequences, and task verification paths.</p>
        </div>

        <div className="flex gap-2 bg-white dark:bg-slate-950/50 p-2 rounded-[24px] border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm dark:shadow-none">
          <button 
             onClick={() => setTab('templates')} 
             className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'templates' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-white'}`}
          >
             <LayoutGrid className="w-3.5 h-3.5" />
             Templates
          </button>
          <button 
             onClick={() => setTab('items')} 
             className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'items' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-white'}`}
          >
             <ListChecks className="w-3.5 h-3.5" />
             Active Sync
          </button>
          {tab === 'templates' && (
            <button 
               onClick={() => setShowForm(true)} 
               className="ml-2 p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-400 rounded-2xl hover:text-indigo-600 dark:hover:text-indigo-400 hover:border-indigo-500/40 transition-all active:scale-90 shadow-sm"
            >
               <Plus className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Engineer Protocol Matrix</h3>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Sequence Name *</label>
                   <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:border-indigo-500 font-bold shadow-inner" placeholder="e.g. NOC_MORNING_SWEEP" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Protocol Category</label>
                   <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:border-indigo-500 font-bold shadow-inner" placeholder="MAINTENANCE / AUDIT" />
                </div>
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Summary Qualifier</label>
                <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:border-indigo-500 font-bold shadow-inner" placeholder="High-level mission objective..." />
             </div>
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Step Declarations (One per line)</label>
                <textarea value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold min-h-[160px] outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-inner" placeholder="Verify Logic Engine&#10;Ingest Telemetry Logs&#10;Clear Buffer Cache..." />
             </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={create} className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                Manifest Protocol
             </button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {templates.map((t) => (
            <div key={t.id} className="relative group bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-2xl shadow-sm dark:shadow-none hover:shadow-xl dark:hover:shadow-indigo-500/5">
               <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-indigo-600 hidden group-hover:block transition-all" />
               
               <div className="flex items-start justify-between mb-6">
                  <div className="space-y-1">
                     <h3 className="text-xl font-black text-slate-900 dark:text-white italic leading-tight uppercase tracking-tight">{t.name}</h3>
                     <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{t.description || 'No description established'}</p>
                  </div>
                  <button onClick={() => remove(t.id)} className="p-3 text-slate-200 dark:text-slate-800 hover:text-rose-600 dark:hover:text-rose-500 transition-all active:scale-90 opacity-0 group-hover:opacity-100">
                     <Trash2 className="w-5 h-5" />
                  </button>
               </div>

               {t.category && (
                  <div className="flex items-center gap-2 mb-6">
                     <Tag className="w-3 h-3 text-indigo-500" />
                     <span className="text-[9px] font-black text-indigo-600 dark:text-indigo-400/80 uppercase tracking-widest italic">{t.category}</span>
                  </div>
               )}

               {t.items?.length > 0 && (
                  <div className="space-y-3 pt-6 border-t border-slate-50 dark:border-slate-800/50">
                     <p className="text-[9px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mb-4">Sequence Steps ({t.items.length})</p>
                     {(t.items as any[]).slice(0, 4).map((item, i) => (
                        <div key={i} className="flex items-center gap-3 group/step">
                           <Square className="w-3 h-3 text-slate-200 dark:text-slate-800 group-hover/step:text-indigo-500 transition-colors" />
                           <span className="text-[11px] font-bold text-slate-500 dark:text-slate-500 group-hover/step:text-slate-900 dark:group-hover/step:text-slate-300 transition-colors truncate">{item.text ?? item.title}</span>
                        </div>
                     ))}
                     {t.items.length > 4 && (
                        <div className="flex items-center gap-1 text-[9px] font-black text-indigo-600/50 uppercase italic pt-2">
                           <Layers className="w-3 h-3" />
                           +{t.items.length - 4} more operational points
                        </div>
                     )}
                  </div>
               )}

               <div className="mt-8 flex justify-end">
                  <button className="flex items-center gap-1 text-[9px] font-black text-slate-300 dark:text-slate-700 hover:text-indigo-600 dark:hover:text-white uppercase tracking-widest transition-all">
                     Inspect Grid <ChevronRight className="w-3 h-3" />
                  </button>
               </div>
            </div>
          ))}
          {templates.length === 0 && (
             <div className="col-span-full py-24 text-center grayscale opacity-20">
                <ClipboardCheck className="w-16 h-16 mx-auto mb-4 text-slate-300 dark:text-slate-700" />
                <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600">Protocol Repository Empty</p>
             </div>
          )}
        </div>
      )}

      {tab === 'items' && (
        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-[48px] overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-2xl animate-in slide-in-from-right-8 duration-500">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Compliance</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Operational Task</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Origin Template</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Assigned Entity</th>
                <th className="px-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Temporal Bound</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/30">
              {items.map((item) => (
                <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors">
                  <td className="px-10 py-6">
                    {item.completed ? (
                       <div className="p-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-600 dark:text-emerald-500 shadow-sm">
                          <CheckCircle2 className="w-5 h-5 shadow-[0_0_10px_rgba(16,185,129,0.3)]" />
                       </div>
                    ) : (
                       <div className="p-2 bg-slate-50 dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-300 dark:text-slate-700 group-hover:border-indigo-500/30 transition-all shadow-sm">
                          <Square className="w-5 h-5" />
                       </div>
                    )}
                  </td>
                  <td className="px-8 py-6">
                     <span className={`text-sm font-black italic tracking-tight ${item.completed ? 'text-slate-300 dark:text-slate-500 line-through' : 'text-slate-900 dark:text-white'}`}>{item.text ?? item.title}</span>
                  </td>
                  <td className="px-8 py-6 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-widest">{item.template?.name ?? 'MANUAL_INJECT'}</td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase italic">{item.assignee?.name ?? 'UNASSIGNED'}</span>
                     </div>
                  </td>
                  <td className="px-10 py-6 text-right font-mono text-[10px] text-slate-400 dark:text-slate-500">
                     {item.dueDate ? new Date(item.dueDate).toLocaleDateString() : 'NO_BOUND'}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                   <td colSpan={5} className="py-24 text-center grayscale opacity-20 font-black uppercase text-[10px] tracking-[0.5em] text-slate-300 dark:text-slate-700">No Data Synced</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
