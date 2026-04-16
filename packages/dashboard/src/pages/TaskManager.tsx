import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ListTodo, 
  CheckCircle2, 
  Circle, 
  Clock, 
  AlertCircle, 
  Plus, 
  Trash2, 
  Loader2, 
  X, 
  ChevronRight, 
  Activity, 
  ShieldCheck, 
  Calendar, 
  Tag, 
  Layers 
} from 'lucide-react';

const STATUS_CONF: Record<string, { color: string; icon: JSX.Element; ghost: string }> = {
  PENDING: { 
    color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700', 
    icon: <Circle className="w-4 h-4" />,
    ghost: 'text-slate-400 dark:text-slate-600'
  },
  IN_PROGRESS: { 
    color: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20', 
    icon: <Clock className="w-4 h-4" />,
    ghost: 'text-sky-400 dark:text-sky-600'
  },
  COMPLETED: { 
    color: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20', 
    icon: <CheckCircle2 className="w-4 h-4" />,
    ghost: 'text-emerald-400 dark:text-emerald-600'
  },
  OVERDUE: { 
    color: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20', 
    icon: <AlertCircle className="w-4 h-4" />,
    ghost: 'text-rose-400 dark:text-rose-600'
  },
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-rose-500 text-white shadow-lg shadow-rose-500/30',
  HIGH: 'bg-amber-500 text-white shadow-lg shadow-amber-500/30',
  MEDIUM: 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/30',
  LOW: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400',
};

const EMPTY_FORM = { title: '', description: '', priority: 'MEDIUM', category: '', dueDate: '' };

