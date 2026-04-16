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
  HardDrive
} from 'lucide-react';

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
    } catch (err) { console.error(err); }
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
      <div className="bg-slate-950/50 border border-slate-800/80 p-6 rounded-[32px] backdrop-blur-xl group hover:border-indigo-500/30 transition-all duration-500">
        <div className="flex items-center justify-between mb-4">
           <div className="flex items-center gap-3">
              <div className={`p-2 rounded-xl bg-slate-900 border border-slate-800 group-hover:border-indigo-500/20 transition-all ${isCritical ? 'animate-pulse text-rose-500' : 'text-indigo-400'}`}>
                 <Icon className="w-4 h-4" />
              </div>
              <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">{label}</span>
           </div>
           {isCritical && <span className="text-[9px] font-black text-rose-500 uppercase tracking-widest animate-pulse">Critical</span>}
        </div>
        
        <div className="flex items-end gap-2 mb-4">
          <span className="text-3xl font-black text-white italic tracking-tighter">{typeof value === 'number' ? value.toFixed(1) : value}</span>
          <span className="text-sm font-black text-slate-600 uppercase mb-1">{unit}</span>
        </div>

        <div className="relative w-full bg-slate-900 rounded-full h-2 overflow-hidden border border-slate-800">
          <div 
            className={`h-full rounded-full transition-all duration-1000 ${color} shadow-[0_0_15px_rgba(0,0,0,0.5)]`} 
            style={{ width: `${pct}%` }} 
          />
        </div>
        <div className="flex justify-between mt-2 text-[9px] font-black text-slate-700 uppercase tracking-widest">
           <span>0% capacity</span>
           <span>{pct.toFixed(1)}% usage</span>
        </div>
      </div>
    );
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Interrogating Server...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Zap className="w-4 h-4 text-indigo-400" />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Hardware Analysis</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1">Compute Infrastructure</h1>
          <p className="text-slate-500 font-medium text-sm">Low-level metrics, process affinity, and kernel event logs.</p>
        </div>

        <div className="flex gap-2 bg-slate-950/50 p-2 rounded-[24px] border border-slate-800 backdrop-blur-md">
          <button 
             onClick={() => setTab('status')} 
             className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'status' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
          >
             Telemetry
          </button>
          <button 
             onClick={() => setTab('logs')} 
             className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'logs' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
          >
             Stream Logs
          </button>
          <button onClick={load} className="p-3 text-slate-500 hover:text-white transition-all active:scale-90 flex items-center justify-center">
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {tab === 'status' && status && (
        <div className="space-y-8 animate-in slide-in-from-left-6 duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
             {[
               { icon: Clock, label: 'Session Uptime', value: `${Math.floor(status.uptime / 3600)}h ${Math.floor((status.uptime % 3600) / 60)}m`, color: 'text-indigo-400' },
               { icon: Cpu, label: 'Compute Engine', value: `${status.cpuCores} Cores`, color: 'text-sky-400' },
               { icon: Globe, label: 'Environment', value: status.platform.toUpperCase(), color: 'text-emerald-400' },
               { icon: Layers, label: 'Kernel Runtime', value: `Node ${status.nodeVersion}`, color: 'text-violet-400' }
             ].map((item, i) => (
               <div key={i} className="bg-slate-900/40 border border-slate-800/60 p-6 rounded-[32px] flex items-center gap-5 group hover:bg-slate-900 transition-all">
                  <div className={`p-4 rounded-2xl bg-slate-950 border border-slate-800 ${item.color.replace('text-', 'text-opacity-20 ')} group-hover:scale-110 transition-transform`}>
                     <item.icon className={`w-6 h-6 ${item.color}`} />
                  </div>
                  <div>
                     <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{item.label}</p>
                     <p className="font-black text-white italic tracking-tight">{item.value}</p>
                  </div>
               </div>
             ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <NeonGauge icon={MemoryStick} label="System Memory" value={status.memoryUsed} max={status.memoryTotal} unit="GB" color={status.memoryUsed / status.memoryTotal > 0.85 ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' : 'bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]'} />
            <NeonGauge icon={HardDrive} label="Heap Registry" value={status.heapUsed} max={status.heapTotal} unit="MB" color="bg-sky-500 shadow-[0_0_15px_rgba(14,165,233,0.5)]" />
            <NeonGauge icon={Activity} label="Computational Load" value={status.loadAvg?.[0] ?? 0} max={status.cpuCores} unit="UNIT" color="bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.5)]" />
          </div>

          {status.loadAvg && (
            <div className="bg-slate-950/60 border border-slate-800/80 p-10 rounded-[48px] overflow-hidden relative group">
               <div className="absolute right-0 top-0 bottom-0 w-48 bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none" />
               <div className="flex items-center gap-3 mb-10">
                  <Activity className="w-5 h-5 text-indigo-500" />
                  <h3 className="text-xl font-black text-white uppercase italic tracking-tight underline decoration-indigo-500 decoration-2 underline-offset-8">Load Distribution Map</h3>
               </div>
               <div className="grid grid-cols-3 gap-10">
                 {[
                   { label: 'Short-term (1m)', value: status.loadAvg[0]?.toFixed(2) },
                   { label: 'Mid-term (5m)', value: status.loadAvg[1]?.toFixed(2) },
                   { label: 'Long-term (15m)', value: status.loadAvg[2]?.toFixed(2) }
                 ].map((item, i) => (
                   <div key={i} className="space-y-2">
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">{item.label}</span>
                      <div className="text-5xl font-black text-white italic tracking-tighter group-hover:scale-105 transition-transform origin-left duration-700">{item.value}</div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-6 animate-in slide-in-from-right-6 duration-500">
          <div className="flex flex-wrap gap-2 bg-slate-950/40 p-3 rounded-[28px] border border-slate-800 backdrop-blur-xl">
            {['', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((l) => (
              <button 
                key={l} 
                onClick={() => setLogLevel(l)} 
                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${logLevel === l ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-500 hover:text-white'}`}
              >
                {l || 'Clear Filter'}
              </button>
            ))}
          </div>

          <div className="bg-slate-950 border border-slate-800 rounded-[40px] p-8 max-h-[70vh] overflow-auto font-mono text-[11px] leading-relaxed relative ring-1 ring-white/5 shadow-2xl">
            <div className="flex items-center gap-2 mb-6 text-slate-700 px-2 sticky top-0 bg-slate-950/80 backdrop-blur pb-4 z-10 border-b border-slate-900">
               <Terminal className="w-3.5 h-3.5" />
               <span className="font-black uppercase tracking-widest">Kernel Stream Output</span>
            </div>
            <div className="space-y-1">
              {logs.map((log, i) => (
                <div key={i} className="flex gap-4 group hover:bg-white/5 transition-colors p-1 rounded">
                  <span className="text-slate-700 shrink-0 font-bold whitespace-nowrap">[{new Date(log.timestamp ?? log.createdAt).toLocaleTimeString()}]</span>
                  <span className={`shrink-0 w-16 font-black ${log.level === 'ERROR' ? 'text-rose-500' : log.level === 'WARN' ? 'text-amber-500' : log.level === 'INFO' ? 'text-indigo-400' : 'text-slate-500'}`}>
                    {log.level}
                  </span>
                  <span className="text-slate-300 font-medium group-hover:text-white transition-colors break-all">{log.message}</span>
                </div>
              ))}
              {logs.length === 0 && (
                <div className="py-20 text-center flex flex-col items-center gap-4">
                   <Terminal className="w-10 h-10 text-slate-800" />
                   <p className="text-[10px] font-black text-slate-700 uppercase tracking-[0.3em]">No activity signals captured</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
