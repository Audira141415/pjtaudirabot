import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { BrainCircuit, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';

const SEVERITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700 border-red-200',
  MAJOR: 'bg-orange-100 text-orange-700 border-orange-200',
  MINOR: 'bg-amber-100 text-amber-700 border-amber-200',
  INFO: 'bg-blue-100 text-blue-700 border-blue-200',
};

const STATUS_COLORS: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-700',
  INVESTIGATING: 'bg-amber-100 text-amber-700',
  IDENTIFIED: 'bg-blue-100 text-blue-700',
  RESOLVED: 'bg-emerald-100 text-emerald-700',
  CLOSED: 'bg-gray-100 text-gray-700',
};

export default function AIInsightsPage() {
  const [incidents, setIncidents] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');

  const load = async () => {
    try {
      const res = await api.getIncidents(1, statusFilter ? { status: statusFilter } : undefined);
      setIncidents((res.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter]);

  const updateStatus = async (id: string, status: string) => {
    try { await api.updateIncident(id, { status }); load(); } catch (err) { console.error(err); }
  };

  const open = incidents.filter(i => i.status === 'OPEN').length;
  const investigating = incidents.filter(i => i.status === 'INVESTIGATING').length;
  const resolved = incidents.filter(i => ['RESOLVED', 'CLOSED'].includes(i.status)).length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <BrainCircuit className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">AI Insights & Incidents</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4">
          <p className="text-sm text-gray-500">Total Incidents</p>
          <p className="text-2xl font-bold">{incidents.length}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-1"><AlertTriangle className="w-4 h-4 text-red-500" /><p className="text-sm text-gray-500">Open</p></div>
          <p className="text-2xl font-bold text-red-600">{open}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-1"><Clock className="w-4 h-4 text-amber-500" /><p className="text-sm text-gray-500">Investigating</p></div>
          <p className="text-2xl font-bold text-amber-600">{investigating}</p>
        </div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-1"><CheckCircle2 className="w-4 h-4 text-emerald-500" /><p className="text-sm text-gray-500">Resolved</p></div>
          <p className="text-2xl font-bold text-emerald-600">{resolved}</p>
        </div>
      </div>

      <div className="flex gap-2 mb-4">
        {['', 'OPEN', 'INVESTIGATING', 'IDENTIFIED', 'RESOLVED', 'CLOSED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${statusFilter === s ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
            {s || 'All'}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {incidents.map((inc) => (
          <div key={inc.id} className={`rounded-xl border p-5 ${SEVERITY_COLORS[inc.severity] ?? 'bg-white border-gray-200'}`}>
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold">{inc.title}</h3>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[inc.status] ?? 'bg-gray-100'}`}>{inc.status}</span>
                </div>
                <p className="text-sm text-gray-600 mt-1">{inc.description}</p>
              </div>
              <span className="text-xs text-gray-500 shrink-0">{new Date(inc.createdAt).toLocaleString()}</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-3">
              {inc.rootCause && (
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Root Cause</p>
                  <p className="text-sm">{inc.rootCause}</p>
                </div>
              )}
              {inc.solution && (
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Solution</p>
                  <p className="text-sm">{inc.solution}</p>
                </div>
              )}
              {inc.affectedServices?.length > 0 && (
                <div className="bg-white/60 rounded-lg p-3">
                  <p className="text-xs font-medium text-gray-500 mb-1">Affected Services</p>
                  <div className="flex flex-wrap gap-1">{(inc.affectedServices as string[]).map((s: string, i: number) => <span key={i} className="bg-gray-100 px-2 py-0.5 rounded text-xs">{s}</span>)}</div>
                </div>
              )}
            </div>

            <div className="flex gap-2 mt-3">
              {inc.status === 'OPEN' && <button onClick={() => updateStatus(inc.id, 'INVESTIGATING')} className="px-3 py-1 bg-amber-500 text-white rounded text-xs">Investigate</button>}
              {inc.status === 'INVESTIGATING' && <button onClick={() => updateStatus(inc.id, 'IDENTIFIED')} className="px-3 py-1 bg-blue-500 text-white rounded text-xs">Root Cause Identified</button>}
              {inc.status === 'IDENTIFIED' && <button onClick={() => updateStatus(inc.id, 'RESOLVED')} className="px-3 py-1 bg-emerald-500 text-white rounded text-xs">Resolve</button>}
              {inc.status === 'RESOLVED' && <button onClick={() => updateStatus(inc.id, 'CLOSED')} className="px-3 py-1 bg-gray-500 text-white rounded text-xs">Close</button>}
            </div>
          </div>
        ))}
        {incidents.length === 0 && <div className="text-center py-12 text-gray-400">No incidents found</div>}
      </div>
    </div>
  );
}
