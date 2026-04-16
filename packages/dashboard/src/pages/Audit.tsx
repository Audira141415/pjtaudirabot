import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ScrollText, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Info, 
  ChevronRight as ChevronRightIcon,
  Loader2,
  Clock,
  Terminal,
  Fingerprint,
  Globe,
  Monitor,
  Command,
  PlusCircle,
  RefreshCw,
  Trash2,
  LogIn,
  Eye,
  ShieldX,
  Radio,
  Workflow,
  Target,
  BarChart3,
  SearchIcon,
  Layers,
  Database
} from 'lucide-react';
import { toast } from '../components/Toast';

interface AuditLog {
  id: string;
  action: string;
  entity: string;
  entityId: string | null;
  details: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
  user?: { name: string; platform: string };
}

export default function AuditPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  useEffect(() => {
    setLoading(true);
    api.getAuditLogs(page)
      .then((res) => {
        setLogs(res.data as unknown as AuditLog[]);
        setTotal(res.pagination?.total ?? 0);
      })
      .catch(() => {
         toast({ type: 'error', title: 'TRACE_READ_FAILURE', message: 'Unable to access the global integrity ledger.' });
      })
      .finally(() => setLoading(false));
  }, [page, search]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const actionColors: Record<string, string> = {
    CREATE: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]',
    UPDATE: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-[inset_0_0_15px_rgba(14,165,233,0.05)]',
    DELETE: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[inset_0_0_15px_rgba(225,29,72,0.05)]',
    LOGIN: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20 shadow-[inset_0_0_15px_rgba(79,70,229,0.05)]',
    COMMAND: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.05)]',
  };

  const getActionIcon = (action: string) => {
    const a = action.toUpperCase();
    if (a.includes('CREATE')) return PlusCircle;
    if (a.includes('UPDATE')) return RefreshCw;
    if (a.includes('DELETE')) return Trash2;
    if (a.includes('LOGIN')) return LogIn;
    if (a.includes('COMMAND')) return Command;
    return Activity;
  };

  const getColor = (action: string) => {
    const key = Object.keys(actionColors).find((k) => action.toUpperCase().includes(k));
    return key ? actionColors[key] : 'bg-slate-500/10 text-slate-500 dark:text-slate-600 border-slate-500/20';
  };

  if (loading && logs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="w-14 h-14 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.5em] animate-pulse italic font-mono">Scanning Global Compliance Ledger...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-12">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Fingerprint className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] font-mono italic">Nodal Integrity Management Subsystem</span>
          </div>
          <h1 className="text-6xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[16px] decoration-8">Audit Ledger</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-base mt-6 max-w-2xl leading-relaxed">Trace administrative trajectories, interrogate nodal state changes, and maintain global infrastructural transparency matrices across all authenticated sessions.</p>
        </div>

        <div className="relative group/search min-w-[360px]">
           <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
           <input 
              type="text"
              value={search} 
              onChange={e => { setSearch(e.target.value); setPage(1); }} 
              placeholder="SEARCH_INTEGRITY_INDEX..." 
              className="w-full bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 rounded-[36px] pl-20 pr-10 py-6 text-base font-black text-slate-950 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-12 focus:ring-indigo-500/5 transition-all shadow-sm backdrop-blur-3xl uppercase tracking-tight placeholder:italic"
           />
        </div>
      </div>

      {/* Audit Matrix Command Terminal */}
      <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl group/audit-table relative">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-indigo-600/[0.03] to-transparent pointer-events-none group-hover/audit-table:from-indigo-600/[0.05] transition-all" />
        
        <div className="px-14 py-12 border-b-2 border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-10 bg-slate-50/50 dark:bg-slate-900/40 relative z-10">
           <div className="flex items-center gap-6">
              <div className="p-4 bg-indigo-600 text-white rounded-[20px] shadow-xl shadow-indigo-600/30 group-hover/audit-table:rotate-6 transition-transform">
                 <ScrollText className="w-8 h-8" />
              </div>
              <div>
                 <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter leading-none mb-2 underline decoration-indigo-600/20 decoration-8 underline-offset-[16px]">Traceability Matrix</h3>
                 <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mt-3 italic font-mono">GLOBAL_COMPLIANCE_RECORD_STREAM</p>
              </div>
           </div>
           <div className="px-10 py-3 bg-white dark:bg-slate-950 rounded-[24px] text-[11px] font-black text-slate-950 dark:text-white uppercase tracking-[0.4em] italic border-2 border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-4">
              <Workflow className="w-5 h-5 text-indigo-500 animate-spin-slow" />
              {total} ENTRIES_DETECTED
           </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-500 dark:text-slate-700 uppercase tracking-[0.4em] font-mono italic">
                <th className="px-14 py-10">Temporal_Fix</th>
                <th className="px-10 py-10">Tactical_Action</th>
                <th className="px-10 py-10">Entity_Target</th>
                <th className="px-10 py-10">Authorized_Pilot</th>
                <th className="px-10 py-10">State_Matrix</th>
                <th className="px-14 py-10 text-right">Source_Node</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 dark:divide-white/5 font-bold">
              {logs.length === 0 ? (
                <tr>
                   <td colSpan={6} className="px-10 py-48 text-center grayscale opacity-10">
                      <div className="w-24 h-24 mx-auto mb-10 border-4 border-dashed border-slate-300 dark:border-slate-800 rounded-[40px] flex items-center justify-center animate-pulse">
                         <ScrollText className="w-12 h-12 text-slate-300" />
                      </div>
                      <p className="text-[16px] font-black uppercase tracking-[1em] text-slate-400 italic">No_Compliance_Records_Located</p>
                   </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const Icon = getActionIcon(log.action);
                  return (
                    <tr key={log.id} className="group hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-all duration-500 border-b border-slate-100 dark:border-white/5">
                      <td className="px-14 py-10">
                         <div className="flex flex-col gap-2 group-hover:translate-x-2 transition-transform">
                            <span className="text-base font-black text-slate-950 dark:text-white italic uppercase tracking-tighter leading-none group-hover:text-indigo-600 transition-colors uppercase">{new Date(log.createdAt).toLocaleDateString()}</span>
                            <div className="flex items-center gap-3">
                               <Clock className="w-3.5 h-3.5 text-indigo-500" />
                               <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] font-mono italic">{new Date(log.createdAt).toLocaleTimeString([], { hour12: false })}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-10">
                         <div className="flex items-center gap-5">
                            <div className={`p-4 rounded-[20px] border-2 shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all ${getColor(log.action)}`}>
                               <Icon className="w-5 h-5" />
                            </div>
                            <span className={`px-6 py-2 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border-2 shadow-inner inline-flex items-center gap-3 w-fit transition-all ${getColor(log.action)}`}>
                              {log.action.replace('_', ' ')}
                            </span>
                         </div>
                      </td>
                      <td className="px-10 py-10">
                        <div className="flex flex-col gap-2">
                           <code className="text-[13px] font-black text-slate-950 dark:text-indigo-400 italic uppercase tracking-tight leading-none">"{log.entity}"</code>
                           {log.entityId && (
                             <div className="flex items-center gap-2 px-3 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl w-fit shadow-inner">
                                <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
                                <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.4em] font-mono italic">0x{log.entityId.slice(0, 12).toUpperCase()}</span>
                             </div>
                           )}
                        </div>
                      </td>
                      <td className="px-10 py-10">
                         <div className="flex items-center gap-4 group-hover:translate-x-2 transition-transform">
                            <div className={`p-3 rounded-2xl bg-slate-100 dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 shadow-inner ${log.user ? 'text-indigo-500' : 'text-slate-400 opacity-30 animate-pulse'}`}>
                               <Terminal className="w-6 h-6" />
                            </div>
                            <div className="flex flex-col">
                               <span className={`text-[12px] font-black uppercase italic tracking-tighter leading-none mb-1.5 ${log.user ? 'text-slate-950 dark:text-white' : 'text-slate-400 dark:text-slate-700'}`}>
                                  {log.user ? log.user.name.toUpperCase() : 'KERNEL_CORE_X1'}
                               </span>
                               <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] font-mono italic">{log.user ? log.user.platform.toUpperCase() : 'INTERNAL_TRIGGER'}</span>
                            </div>
                         </div>
                      </td>
                      <td className="px-10 py-10 max-w-[280px]">
                        <div className="bg-slate-50 dark:bg-slate-950/80 p-5 rounded-[28px] border-2 border-slate-100 dark:border-slate-800/80 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-900 transition-all relative overflow-hidden group/details">
                           <p className="text-[10px] font-mono text-slate-400 dark:text-slate-600 truncate italic uppercase tracking-tighter relative z-10 leading-relaxed group-hover/details:line-clamp-none group-hover/details:whitespace-normal">
                             {log.details ? JSON.stringify(log.details) : 'NULL_STATE_VECTOR'}
                           </p>
                           <div className="absolute right-0 top-0 p-4 opacity-[0.05] group-hover/details:opacity-20 transition-opacity">
                              <Eye className="w-6 h-6 text-indigo-500" />
                           </div>
                        </div>
                      </td>
                      <td className="px-14 py-10 text-right">
                         <div className="flex flex-col items-end gap-2 group-hover:translate-x-[-8px] transition-transform">
                            <div className="flex items-center gap-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-xl shadow-inner">
                               <Globe className="w-4 h-4 text-sky-500" />
                               <span className="font-mono text-[10px] text-slate-950 dark:text-slate-400 uppercase tracking-[0.3em] font-black">{log.ipAddress ?? 'INTERNAL_NODE_0'}</span>
                            </div>
                            <span className="text-[9px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-widest italic font-mono">EGRESS_CHANNEL_v4</span>
                         </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Global Pagination Infrastructure Hub */}
        {total > limit && (
          <div className="px-14 py-10 border-t-2 border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-10 bg-slate-50/50 dark:bg-slate-900/60 relative z-30">
            <div className="flex items-center gap-5">
               <div className="p-3 bg-white dark:bg-black rounded-xl border-2 border-slate-100 dark:border-white/5 shadow-inner">
                  <Activity className="w-6 h-6 text-indigo-500" />
               </div>
               <span className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] font-mono italic underline decoration-indigo-500/20 underline-offset-8 decoration-2">{total} OPERATIONAL_INTEGRITY_INDEX_RECORDS</span>
            </div>
            <div className="flex items-center gap-6 bg-white dark:bg-slate-950 p-3 rounded-[32px] border-2 border-slate-100 dark:border-slate-800 shadow-2xl">
              <button 
                 onClick={() => setPage(Math.max(1, page - 1))} 
                 disabled={page <= 1} 
                 className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:text-indigo-600 hover:border-indigo-500/30 disabled:opacity-20 transition-all shadow-inner active:scale-90 group/prev"
              >
                <ChevronLeft className="w-7 h-7 group-hover/prev:translate-x-[-2px] transition-transform" />
              </button>
              <div className="px-10 py-3 bg-indigo-600 text-white rounded-[20px] border-2 border-indigo-400/20 shadow-2xl shadow-indigo-600/30 ring-8 ring-indigo-500/10">
                 <span className="text-[13px] font-black uppercase tracking-[0.3em] italic font-mono">NODE {page} <span className="opacity-30">/</span> {totalPages}</span>
              </div>
              <button 
                 onClick={() => setPage(Math.min(totalPages, page + 1))} 
                 disabled={page >= totalPages} 
                 className="w-14 h-14 flex items-center justify-center rounded-[20px] bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:text-indigo-600 hover:border-indigo-500/30 disabled:opacity-20 transition-all shadow-inner active:scale-90 group/next"
              >
                <ChevronRight className="w-7 h-7 group-hover/next:translate-x-[2px] transition-transform" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Compliance Strategy Intelligence Terminal Footer */}
      <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 p-12 rounded-[56px] shadow-sm dark:shadow-2xl transition-all flex flex-col lg:flex-row items-center justify-between gap-10 opacity-90 hover:opacity-100 backdrop-blur-3xl group/audit-footer">
         <div className="flex items-center gap-8">
            <div className="p-6 bg-indigo-600 text-white rounded-[28px] shadow-2xl shadow-indigo-500/30 group-hover/audit-footer:rotate-12 transition-all border-4 border-indigo-400/20">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
               <h4 className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] mb-2 font-mono italic">Compliance_Integrity_POSTURE</h4>
               <p className="text-2xl font-black text-slate-950 dark:text-white italic tracking-tighter uppercase leading-none mb-2">Audit Subsystems Synchronized</p>
            </div>
         </div>
         <div className="px-10 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] flex items-center gap-6 shadow-inner group/comp-hint hover:border-indigo-500/40 transition-all">
            <Info className="w-6 h-6 text-emerald-500 group-hover/comp-hint:scale-125 transition-transform" />
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] italic leading-relaxed max-w-sm">Audit logs are cryptographically hashed and Immutable for maximum compliance across distributed operational nodes.</span>
         </div>
      </div>
    </div>
  );
}
