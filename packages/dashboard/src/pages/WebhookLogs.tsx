import { Fragment, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ScrollText, 
  RefreshCw, 
  Search, 
  CheckCircle, 
  XCircle, 
  Clock, 
  RotateCcw, 
  Filter, 
  ChevronDown, 
  Terminal, 
  Info, 
  Database,
  Activity,
  ShieldCheck,
  Zap,
  ChevronRight,
  Loader2,
  Globe,
  Monitor,
  Command,
  PlusCircle,
  Hash,
  Cpu,
  Layers,
  ArrowUpRight,
  Share2,
  Orbit,
  Fingerprint,
  Radio,
  Target
} from 'lucide-react';
import { toast } from '../components/Toast';

const STATUS_STYLE: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  SUCCESS: { icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
  FAILED: { icon: XCircle, color: 'text-rose-500', bg: 'bg-rose-50 dark:bg-rose-500/10', border: 'border-rose-100 dark:border-rose-500/20' },
  PENDING: { icon: Clock, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
  RETRYING: { icon: RotateCcw, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' },
};

export default function WebhookLogs() {
  const [logs, setLogs] = useState<Array<Record<string, any>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getWebhookLogs(undefined, filterStatus || undefined, page); 
      setLogs(r.data ?? []); 
      setTotal(r.total ?? 0); 
    } catch {
      toast({ type: 'error', title: 'RELAY_FETCH_FAILURE', message: 'Failed to access outbound signal archives.' });
    } finally { 
      setLoading(false); 
    } 
  };

  useEffect(() => { load(); }, [page, filterStatus]);

  const filtered = logs.filter(l => !search || l.url?.toLowerCase().includes(search.toLowerCase()));

  if (loading && logs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Synchronizing Event Archives...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Event Relay Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Webhook Transmission</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Trace outbound signal trajectories, monitor delivery success scalars, and interrogate protocol response payloads.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] min-w-[180px] backdrop-blur-3xl group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">RELAY_SIGNALS</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{total}</div>
           </div>
           <button 
              onClick={load} 
              className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Advanced Filter Cluster */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
           <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="Filter by Destination Endpoint or Payload ID..." 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white pl-16 pr-8 py-5 rounded-[32px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold text-sm tracking-tight shadow-sm"
           />
        </div>
        <div className="relative group">
           <select 
              value={filterStatus} 
              onChange={e => { setFilterStatus(e.target.value); setPage(1); }} 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[32px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all font-black text-[10px] uppercase tracking-widest appearance-none cursor-pointer shadow-sm"
           >
              <option value="">OMNI_STATUS_HUB</option>
              {['SUCCESS','FAILED','PENDING','RETRYING'].map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-700 pointer-events-none group-hover:text-indigo-500 transition-colors" />
        </div>
      </div>

      {/* Transmission Matrix */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[56px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.3em]">
              <tr>
                <th className="px-12 py-8">Signal</th>
                <th className="px-8 py-8">Destination Node</th>
                <th className="px-8 py-8 text-center">Protocol</th>
                <th className="px-8 py-8 text-center">HTTP Status</th>
                <th className="px-8 py-8">Latency</th>
                <th className="px-12 py-8 text-right">Temporal Fix</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-white/5">
              {filtered.map(l => {
                const S = STATUS_STYLE[l.status] || STATUS_STYLE.PENDING;
                const isSelected = expanded === l.id;
                return (
                  <Fragment key={String(l.id)}>
                    <tr 
                      className={`group hover:bg-slate-50 dark:hover:bg-indigo-500/5 cursor-pointer transition-all duration-700 ${isSelected ? 'bg-indigo-50 dark:bg-indigo-500/10' : ''}`} 
                      onClick={() => setExpanded(isSelected ? null : l.id)}
                    >
                      <td className="px-12 py-8">
                        <div className={`w-14 h-14 rounded-[24px] ${S.bg} ${S.color} border-2 ${S.border} flex items-center justify-center shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all`}>
                          <S.icon className="w-6 h-6" />
                        </div>
                      </td>
                      <td className="px-8 py-8">
                        <div className="flex flex-col">
                           <p className="font-mono text-[11px] text-slate-900 dark:text-slate-100 truncate max-w-[320px] font-black tracking-widest group-hover:text-indigo-600 transition-colors uppercase italic underline decoration-slate-200 dark:decoration-slate-800 underline-offset-4 decoration-1">{l.url}</p>
                           <p className={`text-[9px] font-black uppercase tracking-[0.2em] mt-3 flex items-center gap-2 ${S.color}`}>
                              <span className={`w-2 h-2 rounded-full ${S.color.replace('text', 'bg')} animate-pulse shadow-[0_0_10px_currentColor]`} />
                              {l.status}
                           </p>
                        </div>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <span className="px-5 py-2 rounded-xl bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 text-[9px] font-black border-2 border-slate-100 dark:border-slate-800 uppercase tracking-widest shadow-inner">{l.method}</span>
                      </td>
                      <td className="px-8 py-8 text-center">
                        <div className="flex flex-col items-center">
                           <span className={`text-2xl font-black italic tracking-tighter leading-none ${l.responseStatus >= 200 && l.responseStatus < 300 ? 'text-emerald-500' : 'text-rose-500 animate-pulse'}`}>
                             {l.responseStatus || '---'}
                           </span>
                           <span className="text-[8px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest mt-2 italic font-mono">SC_CODE</span>
                        </div>
                      </td>
                      <td className="px-8 py-8">
                         <div className="flex items-center gap-3">
                           <Activity className="w-5 h-5 text-slate-300 dark:text-slate-800" />
                           <span className="text-[11px] font-black text-slate-900 dark:text-white italic uppercase tracking-tighter">{l.duration ? `${l.duration}ms` : '0ms'}</span>
                         </div>
                      </td>
                      <td className="px-12 py-8 text-right">
                        <div className="flex flex-col items-end">
                           <span className="text-[11px] font-black text-slate-900 dark:text-white italic uppercase tracking-tight leading-none underline decoration-indigo-500/10 underline-offset-4">{new Date(l.createdAt).toLocaleDateString()}</span>
                           <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 mt-2 uppercase tracking-widest font-mono italic">{new Date(l.createdAt).toLocaleTimeString()}</span>
                        </div>
                      </td>
                    </tr>
                    {isSelected && (
                      <tr className="bg-slate-50/50 dark:bg-slate-950/80 animate-in slide-in-from-top-8 duration-700">
                        <td colSpan={6} className="p-16">
                          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                            <div className="space-y-6">
                               <div className="flex items-center gap-4 px-2">
                                  <Terminal className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] italic">Inbound Signal Payload</span>
                                     <span className="text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest font-mono">ENCODING: JSON_U8</span>
                                  </div>
                               </div>
                               <div className="relative group/payload">
                                  <div className="absolute right-0 top-0 p-8 opacity-10 group-hover/payload:opacity-30 transition-opacity">
                                     <Layers className="w-24 h-24 text-indigo-500" />
                                  </div>
                                  <pre className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800/80 text-slate-900 dark:text-indigo-400/80 p-12 rounded-[56px] text-xs overflow-auto max-h-[400px] shadow-inner font-mono leading-relaxed scrollbar-hide">
                                    {JSON.stringify(l.requestBody, null, 2) || '// EMPTY_SIGNAL_PAYLOAD'}
                                  </pre>
                                </div>
                            </div>
                            <div className="space-y-6">
                               <div className="flex items-center gap-4 px-2">
                                  <Cpu className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                                  <div className="flex flex-col">
                                     <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] italic">Protocol Sync Response</span>
                                     <span className="text-[8px] font-bold text-slate-300 dark:text-slate-700 uppercase tracking-widest font-mono">LATENCY_FIX: {l.duration}ms</span>
                                  </div>
                               </div>
                               <div className="relative group/response">
                                  <div className="absolute right-0 top-0 p-8 opacity-10 group-hover/response:opacity-30 transition-opacity">
                                     <Radio className="w-24 h-24 text-emerald-500" />
                                  </div>
                                  <pre className={`p-12 rounded-[56px] text-xs overflow-auto max-h-[400px] shadow-inner font-mono leading-relaxed border-2 ${
                                    l.responseStatus >= 400 ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-100 dark:border-rose-900/40 text-rose-900 dark:text-rose-400' : 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800/80 text-slate-900 dark:text-indigo-400/80'
                                  }`}>
                                    {l.responseBody || l.error || '// NO_RESPONSE_RECORDED_BY_SUPERVISOR'}
                                  </pre>
                               </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-10 py-56 text-center grayscale opacity-20">
                     <ScrollText className="w-32 h-32 text-slate-200 dark:text-slate-800 mx-auto mb-8 animate-pulse" />
                     <p className="text-[14px] font-black uppercase tracking-[0.8em] text-slate-400 dark:text-slate-600 leading-relaxed">Identity Void: Zero Transmission Records</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Global Batch Navigation Hub */}
        {total > 10 && (
          <div className="px-12 py-10 border-t border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between bg-slate-50/50 dark:bg-slate-950/40 gap-8 backdrop-blur-3xl">
            <div className="flex items-center gap-4">
               <Target className="w-5 h-5 text-indigo-500" />
               <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] italic font-mono">TRANS_LEDGER: {total} RELAY_SIGNALS_DETECTED</span>
            </div>
            <div className="flex items-center gap-4 overflow-x-auto scrollbar-hide py-2 px-4 bg-white dark:bg-slate-900 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-inner">
               {Array.from({length: Math.min(10, Math.ceil(total / 10))}, (_, i) => (
                 <button 
                    key={i} 
                    onClick={() => setPage(i+1)} 
                    className={`min-w-[56px] h-14 rounded-2xl font-black text-[11px] transition-all border-2 flex items-center justify-center shadow-xl active:scale-90 ${
                      page === i+1 
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-indigo-600/40 ring-8 ring-indigo-500/10' 
                        : 'bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-700 border-slate-100 dark:border-slate-800 hover:border-indigo-500/50 hover:text-indigo-600'
                    }`}
                 >
                   {i+1}
                 </button>
               ))}
               {Math.ceil(total / 10) > 10 && <span className="text-slate-300 mx-4 font-black">...</span>}
            </div>
          </div>
        )}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[48px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-8 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-500/10 rounded-3xl border-2 border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
               <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-2 italic">Signal Strategy Ledger</h4>
               <p className="text-base font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">Global Event Relay Subsystems Synchronized</p>
            </div>
         </div>
         <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[28px] flex items-center gap-4">
            <Info className="w-5 h-5 text-indigo-500" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic max-w-sm line-clamp-2">Webhook relay status is interrogated globally to ensure 99.9% event propagation success across all connected nodes.</span>
         </div>
      </div>
    </div>
  );
}
