import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Database, HardDrive, RefreshCw, Plus, Trash2, RotateCcw, Loader2 } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  FULL: 'bg-blue-100 text-blue-700',
  INCREMENTAL: 'bg-emerald-100 text-emerald-700',
  SNAPSHOT: 'bg-purple-100 text-purple-700',
};

const STATUS_COLORS: Record<string, string> = {
  COMPLETED: 'bg-emerald-100 text-emerald-700',
  IN_PROGRESS: 'bg-blue-100 text-blue-700',
  FAILED: 'bg-red-100 text-red-700',
  PENDING: 'bg-gray-100 text-gray-700',
};

export default function BackupManagerPage() {
  const [backups, setBackups] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [actionId, setActionId] = useState<string | null>(null);
  const [backupType, setBackupType] = useState<'FULL' | 'INCREMENTAL' | 'SNAPSHOT'>('FULL');
  const [fileName, setFileName] = useState('');

  const load = async () => {
    try { const res = await api.getBackups(); setBackups((res.data as any) ?? []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createBackup({ backupType, fileName: fileName || undefined });
      setShowCreateForm(false);
      setFileName('');
      setBackupType('FULL');
      await load();
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this backup? This may overwrite current data.')) return;
    setActionId(id);
    try { await api.restoreBackup(id); await load(); }
    catch (err) { console.error(err); }
    finally { setActionId(null); }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) return;
    setActionId(id);
    try { await api.deleteBackup(id); await load(); }
    catch (err) { console.error(err); }
    finally { setActionId(null); }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '-';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const completed = backups.filter(b => b.status === 'COMPLETED').length;
  const totalSize = backups.reduce((sum, b) => sum + (b.sizeBytes ?? 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Database className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Backup Manager</h1>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowCreateForm(v => !v)} className="flex items-center gap-1.5 px-3 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium"><Plus className="w-4 h-4" />Create Backup</button>
          <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {showCreateForm && (
        <div className="bg-white rounded-xl border p-4 mb-6">
          <h2 className="text-sm font-semibold mb-3">New Backup</h2>
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Type</label>
              <select value={backupType} onChange={e => setBackupType(e.target.value as any)} className="border rounded-lg px-3 py-2 text-sm">
                <option value="FULL">FULL</option>
                <option value="INCREMENTAL">INCREMENTAL</option>
                <option value="SNAPSHOT">SNAPSHOT</option>
              </select>
            </div>
            <div className="flex-1 min-w-[200px]">
              <label className="block text-xs text-gray-500 mb-1">File Name (optional)</label>
              <input type="text" value={fileName} onChange={e => setFileName(e.target.value)} placeholder="Auto-generated if empty" className="border rounded-lg px-3 py-2 text-sm w-full" />
            </div>
            <button onClick={handleCreate} disabled={creating} className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm font-medium disabled:opacity-50">
              {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              {creating ? 'Creating...' : 'Create'}
            </button>
            <button onClick={() => setShowCreateForm(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Cancel</button>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Total Backups</p><p className="text-2xl font-bold">{backups.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-emerald-600">{completed}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Total Size</p><p className="text-2xl font-bold">{formatSize(totalSize)}</p></div>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">Name</th>
              <th className="text-left p-3 font-medium">Type</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Size</th>
              <th className="text-left p-3 font-medium">Created</th>
              <th className="text-left p-3 font-medium">Path</th>
              <th className="text-right p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {backups.map((b) => (
              <tr key={b.id} className="border-t hover:bg-gray-50">
                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <HardDrive className="w-4 h-4 text-gray-400" />
                    <span className="font-medium">{b.name ?? b.filename ?? 'Backup'}</span>
                  </div>
                </td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[b.type] ?? 'bg-gray-100'}`}>{b.type}</span></td>
                <td className="p-3"><span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[b.status] ?? 'bg-gray-100'}`}>{b.status}</span></td>
                <td className="p-3">{formatSize(b.sizeBytes)}</td>
                <td className="p-3 text-xs text-gray-500">{new Date(b.createdAt).toLocaleString()}</td>
                <td className="p-3 text-xs text-gray-400 max-w-xs truncate font-mono">{b.path ?? '-'}</td>
                <td className="p-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {b.status === 'COMPLETED' && (
                      <button onClick={() => handleRestore(b.id)} disabled={actionId === b.id} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100 disabled:opacity-50" title="Restore">
                        {actionId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                        Restore
                      </button>
                    )}
                    <button onClick={() => handleDelete(b.id)} disabled={actionId === b.id} className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100 disabled:opacity-50" title="Delete">
                      {actionId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {backups.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">No backups found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
