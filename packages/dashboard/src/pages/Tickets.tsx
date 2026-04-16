import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';
import { 
  Ticket, 
  Search, 
  ChevronLeft, 
  ChevronRight, 
  X, 
  Zap, 
  Clock, 
  ShieldAlert, 
  AlertCircle, 
  CheckCircle2, 
  User, 
  MapPin, 
  Activity,
  ArrowRight,
  Filter,
  RefreshCw,
  Orbit,
  Layers,
  Cpu,
  Fingerprint,
  Monitor,
  ShieldCheck,
  Target,
  LifeBuoy
} from 'lucide-react';
import { toast } from '../components/Toast';

// Premium Badge Components
const PremiumStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    OPEN: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    WAITING: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
    ESCALATED: 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    RESOLVED: 'bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/20',
    CLOSED: 'bg-slate-50 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-800',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border ${styles[status] || styles.CLOSED} backdrop-blur-md`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const PremiumPriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-rose-600 text-white border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-pulse',
    HIGH: 'bg-orange-500/20 text-orange-600 dark:text-orange-500 border-orange-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-600 dark:text-amber-500 border-amber-500/30',
    LOW: 'bg-slate-50 dark:bg-slate-900 text-slate-500 dark:text-slate-600 border-slate-100 dark:border-slate-800',
  };

  return (
    <span className={`px-2 py-0.5 rounded-md text-[8px] font-black uppercase tracking-tighter border ${styles[priority] || styles.LOW}`}>
      {priority}
    </span>
  );
};

export default function TicketsPage() {
  const [tickets, setTickets] = useState<any[]>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [selected, setSelected] = useState<any | null>(null);
  const [bulkResolving, setBulkResolving] = useState(false);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkCandidateCount, setBulkCandidateCount] = useState(0);
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [bulkFilterSnapshot, setBulkFilterSnapshot] = useState<any>({});
  
  const limit = 15;

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const filters: any = {};
      if (appliedSearch) filters.search = appliedSearch;
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      if (categoryFilter) filters.category = categoryFilter;
      const res = await api.getTickets(page, limit, filters);
      setTickets(res.data);
      setTotal(res.pagination.total);
    } catch (err) {
       toast({ type: 'error', title: 'REPOSITORY_SYNC_FAILURE', message: 'Failed to access global incident ledgers.' });
    } finally {
      setLoading(false);
    }
  }, [page, appliedSearch, statusFilter, priorityFilter, categoryFilter]);

  useEffect(() => { loadData(); }, [loadData]);

  const handleSearch = (e: React.FormEvent) => { 
    e.preventDefault();
    setAppliedSearch(search.trim()); 
    setPage(1); 
  };

  const openDetail = async (id: string) => {
    try {
      const res = await api.getTicket(id);
      setSelected(res.data);
    } catch (err) { 
       toast({ type: 'error', title: 'INTERROGATION_FAILURE', message: 'Failed to extract detailed incident profile.' });
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
       await api.updateTicket(id, { status });
       toast({ type: 'success', title: 'STATE_TRANSITION', message: `Ticket ${id.substring(0,8)} is now marked as ${status}.` });
       setSelected(null);
       loadData();
    } catch (err) {
       toast({ type: 'error', title: 'TRANSITION_FAILURE', message: 'The state modification command was rejected.' });
    }
  };

  const handleBulkResolveFiltered = async () => {
    if (bulkResolving) return;
    const filter = { status: statusFilter, priority: priorityFilter, search: appliedSearch };
    
    setBulkResolving(true);
    try {
      const preview = await api.bulkResolveTickets({ filter, dryRun: true });
      setBulkCandidateCount(preview.data.candidateCount || 0);
      setBulkFilterSnapshot(filter);
      setBulkModalOpen(true);
    } catch (err) {
      toast({ type: 'error', title: 'BULK_PREVIEW_FAILURE', message: 'Failed to calculate bulk resolution candidates.' });
    } finally {
      setBulkResolving(false);
    }
  };

  const executeBulkResolve = async () => {
    if (bulkConfirmText !== 'RESOLVE') return;
    setBulkResolving(true);
    try {
      await api.bulkResolveTickets({ filter: bulkFilterSnapshot });
      toast({ type: 'success', title: 'BULK_ACTION_COMPLETE', message: 'High-velocity resolution protocol executed successfully.' });
      setBulkModalOpen(false);
      loadData();
    } catch (err) {
       toast({ type: 'error', title: 'EXECUTION_FAILURE', message: 'Bulk resolution protocol was interrupted.' });
    } finally {
      setBulkResolving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Incident Intelligence Ledger</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Ticket Repository</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Unified management for customer inquiries, high-priority technical faults, and service requests.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] min-w-[160px] backdrop-blur-3xl group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-emerald-500/20 group-hover:bg-emerald-500 transition-colors" />
             <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">OPEN_THREADS</div>
             <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{tickets.filter(t => t.status === 'OPEN').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] min-w-[160px] backdrop-blur-3xl group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
             <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-500/20 group-hover:bg-rose-500 transition-colors" />
             <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">CRITICAL_FAULTS</div>
             <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{tickets.filter(t => t.priority === 'CRITICAL').length}</div>
          </div>
          <button 
             onClick={loadData} 
             className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
          >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-white dark:bg-slate-950/40 p-5 rounded-[48px] border border-slate-100 dark:border-slate-800/80 backdrop-blur-3xl shadow-sm space-y-4">
        <form onSubmit={handleSearch} className="flex flex-col xl:flex-row gap-5">
          <div className="relative flex-1 group">
            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-700 group-focus-within:text-indigo-500 transition-colors" />
            <input
              type="text"
              placeholder="Filter by Ticket Number, Customer, or Keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white pl-16 pr-8 py-5 rounded-[28px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold text-xs tracking-tight shadow-inner"
            />
          </div>
          <div className="flex flex-wrap items-center gap-4">
             <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 p-2 rounded-[28px] shadow-inner">
                <select 
                  value={statusFilter} 
                  onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-slate-500 dark:text-slate-500 px-6 py-3 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer appearance-none min-w-[140px] hover:text-indigo-600 transition-colors"
                >
                  <option value="">OMNI_STATUS</option>
                  {['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED', 'RESOLVED', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
                </select>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                <select 
                  value={priorityFilter} 
                  onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-slate-500 dark:text-slate-500 px-6 py-3 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer appearance-none min-w-[140px] hover:text-indigo-600 transition-colors"
                >
                  <option value="">OMNI_PRIORITY</option>
                  {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
                <div className="w-px h-6 bg-slate-200 dark:bg-slate-800" />
                <select 
                  value={categoryFilter} 
                  onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
                  className="bg-transparent text-slate-500 dark:text-slate-500 px-6 py-3 outline-none text-[10px] font-black uppercase tracking-widest cursor-pointer appearance-none min-w-[180px] hover:text-indigo-600 transition-colors"
                >
                 <option value="">OMNI_CATEGORY</option>
                 {['INCIDENT', 'REQUEST', 'MAINTENANCE', 'CONFIGURATION', 'MONITORING', 'FULFILLMENT', 'VAM', 'HELPDESK', 'SMARTHAND', 'INVENTORY', 'REPORTING', 'ADDITIONAL_SERVICE', 'AVAILABILITY'].map(c => <option key={c} value={c}>{c}</option>)}
               </select>
             </div>
             <button 
               type="button"
               onClick={handleBulkResolveFiltered}
               disabled={!statusFilter && !priorityFilter && !appliedSearch}
               className="bg-emerald-600 text-white dark:bg-emerald-600/10 dark:text-emerald-500 border-2 border-emerald-400/20 px-10 py-5 rounded-[28px] font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.05] transition-all disabled:opacity-20 active:scale-95 shadow-2xl shadow-emerald-500/30 dark:shadow-none flex items-center gap-3"
             >
               <CheckCircle2 className="w-4 h-4" /> BATCH_RESOLVE
             </button>
          </div>
        </form>
      </div>

      {/* Modern Ticket Matrix */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array(6).fill(0).map((_, i) => <div key={i} className="h-32 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[40px] animate-pulse shadow-sm" />)
        ) : tickets.length === 0 ? (
          <div className="py-48 text-center bg-white dark:bg-slate-950/20 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-20 grayscale shadow-inner">
             <LifeBuoy className="w-24 h-24 text-slate-200 dark:text-slate-800 mx-auto mb-6" />
             <h3 className="text-2xl font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] italic leading-tight">Registry Stream Void</h3>
          </div>
        ) : (
          tickets.map((ticket) => (
            <div 
              key={ticket.id}
              onClick={() => openDetail(ticket.id)}
              className={`group relative bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-indigo-500/5 hover:border-indigo-500/30 transition-all duration-700 cursor-pointer backdrop-blur-3xl flex flex-col md:flex-row md:items-center gap-10 overflow-hidden ${
                ticket.priority === 'CRITICAL' ? 'shadow-2xl shadow-rose-600/5 ring-2 ring-rose-500/20 dark:ring-rose-500/10' : 'shadow-sm dark:shadow-none'
              }`}
            >
              {/* Regional Accent Indicator */}
              <div className={`absolute left-0 top-0 bottom-0 w-2.5 transition-all duration-700 group-hover:w-4 ${
                ticket.priority === 'CRITICAL' ? 'bg-rose-600 shadow-[4px_0_20px_rgba(225,29,72,0.3)]' : 
                ticket.priority === 'HIGH' ? 'bg-orange-500' : 
                'bg-slate-100 dark:bg-slate-800/50'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-4 mb-4">
                  <div className="font-mono text-[11px] font-black text-slate-400 dark:text-slate-700 group-hover:text-indigo-600 transition-colors uppercase tracking-widest px-4 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl shadow-inner italic">
                    #{ticket.ticketNumber}
                   </div>
                   <PremiumPriorityBadge priority={ticket.priority} />
                   <PremiumStatusBadge status={ticket.status} />
                   {ticket.category && (
                     <span className="bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest italic font-mono transition-transform group-hover:scale-110">
                       {ticket.category}
                     </span>
                   )}
                   {ticket.slaTracking?.resolutionBreached && (
                     <span className="bg-rose-600 text-white px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 shadow-2xl shadow-rose-600/40 animate-pulse">
                       <ShieldAlert className="w-4 h-4" /> BREACH_DETECTED
                     </span>
                   )}
                 </div>
                  <h3 className="text-3xl font-black text-slate-900 dark:text-white group-hover:translate-x-3 group-hover:text-indigo-600 transition-all duration-700 truncate italic tracking-tighter uppercase">{ticket.customer || 'UNKNOWN_SUBSCRIBER'}</h3>
                  <div className="flex items-center gap-6 mt-4 text-slate-400 dark:text-slate-600 text-[10px] font-black uppercase tracking-[0.2em] italic">
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl"><MapPin className="w-4 h-4 text-indigo-500" /> {ticket.location || 'GLOBAL_NODE'}</div>
                    <div className="flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl"><Clock className="w-4 h-4 text-indigo-500" /> {new Date(ticket.createdAt).toLocaleDateString()}</div>
                  </div>
                </div>

              <div className="flex items-center justify-between md:justify-end gap-10 border-t md:border-t-0 pt-8 md:pt-0 border-slate-100 dark:border-white/5">
                <div className="text-right flex flex-col items-end">
                   <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 italic">NODAL_OPERATOR</div>
                   <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 px-4 py-2 rounded-2xl shadow-inner group-hover:border-indigo-500/30 transition-colors">
                      <div className="w-8 h-8 rounded-xl bg-white dark:bg-slate-950 flex items-center justify-center border border-slate-200 dark:border-slate-800 shadow-sm transition-transform group-hover:rotate-12">
                         <User className="w-4 h-4 text-indigo-500" />
                      </div>
                      <span className="text-slate-900 dark:text-white text-[11px] font-black uppercase tracking-tighter truncate w-32">{ticket.assignedTo?.displayName || 'UNASSIGNED_RELAY'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`w-16 h-16 rounded-[24px] bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-all duration-700 group-hover:rotate-[360deg] shadow-lg flex items-center justify-center`}>
                    <ArrowRight className="w-8 h-8 text-slate-400 dark:text-slate-700 group-hover:text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Strategy */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] backdrop-blur-3xl shadow-sm transition-all hover:border-indigo-500/20">
           <div className="text-[11px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.3em] italic">
             NODAL_BATCH <span className="text-indigo-600 dark:text-indigo-500 font-mono text-lg mx-2 underline decoration-indigo-500/30 decoration-4 underline-offset-4">{page}</span> OF {totalPages} — <span className="text-slate-900 dark:text-white">{total}</span> ACTIVE_THREADS
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

      {/* Detail Interrogation Terminal (Modal) */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 dark:bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500 overflow-y-auto custom-scrollbar" onClick={() => setSelected(null)}>
          <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] p-10 md:p-16 max-w-5xl w-full shadow-2xl relative overflow-hidden my-auto animate-in zoom-in-95 duration-700" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-64 -right-64 w-[500px] h-[500px] bg-indigo-600/5 dark:bg-indigo-600/10 blur-[160px] pointer-events-none" />
            <div className="absolute -bottom-64 -left-64 w-[500px] h-[500px] bg-emerald-600/5 blur-[140px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-12">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="px-5 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 rounded-2xl font-mono text-[11px] font-black text-indigo-600 dark:text-indigo-400 italic tracking-widest shadow-inner">
                       INCIDENT_NODE: {selected.ticketNumber}
                    </div>
                    <PremiumPriorityBadge priority={selected.priority} />
                  </div>
                  <h2 className="text-5xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter leading-none underline decoration-indigo-600/30 decoration-4 underline-offset-[16px]">{selected.customer || 'UNKNOWN_SUBSCRIBER'}</h2>
                </div>
                <button 
                  onClick={() => setSelected(null)}
                  className="w-16 h-16 bg-slate-50 dark:bg-slate-950 text-slate-400 dark:text-slate-800 hover:text-rose-500 border border-slate-100 dark:border-slate-800 rounded-[28px] transition-all hover:rotate-90 active:scale-95 shadow-inner flex items-center justify-center"
                >
                  <X className="w-8 h-8" />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mb-12">
                 {[
                   { label: 'NODAL_STATUS', value: <PremiumStatusBadge status={selected.status} />, color: 'bg-indigo-500/5' },
                   { label: 'INGRESS_CHANNEL', value: selected.platform || 'CORE_RELAY', color: 'bg-sky-500/5' },
                   { label: 'PHYSICAL_NODE', value: selected.location || 'GLOBAL_INFRA', color: 'bg-amber-500/5' },
                   { label: 'SLA_TELEMETRY', value: selected.slaTracking?.resolutionBreached ? <span className="text-rose-500 font-black animate-pulse uppercase">SIGNAL_BREACHED</span> : <span className="text-emerald-500 font-black uppercase tracking-widest">SIGNAL_LOCKED</span>, color: 'bg-emerald-500/5' }
                 ].map((item, i) => (
                   <div key={i} className={`p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/80 shadow-inner group/stat hover:bg-slate-50 dark:hover:bg-slate-950 transition-all ${item.color}`}>
                      <div className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mb-3 font-mono italic group-hover/stat:text-indigo-500 transition-colors">{item.label}</div>
                      <div className="text-slate-900 dark:text-white text-sm font-black italic tracking-tighter uppercase">{item.value}</div>
                   </div>
                 ))}
              </div>

              <div className="space-y-8 mb-12">
                {/* Technical Parameter Cluster */}
                {(selected.ao || selected.sid || selected.ipAddress || selected.hostnameSwitch) && (
                  <div className="bg-slate-50 dark:bg-slate-950/60 p-10 rounded-[48px] border border-slate-100 dark:border-slate-800 shadow-inner relative overflow-hidden group/tech">
                     <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover/tech:opacity-30 transition-opacity">
                        <Cpu className="w-32 h-32 text-indigo-500" />
                     </div>
                     <div className="flex items-center gap-4 mb-8">
                        <Activity className="w-6 h-6 text-indigo-600 dark:text-indigo-500" />
                        <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-indigo-600/30 decoration-2 underline-offset-8">Technical Parameters Matrix</h4>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {Object.entries({
                           'AO_LEDGER_REF': selected.ao,
                           'SERVICE_IDENTITY': selected.sid,
                           'NODE_ARCHETYPE': selected.service,
                           'NETWORK_GATEWAY': selected.ipAddress ? `${selected.ipAddress} / ${selected.gateway || '-'}` : null,
                           'LOGICAL_VLAN': selected.vlanId ? `${selected.vlanId} [${selected.vlanName || 'UNNAMED'}]` : null,
                           'ACCESS_PORT_MAP': selected.hostnameSwitch ? `${selected.hostnameSwitch} @ ${selected.port || '-'}` : null
                        }).map(([lbl, val]) => val && (
                          <div key={lbl} className="bg-white dark:bg-slate-900 p-5 rounded-[24px] border border-slate-100 dark:border-slate-800 shadow-sm group/param hover:border-indigo-500/30 transition-all">
                             <div className="text-[9px] font-black font-mono text-slate-400 dark:text-slate-700 uppercase tracking-widest mb-2 group-hover/param:text-indigo-600 transition-colors">{lbl}</div>
                             <div className="text-[13px] font-black text-slate-900 dark:text-white tracking-tighter uppercase italic">{val}</div>
                          </div>
                        ))}
                     </div>
                  </div>
                )}

                <div className="bg-white dark:bg-slate-950/80 p-10 rounded-[48px] border-2 border-indigo-500/10 shadow-lg relative group/prob overflow-hidden">
                   <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-600/30 group-hover:bg-indigo-600 transition-all" />
                   <div className="flex items-center gap-4 mb-6">
                      <ShieldAlert className="w-6 h-6 text-amber-500" />
                      <h4 className="text-lg font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">Interrogated Incident Specification</h4>
                   </div>
                   <p className="text-2xl font-black text-slate-900 dark:text-white leading-snug italic tracking-tighter uppercase group-hover:translate-x-2 transition-transform duration-500">"{selected.problem}"</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                  {selected.rootCause && (
                    <div className="bg-rose-50/50 dark:bg-rose-950/20 p-8 rounded-[40px] border border-rose-100 dark:border-rose-900/30 shadow-inner group/rc transition-all hover:bg-rose-50 dark:hover:bg-rose-900/40">
                       <div className="flex items-center gap-4 mb-4">
                          <Activity className="w-6 h-6 text-rose-600 dark:text-rose-500" />
                          <h4 className="text-[12px] font-black text-rose-600 dark:text-rose-500 uppercase tracking-[0.3em] italic">Root Cause Diagnostics</h4>
                       </div>
                       <p className="text-slate-700 dark:text-slate-300 text-base font-black italic tracking-tight leading-relaxed">{selected.rootCause}</p>
                    </div>
                  )}

                  {selected.solution && (
                    <div className="bg-emerald-50/50 dark:bg-emerald-950/20 p-8 rounded-[40px] border border-emerald-100 dark:border-emerald-900/30 shadow-inner group/res transition-all hover:bg-emerald-50 dark:hover:bg-emerald-900/40">
                       <div className="flex items-center gap-4 mb-4">
                          <CheckCircle2 className="w-6 h-6 text-emerald-600 dark:text-emerald-500" />
                          <h4 className="text-[12px] font-black text-emerald-600 dark:text-emerald-500 uppercase tracking-[0.3em] italic">Resolution Strategy</h4>
                       </div>
                       <p className="text-slate-700 dark:text-slate-300 text-base font-black italic tracking-tight leading-relaxed">{selected.solution}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Terminal Control */}
              {!['RESOLVED', 'CLOSED'].includes(selected.status) && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 border-t-4 border-dashed border-slate-100 dark:border-slate-800 pt-12">
                   {selected.status === 'OPEN' ? (
                     <button 
                       onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}
                       className="group bg-amber-500 text-white py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.05] transition-all shadow-2xl shadow-amber-500/30 border-2 border-amber-400/50 flex items-center justify-center gap-3"
                     >
                       <Zap className="w-5 h-5 group-hover:rotate-12 transition-transform" /> Engage Handling
                     </button>
                   ) : (
                     <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] flex items-center justify-center text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.4em] italic">Handler Active</div>
                   )}
                   <button 
                     onClick={() => updateStatus(selected.id, 'RESOLVED')}
                     className="group bg-indigo-600 text-white py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.05] transition-all shadow-2xl shadow-indigo-600/40 border-2 border-indigo-400/50 flex items-center justify-center gap-3"
                   >
                     <CheckCircle2 className="w-5 h-5 group-hover:scale-125 transition-transform" /> Commit Resolve
                   </button>
                   <button 
                     onClick={() => updateStatus(selected.id, 'WAITING')}
                     className="group bg-white dark:bg-slate-950 text-sky-500 py-6 rounded-[32px] font-black uppercase text-xs tracking-[0.3em] hover:scale-[1.05] transition-all shadow-xl shadow-sky-500/5 border-2 border-sky-100 dark:border-sky-900/30 flex items-center justify-center gap-3"
                   >
                     <Clock className="w-5 h-5 group-hover:-rotate-12 transition-transform" /> Hold Ticket
                   </button>
                </div>
              )}
              {['RESOLVED', 'CLOSED'].includes(selected.status) && (
                 <div className="bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] text-center shadow-inner">
                    <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-4" />
                    <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-700 italic">Incident State Finalized — Archive Locked</p>
                 </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Override Modal Intelligence */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-900/60 dark:bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-500" onClick={() => setBulkModalOpen(false)}>
           <div className="bg-white dark:bg-slate-900 border-4 border-rose-500/20 rounded-[64px] p-12 md:p-16 max-w-lg w-full shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-700" onClick={e => e.stopPropagation()}>
              <div className="absolute -top-32 -right-32 w-64 h-64 bg-rose-600/10 blur-[100px] pointer-events-none" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-24 h-24 rounded-[32px] bg-rose-600 flex items-center justify-center text-white mb-10 border-4 border-white/20 animate-pulse shadow-2xl shadow-rose-600/60 transition-transform hover:scale-110">
                    <ShieldAlert className="w-12 h-12" />
                 </div>
                 <h2 className="text-4xl font-black text-slate-900 dark:text-white italic uppercase tracking-tighter mb-4 underline decoration-rose-500 decoration-8 underline-offset-[12px]">Critical Override</h2>
                 <p className="text-slate-500 dark:text-slate-400 text-base font-black uppercase tracking-tight mb-12 leading-tight italic grayscale opacity-80">
                   Executing high-velocity resolution for <span className="text-rose-600 dark:text-rose-500 font-black text-2xl mx-1 underline">{bulkCandidateCount}</span> nodal handles. This action is immutable and will be broadcast to global audit streams.
                 </p>

                 <div className="w-full space-y-4 mb-12">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest px-4 font-mono italic">
                       <span>VERIFICATION_STRING</span>
                       <span className="text-rose-600 dark:text-rose-500">REQUIRED_INPUT</span>
                    </div>
                    <input 
                       value={bulkConfirmText}
                       onChange={(e) => setBulkConfirmText(e.target.value)}
                       placeholder="TYPE 'RESOLVE' TO AUTHORIZE"
                       className="w-full bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-rose-900/30 text-rose-600 dark:text-rose-500 p-8 rounded-[32px] outline-none focus:border-rose-500 placeholder:text-slate-100 dark:placeholder:text-slate-800 text-center font-black tracking-[0.4em] text-xs shadow-inner uppercase"
                    />
                 </div>

                 <div className="flex flex-col w-full gap-4">
                    <button 
                       disabled={bulkConfirmText !== 'RESOLVE' || bulkResolving}
                       onClick={executeBulkResolve}
                       className="w-full py-6 bg-rose-600 text-white rounded-[32px] font-black uppercase text-sm tracking-[0.3em] disabled:opacity-30 disabled:grayscale transition-all shadow-2xl shadow-rose-600/40 hover:scale-[1.05] active:scale-95 border-2 border-rose-400/50"
                    >
                       {bulkResolving ? 'Executing Protocol...' : 'Engage Global Resolve'}
                    </button>
                    <button 
                       onClick={() => setBulkModalOpen(false)}
                       className="w-full py-4 text-slate-400 dark:text-slate-800 font-black hover:text-slate-900 dark:hover:text-white transition-all uppercase text-[10px] tracking-widest italic"
                    >
                       Abort Strategic Operation
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
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Incident Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Global Service Desk Matrices Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-2 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Ticket repository engineering ensures 100% precision in incident tracking across all functional nodes.</span>
         </div>
      </div>
    </div>
  );
}
