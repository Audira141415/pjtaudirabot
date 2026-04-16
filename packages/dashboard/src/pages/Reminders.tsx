import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Bell, 
  Trash2, 
  Clock, 
  Plus, 
  Loader2, 
  ShieldCheck, 
  MessageSquare,
  AlertTriangle,
  XCircle,
  Activity
} from 'lucide-react';
import { toast } from '../components/Toast';

const TYPE_COLORS: Record<string, string> = {
  SLA_WARNING: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20',
  ESCALATION: 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20',
  TASK_DUE: 'bg-sky-500/10 text-sky-600 dark:text-sky-500 border-sky-500/20',
  SHIFT_CHANGE: 'bg-violet-500/10 text-violet-600 dark:text-violet-500 border-violet-500/20',
  MAINTENANCE: 'bg-slate-500/10 text-slate-600 dark:text-slate-500 border-slate-500/20',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ message: '', remindAt: '', platform: 'WHATSAPP', recurring: '' });

  const load = async () => {
    try { const res = await api.getReminders(); setReminders((res.data as any) ?? []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    if (!confirm('Purge this scheduled signal?')) return;
    try { 
      await api.deleteReminder(id); 
      toast({ type: 'info', title: 'SIGNAL_PURGED', message: 'The scheduled reminder has been deleted.' });
      load(); 
    } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createReminder({
        message: form.message,
        remindAt: form.remindAt,
        platform: form.platform,
        recurring: form.recurring || undefined,
      });
      setForm({ message: '', remindAt: '', platform: 'WHATSAPP', recurring: '' });
      setShowForm(false);
      toast({ type: 'success', title: 'REMINDER_ESTABLISHED', message: 'Mass communal signal scheduled successfully.' });
      load();
    } catch (err) {
      toast({ type: 'error', title: 'SCHEDULING_FAILURE', message: 'Could not establish temporal signal.' });
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date();
  const upcoming = reminders.filter(r => new Date(r.dueAt ?? r.scheduledAt) > now);
  const overdue = reminders.filter(r => new Date(r.dueAt ?? r.scheduledAt) <= now && !r.completed);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Accessing Temporal Registry...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Bell className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Neural Alerts</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Signal Reminders</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Scheduled communal updates, SLA triggers, and system follow-ups.</p>
        </div>

        <button 
           onClick={() => setShowForm(true)} 
           className="flex items-center gap-2 px-10 py-5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-[24px] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" /> Initialize Reminder
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Construct Temporal Signal</h3>
            <button type="button" onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <XCircle className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
             <div>
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest block mb-1 px-2">Communiqué Message *</label>
                <textarea
                  required
                  rows={4}
                  value={form.message}
                  onChange={e => setForm({ ...form, message: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-700 placeholder:italic placeholder:font-normal shadow-inner"
                  placeholder="The signal content to be dispatched..."
                />
             </div>

             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Trigger Date/Time *</label>
                   <input
                     required
                     type="datetime-local"
                     value={form.remindAt}
                     onChange={e => setForm({ ...form, remindAt: e.target.value })}
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs outline-none focus:border-indigo-500 transition-colors font-bold shadow-inner"
                   />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Dispatch Hub</label>
                   <select
                     value={form.platform}
                     onChange={e => setForm({ ...form, platform: e.target.value })}
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none shadow-inner"
                   >
                     <option value="WHATSAPP">WhatsApp Node</option>
                     <option value="TELEGRAM">Telegram Bot</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Cycle Cadence</label>
                   <select
                     value={form.recurring}
                     onChange={e => setForm({ ...form, recurring: e.target.value })}
                     className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-colors cursor-pointer appearance-none shadow-inner"
                   >
                     <option value="">Discrete Signal (None)</option>
                     <option value="daily">Daily Loop</option>
                     <option value="weekly">Weekly Pulse</option>
                   </select>
                </div>
             </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button 
                type="submit" 
                disabled={submitting}
                className="px-12 py-5 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3"
             >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Commit Signal
             </button>
          </div>
        </form>
      )}

      {/* Stats Dash */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'TOTAL SIGNALS', value: reminders.length, color: 'text-indigo-600 dark:text-indigo-400', icon: Bell },
          { label: 'PENDING DISPATCH', value: upcoming.length, color: 'text-sky-600 dark:text-sky-400', icon: Clock },
          { label: 'MISSED FREQUENCY', value: overdue.length, color: 'text-rose-600 dark:text-rose-500', icon: AlertTriangle, urgent: overdue.length > 0 },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] relative overflow-hidden group hover:bg-slate-50 dark:hover:bg-slate-900 hover:border-indigo-500/30 transition-all duration-500 shadow-sm dark:shadow-none">
             <div className={`absolute -right-8 -top-8 w-24 h-24 blur-[40px] opacity-10 ${card.color.replace('text-', 'bg-')}`} />
             <div className="flex items-start justify-between relative z-10">
                <div className={`p-4 rounded-2xl bg-white/5 border border-slate-100 dark:border-white/10 group-hover:scale-110 transition-all shadow-sm ${card.urgent && 'animate-pulse ring-2 ring-rose-500/20'}`}>
                   <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">{card.label}</p>
                   <p className={`text-4xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
                </div>
             </div>
          </div>
        ))}
      </div>

      {/* Logic Stream */}
      <div className="space-y-4">
        {reminders.length === 0 ? (
          <div className="py-32 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50 grayscale">
             <Bell className="w-16 h-16 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
             <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600">Environmental Scans Show Zero Temporal Signs</p>
          </div>
        ) : (
          reminders.map((r) => {
            const due = new Date(r.dueAt ?? r.scheduledAt);
            const isOverdue = due <= now && !r.completed;
            return (
              <div key={r.id} className={`group bg-white dark:bg-slate-950/40 border p-8 rounded-[40px] flex flex-col md:flex-row items-center gap-8 backdrop-blur-3xl hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 relative overflow-hidden shadow-sm dark:shadow-none ${isOverdue ? 'border-rose-500/30 bg-rose-500/5' : 'border-slate-100 dark:border-slate-800 hover:border-indigo-500/30'}`}>
                {isOverdue && <div className="absolute left-0 top-0 bottom-0 w-1.5 bg-rose-600" />}
                
                <div className={`p-5 rounded-[28px] shrink-0 border transition-all shadow-sm ${isOverdue ? 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-600 dark:text-rose-500' : 'bg-slate-50 dark:bg-slate-900 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-600 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 group-hover:border-indigo-500/20'}`}>
                  {isOverdue ? <AlertTriangle className="w-6 h-6 animate-pulse" /> : <Clock className="w-6 h-6" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-3 mb-2">
                    <h3 className={`text-xl font-black italic truncate uppercase tracking-tight transition-colors ${isOverdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400'}`}>{r.title ?? r.message ?? 'UNTITLED_SIGNAL'}</h3>
                    {r.type && (
                       <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${TYPE_COLORS[r.type] || 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700'}`}>
                          {r.type.replace('_', ' ')}
                       </span>
                    )}
                  </div>
                  {r.description && <p className="text-sm text-slate-500 dark:text-slate-500 font-bold mb-3 italic">"{r.description}"</p>}
                  
                  <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                     <div className="flex items-center gap-2">
                        <Activity className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Temporal Point: {due.toLocaleString()}</span>
                     </div>
                     {r.user && (
                       <div className="flex items-center gap-2">
                          <ShieldCheck className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Identity Handle: {r.user.name ?? r.userId}</span>
                       </div>
                     )}
                     <div className="flex items-center gap-2">
                        <MessageSquare className="w-3.5 h-3.5 text-slate-300 dark:text-slate-600" />
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Protocol: {r.platform || 'COMMUNAL'}</span>
                     </div>
                  </div>
                </div>

                <button 
                   onClick={() => remove(r.id)} 
                   className="p-4 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[24px] text-slate-300 dark:text-slate-700 hover:text-rose-600 dark:hover:text-rose-500 hover:border-rose-500/20 transition-all active:scale-90 shadow-sm opacity-0 group-hover:opacity-100"
                >
                   <Trash2 className="w-5 h-5" />
                </button>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
