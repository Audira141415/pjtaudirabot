import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Settings, Bot, Smartphone, Save, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'bot' | 'sessions'>('bot');
  const [configs, setConfigs] = useState<Array<Record<string, any>>>([]);
  const [sessions, setSessions] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  const load = async () => {
    try {
      const [c, s] = await Promise.all([api.getBotConfigs(), api.getActiveSessions()]);
      const configData = (c.data as any) ?? [];
      setConfigs(configData);
      setSessions((s.data as any) ?? []);
      const vals: Record<string, string> = {};
      configData.forEach((cfg: any) => { vals[cfg.key] = typeof cfg.value === 'object' ? JSON.stringify(cfg.value) : String(cfg.value ?? ''); });
      setEditValues(vals);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const saveConfig = async (key: string) => {
    try {
      let value: any = editValues[key];
      try { value = JSON.parse(value); } catch { /* keep as string */ }
      await api.updateBotConfig(key, value);
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Settings</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('bot')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'bot' ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>
            <Bot className="w-4 h-4 inline mr-1" />Bot Config
          </button>
          <button onClick={() => setTab('sessions')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'sessions' ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>
            <Smartphone className="w-4 h-4 inline mr-1" />Sessions
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {tab === 'bot' && (
        <div className="space-y-3">
          {configs.map((cfg) => (
            <div key={cfg.key ?? cfg.id} className="bg-white rounded-xl border p-4">
              <div className="flex items-start justify-between mb-2">
                <div>
                  <h3 className="font-bold font-mono text-sm">{cfg.key}</h3>
                  {cfg.description && <p className="text-xs text-gray-500">{cfg.description}</p>}
                </div>
                <button onClick={() => saveConfig(cfg.key)} className="flex items-center gap-1 px-2 py-1 bg-brand-500 text-white rounded text-xs hover:bg-brand-600">
                  <Save className="w-3 h-3" /> Save
                </button>
              </div>
              <input
                value={editValues[cfg.key] ?? ''}
                onChange={e => setEditValues({ ...editValues, [cfg.key]: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm font-mono"
              />
              {cfg.category && <span className="text-xs text-gray-400 mt-1 inline-block">{cfg.category}</span>}
            </div>
          ))}
          {configs.length === 0 && <div className="text-center py-12 text-gray-400">No configuration entries</div>}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="bg-white rounded-xl border overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-3 font-medium">Platform</th>
                <th className="text-left p-3 font-medium">User</th>
                <th className="text-left p-3 font-medium">Status</th>
                <th className="text-left p-3 font-medium">Started</th>
                <th className="text-left p-3 font-medium">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700">{s.platform ?? 'unknown'}</span>
                  </td>
                  <td className="p-3">{s.user?.name ?? s.userId ?? s.chatId ?? '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.active !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.active !== false ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500">{new Date(s.createdAt).toLocaleString()}</td>
                  <td className="p-3 text-xs text-gray-500">{s.lastActiveAt ? new Date(s.lastActiveAt).toLocaleString() : '-'}</td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">No active sessions</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
