import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Send, Radio, Loader2 } from 'lucide-react';

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<Array<Record<string, unknown>>>([]);
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getBroadcasts()
      .then((res) => setBroadcasts(res.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await api.createBroadcast(content, platform || undefined);
      setBroadcasts((prev) => [res.data, ...prev]);
      setContent('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create broadcast');
    } finally {
      setSending(false);
    }
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Radio className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Broadcast</h1>
      </div>

      {/* Send Form */}
      <form onSubmit={handleSend} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
        <h2 className="font-semibold mb-4">New Broadcast</h2>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Write your broadcast message..."
          className="w-full px-4 py-3 rounded-lg border border-gray-300 focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none resize-none h-28"
          required
        />
        <div className="flex items-center gap-4 mt-4">
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm"
          >
            <option value="">All Platforms</option>
            <option value="WHATSAPP">WhatsApp</option>
            <option value="TELEGRAM">Telegram</option>
          </select>
          <button
            type="submit"
            disabled={sending || !content.trim()}
            className="ml-auto px-5 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2"
          >
            {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Send Broadcast
          </button>
        </div>
      </form>

      {/* History */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="font-semibold">Broadcast History</h2>
        </div>
        <div className="divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400">Loading...</div>
          ) : broadcasts.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">No broadcasts yet</div>
          ) : (
            broadcasts.map((b) => (
              <div key={b.id as string} className="px-6 py-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <p className="text-sm whitespace-pre-wrap">{b.content as string}</p>
                    <div className="flex gap-3 mt-2 text-xs text-gray-500">
                      <span>Recipients: {b.recipientCount as number}</span>
                      <span>Sent: {b.successCount as number ?? 0}</span>
                      <span>Failed: {b.failureCount as number ?? 0}</span>
                      {b.targetPlatform ? <span>Platform: {b.targetPlatform as string}</span> : null}
                    </div>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium shrink-0 ${
                    (b.status as string) === 'SENT'
                      ? 'bg-green-100 text-green-700'
                      : (b.status as string) === 'SENDING'
                        ? 'bg-yellow-100 text-yellow-700'
                        : (b.status as string) === 'CANCELLED'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-gray-100 text-gray-600'
                  }`}>
                    {b.status as string}
                  </span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(b.createdAt as string).toLocaleString()}
                </p>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
