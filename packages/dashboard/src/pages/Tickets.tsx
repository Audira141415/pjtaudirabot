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
  ArrowRight
} from 'lucide-react';

// Premium Badge Components
const PremiumStatusBadge = ({ status }: { status: string }) => {
  const styles: Record<string, string> = {
    OPEN: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 shadow-[0_0_15px_rgba(16,185,129,0.1)]',
    IN_PROGRESS: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.1)]',
    WAITING: 'bg-sky-500/10 text-sky-400 border-sky-500/20 shadow-[0_0_15px_rgba(14,165,233,0.1)]',
    ESCALATED: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.1)]',
    RESOLVED: 'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
    CLOSED: 'bg-slate-700/20 text-slate-400 border-slate-700/30 font-medium',
  };

  return (
    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${styles[status] || styles.CLOSED}`}>
      {status.replace('_', ' ')}
    </span>
  );
};

const PremiumPriorityBadge = ({ priority }: { priority: string }) => {
  const styles: Record<string, string> = {
    CRITICAL: 'bg-rose-600 text-white border-rose-500 shadow-[0_0_20px_rgba(225,29,72,0.3)] animate-pulse',
    HIGH: 'bg-orange-500/20 text-orange-500 border-orange-500/30',
    MEDIUM: 'bg-amber-500/20 text-amber-500 border-amber-500/30',
    LOW: 'bg-slate-200 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-300 dark:border-slate-700',
  };

  return (
    <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-tighter border ${styles[priority] || styles.LOW}`}>
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
  const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
      console.error('Failed to load tickets:', err);
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
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateTicket(id, { status });
    setSelected(null);
    loadData();
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
      setBulkMessage({ type: 'error', text: 'Gagal melakukan preview bulk resolve.' });
    } finally {
      setBulkResolving(false);
    }
  };

  const executeBulkResolve = async () => {
    if (bulkConfirmText !== 'RESOLVE') return;
    setBulkResolving(true);
    try {
      await api.bulkResolveTickets({ filter: bulkFilterSnapshot });
      setBulkMessage({ type: 'success', text: 'Bulk resolve berhasil dieksekusi.' });
      setBulkModalOpen(false);
      loadData();
    } catch (err) {
      setBulkMessage({ type: 'error', text: 'Eksekusi bulk resolve gagal.' });
    } finally {
      setBulkResolving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="p-2 bg-indigo-500/10 rounded-lg text-indigo-400 border border-indigo-500/20">
              <Ticket className="w-5 h-5" />
            </div>
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">Service Desk</span>
          </div>
          <h1 className="text-4xl font-black text-slate-950 dark:text-white tracking-tight uppercase italic mb-1">Ticket Repository</h1>
          <p className="text-slate-500 font-medium text-sm">Unified management for customer inquiries, technical faults, and service requests.</p>
        </div>

        <div className="flex gap-4">
          <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-5 rounded-[28px] min-w-[140px] backdrop-blur-xl group hover:border-indigo-500/30 transition-all shadow-sm dark:shadow-none">
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-indigo-400 transition-colors">Open Tickets</div>
             <div className="text-3xl font-black text-slate-950 dark:text-white">{tickets.filter(t => t.status === 'OPEN').length}</div>
          </div>
          <div className="bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 p-5 rounded-[28px] min-w-[140px] backdrop-blur-xl group hover:border-rose-500/30 transition-all shadow-sm dark:shadow-none">
             <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1 group-hover:text-rose-500 transition-colors">Critical</div>
             <div className="text-3xl font-black text-slate-950 dark:text-white">{tickets.filter(t => t.priority === 'CRITICAL').length}</div>
          </div>
        </div>
      </div>

      {/* Advanced Filter Bar */}
      <div className="bg-slate-900/50 p-4 rounded-[32px] border border-slate-800/50 backdrop-blur-lg">
        <form onSubmit={handleSearch} className="flex flex-col xl:flex-row gap-4">
          <div className="relative flex-1 group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500 group-focus-within:text-indigo-400 transition-colors" />
            <input
              type="text"
              placeholder="Filter by Ticket Number, Customer, or Keywords..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-950 dark:text-white pl-12 pr-6 py-4 rounded-2xl focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-400 dark:placeholder:text-slate-700 font-bold text-xs tracking-tight"
            />
          </div>
          <div className="flex flex-wrap gap-4">
             <select 
               value={statusFilter} 
               onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
               className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-4 rounded-2xl outline-none focus:border-indigo-500/50 text-xs font-black uppercase tracking-widest cursor-pointer"
             >
               <option value="">All Status</option>
               {['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED', 'RESOLVED', 'CLOSED'].map(s => <option key={s} value={s}>{s}</option>)}
             </select>
             <select 
               value={priorityFilter} 
               onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}
               className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-4 rounded-2xl outline-none focus:border-indigo-500/50 text-xs font-black uppercase tracking-widest cursor-pointer"
             >
               <option value="">All Priority</option>
               {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map(p => <option key={p} value={p}>{p}</option>)}
             </select>
             <select 
               value={categoryFilter} 
               onChange={(e) => { setCategoryFilter(e.target.value); setPage(1); }}
               className="bg-white dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 px-6 py-4 rounded-2xl outline-none focus:border-indigo-500/50 text-xs font-black uppercase tracking-widest cursor-pointer"
             >
              <option value="">All Categories</option>
              {['INCIDENT', 'REQUEST', 'MAINTENANCE', 'CONFIGURATION', 'MONITORING', 'FULFILLMENT', 'VAM', 'HELPDESK', 'SMARTHAND', 'INVENTORY', 'REPORTING', 'ADDITIONAL_SERVICE', 'AVAILABILITY'].map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <button 
              type="button"
              onClick={handleBulkResolveFiltered}
              disabled={!statusFilter && !priorityFilter && !appliedSearch}
              className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 px-8 py-4 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] hover:bg-emerald-600 hover:text-white transition-all disabled:opacity-20 active:scale-95 shadow-lg shadow-emerald-500/5"
            >
              Bulk Resolve
            </button>
          </div>
        </form>
      </div>

      {bulkMessage && (
        <div className={`p-4 rounded-2xl border flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 ${
          bulkMessage.type === 'success' ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-400'
        }`}>
          {bulkMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertCircle className="w-5 h-5" />}
          <span className="text-sm font-bold uppercase tracking-tight">{bulkMessage.text}</span>
          <button onClick={() => setBulkMessage(null)} className="ml-auto p-1 hover:bg-white/10 rounded-lg"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Modern Ticket List */}
      <div className="space-y-4">
        {loading ? (
          Array(5).fill(0).map((_, i) => <div key={i} className="h-24 bg-slate-900/30 border border-slate-800 rounded-[28px] animate-pulse" />)
        ) : tickets.length === 0 ? (
          <div className="py-24 text-center bg-slate-900/20 rounded-[40px] border border-dashed border-slate-800">
             <Ticket className="w-16 h-16 text-slate-700 mx-auto mb-4" />
             <h3 className="text-xl font-black text-slate-500 uppercase tracking-widest italic">Signal Lost — No Tickets Found</h3>
          </div>
        ) : (
    tickets.map((ticket) => (
            <div 
              key={ticket.id}
              onClick={() => openDetail(ticket.id)}
              className={`group relative bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800/80 p-6 rounded-[32px] hover:bg-slate-100 dark:hover:bg-slate-900 hover:border-indigo-200 dark:hover:border-indigo-500/40 transition-all duration-500 cursor-pointer backdrop-blur-xl flex flex-col md:flex-row md:items-center gap-6 overflow-hidden ${
                ticket.priority === 'CRITICAL' ? 'shadow-[0_0_20px_rgba(244,63,94,0.05)]' : 'shadow-sm dark:shadow-none'
              }`}
            >
              {/* Vertical Accent */}
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                ticket.priority === 'CRITICAL' ? 'bg-rose-600' : 
                ticket.priority === 'HIGH' ? 'bg-orange-500' : 
                'bg-slate-800'
              }`} />

              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <span className="font-mono text-[10px] text-slate-600 font-bold group-hover:text-indigo-400 transition-colors uppercase tracking-widest whitespace-nowrap">
                    #{ticket.ticketNumber}
                   </span>
                   <PremiumPriorityBadge priority={ticket.priority} />
                   <PremiumStatusBadge status={ticket.status} />
                   {ticket.category && ticket.category !== 'INCIDENT' && (
                     <span className="bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border border-indigo-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest">
                       {ticket.category}
                     </span>
                   )}
                   {ticket.slaTracking?.resolutionBreached && (
                     <span className="bg-rose-600/10 text-rose-500 border border-rose-500/20 px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest flex items-center gap-1">
                       <Zap className="w-2.5 h-2.5" /> SLA Breach
                     </span>
                   )}
                 </div>
                 <h3 className="text-slate-950 dark:text-white font-black text-lg group-hover:translate-x-1 transition-all duration-500 truncate">{ticket.customer || 'Unknown Subscriber'}</h3>
                 <div className="flex items-center gap-4 mt-2 text-slate-400 dark:text-slate-500 text-[10px] font-black uppercase tracking-widest">
                   <div className="flex items-center gap-1.5"><MapPin className="w-3 h-3 text-slate-300 dark:text-slate-600" /> {ticket.location || 'N/A'}</div>
                   <div className="flex items-center gap-1.5"><Clock className="w-3 h-3 text-slate-300 dark:text-slate-600" /> {new Date(ticket.createdAt).toLocaleDateString()}</div>
                 </div>
               </div>

              <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-slate-800/50">
                <div className="text-right flex flex-col items-end">
                   <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Operator</div>
                   <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                         <User className="w-3 h-3 text-slate-400" />
                      </div>
                      <span className="text-white text-xs font-bold">{ticket.assignedTo?.displayName || 'Unassigned'}</span>
                   </div>
                </div>
                <div className="flex items-center gap-4">
                  <div className={`p-4 rounded-2xl bg-slate-950/50 border border-slate-800 group-hover:bg-indigo-600 group-hover:border-indigo-400 transition-all duration-500 group-hover:rotate-[360deg]`}>
                    <ArrowRight className="w-5 h-5 text-slate-500 group-hover:text-white" />
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Pagination Intelligence */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between bg-slate-900/30 border border-slate-800/50 p-6 rounded-[32px] backdrop-blur-2xl">
           <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
             Batch <span className="text-white">{page}</span> of <span className="text-white">{totalPages}</span> — <span className="text-white">{total}</span> Active Threads
           </div>
           
           <div className="flex items-center gap-3">
              <button 
                 onClick={() => setPage(p => Math.max(1, p - 1))}
                 disabled={page <= 1}
                 className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 hover:text-white disabled:opacity-20 transition-all border border-slate-700 active:scale-95"
              >
                 <ChevronLeft className="w-5 h-5" />
              </button>
              
              <button 
                 onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                 disabled={page >= totalPages}
                 className="p-4 bg-slate-800 text-slate-400 rounded-2xl hover:bg-slate-700 hover:text-white disabled:opacity-20 transition-all border border-slate-700 active:scale-95"
              >
                 <ChevronRight className="w-5 h-5" />
              </button>
           </div>
        </div>
      )}

      {/* Detail Intelligence Modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-300 overflow-y-auto">
          <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-8 md:p-12 max-w-4xl w-full shadow-2xl relative overflow-hidden my-auto ring-1 ring-white/5">
            <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-600/10 blur-[120px]" />
            <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-rose-600/5 blur-[100px]" />

            <div className="relative z-10">
              <div className="flex justify-between items-start mb-10">
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-black text-indigo-400 tracking-tighter uppercase underline decoration-indigo-500/30 underline-offset-4 decoration-2">Thread Registry: {selected.ticketNumber}</span>
                    <PremiumPriorityBadge priority={selected.priority} />
                  </div>
                  <h2 className="text-3xl font-black text-white italic uppercase tracking-tight leading-tight">{selected.customer || 'Unknown Subscriber'}</h2>
                </div>
                <button 
                  onClick={() => setSelected(null)}
                  className="p-4 bg-slate-800 text-slate-400 rounded-3xl hover:bg-rose-600 hover:text-white transition-all border border-slate-700 hover:border-rose-500 shadow-xl"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-10 text-center">
                 {[
                   { label: 'Current Status', value: <PremiumStatusBadge status={selected.status} /> },
                   { label: 'Incident Origin', value: selected.platform || 'N/A' },
                   { label: 'Asset Location', value: selected.location || 'Global' },
                   { label: 'SLA Status', value: selected.slaTracking?.resolutionBreached ? <span className="text-rose-500 font-black">BREACHED</span> : <span className="text-emerald-500 font-black">STABLE</span> }
                 ].map((item, i) => (
                   <div key={i} className="bg-slate-950/50 p-4 rounded-[24px] border border-slate-800/50">
                      <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-2">{item.label}</div>
                      <div className="text-white text-xs font-bold">{item.value}</div>
                   </div>
                 ))}
              </div>

              <div className="space-y-6 mb-10">
                {/* Technical Specifications Section */}
                {(selected.ao || selected.sid || selected.ipAddress || selected.hostnameSwitch) && (
                  <div className="bg-slate-50 dark:bg-slate-900/40 p-6 rounded-[32px] border border-indigo-500/10 backdrop-blur-md">
                     <div className="flex items-center gap-2 mb-4">
                        <Activity className="w-4 h-4 text-indigo-400" />
                        <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Technical Specifications</span>
                     </div>
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {selected.ao && (
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">AO Number</div>
                            <div className="text-white text-xs font-mono bg-slate-950/50 px-2 py-1 rounded inline-block">{selected.ao}</div>
                          </div>
                        )}
                        {selected.sid && (
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">SID</div>
                            <div className="text-white text-xs font-mono bg-slate-950/50 px-2 py-1 rounded inline-block">{selected.sid}</div>
                          </div>
                        )}
                        {selected.service && (
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Service Type</div>
                            <div className="text-white text-xs font-bold">{selected.service}</div>
                          </div>
                        )}
                        {selected.ipAddress && (
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">IP Address / Gateway</div>
                            <div className="text-white text-xs font-mono">{selected.ipAddress} <span className="text-slate-500">/</span> {selected.gateway || '-'}</div>
                          </div>
                        )}
                        {selected.vlanId && (
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">VLAN (ID/Name)</div>
                            <div className="text-white text-xs font-bold">{selected.vlanId} <span className="text-slate-500">-</span> {selected.vlanName || 'N/A'}</div>
                          </div>
                        )}
                        {selected.hostnameSwitch && (
                          <div>
                            <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">Hostname / Port</div>
                            <div className="text-white text-xs font-bold">{selected.hostnameSwitch} <span className="text-slate-500">@</span> {selected.port || '-'}</div>
                          </div>
                        )}
                     </div>
                  </div>
                )}

                <div className="group bg-slate-950/80 p-6 rounded-[32px] border border-slate-800 transition-all hover:border-slate-600">
                   <div className="flex items-center gap-2 mb-4">
                      <ShieldAlert className="w-4 h-4 text-amber-500" />
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Problem Description</span>
                   </div>
                   <p className="text-slate-300 text-sm leading-relaxed font-bold italic tracking-tight underline decoration-slate-800 underline-offset-8">"{selected.problem}"</p>
                </div>

                {selected.rootCause && (
                  <div className="bg-rose-600/5 p-6 rounded-[32px] border border-rose-500/20">
                     <div className="flex items-center gap-2 mb-2">
                        <Activity className="w-4 h-4 text-rose-500" />
                        <span className="text-[10px] font-black text-rose-500 uppercase tracking-widest">Root Cause Diagnostics</span>
                     </div>
                     <p className="text-rose-200/80 text-sm font-medium">{selected.rootCause}</p>
                  </div>
                )}

                {selected.solution && (
                  <div className="bg-emerald-600/5 p-6 rounded-[32px] border border-emerald-500/20">
                     <div className="flex items-center gap-2 mb-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                        <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Resolution Package</span>
                     </div>
                     <p className="text-emerald-200/80 text-sm font-medium">{selected.solution}</p>
                  </div>
                )}
              </div>

              {/* Action Terminal */}
              {!['RESOLVED', 'CLOSED'].includes(selected.status) && (
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4 border-t border-slate-800/80 pt-10">
                   {selected.status === 'OPEN' && (
                     <button 
                       onClick={() => updateStatus(selected.id, 'IN_PROGRESS')}
                       className="bg-amber-600/10 border border-amber-500/20 text-amber-500 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-amber-600 hover:text-white transition-all shadow-xl shadow-amber-500/5"
                     >
                       Begin Handling
                     </button>
                   )}
                   <button 
                     onClick={() => updateStatus(selected.id, 'RESOLVED')}
                     className="bg-emerald-600/10 border border-emerald-500/20 text-emerald-500 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-xl shadow-emerald-500/5 flex items-center justify-center gap-2"
                   >
                     <CheckCircle2 className="w-4 h-4" />
                     Commit Resolve
                   </button>
                   <button 
                     onClick={() => updateStatus(selected.id, 'WAITING')}
                     className="bg-sky-600/10 border border-sky-500/20 text-sky-400 py-5 rounded-[24px] font-black uppercase text-xs tracking-widest hover:bg-sky-600 hover:text-white transition-all shadow-xl shadow-sky-500/5"
                   >
                     Hold Ticket
                   </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Bulk Resolve Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-6 bg-slate-950/95 backdrop-blur-3xl animate-in fade-in duration-300">
           <div className="bg-slate-900 border border-slate-800 rounded-[48px] p-12 max-w-md w-full shadow-2xl relative overflow-hidden">
              <div className="absolute -top-24 -right-24 w-48 h-48 bg-rose-600/20 blur-[100px]" />
              
              <div className="relative z-10 flex flex-col items-center text-center">
                 <div className="w-20 h-20 rounded-[28px] bg-rose-600 flex items-center justify-center text-white mb-8 border border-white/5 animate-pulse">
                    <AlertCircle className="w-10 h-10" />
                 </div>
                 <h2 className="text-2xl font-black text-white italic uppercase tracking-tight mb-2 underline decoration-rose-500 decoration-4 underline-offset-8">Critical override</h2>
                 <p className="text-slate-500 text-sm font-medium mb-10 leading-relaxed">
                   You are about to resolve <span className="text-white font-black">{bulkCandidateCount}</span> tickets simultaneously. This action will trigger global notifications and audit logs.
                 </p>

                 <div className="w-full space-y-4 mb-10">
                    <div className="flex justify-between items-center text-[10px] font-black text-slate-600 uppercase tracking-widest px-2">
                       <span>Verification string</span>
                       <span className="text-rose-500">REQUIRED</span>
                    </div>
                    <input 
                       value={bulkConfirmText}
                       onChange={(e) => setBulkConfirmText(e.target.value)}
                       placeholder="Type RESOLVE to confirm"
                       className="w-full bg-slate-950 border border-slate-800 text-white p-5 rounded-2xl outline-none focus:border-rose-500 placeholder:text-slate-800 text-center font-black tracking-widest text-xs"
                    />
                 </div>

                 <div className="flex flex-col w-full gap-3">
                    <button 
                       disabled={bulkConfirmText !== 'RESOLVE' || bulkResolving}
                       onClick={executeBulkResolve}
                       className="w-full py-5 bg-rose-600 text-white rounded-[24px] font-black uppercase text-xs tracking-[0.2em] disabled:opacity-30 disabled:grayscale transition-all shadow-xl shadow-rose-600/20"
                    >
                       {bulkResolving ? 'Executing...' : 'Force Sync Resolve'}
                    </button>
                    <button 
                       onClick={() => setBulkModalOpen(false)}
                       className="w-full py-4 text-slate-500 font-bold hover:text-white transition-colors uppercase text-[10px] tracking-widest"
                    >
                       Abort Operation
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
