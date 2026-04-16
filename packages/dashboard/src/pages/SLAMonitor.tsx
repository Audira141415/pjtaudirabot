import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ShieldCheck, 
  AlertTriangle, 
  Clock, 
  TrendingUp, 
  Activity, 
  Zap, 
  Monitor, 
  Timer,
  XCircle,
  ArrowRight,
  ShieldAlert,
  Target,
  Orbit,
  Cpu,
  Fingerprint,
  LayoutGrid,
  CheckCircle,
  ChevronRight,
  Info,
  Layers,
  BarChart3,
  Stethoscope
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function SLAMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getSLADashboard();
      setData(res.data);
    } catch (err) { 
      toast({ type: 'error', title: 'TELEMETRY_SYNC_FAILURE', message: 'Failed to access global obligation matrices.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Syncing Contractual Grid...</span>
      </div>
    );
  }

  const compliance = data?.complianceRate ?? 100;
  const isHealthy = compliance >= 95;
  const isWarning = compliance >= 80 && compliance < 95;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Contractual Obligation Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Compliance Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Real-time tracking of Response and Resolution deadlines across global regional operations.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Live Telemetry Active</span>
           </div>
           <button 
              onClick={loadData} 
              className="p-4 bg-indigo-600 text-white rounded-[20px] transition-all shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Strategic Summary Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'Compliance Rate', value: `${compliance}%`, icon: TrendingUp, color: isHealthy ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-rose-500', bg: isHealthy ? 'bg-emerald-50 dark:bg-emerald-500/10' : isWarning ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-rose-50 dark:bg-rose-500/10' },
          { label: 'Total Tracked', value: data?.totalTracked ?? 0, icon: Monitor, color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10' },
          { label: 'Response Failure', value: data?.responseBreaches ?? 0, icon: Timer, color: data?.responseBreaches > 0 ? 'text-rose-500' : 'text-slate-300 dark:text-slate-700', bg: 'bg-rose-50 dark:bg-rose-500/10' },
          { label: 'Resolution Failure', value: data?.resolutionBreaches ?? 0, icon: Zap, color: data?.resolutionBreaches > 0 ? 'text-amber-500' : 'text-slate-300 dark:text-slate-700', bg: 'bg-amber-50 dark:bg-amber-500/10' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] relative overflow-hidden group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none hover:shadow-xl backdrop-blur-3xl">
             <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-current opacity-10 group-hover:opacity-100 transition-opacity" style={{ color: stat.color.includes('emerald') ? '#10b981' : stat.color.includes('rose') ? '#f43f5e' : '#6366f1' }} />
             <div className="flex items-start justify-between relative z-10">
                <div className={`p-4 rounded-2xl ${stat.bg} shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-transform`}>
                   <stat.icon className={`w-7 h-7 ${stat.color}`} />
                </div>
                <div className="text-right">
                   <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1 italic">{stat.label}</p>
                   <p className={`text-4xl font-black italic tracking-tighter ${stat.color}`}>{stat.value}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Live SLA Nodal Ledger */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
         <div className="px-12 py-8 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-4">
               <ShieldCheck className="w-7 h-7 text-indigo-500" />
               <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-indigo-500/30 decoration-2 underline-offset-8">Live Nodal Compliance Grid</h2>
            </div>
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest italic">Synchronized Operational State</p>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">
                 <th className="px-12 py-6">Machine Identity</th>
                 <th className="px-8 py-6">Subscriber Domain</th>
                 <th className="px-8 py-6 text-center">Response Gate</th>
                 <th className="px-8 py-6 text-center">Resolution Gate</th>
                 <th className="px-12 py-6 text-right">Operational Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30 font-bold">
               {(data?.activeTracking ?? []).map((sla: any) => {
                 const now = new Date();
                 const resDeadline = new Date(sla.resolutionDeadline);
                 const timeLeft = resDeadline.getTime() - now.getTime();
                 const hoursLeft = Math.floor(timeLeft / 3600000);
                 const minsLeft = Math.floor((timeLeft % 3600000) / 60000);
                 const isUrgent = hoursLeft < 1 && hoursLeft >= 0;
                 const isBreached = timeLeft < 0;

                 return (
                   <tr key={sla.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300">
                     <td className="px-12 py-6">
                        <div className="flex items-center gap-4">
                           <div className={`w-1.5 h-10 rounded-full transition-all group-hover:scale-y-125 ${sla.ticket?.priority === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-slate-100 dark:bg-slate-800'}`} />
                           <div className="flex flex-col">
                              <span className="text-[11px] font-black text-slate-900 dark:text-white italic tracking-tighter uppercase group-hover:text-indigo-600 transition-colors font-mono">{sla.ticket?.ticketNumber}</span>
                              <span className="text-[9px] font-bold text-slate-300 dark:text-slate-700 uppercase mt-0.5">{sla.id.substring(0,8)}</span>
                           </div>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase italic transition-colors truncate max-w-[140px]">{sla.ticket?.customer || '---'}</div>
                        <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1 italic">{sla.ticket?.priority} INFRASTRUCTURE</div>
                     </td>
                     <td className="px-8 py-6 text-center">
                        <div className={`text-[10px] font-black italic tracking-tighter ${sla.responseBreached ? 'text-rose-600 line-through' : 'text-slate-900 dark:text-slate-400'}`}>
                           {new Date(sla.responseDeadline).toLocaleTimeString([], { hour12: false })}
                        </div>
                        {sla.responseBreached && <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">BREACH_DETECTED</div>}
                     </td>
                     <td className="px-8 py-6 text-center">
                        <div className={`text-[10px] font-black italic tracking-tighter ${sla.resolutionBreached ? 'text-rose-600 line-through' : 'text-slate-900 dark:text-slate-400'}`}>
                           {resDeadline.toLocaleTimeString([], { hour12: false })}
                        </div>
                        {sla.resolutionBreached && <div className="text-[8px] font-black text-rose-500 uppercase tracking-widest mt-1">BREACH_DETECTED</div>}
                     </td>
                     <td className="px-12 py-6 text-right">
                        {isBreached ? (
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-rose-50 dark:bg-rose-500/10 text-rose-600 border border-rose-100 dark:border-rose-500/20 rounded-xl shadow-inner">
                             <XCircle className="w-3.5 h-3.5" />
                             <span className="text-[9px] font-black uppercase tracking-widest italic leading-none pt-0.5">SIGNAL_LOST</span>
                          </div>
                        ) : isUrgent ? (
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-amber-50 dark:bg-amber-500/10 text-amber-600 border border-amber-100 dark:border-amber-500/20 rounded-xl shadow-inner animate-pulse">
                             <AlertTriangle className="w-3.5 h-3.5" />
                             <span className="text-[9px] font-black uppercase tracking-widest italic leading-none pt-0.5">{minsLeft}M_DELTA</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 border border-emerald-100 dark:border-emerald-500/20 rounded-xl shadow-inner">
                             <Clock className="w-3.5 h-3.5" />
                             <span className="text-[9px] font-black uppercase tracking-widest italic leading-none pt-0.5">{hoursLeft}H_SAFE</span>
                          </div>
                        )}
                     </td>
                   </tr>
                 );
               })}
               {(data?.activeTracking ?? []).length === 0 && (
                 <tr>
                    <td colSpan={5} className="py-24 text-center grayscale opacity-10">
                       <Zap className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                       <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600 italic">Zero Nodal Tracking Sequences</p>
                    </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Critical Anomaly Detection */}
      {data?.recentBreach?.length > 0 && (
        <div className="bg-rose-50/50 dark:bg-rose-950/10 border border-rose-100 dark:border-rose-900/30 rounded-[48px] p-12 backdrop-blur-3xl shadow-inner relative overflow-hidden group">
           <div className="absolute right-0 top-0 bottom-0 w-24 bg-gradient-to-l from-rose-500/5 to-transparent pointer-events-none" />
           <div className="flex items-center justify-between mb-10">
              <div className="flex items-center gap-5">
                 <div className="p-4 bg-rose-600/10 rounded-2xl text-rose-600 border border-rose-200 dark:border-rose-500/20 shadow-inner group-hover:scale-110 transition-transform">
                    <ShieldAlert className="w-7 h-7" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Contractual Anomalies Detected</h2>
                    <p className="text-[10px] font-black text-rose-400 dark:text-rose-600 uppercase tracking-widest mt-1 italic">Real-time breach audit & temporal history</p>
                 </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {(data?.recentBreach ?? []).map((b: any) => (
                <div key={b.id} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-rose-900/20 p-8 rounded-[40px] group/item hover:bg-slate-50 dark:hover:bg-rose-950/20 hover:border-rose-500/50 transition-all duration-500 shadow-sm relative overflow-hidden">
                   <div className="absolute right-0 top-0 w-8 h-8 opacity-0 group-hover/item:opacity-100 transition-opacity">
                      <div className="absolute top-2 right-2 w-1.5 h-1.5 bg-rose-500 rounded-full animate-ping" />
                   </div>
                   <div className="flex items-center justify-between mb-6">
                      <span className="font-mono text-[11px] font-black text-rose-600 italic tracking-widest uppercase group-hover/item:translate-x-1 transition-transform">#{b.ticket?.ticketNumber}</span>
                      <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700 group-hover/item:text-rose-500 transition-all" />
                   </div>
                   <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-4 truncate">{b.ticket?.customer || 'UNKNOWN_SUBSCRIBER'}</h3>
                   <div className="flex gap-3">
                      {b.responseBreached && (
                        <div className="px-3 py-1.5 bg-rose-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-2xl shadow-rose-600/30">
                           <Zap className="w-3 h-3" /> RESP_FAIL
                        </div>
                      )}
                      {b.resolutionBreached && (
                        <div className="px-3 py-1.5 bg-amber-600 text-white rounded-xl text-[9px] font-black uppercase flex items-center gap-2 shadow-2xl shadow-amber-600/30">
                           <Zap className="w-3 h-3" /> RES_FAIL
                        </div>
                      )}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Obligation Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Global Temporal Thresholds Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Service level intelligence ensures 100% contractual compliance across all global regional operations.</span>
         </div>
      </div>
    </div>
  );
}

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-6.7"/>
  </svg>
)
