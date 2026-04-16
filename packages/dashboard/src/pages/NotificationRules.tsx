import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  BellRing, 
  Plus, 
  Trash2, 
  Edit, 
  Power, 
  PowerOff, 
  X, 
  Zap, 
  Activity, 
  RotateCcw, 
  Layers, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  Mail,
  Send,
  AppWindow
} from 'lucide-react';
import { toast } from '../components/Toast';

const EVENTS = ['ticket.created','ticket.updated','ticket.resolved','ticket.escalated','message.received','payment.received','campaign.completed','sla.breached','agent.offline','system.error'];
const CHANNELS = ['DASHBOARD','EMAIL','TELEGRAM','WHATSAPP','WEBHOOK'];

const CHANNEL_ICONS: Record<string, any> = {
  DASHBOARD: AppWindow,
  EMAIL: Mail,
  TELEGRAM: Send,
  WHATSAPP: MessageSquare,
  WEBHOOK: Zap,
};

import { MessageSquare } from 'lucide-react';

export default function NotificationRules() {
  const [rules, setRules] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', description: '', triggerEvent: 'ticket.created', channels: ['DASHBOARD'] as string[], isActive: true });

  const load = async () => { setLoading(true); try { const r = await api.getNotificationRules(); setRules(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    try {
      if (editing) { await api.updateNotificationRule(editing.id, form); } else { await api.createNotificationRule(form); }
      setShowForm(false); 
      setEditing(null); 
      setForm({ name: '', description: '', triggerEvent: 'ticket.created', channels: ['DASHBOARD'], isActive: true }); 
      toast({ type: 'success', title: 'RULE_MANIFESTED', message: 'Notification protocol synchronized.' });
      load();
    } catch {
      toast({ type: 'error', title: 'SYNC_FAILURE', message: 'Failed to establish protocol.' });
    }
  };

  const toggle = async (r: Record<string, any>) => { 
    try {
      await api.updateNotificationRule(r.id, { isActive: !r.isActive }); 
      toast({ type: 'info', title: r.isActive ? 'RULE_DEACTIVATED' : 'RULE_ACTIVATED', message: `Protocol ${r.name} status updated.` });
      load(); 
    } catch {}
  };

  const remove = async (id: string) => { 
    if (!confirm('Purge this notification protocol?')) return;
    try {
      await api.deleteNotificationRule(id); 
      toast({ type: 'info', title: 'RULE_PURGED', message: 'Protocol removed from registry.' });
      load(); 
    } catch {}
  };

  const toggleChannel = (ch: string) => {
    setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Scanning Neural Gateways...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <BellRing className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Neural Trigger Protocols</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Notification Rules</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Program event-driven alerts, multi-channel routing, and conditional system signaling.</p>
        </div>

        <button 
           onClick={() => { setEditing(null); setForm({ name: '', description: '', triggerEvent: 'ticket.created', channels: ['DASHBOARD'], isActive: true }); setShowForm(true); }} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          <Plus className="w-4 h-4" /> Manifest New Rule
        </button>
      </div>

      {/* Construction Chamber (Form) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{editing ? 'Reprogram Protocol' : 'Manifest Notification Rule'}</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Protocol Name *</label>
                  <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="e.g. TICKET_ESCALATION_SIGNAL" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-800" />
               </div>
               <div className="space-y-2">
                  <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Trigger Event Hub</label>
                  <select value={form.triggerEvent} onChange={e => setForm({...form, triggerEvent: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-inner outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                     {EVENTS.map(e => <option key={e} value={e}>{e.replace('.', ' :: ').toUpperCase()}</option>)}
                  </select>
               </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Functional Logic (Description)</label>
               <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Define the operational context for this alert..." rows={2} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[28px] p-6 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 italic" />
            </div>

            <div className="space-y-4 pt-2">
               <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] ml-2">Output Channel Routing:</p>
               <div className="flex flex-wrap gap-3">
                  {CHANNELS.map(ch => {
                    const Icon = CHANNEL_ICONS[ch] || Zap;
                    const isActive = form.channels.includes(ch);
                    return (
                      <button 
                        key={ch} 
                        onClick={() => toggleChannel(ch)} 
                        className={`flex items-center gap-3 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest border transition-all shadow-sm ${isActive ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-600/20' : 'bg-slate-50 dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-500 hover:border-indigo-500/40'}`}
                      >
                         <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-slate-400 dark:text-slate-700'}`} />
                         {ch}
                      </button>
                    );
                  })}
               </div>
            </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
             <button onClick={save} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">
                {editing ? 'Recalibrate Rule' : 'Initialize Protocol'}
             </button>
          </div>
        </div>
      )}

      {/* Rules Registry */}
      <div className="space-y-4">
        {rules.map(r => (
          <div key={r.id} className="group relative bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl">
             <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all ${r.isActive ? 'bg-emerald-500 shadow-[2px_0_15px_rgba(16,185,129,0.5)]' : 'bg-slate-200 dark:bg-slate-800'}`} />
             
             <div className="flex flex-col xl:flex-row xl:items-center gap-8 relative z-10">
                <div className={`p-6 rounded-[32px] border transition-all shadow-inner ${r.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 dark:text-emerald-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700'}`}>
                   <BellRing className={`w-6 h-6 ${r.isActive ? 'animate-pulse' : ''}`} />
                </div>

                <div className="flex-1 space-y-3">
                   <div className="flex flex-wrap items-center gap-3">
                      <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight group-hover:text-indigo-600 transition-colors uppercase">{r.name}</h3>
                      <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${r.isActive ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20' : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700'}`}>
                         {r.isActive ? 'Protocol Active' : 'Offline'}
                      </span>
                      <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest shadow-sm font-mono">
                         {r.triggerEvent}
                      </span>
                   </div>

                   {r.description && <p className="text-sm font-bold text-slate-500 dark:text-slate-500 italic">"{r.description}"</p>}

                   <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                      <div className="flex items-center gap-2">
                         <RotateCcw className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Routing: {Array.isArray(r.channels) ? r.channels.join(', ') : '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                         <Activity className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />
                         <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Trigger Count: {r.triggerCount || 0} hits</span>
                      </div>
                      {r.lastTriggered && (
                         <div className="flex items-center gap-2">
                            <Clock className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />
                            <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">Last Pulse: {new Date(r.lastTriggered).toLocaleString()}</span>
                         </div>
                      )}
                   </div>
                </div>

                <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 origin-right">
                   <button onClick={() => toggle(r)} title={r.isActive ? 'Shutdown Protocol' : 'Engage Protocol'} className={`p-4 rounded-2xl border transition-all shadow-xl active:scale-90 ${r.isActive ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 hover:bg-rose-600 hover:text-white' : 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600 hover:bg-emerald-600 hover:text-white'}`}>
                      {r.isActive ? <PowerOff className="w-5 h-5" /> : <Power className="w-5 h-5" />}
                   </button>
                   <button onClick={() => { setEditing(r); setForm({ name: r.name, description: r.description || '', triggerEvent: r.triggerEvent, channels: r.channels || ['DASHBOARD'], isActive: r.isActive }); setShowForm(true); }} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-indigo-600 hover:border-indigo-500/30 rounded-2xl transition-all shadow-xl active:scale-95">
                      <Edit className="w-5 h-5" />
                   </button>
                   <button onClick={() => remove(r.id)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/20 rounded-2xl transition-all shadow-xl active:scale-95">
                      <Trash2 className="w-5 h-5" />
                   </button>
                </div>
             </div>
          </div>
        ))}

        {rules.length === 0 && (
          <div className="py-24 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50 grayscale">
             <BellRing className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
             <h3 className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Notification Protocols Configured</h3>
          </div>
        )}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <Layers className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Signal Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Multi-Channel Routing Engine Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Active rules are processed by the Neural Trigger system in real-time.</span>
         </div>
      </div>
    </div>
  );
}
