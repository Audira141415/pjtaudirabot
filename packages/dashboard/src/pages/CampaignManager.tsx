import { useState, useEffect } from 'react';
import { Trash2 } from 'lucide-react';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-gray-100 text-gray-700',
  SCHEDULED: 'bg-blue-100 text-blue-800',
  RUNNING: 'bg-amber-100 text-amber-800',
  COMPLETED: 'bg-emerald-100 text-emerald-800',
  CANCELLED: 'bg-red-100 text-red-800',
};

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', content: '', targetPlatform: '', targetSegment: '', scheduledAt: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaigns(1, statusFilter || undefined);
      setCampaigns(res.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.name || !form.content) return;
    await api.createCampaign({
      name: form.name,
      description: form.description || null,
      content: form.content,
      targetPlatform: form.targetPlatform || null,
      targetSegment: form.targetSegment || null,
      scheduledAt: form.scheduledAt || null,
    });
    setForm({ name: '', description: '', content: '', targetPlatform: '', targetSegment: '', scheduledAt: '' });
    setShowForm(false);
    load();
  };

  const handleAction = async (id: string, status: string) => {
    await api.updateCampaign(id, { status });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus campaign ini?')) return;
    await api.deleteCampaign(id);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Campaign Manager</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          + Buat Campaign
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED'].map(s => (
          <div key={s} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">{s}</p>
            <p className="text-2xl font-bold">{campaigns.filter(c => c.status === s).length}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Campaign Baru</h2>
          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Nama campaign" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Deskripsi (opsional)" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <textarea className="w-full px-3 py-2 border rounded-lg h-28" placeholder="Konten pesan campaign..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="text-sm text-gray-500">Platform</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.targetPlatform} onChange={e => setForm({ ...form, targetPlatform: e.target.value })}>
                <option value="">Semua</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEGRAM">Telegram</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Segmen Target</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.targetSegment} onChange={e => setForm({ ...form, targetSegment: e.target.value })}>
                <option value="">Semua User</option>
                <option value="VIP">VIP</option>
                <option value="Regular">Regular</option>
                <option value="New">New</option>
              </select>
            </div>
            <div>
              <label className="text-sm text-gray-500">Jadwal</label>
              <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {s || 'Semua'}
          </button>
        ))}
      </div>

      {/* Campaign List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Loading...</div>
        ) : campaigns.length === 0 ? (
          <div className="bg-white rounded-xl shadow p-8 text-center text-gray-400">Belum ada campaign</div>
        ) : campaigns.map(c => (
          <div key={c.id as string} className="bg-white rounded-xl shadow p-5">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-gray-800">{c.name as string}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[c.status as string]}`}>{c.status as string}</span>
                  {!!c.targetPlatform && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{c.targetPlatform as string}</span>}
                  {!!c.targetSegment && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-50 text-purple-600">{c.targetSegment as string}</span>}
                </div>
                {!!c.description && <p className="text-sm text-gray-500 mt-1">{c.description as string}</p>}
                <p className="text-sm text-gray-600 mt-2 bg-gray-50 p-2 rounded line-clamp-2">{c.content as string}</p>
              </div>
              <div className="flex gap-1">
                {c.status === 'DRAFT' && <button onClick={() => handleAction(c.id as string, 'SCHEDULED')} className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded">Schedule</button>}
                {c.status === 'SCHEDULED' && <button onClick={() => handleAction(c.id as string, 'RUNNING')} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded">Jalankan</button>}
                {c.status === 'RUNNING' && <button onClick={() => handleAction(c.id as string, 'COMPLETED')} className="px-2 py-1 text-xs bg-emerald-100 text-emerald-700 rounded">Selesai</button>}
                {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                  <button onClick={() => handleAction(c.id as string, 'CANCELLED')} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded">Batalkan</button>
                )}
                <button onClick={() => handleDelete(c.id as string)} className="px-2 py-1 text-xs bg-red-50 text-red-600 rounded hover:bg-red-100" title="Hapus campaign">
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
            {/* Analytics */}
            <div className="grid grid-cols-5 gap-3 mt-4">
              {[
                { label: 'Total', value: c.totalRecipients, color: 'text-gray-700' },
                { label: 'Terkirim', value: c.sentCount, color: 'text-blue-600' },
                { label: 'Diterima', value: c.deliveredCount, color: 'text-emerald-600' },
                { label: 'Dibaca', value: c.readCount, color: 'text-purple-600' },
                { label: 'Gagal', value: c.failedCount, color: 'text-red-600' },
              ].map(m => (
                <div key={m.label} className="text-center">
                  <p className={`text-lg font-bold ${m.color}`}>{(m.value as number) || 0}</p>
                  <p className="text-xs text-gray-500">{m.label}</p>
                </div>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-3">
              Dibuat {new Date(c.createdAt as string).toLocaleString('id-ID')}
              {!!c.scheduledAt && <span> · 📅 Dijadwalkan {new Date(c.scheduledAt as string).toLocaleString('id-ID')}</span>}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
