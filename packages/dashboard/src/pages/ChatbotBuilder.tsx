import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Bot, Plus, Trash2, Edit, Power, PowerOff, X } from 'lucide-react';

export default function ChatbotBuilder() {
  const [flows, setFlows] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', description: '', triggerKeyword: '', isActive: true });

  const load = async () => { setLoading(true); try { const r = await api.getChatbotFlows(); setFlows(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    if (editing) { await api.updateChatbotFlow(editing.id, form); } else { await api.createChatbotFlow(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', description: '', triggerKeyword: '', isActive: true }); load();
  };

  const toggle = async (f: Record<string, any>) => { await api.updateChatbotFlow(f.id, { isActive: !f.isActive }); load(); };
  const remove = async (id: string) => { await api.deleteChatbotFlow(id); load(); };
  const startEdit = (f: Record<string, any>) => { setEditing(f); setForm({ name: f.name, description: f.description || '', triggerKeyword: f.triggerKeyword || '', isActive: f.isActive }); setShowForm(true); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Bot className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Chatbot Builder</h1></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', description: '', triggerKeyword: '', isActive: true }); setShowForm(true); }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Flow Baru</button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">{editing ? 'Edit Flow' : 'Flow Baru'}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama flow" className="border rounded-lg px-3 py-2" />
            <input value={form.triggerKeyword} onChange={e => setForm({...form, triggerKeyword: e.target.value})} placeholder="Keyword trigger (misal: /start)" className="border rounded-lg px-3 py-2" />
            <label className="flex items-center gap-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm({...form, isActive: e.target.checked})} className="rounded" /> Aktif</label>
          </div>
          <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Deskripsi flow..." rows={2} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">{editing ? 'Update' : 'Simpan'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {flows.map(f => (
          <div key={f.id} className="bg-white border rounded-xl p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-lg">{f.name}</h3>
              <span className={`px-2 py-0.5 rounded text-xs font-medium ${f.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{f.isActive ? 'Aktif' : 'Nonaktif'}</span>
            </div>
            {f.description && <p className="text-sm text-gray-600 mb-3">{f.description}</p>}
            <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
              {f.triggerKeyword && <span className="font-mono bg-gray-50 px-2 py-1 rounded">{f.triggerKeyword}</span>}
              <span>v{f.version || 1}</span>
              <span>{f.executionCount || 0} eksekusi</span>
            </div>
            <div className="grid grid-cols-2 gap-2 mb-3">
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Nodes</p>
                <p className="font-bold text-lg">{Array.isArray(f.nodes) ? f.nodes.length : 0}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-2 text-center">
                <p className="text-xs text-gray-500">Edges</p>
                <p className="font-bold text-lg">{Array.isArray(f.edges) ? f.edges.length : 0}</p>
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => startEdit(f)} className="flex-1 flex items-center justify-center gap-1 p-2 hover:bg-gray-100 rounded-lg text-sm"><Edit className="w-4 h-4" /> Edit</button>
              <button onClick={() => toggle(f)} className="flex-1 flex items-center justify-center gap-1 p-2 hover:bg-gray-100 rounded-lg text-sm">{f.isActive ? <PowerOff className="w-4 h-4" /> : <Power className="w-4 h-4" />} {f.isActive ? 'Off' : 'On'}</button>
              <button onClick={() => remove(f.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {flows.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">Belum ada chatbot flow</div>}
      </div>
    </div>
  );
}
