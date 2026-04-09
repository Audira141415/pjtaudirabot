import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const FEATURES: { key: string; label: string; description: string; icon: string }[] = [
  { key: 'SPAM_DETECTION', label: 'Deteksi Spam', description: 'Otomatis deteksi dan hapus pesan spam yang berulang', icon: '🛡️' },
  { key: 'PROFANITY_FILTER', label: 'Filter Kata Kasar', description: 'Cegah penggunaan kata-kata tidak pantas dalam grup', icon: '🤐' },
  { key: 'LINK_FILTER', label: 'Filter Link', description: 'Blokir link yang tidak diizinkan di dalam grup', icon: '🔗' },
  { key: 'CAPS_DETECTION', label: 'Deteksi Huruf Besar', description: 'Peringatan untuk pesan yang terlalu banyak CAPSLOCK', icon: '🔠' },
  { key: 'INVITE_FILTER', label: 'Filter Undangan Grup', description: 'Blokir link undangan grup lain', icon: '🚫' },
  { key: 'MEDIA_FILTER', label: 'Filter Media', description: 'Batasi jenis media yang boleh dikirim', icon: '📷' },
  { key: 'NEW_MEMBER_RESTRICT', label: 'Restriksi Member Baru', description: 'Batasi aksi member baru selama periode tertentu', icon: '👤' },
];

const ACTIONS = [
  { value: 'WARN', label: 'Peringatan' },
  { value: 'BLOCK', label: 'Blokir Pesan' },
  { value: 'MUTE', label: 'Mute' },
  { value: 'BAN', label: 'Ban' },
];

interface ModConfig {
  id?: string;
  feature: string;
  isEnabled: boolean;
  config: Record<string, unknown>;
  action: string;
  message: string;
}

export default function AutoModeration() {
  const [configs, setConfigs] = useState<ModConfig[]>([]);
  const [editing, setEditing] = useState<string | null>(null);
  const [editAction, setEditAction] = useState('WARN');
  const [editMessage, setEditMessage] = useState('');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getAutoModeration();
      setConfigs(res.data as unknown as ModConfig[]);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const getConfig = (feature: string): ModConfig | undefined => configs.find(c => c.feature === feature);

  const handleToggle = async (feature: string) => {
    const existing = getConfig(feature);
    await api.updateAutoModeration(feature, { isEnabled: !existing?.isEnabled, action: existing?.action || 'WARN', message: existing?.message || '' });
    load();
  };

  const handleEdit = (feature: string) => {
    const existing = getConfig(feature);
    setEditing(feature);
    setEditAction(existing?.action || 'WARN');
    setEditMessage(existing?.message || '');
  };

  const handleSave = async () => {
    if (!editing) return;
    await api.updateAutoModeration(editing, { action: editAction, message: editMessage });
    setEditing(null);
    load();
  };

  const enabledCount = configs.filter(c => c.isEnabled).length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Auto-Moderation</h1>
          <p className="text-sm text-gray-500 mt-1">Konfigurasi moderasi otomatis untuk grup</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="px-4 py-2 bg-white rounded-xl shadow text-center">
            <p className="text-2xl font-bold text-emerald-600">{enabledCount}</p>
            <p className="text-xs text-gray-500">Fitur Aktif</p>
          </div>
          <div className="px-4 py-2 bg-white rounded-xl shadow text-center">
            <p className="text-2xl font-bold text-gray-400">{FEATURES.length - enabledCount}</p>
            <p className="text-xs text-gray-500">Nonaktif</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {FEATURES.map(f => {
            const config = getConfig(f.key);
            const isEnabled = config?.isEnabled ?? false;
            const isEditing = editing === f.key;

            return (
              <div key={f.key} className={`bg-white rounded-xl shadow p-5 border-2 transition-colors ${isEnabled ? 'border-emerald-200' : 'border-transparent'}`}>
                <div className="flex items-start gap-3">
                  <span className="text-2xl">{f.icon}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h3 className="font-semibold text-gray-800">{f.label}</h3>
                      <button onClick={() => handleToggle(f.key)}
                        className={`relative w-12 h-6 rounded-full transition-colors ${isEnabled ? 'bg-emerald-500' : 'bg-gray-300'}`}>
                        <div className={`absolute w-5 h-5 bg-white rounded-full top-0.5 transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-0.5'}`} />
                      </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">{f.description}</p>

                    {isEnabled && !isEditing && (
                      <div className="mt-3 flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${config?.action === 'BAN' ? 'bg-red-100 text-red-700' : config?.action === 'KICK' ? 'bg-orange-100 text-orange-700' : config?.action === 'MUTE' ? 'bg-amber-100 text-amber-700' : config?.action === 'DELETE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                          Aksi: {ACTIONS.find(a => a.value === config?.action)?.label || 'Peringatan'}
                        </span>
                        {config?.message && <span className="text-xs text-gray-400 truncate max-w-[200px]">"{config.message}"</span>}
                        <button onClick={() => handleEdit(f.key)} className="ml-auto text-xs text-indigo-500 hover:text-indigo-700">✏️ Edit</button>
                      </div>
                    )}

                    {isEditing && (
                      <div className="mt-3 space-y-2 p-3 bg-gray-50 rounded-lg">
                        <div>
                          <label className="text-xs font-medium text-gray-600">Aksi saat terdeteksi:</label>
                          <select className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm" value={editAction} onChange={e => setEditAction(e.target.value)}>
                            {ACTIONS.map(a => (
                              <option key={a.value} value={a.value}>{a.label}</option>
                            ))}
                          </select>
                        </div>
                        <div>
                          <label className="text-xs font-medium text-gray-600">Pesan peringatan (opsional):</label>
                          <input className="w-full mt-1 px-3 py-1.5 border rounded-lg text-sm" placeholder="Pesan otomatis saat terdeteksi..." value={editMessage} onChange={e => setEditMessage(e.target.value)} />
                        </div>
                        <div className="flex gap-2 justify-end">
                          <button onClick={() => setEditing(null)} className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700">Batal</button>
                          <button onClick={handleSave} className="px-3 py-1 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">Simpan</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
