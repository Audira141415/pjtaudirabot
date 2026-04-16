import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Database, 
  HardDrive, 
  RefreshCw, 
  Plus, 
  Trash2, 
  RotateCcw, 
  Loader2, 
  ShieldCheck, 
  Zap, 
  Info, 
  ChevronRight, 
  Save, 
  History, 
  FolderSync, 
  FileArchive, 
  Activity, 
  Download, 
  LayoutGrid, 
  MoreHorizontal,
  Search,
  CheckCircle,
  XCircle,
  Clock,
  ExternalLink,
  Target
} from 'lucide-react';
import { toast } from '../components/Toast';

const TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  FULL: { bg: 'bg-indigo-50 dark:bg-indigo-500/10', text: 'text-indigo-600 dark:text-indigo-400', border: 'border-indigo-100 dark:border-indigo-500/20' },
  INCREMENTAL: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20' },
  SNAPSHOT: { bg: 'bg-purple-50 dark:bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-purple-100 dark:border-purple-500/20' },
};

const STATUS_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20', icon: CheckCircle },
  IN_PROGRESS: { bg: 'bg-blue-50 dark:bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-blue-100 dark:border-blue-500/20', icon: Loader2 },
  FAILED: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-500/20', icon: XCircle },
  PENDING: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-400 dark:text-slate-500', border: 'border-slate-100 dark:border-slate-700', icon: Clock },
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
    setLoading(true);
    try { 
      const res = await api.getBackups(); 
      setBackups((res.data as any) ?? []); 
    } catch {
       toast({ type: 'error', title: 'ARCHIVE_ACCESS_FAILURE', message: 'Failed to access state repository.' });
    } finally { 
      setLoading(false); 
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async () => {
    setCreating(true);
    try {
      await api.createBackup({ backupType, fileName: fileName || undefined });
      setShowCreateForm(false);
      setFileName('');
      setBackupType('FULL');
      toast({ type: 'success', title: 'SNAPSHOT_INITIALIZED', message: 'State preservation protocol begun.' });
      await load();
    } catch {
       toast({ type: 'error', title: 'INITIALIZATION_ERROR', message: 'Backup protocol failed to engage.' });
    } finally { 
      setCreating(false); 
    }
  };

  const handleRestore = async (id: string) => {
    if (!confirm('Are you sure you want to restore this backup? This may overwrite current data.')) return;
    setActionId(id);
    try { 
      await api.restoreBackup(id); 
      toast({ type: 'success', title: 'STATE_RECONSTITUTION_ACTIVE', message: 'System state is being recalibrated.' });
      await load(); 
    } catch {
       toast({ type: 'error', title: 'RESTORE_FAILURE', message: 'Reconstitution protocol failed.' });
    } finally { 
      setActionId(null); 
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this backup? This action cannot be undone.')) return;
    setActionId(id);
    try { 
      await api.deleteBackup(id); 
      toast({ type: 'success', title: 'ARCHIVE_PURGED', message: 'State record permanently decommissioned.' });
      await load(); 
    } catch {
       toast({ type: 'error', title: 'PURGE_FAILURE', message: 'Record deletion failed.' });
    } finally { 
      setActionId(null); 
    }
  };

  const formatSize = (bytes: number) => {
    if (!bytes) return '0 B';
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1073741824) return `${(bytes / 1048576).toFixed(1)} MB`;
    return `${(bytes / 1073741824).toFixed(2)} GB`;
  };

  if (loading && backups.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Scanning State Repository...</span>
    </div>
  );

  const completed = backups.filter(b => b.status === 'COMPLETED').length;
  const totalSize = backups.reduce((sum, b) => sum + (b.sizeBytes ?? 0), 0);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <History className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Temporal Redundancy Matrix</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Backup Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Manage system state snapshots, orchestrate disaster recovery, and monitor storage archival integrity.</p>
        </div>

        <div className="flex items-center gap-4">
           <button 
              onClick={() => setShowCreateForm(v => !v)} 
              className="px-8 py-5 rounded-[32px] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 flex items-center gap-3 transition-all hover:scale-[1.05] active:scale-95 shadow-2xl shadow-indigo-600/20 border-2 border-indigo-400/20"
           >
             <Plus className="w-4 h-4" /> Initialize State Snapshot
           </button>
           <button 
              onClick={load} 
              className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-600 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Deployment Form */}
      {showCreateForm && (
        <div className="bg-white dark:bg-slate-950/40 border-2 border-dashed border-indigo-500/30 rounded-[48px] p-10 shadow-inner animate-in slide-in-from-top-4 duration-500 backdrop-blur-3xl">
          <div className="flex items-center gap-3 mb-8">
             <Save className="w-5 h-5 text-indigo-500" />
             <h2 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Preservation Settings</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="space-y-4">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Preservation Type</label>
               <select 
                  value={backupType} 
                  onChange={e => setBackupType(e.target.value as any)} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[24px] text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all cursor-pointer shadow-inner"
               >
                 <option value="FULL">FULL_ARCHIVE</option>
                 <option value="INCREMENTAL">INCREMENTAL_DELTA</option>
                 <option value="SNAPSHOT">TEMPORAL_SNAPSHOT</option>
               </select>
            </div>
            <div className="md:col-span-2 space-y-4">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Archive Descriptor (Optional)</label>
               <input 
                  type="text" 
                  value={fileName} 
                  onChange={e => setFileName(e.target.value)} 
                  placeholder="AUTO_GENERATED_UUID" 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[24px] text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700 shadow-inner" 
               />
            </div>
          </div>
          <div className="flex justify-end gap-4 mt-10 pt-8 border-t border-slate-100 dark:border-white/5">
             <button onClick={() => setShowCreateForm(false)} className="px-8 py-4 text-[10px] font-black tracking-widest uppercase text-slate-400 hover:text-rose-500 transition-colors">Abort</button>
             <button 
                onClick={handleCreate} 
                disabled={creating} 
                className="px-10 py-4 bg-emerald-600 text-white rounded-[20px] text-[10px] font-black tracking-widest uppercase items-center gap-3 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50 flex shadow-2xl shadow-emerald-500/20"
             >
                {creating ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                Execute Preservation Protocol
             </button>
          </div>
        </div>
      )}

      {/* Scalar Registry Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[
          { label: 'Total Snapshots', value: backups.length, icon: FileArchive, color: 'text-indigo-600 dark:text-indigo-400', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
          { label: 'Verified Complete', value: completed, icon: ShieldCheck, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-500/10' },
          { label: 'Matrix Storage Mass', value: formatSize(totalSize), icon: HardDrive, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-500/10' }
        ].map((stat, i) => (
          <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-10 rounded-[48px] flex items-center gap-8 group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none hover:shadow-xl relative overflow-hidden backdrop-blur-3xl">
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity" />
             <div className={`p-5 rounded-[24px] ${stat.bg} shadow-inner group-hover:scale-110 transition-transform`}>
                <stat.icon className={`w-8 h-8 ${stat.color}`} />
             </div>
             <div>
                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1">{stat.label}</p>
                <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{stat.value}</p>
             </div>
          </div>
        ))}
      </div>

      {/* Snapshot Ledger (Table) */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">
              <tr>
                <th className="px-10 py-6">Redundancy Node</th>
                <th className="px-8 py-6">Archival Type</th>
                <th className="px-8 py-6">Verification Status</th>
                <th className="px-8 py-6">Entropy Mass</th>
                <th className="px-8 py-6">Temporal Fix</th>
                <th className="px-10 py-6 text-right">Operational Overrides</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30 font-bold">
              {backups.map((b) => {
                const s = STATUS_STYLES[b.status] || STATUS_STYLES.PENDING;
                const t = TYPE_STYLES[b.type] || { bg: 'bg-slate-50', text: 'text-slate-400', border: 'border-slate-100' };
                const Icon = s.icon;
                return (
                  <tr key={b.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-300">
                    <td className="px-10 py-6">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-slate-100 dark:bg-slate-800 rounded-xl group-hover:scale-110 transition-transform">
                           <HardDrive className="w-4 h-4 text-slate-400" />
                        </div>
                        <div className="flex flex-col">
                           <span className="text-[11px] font-black text-slate-900 dark:text-white italic tracking-tight uppercase group-hover:text-indigo-600 transition-colors truncate max-w-[180px]">{b.name ?? b.filename ?? 'RESERVE_BACKUP'}</span>
                           <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 mt-1 uppercase tracking-widest truncate max-w-[140px] font-mono">{b.path ?? 'INTERNAL_FS'}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${t.bg} ${t.text} ${t.border}`}>
                          {b.type}
                       </span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <div className={`p-1.5 rounded-lg ${s.bg} ${s.text}`}>
                             <Icon className={`w-3 h-3 ${b.status === 'IN_PROGRESS' ? 'animate-spin' : ''}`} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest ${s.text}`}>{b.status}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <span className="text-[11px] font-black text-slate-900 dark:text-slate-400 italic">{formatSize(b.sizeBytes)}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 dark:text-white italic uppercase tracking-tight leading-none">{new Date(b.createdAt).toLocaleDateString()}</span>
                          <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 mt-1 uppercase tracking-widest">{new Date(b.createdAt).toLocaleTimeString()}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                      <div className="flex items-center justify-end gap-3 opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                        {b.status === 'COMPLETED' && (
                          <button 
                             onClick={() => handleRestore(b.id)} 
                             disabled={actionId === b.id} 
                             className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-xl hover:bg-indigo-600 hover:text-white transition-all shadow-sm active:scale-95"
                          >
                            {actionId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                            Restore
                          </button>
                        )}
                        <button 
                           onClick={() => handleDelete(b.id)} 
                           disabled={actionId === b.id} 
                           className="flex items-center gap-2 px-4 py-2 text-[9px] font-black uppercase tracking-widest text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all shadow-sm active:scale-95"
                        >
                          {actionId === b.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                          Purge
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {backups.length === 0 && (
                <tr>
                   <td colSpan={6} className="px-10 py-32 text-center grayscale opacity-10">
                      <Database className="w-20 h-20 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Redundancy Nodes Found</p>
                   </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">State Preservation Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Redundancy Matrix Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Temporal redundancy ensures 100% data durability across disaster recovery horizons.</span>
         </div>
      </div>
    </div>
  );
}
