import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BookOpen, Search, Plus, Trash2, X, Tag } from 'lucide-react';

export default function KnowledgeBasePage() {
  const [entries, setEntries] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [topic, setTopic] = useState('');
  const [topics, setTopics] = useState<string[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState({ title: '', content: '', topic: '', tags: '' });

  const load = async () => {
    try {
      const filters: Record<string, string> = {};
      if (search) filters.search = search;
      if (topic) filters.topic = topic;
      const res = await api.getKnowledge(1, Object.keys(filters).length ? filters : undefined);
      const data = (res.data as any) ?? [];
      setEntries(data);
      const allTopics = [...new Set(data.map((e: any) => e.topic).filter(Boolean))] as string[];
      setTopics(allTopics);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, topic]);

  const create = async () => {
    if (!form.title || !form.content) return;
    try {
      await api.createKnowledge({ ...form, tags: form.tags.split(',').map(t => t.trim()).filter(Boolean) });
      setShowForm(false);
      setForm({ title: '', content: '', topic: '', tags: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const remove = async (id: string) => {
    try { await api.deleteKnowledge(id); load(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Knowledge Base</h1>
          <span className="text-sm text-gray-400">{entries.length} entries</span>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600">
          <Plus className="w-4 h-4" /> New Entry
        </button>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search knowledge base..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={topic} onChange={e => setTopic(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Topics</option>
          {topics.map(t => <option key={t} value={t}>{t}</option>)}
        </select>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">New Knowledge Entry</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="space-y-3">
            <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Title" />
            <div className="grid grid-cols-2 gap-3">
              <input value={form.topic} onChange={e => setForm({ ...form, topic: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" placeholder="Topic" />
              <input value={form.tags} onChange={e => setForm({ ...form, tags: e.target.value })} className="border rounded-lg px-3 py-2 text-sm" placeholder="Tags (comma-separated)" />
            </div>
            <textarea value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm h-32" placeholder="Content..." />
            <button onClick={create} className="px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600">Create</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {entries.map((e) => (
          <div key={e.id} className="bg-white rounded-xl border p-5 hover:shadow-md transition-shadow cursor-pointer" onClick={() => setDetail(e)}>
            <div className="flex items-start justify-between mb-2">
              <h3 className="font-bold text-sm">{e.title}</h3>
              <button onClick={(ev) => { ev.stopPropagation(); remove(e.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
            <p className="text-xs text-gray-500 line-clamp-3 mb-3">{e.content}</p>
            <div className="flex flex-wrap gap-1">
              {e.topic && <span className="bg-brand-50 text-brand-700 px-2 py-0.5 rounded text-xs">{e.topic}</span>}
              {(e.tags as string[] | undefined)?.slice(0, 3).map((tag: string, i: number) => (
                <span key={i} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs">{tag}</span>
              ))}
            </div>
            {e.referenceCount > 0 && <p className="text-xs text-gray-400 mt-2">Referenced {e.referenceCount}x</p>}
          </div>
        ))}
        {entries.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No knowledge entries found</div>}
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">{detail.title}</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="flex flex-wrap gap-2 mb-4">
              {detail.topic && <span className="bg-brand-50 text-brand-700 px-2 py-1 rounded text-sm"><Tag className="w-3 h-3 inline mr-1" />{detail.topic}</span>}
              {(detail.tags as string[] | undefined)?.map((t: string, i: number) => <span key={i} className="bg-gray-100 text-gray-600 px-2 py-1 rounded text-sm">{t}</span>)}
            </div>
            <div className="prose prose-sm max-w-none">
              <p className="whitespace-pre-wrap">{detail.content}</p>
            </div>
            <div className="mt-4 text-xs text-gray-400">
              Created: {new Date(detail.createdAt).toLocaleString()} · References: {detail.referenceCount ?? 0}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
