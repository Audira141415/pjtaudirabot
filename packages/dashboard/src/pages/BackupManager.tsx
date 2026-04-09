import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Database, HardDrive, RefreshCw } from 'lucide-react';

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

  const load = async () => {
    try { const res = await api.getBackups(); setBackups((res.data as any) ?? []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

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
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
      </div>

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
              </tr>
            ))}
            {backups.length === 0 && <tr><td colSpan={6} className="text-center py-12 text-gray-400">No backups found</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
