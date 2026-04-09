import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  SENT: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

export default function ScheduledMessages() {
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ title: '', content: '', targetPlatform: '', scheduledAt: '', recurring: false, schedule: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getScheduledMessages(1, statusFilter || undefined);
      setMessages(res.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.title || !form.content || !form.scheduledAt) return;
    try {
      await api.createScheduledMessage({
        title: form.title,
        content: form.content,
        targetPlatform: form.targetPlatform || null,
        scheduledAt: form.scheduledAt,
        recurring: form.recurring,
        schedule: form.recurring ? form.schedule : null,
      });
      setForm({ title: '', content: '', targetPlatform: '', scheduledAt: '', recurring: false, schedule: '' });
      setShowForm(false);
      load();
    } catch { /* empty */ }
  };

  const handleCancel = async (id: string) => {
    await api.cancelScheduledMessage(id);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteScheduledMessage(id);
    load();
  };

  const pendingCount = messages.filter(m => m.status === 'PENDING').length;
  const sentCount = messages.filter(m => m.status === 'SENT').length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Scheduled Messages</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          + Buat Jadwal
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total</p>
          <p className="text-2xl font-bold">{messages.length}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{pendingCount}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Terkirim</p>
          <p className="text-2xl font-bold text-emerald-600">{sentCount}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Pesan Baru</h2>
          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Judul pesan" value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
          <textarea className="w-full px-3 py-2 border rounded-lg h-24" placeholder="Isi pesan..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-sm text-gray-500">Jadwal Kirim</label>
              <input type="datetime-local" className="w-full px-3 py-2 border rounded-lg" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
            </div>
            <div>
              <label className="text-sm text-gray-500">Platform</label>
              <select className="w-full px-3 py-2 border rounded-lg" value={form.targetPlatform} onChange={e => setForm({ ...form, targetPlatform: e.target.value })}>
                <option value="">Semua Platform</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEGRAM">Telegram</option>
              </select>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="flex items-center gap-2">
              <input type="checkbox" checked={form.recurring} onChange={e => setForm({ ...form, recurring: e.target.checked })} />
              <span className="text-sm text-gray-600">Berulang</span>
            </label>
            {form.recurring && (
              <select className="px-3 py-2 border rounded-lg text-sm" value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })}>
                <option value="">Pilih Jadwal</option>
                <option value="daily">Setiap Hari</option>
                <option value="weekly">Setiap Minggu</option>
                <option value="monthly">Setiap Bulan</option>
              </select>
            )}
          </div>
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'PENDING', 'SENT', 'FAILED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {s || 'Semua'}
          </button>
        ))}
      </div>

      {/* Messages List */}
      <div className="bg-white rounded-xl shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : messages.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Belum ada pesan terjadwal</div>
        ) : (
          <div className="divide-y">
            {messages.map(msg => (
              <div key={msg.id as string} className="p-4 hover:bg-gray-50">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-800">{msg.title as string}</span>
                      <span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[msg.status as string] || 'bg-gray-100'}`}>
                        {msg.status as string}
                      </span>
                      {!!msg.recurring && <span className="px-2 py-0.5 rounded-full text-xs bg-purple-100 text-purple-700">🔁 {msg.schedule as string || 'Recurring'}</span>}
                      {!!msg.targetPlatform && <span className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600">{msg.targetPlatform as string}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1 line-clamp-2">{msg.content as string}</p>
                    <p className="text-xs text-gray-400 mt-1">
                      📅 {new Date(msg.scheduledAt as string).toLocaleString('id-ID')}
                      {!!msg.sentAt && <span> · ✅ Terkirim {new Date(msg.sentAt as string).toLocaleString('id-ID')}</span>}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {msg.status === 'PENDING' && (
                      <button onClick={() => handleCancel(msg.id as string)} className="px-2 py-1 text-xs bg-amber-100 text-amber-700 rounded hover:bg-amber-200">Batalkan</button>
                    )}
                    <button onClick={() => handleDelete(msg.id as string)} className="px-2 py-1 text-xs bg-red-100 text-red-700 rounded hover:bg-red-200">Hapus</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
