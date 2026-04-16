import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Activity, 
  Plus, 
  Trash2, 
  Wifi, 
  WifiOff, 
  AlertTriangle, 
  Shield, 
  Globe, 
  Clock, 
  Server, 
  BarChart3, 
  Search, 
  LayoutGrid,
  Orbit,
  Layers,
  Cpu,
  Fingerprint,
  Radio,
  Target,
  Zap,
  RefreshCw,
  PlusCircle,
  Unplug,
  ShieldCheck,
  Info,
  Smartphone,
  Command,
  Monitor,
  CheckCircle2,
  HardDrive
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function UptimeMonitorPage() {
  const [targets, setTargets] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', host: '', port: '', checkType: 'PING', intervalSec: 60 });

  const load = async () => {
    try {
      const res = await api.getUptimeTargets();
      setTargets(res.data as any);
    } catch (err) { 
       toast({ type: 'error', title: 'TELEMETRY_GAP', message: 'Failed to access global availability matrices.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 30000); return () => clearInterval(t); }, []);

  const handleCreate = async () => {
    if (!form.name || !form.host) return;
    try {
      await api.createUptimeTarget({ ...form, port: form.port ? parseInt(form.port) : undefined });
      setShowForm(false);
      setForm({ name: '', host: '', port: '', checkType: 'PING', intervalSec: 60 });
      toast({ type: 'success', title: 'TARGET_ESTABLISHED', message: `Monitoring core synchronized for ${form.name}.` });
      load();
    } catch (err) {
      toast({ type: 'error', title: 'INITIALIZATION_FAILURE', message: 'Failed to establish monitoring bridge.' });
    }
  };

  const handleDelete = async (id: string) => { 
    if (!confirm('Decommission this monitoring target from the registry?')) return;
    try {
      await api.deleteUptimeTarget(id); 
      toast({ type: 'success', title: 'NODE_DECOMMISSIONED', message: 'Target has been removed from the global health matrix.' });
      load(); 
    } catch (err) {
      toast({ type: 'error', title: 'PURGE_FAILURE', message: 'Decommissioning protocol was rejected.' });
    }
  };

  const statusIcon = (s: string) => {
    switch (s) {
      case 'UP': return <Wifi className="w-8 h-8 text-emerald-500" />;
      case 'DOWN': return <WifiOff className="w-8 h-8 text-rose-500" />;
      case 'DEGRADED': return <AlertTriangle className="w-8 h-8 text-amber-500" />;
      default: return <Activity className="w-8 h-8 text-slate-400" />;
    }
  };

  if (loading && targets.length === 0) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="w-12 h-12 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic font-mono">Pinging Global Edge Nodes...</span>
    </div>
  );

  const stats = {
    total: targets.length,
    up: targets.filter(t => t.status === 'UP').length,
    down: targets.filter(t => t.status === 'DOWN').length,
    degraded: targets.filter(t => t.status === 'DEGRADED').length
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Infrastructure Availability Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Telemetry Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Real-time geospatial health tracking for core networking equipment and persistent services.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <button
             onClick={() => setShowForm(!showForm)}
             className={`px-10 py-5 rounded-[28px] ${showForm ? 'bg-rose-600 shadow-rose-600/30' : 'bg-indigo-600 shadow-indigo-600/30'} text-white font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl flex items-center gap-3 border-2 border-white/10`}
           >
             {showForm ? <Unplug className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />} {showForm ? 'ABORT_DEPLOYMENT' : 'DEPLOY_MONITOR_TARGET'}
           </button>
           <button 
              onClick={load} 
              className="p-5 bg-white dark:bg-slate-950 text-indigo-600 border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-sm hover:border-indigo-500/30 active:scale-95 transition-all"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Summary Matrix Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
         {[
           { label: 'REGISTRY_SIZE', value: stats.total, color: 'text-slate-900 dark:text-white', border: 'border-slate-100 dark:border-slate-800', bg: 'bg-white dark:bg-slate-950/40' },
           { label: 'OPERATIONAL', value: stats.up, color: 'text-emerald-500', border: 'border-emerald-500/20', bg: 'bg-emerald-50/50 dark:bg-emerald-500/5' },
           { label: 'SIGNAL_INTERRUPTED', value: stats.down, color: 'text-rose-500', border: 'border-rose-500/20', bg: 'bg-rose-50/50 dark:bg-rose-500/5' },
           { label: 'HIGH_LATENCY', value: stats.degraded, color: 'text-amber-500', border: 'border-amber-500/20', bg: 'bg-amber-50/50 dark:bg-amber-500/5' }
         ].map((stat, i) => (
           <div key={i} className={`${stat.bg} ${stat.border} rounded-[40px] p-8 border-2 shadow-sm dark:shadow-none text-center backdrop-blur-3xl group hover:border-indigo-500/30 transition-all`}>
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-3 font-mono italic">{stat.label}</p>
              <p className={`text-4xl font-black italic tracking-tighter leading-none ${stat.color} group-hover:scale-110 transition-transform`}>{stat.value}</p>
           </div>
         ))}
      </div>

      {/* Deployment Protocol Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-950/40 rounded-[56px] border-2 border-indigo-500/20 p-12 shadow-sm dark:shadow-2xl backdrop-blur-3xl animate-in slide-in-from-top-8 duration-700 relative overflow-hidden group/form">
           <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 blur-[120px] pointer-events-none" />
           
           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 relative z-10">
              {[
                { label: 'TARGET_HANDLE', key: 'name', placeholder: 'SW-CORE-JKT01', type: 'text' },
                { label: 'NETWORK_HOST_IP', key: 'host', placeholder: '10.255.0.1', type: 'text' },
                { label: 'SERVICE_PORT', key: 'port', placeholder: '80 (OPT)', type: 'text' }
              ].map(f => (
                <div key={f.key} className="space-y-4 group/field">
                  <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 group-focus-within/field:text-indigo-500 transition-colors uppercase tracking-[0.4em] px-4 italic font-mono">{f.label}</label>
                  <input 
                    type={f.type}
                    value={(form as any)[f.key]}
                    onChange={(e) => setForm({ ...form, [f.key]: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[28px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold italic shadow-inner" 
                    placeholder={f.placeholder} 
                  />
                </div>
              ))}
              <div className="space-y-4">
                 <label className="block text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] px-4 italic font-mono">CHECK_PROTOCOL</label>
                 <select 
                   className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[28px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all font-black uppercase text-[10px] tracking-widest cursor-pointer appearance-none shadow-inner" 
                   value={form.checkType} 
                   onChange={(e) => setForm({ ...form, checkType: e.target.value })}
                 >
                   {['PING', 'TCP', 'HTTP', 'HTTPS'].map((t) => <option key={t} value={t}>{t}</option>)}
                 </select>
              </div>
           </div>

           <div className="flex flex-col md:flex-row justify-between items-center gap-8 mt-12 pt-10 border-t-2 border-dashed border-slate-100 dark:border-white/5">
              <div className="flex items-center gap-4 text-slate-400 dark:text-slate-600">
                 <Info className="w-5 h-5 text-indigo-500" />
                 <p className="text-[10px] font-black uppercase tracking-widest italic leading-relaxed max-w-sm">Initialization of a monitor probe will trigger a high-velocity ping sequence to verify nodal connectivity.</p>
              </div>
              <div className="flex gap-4">
                 <button onClick={handleCreate} className="px-12 py-5 bg-indigo-600 hover:bg-white hover:text-indigo-600 border-2 border-transparent hover:border-indigo-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl shadow-indigo-600/30 flex items-center gap-4">
                    <Activity className="w-5 h-5" /> INITIALIZE_LOGIC_PROBE
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Target Health Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {targets.map((t) => (
          <div key={t.id} className={`group bg-white dark:bg-slate-950/40 rounded-[56px] border-2 p-10 transition-all duration-700 hover:scale-[1.02] hover:shadow-2xl hover:border-indigo-500/30 backdrop-blur-3xl relative overflow-hidden ${
            t.status === 'UP' ? 'border-emerald-500/20 dark:border-emerald-500/10' : 
            t.status === 'DOWN' ? 'border-rose-500/20 dark:border-rose-500/10' : 
            'border-amber-500/20 dark:border-amber-500/10'
          }`}>
            <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-40 transition-opacity">
               <Radio className="w-32 h-32 text-indigo-500" />
            </div>

            <div className="flex items-start justify-between relative z-10 mb-10">
              <div className="flex items-center gap-6">
                <div className={`w-16 h-16 rounded-[28px] flex items-center justify-center border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-inner ${
                  t.status === 'UP' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-500 border-emerald-100 dark:border-emerald-500/20' : 
                  t.status === 'DOWN' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-500 border-rose-100 dark:border-rose-500/20' : 
                  'bg-amber-50 dark:bg-amber-500/10 text-amber-500 border-amber-100 dark:border-amber-500/20'
                }`}>
                  {statusIcon(t.status)}
                </div>
                <div>
                  <h3 className="font-black text-slate-900 dark:text-white text-xl tracking-tighter truncate max-w-[180px] uppercase italic leading-none">{t.name}</h3>
                  <div className="flex items-center gap-3 mt-3 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-inner">
                    <Globe className="w-3.5 h-3.5 text-indigo-500" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-500 font-bold tracking-widest truncate uppercase font-mono">{t.host}{t.port ? `:${t.port}` : ''}</p>
                  </div>
                </div>
              </div>
              <button 
                onClick={() => handleDelete(t.id)} 
                className="p-4 bg-white dark:bg-slate-950 text-slate-200 dark:text-slate-800 hover:text-rose-600 hover:border-rose-500/50 transition-all active:scale-95 shadow-sm border border-slate-100 dark:border-slate-800 rounded-2xl"
              >
                <Trash2 className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-3 gap-6 mb-10 border-y border-slate-100 dark:border-white/5 py-8 relative z-10">
              {[
                { label: 'NODAL_STATUS', value: t.status, color: t.status === 'UP' ? 'text-emerald-500' : t.status === 'DOWN' ? 'text-rose-500' : 'text-amber-500' },
                { label: 'AVAILABILITY', value: `${(t.uptimePercent ?? 0).toFixed(1)}%`, color: 'text-slate-900 dark:text-white' },
                { label: 'METRIC_PROTO', value: t.checkType, color: 'text-indigo-500' }
              ].map((m, i) => (
                <div key={i} className="text-center group/metric transition-all hover:scale-110">
                   <p className="text-[9px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mb-2 font-mono italic">{m.label}</p>
                   <span className={`text-[13px] font-black italic uppercase tracking-tighter ${m.color}`}>{m.value}</span>
                </div>
              ))}
            </div>

            <div className="space-y-4 relative z-10">
               <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic group/row">
                  <span className="text-slate-400 dark:text-slate-600 flex items-center gap-2 group-hover/row:text-indigo-500 transition-colors"><Clock className="w-4 h-4" /> HANDSHAKE_FIX</span>
                  <span className="text-slate-900 dark:text-slate-300 font-mono">{t.lastCheckAt ? new Date(t.lastCheckAt).toLocaleTimeString() : 'SIGNAL_LOST'}</span>
               </div>
               {t.checks?.[0]?.responseMs ? (
                 <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic group/row">
                    <span className="text-slate-400 dark:text-slate-600 flex items-center gap-2 group-hover/row:text-indigo-500 transition-colors"><Zap className="w-4 h-4" /> LATENCY_DELTA</span>
                    <div className="flex items-center gap-2">
                       <span className="text-indigo-600 dark:text-indigo-500 font-black tracking-widest text-[13px]">{Math.round(t.checks[0].responseMs)}MS</span>
                    </div>
                 </div>
               ) : (
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest italic grayscale opacity-30">
                   <span className="flex items-center gap-2"><Zap className="w-4 h-4" /> LATENCY_DELTA</span>
                   <span className="font-black text-slate-400">OFFSET_VOID</span>
                </div>
               )}
            </div>

            {/* Persistence Waveform Animation */}
            <div className="absolute bottom-0 left-0 right-0 h-1.5 overflow-hidden">
               <div className={`absolute inset-0 bg-gradient-to-r ${
                 t.status === 'UP' ? 'from-emerald-500/0 via-emerald-500/40 to-emerald-500/0' : 
                 t.status === 'DOWN' ? 'from-rose-500/0 via-rose-500/40 to-rose-500/0' : 
                 'from-amber-500/0 via-amber-500/40 to-amber-500/0'
               } animate-[shimmer_2s_infinite]`} style={{ backgroundSize: '200% 100%' }} />
            </div>
          </div>
        ))}

        {targets.length === 0 && (
          <div className="col-span-full py-48 text-center bg-white dark:bg-slate-950/20 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-20 grayscale shadow-inner">
             <HardDrive className="w-24 h-24 text-slate-300 dark:text-slate-700 mx-auto mb-8 animate-pulse" />
             <p className="text-[12px] font-black uppercase tracking-[0.8em] text-slate-400 dark:text-slate-600 italic">No Operational Nodes Est.</p>
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
               <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-2 italic">Availability Strategy</h4>
               <p className="text-base font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">Global Health Matrices Synchronized</p>
            </div>
         </div>
         <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[28px] flex items-center gap-4">
            <Info className="w-5 h-5 text-indigo-500" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic max-w-sm line-clamp-2">Telemetry monitoring engineering ensures 100% precision in infrastructure health tracking across all nodal segments.</span>
         </div>
      </div>
    </div>
  );
}
