import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  BookOpen, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  Tag, 
  Layers, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Loader2,
  FileText,
  Clock,
  BrainCircuit,
  Globe
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ title: '', content: '', topic: '', tags: '' });

  const load = async () => {
    try {
      const filters: Record<string, string> = {};
      if (search) filters.search = search;
      if (topic) filters.topic = topic;
      const res = await api.getKnowledge(1, Object.keys(filters).length ? filters : undefined);
      const data = (res.data as any) ?? [];
      setEntries(data);
      const allTopics = [...new Set(data.map((e: any) => e.topic).filter(Boolean))] as string[];
      setTopics(allTopics);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, topic]);

  const create = async () => {
    if (!form.title || !form.content) return;
    try {
      await api.createKnowledge({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
      setShowForm(false);
      setForm({ title: '', content: '', topic: '', tags: '' });
      toast({ type: 'success', title: 'INTELLIGENCE_INGESTED', message: 'Knowledge node established.' });
      load();
    } catch (err) { 
       toast({ type: 'error', title: 'INGEST_FAILURE', message: 'Failed to establish neural node.' });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Purge this intelligence node?')) return;
    try { 
      await api.deleteKnowledge(id); 
      toast({ type: 'info', title: 'NODE_PURGED', message: 'Knowledge removed from repository.' });
      load(); 
    } catch (err) { console.error(err); }
  };

  if (loading && entries.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Collective Intelligence...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BrainCircuit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Neural Knowledge Repository</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Knowledge Base</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Manage collective intelligence, procedural matrices, and automated response benchmarks.</p>
        </div>

        <button 
           onClick={() => setShowForm(true)} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Manifest Intelligence Entry
        </button>
      </div>

      {/* Logic Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Intelligence Nodes', value: entries.length, icon: FileText, color: 'text-slate-400' },
           { label: 'Active Topics', value: topics.length, icon: Layers, color: 'text-sky-500' },
           { label: 'Referential Hits', value: entries.reduce((acc, e) => acc + (e.referenceCount || 0), 0), icon: Activity, color: 'text-emerald-500' },
         ].map((card, i) => (
           <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all" />
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <card.icon className="w-3.5 h-3.5" /> {card.label}
              </p>
              <p className={`text-4xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
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
              placeholder="SEARCH_INTELLIGENCE_CORES..." 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] pl-14 pr-8 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm dark:shadow-none"
           />
        </div>
        <div className="relative group">
           <select 
              value={topic} 
              onChange={e => setTopic(e.target.value)} 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer shadow-sm dark:shadow-none"
           >
              <option value="">Omni-Topic Hub</option>
              {topics.map(t => <option key={t} value={t}>{t}</option>)}
           </select>
           <Tag className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Manifestation Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Intelligence Ingestion</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Node Title *</label>
                <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" placeholder="e.g. MAINTENANCE_PROTOCOL_ALPHA" />
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Topic Hub</label>
                   <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" placeholder="e.g. OPERATIONS" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Metadata Tags (Comma-Separated)</label>
                   <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all font-mono" placeholder="tag1, tag2, tag3" />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Intelligence Core Content *</label>
                <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 leading-relaxed min-h-[160px]" placeholder="Quantify intelligence payload..." />
             </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
             <button onClick={create} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">Manifest Intelligence</button>
          </div>
        </div>
      )}

      {/* Intelligence Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {entries.map((e) => (
          <div key={e.id} className="group relative bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl cursor-pointer" onClick={() => setDetail(e)}>
            <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-indigo-600 hidden group-hover:block" />
            
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <h3 className="text-xl font-black text-slate-900 dark:text-white italic leading-tight uppercase tracking-tight group-hover:text-indigo-600 transition-colors line-clamp-2">{e.title}</h3>
                <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }} className="text-slate-300 dark:text-slate-700 hover:text-rose-500 transition-colors ml-4"><Trash2 className="w-4 h-4" /></button>
              </div>

              <div className="bg-slate-50/50 dark:bg-slate-900/40 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-950/50 transition-all min-h-[100px]">
                 <p className="text-xs font-bold text-slate-500 dark:text-slate-500 leading-relaxed line-clamp-4 italic">"{e.content}"</p>
              </div>

              <div className="flex flex-wrap gap-2">
                {e.topic && <span className="px-3 py-1 rounded-lg text-[8px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest shadow-sm">{e.topic}</span>}
                {(e.tags as string[] | undefined)?.slice(0, 3).map((tag: string, i: number) => (
                  <span key={i} className="px-3 py-1 rounded-lg text-[8px] font-black bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800 uppercase tracking-widest shadow-sm italic">{tag}</span>
                ))}
              </div>
              
              <div className="pt-4 border-t border-slate-50 dark:border-slate-800/50 flex items-center justify-between">
                 <div className="flex items-center gap-1 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                    <Activity className="w-3 h-3" /> Hits: {e.referenceCount || 0}
                 </div>
                 <button className="flex items-center gap-1 text-[9px] font-black text-indigo-500 hover:text-indigo-600 uppercase tracking-widest transition-all">
                    View Matrix <ChevronRight className="w-3 h-3" />
                 </button>
              </div>
            </div>
          </div>
        ))}
        {entries.length === 0 && (
          <div className="col-span-full py-24 text-center grayscale opacity-20">
             <BookOpen className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
             <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Intelligence Cores Indexed</p>
          </div>
        )}
      </div>

      {/* Intelligence Expansion Overlays */}
      {detail && (
        <div className="fixed inset-0 bg-slate-900/60 dark:bg-black/80 flex items-center justify-center z-[9999] p-4 backdrop-blur-md animate-in fade-in duration-300" onClick={() => setDetail(null)}>
          <div className="bg-white dark:bg-slate-900 rounded-[48px] border border-slate-200 dark:border-slate-800/50 max-w-2xl w-full max-h-[85vh] overflow-hidden shadow-2xl relative" onClick={e => e.stopPropagation()}>
            <div className="absolute top-0 right-0 p-8 z-10">
               <button onClick={() => setDetail(null)} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-all shadow-xl"><X className="w-6 h-6" /></button>
            </div>

            <div className="p-10 md:p-14 overflow-auto max-h-[85vh] space-y-8">
               <div>
                  <div className="flex items-center gap-2 mb-4">
                     <FileText className="w-5 h-5 text-indigo-500" />
                     <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Intelligence Core :: {detail.topic || 'UNCLASSIFIED'}</span>
                  </div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic">{detail.title}</h2>
               </div>

               <div className="flex flex-wrap gap-2">
                 {detail.topic && <span className="px-4 py-2 rounded-xl text-[10px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest flex items-center gap-2"><Tag className="w-3.5 h-3.5" />{detail.topic}</span>}
                 {(detail.tags as string[] | undefined)?.map((t: string, i: number) => (
                   <span key={i} className="px-4 py-2 rounded-xl text-[10px] font-black bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800 uppercase tracking-widest italic shadow-sm">{t}</span>
                 ))}
               </div>

               <div className="bg-slate-50 dark:bg-slate-950/50 p-10 rounded-[40px] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                  <p className="text-slate-600 dark:text-slate-300 font-bold text-sm leading-relaxed whitespace-pre-wrap italic">
                    "{detail.content}"
                  </p>
               </div>

               <div className="flex flex-wrap items-center justify-between gap-6 pt-4 border-t border-slate-100 dark:border-slate-800/50">
                  <div className="flex items-center gap-6">
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                        <Clock className="w-4 h-4" /> Manifested: {new Date(detail.createdAt).toLocaleDateString()}
                     </div>
                     <div className="flex items-center gap-2 text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                        <Activity className="w-4 h-4" /> Referential Index: {detail.referenceCount ?? 0} hits
                     </div>
                  </div>
                  <div className="flex items-center gap-2 px-6 py-2 bg-emerald-500/10 rounded-xl border border-emerald-500/20 text-emerald-500">
                     <ShieldCheck className="w-4 h-4" />
                     <span className="text-[9px] font-black uppercase tracking-widest">Neural Sync OK</span>
                  </div>
               </div>
            </div>
          </div>
        </div>
      )}

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <BrainCircuit className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Neural Repository</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Collective Intelligence Subsystems Balanced</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Globe className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Knowledge cores propagate across all automated response hubs.</span>
         </div>
      </div>
    </div>
  );
}
