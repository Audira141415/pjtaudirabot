import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { StatusBadge, PriorityBadge, CategoryBadge } from '../lib/badge-colors';
import { Ticket, Search, ChevronLeft, ChevronRight, Eye, X } from 'lucide-react';

export default function TicketsPage() {
  const [tickets, setTickets] = useState<Array<Record<string, any>>>([]);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [selected, setSelected] = useState<Record<string, any> | null>(null);
  const limit = 20;

  const loadData = async () => {
    try {
      const filters: Record<string, string> = {};
      if (search) filters.search = search;
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      const res = await api.getTickets(page, limit, filters);
      setTickets(res.data as any);
      setTotal(res.pagination.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { setLoading(true); loadData(); }, [page, statusFilter, priorityFilter]);

  const handleSearch = () => { setPage(1); setLoading(true); loadData(); };

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

  const totalPages = Math.ceil(total / limit);

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
      </div>

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
