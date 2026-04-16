import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Shield, 
  ShieldAlert, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Layers, 
  Info, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  X,
  Lock,
  MessageSquare,
  Ban,
  Slash,
  Eye,
  Settings,
  AlertTriangle,
  Flame,
  UserPlus
} from 'lucide-react';
import { toast } from '../components/Toast';

const FEATURES: { key: string; label: string; description: string; icon: any }[] = [
  { key: 'SPAM_DETECTION', label: 'Spam Interceptor', description: 'Automated detection and expungement of repetitive neural noise', icon: Flame },
  { key: 'PROFANITY_FILTER', label: 'Profanity Shield', description: 'Real-time prevention of non-compliant linguistic patterns', icon: Slash },
  { key: 'LINK_FILTER', label: 'Signal Filter (Links)', description: 'Restrict unauthorized external redirection signals', icon: Lock },
  { key: 'CAPS_DETECTION', label: 'Volume Control', description: 'Warning protocols for excessive emphasis and high-gain messages', icon: AlertTriangle },
  { key: 'INVITE_FILTER', label: 'Network Isolation', description: 'Block unauthorized neural network invitations', icon: Ban },
  { key: 'MEDIA_FILTER', label: 'Payload Filter (Media)', description: 'Restrict non-essential binary payload transmission', icon: Eye },
  { key: 'NEW_MEMBER_RESTRICT', label: 'Ingest Quarantine', description: 'Temporary restriction protocol for freshly ingested nodes', icon: UserPlus },
];

const ACTIONS = [
  { value: 'WARN', label: 'Protocol Warning', color: 'text-sky-500' },
  { value: 'BLOCK', label: 'Signal Block', color: 'text-amber-500' },
  { value: 'MUTE', label: 'Silence Node', color: 'text-orange-500' },
  { value: 'BAN', label: 'Purge Entity', color: 'text-rose-500' },
];

interface ModConfig {
  id?: string;
  feature: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  action: string;
  message: string;
}

