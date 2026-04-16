import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  FileBarChart, 
  Plus, 
  Trash2, 
  X, 
  Settings, 
  Calendar, 
  Clock, 
  Mail, 
  Zap, 
  FileText, 
  ChevronRight,
  Monitor,
  Activity,
  Shield,
  Layers,
  ShieldCheck,
  Info,
  Loader2,
  PieChart,
  BarChart3,
  TrendingUp,
  Target,
  Orbit,
  Cpu,
  Fingerprint,
  LayoutGrid,
  MoreHorizontal,
  RefreshCw,
  Download,
  Share2
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'DAILY_SUMMARY', schedule: 'DAILY', format: 'PDF', recipients: '' });

  const load = async () => {
    setLoading(true);
    try { 
      const res = await api.getScheduledReports(); 
      setReports(res.data ?? []); 
    }
    catch (err) { 
       toast({ type: 'error', title: 'REPOSITORY_ACCESS_FAILURE', message: 'Failed to access analytical flow registry.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    try {
      await api.createScheduledReport({ 
        ...form, 
        recipients: form.recipients.split(',').map(r => r.trim()).filter(Boolean) 
      });
      setShowForm(false);
      setForm({ name: '', type: 'DAILY_SUMMARY', schedule: 'DAILY', format: 'PDF', recipients: '' });
      toast({ type: 'success', title: 'FLOW_INITIALIZED', message: `Autonomous reporting protocol established for ${form.name.toUpperCase()}.` });
      load();
    } catch (err) { 
      toast({ type: 'error', title: 'INITIALIZATION_ERROR', message: 'Failed to engage analytical relay flow.' });
    }
  };

  const remove = async (id: string) => {
    if (!confirm('Purge this report configuration from the registry?')) return;
    try { 
      await api.deleteScheduledReport(id); 
      toast({ type: 'success', title: 'REGISTRY_PURGED', message: 'The analytical flow has been decommissioned.' });
      load(); 
    } catch (err) { 
      toast({ type: 'error', title: 'PURGE_FAILURE', message: 'Failed to terminate high-velocity flow.' });
    }
  };

  if (loading && reports.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Assembling Analytical Structures...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Analytical Engineering Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Autonomous Reporting</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Scheduled data extraction, high-velocity performance summaries, and incident auditing flows.</p>
        </div>

        <div className="flex items-center gap-4">
           <button 
              onClick={() => setShowForm(true)} 
              className="px-8 py-5 rounded-[32px] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 flex items-center gap-3 transition-all hover:scale-[1.05] active:scale-95 shadow-2xl shadow-indigo-600/20 border-2 border-indigo-400/20"
           >
             <Plus className="w-4 h-4" /> Initialize New Flow
           </button>
           <button 
              onClick={load} 
              className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-600 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Deployment Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-950/40 border-2 border-dashed border-indigo-500/30 rounded-[48px] p-12 shadow-inner animate-in slide-in-from-top-4 duration-500 backdrop-blur-3xl">
          <div className="flex items-center justify-between mb-10">
            <div className="flex items-center gap-3">
               <Settings className="w-6 h-6 text-indigo-500" />
               <h3 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight underline decoration-indigo-500/30 decoration-2 underline-offset-8">Flow Configuration Matrix</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-4 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-500 rounded-3xl transition-all border border-slate-100 dark:border-slate-800 active:scale-90">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-8 space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block ml-4">Logical Flow Identifier</label>
                  <input 
                     value={form.name} 
                     onChange={e => setForm({ ...form, name: e.target.value })} 
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] px-10 py-6 text-lg font-black text-slate-900 dark:text-white italic outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all shadow-inner placeholder:text-slate-200" 
                     placeholder="e.g. CORE_SLA_WEEKLY_NODE" 
                  />
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block ml-4">Dispatch Cycle</label>
                     <select value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white focus:border-indigo-500 outline-none cursor-pointer appearance-none shadow-sm">
                        <option value="DAILY">DAILY_PULSE</option>
                        <option value="WEEKLY">WEEKLY_SYNC</option>
                        <option value="MONTHLY">MONTHLY_SWEEP</option>
                     </select>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block ml-4">Export Protocol</label>
                     <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-900 dark:text-white focus:border-indigo-500 outline-none cursor-pointer appearance-none shadow-sm">
                        <option value="PDF">ENCRYPTED_PDF</option>
                        <option value="EXCEL">XLSX_LEDGER</option>
                        <option value="CSV">RAW_DATA_STRING</option>
                        <option value="JSON">STRUCT_OBJECT</option>
                     </select>
                  </div>
                  <div className="space-y-3">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block ml-4">Archetype</label>
                     <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-900 dark:text-white focus:border-indigo-500 outline-none cursor-pointer appearance-none shadow-sm">
                        <option value="DAILY_SUMMARY">OPERATIONAL_SUMMARY</option>
                        <option value="WEEKLY_SUMMARY">PERFORMANCE_ANALYSIS</option>
                        <option value="MONTHLY_SUMMARY">TECHNICAL_AUDIT</option>
                        <option value="SLA_REPORT">COMPLIANCE_TELEMETRY</option>
                        <option value="INCIDENT_REPORT">CRITICALITY_MATRIX</option>
                        <option value="PERFORMANCE_REPORT">COMPUTE_METRICS</option>
                     </select>
                  </div>
               </div>
            </div>
            
            <div className="lg:col-span-4 space-y-8">
               <div className="space-y-3">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block ml-4">Recipient Nexus (Commas)</label>
                  <textarea 
                     value={form.recipients} 
                     onChange={e => setForm({ ...form, recipients: e.target.value })} 
                     className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] px-8 py-6 text-xs font-mono font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all shadow-inner h-[160px] resize-none" 
                     placeholder="noc-core@audirabot.com, tech-lead@audirabot.com" 
                  />
               </div>
            </div>
          </div>

          <div className="flex justify-end pt-10 border-t border-slate-100 dark:border-white/5 mt-10">
             <button 
                onClick={create} 
                className="px-16 py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-[11px] tracking-[0.2em] shadow-2xl shadow-indigo-600/40 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-4 border-2 border-indigo-400/20"
             >
                <Zap className="w-5 h-5" /> Execute & Authorize Flow
             </button>
          </div>
        </div>
      )}

      {/* Reports Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-10">
        {reports.map((r) => (
          <div key={r.id} className="relative group bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-10 rounded-[56px] hover:border-indigo-500/30 transition-all duration-700 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-2xl">
             <div className="absolute right-0 top-0 bottom-0 w-2 bg-gradient-to-b from-transparent via-indigo-600/40 opacity-0 group-hover:opacity-100 transition-opacity" />
             
             <div className="flex items-start justify-between mb-10">
                <div className="flex items-center gap-5">
                   <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-inner group-hover:bg-indigo-600 group-hover:text-white transition-all duration-500 flex items-center justify-center">
                      <Monitor className="w-8 h-8 text-indigo-500 group-hover:text-white" />
                   </div>
                   <div className="overflow-hidden">
                      <h3 className="text-2xl font-black text-slate-950 dark:text-white italic transition-colors uppercase tracking-tight leading-none group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate w-48">{r.name}</h3>
                      <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-2 italic truncate w-48">{r.type.replace('_', ' ')} ARCHETYPE</p>
                   </div>
                </div>
                <button 
                   onClick={() => remove(r.id)} 
                   className="p-5 text-slate-300 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/20 rounded-2xl active:scale-90 transition-all opacity-0 group-hover:opacity-100"
                >
                   <Trash2 className="w-6 h-6" />
                </button>
             </div>

             <div className="grid grid-cols-1 gap-4 mb-10">
                {[
                  { icon: Calendar, label: 'Dispatch Frequency', value: r.schedule, color: 'text-indigo-500' },
                  { icon: FileText, label: 'Egress Protocol', value: r.format, color: 'text-emerald-500' },
                  { icon: ShieldCheck, label: 'Flow Logic Status', value: r.enabled !== false ? 'OPERATIONAL' : 'DORMANT', color: r.enabled !== false ? 'text-emerald-500' : 'text-slate-400' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800/50 px-6 py-4 rounded-2xl group/val hover:border-indigo-500/20 transition-all shadow-inner">
                     <div className="flex items-center gap-3">
                        <item.icon className={`w-4 h-4 ${item.color} group-hover/val:scale-110 transition-transform`} />
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{item.label}</span>
                     </div>
                     <span className={`text-[11px] font-black italic tracking-widest ${item.color}`}>{item.value}</span>
                  </div>
                ))}
             </div>

             {r.recipients?.length > 0 && (
               <div className="mb-10 p-6 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] shadow-inner">
                  <div className="flex items-center gap-3 mb-6">
                     <Share2 className="w-4 h-4 text-indigo-500" />
                     <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">Nexus Transmission Grid</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {(r.recipients as string[]).map((rec, i) => (
                       <span key={i} className="px-3 py-1.5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-xl text-[9px] font-black text-slate-500 dark:text-slate-400 font-mono italic shadow-sm hover:text-indigo-500 transition-colors">{rec}</span>
                     ))}
                  </div>
               </div>
             )}

             <div className="flex items-center justify-between pt-8 border-t border-slate-100 dark:border-white/5">
                <div className="flex items-center gap-3">
                   <Clock className="w-5 h-5 text-slate-300 dark:text-slate-700" />
                   <div>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest leading-none">Last Temporal Fix</p>
                      <p className="text-[11px] font-black text-slate-900 dark:text-white italic mt-1 tracking-tighter">{r.lastRunAt ? new Date(r.lastRunAt).toLocaleDateString() : 'NO_SIGNAL'}</p>
                   </div>
                </div>
                <button className="flex items-center gap-2 text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest hover:translate-x-3 transition-all">
                   INTERROGATE <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="col-span-full py-48 text-center bg-white dark:bg-slate-950/20 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-20 grayscale shadow-inner">
             <FileBarChart className="w-24 h-24 text-slate-300 dark:text-slate-700 mx-auto mb-6" />
             <h3 className="text-2xl font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] italic leading-tight">Flow Repository Void</h3>
          </div>
        )}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Analytical Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">High-Velocity Report Relays Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Autonomous analytical engineering ensures 100% precision across all scheduled data extractions.</span>
         </div>
      </div>
    </div>
  );
}

