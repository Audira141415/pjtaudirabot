import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Settings, Bot, Smartphone, RefreshCw, Wifi, WifiOff, Pencil, Save, X, Trash2 } from 'lucide-react';

export default function SettingsPage() {
  const [tab, setTab] = useState<'bot' | 'sessions'>('bot');
  const [configs, setConfigs] = useState<Array<Record<string, any>>>([]);
  const [sessions, setSessions] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState<string | null>(null);
  const [editingPlatform, setEditingPlatform] = useState<string | null>(null);
  const [editConfig, setEditConfig] = useState<Record<string, string>>({});
  const [savingConfig, setSavingConfig] = useState(false);
  const [revokingId, setRevokingId] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [c, s] = await Promise.all([
        api.getBotConfigs(),
        api.getActiveSessions().catch(() => ({ data: [] })),
      ]);
      setConfigs((c.data as any) ?? []);
      setSessions((s.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleToggleActive = async (platform: string, currentActive: boolean) => {
    setToggling(platform);
    try {
      await api.updateBotConfig(platform, { isActive: !currentActive });
      await load();
    } catch (err) { console.error(err); }
    finally { setToggling(null); }
  };

  const startEditing = (cfg: Record<string, any>) => {
    const configObj = (cfg.configuration ?? {}) as Record<string, any>;
    const stringified: Record<string, string> = {};
    for (const [k, v] of Object.entries(configObj)) {
      stringified[k] = String(v);
    }
    setEditConfig(stringified);
    setEditingPlatform(cfg.platform);
  };

  const cancelEditing = () => {
    setEditingPlatform(null);
    setEditConfig({});
  };

  const handleSaveConfig = async (platform: string) => {
    setSavingConfig(true);
    try {
      await api.updateBotConfig(platform, { configuration: editConfig });
      setEditingPlatform(null);
      setEditConfig({});
      await load();
    } catch (err) { console.error(err); }
    finally { setSavingConfig(false); }
  };

  const handleRevokeSession = async (id: string) => {
    setRevokingId(id);
    try {
      await api.revokeSession(id);
      await load();
    } catch (err) { console.error(err); }
    finally { setRevokingId(null); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const STATUS_COLOR: Record<string, string> = {
    CONNECTED: 'bg-emerald-100 text-emerald-700',
    DISCONNECTED: 'bg-red-100 text-red-700',
    CONNECTING: 'bg-amber-100 text-amber-700',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Settings className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold dark:text-white">Settings</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('bot')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'bot' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
            <Bot className="w-4 h-4 inline mr-1" />Bot Config
          </button>
          <button onClick={() => setTab('sessions')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'sessions' ? 'bg-brand-500 text-white' : 'bg-gray-100 dark:bg-gray-700 dark:text-gray-300'}`}>
            <Smartphone className="w-4 h-4 inline mr-1" />Sessions
          </button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700"><RefreshCw className="w-4 h-4 dark:text-gray-300" /></button>
        </div>
      </div>

      {tab === 'bot' && (
        <div className="space-y-4">
          {configs.length === 0 && <div className="text-center py-12 text-gray-400">Tidak ada konfigurasi bot</div>}
          {configs.map((cfg) => (
            <div key={cfg.id} className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  {cfg.connectionStatus === 'CONNECTED' ? <Wifi className="w-5 h-5 text-emerald-500" /> : <WifiOff className="w-5 h-5 text-red-400" />}
                  <div>
                    <h3 className="font-bold text-lg dark:text-white">{cfg.platform}</h3>
                    <p className="text-xs text-gray-500 dark:text-gray-400">ID: {cfg.id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[cfg.connectionStatus] || 'bg-gray-100 text-gray-600'}`}>
                    {cfg.connectionStatus}
                  </span>
                  {/* Active toggle */}
                  <button
                    onClick={() => handleToggleActive(cfg.platform, cfg.isActive)}
                    disabled={toggling === cfg.platform}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 ${
                      cfg.isActive ? 'bg-emerald-500' : 'bg-gray-300 dark:bg-gray-600'
                    } ${toggling === cfg.platform ? 'opacity-50 cursor-wait' : 'cursor-pointer'}`}
                    title={cfg.isActive ? 'Nonaktifkan bot' : 'Aktifkan bot'}
                  >
                    <span
                      className={`inline-block h-4 w-4 rounded-full bg-white transition-transform ${
                        cfg.isActive ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                  <span className="text-xs font-medium text-gray-500 dark:text-gray-400 min-w-[55px]">
                    {cfg.isActive ? 'Aktif' : 'Nonaktif'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Version</p>
                  <p className="font-semibold text-sm dark:text-white">{cfg.version || '-'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Last Connected</p>
                  <p className="font-semibold text-sm dark:text-white">{cfg.lastConnectedAt ? new Date(cfg.lastConnectedAt).toLocaleString('id-ID') : 'Belum pernah'}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Created</p>
                  <p className="font-semibold text-sm dark:text-white">{new Date(cfg.createdAt).toLocaleString('id-ID')}</p>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3">
                  <p className="text-xs text-gray-500 dark:text-gray-400">Updated</p>
                  <p className="font-semibold text-sm dark:text-white">{new Date(cfg.updatedAt).toLocaleString('id-ID')}</p>
                </div>
              </div>

              {cfg.configuration && (
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-medium text-gray-600 dark:text-gray-400">Configuration</p>
                    {editingPlatform === cfg.platform ? (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSaveConfig(cfg.platform)}
                          disabled={savingConfig}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-brand-500 text-white hover:bg-brand-600 disabled:opacity-50 disabled:cursor-wait"
                        >
                          <Save className="w-3.5 h-3.5" />Save
                        </button>
                        <button
                          onClick={cancelEditing}
                          className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                        >
                          <X className="w-3.5 h-3.5" />Cancel
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing(cfg)}
                        className="inline-flex items-center gap-1 px-3 py-1 text-xs font-medium rounded-lg bg-gray-200 dark:bg-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-500"
                      >
                        <Pencil className="w-3.5 h-3.5" />Edit
                      </button>
                    )}
                  </div>

                  {editingPlatform === cfg.platform ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-3">
                      {Object.entries(editConfig).map(([k, v]) => (
                        <div key={k} className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                          <label className="text-sm font-mono text-gray-600 dark:text-gray-400 sm:min-w-[160px] shrink-0">{k}</label>
                          <input
                            type="text"
                            value={v}
                            onChange={(e) => setEditConfig({ ...editConfig, [k]: e.target.value })}
                            className="flex-1 text-sm font-mono rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-200 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-500"
                          />
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-3 space-y-2">
                      {Object.entries(cfg.configuration as Record<string, any>).map(([k, v]) => (
                        <div key={k} className="flex items-center justify-between">
                          <span className="text-sm font-mono text-gray-600 dark:text-gray-400">{k}</span>
                          <span className="text-sm font-mono text-gray-800 dark:text-gray-200">{typeof v === 'string' && v.length > 20 ? v.substring(0, 20) + '...' : String(v)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tab === 'sessions' && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border dark:border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="text-left p-3 font-medium dark:text-gray-300">Platform</th>
                <th className="text-left p-3 font-medium dark:text-gray-300">User</th>
                <th className="text-left p-3 font-medium dark:text-gray-300">Status</th>
                <th className="text-left p-3 font-medium dark:text-gray-300">Started</th>
                <th className="text-left p-3 font-medium dark:text-gray-300">Expires</th>
                <th className="text-left p-3 font-medium dark:text-gray-300">Revoke</th>
              </tr>
            </thead>
            <tbody>
              {sessions.map((s) => (
                <tr key={s.id} className="border-t dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-750">
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded text-xs font-medium bg-brand-50 text-brand-700">{s.platform ?? 'unknown'}</span>
                  </td>
                  <td className="p-3 text-sm dark:text-gray-300">{s.user?.name ?? s.userId ?? s.chatId ?? '-'}</td>
                  <td className="p-3">
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${s.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                      {s.isActive ? 'Active' : 'Expired'}
                    </span>
                  </td>
                  <td className="p-3 text-xs text-gray-500 dark:text-gray-400">{s.createdAt ? new Date(s.createdAt).toLocaleString('id-ID') : '-'}</td>
                  <td className="p-3 text-xs text-gray-500 dark:text-gray-400">{s.expiresAt ? new Date(s.expiresAt).toLocaleString('id-ID') : '-'}</td>
                  <td className="p-3">
                    {s.isActive && (
                      <button
                        onClick={() => handleRevokeSession(s.id)}
                        disabled={revokingId === s.id}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg bg-red-100 text-red-700 hover:bg-red-200 dark:bg-red-900/30 dark:text-red-400 dark:hover:bg-red-900/50 disabled:opacity-50 disabled:cursor-wait"
                      >
                        <Trash2 className="w-3.5 h-3.5" />Revoke
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {sessions.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">Tidak ada session aktif</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
