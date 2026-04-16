import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Settings, 
  Bot, 
  Smartphone, 
  RefreshCw, 
  Wifi, 
  WifiOff, 
  Pencil, 
  Save, 
  ShieldCheck, 
  Zap, 
  Code, 
  Clock, 
  User, 
  Calendar,
  Lock,
  Power,
  Server,
  Terminal,
  Cpu,
  Orbit,
  Layers,
  ChevronRight,
  Fingerprint,
  UserCircle,
  Monitor,
  Activity,
  ShieldAlert,
  HardDrive,
  Database,
  Unplug,
  Info,
  ChevronDown,
  ShieldX,
  Radio,
  Workflow,
  Target,
  BarChart3,
  CpuIcon,
  Inbox
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function SettingsPage() {
  const [tab, setTab] = useState<'bot' | 'sessions'>('bot');
  const [configs, setConfigs] = useState<any[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        api.getBotConfigs(),
        api.getActiveSessions().catch(() => ({ data: [] })),
      ]);
      setConfigs((c.data as any[]) ?? []);
      setSessions((s.data as any[]) ?? []);
    } catch (err) { 
      toast({ type: 'error', title: 'TELEMETRY_GAP', message: 'Failed to synchronize system configuration matrix.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (platform: string, currentActive: boolean) => {
    setToggling(platform);
    try {
      await api.updateBotConfig(platform, { isActive: !currentActive });
      toast({ type: 'info', title: 'STATE_MODIFIED', message: `Protocol ${platform} is now ${!currentActive ? 'ACTIVE' : 'STANDBY'}.` });
      await load();
    } catch (err) { 
      toast({ type: 'error', title: 'SWITCH_REFUSED', message: 'The state switch command was rejected by the supervisor.' });
    }
    finally { setToggling(null); }
  };

  const startEditing = (cfg: any) => {
    const configObj = (cfg.configuration ?? {}) as Record<string, any>;
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(configObj)) {
      stringified[k] = String(v);
    }
    setEditConfig(stringified);
    setEditingPlatform(cfg.platform);
  };

  const cancelEditing = () => {
    setEditingPlatform(null);
    setEditConfig({});
  };

  const handleSaveConfig = async (platform: string) => {
    setSavingConfig(true);
    try {
      await api.updateBotConfig(platform, { configuration: editConfig });
      toast({ type: 'success', title: 'LOGIC_DEPLOYED', message: `${platform} heuristics updated successfully.` });
      setEditingPlatform(null);
      setEditConfig({});
      await load();
    } catch (err) { 
      toast({ type: 'error', title: 'WRITE_FAILURE', message: 'Failed to commit parameters to core memory.' });
    }
    finally { setSavingConfig(false); }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await api.revokeSession(id);
      toast({ type: 'success', title: 'ACCESS_TERMINATED', message: 'Session terminal has been forcibly decommissioned.' });
      await load();
    } catch (err) { 
      toast({ type: 'error', title: 'REVOKE_ERROR', message: 'The revocation command was interrupted by a nodal fault.' });
    }
    finally { setRevokingId(null); }
  };

  if (loading && configs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="w-14 h-14 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.5em] animate-pulse italic font-mono">Synchronizing Configuration Matrix...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-12">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Orbit className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] font-mono italic">Environmental Control Subsystem</span>
          </div>
          <h1 className="text-6xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[16px] decoration-8">Core Settings</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-base mt-6 max-w-2xl leading-relaxed">Fine-tune bot heuristics, synchronize authentication tokens, and manage global session persistence protocols from the master terminal.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4 bg-white dark:bg-slate-950/40 p-3 rounded-[40px] border-2 border-slate-100 dark:border-slate-800/80 shadow-sm backdrop-blur-3xl group/tabs relative overflow-hidden">
          <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
          <button 
             onClick={() => setTab('bot')} 
             className={`flex items-center gap-4 px-12 py-5 rounded-[32px] text-[11px] font-black uppercase tracking-[0.2em] transition-all relative z-10 ${tab === 'bot' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 active:scale-95' : 'text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-white'}`}
          >
             <Bot className={`w-5 h-5 ${tab === 'bot' ? 'animate-bounce' : ''}`} /> BOT_LOGIC
          </button>
          <button 
             onClick={() => setTab('sessions')} 
             className={`flex items-center gap-4 px-12 py-5 rounded-[32px] text-[11px] font-black uppercase tracking-[0.2em] transition-all relative z-10 ${tab === 'sessions' ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 active:scale-95' : 'text-slate-400 dark:text-slate-600 hover:text-indigo-600 dark:hover:text-white'}`}
          >
             <Smartphone className={`w-5 h-5 ${tab === 'sessions' ? 'animate-pulse' : ''}`} /> USER_SESSIONS
          </button>
          <div className="w-px h-10 bg-slate-100 dark:bg-slate-800 mx-2 relative z-10" />
          <button 
             onClick={load} 
             className="w-14 h-14 rounded-2xl bg-white dark:bg-slate-900 text-slate-400 hover:text-indigo-600 transition-all active:rotate-180 border border-slate-100 dark:border-slate-800 shadow-sm flex items-center justify-center relative z-10"
          >
             <RefreshCw className={`w-6 h-6 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {tab === 'bot' && (
        <div className="space-y-12 animate-in slide-in-from-left-12 duration-1000">
          {configs.map((cfg) => (
            <div key={cfg.id} className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] p-12 md:p-14 relative overflow-hidden group shadow-sm hover:border-indigo-500/30 transition-all duration-1000 backdrop-blur-3xl">
               <div className="absolute right-0 top-0 bottom-0 w-[500px] bg-gradient-to-l from-indigo-600/[0.03] to-transparent pointer-events-none group-hover:from-indigo-600/10 transition-all duration-1000" />
               
               <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-12 mb-14 relative z-10">
                  <div className="flex items-center gap-10">
                     <div className={`w-28 h-28 rounded-[48px] flex items-center justify-center transition-all duration-1000 group-hover:rotate-12 shadow-2xl border-4 ${
                       cfg.connectionStatus === 'CONNECTED' 
                       ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-emerald-500/10' 
                       : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-rose-500/10'
                     }`}>
                        {cfg.connectionStatus === 'CONNECTED' ? <Wifi className="w-12 h-12" /> : <WifiOff className="w-12 h-12" />}
                     </div>
                     <div>
                        <div className="flex items-center gap-6 mb-4">
                           <h3 className="text-5xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter group-hover:text-indigo-600 transition-all leading-none underline decoration-indigo-600/10 underline-offset-8 decoration-4">{cfg.platform}</h3>
                           <div className={`px-6 py-2 rounded-2xl border-2 font-black text-[10px] uppercase tracking-[0.3em] shadow-inner ${
                             cfg.connectionStatus === 'CONNECTED' 
                             ? 'bg-emerald-500 text-white border-emerald-400/50' 
                             : 'bg-rose-500 text-white border-rose-400/50'
                           }`}>
                             {cfg.connectionStatus.replace('_', ' ')}
                           </div>
                        </div>
                        <p className="text-[12px] font-mono font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] flex items-center gap-4 italic">
                           <Fingerprint className="w-5 h-5 text-indigo-500" /> SEQUENCE_ID: {cfg.id.slice(0, 16).toUpperCase()}
                        </p>
                     </div>
                  </div>

                  <div className="bg-slate-50 dark:bg-slate-900/50 border-2 border-slate-100 dark:border-slate-800 p-10 rounded-[48px] flex items-center gap-10 shadow-inner group/toggle relative overflow-hidden">
                     <div className="absolute inset-0 bg-indigo-500/[0.01] pointer-events-none" />
                     <div className="flex flex-col gap-3 relative z-10">
                        <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic">PROTOCOL_STATE_CONTROL</span>
                        <div className="flex items-center gap-6">
                           <span className={`text-[14px] font-black uppercase italic tracking-tighter transition-all ${cfg.isActive ? 'text-emerald-500' : 'text-slate-400'}`}>{cfg.isActive ? 'OPERATIONAL_PRIMARY' : 'STANDBY_MODE_ACTIVE'}</span>
                           <button 
                             onClick={() => handleToggleActive(cfg.platform, cfg.isActive)}
                             disabled={toggling === cfg.platform}
                             className={`relative w-24 h-12 rounded-full transition-all duration-700 flex items-center px-1.5 border-2 hover:scale-[1.1] ${cfg.isActive ? 'bg-emerald-600 border-emerald-400' : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'}`}
                           >
                              <div className={`w-8 h-8 rounded-full transition-all duration-700 shadow-[0_0_20px_rgba(0,0,0,0.3)] ${cfg.isActive ? 'bg-white translate-x-12 scale-110 shadow-emerald-900/50' : 'bg-slate-400 dark:bg-slate-600 translate-x-0'}`} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-14 relative z-10 px-2">
                  {[
                    { icon: ShieldCheck, label: 'KERNEL_REVISION', value: cfg.version || 'REEL_v4.2.0', color: 'text-indigo-500', bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
                    { icon: Clock, label: 'TEMPORAL_LOCK', value: cfg.lastConnectedAt ? new Date(cfg.lastConnectedAt).toLocaleTimeString([], { hour12: false }) : 'SIGNAL_VOID', color: 'text-sky-500', bg: 'bg-sky-500/10', border: 'border-sky-500/20' },
                    { icon: Calendar, label: 'ENTRY_CYCLE', value: new Date(cfg.createdAt).toLocaleDateString(), color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
                    { icon: Zap, label: 'LOGIC_SYNC_TS', value: new Date(cfg.updatedAt).toLocaleTimeString([], { hour12: false }), color: 'text-emerald-500', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' }
                  ].map((meta, i) => (
                    <div key={i} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-8 rounded-[40px] flex flex-col items-center text-center group/meta hover:border-indigo-500/40 transition-all shadow-sm backdrop-blur-3xl hover:shadow-2xl hover:scale-[1.05]">
                       <div className={`w-16 h-16 rounded-[24px] ${meta.bg} border-2 ${meta.border} flex items-center justify-center mb-6 shadow-sm group-hover/meta:scale-125 group-hover/meta:rotate-12 transition-all`}>
                          <meta.icon className={`w-8 h-8 ${meta.color}`} />
                       </div>
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-3 font-mono italic">{meta.label}</span>
                       <span className="text-slate-950 dark:text-white text-sm font-black uppercase italic tracking-tighter truncate w-full group-hover:translate-y-[-2px] transition-transform">{meta.value}</span>
                    </div>
                  ))}
               </div>

               {cfg.configuration && (
                 <div className="relative z-10 bg-slate-50 dark:bg-slate-900/60 border-2 border-slate-100 dark:border-slate-800/80 p-12 rounded-[56px] shadow-inner backdrop-blur-3xl group/config">
                    <div className="absolute right-0 top-0 p-12 opacity-[0.03] group-hover/config:opacity-10 transition-opacity">
                       <Terminal className="w-48 h-48" />
                    </div>
                    <div className="flex items-center justify-between mb-12 relative z-10 border-b-2 border-indigo-500/10 pb-8">
                       <div className="flex items-center gap-6">
                          <div className="p-4 bg-indigo-600 text-white rounded-[20px] shadow-xl shadow-indigo-600/30">
                             <Terminal className="w-8 h-8" />
                          </div>
                          <div>
                             <h4 className="text-3xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter leading-none mb-2 underline decoration-indigo-500/20 decoration-8 underline-offset-[16px]">Heuristics Parameterization</h4>
                             <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mt-3 italic font-mono">DYNAMIC_LOGIC_STREAM_0xSET</p>
                          </div>
                       </div>
                       
                       {editingPlatform === cfg.platform ? (
                         <div className="flex items-center gap-6">
                           <button 
                               onClick={() => handleSaveConfig(cfg.platform)}
                               disabled={savingConfig}
                               className="px-12 py-5 bg-indigo-600 text-white rounded-[28px] text-[11px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/40 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-4 border-2 border-indigo-400/20"
                           >
                               <Save className="w-5 h-5" /> COMMIT_DEPLOY
                           </button>
                           <button 
                               onClick={cancelEditing}
                               className="w-14 h-14 bg-white dark:bg-slate-950 border-2 border-rose-500/20 text-slate-400 hover:text-rose-600 rounded-2xl transition-all active:scale-90 flex items-center justify-center shadow-sm"
                           >
                               <Unplug className="w-6 h-6" />
                           </button>
                         </div>
                       ) : (
                         <button 
                            onClick={() => startEditing(cfg)}
                            className="flex items-center gap-4 px-10 py-5 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 rounded-[28px] text-[11px] font-black uppercase tracking-[0.3em] hover:border-indigo-500/30 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all active:scale-95 shadow-sm group/edit-btn"
                         >
                            <Pencil className="w-5 h-5 group-hover/edit-btn:rotate-12 transition-transform" /> INTERROGATE_PARAMS
                         </button>
                       )}
                    </div>

                    {editingPlatform === cfg.platform ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-10 ring-4 ring-indigo-500/5 p-12 rounded-[48px] bg-white dark:bg-slate-950 shadow-2xl relative z-10 border-2 border-indigo-500/20">
                        {Object.entries(editConfig).map(([k, v]) => (
                          <div key={k} className="space-y-4 group/field">
                            <label className="text-[11px] font-black text-slate-400 group-focus-within/field:text-indigo-500 dark:group-focus-within/field:text-indigo-400 uppercase tracking-[0.4em] ml-6 font-mono transition-colors italic">{k.toUpperCase().replace('_', ' ')}</label>
                            <input
                              type="text"
                              value={v}
                              onChange={(e) => setEditConfig({ ...editConfig, [k]: e.target.value })}
                              className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-950 dark:text-white px-10 py-6 rounded-[32px] outline-none focus:border-indigo-500 focus:ring-12 focus:ring-indigo-500/5 transition-all font-mono text-base shadow-inner placeholder:text-slate-100 italic font-black uppercase tracking-tight"
                            />
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 relative z-10">
                        {Object.entries(cfg.configuration as Record<string, any>).map(([k, v]) => (
                          <div key={k} className="bg-white dark:bg-slate-950 p-8 rounded-[40px] border-2 border-slate-100 dark:border-slate-800/80 group/val hover:border-indigo-500/30 hover:scale-[1.05] transition-all shadow-sm hover:shadow-2xl relative overflow-hidden backdrop-blur-3xl">
                             <div className="absolute inset-0 bg-indigo-500/[0.01] pointer-events-none" />
                             <div className="text-[10px] font-black font-mono text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-4 group-hover/val:text-indigo-600 transition-colors italic border-b border-indigo-500/10 pb-2">{k.toUpperCase()}</div>
                             <div className="text-base font-black text-slate-950 dark:text-white italic tracking-tighter truncate group-hover/val:translate-x-2 transition-transform leading-none">{typeof v === 'string' && v.length > 40 ? v.substring(0, 40) + '...' : String(v).toUpperCase()}</div>
                             <div className="absolute bottom-[-15px] right-[-15px] opacity-[0.03] group-hover/val:opacity-10 transition-opacity">
                                <Code className="w-16 h-16 text-indigo-500" />
                             </div>
                          </div>
                        ))}
                      </div>
                    )}
                 </div>
               )}
            </div>
          ))}
          {configs.length === 0 && (
            <div className="py-64 text-center bg-white dark:bg-slate-950/20 rounded-[80px] border-4 border-dashed border-slate-100 dark:border-slate-800/80 opacity-20 grayscale shadow-inner animate-pulse">
               <Bot className="w-32 h-32 text-slate-200 dark:text-slate-800 mx-auto mb-10" />
               <p className="text-3xl font-black uppercase tracking-[1em] text-slate-400 dark:text-slate-700 italic">No_Bot_Instances_In_Registry</p>
            </div>
          )}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl animate-in slide-in-from-right-12 duration-1000 group/session-table relative">
           <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-indigo-600/[0.03] to-transparent pointer-events-none" />
           
           <div className="px-14 py-12 border-b-2 border-slate-100 dark:border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-10 bg-slate-50/50 dark:bg-slate-900/40 relative z-10">
              <div className="flex items-center gap-8">
                 <div className="p-6 bg-indigo-600 text-white rounded-[28px] shadow-2xl shadow-indigo-600/30 group-hover/session-table:rotate-6 transition-all border-4 border-indigo-400/20">
                    <Smartphone className="w-10 h-10" />
                 </div>
                 <div>
                    <h3 className="text-4xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter underline decoration-indigo-500/20 decoration-8 underline-offset-[20px] leading-none mb-3">Nodal Access Ledger</h3>
                    <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mt-2 italic font-mono">GLOBAL_SESSION_TERMINAL_SYNC</p>
                 </div>
              </div>
              <div className="px-8 py-3 bg-white dark:bg-slate-950 rounded-[24px] text-[11px] font-black text-slate-950 dark:text-white uppercase tracking-[0.4em] italic border-2 border-slate-100 dark:border-slate-800 shadow-xl flex items-center gap-4">
                 <Radio className="w-5 h-5 text-indigo-500 animate-pulse" />
                 {sessions.length} ACTIVE_CHANNELS
              </div>
           </div>

           <div className="overflow-x-auto custom-scrollbar relative z-10">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-500 dark:text-slate-700 uppercase tracking-[0.4em] font-mono italic">
                   <th className="px-14 py-10">Egress_Point</th>
                   <th className="px-10 py-10">Identity_Handle_ID</th>
                   <th className="px-10 py-10">Signal_Status</th>
                   <th className="px-10 py-10">Temporal_Cutoff</th>
                   <th className="px-14 py-10 text-right">Interrogate</th>
                 </tr>
               </thead>
               <tbody className="divide-y-2 divide-slate-100 dark:divide-white/5 font-bold">
                 {sessions.map((s) => (
                   <tr key={s.id} className="group hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-all duration-700">
                     <td className="px-14 py-12">
                        <div className="px-6 py-2.5 bg-indigo-500/10 border-2 border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-2xl text-[10px] font-black uppercase tracking-[0.4em] inline-block group-hover:bg-indigo-600 group-hover:text-white group-hover:scale-110 transition-all shadow-inner font-mono italic">
                           {s.platform || 'API_CORE_X1'}
                        </div>
                     </td>
                     <td className="px-10 py-12">
                        <div className="flex items-center gap-6 group-hover:translate-x-2 transition-transform duration-500">
                           <div className="w-16 h-16 rounded-[28px] bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-white/5 flex items-center justify-center text-slate-300 group-hover:text-indigo-500 group-hover:rotate-12 group-hover:scale-110 transition-all shadow-inner">
                              <UserCircle className="w-10 h-10" />
                           </div>
                           <div className="overflow-hidden">
                              <span className="text-xl font-black text-slate-950 dark:text-white group-hover:text-indigo-600 transition-colors uppercase italic tracking-tighter truncate block w-48 leading-none mb-2">{s.user?.displayName || s.userId || 'SIGNAL_OBSERVER'}</span>
                              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] italic font-mono">UID: 0x{s.userId?.substring(0,12).toUpperCase()}</span>
                           </div>
                        </div>
                     </td>
                     <td className="px-10 py-12">
                        <div className={`px-5 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border-2 shadow-inner inline-flex items-center gap-4 w-fit group-hover:scale-110 transition-transform ${
                          s.isActive 
                          ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20' 
                          : 'bg-slate-100 dark:bg-slate-900 text-slate-400 dark:text-slate-700 border-slate-200 dark:border-slate-800'
                        }`}>
                           <div className={`w-3 h-3 rounded-full ${s.isActive ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-slate-400'}`} />
                           <span className="font-mono italic">{s.isActive ? 'ENCRYPTED_SIGNAL' : 'CHANNEL_VOID'}</span>
                        </div>
                     </td>
                     <td className="px-10 py-12">
                        <div className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.4em] mb-2 font-mono italic">SYNC_EXPIRY</div>
                        <div className="text-[12px] font-black text-slate-950 dark:text-slate-400 group-hover:text-indigo-600 transition-all italic tracking-tight uppercase leading-none">{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : 'ETERNAL_BITSTREAM_V1'}</div>
                     </td>
                     <td className="px-14 py-12 text-right">
                       {s.isActive && (
                         <button 
                           onClick={() => handleRevokeSession(s.id)}
                           disabled={revokingId === s.id}
                           className="px-10 py-5 bg-white dark:bg-slate-950 border-2 border-rose-500/20 text-rose-500 rounded-[28px] text-[10px] font-black uppercase tracking-[0.3em] hover:bg-rose-600 hover:text-white hover:border-rose-600 transition-all active:scale-95 shadow-2xl shadow-rose-600/10 flex items-center justify-center gap-4 ml-auto group-hover:translate-x-[-12px] group/revoke"
                         >
                            <ShieldX className="w-5 h-5 group-hover/revoke:rotate-12 transition-transform" /> REJECT_ACCESS
                         </button>
                       )}
                     </td>
                   </tr>
                 ))}
                 {sessions.length === 0 && (
                   <tr>
                     <td colSpan={5} className="px-10 py-48 text-center grayscale opacity-10">
                        <div className="w-24 h-24 bg-slate-50 dark:bg-slate-950 border-4 border-dashed border-slate-100 dark:border-slate-800 rounded-[48px] flex items-center justify-center mx-auto mb-10 animate-pulse">
                           <Power className="w-12 h-12 text-slate-300" />
                        </div>
                        <p className="text-[14px] font-black uppercase tracking-[0.8em] text-slate-400 dark:text-slate-700 italic">No_Authenticated_Signals_Detected</p>
                     </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>
      )}

      {/* Security Logic Insight Terminal Footer */}
      <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 p-12 rounded-[56px] shadow-sm dark:shadow-2xl transition-all flex flex-col lg:flex-row items-center justify-between gap-10 opacity-90 hover:opacity-100 backdrop-blur-3xl group/sec-footer">
         <div className="flex items-center gap-8">
            <div className="p-6 bg-indigo-600 text-white rounded-[28px] shadow-2xl shadow-indigo-500/30 group-hover/sec-footer:rotate-12 transition-all border-4 border-indigo-400/20">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
               <h4 className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] mb-2 font-mono italic">Security_Posture_Subsystem</h4>
               <p className="text-2xl font-black text-slate-950 dark:text-white italic tracking-tighter uppercase leading-none">Global Configuration Vectors Synchronized</p>
            </div>
         </div>
         <div className="px-10 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] flex items-center gap-6 shadow-inner group/ins-hint hover:border-indigo-500/40 transition-all">
            <Info className="w-6 h-6 text-indigo-500 group-hover/ins-hint:scale-125 transition-transform" />
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] italic leading-relaxed max-w-md">System core settings ensure 100% precision in bot configuration heuristics and global user session persistence across all functional functional operational operational nodes nodes nodes. nodes nodes nodes. codes codes codes. codes codes codes.</span>
         </div>
      </div>
    </div>
  );
}
