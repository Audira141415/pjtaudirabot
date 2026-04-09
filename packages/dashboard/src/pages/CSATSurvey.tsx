import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Star, TrendingUp, Users, MessageSquare } from 'lucide-react';

export default function CSATSurvey() {
  const [surveys, setSurveys] = useState<Array<Record<string, any>>>([]);
  const [avgRating, setAvgRating] = useState(0);
  const [totalResponses, setTotalResponses] = useState(0);
  const [loading, setLoading] = useState(true);

  const load = async () => { setLoading(true); try { const r = await api.getCSAT(); setSurveys(r.data ?? []); setAvgRating(r.avgRating ?? 0); setTotalResponses(r.totalResponses ?? 0); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const ratingDist = [5,4,3,2,1].map(r => ({ rating: r, count: surveys.filter(s => s.rating === r).length }));
  const maxCount = Math.max(...ratingDist.map(d => d.count), 1);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6"><Star className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">CSAT Survey</h1></div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-5 text-center">
          <Star className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{avgRating.toFixed(1)}</p>
          <p className="text-sm text-gray-500">Rating Rata-rata</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <Users className="w-8 h-8 text-blue-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{totalResponses}</p>
          <p className="text-sm text-gray-500">Total Responden</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <TrendingUp className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{surveys.filter(s => s.rating >= 4).length}</p>
          <p className="text-sm text-gray-500">Puas (4-5)</p>
        </div>
        <div className="bg-white border rounded-xl p-5 text-center">
          <MessageSquare className="w-8 h-8 text-purple-500 mx-auto mb-2" />
          <p className="text-3xl font-bold">{surveys.filter(s => s.comment).length}</p>
          <p className="text-sm text-gray-500">Dengan Komentar</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white border rounded-xl p-5">
          <h3 className="font-bold mb-4">Distribusi Rating</h3>
          <div className="space-y-3">
            {ratingDist.map(d => (
              <div key={d.rating} className="flex items-center gap-3">
                <div className="flex items-center gap-1 w-12">{Array.from({length: d.rating}).map((_, i) => <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />)}</div>
                <div className="flex-1 bg-gray-100 rounded-full h-4 overflow-hidden"><div className="bg-yellow-400 h-full rounded-full transition-all" style={{ width: `${(d.count / maxCount) * 100}%` }} /></div>
                <span className="text-sm font-medium w-8 text-right">{d.count}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-2 bg-white border rounded-xl overflow-hidden">
          <div className="p-4 border-b"><h3 className="font-bold">Respons Terbaru</h3></div>
          <table className="w-full text-sm">
            <thead className="bg-gray-50"><tr><th className="text-left p-3">Platform</th><th className="text-left p-3">Rating</th><th className="text-left p-3">Komentar</th><th className="text-left p-3">Agent</th><th className="text-left p-3">Waktu</th></tr></thead>
            <tbody>
              {surveys.slice(0, 20).map(s => (
                <tr key={s.id} className="border-t hover:bg-gray-50">
                  <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{s.platform}</span></td>
                  <td className="p-3"><div className="flex">{Array.from({length: 5}).map((_, i) => <Star key={i} className={`w-3 h-3 ${i < s.rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-200'}`} />)}</div></td>
                  <td className="p-3 text-gray-600 max-w-xs truncate">{s.comment || <span className="text-gray-300">-</span>}</td>
                  <td className="p-3 text-gray-500">{s.agentId || '-'}</td>
                  <td className="p-3 text-xs text-gray-500">{new Date(s.respondedAt).toLocaleString('id-ID')}</td>
                </tr>
              ))}
              {surveys.length === 0 && <tr><td colSpan={5} className="text-center py-12 text-gray-400">Belum ada survey</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
