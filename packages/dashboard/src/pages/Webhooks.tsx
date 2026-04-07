import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Webhook, Trash2, Plus, Loader2, Copy, CheckCircle } from 'lucide-react';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ url: '', events: ['message.received'], secret: '' });

  const allEvents = [
    'message.received',
    'message.sent',
    'command.executed',
    'user.created',
    'user.updated',
    'broadcast.sent',
    'moderation.action',
  ];

  useEffect(() => {
    api.getWebhooks()
      .then((res) => setWebhooks(res.data as unknown as WebhookConfig[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.createWebhook({
        url: form.url,
        events: form.events,
        secret: form.secret || undefined,
      });
      setWebhooks((prev) => [res.data as unknown as WebhookConfig, ...prev]);
      setShowForm(false);
      setForm({ url: '', events: ['message.received'], secret: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create webhook');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this webhook?')) return;
    try {
      await api.deleteWebhook(id);
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete');
    }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Webhook className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Webhooks</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> Add Webhook
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Endpoint URL</label>
            <input
              type="url"
              value={form.url}
              onChange={(e) => setForm({ ...form, url: e.target.value })}
              placeholder="https://example.com/webhook"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none"
              required
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Secret (optional)</label>
            <input
              type="text"
              value={form.secret}
              onChange={(e) => setForm({ ...form, secret: e.target.value })}
              placeholder="Signing secret for verifying payloads"
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Events</label>
            <div className="flex flex-wrap gap-2">
              {allEvents.map((event) => (
                <button
                  key={event}
                  type="button"
                  onClick={() => toggleEvent(event)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
                    form.events.includes(event)
                      ? 'bg-brand-50 border-brand-300 text-brand-700'
                      : 'bg-white border-gray-200 text-gray-500 hover:border-gray-300'
                  }`}
                >
                  {event}
                </button>
              ))}
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={submitting || form.events.length === 0} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Webhook
            </button>
          </div>
        </form>
      )}

      {/* Webhook List */}
      <div className="space-y-4">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-gray-400">Loading...</div>
        ) : webhooks.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-gray-400">No webhooks configured</div>
        ) : (
          webhooks.map((wh) => (
            <div key={wh.id} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-2">
                    <span className={`w-2 h-2 rounded-full ${wh.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-mono text-sm truncate">{wh.url}</span>
                    <button
                      onClick={() => copyToClipboard(wh.url, wh.id)}
                      className="text-gray-400 hover:text-gray-600 shrink-0"
                    >
                      {copied === wh.id ? <CheckCircle className="w-3.5 h-3.5 text-green-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mb-2">
                    {wh.events.map((ev) => (
                      <span key={ev} className="px-2 py-0.5 rounded bg-gray-100 text-gray-600 text-xs font-mono">{ev}</span>
                    ))}
                  </div>
                  <div className="flex gap-4 text-xs text-gray-400">
                    <span>Created: {new Date(wh.createdAt).toLocaleDateString()}</span>
                    {wh.lastTriggeredAt && <span>Last triggered: {new Date(wh.lastTriggeredAt).toLocaleString()}</span>}
                    {wh.secret && <span className="text-green-600">Signed</span>}
                  </div>
                </div>
                <button onClick={() => handleDelete(wh.id)} className="text-gray-400 hover:text-red-600 shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
