import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Zap, Plus, Trash2, Edit, Copy, Search, X } from 'lucide-react';

export default function CannedResponses() {
  const [items, setItems] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ shortcut: '', title: '', content: '', category: '' });
  const [search, setSearch] = useState('');

  const load = async () => { setLoading(true); try { const r = await api.getCannedResponses(); setItems(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.shortcut || !form.content) return;
    if (editing) { await api.updateCannedResponse(editing.id, form); } else { await api.createCannedResponse(form); }
    setShowForm(false); setEditing(null); setForm({ shortcut: '', title: '', content: '', category: '' }); load();
  };
  const remove = async (id: string) => { await api.deleteCannedResponse(id); load(); };
  const copy = (text: string) => { navigator.clipboard.writeText(text); };

  const filtered = items.filter(i => !search || i.shortcut?.toLowerCase().includes(search.toLowerCase()) || i.title?.toLowerCase().includes(search.toLowerCase()) || i.content?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Zap className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Canned Responses</h1></div>
        <button onClick={() => { setEditing(null); setForm({ shortcut: '', title: '', content: '', category: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Response Baru</button>
      </div>

      <div className="relative mb-4"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari shortcut atau isi..." className="w-full pl-10 pr-3 py-2 border rounded-lg" /></div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">{editing ? 'Edit Response' : 'Response Baru'}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <input value={form.shortcut} onChange={e => setForm({...form, shortcut: e.target.value})} placeholder="Shortcut (misal: /terima)" className="border rounded-lg px-3 py-2 font-mono" />
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Judul" className="border rounded-lg px-3 py-2" />
            <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Kategori" className="border rounded-lg px-3 py-2" />
          </div>
          <textarea value={form.content} onChange={e => setForm({...form, content: e.target.value})} placeholder="Isi response..." rows={3} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">{editing ? 'Update' : 'Simpan'}</button>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(i => (
          <div key={i.id} className="bg-white border rounded-xl p-4 flex gap-4">
            <div className="shrink-0">
              <span className="font-mono text-sm bg-brand-50 text-brand-700 px-3 py-1.5 rounded-lg inline-block">{i.shortcut}</span>
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium mb-1">{i.title || i.shortcut}</h3>
              <p className="text-sm text-gray-600 line-clamp-2">{i.content}</p>
              <div className="flex gap-3 text-xs text-gray-400 mt-1">
                {i.category && <span className="bg-gray-50 px-2 py-0.5 rounded">{i.category}</span>}
                <span>Dipakai {i.usageCount || 0}x</span>
              </div>
            </div>
            <div className="flex gap-1 shrink-0">
              <button onClick={() => copy(i.content)} className="p-2 hover:bg-gray-100 rounded-lg"><Copy className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => { setEditing(i); setForm({ shortcut: i.shortcut, title: i.title, content: i.content, category: i.category || '' }); setShowForm(true); }} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => remove(i.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400">Tidak ada canned response</div>}
      </div>
    </div>
  );
}
