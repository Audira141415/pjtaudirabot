import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Shield, Trash2, Plus, Loader2, AlertTriangle } from 'lucide-react';

interface ModerationRule {
  id: string;
  type: string;
  pattern: string;
  action: string;
  reason: string | null;
  isActive: boolean;
  createdAt: string;
}

interface ModerationLog {
  id: string;
  action: string;
  reason: string | null;
  content: string | null;
  createdAt: string;
  user?: { name: string; platform: string };
}

export default function ModerationPage() {
  const [rules, setRules] = useState<ModerationRule[]>([]);
  const [logs, setLogs] = useState<ModerationLog[]>([]);
  const [tab, setTab] = useState<'rules' | 'logs'>('rules');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ type: 'WORD_FILTER', pattern: '', action: 'WARN', reason: '' });
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (tab === 'rules') {
          const res = await api.getModerationRules();
          setRules(res.data as unknown as ModerationRule[]);
        } else {
          const res = await api.getModerationLogs();
          setLogs(res.data as unknown as ModerationLog[]);
        }
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [tab]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.createModerationRule(form);
      setRules((prev) => [res.data as unknown as ModerationRule, ...prev]);
      setShowForm(false);
      setForm({ type: 'WORD_FILTER', pattern: '', action: 'WARN', reason: '' });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create rule');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this rule?')) return;
    try {
      await api.deleteModerationRule(id);
      setRules((prev) => prev.filter((r) => r.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete rule');
    }
  };

  const actionColor: Record<string, string> = {
    WARN: 'bg-yellow-100 text-yellow-700',
    MUTE: 'bg-orange-100 text-orange-700',
    BAN: 'bg-red-100 text-red-700',
    DELETE: 'bg-gray-100 text-gray-700',
  };

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Shield className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Moderation</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 w-fit mb-6">
        <button
          onClick={() => setTab('rules')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'rules' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Rules
        </button>
        <button
          onClick={() => setTab('logs')}
          className={`px-4 py-2 rounded-md text-sm font-medium transition ${tab === 'logs' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          Logs
        </button>
      </div>

      {tab === 'rules' && (
        <>
          <div className="flex justify-end mb-4">
            <button
              onClick={() => setShowForm(!showForm)}
              className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 flex items-center gap-2 text-sm"
            >
              <Plus className="w-4 h-4" /> Add Rule
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6 grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Type</label>
                <select
                  value={form.type}
                  onChange={(e) => setForm({ ...form, type: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="WORD_FILTER">Word Filter</option>
                  <option value="REGEX">Regex</option>
                  <option value="SPAM">Spam Detection</option>
                  <option value="LINK">Link Filter</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Action</label>
                <select
                  value={form.action}
                  onChange={(e) => setForm({ ...form, action: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                >
                  <option value="WARN">Warn</option>
                  <option value="MUTE">Mute</option>
                  <option value="BAN">Ban</option>
                  <option value="DELETE">Delete</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Pattern</label>
                <input
                  value={form.pattern}
                  onChange={(e) => setForm({ ...form, pattern: e.target.value })}
                  placeholder="e.g. badword or /regex/i"
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-sm font-medium mb-1">Reason (optional)</label>
                <input
                  value={form.reason}
                  onChange={(e) => setForm({ ...form, reason: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                />
              </div>
              <div className="col-span-2 flex justify-end gap-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
                <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
                  {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Rule
                </button>
              </div>
            </form>
          )}

          <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Type</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Pattern</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Action</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Reason</th>
                  <th className="text-left px-6 py-3 font-medium text-gray-500">Active</th>
                  <th className="text-right px-6 py-3"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {loading ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">Loading...</td></tr>
                ) : rules.length === 0 ? (
                  <tr><td colSpan={6} className="px-6 py-8 text-center text-gray-400">No moderation rules</td></tr>
                ) : (
                  rules.map((rule) => (
                    <tr key={rule.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 font-mono text-xs">{rule.type}</td>
                      <td className="px-6 py-3 font-mono text-xs max-w-[200px] truncate">{rule.pattern}</td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor[rule.action] ?? 'bg-gray-100 text-gray-600'}`}>
                          {rule.action}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">{rule.reason ?? '-'}</td>
                      <td className="px-6 py-3">
                        <span className={`w-2 h-2 rounded-full inline-block ${rule.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                      </td>
                      <td className="px-6 py-3 text-right">
                        <button onClick={() => handleDelete(rule.id)} className="text-gray-400 hover:text-red-600">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </>
      )}

      {tab === 'logs' && (
        <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
          {loading ? (
            <div className="px-6 py-8 text-center text-gray-400">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="px-6 py-8 text-center text-gray-400">No moderation logs</div>
          ) : (
            logs.map((log) => (
              <div key={log.id} className="px-6 py-4 flex items-start gap-4">
                <AlertTriangle className="w-5 h-5 text-orange-500 mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${actionColor[log.action] ?? 'bg-gray-100 text-gray-600'}`}>{log.action}</span>
                    <span className="text-sm font-medium">{log.user?.name ?? 'Unknown'}</span>
                    <span className="text-xs text-gray-400">{log.user?.platform}</span>
                  </div>
                  {log.reason && <p className="text-sm text-gray-600 mt-1">{log.reason}</p>}
                  {log.content && <p className="text-xs font-mono text-gray-400 mt-1 truncate">{log.content}</p>}
                  <p className="text-xs text-gray-400 mt-1">{new Date(log.createdAt).toLocaleString()}</p>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
