import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const SENTIMENT_COLORS: Record<string, string> = {
  POSITIVE: 'bg-emerald-100 text-emerald-800',
  NEGATIVE: 'bg-red-100 text-red-800',
  NEUTRAL: 'bg-gray-100 text-gray-700',
  MIXED: 'bg-amber-100 text-amber-800',
};

const SENTIMENT_EMOJI: Record<string, string> = {
  POSITIVE: '😊',
  NEGATIVE: '😠',
  NEUTRAL: '😐',
  MIXED: '🤔',
};

export default function SentimentAnalysis() {
  const [logs, setLogs] = useState<Array<Record<string, unknown>>>([]);
  const [distribution, setDistribution] = useState<Record<string, { count: number; avgScore: number }>>({});
  const [trends, setTrends] = useState<Array<Record<string, unknown>>>([]);
  const [filter, setFilter] = useState('');
  const [days, setDays] = useState('7');
  const [loading, setLoading] = useState(true);

  const load = async () => {
    setLoading(true);
    try {
      const [sentRes, trendRes] = await Promise.all([
        api.getSentiment(1, { sentiment: filter, days }),
        api.getSentimentTrends(parseInt(days, 10)),
      ]);
      setLogs(sentRes.data);
      setDistribution(sentRes.distribution as Record<string, { count: number; avgScore: number }>);
      setTrends(trendRes.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter, days]);

  const totalMessages = Object.values(distribution).reduce((s, d) => s + (d.count || 0), 0);
  const avgScore = totalMessages > 0
    ? Object.values(distribution).reduce((s, d) => s + (d.avgScore || 0) * (d.count || 0), 0) / totalMessages
    : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Sentiment Analysis</h1>
        <div className="flex gap-2">
          <select value={days} onChange={e => setDays(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="7">7 Hari</option>
            <option value="14">14 Hari</option>
            <option value="30">30 Hari</option>
            <option value="90">90 Hari</option>
          </select>
          <select value={filter} onChange={e => setFilter(e.target.value)} className="px-3 py-2 border rounded-lg text-sm">
            <option value="">Semua Sentiment</option>
            <option value="POSITIVE">Positive</option>
            <option value="NEGATIVE">Negative</option>
            <option value="NEUTRAL">Neutral</option>
            <option value="MIXED">Mixed</option>
          </select>
        </div>
      </div>

      {/* Distribution Cards */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Pesan</p>
          <p className="text-2xl font-bold">{totalMessages}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Avg Score</p>
          <p className="text-2xl font-bold">{avgScore.toFixed(2)}</p>
        </div>
        {['POSITIVE', 'NEGATIVE', 'NEUTRAL'].map(s => (
          <div key={s} className="bg-white rounded-xl shadow p-4">
            <p className="text-sm text-gray-500">{SENTIMENT_EMOJI[s]} {s}</p>
            <p className="text-2xl font-bold">{(distribution[s] as any)?.count || 0}</p>
            <p className="text-xs text-gray-400">
              {totalMessages > 0
                ? `${(((distribution[s] as any)?.count || 0) / totalMessages * 100).toFixed(1)}%`
                : '0%'}
            </p>
          </div>
        ))}
      </div>

      {/* Sentiment Bar */}
      {totalMessages > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-medium text-gray-600 mb-2">Distribusi Sentiment</p>
          <div className="w-full h-8 rounded-full overflow-hidden flex">
            {['POSITIVE', 'NEUTRAL', 'MIXED', 'NEGATIVE'].map(s => {
              const pct = ((distribution[s] as any)?.count || 0) / totalMessages * 100;
              if (pct === 0) return null;
              const colors: Record<string, string> = { POSITIVE: 'bg-emerald-500', NEGATIVE: 'bg-red-500', NEUTRAL: 'bg-gray-400', MIXED: 'bg-amber-500' };
              return <div key={s} className={`${colors[s]} h-full`} style={{ width: `${pct}%` }} title={`${s}: ${pct.toFixed(1)}%`} />;
            })}
          </div>
          <div className="flex gap-4 mt-2 text-xs text-gray-500">
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-emerald-500" /> Positive</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-gray-400" /> Neutral</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-amber-500" /> Mixed</span>
            <span className="flex items-center gap-1"><span className="w-3 h-3 rounded bg-red-500" /> Negative</span>
          </div>
        </div>
      )}

      {/* Trend Chart (simplified text table) */}
      {trends.length > 0 && (
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm font-medium text-gray-600 mb-3">Tren Harian</p>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b">
                <th className="pb-2">Tanggal</th><th className="pb-2">Sentiment</th><th className="pb-2 text-right">Jumlah</th><th className="pb-2 text-right">Avg Score</th>
              </tr></thead>
              <tbody>
                {trends.slice(0, 30).map((t, i) => (
                  <tr key={i} className="border-b border-gray-50">
                    <td className="py-1.5">{new Date(t.date as string).toLocaleDateString('id-ID')}</td>
                    <td><span className={`px-2 py-0.5 rounded-full text-xs ${SENTIMENT_COLORS[t.sentiment as string] || 'bg-gray-100'}`}>{t.sentiment as string}</span></td>
                    <td className="text-right">{t.count as number}</td>
                    <td className="text-right">{(t.avgScore as number).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Message Logs */}
      <div className="bg-white rounded-xl shadow">
        <div className="p-4 border-b"><p className="font-medium text-gray-700">Log Pesan ({logs.length})</p></div>
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : logs.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Belum ada data sentiment</div>
        ) : (
          <div className="divide-y max-h-[500px] overflow-y-auto">
            {logs.map((log) => (
              <div key={log.id as string} className="p-4 hover:bg-gray-50 flex items-start gap-3">
                <span className="text-2xl mt-0.5">{SENTIMENT_EMOJI[log.sentiment as string] || '❓'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-800 line-clamp-2">{log.message as string}</p>
                  <div className="flex gap-2 mt-1 text-xs text-gray-400">
                    <span className={`px-2 py-0.5 rounded-full ${SENTIMENT_COLORS[log.sentiment as string]}`}>{log.sentiment as string}</span>
                    <span>Score: {(log.score as number)?.toFixed(2)}</span>
                    <span>Confidence: {((log.confidence as number || 0) * 100).toFixed(0)}%</span>
                    {!!log.platform && <span>{log.platform as string}</span>}
                    <span>{new Date(log.createdAt as string).toLocaleString('id-ID')}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
