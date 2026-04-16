import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { UserCog, Plus, Trash2, X, Circle } from 'lucide-react';

const ROLES = ['AGENT','SENIOR_AGENT','SUPERVISOR','ADMIN'];
const STATUSES = ['ONLINE','OFFLINE','BUSY','AWAY','ON_BREAK'];
const STATUS_COLOR: Record<string, string> = { ONLINE: 'text-emerald-500', OFFLINE: 'text-gray-400', BUSY: 'text-red-500', AWAY: 'text-amber-500', ON_BREAK: 'text-blue-400' };

export default function AgentManagement() {
  const [agents, setAgents] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', email: '', role: 'AGENT', status: 'OFFLINE', department: '', maxConcurrent: 5 });

  const load = async () => { setLoading(true); try { const r = await api.getAgents(); setAgents(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    if (editing) { await api.updateAgent(editing.id, form); } else { await api.createAgent(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', email: '', role: 'AGENT', status: 'OFFLINE', department: '', maxConcurrent: 5 }); load();
  };

  const remove = async (id: string) => { await api.deleteAgent(id); load(); };
  const setStatus = async (agent: Record<string, any>, status: string) => { await api.updateAgent(agent.id, { status }); load(); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const online = agents.filter(a => a.status === 'ONLINE').length;
  const busy = agents.filter(a => a.status === 'BUSY').length;

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 glow-brand">
            <UserCog className="w-8 h-8 text-brand-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Agent Operations</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Monitor and manage your cognitive workforce</p>
          </div>
        </div>
        <button 
          onClick={() => { setEditing(null); setForm({ name: '', email: '', role: 'AGENT', status: 'OFFLINE', department: '', maxConcurrent: 5 }); setShowForm(true); }} 
          className="flex items-center gap-2 bg-gradient-to-r from-brand-600 to-brand-500 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-500/20 hover:scale-105 transition-transform active:scale-95"
        >
          <Plus className="w-5 h-5" /> Add New Agent
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        {[
          { label: 'Total Workforce', value: agents.length, color: 'text-slate-900 dark:text-white' },
          { label: 'Active/Online', value: online, color: 'text-emerald-600 dark:text-emerald-400' },
          { label: 'Busy/Engaged', value: busy, color: 'text-rose-600 dark:text-rose-400' },
          { label: 'In Reserve', value: agents.length - online - busy, color: 'text-slate-500 dark:text-slate-400' },
        ].map((stat, i) => (
          <div key={i} className="glass-dark p-6 rounded-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:opacity-10 transition-opacity">
              <Circle className={`w-16 h-16 fill-current ${stat.color}`} />
            </div>
            <p className="text-slate-500 dark:text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">{stat.label}</p>
            <p className={`text-4xl font-bold ${stat.color}`}>{stat.value}</p>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="glass-dark p-8 rounded-3xl mb-8 border border-brand-500/30 animate-slide-in">
          <div className="flex justify-between mb-6">
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{editing ? 'Modify Agent Profile' : 'Initialize New Agent'}</h3>
            <button onClick={() => setShowForm(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors text-slate-400"><X className="w-6 h-6" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6 text-slate-200">
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Full Name</label>
              <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Agent Identity" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Email Connection</label>
              <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="agent@system.com" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Operational Role</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 text-slate-900 dark:text-white outline-none transition-all">{ROLES.map(r => <option key={r} value={r} className="bg-white dark:bg-slate-900">{r}</option>)}</select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Current Protocol</label>
              <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 text-slate-900 dark:text-white outline-none transition-all">{STATUSES.map(s => <option key={s} value={s} className="bg-white dark:bg-slate-900">{s}</option>)}</select>
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Department/Squad</label>
              <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="NOC / L1 / SOC" className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 text-slate-900 dark:text-white outline-none transition-all placeholder:text-slate-400" />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-medium text-slate-400 ml-1">Capacity Limit</label>
              <input type="number" value={form.maxConcurrent} onChange={e => setForm({...form, maxConcurrent: parseInt(e.target.value)})} className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 text-slate-900 dark:text-white outline-none transition-all" />
            </div>
          </div>
          <button onClick={save} className="w-full md:w-auto bg-brand-500 hover:bg-brand-600 text-white px-10 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/40 transition-all">{editing ? 'Update Operational Matrix' : 'Initialize Recruitment'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {agents.map(a => (
          <div key={a.id} className="glass-dark rounded-3xl p-6 border-slate-200 dark:border-slate-800 hover:border-brand-500/50 transition-all group relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500/50 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
            
            <div className="flex items-center gap-4 mb-6">
              <div className="relative">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 dark:from-slate-800 dark:to-slate-900 flex items-center justify-center text-brand-600 dark:text-brand-300 font-bold text-2xl border border-slate-200 dark:border-slate-700/50 group-hover:border-brand-500/30 transition-colors shadow-inner">
                  {a.name?.[0] || '?'}
                </div>
                <div className={`absolute -bottom-1 -right-1 p-1 rounded-lg bg-white dark:bg-slate-900 shadow-xl`}>
                  <Circle className={`w-3.5 h-3.5 fill-current ${STATUS_COLOR[a.status] || 'text-slate-400 dark:text-slate-600'}`} />
                </div>
              </div>
              <div className="min-w-0">
                <h3 className="font-bold text-lg text-slate-900 dark:text-white truncate">{a.name}</h3>
                <div className="flex items-center gap-2">
                  <span className="text-xs px-2 py-0.5 rounded-md bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-mono tracking-tight">{a.role}</span>
                  <span className="text-slate-500 text-[10px] uppercase font-bold tracking-widest">{a.department || 'GLOBAL'}</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 mb-6">
              {[
                { label: 'Load', val: a.activeTickets || 0, color: 'text-brand-600 dark:text-brand-400' },
                { label: 'Solved', val: a.totalResolved || 0, color: 'text-emerald-600 dark:text-emerald-400' },
                { label: 'KPI', val: a.rating?.toFixed(1) || 'N/A', color: 'text-amber-600 dark:text-amber-400' },
              ].map((stat, i) => (
                <div key={i} className="bg-slate-50 dark:bg-slate-800/30 rounded-2xl p-3 border border-slate-200 dark:border-slate-700/20">
                  <p className="text-[10px] text-slate-500 font-bold uppercase tracking-widest text-center mb-1">{stat.label}</p>
                  <p className={`text-lg font-bold text-center ${stat.color}`}>{stat.val}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-2 mb-6">
              {STATUSES.map(s => (
                <button 
                  key={s} 
                  onClick={() => setStatus(a, s)} 
                  className={`px-3 py-1.5 rounded-xl text-[10px] font-bold uppercase transition-all ${
                    a.status === s 
                      ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20' 
                      : 'bg-slate-100 dark:bg-slate-800/50 text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {s.replace('_',' ')}
                </button>
              ))}
            </div>

            <div className="flex gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/50">
              <button onClick={() => { setEditing(a); setForm({ name: a.name, email: a.email || '', role: a.role, status: a.status, department: a.department || '', maxConcurrent: a.maxConcurrent }); setShowForm(true); }} className="flex-1 bg-slate-50 dark:bg-slate-800/50 py-2.5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white rounded-xl transition-all">Command Matrix</button>
              <button onClick={() => remove(a.id)} className="p-2.5 bg-rose-500/10 text-rose-600 dark:text-rose-500 hover:bg-rose-500 hover:text-white rounded-xl transition-all border border-rose-500/20"><Trash2 className="w-5 h-5" /></button>
            </div>
          </div>
        ))}
        {agents.length === 0 && (
          <div className="col-span-3 glass-dark rounded-3xl py-20 flex flex-col items-center justify-center text-slate-500">
            <UserCog className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-xl font-medium">Workforce database is empty</p>
            <p className="text-sm">Recruit your first operational agent to begin</p>
          </div>
        )}
      </div>
    </div>
  );
}
