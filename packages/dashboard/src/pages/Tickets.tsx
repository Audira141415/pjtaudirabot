import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../lib/badge-colors';
import { Ticket, Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

export default function TicketsPage() {
  type BulkResolveFilter = { status?: string; priority?: string; search?: string };

  const [tickets, setTickets] = useState<Array<Record<string, any>>>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [appliedSearch, setAppliedSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const [bulkResolving, setBulkResolving] = useState(false);
  const [bulkMessage, setBulkMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [bulkModalOpen, setBulkModalOpen] = useState(false);
  const [bulkModalStep, setBulkModalStep] = useState<1 | 2>(1);
  const [bulkCandidateCount, setBulkCandidateCount] = useState(0);
  const [bulkConfirmText, setBulkConfirmText] = useState('');
  const [bulkFilterSnapshot, setBulkFilterSnapshot] = useState<BulkResolveFilter>({});
  const limit = 20;

  const loadData = async () => {
    try {
      const filters: Record<string, string> = {};
      if (appliedSearch) filters.search = appliedSearch;
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      const res = await api.getTickets(page, limit, filters);
      setTickets(res.data as any);
      setTotal(res.pagination.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); loadData(); }, [page, statusFilter, priorityFilter, appliedSearch]);

  const handleSearch = () => { setAppliedSearch(search.trim()); setPage(1); };

  const openDetail = async (id: string) => {
    try {
      const res = await api.getTicket(id);
      setSelected(res.data as any);
    } catch (err) { console.error(err); }
  };

  const updateStatus = async (id: string, status: string) => {
    await api.updateTicket(id, { status });
    setSelected(null);
    loadData();
  };

  const closeBulkModal = (force = false) => {
    if (bulkResolving && !force) return;
    setBulkModalOpen(false);
    setBulkModalStep(1);
    setBulkCandidateCount(0);
    setBulkConfirmText('');
    setBulkFilterSnapshot({});
  };

  const handleBulkResolveFiltered = async () => {
    if (bulkResolving) return;

    if (['RESOLVED', 'CLOSED', 'CANCELLED'].includes(statusFilter)) {
      setBulkMessage({ type: 'error', text: 'Status filter terminal tidak bisa di-resolve massal.' });
      return;
    }

    const filter: BulkResolveFilter = {};
    if (statusFilter) filter.status = statusFilter;
    if (priorityFilter) filter.priority = priorityFilter;
    if (appliedSearch) filter.search = appliedSearch;

    if (!filter.status && !filter.priority && !filter.search) {
      setBulkMessage({ type: 'error', text: 'Aktifkan minimal satu filter sebelum bulk resolve.' });
      return;
    }

    setBulkResolving(true);
    setBulkMessage(null);
    try {
      const preview = await api.bulkResolveTickets({ filter, dryRun: true });
      const candidateCount = preview.data.candidateCount ?? 0;
      if (candidateCount === 0) {
        setBulkMessage({ type: 'error', text: 'Tidak ada tiket kandidat untuk di-resolve dengan filter saat ini.' });
        return;
      }

      setBulkFilterSnapshot(filter);
      setBulkCandidateCount(candidateCount);
      setBulkConfirmText('');
      setBulkModalStep(1);
      setBulkModalOpen(true);
    } catch (err) {
      setBulkMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bulk resolve gagal.' });
    } finally {
      setBulkResolving(false);
    }
  };

  const executeBulkResolve = async () => {
    if (bulkResolving) return;

    if (bulkConfirmText !== 'RESOLVE') {
      setBulkMessage({ type: 'error', text: 'Konfirmasi gagal. Ketik RESOLVE persis untuk mengeksekusi.' });
      return;
    }

    setBulkResolving(true);
    setBulkMessage(null);
    try {
      const res = await api.bulkResolveTickets({ filter: bulkFilterSnapshot });
      const resolvedCount = res.data.resolvedCount ?? 0;
      const jobId = res.data.jobId;
      setBulkMessage({
        type: 'success',
        text: jobId
          ? `Bulk resolve berhasil: ${resolvedCount} tiket di-resolve. Job ID: ${jobId.slice(0, 8)}...`
          : `Bulk resolve berhasil: ${resolvedCount} tiket di-resolve.`,
      });
      closeBulkModal(true);
      setSelected(null);
      await loadData();
    } catch (err) {
      setBulkMessage({ type: 'error', text: err instanceof Error ? err.message : 'Bulk resolve gagal.' });
    } finally {
      setBulkResolving(false);
    }
  };

  const totalPages = Math.ceil(total / limit);
  const hasNarrowingFilter = Boolean(appliedSearch || statusFilter || priorityFilter);

  if (loading && tickets.length === 0) {
    return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Ticket className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Tickets</h1>
          <span className="text-sm text-gray-500">({total})</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
            placeholder="Search tickets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          />
        </div>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}>
          <option value="">All Status</option>
          {['OPEN', 'IN_PROGRESS', 'WAITING', 'ESCALATED', 'RESOLVED', 'CLOSED'].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select className="border border-gray-300 rounded-lg px-3 py-2 text-sm" value={priorityFilter} onChange={(e) => { setPriorityFilter(e.target.value); setPage(1); }}>
          <option value="">All Priority</option>
          {['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
        <button
          onClick={handleBulkResolveFiltered}
          disabled={bulkResolving || tickets.length === 0 || !hasNarrowingFilter}
          className="px-4 py-2 rounded-lg bg-emerald-600 text-white text-sm font-medium hover:bg-emerald-700 disabled:opacity-50"
          title={!hasNarrowingFilter ? 'Aktifkan minimal satu filter (search/status/priority)' : undefined}
        >
          {bulkResolving ? 'Resolving...' : 'Resolve All Filtered Tickets'}
        </button>
      </div>

      {bulkMessage && (
        <div className={`mb-4 rounded-lg px-4 py-2 text-sm ${bulkMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
          {bulkMessage.text}
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Ticket #</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Customer</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Priority</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Category</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">SLA</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500">Created</th>
              <th className="text-left px-4 py-3 font-medium text-gray-500"></th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {tickets.map((t) => {
              const sla = t.slaTracking;
              const breached = sla?.responseBreached || sla?.resolutionBreached;
              return (
                <tr key={t.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-mono text-xs">{t.ticketNumber}</td>
                  <td className="px-4 py-3">{t.customer || '-'}</td>
                  <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                  <td className="px-4 py-3"><PriorityBadge priority={t.priority} /></td>
                  <td className="px-4 py-3"><CategoryBadge category={t.category} /></td>
                  <td className="px-4 py-3">
                    {sla ? (
                      <span className={`text-xs font-medium ${breached ? 'text-red-600' : 'text-emerald-600'}`}>
                        {breached ? 'BREACHED' : 'OK'}
                      </span>
                    ) : <span className="text-xs text-gray-400">N/A</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <button onClick={() => openDetail(t.id)} className="p-1 hover:bg-gray-100 rounded"><Eye className="w-4 h-4 text-gray-500" /></button>
                  </td>
                </tr>
              );
            })}
            {tickets.length === 0 && <tr><td colSpan={8} className="px-4 py-8 text-center text-gray-400">No tickets found</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between mt-4 text-sm text-gray-600">
        <span>Page {page} of {totalPages || 1} ({total} total)</span>
        <div className="flex gap-2">
          <button onClick={() => setPage(page - 1)} disabled={page <= 1} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronLeft className="w-4 h-4" /></button>
          <button onClick={() => setPage(page + 1)} disabled={page >= totalPages} className="p-2 rounded hover:bg-gray-100 disabled:opacity-30"><ChevronRight className="w-4 h-4" /></button>
        </div>
      </div>

      {/* Bulk Resolve Modal */}
      {bulkModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => closeBulkModal()}>
          <div className="bg-white rounded-xl w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Resolve All Filtered Tickets</h2>
                <p className="text-sm text-gray-500">
                  Step {bulkModalStep} of 2
                </p>
              </div>
              <button onClick={() => closeBulkModal()} disabled={bulkResolving} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                <X className="w-5 h-5" />
              </button>
            </div>

            {bulkModalStep === 1 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                  <p className="text-sm text-emerald-700">Candidate tickets to resolve</p>
                  <p className="text-2xl font-bold text-emerald-800">{bulkCandidateCount}</p>
                </div>

                <div className="rounded-lg border border-gray-200 p-4">
                  <p className="text-sm font-medium text-gray-700 mb-3">Applied filters</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Status</span>
                      <span className="font-medium text-gray-800">{bulkFilterSnapshot.status || 'Any'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Priority</span>
                      <span className="font-medium text-gray-800">{bulkFilterSnapshot.priority || 'Any'}</span>
                    </div>
                    <div className="flex justify-between gap-3">
                      <span className="text-gray-500">Search</span>
                      <span className="font-medium text-gray-800 text-right break-all">{bulkFilterSnapshot.search || 'None'}</span>
                    </div>
                  </div>
                </div>

                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => closeBulkModal()}
                    disabled={bulkResolving}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => setBulkModalStep(2)}
                    disabled={bulkResolving}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    Continue
                  </button>
                </div>
              </div>
            )}

            {bulkModalStep === 2 && (
              <div className="space-y-4">
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  Aksi ini akan mengubah {bulkCandidateCount} tiket menjadi RESOLVED. Ketik RESOLVE untuk konfirmasi.
                </div>
                <p className="text-xs text-gray-500">
                  Candidate count adalah hasil preview dan bisa berubah bila data tiket berubah sebelum eksekusi.
                </p>

                <div>
                  <label htmlFor="bulk-resolve-guard" className="block text-sm font-medium text-gray-700 mb-2">
                    Confirmation text
                  </label>
                  <input
                    id="bulk-resolve-guard"
                    value={bulkConfirmText}
                    onChange={(e) => setBulkConfirmText(e.target.value)}
                    placeholder="Type RESOLVE"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
                    disabled={bulkResolving}
                  />
                </div>

                <div className="flex justify-between gap-2">
                  <button
                    onClick={() => setBulkModalStep(1)}
                    disabled={bulkResolving}
                    className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                  >
                    Back
                  </button>
                  <button
                    onClick={executeBulkResolve}
                    disabled={bulkResolving || bulkConfirmText !== 'RESOLVE'}
                    className="px-4 py-2 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700 disabled:opacity-50"
                  >
                    {bulkResolving ? 'Resolving...' : 'Execute Bulk Resolve'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Detail Modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-white rounded-xl max-w-3xl w-full max-h-[80vh] overflow-y-auto p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-lg font-bold">{selected.ticketNumber}</h2>
                <p className="text-sm text-gray-500">{selected.title}</p>
              </div>
              <button onClick={() => setSelected(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-4">
              <div><span className="text-xs text-gray-500">Status</span><div><StatusBadge status={selected.status} /></div></div>
              <div><span className="text-xs text-gray-500">Priority</span><div><PriorityBadge priority={selected.priority} /></div></div>
              <div><span className="text-xs text-gray-500">Category</span><div><CategoryBadge category={selected.category} /></div></div>
              <div><span className="text-xs text-gray-500">Customer</span><p className="font-medium text-sm">{selected.customer || '-'}</p></div>
              <div><span className="text-xs text-gray-500">Location</span><p className="font-medium text-sm">{selected.location || '-'}</p></div>
              <div><span className="text-xs text-gray-500">SID</span><p className="font-mono text-xs">{selected.sid || '-'}</p></div>
              <div><span className="text-xs text-gray-500">Service</span><p className="font-medium text-sm">{selected.service || '-'}</p></div>
              <div><span className="text-xs text-gray-500">IP</span><p className="font-mono text-xs">{selected.ipAddress || '-'}</p></div>
              <div><span className="text-xs text-gray-500">Assigned To</span><p className="font-medium text-sm">{selected.assignedTo?.displayName || 'Unassigned'}</p></div>
            </div>
            <div className="mb-4"><span className="text-xs text-gray-500">Problem</span><p className="text-sm bg-gray-50 p-3 rounded mt-1">{selected.problem}</p></div>
            {selected.rootCause && <div className="mb-4"><span className="text-xs text-gray-500">Root Cause</span><p className="text-sm bg-amber-50 p-3 rounded mt-1">{selected.rootCause}</p></div>}
            {selected.solution && <div className="mb-4"><span className="text-xs text-gray-500">Solution</span><p className="text-sm bg-emerald-50 p-3 rounded mt-1">{selected.solution}</p></div>}

            {/* SLA Info */}
            {selected.slaTracking && (
              <div className="mb-4 p-3 bg-sky-50 rounded">
                <p className="text-xs font-medium text-sky-700 mb-2">SLA Tracking</p>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>Response Deadline: <span className="font-mono">{new Date(selected.slaTracking.responseDeadline).toLocaleString()}</span></div>
                  <div>Resolution Deadline: <span className="font-mono">{new Date(selected.slaTracking.resolutionDeadline).toLocaleString()}</span></div>
                  <div>Response Breached: <span className={selected.slaTracking.responseBreached ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                    {selected.slaTracking.responseBreached ? 'YES' : 'NO'}</span></div>
                  <div>Resolution Breached: <span className={selected.slaTracking.resolutionBreached ? 'text-red-600 font-bold' : 'text-emerald-600'}>
                    {selected.slaTracking.resolutionBreached ? 'YES' : 'NO'}</span></div>
                </div>
              </div>
            )}

            {/* Actions */}
            {!['RESOLVED', 'CLOSED'].includes(selected.status) && (
              <div className="flex gap-2 mt-4 border-t pt-4">
                {selected.status === 'OPEN' && <button onClick={() => updateStatus(selected.id, 'IN_PROGRESS')} className="px-4 py-2 bg-amber-500 text-white rounded-lg text-sm">Start Working</button>}
                <button onClick={() => updateStatus(selected.id, 'RESOLVED')} className="px-4 py-2 bg-emerald-500 text-white rounded-lg text-sm">Resolve</button>
                <button onClick={() => updateStatus(selected.id, 'CLOSED')} className="px-4 py-2 bg-gray-500 text-white rounded-lg text-sm">Close</button>
              </div>
            )}

            {/* History */}
            {selected.ticketHistory?.length > 0 && (
              <div className="mt-4 border-t pt-4">
                <p className="text-xs font-medium text-gray-500 mb-2">History</p>
                <div className="space-y-2 max-h-40 overflow-y-auto">
                  {selected.ticketHistory.map((h: any) => (
                    <div key={h.id} className="text-xs flex gap-2">
                      <span className="text-gray-400">{new Date(h.createdAt).toLocaleString()}</span>
                      <span className="font-medium">{h.action}</span>
                      {h.field && <span className="text-gray-500">{h.field}: {h.oldValue} → {h.newValue}</span>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
