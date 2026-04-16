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
  Power
} from 'lucide-react';

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
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (platform: string, currentActive: boolean) => {
    setToggling(platform);
    try {
      await api.updateBotConfig(platform, { isActive: !currentActive });
      await load();
    } catch (err) { console.error(err); }
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
      setEditingPlatform(null);
      setEditConfig({});
      await load();
    } catch (err) { console.error(err); }
    finally { setSavingConfig(false); }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await api.revokeSession(id);
      await load();
    } catch (err) { console.error(err); }
    finally { setRevokingId(null); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Accessing Configuration Matrix...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.4em]">Environmental Control</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 dark:text-white tracking-tight uppercase italic mb-1">System Core Settings</h1>
          <p className="text-slate-500 font-medium text-sm">Fine-tune bot heuristics, authentication tokens, and session persistence.</p>
        </div>

        <div className="flex gap-2 bg-white dark:bg-slate-950/50 p-2 rounded-[24px] border border-slate-200 dark:border-slate-800 backdrop-blur-md shadow-sm dark:shadow-none">
          <button 
             onClick={() => setTab('bot')} 
             className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'bot' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-white'}`}
          >
             <Bot className="w-3.5 h-3.5" />
             Logic Config
          </button>
          <button 
             onClick={() => setTab('sessions')} 
             className={`flex items-center gap-2 px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${tab === 'sessions' ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-white'}`}
          >
             <Smartphone className="w-3.5 h-3.5" />
             Active Sessions
          </button>
          <button onClick={load} className="p-3 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-white transition-all active:scale-90 flex items-center justify-center border-l border-slate-200 dark:border-slate-800 ml-2">
             <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {tab === 'bot' && (
        <div className="space-y-8 animate-in slide-in-from-left-6 duration-500">
          {configs.length === 0 && (
            <div className="py-32 text-center bg-slate-900/20 rounded-[48px] border border-dashed border-slate-800 opacity-50">
               <Bot className="w-16 h-16 text-slate-700 mx-auto mb-4" />
               <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">No bot instances defined in matrix</p>
            </div>
          )}
          {configs.map((cfg) => (
            <div key={cfg.id} className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 rounded-[48px] p-8 md:p-10 backdrop-blur-2xl relative overflow-hidden group shadow-sm dark:shadow-none transition-all">
               <div className="absolute right-0 top-0 bottom-0 w-64 bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none group-hover:from-indigo-600/10 transition-all duration-700" />
               
               <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-10 relative z-10">
                  <div className="flex items-center gap-6">
                     <div className={`p-5 rounded-[28px] ${cfg.connectionStatus === 'CONNECTED' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-100 dark:border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)] animate-pulse'}`}>
                        {cfg.connectionStatus === 'CONNECTED' ? <Wifi className="w-8 h-8" /> : <WifiOff className="w-8 h-8" />}
                     </div>
                     <div>
                        <div className="flex items-center gap-3 mb-1">
                           <h3 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{cfg.platform}</h3>
                           <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                             cfg.connectionStatus === 'CONNECTED' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20'
                           }`}>
                             {cfg.connectionStatus}
                           </span>
                        </div>
                        <p className="text-[10px] font-mono text-slate-400 dark:text-slate-600 uppercase tracking-widest">Instance GUID: {cfg.id}</p>
                     </div>
                  </div>

                   <div className="flex items-center gap-6">
                     <div className="flex flex-col items-end gap-1">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Instance State</span>
                        <div className="flex items-center gap-3">
                           <span className={`text-[11px] font-black uppercase ${cfg.isActive ? 'text-emerald-500' : 'text-slate-400 dark:text-slate-500'}`}>{cfg.isActive ? 'Active' : 'Standby'}</span>
                           <button 
                             onClick={() => handleToggleActive(cfg.platform, cfg.isActive)}
                             disabled={toggling === cfg.platform}
                             className={`relative w-14 h-7 rounded-full transition-all duration-500 flex items-center px-1 ${cfg.isActive ? 'bg-emerald-500/20 border border-emerald-500/30' : 'bg-slate-200 dark:bg-slate-800 border border-slate-300 dark:border-slate-700'}`}
                           >
                              <div className={`w-5 h-5 rounded-full transition-all duration-500 shadow-xl ${cfg.isActive ? 'bg-emerald-50 translate-x-7 scale-110 shadow-emerald-500/50' : 'bg-slate-400 dark:bg-slate-600 translate-x-0'}`} />
                           </button>
                        </div>
                     </div>
                  </div>
               </div>

               <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 relative z-10">
                  {[
                    { icon: ShieldCheck, label: 'Version Tag', value: cfg.version || 'ALPHA' },
                    { icon: Clock, label: 'Last Signal', value: cfg.lastConnectedAt ? new Date(cfg.lastConnectedAt).toLocaleTimeString() : 'Never' },
                    { icon: Calendar, label: 'Entry Date', value: new Date(cfg.createdAt).toLocaleDateString() },
                    { icon: Zap, label: 'Update Cycle', value: new Date(cfg.updatedAt).toLocaleTimeString() }
                  ].map((meta, i) => (
                    <div key={i} className="bg-slate-900/40 p-5 rounded-[24px] border border-slate-800/50 flex flex-col items-center text-center group/meta hover:border-slate-600 transition-colors">
                       <meta.icon className="w-4 h-4 text-slate-600 group-hover/meta:text-indigo-400 mb-2 transition-colors" />
                       <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{meta.label}</span>
                       <span className="text-white text-xs font-bold truncate w-full italic uppercase">{meta.value}</span>
                    </div>
                  ))}
               </div>

               {cfg.configuration && (
                 <div className="relative z-10">
                   <div className="flex items-center justify-between mb-4 px-2">
                     <div className="flex items-center gap-3">
                        <Code className="w-4 h-4 text-indigo-500" />
                        <span className="text-[10px] font-black text-slate-950 dark:text-white uppercase tracking-widest italic decoration-indigo-500/50 underline underline-offset-4">Logic Parameters</span>
                     </div>
                     {editingPlatform === cfg.platform ? (
                       <div className="flex items-center gap-2">
                         <button 
                            onClick={() => handleSaveConfig(cfg.platform)}
                            disabled={savingConfig}
                            className="flex items-center gap-2 px-6 py-2 bg-emerald-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-emerald-600/20 active:scale-95"
                         >
                            <Save className="w-3.5 h-3.5" /> Save Changes
                         </button>
                         <button 
                            onClick={cancelEditing}
                            className="flex items-center gap-2 px-6 py-2 bg-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:text-white transition-all active:scale-95"
                         >
                            Discard
                         </button>
                       </div>
                     ) : (
                       <button 
                          onClick={() => startEditing(cfg)}
                          className="flex items-center gap-2 px-6 py-2 bg-slate-900 border border-slate-800 text-slate-400 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-500/50 hover:text-indigo-400 transition-all active:scale-95 shadow-xl"
                       >
                          <Pencil className="w-3.5 h-3.5" /> Edit Heuristics
                       </button>
                     )}
                   </div>

                   {editingPlatform === cfg.platform ? (
                     <div className="bg-slate-50 dark:bg-slate-950/80 p-8 rounded-[32px] border border-indigo-500/20 space-y-4 ring-1 ring-indigo-500/5 dark:ring-indigo-500/20 shadow-inner">
                       {Object.entries(editConfig).map(([k, v]) => (
                         <div key={k} className="flex flex-col sm:flex-row sm:items-center gap-4 group/field">
                           <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 group-hover/field:text-indigo-500 dark:group-hover/field:text-indigo-400 uppercase tracking-widest sm:min-w-[200px] shrink-0 font-mono transition-colors">{k}</label>
                           <input
                             type="text"
                             value={v}
                             onChange={(e) => setEditConfig({ ...editConfig, [k]: e.target.value })}
                             className="flex-1 bg-white dark:bg-slate-900/50 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white px-5 py-3 rounded-2xl outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/5 transition-all font-mono text-sm shadow-sm"
                           />
                         </div>
                       ))}
                     </div>
                   ) : (
                     <div className="bg-slate-50 dark:bg-slate-900/20 p-8 rounded-[32px] border border-slate-200 dark:border-slate-800/40 grid grid-cols-1 md:grid-cols-2 gap-x-12 gap-y-4">
                       {Object.entries(cfg.configuration as Record<string, any>).map(([k, v]) => (
                         <div key={k} className="flex items-center justify-between border-b border-slate-200 dark:border-white/5 pb-2 group/val hover:border-indigo-500/20 transition-colors">
                           <span className="text-[10px] font-mono text-slate-400 dark:text-slate-600 group-hover/val:text-slate-600 dark:group-hover/val:text-slate-400 transition-colors">{k}</span>
                           <span className="text-sm font-mono text-slate-800 dark:text-white italic tracking-tight truncate">{typeof v === 'string' && v.length > 25 ? v.substring(0, 25) + '...' : String(v)}</span>
                         </div>
                       ))}
                     </div>
                   )}
                 </div>
               )}
            </div>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[48px] overflow-hidden backdrop-blur-3xl animate-in slide-in-from-right-6 duration-500 shadow-sm dark:shadow-2xl transition-all">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-200 dark:border-slate-800">
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Matrix</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Identity Handle</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Lock State</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Auth Timeline</th>
                <th className="px-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/40">
              {sessions.map((s) => (
                <tr key={s.id} className="group hover:bg-slate-900 transition-colors">
                  <td className="px-10 py-6">
                    <span className="px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{s.platform || 'N/A'}</span>
                  </td>
                  <td className="px-8 py-6">
                     <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-400 group-hover:text-white transition-all">
                           <User className="w-4 h-4" />
                        </div>
                        <span className="text-sm font-black text-slate-300 group-hover:text-white transition-colors">{s.user?.displayName || s.userId || 'Signal Observer'}</span>
                     </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${
                      s.isActive ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'
                    }`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${s.isActive ? 'bg-emerald-500 animate-pulse' : 'bg-slate-600'}`} />
                      {s.isActive ? 'Active Security' : 'Session Revoked'}
                    </span>
                  </td>
                  <td className="px-8 py-6">
                     <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-0.5">Expires At</div>
                     <div className="text-xs font-mono text-slate-400 group-hover:text-white transition-colors">{s.expiresAt ? new Date(s.expiresAt).toLocaleString() : 'Eternal Session'}</div>
                  </td>
                  <td className="px-10 py-6 text-right">
                    {s.isActive && (
                      <button 
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={revokingId === s.id}
                        className="px-6 py-2.5 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all active:scale-90 shadow-xl shadow-rose-600/5 flex items-center justify-center gap-2 ml-auto"
                      >
                         <Lock className="w-3.5 h-3.5" />
                         Revoke Access
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-10 py-20 text-center grayscale opacity-30">
                     <Power className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                     <p className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em]">No authenticated observers found</p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
