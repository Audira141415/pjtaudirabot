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
  Monitor
} from 'lucide-react';

// Platform components
const PlatformBadge = ({ platform }: { platform: string }) => {
  if (platform === 'WHATSAPP') return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
      <MessageCircle className="w-3 h-3" />
      WhatsApp
    </div>
  );
  return (
    <div className="flex items-center gap-1.5 px-2.5 py-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 rounded-full text-[10px] font-black uppercase tracking-wider">
      <Send className="w-3 h-3" />
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
      console.error('Failed to load user data:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Hapus permanen user "${name}"? Aksi ini tidak dapat dibatalkan.`)) return;
    try {
      await api.deleteUser(id);
      loadData();
    } catch (err) {
      alert('Gagal menghapus user');
    }
  };

  const handleUpdateRole = async (id: string, role: string) => {
    setIsUpdating(true);
    try {
      await api.updateUser(id, { role });
      setSelectedUser(null);
      loadData();
    } catch (err) {
      alert('Gagal update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateStatus = async (id: string, status: string, isActive: boolean) => {
    setIsUpdating(true);
    try {
      await api.updateUser(id, { status, isActive });
      setSelectedUser(null);
      loadData();
    } catch (err) {
      alert('Gagal update status');
    } finally {
      setIsUpdating(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 font-primary">
      {/* Header & Stats */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
           <div className="flex items-center gap-2 mb-2">
              <div className="w-2 h-2 bg-indigo-500 rounded-full animate-ping" />
              <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Management Hub</span>
           </div>
          <h1 className="text-4xl font-black text-white tracking-tight mb-1 uppercase italic">User Intelligence</h1>
          <p className="text-slate-500 font-medium text-sm">Control platform participation, access privileges, and moderation states.</p>
        </div>
        
        <div className="flex gap-4">
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-[28px] min-w-[160px] backdrop-blur-xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-12 h-12 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
             <div className="flex items-center gap-2 text-indigo-400 mb-2 relative z-10">
                <Users className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Global Users</span>
             </div>
             <div className="text-3xl font-black text-white relative z-10">{total}</div>
          </div>
          <div className="bg-slate-900/80 border border-slate-800 p-5 rounded-[28px] min-w-[160px] backdrop-blur-xl relative overflow-hidden group">
             <div className="absolute -right-4 -top-4 w-12 h-12 bg-amber-500/10 rounded-full blur-xl group-hover:bg-amber-500/20 transition-all" />
             <div className="flex items-center gap-2 text-amber-500 mb-2 relative z-10">
                <ShieldCheck className="w-4 h-4" />
                <span className="text-[10px] font-black uppercase tracking-widest">Active Admins</span>
             </div>
             <div className="text-3xl font-black text-white relative z-10">{users.filter(u => u.role === 'ADMIN').length}</div>
          </div>
        </div>
      </div>

      {/* Search & Toolbar */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1 group">
          <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
          <input
            type="text"
            placeholder="ID, Name, or Connection String..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full bg-slate-950/50 border border-slate-800 text-white pl-14 pr-6 py-5 rounded-[32px] focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-700 font-bold text-sm tracking-tight"
          />
        </div>
        <button className="px-8 py-5 bg-slate-900 text-slate-400 rounded-[32px] border border-slate-800 flex items-center gap-3 font-black text-xs uppercase tracking-widest hover:bg-slate-800 hover:text-white transition-all active:scale-95 shadow-lg">
          <Filter className="w-4 h-4" />
          Filters
        </button>
      </div>

      {/* Modern Grid of User Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-6">
        {loading ? (
          Array(8).fill(0).map((_, i) => (
            <div key={i} className="h-72 bg-slate-900/30 rounded-[32px] border border-slate-800 animate-pulse" />
          ))
        ) : users.length === 0 ? (
          <div className="col-span-full py-32 text-center animate-in zoom-in-95 duration-500 grayscale opacity-50">
            <UserX className="w-24 h-24 text-slate-700 mx-auto mb-6" />
            <h3 className="text-2xl font-black text-slate-500 uppercase tracking-widest">No Intelligence Found</h3>
          </div>
        ) : (
          users.map((user) => (
            <div 
              key={user.id} 
              className="group bg-slate-900/40 rounded-[32px] border border-slate-800/60 p-7 hover:bg-slate-900 hover:border-indigo-500/40 transition-all duration-500 relative overflow-hidden backdrop-blur-xl"
            >
              <div className="absolute -right-8 -top-8 w-24 h-24 bg-indigo-600/5 blur-[40px] group-hover:bg-indigo-600/15 transition-all" />
              
              <div className="flex items-start justify-between mb-8 relative z-10">
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-[24px] flex items-center justify-center text-xl font-black border transition-all duration-500 group-hover:scale-110 ${
                    user.role === 'ADMIN' 
                      ? 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-lg shadow-amber-500/10' 
                      : 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20'
                  }`}>
                    {user.displayName?.substring(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white group-hover:text-indigo-400 transition-colors truncate max-w-[120px] tracking-tight">{user.displayName}</h3>
                    <div className="flex items-center gap-1.5 text-slate-500 text-[10px] font-black uppercase tracking-[0.1em] mt-1">
                      <Clock className="w-3 h-3" />
                      {user.lastActivityAt ? new Date(user.lastActivityAt).toLocaleDateString() : 'NEVER'}
                    </div>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <PlatformBadge platform={user.platform} />
                  {user.role === 'ADMIN' && (
                    <div className="flex items-center gap-1 text-[9px] font-black text-amber-500 bg-amber-500/10 px-2 py-1 rounded-lg border border-amber-500/20 uppercase tracking-widest">
                      <Shield className="w-2.5 h-2.5" />
                      ADMIN
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-6 relative z-10">
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800/40 font-mono text-[11px] text-slate-500 truncate group-hover:text-slate-300 transition-colors">
                   {user.platformUserId}
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/40">
                  <div className="flex gap-2">
                    <button 
                      onClick={() => setSelectedUser(user)}
                      className="p-3 bg-slate-800 text-indigo-400 rounded-xl hover:bg-indigo-600 hover:text-white transition-all border border-slate-700 hover:border-indigo-400 active:scale-90"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    <button 
                      onClick={() => handleDelete(user.id, user.displayName)}
                      className="p-3 bg-slate-800 text-rose-400 rounded-xl hover:bg-rose-600 hover:text-white transition-all border border-slate-700 hover:border-rose-400 active:scale-90"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex items-center gap-2 px-3 py-1 bg-slate-950/50 rounded-full border border-slate-800">
                    <div className={`w-1.5 h-1.5 rounded-full ${user.status === 'ACTIVE' ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest ${user.status === 'ACTIVE' ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {user.status || 'OFFLINE'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Container */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/30 border border-slate-800/50 p-6 rounded-[32px] backdrop-blur-2xl">
           <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
             Record <span className="text-white">{(page-1)*limit + 1}</span> - <span className="text-white">{Math.min(page*limit, total)}</span> of <span className="text-white">{total}</span>
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page <= 1}
                 className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all border border-slate-700 active:scale-95"
              >
                 <ChevronLeft className="w-5 h-5" />
              </button>
              
              <div className="flex items-center gap-2">
                 <div className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm shadow-xl shadow-indigo-600/30">
                    {page}
                 </div>
              </div>

              <button 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages}
                 className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 hover:text-white disabled:opacity-30 transition-all border border-slate-700 active:scale-95"
              >
                 <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

      {/* Advanced Security Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 max-w-lg w-full shadow-2xl relative overflow-hidden ring-1 ring-slate-800">
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/10 blur-[120px]" />
              
              <div className="relative z-10 flex flex-col items-center">
                 <div className="w-28 h-28 rounded-[36px] bg-slate-950 flex items-center justify-center text-4xl font-black mb-8 border border-white/5 shadow-2xl text-white">
                    {selectedUser.displayName?.substring(0, 1).toUpperCase()}
                 </div>
                 
                 <h2 className="text-3xl font-black text-white mb-2 tracking-tight uppercase italic underline decoration-indigo-500/50 underline-offset-8">Terminal Access</h2>
                 <p className="text-slate-500 text-sm font-medium mb-12">Override settings for <span className="text-white">ID: {selectedUser.platformUserId}</span></p>
                 
                 <div className="grid grid-cols-2 gap-4 w-full mb-10">
                    <button 
                       onClick={() => handleUpdateRole(selectedUser.id, 'ADMIN')}
                       disabled={isUpdating}
                       className={`group flex flex-col items-center gap-4 p-8 rounded-[36px] border-2 transition-all ${
                          selectedUser.role === 'ADMIN' 
                             ? 'bg-amber-500/10 border-amber-500 text-amber-500 ring-4 ring-amber-500/5' 
                             : 'bg-slate-950/50 border-slate-800 text-slate-700 hover:border-slate-600'
                       }`}
                    >
                       <ShieldCheck className={`w-10 h-10 ${selectedUser.role === 'ADMIN' ? 'animate-pulse' : ''}`} />
                       <span className="font-black text-[10px] uppercase tracking-[0.2em]">Administrative</span>
                    </button>
                    <button 
                       onClick={() => handleUpdateRole(selectedUser.id, 'USER')}
                       disabled={isUpdating}
                       className={`flex flex-col items-center gap-4 p-8 rounded-[36px] border-2 transition-all ${
                          selectedUser.role === 'USER' 
                             ? 'bg-indigo-600/10 border-indigo-500 text-indigo-400 ring-4 ring-indigo-500/5' 
                             : 'bg-slate-950/50 border-slate-800 text-slate-700 hover:border-slate-600'
                       }`}
                    >
                       <Monitor className="w-10 h-10" />
                       <span className="font-black text-[10px] uppercase tracking-[0.2em]">Standard</span>
                    </button>
                 </div>

                 <div className="grid grid-cols-1 w-full gap-4">
                    <div className="flex gap-4">
                      <button 
                         onClick={() => setSelectedUser(null)}
                         className="flex-1 py-5 bg-slate-800 text-slate-400 rounded-[24px] font-black uppercase tracking-widest text-xs hover:bg-slate-700 hover:text-white transition-all shadow-lg border border-slate-700"
                      >
                         Dismiss
                      </button>
                      <button 
                        onClick={() => handleDelete(selectedUser.id, selectedUser.displayName)}
                        className="p-5 bg-rose-600/10 text-rose-500 rounded-[24px] border border-rose-500/20 hover:bg-rose-600 hover:text-white transition-all"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>

                    <button 
                       onClick={() => handleUpdateStatus(selectedUser.id, selectedUser.status === 'BANNED' ? 'ACTIVE' : 'BANNED', selectedUser.status === 'BANNED')}
                       disabled={isUpdating}
                       className={`w-full py-5 rounded-[24px] font-black uppercase tracking-widest text-xs transition-all flex items-center justify-center gap-2 border shadow-xl ${
                         selectedUser.status === 'BANNED'
                          ? 'bg-emerald-600/10 border-emerald-500/20 text-emerald-500 hover:bg-emerald-600 hover:text-white'
                          : 'bg-rose-600/10 border-rose-500/20 text-rose-500 hover:bg-rose-600 hover:text-white'
                       }`}
                    >
                       {selectedUser.status === 'BANNED' ? <UserCheck className="w-4 h-4" /> : <Ban className="w-4 h-4" />}
                       {selectedUser.status === 'BANNED' ? 'Revoke Restriction' : 'Authorize Restriction'}
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
