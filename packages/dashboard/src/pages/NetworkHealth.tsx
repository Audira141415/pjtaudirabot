import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Network, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Info, 
  ChevronRight, 
  Loader2, 
  Globe, 
  Monitor, 
  Cpu, 
  Layers, 
  BarChart3, 
  Clock, 
  Target, 
  LayoutGrid, 
  Radio, 
  Signal, 
  Smartphone, 
  Router,
  HardDrive
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function NetworkHealthPage() {
  const [branches, setBranches] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { 
      const res = await api.getNetworkBranches(); 
      setBranches(res.data as any); 
    } catch (err) { 
      console.error(err); 
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => {
    load();
    const t = setInterval(load, 30000);
    return () => clearInterval(t);
  }, []);

  if (loading && branches.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Global Mesh...</span>
    </div>
  );

  const healthStyle = (s: string) => {
    switch (s) {
      case 'HEALTHY': return { 
        bg: 'bg-emerald-50 dark:bg-emerald-500/5', 
        border: 'border-emerald-100 dark:border-emerald-500/20', 
        text: 'text-emerald-600 dark:text-emerald-500', 
        icon: <Wifi className="w-6 h-6 text-emerald-500" /> 
      };
      case 'DEGRADED': return { 
        bg: 'bg-amber-50 dark:bg-amber-500/5', 
        border: 'border-amber-100 dark:border-amber-500/20', 
        text: 'text-amber-600 dark:text-amber-500', 
        icon: <AlertTriangle className="w-6 h-6 text-amber-500" /> 
      };
      case 'WARNING': return { 
        bg: 'bg-orange-50 dark:bg-orange-500/5', 
        border: 'border-orange-100 dark:border-orange-500/20', 
        text: 'text-orange-600 dark:text-orange-500', 
        icon: <AlertTriangle className="w-6 h-6 text-orange-500" /> 
      };
      case 'CRITICAL': return { 
        bg: 'bg-rose-50 dark:bg-rose-500/5', 
        border: 'border-rose-100 dark:border-rose-500/20', 
        text: 'text-rose-600 dark:text-rose-500', 
        icon: <WifiOff className="w-6 h-6 text-rose-500" /> 
      };
      default: return { 
        bg: 'bg-slate-50 dark:bg-slate-950/50', 
        border: 'border-slate-100 dark:border-slate-800', 
        text: 'text-slate-400 dark:text-slate-600', 
        icon: <Network className="w-6 h-6 text-slate-300 dark:text-slate-700" /> 
      };
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Mesh Topology Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Network Health</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Monitor global connectivity status, signal integrity across nodes, and regional infrastructure saturation.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
              <Signal className="w-4 h-4 text-emerald-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{branches.length} Active Branches</span>
           </div>
           <button 
              onClick={load} 
              className="p-4 bg-indigo-600 text-white rounded-[20px] transition-all shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {branches.map((b) => {
          const s = healthStyle(b.healthStatus);
          return (
            <div key={b.id} className={`group rounded-[48px] border p-8 transition-all duration-500 hover:shadow-2xl hover:scale-[1.02] relative overflow-hidden backdrop-blur-3xl ${s.bg} ${s.border}`}>
               <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-transparent via-current opacity-20" style={{ color: s.text.includes('text-emerald') ? '#10b981' : s.text.includes('text-rose') ? '#f43f5e' : '#6366f1' }} />
               
               <div className="flex items-center justify-between mb-8 relative z-10">
                 <div className="flex items-center gap-5">
                   <div className={`p-4 rounded-[24px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800/50 shadow-inner group-hover:scale-110 transition-transform`}>
                     {s.icon}
                   </div>
                   <div>
                     <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tight italic uppercase">{b.name}</h3>
                     <div className="flex items-center gap-2 mt-1">
                        <Globe className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 font-black tracking-widest uppercase">{b.region} :: {b.branchId}</p>
                     </div>
                   </div>
                 </div>
                 <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${s.bg.replace('/5', '/10')} ${s.text} ${s.border.replace('/20', '/40')}`}>{b.healthStatus}</span>
               </div>

               <div className="grid grid-cols-2 gap-4 relative z-10">
                 {[
                   { label: 'Devices', value: `${b.activeDevices}/${b.totalDevices}`, icon: Smartphone },
                   { label: 'Uptime', value: `${(b.uptimePercent ?? 0).toFixed(1)}%`, icon: Activity },
                   { label: 'Latency', value: `${Math.round(b.latencyMs ?? 0)}ms`, icon: Clock },
                   { label: 'Jitter', value: `${Math.round(b.jitterMs ?? 0)}ms`, icon: Zap },
                   { label: 'Saturation', value: `${(b.utilization ?? 0).toFixed(1)}%`, icon: BarChart3 },
                   { label: 'Integrity', value: (b.healthScore ?? 0).toFixed(0), icon: ShieldCheck }
                 ].map((stat, i) => (
                    <div key={i} className="bg-white/40 dark:bg-slate-950/40 rounded-[28px] p-5 text-center border border-white/20 dark:border-slate-800/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-950 transition-all">
                       <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 flex items-center justify-center gap-2">
                          <stat.icon className="w-3 h-3" /> {stat.label}
                       </p>
                       <p className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter">{stat.value}</p>
                    </div>
                 ))}
               </div>

               {(b.criticalIncidents > 0 || b.warningIncidents > 0) && (
                 <div className="mt-8 flex gap-3 relative z-10 pt-6 border-t border-white/10 dark:border-slate-800/30">
                   {b.criticalIncidents > 0 && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-rose-500/10 text-rose-500 rounded-xl border border-rose-500/20 animate-pulse">
                        <AlertTriangle className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{b.criticalIncidents} CRITICAL</span>
                     </div>
                   )}
                   {b.warningIncidents > 0 && (
                     <div className="flex items-center gap-2 px-4 py-2 bg-amber-500/10 text-amber-500 rounded-xl border border-amber-500/20">
                        <Info className="w-3 h-3" />
                        <span className="text-[9px] font-black uppercase tracking-widest">{b.warningIncidents} WARN</span>
                     </div>
                   )}
                 </div>
               )}
            </div>
          );
        })}
        {branches.length === 0 && (
          <div className="col-span-full py-32 text-center grayscale opacity-10">
             <Router className="w-20 h-20 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
             <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">No Mesh Nodes Configured</p>
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
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Mesh Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Network Topology Nodes Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Mesh health is evaluated across all tectonic connectivity layers every 30 seconds.</span>
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
