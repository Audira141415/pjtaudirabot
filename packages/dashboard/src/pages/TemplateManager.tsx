import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FileText, Plus, Trash2, Edit, Search, X } from 'lucide-react';

const CATEGORIES = ['GREETING','AWAY','QUICK_REPLY','NOTIFICATION','FOLLOW_UP','CLOSING','PROMOTION','CUSTOM'];
const PLATFORMS = ['ALL','WHATSAPP','TELEGRAM'];

export default function TemplateManager() {
  const [items, setItems] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ name: '', category: 'QUICK_REPLY', platform: 'ALL', language: 'id', subject: '', body: '' });
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('');

  const load = async () => { setLoading(true); try { const r = await api.getTemplates(filterCat || undefined); setItems(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, [filterCat]);

  const save = async () => {
    if (!form.name || !form.body) return;
    if (editing) { await api.updateTemplate(editing.id, form); } else { await api.createTemplate(form); }
    setShowForm(false); setEditing(null); setForm({ name: '', category: 'QUICK_REPLY', platform: 'ALL', language: 'id', subject: '', body: '' }); load();
  };

  const remove = async (id: string) => { await api.deleteTemplate(id); load(); };

  const startEdit = (t: Record<string, any>) => {
    setEditing(t); setForm({ name: t.name, category: t.category, platform: t.platform, language: t.language || 'id', subject: t.subject || '', body: t.body }); setShowForm(true);
  };

  const filtered = items.filter(t => !search || t.name?.toLowerCase().includes(search.toLowerCase()) || t.body?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><FileText className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Template Manager</h1></div>
        <button onClick={() => { setEditing(null); setForm({ name: '', category: 'QUICK_REPLY', platform: 'ALL', language: 'id', subject: '', body: '' }); setShowForm(true); }} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Buat Template</button>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari template..." className="w-full pl-10 pr-3 py-2 border rounded-lg" /></div>
        <select value={filterCat} onChange={e => setFilterCat(e.target.value)} className="border rounded-lg px-3 py-2"><option value="">Semua Kategori</option>{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">{editing ? 'Edit Template' : 'Template Baru'}</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama template" className="border rounded-lg px-3 py-2" />
            <select value={form.category} onChange={e => setForm({...form, category: e.target.value})} className="border rounded-lg px-3 py-2">{CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}</select>
            <select value={form.platform} onChange={e => setForm({...form, platform: e.target.value})} className="border rounded-lg px-3 py-2">{PLATFORMS.map(p => <option key={p} value={p}>{p}</option>)}</select>
            <input value={form.subject} onChange={e => setForm({...form, subject: e.target.value})} placeholder="Subject (opsional)" className="border rounded-lg px-3 py-2" />
          </div>
          <textarea value={form.body} onChange={e => setForm({...form, body: e.target.value})} placeholder="Isi template... Gunakan {{variable}} untuk variabel" rows={4} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">{editing ? 'Update' : 'Simpan'}</button>
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map(t => (
          <div key={t.id} className="bg-white border rounded-xl p-4 flex justify-between items-start">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="font-bold">{t.name}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{t.category}</span>
                <span className="px-2 py-0.5 rounded text-xs bg-gray-100">{t.platform}</span>
                {t.subject && <span className="text-xs text-gray-500">Subject: {t.subject}</span>}
              </div>
              <p className="text-sm text-gray-600 line-clamp-2">{t.body}</p>
              <p className="text-xs text-gray-400 mt-1">Dipakai {t.usageCount || 0}x • {new Date(t.createdAt).toLocaleDateString('id-ID')}</p>
            </div>
            <div className="flex gap-1 ml-3">
              <button onClick={() => startEdit(t)} className="p-2 hover:bg-gray-100 rounded-lg"><Edit className="w-4 h-4 text-gray-500" /></button>
              <button onClick={() => remove(t.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {filtered.length === 0 && <div className="text-center py-12 text-gray-400">Tidak ada template</div>}
      </div>
    </div>
  );
}
