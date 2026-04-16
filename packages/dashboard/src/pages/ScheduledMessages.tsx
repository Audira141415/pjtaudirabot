import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Calendar, 
  Send, 
  Trash2, 
  Clock, 
  Plus, 
  Search, 
  Filter, 
  Zap, 
  RotateCcw, 
  BellRing, 
  Activity, 
  MessageSquare,
  ShieldCheck,
  X,
  Loader2,
  ChevronRight,
  CheckCircle2
} from 'lucide-react';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20',
  SENT: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
  FAILED: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
  CANCELLED: 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-700',
};

export default function ScheduledMessages() {
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', targetPlatform: '', scheduledAt: '', recurring: false, schedule: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getScheduledMessages(1, statusFilter || undefined);
      setMessages(res.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.title || !form.content || !form.scheduledAt) return;
    try {
      await api.createScheduledMessage({
        title: form.title,
        content: form.content,
        targetPlatform: form.targetPlatform || null,
        scheduledAt: form.scheduledAt,
        recurring: form.recurring,
        schedule: form.recurring ? form.schedule : null,
      });
      setForm({ title: '', content: '', targetPlatform: '', scheduledAt: '', recurring: false, schedule: '' });
      setShowForm(false);
      load();
    } catch { /* empty */ }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Cancel this scheduled dispatch?')) return;
    await api.cancelScheduledMessage(id);
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Purge this message record?')) return;
    await api.deleteScheduledMessage(id);
    load();
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Accessing Temporal Hub...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Calendar className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Temporal Dispatch Queue</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Scheduled Messages</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Automate communiqué streams, recurring system alerts, and future-bound marketing blocks.</p>
        </div>

        <button 
           onClick={() => setShowForm(!showForm)} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? 'Abort Manifest' : 'Schedule Dispatch'}
        </button>
      </div>

      {/* Logic Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         {[
           { label: 'Queued Signals', value: messages.length, icon: MessageSquare, color: 'text-slate-400' },
           { label: 'Pending Dispatches', value: messages.filter(m => m.status === 'PENDING').length, icon: Clock, color: 'text-sky-500' },
           { label: 'Executed Hits', value: messages.filter(m => m.status === 'SENT').length, icon: CheckCircle2, color: 'text-emerald-500' },
         ].map((card, i) => (
           <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all" />
              <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                 <card.icon className="w-3.5 h-3.5" /> {card.label}
              </p>
              <p className={`text-4xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
           </div>
         ))}
      </div>

      {/* Manifestation Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="relative z-10 space-y-6">
             <div className="flex items-center gap-3 mb-4">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Signal Blueprint</h2>
             </div>

             <div className="space-y-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Protocol Title *</label>
                   <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" placeholder="e.g. WEEKLY_PERFORMANCE_SYNC" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Message Payload *</label>
                   <textarea className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 min-h-[140px] leading-relaxed" placeholder="Enter communiqué content..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Temporal Trigger (Date/Time) *</label>
                     <input type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs font-black shadow-inner outline-none focus:border-indigo-500 transition-all" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Output Channel</label>
                     <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-inner outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer" value={form.targetPlatform} onChange={e => setForm({ ...form, targetPlatform: e.target.value })}>
                        <option value="">Omni-Channel (All)</option>
                        <option value="WHATSAPP">WhatsApp Hub</option>
                        <option value="TELEGRAM">Telegram Node</option>
                     </select>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row items-center gap-6 p-6 bg-slate-50 dark:bg-slate-950/50 rounded-3xl border border-slate-100 dark:border-slate-800 shadow-inner">
                   <label className="flex items-center gap-3 cursor-pointer group">
                      <div className={`w-12 h-6 rounded-full relative transition-all ${form.recurring ? 'bg-indigo-600' : 'bg-slate-200 dark:bg-slate-800 shadow-inner'}`}>
                         <input type="checkbox" className="hidden" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} />
                         <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${form.recurring ? 'left-7' : 'left-1'}`} />
                      </div>
                      <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Recurring Cycle</span>
                   </label>
                   
                   {form.recurring && (
                     <div className="flex-1 animate-in slide-in-from-left-4 duration-300">
                        <select className="w-full bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl px-4 py-2 text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 transition-all" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}>
                           <option value="">Set Cadence...</option>
                           <option value="daily">Every 24 Hours</option>
                           <option value="weekly">Every 7 Rotations</option>
                           <option value="monthly">Lunar Cycle (Monthly)</option>
                        </select>
                     </div>
                   )}
                </div>
             </div>

             <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
                <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
                <button onClick={handleCreate} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all flex items-center gap-2">
                   <Plus className="w-4 h-4" /> Commit Dispatch
                </button>
             </div>
          </div>
        </div>
      )}

      {/* Logic Filter Cluster */}
      <div className="flex flex-wrap gap-2 pt-4">
        {['', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'].map(s => (
          <button 
             key={s} 
             onClick={() => setStatusFilter(s)}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' : 'bg-white dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'}`}
          >
            {s || 'Omni-Status'}
          </button>
        ))}
      </div>

      {/* Dispatch Ledger */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
        <div className="divide-y divide-slate-50 dark:divide-slate-800/30">
          {messages.length === 0 ? (
            <div className="py-24 text-center grayscale opacity-20">
               <BellRing className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
               <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Temporal Signals Discovered</p>
            </div>
          ) : (
            messages.map(msg => (
              <div key={msg.id as string} className="p-8 hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 relative group overflow-hidden">
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-indigo-600 transition-all" />
                
                <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 relative z-10">
                  <div className="flex-1 space-y-4">
                    <div className="flex flex-wrap items-center gap-3">
                       <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{msg.title as string}</h3>
                       <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${STATUS_COLORS[msg.status as string] || 'bg-slate-100 text-slate-500 border-slate-200'}`}>
                         {msg.status as string}
                       </span>
                       {!!msg.recurring && <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest flex items-center gap-1.5 shadow-sm"><RotateCcw className="w-3 h-3" /> {msg.schedule as string || 'Recurring Protocol'}</span>}
                       {!!msg.targetPlatform && <span className="px-3 py-1 rounded-lg text-[9px] font-black bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800 uppercase tracking-widest shadow-sm">{msg.targetPlatform as string}</span>}
                    </div>
                    
                    <div className="bg-white/50 dark:bg-slate-900/60 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-950/40 transition-all italic text-sm font-bold text-slate-600 dark:text-slate-400 leading-relaxed">
                       "{msg.content as string}"
                    </div>

                    <div className="flex flex-wrap items-center gap-6 pt-2">
                       <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                          <Activity className="w-3.5 h-3.5" /> Target Time: {new Date(msg.scheduledAt as string).toLocaleString()}
                       </div>
                       {!!msg.sentAt && (
                          <div className="flex items-center gap-2 text-[9px] font-black text-emerald-500 uppercase tracking-widest">
                             <CheckCircle2 className="w-3.5 h-3.5" /> Synchronized: {new Date(msg.sentAt as string).toLocaleString()}
                          </div>
                       )}
                       <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                          <ShieldCheck className="w-3.5 h-3.5" /> <span>Protocol: {(msg.platform as string) || 'COMMUNAL'}</span>
                       </div>
                    </div>
                  </div>

                  <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100 origin-right">
                    {msg.status === 'PENDING' && (
                      <button onClick={() => handleCancel(msg.id as string)} className="px-6 py-2.5 bg-indigo-600/10 dark:bg-indigo-600/20 text-indigo-600 dark:text-indigo-400 border border-indigo-600/30 rounded-xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-indigo-600 hover:text-white transition-all shadow-lg shadow-indigo-600/5">Abort Signal</button>
                    )}
                    <button onClick={() => handleDelete(msg.id as string)} className="p-3 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/20 rounded-xl transition-all shadow-xl active:scale-95">
                       <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
