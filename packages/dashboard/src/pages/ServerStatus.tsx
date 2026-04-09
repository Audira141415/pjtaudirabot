import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Server, Cpu, MemoryStick, Clock, RefreshCw } from 'lucide-react';

export default function ServerStatusPage() {
  const [status, setStatus] = useState<Record<string, any> | null>(null);
  const [logs, setLogs] = useState<Array<Record<string, any>>>([]);
  const [logLevel, setLogLevel] = useState('');
  const [tab, setTab] = useState<'status' | 'logs'>('status');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try {
      const [s, l] = await Promise.all([api.getServerStatus(), api.getServerLogs(1, logLevel ? { level: logLevel } : undefined)]);
      setStatus(s.data as any);
      setLogs((l.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, [logLevel]);

  const Gauge = ({ label, value, max, unit, color }: { label: string; value: number; max: number; unit: string; color: string }) => {
    const pct = Math.min((value / max) * 100, 100);
    return (
      <div className="bg-white rounded-xl border p-4">
        <p className="text-sm text-gray-500 mb-2">{label}</p>
        <div className="flex items-end gap-2 mb-2">
          <span className="text-2xl font-bold">{typeof value === 'number' ? value.toFixed(1) : value}</span>
          <span className="text-sm text-gray-400">{unit}</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-3">
          <div className={`h-3 rounded-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{pct.toFixed(1)}% of {max}{unit}</p>
      </div>
    );
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Server className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Server Status</h1>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setTab('status')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'status' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Status</button>
          <button onClick={() => setTab('logs')} className={`px-3 py-1.5 rounded-lg text-sm font-medium ${tab === 'logs' ? 'bg-brand-500 text-white' : 'bg-gray-100 text-gray-600'}`}>Logs</button>
          <button onClick={load} className="p-1.5 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {tab === 'status' && status && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <Clock className="w-8 h-8 text-brand-500" />
              <div>
                <p className="text-sm text-gray-500">Uptime</p>
                <p className="font-bold">{Math.floor(status.uptime / 3600)}h {Math.floor((status.uptime % 3600) / 60)}m</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <Cpu className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-sm text-gray-500">CPU Cores</p>
                <p className="font-bold">{status.cpuCores}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <Server className="w-8 h-8 text-purple-500" />
              <div>
                <p className="text-sm text-gray-500">Platform</p>
                <p className="font-bold">{status.platform}</p>
              </div>
            </div>
            <div className="bg-white rounded-xl border p-4 flex items-center gap-3">
              <MemoryStick className="w-8 h-8 text-emerald-500" />
              <div>
                <p className="text-sm text-gray-500">Node.js</p>
                <p className="font-bold">{status.nodeVersion}</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Gauge label="Memory Used" value={status.memoryUsed} max={status.memoryTotal} unit=" GB" color={status.memoryUsed / status.memoryTotal > 0.85 ? 'bg-red-500' : status.memoryUsed / status.memoryTotal > 0.7 ? 'bg-amber-500' : 'bg-emerald-500'} />
            <Gauge label="Heap Used" value={status.heapUsed} max={status.heapTotal} unit=" MB" color={status.heapUsed / status.heapTotal > 0.85 ? 'bg-red-500' : 'bg-blue-500'} />
            <Gauge label="Load Avg (1m)" value={status.loadAvg?.[0] ?? 0} max={status.cpuCores} unit="" color={((status.loadAvg?.[0] ?? 0) / status.cpuCores) > 0.8 ? 'bg-red-500' : 'bg-purple-500'} />
          </div>

          {status.loadAvg && (
            <div className="bg-white rounded-xl border p-4">
              <h3 className="font-bold mb-3">Load Average</h3>
              <div className="flex gap-8">
                <div><span className="text-gray-500 text-sm">1m:</span> <span className="font-bold">{status.loadAvg[0]?.toFixed(2)}</span></div>
                <div><span className="text-gray-500 text-sm">5m:</span> <span className="font-bold">{status.loadAvg[1]?.toFixed(2)}</span></div>
                <div><span className="text-gray-500 text-sm">15m:</span> <span className="font-bold">{status.loadAvg[2]?.toFixed(2)}</span></div>
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'logs' && (
        <div className="space-y-4">
          <div className="flex gap-2">
            {['', 'ERROR', 'WARN', 'INFO', 'DEBUG'].map((l) => (
              <button key={l} onClick={() => setLogLevel(l)} className={`px-3 py-1.5 rounded-lg text-sm ${logLevel === l ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>
                {l || 'All'}
              </button>
            ))}
          </div>
          <div className="bg-gray-900 rounded-xl p-4 max-h-[600px] overflow-auto font-mono text-xs">
            {logs.map((log, i) => (
              <div key={i} className="flex gap-2 py-0.5">
                <span className="text-gray-500 shrink-0">{new Date(log.timestamp ?? log.createdAt).toLocaleTimeString()}</span>
                <span className={`shrink-0 w-14 ${log.level === 'ERROR' ? 'text-red-400' : log.level === 'WARN' ? 'text-amber-400' : log.level === 'INFO' ? 'text-blue-400' : 'text-gray-400'}`}>[{log.level}]</span>
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
            {logs.length === 0 && <p className="text-gray-500">No logs found</p>}
          </div>
        </div>
      )}
    </div>
  );
}