export default function TaskManagerPage() {
  const [tasks, setTasks] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const load = async () => {
    try {
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      const res = await api.getTasks(1, Object.keys(filters).length ? filters : undefined);
      setTasks((res.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateTask(id, { status });
      load();
    } catch (err) { console.error(err); }
  };

  const handleCreate = async () => {
    if (!form.title.trim()) return;
    setCreating(true);
    try {
      await api.createTask({
        title: form.title.trim(),
        description: form.description.trim() || undefined,
        priority: form.priority,
        category: form.category.trim() || undefined,
        dueDate: form.dueDate || undefined,
      });
      setForm({ ...EMPTY_FORM });
      setShowCreate(false);
      load();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Purge this operational task?')) return;
    try {
      await api.deleteTask(id);
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Accessing Task Registry...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ListTodo className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Operational Orchestrator</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Task Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Assign objectives, monitor progress, and enforce temporal compliance across the fleet.</p>
        </div>

        <button 
           onClick={() => setShowCreate(!showCreate)} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          {showCreate ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showCreate ? 'Abort Manifest' : 'Manifest Objective'}
        </button>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {[
          { label: 'Total Scoped', value: tasks.length, color: 'text-slate-400', icon: Layers },
          { label: 'In Progress', value: tasks.filter(t => t.status === 'IN_PROGRESS').length, color: 'text-sky-500', icon: Clock },
          { label: 'Completed', value: tasks.filter(t => t.status === 'COMPLETED').length, color: 'text-emerald-500', icon: CheckCircle2 },
          { label: 'Overdue Bound', value: tasks.filter(t => t.status === 'OVERDUE').length, color: 'text-rose-500', icon: AlertCircle },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-6 rounded-[32px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-100 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all" />
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
                <card.icon className="w-3 h-3" /> {card.label}
             </p>
             <p className={`text-3xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Manifestation Form */}
      {showCreate && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="relative z-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Objective Title *</label>
                 <input placeholder="Enter task title..." value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-800" />
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Objective Category</label>
                 <input placeholder="e.g. MAINTENANCE / AUDIT" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all font-bold placeholder:text-slate-300 dark:placeholder:text-slate-800" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Priority Level</label>
                 <select value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest shadow-inner outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer">
                    <option value="CRITICAL">Critical Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="MEDIUM">Medium Priority</option>
                    <option value="LOW">Low Priority</option>
                 </select>
              </div>
              <div className="space-y-2">
                 <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Temporal Bound (Due Date)</label>
                 <input type="date" value={form.dueDate} onChange={e => setForm({ ...form, dueDate: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs font-black shadow-inner outline-none focus:border-indigo-500 transition-all" />
              </div>
            </div>

            <div className="space-y-2">
               <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Objective Quantifier (Description)</label>
               <textarea placeholder="Describe the mission parameters..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={3} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 leading-relaxed" />
            </div>

            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
               <button onClick={() => setShowCreate(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
               <button onClick={handleCreate} disabled={creating || !form.title.trim()} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all flex items-center gap-2">
                  {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} Manifest Task
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Logic Filter Cluster */}
      <div className="flex flex-wrap gap-4 pt-4">
        <div className="flex bg-white dark:bg-slate-950/50 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm">
           {['', 'PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'].map(s => (
              <button 
                 key={s} 
                 onClick={() => setStatusFilter(s)}
                 className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${statusFilter === s ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600'}`}
              >
                 {s || 'Omni-Status'}
              </button>
           ))}
        </div>
        
        <div className="flex bg-white dark:bg-slate-950/50 p-1.5 rounded-[20px] border border-slate-200 dark:border-slate-800 shadow-sm">
           {['', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map(p => (
              <button 
                 key={p} 
                 onClick={() => setPriorityFilter(p)}
                 className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${priorityFilter === p ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'text-slate-400 dark:text-slate-500 hover:text-indigo-600'}`}
              >
                 {p || 'Omni-Priority'}
              </button>
           ))}
        </div>
      </div>

      {/* Main Ledger */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
        <table className="w-full text-left">
          <thead>
            <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50">
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Operational Objective</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Priority</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Compliance Status</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Assigned Hub</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Temporal Bound</th>
              <th className="px-10 py-6 text-right text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Execution</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
            {tasks.map((t) => {
              const sc = STATUS_CONF[t.status] ?? STATUS_CONF.PENDING;
              return (
                <tr key={t.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                  <td className="px-10 py-6">
                    <div>
                      <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-tight group-hover:text-indigo-600 transition-colors">{t.title}</p>
                      {t.description && <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 mt-1 line-clamp-1 italic">"{t.description}"</p>}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest ${PRIORITY_COLORS[t.priority] ?? 'bg-slate-100 text-slate-500'}`}>{t.priority}</span>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${sc.color} max-w-fit shadow-sm`}>
                      {sc.icon}
                      <span className="text-[9px] font-black uppercase tracking-widest">{t.status}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <ShieldCheck className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-300 uppercase italic transition-colors group-hover:text-white">{t.assignee?.name ?? t.assigneeId ?? 'UNASSIGNED'}</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                       <Calendar className="w-3.5 h-3.5 text-slate-200 dark:text-slate-700" />
                       <span className="font-mono text-[10px] text-slate-400 dark:text-slate-500">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : 'NO_BOUND'}</span>
                    </div>
                  </td>
                  <td className="px-10 py-6">
                    <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-opacity">
                      {t.status === 'PENDING' && (
                        <button onClick={() => updateStatus(t.id, 'IN_PROGRESS')} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-indigo-600/20 hover:scale-[1.05] transition-all">Engage</button>
                      )}
                      {t.status === 'IN_PROGRESS' && (
                        <button onClick={() => updateStatus(t.id, 'COMPLETED')} className="px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-600/20 hover:scale-[1.05] transition-all">Finalize</button>
                      )}
                      <button onClick={() => handleDelete(t.id)} className="p-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/20 rounded-xl transition-all shadow-xl active:scale-95">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr>
                <td colSpan={6} className="py-24 text-center grayscale opacity-20">
                   <ListTodo className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                   <p className="text-[10px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">No Operational Data Discovered</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