export default function AutoModeration() {
  const [configs, setConfigs] = useState<ModConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAction, setEditAction] = useState('WARN');
  const [editMessage, setEditMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getAutoModeration();
      setConfigs(res.data as unknown as ModConfig[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getConfig = (feature: string): ModConfig | undefined => configs.find(c => c.feature === feature);

  const handleToggle = async (feature: string) => {
    const existing = getConfig(feature);
    const newStatus = !existing?.isEnabled;
    try {
      await api.updateAutoModeration(feature, { isEnabled: newStatus, action: existing?.action || 'WARN', message: existing?.message || '' });
      toast({ type: 'info', title: newStatus ? 'PROTOCOL_ENGAGED' : 'PROTOCOL_SHUTDOWN', message: `Feature ${feature} status recalibrated.` });
      load();
    } catch {
       toast({ type: 'error', title: 'TOGGLE_FAILURE', message: 'Failed to recalibrate guardian subsystem.' });
    }
  };

  const handleEdit = (feature: string) => {
    const existing = getConfig(feature);
    setEditing(feature);
    setEditAction(existing?.action || 'WARN');
    setEditMessage(existing?.message || '');
  };

  const handleSave = async () => {
    if (!editing) return;
    try {
      await api.updateAutoModeration(editing, { action: editAction, message: editMessage });
      setEditing(null);
      toast({ type: 'success', title: 'LOGIC_COMMITTED', message: 'Guardian parameters updated.' });
      load();
    } catch {
      toast({ type: 'error', title: 'UPDATE_FAILURE', message: 'Failed to update neural parameters.' });
    }
  };

  const enabledCount = configs.filter(c => c.isEnabled).length;

  if (loading && configs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Engaging Guardian Array...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-5 h-5 text-emerald-500 dark:text-emerald-400" />
            <span className="text-emerald-600 dark:text-emerald-400 text-[10px] font-black uppercase tracking-[0.3em]">Guardian Protocol Matrix</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-emerald-600/30 underline-offset-[12px] decoration-4">Auto-Moderation</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Program AI-driven defensive layers, neural signal filtering, and automated cluster safety.</p>
        </div>

        <div className="flex items-center gap-4">
          <div className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-sm dark:shadow-none transition-all flex flex-col items-center min-w-[140px] group">
            <p className="text-3xl font-black text-emerald-600 dark:text-emerald-500 italic tracking-tighter group-hover:scale-110 transition-transform">{enabledCount}</p>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Protocols Active</p>
          </div>
          <div className="px-8 py-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[28px] shadow-sm dark:shadow-none transition-all flex flex-col items-center min-w-[140px]">
            <p className="text-3xl font-black text-slate-300 dark:text-slate-800 italic tracking-tighter">{FEATURES.length - enabledCount}</p>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mt-1">Standby Array</p>
          </div>
        </div>
      </div>

      {/* Feature Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
        {FEATURES.map(f => {
          const config = getConfig(f.key);
          const isEnabled = config?.isEnabled ?? false;
          const isEditing = editing === f.key;
          const Icon = f.icon;

          return (
            <div key={f.key} className={`group relative bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 p-8 rounded-[48px] transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-2xl ${isEnabled ? 'ring-1 ring-emerald-500/20 bg-emerald-50/5 dark:bg-emerald-500/5' : ''}`}>
               {/* Activity Bar */}
               <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all ${isEnabled ? 'bg-emerald-500 shadow-[2px_0_15px_rgba(16,185,129,0.5)]' : 'bg-transparent group-hover:bg-slate-200 dark:group-hover:bg-slate-800'}`} />
               
               <div className="space-y-6 relative z-10">
                  <div className="flex items-start justify-between">
                     <div className="flex items-center gap-6">
                        <div className={`p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-inner transition-all ${isEnabled ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 'bg-slate-50 dark:bg-slate-900 text-slate-300 dark:text-slate-700'}`}>
                           <Icon className={`w-8 h-8 ${isEnabled ? 'animate-pulse' : ''}`} />
                        </div>
                        <div>
                           <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight group-hover:text-emerald-500 transition-colors uppercase">{f.label}</h3>
                           <p className="text-xs font-bold text-slate-400 dark:text-slate-500 mt-1 max-w-[280px]">"{f.description}"</p>
                        </div>
                     </div>

                     <button onClick={() => handleToggle(f.key)}
                        className={`relative w-16 h-8 rounded-full transition-all flex items-center shadow-inner ${isEnabled ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'}`}>
                        <div className={`absolute w-6 h-6 bg-white rounded-full transition-all shadow-md ${isEnabled ? 'left-9' : 'left-1'}`} />
                     </button>
                  </div>

                  {isEnabled && !isEditing && (
                    <div className="animate-in slide-in-from-top-4 duration-500 pt-4 border-t border-slate-100 dark:border-slate-800/50 flex items-center justify-between">
                       <div className="flex flex-wrap items-center gap-3">
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${config?.action === 'BAN' ? 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20' : 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-100 dark:border-indigo-500/20'}`}>
                             Enforce: {ACTIONS.find(a => a.value === config?.action)?.label || 'Protocol Warning'}
                          </span>
                          {config?.message && (
                            <div className="flex items-center gap-2 text-[10px] font-black text-slate-400 dark:text-slate-600 italic uppercase">
                               <MessageSquare className="w-3.5 h-3.5" /> 
                               <span className="truncate max-w-[120px]">{config.message}</span>
                            </div>
                          )}
                       </div>
                       
                       <button onClick={() => handleEdit(f.key)} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-indigo-500 hover:border-indigo-500/20 rounded-xl transition-all shadow-xl active:scale-95">
                          <Settings className="w-4 h-4" />
                       </button>
                    </div>
                  )}

                  {isEditing && (
                    <div className="animate-in zoom-in-95 duration-500 mt-6 space-y-6 p-8 bg-slate-50 dark:bg-slate-950/50 rounded-[32px] border border-slate-100 dark:border-slate-800 shadow-inner relative overflow-hidden">
                       <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                          <Settings className="w-24 h-24 rotate-12" />
                       </div>
                       
                       <div className="relative z-10 space-y-4">
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Tactical Action</label>
                             <select className="w-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer" value={editAction} onChange={e => setEditAction(e.target.value)}>
                               {ACTIONS.map(a => (
                                 <option key={a.value} value={a.value}>{a.label}</option>
                               ))}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Automated Warning Signal</label>
                             <input className="w-full bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-3 text-xs font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500 transition-all" placeholder="Enter dispatch content..." value={editMessage} onChange={e => setEditMessage(e.target.value)} />
                          </div>
                          <div className="flex gap-4 justify-end pt-2">
                             <button onClick={() => setEditing(null)} className="px-6 py-3 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
                             <button onClick={handleSave} className="px-10 py-3 bg-indigo-600 text-white rounded-[16px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">Commit Logic</button>
                          </div>
                       </div>
                    </div>
                  )}
               </div>
            </div>
          );
        })}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-emerald-500/10 rounded-2xl border border-emerald-500/20 text-emerald-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Defense Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Multi-Layer Neural Defense Array Engaged</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Guardian protocols are optimized for minimal latency and high accuracy.</span>
         </div>
      </div>
    </div>
  );
}
