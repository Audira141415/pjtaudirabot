import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BellRing, Plus, Trash2, Edit, Power, PowerOff, X } from 'lucide-react';

const EVENTS = ['ticket.created','ticket.updated','ticket.resolved','ticket.escalated','message.received','payment.received','campaign.completed','sla.breached','agent.offline','system.error'];
const CHANNELS = ['DASHBOARD','EMAIL','TELEGRAM','WHATSAPP','WEBHOOK'];

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
    if (editing) { await api.updateNotificationRule(editing.id, form); } else { await api.createNotificationRule(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', description: '', triggerEvent: 'ticket.created', channels: ['DASHBOARD'], isActive: true }); load();
  };

  const toggle = async (r: Record<string, any>) => { await api.updateNotificationRule(r.id, { isActive: !r.isActive }); load(); };
  const remove = async (id: string) => { await api.deleteNotificationRule(id); load(); };

  const toggleChannel = (ch: string) => {
    setForm(f => ({ ...f, channels: f.channels.includes(ch) ? f.channels.filter(c => c !== ch) : [...f.channels, ch] }));
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><BellRing className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Notification Rules</h1></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '', triggerEvent: 'ticket.created', channels: ['DASHBOARD'], isActive: true }); setShowForm(true); }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Rule Baru</button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">{editing ? 'Edit Rule' : 'Rule Baru'}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama rule" className="border rounded-lg px-3 py-2" />
            <select value={form.triggerEvent} onChange={e => setForm({...form, triggerEvent: e.target.value})} className="border rounded-lg px-3 py-2">{EVENTS.map(e => <option key={e} value={e}>{e}</option>)}</select>
          </div>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Deskripsi..." rows={2} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <div className="mb-3">
            <p className="text-sm font-medium mb-2">Channels:</p>
            <div className="flex gap-2">{CHANNELS.map(ch => <button key={ch} onClick={() => toggleChannel(ch)} className={`px-3 py-1.5 rounded-lg text-sm ${form.channels.includes(ch) ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>{ch}</button>)}</div>
          </div>
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">{editing ? 'Update' : 'Simpan'}</button>
        </div>
      )}

      <div className="space-y-3">
        {rules.map(r => (
          <div key={r.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${r.isActive ? 'bg-brand-50' : 'bg-gray-50'}`}><BellRing className={`w-5 h-5 ${r.isActive ? 'text-brand-500' : 'text-gray-400'}`} /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold">{r.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{r.isActive ? 'Aktif' : 'Nonaktif'}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 font-mono">{r.triggerEvent}</span>
              </div>
              {r.description && <p className="text-sm text-gray-600 mb-1">{r.description}</p>}
              <div className="flex gap-2 text-xs text-gray-500">
                <span>Channels: {Array.isArray(r.channels) ? r.channels.join(', ') : '-'}</span>
                <span>•</span>
                <span>Triggered: {r.triggerCount || 0}x</span>
                {r.lastTriggered && <><span>•</span><span>Last: {new Date(r.lastTriggered).toLocaleString('id-ID')}</span></>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(r)} className="p-2 hover:bg-gray-100 rounded-lg">{r.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />}</button>
              <button onClick={() => { setEditing(r); setForm({ name: r.name, description: r.description || '', triggerEvent: r.triggerEvent, channels: r.channels || ['DASHBOARD'], isActive: r.isActive }); setShowForm(true); }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4" /></button>
              <button onClick={() => remove(r.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {rules.length === 0 && <div className="text-center py-12 text-gray-400">Belum ada notification rule</div>}
      </div>
    </div>
  );
}
