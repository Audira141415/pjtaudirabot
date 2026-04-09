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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><UserCog className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Agent Management</h1></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', email: '', role: 'AGENT', status: 'OFFLINE', department: '', maxConcurrent: 5 }); setShowForm(true); }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Tambah Agent</button>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold">{agents.length}</p><p className="text-sm text-gray-500">Total Agent</p></div>
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-emerald-600">{online}</p><p className="text-sm text-gray-500">Online</p></div>
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-red-500">{busy}</p><p className="text-sm text-gray-500">Busy</p></div>
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-gray-400">{agents.length - online - busy}</p><p className="text-sm text-gray-500">Offline/Away</p></div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">{editing ? 'Edit Agent' : 'Agent Baru'}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama" className="border rounded-lg px-3 py-2" />
            <input value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Email" className="border rounded-lg px-3 py-2" />
            <input value={form.department} onChange={e => setForm({...form, department: e.target.value})} placeholder="Department" className="border rounded-lg px-3 py-2" />
            <select value={form.role} onChange={e => setForm({...form, role: e.target.value})} className="border rounded-lg px-3 py-2">{ROLES.map(r => <option key={r} value={r}>{r}</option>)}</select>
            <select value={form.status} onChange={e => setForm({...form, status: e.target.value})} className="border rounded-lg px-3 py-2">{STATUSES.map(s => <option key={s} value={s}>{s}</option>)}</select>
            <input type="number" value={form.maxConcurrent} onChange={e => setForm({...form, maxConcurrent: parseInt(e.target.value)})} placeholder="Max concurrent" className="border rounded-lg px-3 py-2" />
          </div>
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">{editing ? 'Update' : 'Simpan'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {agents.map(a => (
          <div key={a.id} className="bg-white border rounded-xl p-5">
            <div className="flex items-center gap-3 mb-3">
              <div className="relative">
                <div className="w-12 h-12 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-lg">{a.name?.[0] || '?'}</div>
                <Circle className={`w-3 h-3 absolute -bottom-0 -right-0 fill-current ${STATUS_COLOR[a.status] || 'text-gray-400'}`} />
              </div>
              <div>
                <h3 className="font-bold">{a.name}</h3>
                <p className="text-xs text-gray-500">{a.email || '-'} • {a.role}</p>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3 text-center">
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Aktif</p><p className="font-bold">{a.activeTickets || 0}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Selesai</p><p className="font-bold">{a.totalResolved || 0}</p></div>
              <div className="bg-gray-50 rounded-lg p-2"><p className="text-xs text-gray-500">Rating</p><p className="font-bold">{a.rating?.toFixed(1) || '-'}</p></div>
            </div>
            <div className="flex gap-2 mb-3">{STATUSES.map(s => <button key={s} onClick={() => setStatus(a, s)} className={`px-2 py-1 rounded text-xs ${a.status === s ? 'bg-brand-500 text-white' : 'bg-gray-100 hover:bg-gray-200'}`}>{s.replace('_',' ')}</button>)}</div>
            <div className="flex gap-1">
              <button onClick={() => { setEditing(a); setForm({ name: a.name, email: a.email || '', role: a.role, status: a.status, department: a.department || '', maxConcurrent: a.maxConcurrent }); setShowForm(true); }} className="flex-1 text-center py-1.5 text-sm hover:bg-gray-100 rounded-lg">Edit</button>
              <button onClick={() => remove(a.id)} className="p-1.5 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {agents.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">Belum ada agent</div>}
      </div>
    </div>
  );
}
