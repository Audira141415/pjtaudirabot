import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Kanban, 
  Plus, 
  Trash2, 
  X, 
  ArrowRight, 
  Activity, 
  Target, 
  TrendingUp, 
  Coins, 
  UserCircle, 
  Clock, 
  BarChart3, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Loader2,
  DollarSign,
  Zap
} from 'lucide-react';
import { toast } from '../components/Toast';

const STAGES = ['LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'];
const STAGE_COLOR: Record<string, string> = { 
  LEAD: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700', 
  QUALIFIED: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20', 
  PROPOSAL: 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20', 
  NEGOTIATION: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-500/20', 
  WON: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20', 
  LOST: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' 
};

export default function CRMPipeline() {
  const [deals, setDeals] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', contactName: '', value: 0, currency: 'IDR', stage: 'LEAD', probability: 10, notes: '' });

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getDeals(); 
      setDeals(r.data ?? []); 
    } catch {} 
    finally { setLoading(false); } 
  };

  useEffect(() => { load(); }, []);

  const save = async () => { 
    if (!form.title) return; 
    try {
      await api.createDeal(form); 
      setShowForm(false); 
      setForm({ title: '', contactName: '', value: 0, currency: 'IDR', stage: 'LEAD', probability: 10, notes: '' }); 
      toast({ type: 'success', title: 'DEAL_MANIFESTED', message: 'Corporate opportunity synced to pipeline.' });
      load(); 
    } catch {
       toast({ type: 'error', title: 'SYNC_FAILURE', message: 'Failed to establish deal node.' });
    }
  };

  const moveStage = async (id: string, stage: string) => { 
    try {
      await api.updateDeal(id, { stage }); 
      toast({ type: 'info', title: 'STAGE_TRANSITION', message: `Deal recalibrated to ${stage}.` });
      load(); 
    } catch {}
  };

  const remove = async (id: string) => { 
    if (!confirm('Purge this corporate deal blueprint?')) return;
    try {
      await api.deleteDeal(id); 
      toast({ type: 'info', title: 'DEAL_PURGED', message: 'Asset removed from pipeline.' });
      load(); 
    } catch {}
  };

  const fmtMoney = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading && deals.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Fiscal Pipeline...</span>
    </div>
  );

  const totalValue = deals.filter(d => d.stage !== 'LOST').reduce((s, d) => s + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.stage === 'WON').reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Target className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Fiscal Opportunity Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">CRM Pipeline</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Monitor revenue trajectories, manage deal stages, and optimize corporate conversion cycles.</p>
        </div>

        <button 
           onClick={() => setShowForm(true)} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Manifest New Deal
        </button>
      </div>

      {/* Logic Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Pipeline Velocity', value: fmtMoney(totalValue), icon: TrendingUp, color: 'text-slate-400' },
           { label: 'Realized Revenue', value: fmtMoney(wonValue), icon: Coins, color: 'text-emerald-500' },
           { label: 'Active Opportunities', value: deals.length, icon: Activity, color: 'text-sky-500' },
         ].map((card, i) => (
           <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all" />
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <card.icon className="w-3.5 h-3.5" /> {card.label}
              </p>
              <p className={`text-3xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
           </div>
         ))}
      </div>

      {/* Manifestation Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Deal Manifestation Matrix</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Opportunity Title *</label>
                   <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="e.g. Q4_ENTERPRISE_CONTRACT" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Contact Entity Name</label>
                   <input value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="Corporate Node Name..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" />
                </div>
             </div>

             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Fiscal Value (Nominal)</label>
                   <div className="relative">
                      <DollarSign className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                      <input type="number" value={form.value} onChange={e => setForm({...form, value: parseInt(e.target.value) || 0})} placeholder="Value..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl pl-14 pr-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                   </div>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Probability Factor (%)</label>
                   <input type="number" value={form.probability} onChange={e => setForm({...form, probability: parseInt(e.target.value) || 0})} placeholder="e.g. 75" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Strategic Notes</label>
                <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Quantify the deal logic..." rows={3} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 leading-relaxed" />
             </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
             <button onClick={save} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">Manifest Opportunity</button>
          </div>
        </div>
      )}

      {/* Kanban Pipeline Hub */}
      <div className="flex gap-8 overflow-x-auto pb-8 snap-x snap-mandatory scrollbar-hide">
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const stageVal = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
          return (
            <div key={stage} className="min-w-[340px] flex-1 snap-start animate-in slide-in-from-right-8 duration-500">
               <div className="bg-white/50 dark:bg-slate-950/20 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/40 mb-6 backdrop-blur-xl">
                  <div className="flex items-center justify-between">
                    <span className={`px-4 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border shadow-sm ${STAGE_COLOR[stage]}`}>{stage}</span>
                    <div className="flex items-center gap-2">
                       <BarChart3 className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{stageDeals.length} assets</span>
                    </div>
                  </div>
                  <p className="mt-4 text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">{fmtMoney(stageVal)}</p>
               </div>

               <div className="space-y-4">
                {stageDeals.map(d => (
                  <div key={d.id} className="group bg-white dark:bg-slate-900/60 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[32px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 shadow-sm dark:shadow-none hover:shadow-xl relative overflow-hidden">
                    <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500 opacity-0 group-hover:opacity-100 transition-all" />
                    
                    <div className="flex justify-between items-start mb-4">
                      <div>
                         <h4 className="font-black text-slate-900 dark:text-white italic text-sm uppercase tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors">{d.title}</h4>
                         {d.contactName && (
                            <div className="flex items-center gap-2 mt-1">
                               <UserCircle className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                               <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">{d.contactName}</span>
                            </div>
                         )}
                      </div>
                      <button onClick={() => remove(d.id)} className="p-2 text-slate-200 dark:text-slate-800 hover:text-rose-500 transition-all opacity-0 group-hover:opacity-100"><Trash2 className="w-3.5 h-3.5" /></button>
                    </div>
                    
                    <div className="flex items-center justify-between mb-4 pt-4 border-t border-slate-50 dark:border-slate-800/30">
                      <span className="text-sm font-black text-indigo-600 dark:text-indigo-400 italic">{fmtMoney(d.value || 0)}</span>
                      <div className="flex items-center gap-2">
                         <div className="w-12 h-1 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                            <div className="h-full bg-indigo-500" style={{ width: `${d.probability}%` }} />
                         </div>
                         <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{d.probability}%</span>
                      </div>
                    </div>

                    {stage !== 'WON' && stage !== 'LOST' && (
                      <div className="flex gap-2">
                        {STAGES.filter(s => s !== stage && s !== 'LOST').slice(0, 3).map(s => (
                          <button 
                             key={s} 
                             onClick={() => moveStage(d.id, s)} 
                             className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-700 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-800 hover:border-indigo-500/30 transition-all flex items-center justify-center gap-1"
                          >
                             <ArrowRight className="w-2.5 h-2.5" /> {s.slice(0, 4)}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
                {stageDeals.length === 0 && (
                  <div className="py-12 text-center grayscale opacity-10 border border-dashed border-slate-200 dark:border-slate-800 rounded-[32px]">
                     <Kanban className="w-8 h-8 mx-auto mb-2" />
                     <p className="text-[8px] font-black uppercase tracking-widest">Zone Empty</p>
                  </div>
                )}
               </div>
            </div>
          );
        })}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fiscal Integrity</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Corporate Deal Pipeline Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Pipeline values are automatically recalculated across all fiscal periods.</span>
         </div>
      </div>
    </div>
  );
}
