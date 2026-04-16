import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Cpu, 
  MemoryStick, 
  Clock, 
  RefreshCw, 
  Activity, 
  Terminal, 
  Layers, 
  Globe, 
  Zap,
  HardDrive,
  Orbit,
  Fingerprint,
  Radio,
  Target,
  ShieldCheck,
  Info,
  Smartphone,
  Server,
  Command,
  PlusCircle,
  Unplug,
  Database,
  Monitor
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function ServerStatusPage() {
  const [status, setStatus] = useState<any>(null);
  const [logs, setLogs] = useState<any[]>([]);
  const [logLevel, setLogLevel] = useState('');
  const [tab, setTab] = useState<'status' | 'logs'>('status');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, l] = await Promise.all([
        api.getServerStatus(), 
        api.getServerLogs(1, logLevel ? { level: logLevel } : undefined)
      ]);
      setStatus(s.data);
      setLogs((l.data as any[]) ?? []);
    } catch (err) { 
       toast({ type: 'error', title: 'TELEMETRY_FAILURE', message: 'Failed to access global compute metrics.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => { 
    load(); 
    const t = setInterval(load, 15000); 
    return () => clearInterval(t); 
  }, [logLevel]);

  const NeonGauge = ({ label, value, max, unit, color, icon: Icon }: { 
    label: string; value: number; max: number; unit: string; color: string; icon: any 
  }) => {
    const pct = Math.min((value / max) * 100, 100);
    const isCritical = pct > 85;
    
    return (
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] backdrop-blur-3xl group hover:border-indigo-500/30 transition-all duration-500 shadow-sm dark:shadow-none relative overflow-hidden">
        <div className="absolute right-0 top-0 p-8 opacity-[0.03] group-hover:opacity-10 transition-opacity">
           <Icon className="w-24 h-24 text-indigo-500" />
        </div>
        
        <div className="flex items-center justify-between mb-6 relative z-10">
           <div className="flex items-center gap-4">
              <div className={`p-4 rounded-2xl bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 group-hover:scale-110 group-hover:rotate-6 transition-all shadow-inner ${isCritical ? 'animate-pulse text-rose-500 border-rose-500/20' : 'text-indigo-600 dark:text-indigo-400'}`}>
                 <Icon className="w-6 h-6" />
              </div>
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] font-mono italic">{label}</span>
           </div>
           {isCritical && (
             <div className="px-4 py-1.5 bg-rose-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest animate-pulse shadow-lg shadow-rose-500/30 border-2 border-rose-300/20">
                CRITICAL_LOAD
             </div>
           )}
        </div>
        
        <div className="flex items-end gap-3 mb-6 relative z-10">
          <span className="text-5xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none">{typeof value === 'number' ? value.toFixed(1) : value}</span>
          <span className="text-sm font-black text-slate-400 dark:text-slate-600 uppercase mb-2 italic">{unit}</span>
        </div>

        <div className="relative w-full bg-slate-100 dark:bg-slate-900 rounded-full h-3 overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner group-hover:h-4 transition-all">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${color} shadow-[0_0_20px_rgba(79,70,229,0.5)]`} 
            style={{ width: `${pct}%` }} 
          />
        </div>
        <div className="flex justify-between mt-4 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest font-mono italic">
           <span className="flex items-center gap-2"><Target className="w-3.5 h-3.5" /> 0% BASE</span>
           <span className="text-slate-900 dark:text-white">{pct.toFixed(1)}% CONSUMPTION</span>
        </div>
      </div>
    );
  };

  if (loading && !status) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic font-mono">Interrogating Master Node Telemetry...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Compute Infrastructure Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">System Core Status</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Low-level metrics interrogation, process affinity matrix, and kernel event streams.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-950/40 p-2 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-sm backdrop-blur-3xl transition-all hover:border-indigo-500/20">
          <button 
             onClick={() => setTab('status')} 
             className={`px-10 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
               tab === 'status' 
                 ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 active:scale-95 translate-y-[-2px]' 
                 : 'text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-white'
             }`}
          >
             TELEMETRY_DASH
          </button>
          <button 
             onClick={() => setTab('logs')} 
             className={`px-10 py-4 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all ${
               tab === 'logs' 
                 ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30 active:scale-95 translate-y-[-2px]' 
                 : 'text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-white'
             }`}
          >
             KERNEL_STREAM
          </button>
          <button 
            onClick={load} 
            className="p-4 text-indigo-600 dark:text-indigo-400 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-[20px] transition-all active:scale-95 border border-transparent hover:border-slate-100 dark:hover:border-slate-800"
          >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {tab === 'status' && status && (
        <div className="space-y-8 animate-in slide-in-from-left-8 duration-700">
          {/* Component Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { icon: Clock, label: 'SESSION_UPTIME', value: `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`, color: 'text-indigo-600 dark:text-indigo-400' },
               { icon: Cpu, label: 'COMPUTE_ENGINE', value: `${status.cpuCores} LOGIC_CORES`, color: 'text-sky-600 dark:text-sky-400' },
               { icon: Globe, label: 'RUNTIME_ENV', value: status.platform.toUpperCase(), color: 'text-emerald-600 dark:text-emerald-400' },
               { icon: Layers, label: 'KERNEL_VERSION', value: `Node.js ${status.nodeVersion}`, color: 'text-violet-600 dark:text-violet-400' }
             ].map((item, i) => (
               <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] flex items-center gap-6 group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
                  <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:opacity-[0.08] transition-opacity">
                     <item.icon className="w-20 h-20" />
                  </div>
                  <div className={`p-5 rounded-[20px] bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-transform relative z-10`}>
                     <item.icon className={`w-8 h-8 ${item.color}`} />
                  </div>
                  <div className="relative z-10">
                     <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">{item.label}</p>
                     <p className="text-lg font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">{item.value}</p>
                  </div>
               </div>
             ))}
          </div>

          {/* Performance Gauges */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
            <NeonGauge icon={MemoryStick} label="SYSTEM_MEMORY" value={status.memoryUsed} max={status.memoryTotal} unit="GB" color={status.memoryUsed / status.memoryTotal > 0.85 ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.6)]' : 'bg-indigo-600 dark:bg-indigo-500 shadow-[0_0_20px_rgba(99,102,241,0.6)]'} />
            <NeonGauge icon={HardDrive} label="HEAP_REGISTRY" value={status.heapUsed} max={status.heapTotal} unit="MB" color="bg-sky-600 dark:bg-sky-500 shadow-[0_0_20px_rgba(14,165,233,0.6)]" />
            <NeonGauge icon={Activity} label="LOAD_AVERAGE" value={status.loadAvg?.[0] ?? 0} max={status.cpuCores} unit="UNIT" color="bg-emerald-600 dark:bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.6)]" />
          </div>

          {/* Distribution Map */}
          {status.loadAvg && (
            <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-12 rounded-[64px] overflow-hidden relative group shadow-sm dark:shadow-none backdrop-blur-3xl transition-all hover:border-indigo-500/20">
               <div className="absolute right-0 top-0 p-16 opacity-[0.03] group-hover:opacity-10 transition-opacity">
                  <Fingerprint className="w-80 h-80 text-indigo-500" />
               </div>
               <div className="flex items-center gap-4 mb-12 relative z-10">
                  <Activity className="w-8 h-8 text-indigo-500" />
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter underline decoration-indigo-500/30 decoration-8 underline-offset-[16px]">Hardware Load Distribution</h3>
               </div>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-12 relative z-10">
                 {[
                   { label: 'SHORT_TERM (1M)', value: status.loadAvg[0]?.toFixed(2), icon: Zap, color: 'text-indigo-500' },
                   { label: 'MID_TERM (5M)', value: status.loadAvg[1]?.toFixed(2), icon: Activity, color: 'text-sky-500' },
                   { label: 'LONG_TERM (15M)', value: status.loadAvg[2]?.toFixed(2), icon: RefreshCw, color: 'text-emerald-500' }
                 ].map((item, i) => (
                   <div key={i} className="space-y-4 group/item">
                       <div className="flex items-center gap-3">
                          <item.icon className={`w-4 h-4 ${item.color}`} />
                          <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] font-mono italic">{item.label}</span>
                       </div>
                       <div className="text-7xl font-black text-slate-900 dark:text-white italic tracking-tighter group-hover/item:scale-[1.15] group-hover/item:translate-x-4 transition-all duration-700 origin-left drop-shadow-sm">{item.value}</div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-8 animate-in slide-in-from-right-8 duration-700">
          <div className="flex flex-wrap gap-4 bg-white dark:bg-slate-950/40 p-4 rounded-[36px] border border-slate-100 dark:border-slate-800/80 backdrop-blur-3xl shadow-sm transition-all hover:border-indigo-500/20">
            {['', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((l) => (
              <button 
                key={l} 
                onClick={() => setLogLevel(l)} 
                className={`px-10 py-4 rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] transition-all ${
                  logLevel === l 
                    ? 'bg-rose-600 text-white shadow-2xl shadow-rose-600/30' 
                    : 'text-slate-400 dark:text-slate-700 hover:text-rose-600 dark:hover:text-white'
                }`}
              >
                {l || 'RESET_FILTER'}
              </button>
            ))}
          </div>

          <div className="bg-slate-950 border-4 border-slate-900 rounded-[64px] p-12 max-h-[75vh] overflow-auto font-mono text-[13px] leading-relaxed relative ring-1 ring-white/10 shadow-[inner_0_0_60px_rgba(0,0,0,0.8)] group/screen">
            <div className="flex items-center justify-between mb-8 text-slate-700 px-4 sticky top-0 bg-slate-950/90 backdrop-blur-xl py-4 z-20 border-b border-white/5">
               <div className="flex items-center gap-4">
                  <Terminal className="w-6 h-6 text-indigo-500 group-hover/screen:animate-pulse" />
                  <span className="font-black uppercase tracking-[0.5em] text-indigo-400/50">KERNEL_STREAM_ENGAGE</span>
               </div>
               <div className="flex items-center gap-3">
                  <Server className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-700">MASTER_NODE_STABLE</span>
               </div>
            </div>
            <div className="space-y-4">
              {logs.map((log, i) => (
                <div key={i} className="flex flex-col md:flex-row gap-6 group/log hover:bg-white/5 transition-all p-4 rounded-3xl border border-transparent hover:border-white/5 relative overflow-hidden">
                  <div className="absolute left-0 top-0 bottom-0 w-1 bg-indigo-600/0 group-hover/log:bg-indigo-600 transition-all" />
                  <span className="text-slate-700 shrink-0 font-black whitespace-nowrap italic tracking-tighter uppercase drop-shadow-sm font-mono">[{new Date(log.timestamp ?? log.createdAt).toLocaleTimeString()}]</span>
                  <div className={`px-4 py-1.5 rounded-xl text-[10px] font-black tracking-[0.2em] shrink-0 w-24 text-center border-2 shadow-inner group-hover/log:scale-110 transition-transform ${
                    log.level === 'ERROR' ? 'bg-rose-600/10 text-rose-500 border-rose-500/30' : 
                    log.level === 'WARN' ? 'bg-amber-600/10 text-amber-500 border-amber-500/30' : 
                    log.level === 'INFO' ? 'bg-indigo-600/10 text-indigo-400 border-indigo-400/30' : 
                    'bg-slate-800/10 text-slate-500 border-slate-700/30'
                  }`}>
                    {log.level}
                  </div>
                  <span className="text-slate-400 font-bold group-hover:text-white transition-colors break-all leading-relaxed uppercase tracking-tight italic">
                    {">"} {log.message}
                  </span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="py-40 text-center flex flex-col items-center gap-10 opacity-20 grayscale transition-all hover:opacity-100 animate-pulse">
                   <div className="w-32 h-32 rounded-[48px] border-4 border-dashed border-slate-800 flex items-center justify-center">
                      <Terminal className="w-16 h-16 text-slate-800" />
                   </div>
                   <p className="text-[14px] font-black text-slate-800 uppercase tracking-[0.6em] italic">ZERO_ACTIVITY_SIGNALS_CAPTURED</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[48px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-8 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-500/10 rounded-3xl border-2 border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
               <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-2 italic">Compute Strategy</h4>
               <p className="text-base font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">Hardware Integrity Matrices Synchronized</p>
            </div>
         </div>
         <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[28px] flex items-center gap-4">
            <Info className="w-5 h-5 text-indigo-500" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic max-w-sm line-clamp-2">Hardware monitoring engineering ensures 100% precision in computational health tracking across all nodal segments.</span>
         </div>
      </div>
    </div>
  );
}
