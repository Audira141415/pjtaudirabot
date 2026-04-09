import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ScrollText, RefreshCw, Search, CheckCircle, XCircle, Clock, RotateCcw } from 'lucide-react';

const STATUS_STYLE: Record<string, { icon: React.ElementType; color: string }> = {
  SUCCESS: { icon: CheckCircle, color: 'text-emerald-500' },
  FAILED: { icon: XCircle, color: 'text-red-500' },
  PENDING: { icon: Clock, color: 'text-amber-500' },
  RETRYING: { icon: RotateCcw, color: 'text-blue-500' },
};

export default function WebhookLogs() {
  const [logs, setLogs] = useState<Array<Record<string, any>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = async () => { setLoading(true); try { const r = await api.getWebhookLogs(undefined, filterStatus || undefined, page); setLogs(r.data ?? []); setTotal(r.total ?? 0); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, [page, filterStatus]);

  const filtered = logs.filter(l => !search || l.url?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><ScrollText className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Webhook Logs</h1></div>
        <div className="flex gap-2">
          <span className="text-sm text-gray-500 self-center">{total} log</span>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari URL..." className="w-full pl-10 pr-3 py-2 border rounded-lg" /></div>
        <select value={filterStatus} onChange={e => { setFilterStatus(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2"><option value="">Semua Status</option>{['SUCCESS','FAILED','PENDING','RETRYING'].map(s => <option key={s} value={s}>{s}</option>)}</select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left p-3">Status</th><th className="text-left p-3">URL</th><th className="text-left p-3">Method</th><th className="text-left p-3">Response</th><th className="text-left p-3">Durasi</th><th className="text-left p-3">Retry</th><th className="text-left p-3">Waktu</th></tr></thead>
          <tbody>
            {filtered.map(l => {
              const S = STATUS_STYLE[l.status] || STATUS_STYLE.PENDING;
              return (<>
                <tr key={l.id} className="border-t hover:bg-gray-50 cursor-pointer" onClick={() => setExpanded(expanded === l.id ? null : l.id)}>
                  <td className="p-3"><S.icon className={`w-4 h-4 ${S.color}`} /></td>
                  <td className="p-3 font-mono text-xs truncate max-w-xs">{l.url}</td>
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-gray-100">{l.method}</span></td>
                  <td className="p-3"><span className={`font-mono text-xs ${l.responseStatus >= 200 && l.responseStatus < 300 ? 'text-emerald-600' : 'text-red-600'}`}>{l.responseStatus || '-'}</span></td>
                  <td className="p-3 text-gray-500">{l.duration ? `${l.duration}ms` : '-'}</td>
                  <td className="p-3 text-gray-500">{l.retryCount || 0}</td>
                  <td className="p-3 text-xs text-gray-500">{new Date(l.createdAt).toLocaleString('id-ID')}</td>
                </tr>
                {expanded === l.id && (
                  <tr key={l.id + '-detail'} className="bg-gray-50"><td colSpan={7} className="p-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div><p className="text-xs font-medium mb-1">Request Body</p><pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-auto max-h-48">{JSON.stringify(l.requestBody, null, 2) || 'null'}</pre></div>
                      <div><p className="text-xs font-medium mb-1">Response</p><pre className="bg-gray-900 text-green-400 p-3 rounded-lg text-xs overflow-auto max-h-48">{l.responseBody || l.error || 'null'}</pre></div>
                    </div>
                  </td></tr>
                )}
              </>);
            })}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada webhook log</td></tr>}
          </tbody>
        </table>
      </div>

      {total > 50 && <div className="flex justify-center gap-2 mt-4">{Array.from({length: Math.ceil(total / 50)}, (_, i) => <button key={i} onClick={() => setPage(i+1)} className={`px-3 py-1 rounded ${page === i+1 ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>{i+1}</button>)}</div>}
    </div>
  );
}
