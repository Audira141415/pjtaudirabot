import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Tag, Plus, Trash2, Edit, X } from 'lucide-react';

const COLORS = ['#6366f1','#ef4444','#f59e0b','#10b981','#3b82f6','#8b5cf6','#ec4899','#14b8a6','#f97316','#64748b'];

export default function TagsLabels() {
  const [tags, setTags] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', color: '#6366f1', description: '', category: '' });

  const load = async () => { setLoading(true); try { const r = await api.getTags(); setTags(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => {
    if (!form.name) return;
    if (editing) { await api.updateTag(editing.id, form); } else { await api.createTag(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', color: '#6366f1', description: '', category: '' }); load();
  };
  const remove = async (id: string) => { await api.deleteTag(id); load(); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const categories = [...new Set(tags.map(t => t.category).filter(Boolean))];

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Tag className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Tags & Labels</h1></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', color: '#6366f1', description: '', category: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Tag Baru</button>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">{editing ? 'Edit Tag' : 'Tag Baru'}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama tag" className="border rounded-lg px-3 py-2" />
            <input value={form.category} onChange={e => setForm({...form, category: e.target.value})} placeholder="Kategori" className="border rounded-lg px-3 py-2" />
            <input value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Deskripsi" className="border rounded-lg px-3 py-2" />
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Warna:</span>
              <div className="flex gap-1">{COLORS.map(c => <button key={c} onClick={() => setForm({...form, color: c})} className={`w-6 h-6 rounded-full border-2 ${form.color === c ? 'border-gray-800 scale-110' : 'border-transparent'}`} style={{backgroundColor: c}} />)}</div>
            </div>
          </div>
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">{editing ? 'Update' : 'Simpan'}</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {['', ...categories].map(cat => {
          const catTags = tags.filter(t => cat === '' ? !t.category : t.category === cat);
          if (catTags.length === 0) return null;
          return (
            <div key={cat || '__uncategorized'} className="bg-white border rounded-xl p-5">
              <h3 className="font-bold mb-3">{cat || 'Tanpa Kategori'}</h3>
              <div className="flex flex-wrap gap-2">
                {catTags.map(t => (
                  <div key={t.id} className="group flex items-center gap-2 px-3 py-1.5 rounded-full border" style={{ borderColor: t.color, backgroundColor: t.color + '15' }}>
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: t.color }} />
                    <span className="text-sm font-medium">{t.name}</span>
                    <span className="text-xs text-gray-400">{t.usageCount || 0}</span>
                    <button onClick={() => { setEditing(t); setForm({ name: t.name, color: t.color, description: t.description || '', category: t.category || '' }); setShowForm(true); }} className="opacity-0 group-hover:opacity-100 transition-opacity"><Edit className="w-3 h-3 text-gray-400" /></button>
                    <button onClick={() => remove(t.id)} className="opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 className="w-3 h-3 text-red-400" /></button>
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
      {tags.length === 0 && <div className="text-center py-12 text-gray-400">Belum ada tag</div>}
    </div>
  );
}
