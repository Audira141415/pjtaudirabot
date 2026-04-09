import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Key, Plus, Trash2, Copy, Eye, EyeOff, X, Shield } from 'lucide-react';

export default function ApiKeysPage() {
  const [keys, setKeys] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [newKey, setNewKey] = useState('');
  const [form, setForm] = useState({ name: '', rateLimit: 1000, permissions: [] as string[] });

  const load = async () => { setLoading(true); try { const r = await api.getApiKeys(); setKeys(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    const r = await api.createApiKey(form);
    if (r.data?.key) setNewKey(r.data.key as string);
    setShowForm(false); setForm({ name: '', rateLimit: 1000, permissions: [] }); load();
  };

  const toggle = async (k: Record<string, any>) => { await api.updateApiKey(k.id, { isActive: !k.isActive }); load(); };
  const remove = async (id: string) => { await api.deleteApiKey(id); load(); };
  const copy = (text: string) => { navigator.clipboard.writeText(text); };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Key className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">API Keys</h1></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Generate Key</button>
      </div>

      {newKey && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
          <p className="text-sm font-medium text-emerald-800 mb-2">API Key berhasil dibuat! Salin sekarang, key tidak akan ditampilkan lagi.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 bg-white border rounded-lg p-3 font-mono text-sm break-all">{newKey}</code>
            <button onClick={() => copy(newKey)} className="p-2 bg-emerald-100 rounded-lg hover:bg-emerald-200"><Copy className="w-5 h-5" /></button>
          </div>
          <button onClick={() => setNewKey('')} className="text-xs text-emerald-600 mt-2 hover:underline">Tutup</button>
        </div>
      )}

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">Generate API Key Baru</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 gap-3 mb-3">
            <input value={form.name} onChange={e => setForm({...form, name: e.target.value})} placeholder="Nama key (misal: Production App)" className="border rounded-lg px-3 py-2" />
            <input type="number" value={form.rateLimit} onChange={e => setForm({...form, rateLimit: parseInt(e.target.value) || 1000})} placeholder="Rate limit /jam" className="border rounded-lg px-3 py-2" />
          </div>
          <button onClick={create} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">Generate</button>
        </div>
      )}

      <div className="space-y-3">
        {keys.map(k => (
          <div key={k.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
            <div className={`p-3 rounded-lg ${k.isActive ? 'bg-emerald-50' : 'bg-gray-50'}`}><Shield className={`w-5 h-5 ${k.isActive ? 'text-emerald-500' : 'text-gray-400'}`} /></div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h3 className="font-bold">{k.name}</h3>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${k.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-500'}`}>{k.isActive ? 'Aktif' : 'Nonaktif'}</span>
              </div>
              <div className="flex items-center gap-3 text-sm text-gray-500">
                <span className="font-mono">{k.prefix}••••••••</span>
                <span>Rate: {k.rateLimit}/jam</span>
                <span>Used: {k.usageCount || 0}x</span>
                {k.lastUsedAt && <span>Last: {new Date(k.lastUsedAt).toLocaleDateString('id-ID')}</span>}
                {k.expiresAt && <span className={new Date(k.expiresAt) < new Date() ? 'text-red-500' : ''}>Expires: {new Date(k.expiresAt).toLocaleDateString('id-ID')}</span>}
              </div>
            </div>
            <div className="flex gap-1">
              <button onClick={() => toggle(k)} className="p-2 hover:bg-gray-100 rounded-lg">{k.isActive ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}</button>
              <button onClick={() => remove(k.id)} className="p-2 hover:bg-red-50 rounded-lg"><Trash2 className="w-4 h-4 text-red-500" /></button>
            </div>
          </div>
        ))}
        {keys.length === 0 && <div className="text-center py-12 text-gray-400">Belum ada API key</div>}
      </div>
    </div>
  );
}
