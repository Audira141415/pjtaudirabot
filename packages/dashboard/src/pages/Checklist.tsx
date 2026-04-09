import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ClipboardCheck, Plus, Trash2, X, CheckSquare, Square } from 'lucide-react';

export default function ChecklistPage() {
  const [templates, setTemplates] = useState<Array<Record<string, any>>>([]);
  const [items, setItems] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'templates' | 'items'>('templates');
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', category: '', items: '' });

  const load = async () => {
    try {
      const [t, i] = await Promise.all([api.getChecklistTemplates(), api.getChecklistItems()]);
      setTemplates((t.data as any) ?? []);
      setItems((i.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    try {
      await api.createChecklistTemplate({
        name: form.name,
        description: form.description,
        category: form.category,
        items: form.items.split('\n').filter(Boolean).map((text, i) => ({ text: text.trim(), order: i })),
      });
      setShowForm(false);
      setForm({ name: '', description: '', category: '', items: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const remove = async (id: string) => {
    try { await api.deleteChecklistTemplate(id); load(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <ClipboardCheck className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Checklists</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('templates')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'templates' ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>Templates</button>
          <button onClick={() => setTab('items')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'items' ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>Active Items</button>
          {tab === 'templates' && (
            <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-1.5 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600">
              <Plus className="w-4 h-4" /> New
            </button>
          )}
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">New Checklist Template</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Template name" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" placeholder="Description" />
              <input value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" placeholder="Category" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Items (one per line)</label>
              <textarea value={form.items} onChange={e => setForm({ ...form, items: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-32" placeholder="Check server uptime&#10;Verify backup status&#10;Review alert queue" />
            </div>
            <button onClick={create} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600">Create Template</button>
          </div>
        </div>
      )}

      {tab === 'templates' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold">{t.name}</h3>
                  {t.description && <p className="text-xs text-gray-500">{t.description}</p>}
                </div>
                <button onClick={() => remove(t.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
              </div>
              {t.category && <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-xs">{t.category}</span>}
              {t.items?.length > 0 && (
                <ul className="mt-3 space-y-1">
                  {(t.items as Array<Record<string, any>>).map((item, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                      <Square className="w-3.5 h-3.5 text-gray-300" />
                      {item.text ?? item.title}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
          {templates.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No checklist templates</div>}
        </div>
      )}

      {tab === 'items' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Item</th>
                <th className="text-left p-3 font-medium">Template</th>
                <th className="text-left p-3 font-medium">Assigned To</th>
                <th className="text-left p-3 font-medium">Due</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr key={item.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    {item.completed ? <CheckSquare className="w-5 h-5 text-emerald-500" /> : <Square className="w-5 h-5 text-gray-300" />}
                  </td>
                  <td className="p-3 font-medium">{item.text ?? item.title}</td>
                  <td className="p-3 text-gray-500">{item.template?.name ?? '-'}</td>
                  <td className="p-3">{item.assignee?.name ?? '-'}</td>
                  <td className="p-3 text-xs text-gray-500">{item.dueDate ? new Date(item.dueDate).toLocaleDateString() : '-'}</td>
                </tr>
              ))}
              {items.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No active checklist items</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
