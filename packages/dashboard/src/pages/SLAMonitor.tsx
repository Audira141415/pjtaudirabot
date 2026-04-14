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
  CheckCircle2,
  XCircle,
  ArrowRight
} from 'lucide-react';

export default function SLAMonitorPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getSLADashboard();
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
    const t = setInterval(loadData, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Syncing SLA Grid...</span>
      </div>
    );
  }

  const compliance = data?.complianceRate ?? 100;
  const isHealthy = compliance >= 95;
  const isWarning = compliance >= 80 && compliance < 95;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-ping'}`} />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Service Level Intelligence</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1">Compliance Monitor</h1>
          <p className="text-slate-500 font-medium text-sm">Real-time tracking of Response and Resolution deadlines across global operations.</p>
        </div>

        <div className="px-6 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl backdrop-blur-md">
           <div className="flex items-center gap-3">
              <Activity className="w-4 h-4 text-emerald-500" />
              <span className="text-[10px] font-black text-white uppercase tracking-widest italic decoration-emerald-500/30 underline underline-offset-4">Auto-sync Active</span>
           </div>
        </div>
      </div>

      {/* Hero Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="relative group bg-slate-950/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl overflow-hidden shadow-2xl transition-all hover:border-indigo-500/30">
          <div className="absolute -right-6 -top-6 w-24 h-24 bg-indigo-600/5 blur-[40px] group-hover:bg-indigo-600/15 transition-all" />
          <div className="flex items-center gap-3 text-indigo-400 mb-4">
             <TrendingUp className="w-5 h-5" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Compliance Rate</span>
          </div>
          <div className={`text-5xl font-black italic tracking-tighter transition-all ${isHealthy ? 'text-emerald-500' : isWarning ? 'text-amber-500' : 'text-rose-500'}`}>
            {compliance}<span className="text-2xl text-slate-700 ml-1">%</span>
          </div>
        </div>

        <div className="relative group bg-slate-950/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl overflow-hidden transition-all hover:border-slate-700">
          <div className="flex items-center gap-3 text-sky-400 mb-4">
             <Monitor className="w-5 h-5" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Total Tracked</span>
          </div>
          <div className="text-5xl font-black text-white italic tracking-tighter">{data?.totalTracked ?? 0}</div>
        </div>

        <div className="relative group bg-slate-950/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl overflow-hidden transition-all border-rose-900/10 hover:border-rose-500/30">
          <div className="flex items-center gap-3 text-rose-500 mb-4 px-2 py-1 bg-rose-500/5 rounded-lg w-fit">
             <Timer className="w-5 h-5" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Response Failure</span>
          </div>
          <div className={`text-5xl font-black italic tracking-tighter ${data?.responseBreaches > 0 ? 'text-rose-600' : 'text-slate-800'}`}>
            {data?.responseBreaches ?? 0}
          </div>
        </div>

        <div className="relative group bg-slate-950/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl overflow-hidden transition-all border-amber-900/10 hover:border-amber-500/30">
          <div className="flex items-center gap-3 text-amber-500 mb-4 px-2 py-1 bg-amber-500/5 rounded-lg w-fit">
             <Zap className="w-5 h-5" />
             <span className="text-[10px] font-black uppercase tracking-[0.2em]">Resolution Failure</span>
          </div>
          <div className={`text-5xl font-black italic tracking-tighter ${data?.resolutionBreaches > 0 ? 'text-amber-600' : 'text-slate-800'}`}>
            {data?.resolutionBreaches ?? 0}
          </div>
        </div>
      </div>

      {/* Main Grid: Active Tracking */}
      <div className="relative bg-slate-950/50 border border-slate-800/60 rounded-[48px] overflow-hidden backdrop-blur-2xl">
         <div className="px-10 py-8 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-4">
               <ShieldCheck className="w-6 h-6 text-indigo-500" />
               <h2 className="text-xl font-black text-white uppercase italic tracking-tight underline decoration-indigo-500 decoration-2 underline-offset-8">Live SLA Grid</h2>
            </div>
            <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Synchronized State</div>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-slate-900/30">
                 <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identity</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Subscriber</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Response Gate</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Resolution Gate</th>
                 <th className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Status</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/40">
               {(data?.activeTracking ?? []).map((sla: any) => {
                 const now = new Date();
                 const resDeadline = new Date(sla.resolutionDeadline);
                 const timeLeft = resDeadline.getTime() - now.getTime();
                 const hoursLeft = Math.floor(timeLeft / 3600000);
                 const minsLeft = Math.floor((timeLeft % 3600000) / 60000);
                 const isUrgent = hoursLeft < 1 && hoursLeft >= 0;
                 const isBreached = timeLeft < 0;

                 return (
                   <tr key={sla.id} className="group hover:bg-slate-900 transition-colors">
                     <td className="px-10 py-6">
                        <div className="flex items-center gap-2">
                           <div className={`w-1 h-8 rounded-full ${sla.ticket?.priority === 'CRITICAL' ? 'bg-rose-500 shadow-[0_0_10px_rgba(244,63,94,0.3)]' : 'bg-slate-800'}`} />
                           <span className="font-mono text-xs font-black text-white group-hover:text-indigo-400 transition-colors">{sla.ticket?.ticketNumber}</span>
                        </div>
                     </td>
                     <td className="px-8 py-6">
                        <div className="text-sm font-bold text-slate-300 group-hover:text-white transition-colors capitalize">{sla.ticket?.customer || '---'}</div>
                        <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{sla.ticket?.priority} Asset</div>
                     </td>
                     <td className="px-8 py-6">
                        <div className={`text-xs font-bold ${sla.responseBreached ? 'text-rose-500 line-through' : 'text-slate-400'}`}>
                           {new Date(sla.responseDeadline).toLocaleTimeString()}
                        </div>
                        {sla.responseBreached && <div className="text-[9px] font-black text-rose-600 uppercase">Breached</div>}
                     </td>
                     <td className="px-8 py-6">
                        <div className={`text-xs font-bold ${sla.resolutionBreached ? 'text-rose-500 line-through' : 'text-slate-400'}`}>
                           {resDeadline.toLocaleTimeString()}
                        </div>
                        {sla.resolutionBreached && <div className="text-[9px] font-black text-rose-600 uppercase">Breached</div>}
                     </td>
                     <td className="px-10 py-6 text-right">
                        {isBreached ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-rose-600/10 border border-rose-500/20 rounded-lg text-rose-500">
                             <XCircle className="w-3 h-3" />
                             <span className="text-[10px] font-black uppercase tracking-widest italic">Signal Lost</span>
                          </div>
                        ) : isUrgent ? (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-600/10 border border-amber-500/20 rounded-lg text-amber-500 animate-pulse">
                             <AlertTriangle className="w-3 h-3" />
                             <span className="text-[10px] font-black uppercase tracking-widest italic">{minsLeft}m Left</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-2 px-3 py-1 bg-emerald-600/10 border border-emerald-500/20 rounded-lg text-emerald-500">
                             <Clock className="w-3 h-3" />
                             <span className="text-[10px] font-black uppercase tracking-widest italic">{hoursLeft}h Left</span>
                          </div>
                        )}
                     </td>
                   </tr>
                 );
               })}
               {(data?.activeTracking ?? []).length === 0 && (
                 <tr>
                   <td colSpan={5} className="px-10 py-20 text-center">
                      <Zap className="w-12 h-12 text-slate-800 mx-auto mb-4" />
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No active tracking sequences</div>
                   </td>
                 </tr>
               )}
             </tbody>
           </table>
         </div>
      </div>

      {/* Tertiary: Recent Breaches */}
      {data?.recentBreach?.length > 0 && (
        <div className="bg-rose-950/10 border border-rose-900/30 rounded-[40px] p-8 md:p-10 backdrop-blur-xl">
           <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-4">
                 <div className="p-3 bg-rose-600/20 rounded-2xl text-rose-500">
                    <XCircle className="w-6 h-6" />
                 </div>
                 <h2 className="text-xl font-black text-white uppercase italic">Anomalies Detected</h2>
              </div>
              <span className="text-[10px] font-black text-rose-500 uppercase tracking-[0.2em] animate-pulse italic">Critical History</span>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {(data?.recentBreach ?? []).map((b: any) => (
                <div key={b.id} className="bg-slate-900/50 border border-rose-900/20 p-6 rounded-[32px] group hover:bg-rose-950/20 hover:border-rose-500/40 transition-all duration-500">
                   <div className="flex items-center justify-between mb-4">
                      <span className="font-mono text-[10px] font-bold text-rose-500 group-hover:text-rose-400 transition-colors">#{b.ticket?.ticketNumber}</span>
                      <ArrowRight className="w-4 h-4 text-slate-700 group-hover:text-rose-500 transition-all group-hover:translate-x-1" />
                   </div>
                   <h3 className="text-white font-bold mb-2 group-hover:text-white transition-colors">{b.ticket?.customer || 'Unknown Subscriber'}</h3>
                   <div className="flex gap-2">
                      {b.responseBreached && <div className="px-2 py-0.5 bg-rose-500 text-white rounded text-[9px] font-black uppercase flex items-center gap-1"><Zap className="w-2 h-2" /> RES</div>}
                      {b.resolutionBreached && <div className="px-2 py-0.5 bg-amber-600 text-white rounded text-[9px] font-black uppercase flex items-center gap-1"><Zap className="w-2 h-2" /> SOLV</div>}
                   </div>
                </div>
              ))}
           </div>
        </div>
      )}
    </div>
  );
}
