import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const PLATFORM_COLORS: Record<string, string> = {
  WHATSAPP: 'bg-emerald-100 text-emerald-800',
  TELEGRAM: 'bg-blue-100 text-blue-800',
};

export default function UnifiedInbox() {
  const [messages, setMessages] = useState<Array<Record<string, unknown>>>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [total, setTotal] = useState(0);
  const [tab, setTab] = useState<'all' | 'unread' | 'starred' | 'archived'>('all');
  const [platformFilter, setPlatformFilter] = useState('');
  const [search, setSearch] = useState('');
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    const filters: Record<string, string> = {};
    if (platformFilter) filters.platform = platformFilter;
    if (search) filters.search = search;
    if (tab === 'unread') filters.isRead = 'false';
    if (tab === 'starred') filters.isStarred = 'true';
    if (tab === 'archived') filters.isArchived = 'true';
    try {
      const res = await api.getInbox(1, filters);
      setMessages(res.data);
      setUnreadCount(res.unreadCount);
      setTotal(res.pagination.total);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, platformFilter, search]);

  const handleToggleRead = async (msg: Record<string, unknown>) => {
    await api.updateInboxMessage(msg.id as string, { isRead: !msg.isRead });
    load();
  };

  const handleToggleStar = async (msg: Record<string, unknown>) => {
    await api.updateInboxMessage(msg.id as string, { isStarred: !msg.isStarred });
    load();
  };

  const handleArchive = async (msg: Record<string, unknown>) => {
    await api.updateInboxMessage(msg.id as string, { isArchived: true });
    if (selected?.id === msg.id) setSelected(null);
    load();
  };

  const handleMarkAllRead = async () => {
    await api.markAllInboxRead();
    load();
  };

  const SENTIMENT_EMOJI: Record<string, string> = { POSITIVE: '😊', NEGATIVE: '😠', NEUTRAL: '😐', MIXED: '🤔' };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold text-gray-800">Unified Inbox</h1>
          {unreadCount > 0 && (
            <span className="px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-bold">{unreadCount} belum dibaca</span>
          )}
        </div>
        <div className="flex gap-2">
          <button onClick={handleMarkAllRead} className="px-3 py-1.5 text-sm border rounded-lg hover:bg-gray-50">✓ Tandai Semua Dibaca</button>
        </div>
      </div>

      {/* Tabs & Filters */}
      <div className="flex items-center gap-4">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {[
            { key: 'all', label: `Semua (${total})` },
            { key: 'unread', label: `Belum Dibaca (${unreadCount})` },
            { key: 'starred', label: '⭐ Starred' },
            { key: 'archived', label: '📦 Arsip' },
          ].map(t => (
            <button key={t.key} onClick={() => setTab(t.key as typeof tab)}
              className={`px-3 py-1.5 rounded-md text-sm ${tab === t.key ? 'bg-white shadow font-medium' : 'text-gray-500 hover:text-gray-700'}`}>
              {t.label}
            </button>
          ))}
        </div>
        <select className="px-3 py-1.5 border rounded-lg text-sm" value={platformFilter} onChange={e => setPlatformFilter(e.target.value)}>
          <option value="">Semua Platform</option>
          <option value="WHATSAPP">WhatsApp</option>
          <option value="TELEGRAM">Telegram</option>
        </select>
        <input className="flex-1 px-3 py-1.5 border rounded-lg text-sm" placeholder="Cari pesan atau pengirim..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-4" style={{ minHeight: '70vh' }}>
        {/* Message List */}
        <div className="lg:col-span-2 bg-white rounded-xl shadow flex flex-col">
          <div className="p-3 border-b text-sm text-gray-500">{messages.length} pesan</div>
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Loading...</div>
          ) : messages.length === 0 ? (
            <div className="flex-1 flex items-center justify-center text-gray-400">Inbox kosong</div>
          ) : (
            <div className="flex-1 overflow-y-auto divide-y">
              {messages.map(msg => (
                <div key={msg.id as string} onClick={() => { setSelected(msg); if (!msg.isRead) handleToggleRead(msg); }}
                  className={`p-3 cursor-pointer hover:bg-gray-50 ${selected?.id === msg.id ? 'bg-indigo-50' : ''} ${!msg.isRead ? 'bg-blue-50/50' : ''}`}>
                  <div className="flex items-center gap-2">
                    <span className={`px-1.5 py-0.5 rounded text-xs font-mono ${PLATFORM_COLORS[msg.platform as string]}`}>
                      {(msg.platform as string) === 'WHATSAPP' ? 'WA' : 'TG'}
                    </span>
                    <span className={`text-sm ${!msg.isRead ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>{msg.fromName as string}</span>
                    {!!msg.isStarred && <span>⭐</span>}
                    {!!msg.sentiment && <span className="text-sm">{SENTIMENT_EMOJI[msg.sentiment as string]}</span>}
                    <span className="ml-auto text-xs text-gray-400">{new Date(msg.createdAt as string).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {!!msg.groupName && <p className="text-xs text-gray-400 mt-0.5">di {msg.groupName as string}</p>}
                  <p className={`text-sm mt-1 line-clamp-2 ${!msg.isRead ? 'text-gray-800' : 'text-gray-500'}`}>{msg.content as string}</p>
                  {!!msg.mediaType && (
                    <span className="inline-block mt-1 text-xs text-gray-400">📎 {msg.mediaType as string}</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Message Detail */}
        <div className="lg:col-span-3 bg-white rounded-xl shadow flex flex-col">
          {selected ? (
            <>
              <div className="p-4 border-b">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs ${PLATFORM_COLORS[selected.platform as string]}`}>{selected.platform as string}</span>
                    <h3 className="font-semibold text-gray-800">{selected.fromName as string}</h3>
                    {!!selected.fromNumber && <span className="text-sm text-gray-400">{selected.fromNumber as string}</span>}
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleToggleStar(selected)} className={`px-2 py-1 rounded text-sm ${selected.isStarred ? 'bg-amber-100' : 'bg-gray-100'}`}>
                      {selected.isStarred ? '⭐' : '☆'}
                    </button>
                    <button onClick={() => handleArchive(selected)} className="px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200">📦 Arsipkan</button>
                    <button onClick={() => handleToggleRead(selected)} className="px-2 py-1 rounded text-sm bg-gray-100 hover:bg-gray-200">
                      {selected.isRead ? '📩 Tandai Belum Dibaca' : '✓ Tandai Dibaca'}
                    </button>
                  </div>
                </div>
                {!!selected.groupName && <p className="text-sm text-gray-500 mt-1">Grup: {selected.groupName as string}</p>}
                <p className="text-xs text-gray-400 mt-1">{new Date(selected.createdAt as string).toLocaleString('id-ID')}</p>
              </div>
              <div className="flex-1 p-6">
                <div className="bg-gray-50 rounded-lg p-4">
                  <p className="text-gray-800 whitespace-pre-wrap">{selected.content as string}</p>
                </div>
                {!!selected.mediaUrl && (
                  <div className="mt-4 p-3 border rounded-lg">
                    <p className="text-sm text-gray-500">📎 Lampiran: {selected.mediaType as string}</p>
                    <p className="text-xs text-blue-500 truncate mt-1">{selected.mediaUrl as string}</p>
                  </div>
                )}
                {!!selected.sentiment && (
                  <div className="mt-4 flex items-center gap-2 text-sm text-gray-500">
                    <span>Sentiment: {SENTIMENT_EMOJI[selected.sentiment as string]} {selected.sentiment as string}</span>
                  </div>
                )}
                {!!selected.tags && (selected.tags as string[]).length > 0 && (
                  <div className="mt-3 flex gap-1 flex-wrap">
                    {(selected.tags as string[]).map((tag, i) => (
                      <span key={i} className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">{tag}</span>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <p className="text-4xl mb-2">📬</p>
                <p>Pilih pesan untuk membaca</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
