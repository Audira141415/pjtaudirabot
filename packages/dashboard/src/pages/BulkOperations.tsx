import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Layers, Loader2, CheckCircle2, XCircle, Clock } from 'lucide-react';

const STATUS_CONF: Record<string, { color: string; icon: JSX.Element }> = {
  PENDING: { color: 'bg-gray-100 text-gray-700', icon: <Clock className="w-4 h-4 text-gray-400" /> },
  PROCESSING: { color: 'bg-blue-100 text-blue-700', icon: <Loader2 className="w-4 h-4 text-blue-500 animate-spin" /> },
  COMPLETED: { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
  FAILED: { color: 'bg-red-100 text-red-700', icon: <XCircle className="w-4 h-4 text-red-500" /> },
  CANCELLED: { color: 'bg-gray-100 text-gray-500', icon: <XCircle className="w-4 h-4 text-gray-400" /> },
};

export default function BulkOperationsPage() {
  const [jobs, setJobs] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      try { const res = await api.getBulkJobs(); setJobs((res.data as any) ?? []); }
      catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <Layers className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Bulk Operations</h1>
      </div>

      <div className="space-y-3">
        {jobs.map((j) => {
          const sc = STATUS_CONF[j.status] ?? STATUS_CONF.PENDING;
          const pct = j.totalItems ? Math.round((j.processedItems / j.totalItems) * 100) : 0;
          return (
            <div key={j.id} className="bg-white rounded-xl border p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="flex items-center gap-2">
                    {sc.icon}
                    <h3 className="font-bold">{j.type ?? j.name ?? 'Bulk Job'}</h3>
                    <span className={`px-2 py-0.5 rounded text-xs font-medium ${sc.color}`}>{j.status}</span>
                  </div>
                  {j.description && <p className="text-sm text-gray-500 mt-1">{j.description}</p>}
                </div>
                <span className="text-xs text-gray-400">{new Date(j.createdAt).toLocaleString()}</span>
              </div>

              {j.totalItems > 0 && (
                <div className="mb-2">
                  <div className="flex justify-between text-xs text-gray-500 mb-1">
                    <span>{j.processedItems}/{j.totalItems} items</span>
                    <span>{pct}%</span>
                  </div>
                  <div className="w-full bg-gray-100 rounded-full h-2">
                    <div className={`h-2 rounded-full ${j.status === 'FAILED' ? 'bg-red-500' : j.status === 'COMPLETED' ? 'bg-emerald-500' : 'bg-blue-500'}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              )}

              <div className="flex gap-4 text-xs text-gray-500">
                {j.successCount != null && <span className="text-emerald-600">Success: {j.successCount}</span>}
                {j.failureCount != null && <span className="text-red-600">Failed: {j.failureCount}</span>}
                {j.completedAt && <span>Completed: {new Date(j.completedAt).toLocaleString()}</span>}
              </div>

              {j.errors?.length > 0 && (
                <div className="mt-2 bg-red-50 rounded-lg p-2">
                  <p className="text-xs font-medium text-red-700 mb-1">Errors:</p>
                  <ul className="text-xs text-red-600 list-disc list-inside">
                    {(j.errors as string[]).slice(0, 5).map((e: string, i: number) => <li key={i}>{e}</li>)}
                    {j.errors.length > 5 && <li>...and {j.errors.length - 5} more</li>}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
        {jobs.length === 0 && <div className="text-center py-12 text-gray-400">No bulk operations found</div>}
      </div>
    </div>
  );
}
