import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const SEGMENT_COLORS: Record<string, string> = {
  VIP: 'bg-amber-100 text-amber-800',
  Regular: 'bg-blue-100 text-blue-800',
  New: 'bg-emerald-100 text-emerald-800',
  Churned: 'bg-red-100 text-red-800',
};

const INTERACTION_ICONS: Record<string, string> = {
  MESSAGE: '💬', CALL: '📞', EMAIL: '📧', NOTE: '📝', MEETING: '🤝', TICKET: '🎫',
};

export default function CRMContacts() {
  const [contacts, setContacts] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [interactions, setInteractions] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', position: '', segment: '', source: '', notes: '' });
  const [interForm, setInterForm] = useState({ type: 'NOTE', channel: '', subject: '', content: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCRMContacts(1, { search, segment });
      setContacts(res.data);
      setTotal(res.pagination.total);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, segment]);

  const handleCreate = async () => {
    if (!form.name) return;
    await api.createCRMContact(form);
    setForm({ name: '', phone: '', email: '', company: '', position: '', segment: '', source: '', notes: '' });
    setShowForm(false);
    load();
  };

  const handleSelect = async (contact: Record<string, unknown>) => {
    setSelected(contact);
    const res = await api.getCRMInteractions(contact.id as string);
    setInteractions(res.data);
  };

  const handleAddInteraction = async () => {
    if (!selected || !interForm.content) return;
    await api.createCRMInteraction(selected.id as string, interForm);
    setInterForm({ type: 'NOTE', channel: '', subject: '', content: '' });
    handleSelect(selected);
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteCRMContact(id);
    if (selected && selected.id === id) setSelected(null);
    load();
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">CRM Contacts</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          + Tambah Kontak
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Kontak</p>
          <p className="text-2xl font-bold">{total}</p>
        </div>
        {['VIP', 'Regular', 'New', 'Churned'].map(s => (
          <div key={s} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">{s}</p>
            <p className="text-2xl font-bold">{contacts.filter(c => c.segment === s).length}</p>
          </div>
        ))}
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Kontak Baru</h2>
          <div className="grid grid-cols-2 gap-4">
            <input className="px-3 py-2 border rounded-lg" placeholder="Nama *" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Telepon" value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Perusahaan" value={form.company} onChange={e => setForm({ ...form, company: e.target.value })} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Posisi" value={form.position} onChange={e => setForm({ ...form, position: e.target.value })} />
            <select className="px-3 py-2 border rounded-lg" value={form.segment} onChange={e => setForm({ ...form, segment: e.target.value })}>
              <option value="">Pilih Segmen</option>
              <option value="VIP">VIP</option>
              <option value="Regular">Regular</option>
              <option value="New">New</option>
              <option value="Churned">Churned</option>
            </select>
            <select className="px-3 py-2 border rounded-lg" value={form.source} onChange={e => setForm({ ...form, source: e.target.value })}>
              <option value="">Sumber</option>
              <option value="whatsapp">WhatsApp</option>
              <option value="telegram">Telegram</option>
              <option value="manual">Manual</option>
              <option value="website">Website</option>
            </select>
          </div>
          <textarea className="w-full px-3 py-2 border rounded-lg h-16" placeholder="Catatan" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Search & Filter */}
      <div className="flex gap-3">
        <input className="flex-1 px-3 py-2 border rounded-lg" placeholder="Cari nama, email, perusahaan, telepon..." value={search} onChange={e => setSearch(e.target.value)} />
        <select className="px-3 py-2 border rounded-lg" value={segment} onChange={e => setSegment(e.target.value)}>
          <option value="">Semua Segmen</option>
          <option value="VIP">VIP</option>
          <option value="Regular">Regular</option>
          <option value="New">New</option>
          <option value="Churned">Churned</option>
        </select>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Contact List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow">
          <div className="p-4 border-b font-medium text-gray-700">Kontak ({total})</div>
          {loading ? (
            <div className="p-8 text-center text-gray-400">Loading...</div>
          ) : contacts.length === 0 ? (
            <div className="p-8 text-center text-gray-400">Belum ada kontak</div>
          ) : (
            <div className="divide-y max-h-[600px] overflow-y-auto">
              {contacts.map(c => (
                <div key={c.id as string} onClick={() => handleSelect(c)}
                  className={`p-4 hover:bg-gray-50 cursor-pointer ${selected?.id === c.id ? 'bg-indigo-50 border-l-4 border-indigo-500' : ''}`}>
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-gray-800">{c.name as string}</span>
                        {!!c.segment && <span className={`px-2 py-0.5 rounded-full text-xs ${SEGMENT_COLORS[c.segment as string] || 'bg-gray-100'}`}>{c.segment as string}</span>}
                        {!!c.score && <span className="text-xs text-gray-400">⭐ {c.score as number}</span>}
                      </div>
                      <div className="text-sm text-gray-500 mt-0.5">
                        {!!c.company && <span>{c.company as string}</span>}
                        {!!c.position && <span> · {c.position as string}</span>}
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        {!!c.phone && <span>📱 {c.phone as string}</span>}
                        {!!c.email && <span> · 📧 {c.email as string}</span>}
                        <span> · 💬 {c.totalInteractions as number || 0} interaksi</span>
                      </div>
                    </div>
                    <button onClick={e => { e.stopPropagation(); handleDelete(c.id as string); }} className="text-red-400 hover:text-red-600 text-sm">✕</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Detail Panel */}
        <div className="bg-white rounded-xl shadow">
          {selected ? (
            <div>
              <div className="p-4 border-b">
                <h3 className="font-semibold text-gray-800">{selected.name as string}</h3>
                <p className="text-sm text-gray-500">{selected.company as string || 'Perusahaan belum diset'} · {selected.position as string || '-'}</p>
                {!!selected.segment && <span className={`inline-block mt-1 px-2 py-0.5 rounded-full text-xs ${SEGMENT_COLORS[selected.segment as string] || 'bg-gray-100'}`}>{selected.segment as string}</span>}
              </div>
              {/* Add Interaction */}
              <div className="p-4 border-b space-y-2">
                <p className="text-sm font-medium text-gray-600">Tambah Interaksi</p>
                <div className="flex gap-2">
                  <select className="px-2 py-1 border rounded text-sm" value={interForm.type} onChange={e => setInterForm({ ...interForm, type: e.target.value })}>
                    <option value="NOTE">📝 Note</option>
                    <option value="MESSAGE">💬 Message</option>
                    <option value="CALL">📞 Call</option>
                    <option value="EMAIL">📧 Email</option>
                    <option value="MEETING">🤝 Meeting</option>
                  </select>
                  <input className="flex-1 px-2 py-1 border rounded text-sm" placeholder="Isi..." value={interForm.content} onChange={e => setInterForm({ ...interForm, content: e.target.value })} />
                  <button onClick={handleAddInteraction} className="px-3 py-1 bg-indigo-600 text-white rounded text-sm">+</button>
                </div>
              </div>
              {/* Interactions */}
              <div className="divide-y max-h-[400px] overflow-y-auto">
                {interactions.length === 0 ? (
                  <div className="p-4 text-center text-gray-400 text-sm">Belum ada interaksi</div>
                ) : interactions.map(i => (
                  <div key={i.id as string} className="p-3">
                    <div className="flex items-center gap-1 text-sm">
                      <span>{INTERACTION_ICONS[i.type as string] || '📋'}</span>
                      <span className="font-medium text-gray-700">{i.type as string}</span>
                      {!!i.channel && <span className="text-gray-400">via {i.channel as string}</span>}
                    </div>
                    <p className="text-sm text-gray-600 mt-1">{i.content as string}</p>
                    <p className="text-xs text-gray-400 mt-1">{new Date(i.createdAt as string).toLocaleString('id-ID')}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-gray-400">Pilih kontak untuk melihat detail</div>
          )}
        </div>
      </div>
    </div>
  );
}
