import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Brain, Search, Trash2, X, User } from 'lucide-react';

export default function MemoryBrowserPage() {
  const [memories, setMemories] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [categories, setCategories] = useState<string[]>([]);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);

  const load = async () => {
    try {
      const filters: Record<string, string> = {};
      if (search) filters.search = search;
      if (category) filters.category = category;
      const res = await api.getMemory(1, Object.keys(filters).length ? filters : undefined);
      const data = (res.data as any) ?? [];
      setMemories(data);
      const cats = [...new Set(data.map((m: any) => m.category).filter(Boolean))] as string[];
      setCategories(cats);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [search, category]);

  const remove = async (id: string) => {
    try { await api.deleteMemory(id); load(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Brain className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Memory Browser</h1>
        <span className="text-sm text-gray-400">{memories.length} records</span>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search memories..." className="w-full pl-9 pr-3 py-2 border rounded-lg text-sm" />
        </div>
        <select value={category} onChange={e => setCategory(e.target.value)} className="border rounded-lg px-3 py-2 text-sm">
          <option value="">All Categories</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">User</th>
              <th className="text-left p-3 font-medium">Category</th>
              <th className="text-left p-3 font-medium">Key</th>
              <th className="text-left p-3 font-medium">Value</th>
              <th className="text-left p-3 font-medium">Updated</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {memories.map((m) => (
              <tr key={m.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setDetail(m)}>
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-gray-400" />
                    <span>{m.user?.name ?? m.userId ?? '-'}</span>
                  </div>
                </td>
                <td className="p-3">
                  <span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{m.category ?? '-'}</span>
                </td>
                <td className="p-3 font-mono text-xs">{m.key}</td>
                <td className="p-3 max-w-xs truncate text-gray-500">{typeof m.value === 'object' ? JSON.stringify(m.value) : String(m.value)}</td>
                <td className="p-3 text-xs text-gray-400">{new Date(m.updatedAt ?? m.createdAt).toLocaleString()}</td>
                <td className="p-3">
                  <button onClick={(e) => { e.stopPropagation(); remove(m.id); }} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
                </td>
              </tr>
            ))}
            {memories.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No memory records found</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Memory Detail</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div><strong>User:</strong> {detail.user?.name ?? detail.userId}</div>
              <div><strong>Category:</strong> {detail.category ?? '-'}</div>
              <div><strong>Key:</strong> <code className="bg-gray-100 px-1 rounded">{detail.key}</code></div>
              <div>
                <strong>Value:</strong>
                <pre className="bg-gray-50 border rounded-lg p-3 mt-1 text-xs overflow-auto max-h-60">
                  {typeof detail.value === 'object' ? JSON.stringify(detail.value, null, 2) : String(detail.value)}
                </pre>
              </div>
              {detail.metadata && (
                <div>
                  <strong>Metadata:</strong>
                  <pre className="bg-gray-50 border rounded-lg p-3 mt-1 text-xs overflow-auto max-h-40">
                    {JSON.stringify(detail.metadata, null, 2)}
                  </pre>
                </div>
              )}
              <div className="text-xs text-gray-400">
                Created: {new Date(detail.createdAt).toLocaleString()} · Updated: {new Date(detail.updatedAt ?? detail.createdAt).toLocaleString()}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
