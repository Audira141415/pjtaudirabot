import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  Users, 
  Shield, 
  ShieldAlert, 
  ShieldCheck, 
  Trash2, 
  UserX, 
  UserCheck, 
  MessageCircle, 
  Send,
  Filter,
  Clock,
  Ban,
  Monitor,
  RefreshCw,
  Orbit,
  Layers,
  Cpu,
  Fingerprint,
  Activity,
  MoreHorizontal,
  ChevronDown,
  Lock,
  Zap,
  CheckCircle2,
  Info
} from 'lucide-react';
import { toast } from '../components/Toast';

// Platform components
const PlatformBadge = ({ platform }: { platform: string }) => {
  if (platform === 'WHATSAPP') return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner backdrop-blur-md">
      <MessageCircle className="w-3.5 h-3.5" />
      WhatsApp
    </div>
  );
  return (
    <div className="flex items-center gap-2 px-4 py-1.5 bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border border-sky-100 dark:border-sky-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest shadow-inner backdrop-blur-md">
      <Send className="w-3.5 h-3.5" />
      Telegram
    </div>
  );
};

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const limit = 12;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.getUsers(page, limit, search || undefined);
      setUsers(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
       toast({ type: 'error', title: 'REGISTRY_SYNC_FAILURE', message: 'Failed to access global identity matrix.' });
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Purge identity "${name}" from the registry? This action is immutable.`)) return;
    try {
      await api.deleteUser(id);
      toast({ type: 'success', title: 'IDENTITY_PURGED', message: 'The user has been decommissioned from the matrix.' });
      loadData();
    } catch (err) {
       toast({ type: 'error', title: 'PURGE_FAILURE', message: 'The decommissioning protocol was rejected.' });
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    setIsUpdating(true);
    try {
      await api.updateUser(id, { role });
      toast({ type: 'success', title: 'PRIVILEGE_MODIFIED', message: `Permissions updated to ${role} archetype.` });
      setSelectedUser(null);
      loadData();
    } catch (err) {
       toast({ type: 'error', title: 'PRIVILEGE_ERROR', message: 'Failed to modify access permissions.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, isActive: boolean) => {
    setIsUpdating(true);
    try {
      await api.updateUser(id, { status, isActive });
      toast({ type: 'info', title: 'STATE_MODIFIED', message: `Identity state transitioned to ${status}.` });
      setSelectedUser(null);
      loadData();
    } catch (err) {
       toast({ type: 'error', title: 'STATE_ERROR', message: 'The state transition command was rejected.' });
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 font-primary">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Identity Governance Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">User Intelligence</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Inspect platform participation, cross-regional access privileges, and moderation states.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] min-w-[160px] backdrop-blur-3xl group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
             <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">GLOBAL_HANDLES</div>
             <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{total}</div>
          </div>
          <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] min-w-[160px] backdrop-blur-3xl group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-amber-500/20 group-hover:bg-amber-500 transition-colors" />
             <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">NODAL_ADMINS</div>
             <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{users.filter(u => u.role === 'ADMIN').length}</div>
          </div>
          <button 
             onClick={loadData} 
             className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
          >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Cluster */}
      <div className="flex flex-col sm:flex-row gap-5">
        <div className="relative flex-1 group">
          <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
          <input
            type="text"
            placeholder="Interrogate by ID, Name, or Connection Handle..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white pl-16 pr-8 py-5 rounded-[32px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold text-sm tracking-tight shadow-sm"
          />
        </div>
        <button className="px-10 py-5 bg-white dark:bg-slate-900 text-slate-500 dark:text-slate-400 rounded-[32px] border border-slate-100 dark:border-slate-800 flex items-center gap-4 font-black text-[10px] uppercase tracking-widest hover:border-indigo-500/30 hover:text-indigo-600 transition-all active:scale-95 shadow-sm">
          <Filter className="w-4 h-4" /> FILTERS
        </button>
      </div>

      {/* Identity Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
        {loading && users.length === 0 ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-80 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[48px] animate-pulse shadow-sm" />
          ))
        ) : users.length === 0 ? (
          <div className="col-span-full py-48 text-center bg-white dark:bg-slate-950/20 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-20 grayscale shadow-inner">
            <UserX className="w-24 h-24 text-slate-300 dark:text-slate-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] italic">Identity Void Detected</h3>
          </div>
        ) : (
          users.map((user) => (
            <div 
              key={user.id} 
              className="group bg-white dark:bg-slate-950/40 rounded-[48px] border-2 border-slate-100 dark:border-slate-800/80 p-8 hover:bg-slate-50 dark:hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all duration-700 relative overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none"
            >
              <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-40 transition-opacity">
                 <Fingerprint className="w-32 h-32 text-indigo-500" />
              </div>
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-5">
                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-xl font-black border-2 transition-all duration-700 group-hover:scale-110 group-hover:rotate-6 shadow-inner ${
                    user.role === 'ADMIN' 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 animate-pulse shadow-2xl shadow-amber-500/20' 
                      : 'bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 border-slate-100 dark:border-slate-800 shadow-sm'
                  }`}>
                    {user.displayName?.substring(0, 1).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-xl font-black text-slate-900 dark:text-white group-hover:text-indigo-600 transition-colors truncate max-w-[140px] tracking-tighter uppercase italic">{user.displayName}</h3>
                    <div className="flex items-center gap-2 text-slate-400 dark:text-slate-600 text-[9px] font-black uppercase tracking-widest mt-1.5 italic font-mono">
                      <Clock className="w-3.5 h-3.5" />
                      FIX: {user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleDateString() : 'NO_SIGNAL'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-3">
                  <PlatformBadge platform={user.platform} />
                  {user.role === 'ADMIN' && (
                    <div className="px-3 py-1 bg-amber-500 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-2xl shadow-amber-500/30 transition-transform group-hover:scale-110">
                       ADMIN_SYS
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="bg-slate-50 dark:bg-slate-900 py-3 px-5 rounded-[20px] border border-slate-100 dark:border-slate-800 font-mono text-[10px] font-bold text-slate-400 dark:text-slate-600 truncate group-hover:text-indigo-600 transition-colors shadow-inner">
                   HANDLE: {user.platformUserId}
                </div>

                <div className="flex items-center justify-between pt-6 border-t border-slate-100 dark:border-white/5">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="p-4 bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all border border-slate-100 dark:border-slate-800 active:scale-90 shadow-sm"
                    >
                      <ShieldAlert className="w-5 h-5" />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id, user.displayName)}
                      className="p-4 bg-white dark:bg-slate-900 text-rose-600 dark:text-rose-400 rounded-2xl hover:bg-rose-600 hover:text-white transition-all border border-slate-100 dark:border-slate-800 active:scale-90 shadow-sm"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                  
                  <div className={`inline-flex items-center gap-3 px-5 py-2 rounded-2xl border shadow-inner backdrop-blur-md ${
                    user.status === 'ACTIVE' 
                    ? 'bg-emerald-50 dark:bg-emerald-500/10 border-emerald-100 dark:border-emerald-500/20 text-emerald-600' 
                    : 'bg-rose-50 dark:bg-rose-500/10 border-rose-100 dark:border-rose-500/20 text-rose-500'
                  }`}>
                    <div className={`w-2 h-2 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)] animate-pulse' : 'bg-rose-500 animate-ping'}`} />
                    <span className="text-[10px] font-black uppercase tracking-widest italic pt-0.5">
                      {user.status || 'DORMANT'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Batch Navigation Intelligence */}
       {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] backdrop-blur-3xl shadow-sm transition-all hover:border-indigo-500/20">
           <div className="text-[11px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.3em] italic">
             NODAL_BATCH <span className="text-indigo-600 dark:text-indigo-500 font-mono text-lg mx-2 underline decoration-indigo-500/30 decoration-4 underline-offset-4">{page}</span> OF {totalPages} — <span className="text-slate-900 dark:text-white">{total}</span> IDENTITIES
           </div>
           
           <div className="flex items-center gap-4">
              <button 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page <= 1}
                 className="p-5 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 rounded-[24px] hover:bg-indigo-600 hover:text-white disabled:opacity-10 transition-all border border-slate-100 dark:border-slate-800 active:scale-95 shadow-lg shadow-indigo-500/5 group"
              >
                 <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
              </button>
              
              <button 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages}
                 className="p-5 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-600 rounded-[24px] hover:bg-indigo-600 hover:text-white disabled:opacity-10 transition-all border border-slate-100 dark:border-slate-800 active:scale-95 shadow-lg shadow-indigo-500/5 group"
              >
                 <ChevronRight className="w-6 h-6 group-hover:translate-x-1 transition-transform" />
              </button>
           </div>
        </div>
      )}

      {/* Identity Interrogation Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 dark:bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setSelectedUser(null)}>
           <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] p-12 md:p-16 max-w-xl w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-700" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-48 -right-48 w-96 h-96 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[140px] pointer-events-none" />
              <div className="absolute -bottom-48 -left-48 w-80 h-80 bg-rose-600/5 blur-[120px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-32 h-32 rounded-[40px] bg-slate-50 dark:bg-slate-950 flex items-center justify-center text-5xl font-black mb-10 border-2 border-slate-100 dark:border-white/5 shadow-2xl text-slate-900 dark:text-white transition-transform hover:rotate-6">
                    {selectedUser.displayName?.substring(0, 1).toUpperCase()}
                 </div>
                 
                 <h2 className="text-4xl font-black text-slate-900 dark:text-white mb-3 tracking-tighter uppercase italic underline decoration-indigo-500/30 decoration-8 underline-offset-[12px]">Terminal Access</h2>
                 <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-12 italic font-mono">ID_GATE: {selectedUser.platformUserId}</p>
                 
                 <div className="grid grid-cols-2 gap-6 w-full mb-12">
                    <button 
                       onClick={() => handleUpdateRole(selectedUser.id, 'ADMIN')}
                       disabled={isUpdating}
                       className={`group flex flex-col items-center gap-6 p-10 rounded-[48px] border-2 transition-all shadow-sm ${
                          selectedUser.role === 'ADMIN' 
                             ? 'bg-amber-500/10 border-amber-500 text-amber-600 dark:text-amber-500 ring-8 ring-amber-500/5 shadow-2xl shadow-amber-500/20' 
                             : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:border-amber-500/50 hover:text-amber-500'
                       }`}
                    >
                       <ShieldCheck className={`w-12 h-12 ${selectedUser.role === 'ADMIN' ? 'animate-pulse' : ''}`} />
                       <span className="font-black text-[10px] uppercase tracking-[0.3em] font-mono">ROOT_ADMIN</span>
                    </button>
                    <button 
                       onClick={() => handleUpdateRole(selectedUser.id, 'USER')}
                       disabled={isUpdating}
                       className={`group flex flex-col items-center gap-6 p-10 rounded-[48px] border-2 transition-all shadow-sm ${
                          selectedUser.role === 'USER' 
                             ? 'bg-indigo-600/10 border-indigo-500 text-indigo-600 dark:text-indigo-400 ring-8 ring-indigo-500/5 shadow-2xl shadow-indigo-600/10' 
                             : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:border-indigo-500/50 hover:text-indigo-600'
                       }`}
                    >
                       <Monitor className="w-12 h-12" />
                       <span className="font-black text-[10px] uppercase tracking-[0.3em] font-mono">STD_ACCESS</span>
                    </button>
                 </div>
  
                 <div className="w-full space-y-4">
                    <div className="flex gap-4">
                       <button 
                          onClick={() => setSelectedUser(null)}
                          className="flex-1 py-6 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-600 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs hover:bg-slate-100 dark:hover:bg-slate-900 hover:text-slate-900 dark:hover:text-white transition-all shadow-inner border border-slate-100 dark:border-slate-800"
                       >
                          Discard
                       </button>
                       <button 
                         onClick={() => handleDelete(selectedUser.id, selectedUser.displayName)}
                         className="p-6 bg-rose-600/10 text-rose-500 rounded-[32px] border-2 border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all shadow-2xl shadow-rose-600/20 hover:scale-110 active:scale-90"
                       >
                         <Trash2 className="w-6 h-6" />
                       </button>
                    </div>

                    <button 
                       onClick={() => handleUpdateStatus(selectedUser.id, selectedUser.status === 'BANNED' ? 'ACTIVE' : 'BANNED', selectedUser.status === 'BANNED')}
                       disabled={isUpdating}
                       className={`w-full py-6 rounded-[32px] font-black uppercase tracking-[0.2em] text-xs transition-all flex items-center justify-center gap-4 border-2 shadow-2xl ${
                         selectedUser.status === 'BANNED'
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-500 hover:bg-emerald-600 hover:text-white shadow-emerald-600/20'
                          : 'bg-rose-600/10 border-rose-500/30 text-rose-500 hover:bg-rose-600 hover:text-white shadow-rose-600/20'
                       }`}
                    >
                       {selectedUser.status === 'BANNED' ? <UserCheck className="w-6 h-6" /> : <Ban className="w-6 h-6" />}
                       {selectedUser.status === 'BANNED' ? 'Revoke Restriction protocol' : 'Authorize Restriction mandate'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Identity Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Global Governance Matrices Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Identity governance engineering ensures 100% precision in access control across all regional nodes.</span>
         </div>
      </div>
    </div>
  );
}
