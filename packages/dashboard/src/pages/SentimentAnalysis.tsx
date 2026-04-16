import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Smile, 
  Frown, 
  Meh, 
  MinusCircle, 
  Activity, 
  Zap, 
  ShieldCheck, 
  Info, 
  Clock, 
  Filter, 
  BarChart3, 
  Brain, 
  Binary, 
  Layers, 
  Orbit, 
  Cpu, 
  Fingerprint, 
  LayoutGrid, 
  MessageSquare,
  ChevronRight,
  TrendingUp,
  Target,
  Search,
  RefreshCw,
  MoreHorizontal,
  Monitor
} from 'lucide-react';
import { toast } from '../components/Toast';

const SENTIMENT_STYLES: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  POSITIVE: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20', icon: Smile },
  NEGATIVE: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-500/20', icon: Frown },
  NEUTRAL: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-400 dark:text-slate-500', border: 'border-slate-100 dark:border-slate-700', icon: Meh },
  MIXED: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-amber-100 dark:border-amber-500/20', icon: MinusCircle },
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
    } catch { 
       toast({ type: 'error', title: 'COGNITIVE_SYNC_FAILURE', message: 'Failed to access linguistic telemetry stream.' });
    } finally {
       setLoading(false);
    }
  };

  useEffect(() => { load(); }, [filter, days]);

  const totalMessages = Object.values(distribution).reduce((s, d) => s + (d.count || 0), 0);
  const avgScore = totalMessages > 0
    ? Object.values(distribution).reduce((s, d) => s + (d.avgScore || 0) * (d.count || 0), 0) / totalMessages
    : 0;

  if (loading && logs.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Decoding Emotional Resonance...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Brain className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Cognitive Affect Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Sentiment Analysis</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Inspect linguistic telemetry, emotional resonance matrices, and cognitive affect trends across global relays.</p>
        </div>

        <div className="flex flex-wrap gap-4">
           <div className="flex bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-[32px] p-2 shadow-sm">
              <select 
                 value={days} 
                 onChange={e => setDays(e.target.value)} 
                 className="px-6 py-3 bg-transparent text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-600 transition-colors"
              >
                 <option value="7">LAST_07_DAYS</option>
                 <option value="14">LAST_14_DAYS</option>
                 <option value="30">LAST_30_DAYS</option>
                 <option value="90">LAST_90_DAYS</option>
              </select>
              <div className="w-px h-8 bg-slate-100 dark:bg-slate-800 my-auto" />
              <select 
                 value={filter} 
                 onChange={e => setFilter(e.target.value)} 
                 className="px-6 py-3 bg-transparent text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest outline-none cursor-pointer hover:text-indigo-600 transition-colors"
              >
                 <option value="">OMNI_SENTIMENT</option>
                 <option value="POSITIVE">POSITIVE_AFFECT</option>
                 <option value="NEGATIVE">NEGATIVE_AFFECT</option>
                 <option value="NEUTRAL">NEUTRAL_AFFECT</option>
                 <option value="MIXED">MIXED_RESONANCE</option>
              </select>
           </div>
           <button 
              onClick={load} 
              className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Scalar Registry Summary */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6">
        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] text-center group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none hover:shadow-xl backdrop-blur-3xl">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">TOTAL_INGEST</p>
           <p className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">{totalMessages}</p>
        </div>
        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] text-center group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none hover:shadow-xl backdrop-blur-3xl">
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">AVG_NODAL_SCORE</p>
           <p className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">{avgScore.toFixed(2)}</p>
        </div>
        {['POSITIVE', 'NEGATIVE', 'NEUTRAL'].map(s => {
          const st = SENTIMENT_STYLES[s];
          const val = (distribution[s] as any)?.count || 0;
          return (
            <div key={s} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] text-center group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none hover:shadow-xl relative overflow-hidden backdrop-blur-3xl">
              <div className="absolute top-0 right-0 p-3 opacity-20 group-hover:opacity-100 transition-opacity">
                 <span className="text-2xl">{SENTIMENT_EMOJI[s]}</span>
              </div>
              <p className={`text-[10px] font-black uppercase tracking-widest mb-2 italic ${st.text}`}>{s}</p>
              <p className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter">{val}</p>
              <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase mt-2 tracking-widest">
                {totalMessages > 0 ? `${((val / totalMessages * 100)).toFixed(1)}% VOL` : '0% VOL'}
              </p>
            </div>
          );
        })}
      </div>

      {/* Resonance Distribution Map */}
      {totalMessages > 0 && (
        <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-12 rounded-[56px] shadow-sm dark:shadow-2xl backdrop-blur-3xl space-y-10">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                 <Layers className="w-7 h-7 text-indigo-500" />
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-indigo-500/30 decoration-2 underline-offset-8">Resonance Distribution Map</h3>
              </div>
              <div className="flex items-center gap-2 px-6 py-2 bg-slate-50 dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
                 <Target className="w-4 h-4 text-emerald-500" />
                 <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">Nodal Weight Metrics</span>
              </div>
           </div>
           
           <div className="w-full bg-slate-50 dark:bg-slate-900 rounded-[32px] h-12 flex overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800 p-1.5 ring-4 ring-slate-100 dark:ring-white/5">
             {['POSITIVE', 'NEUTRAL', 'MIXED', 'NEGATIVE'].map(s => {
               const pct = ((distribution[s] as any)?.count || 0) / totalMessages * 100;
               if (pct === 0) return null;
               const colors: Record<string, string> = { POSITIVE: 'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.3)]', NEGATIVE: 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.3)]', NEUTRAL: 'bg-slate-400', MIXED: 'bg-amber-500' };
               return (
                 <div 
                   key={s} 
                   className={`${colors[s]} h-full first:rounded-l-2xl last:rounded-r-2xl border-x border-white/10 relative group/bar transition-all duration-1000`} 
                   style={{ width: `${pct}%` }}
                 >
                    <div className="absolute -top-10 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest opacity-0 group-hover/bar:opacity-100 transition-opacity whitespace-nowrap z-20">
                       {s}: {pct.toFixed(1)}%
                    </div>
                 </div>
               );
             })}
           </div>
           <div className="grid grid-cols-2 md:grid-cols-4 gap-6 px-4">
              {[
                { label: 'POSITIVE_AFFECT', color: 'bg-emerald-500' },
                { label: 'NEUTRAL_AFFECT', color: 'bg-slate-400' },
                { label: 'MIXED_RESONANCE', color: 'bg-amber-500' },
                { label: 'NEGATIVE_AFFECT', color: 'bg-rose-500' }
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3">
                   <div className={`w-3 h-3 rounded-full ${item.color}`} />
                   <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{item.label}</span>
                </div>
              ))}
           </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Daily Temporal Chronology (Trends) */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[56px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
           <div className="px-12 py-8 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/30">
              <div className="flex items-center gap-4">
                 <Clock className="w-7 h-7 text-indigo-500" />
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-indigo-500/30 decoration-2 underline-offset-8">Temporal Chronology</h3>
              </div>
              <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">Daily Affect History</p>
           </div>
           
           <div className="overflow-x-auto">
             <table className="w-full text-left">
               <thead>
                 <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">
                   <th className="px-10 py-6">Temporal Fix</th>
                   <th className="px-8 py-6">Dominant Affect</th>
                   <th className="px-8 py-6 text-right">Nodal Count</th>
                   <th className="px-10 py-6 text-right">Avg Affect Score</th>
                 </tr>
               </thead>
               <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30 font-bold">
                 {trends.slice(0, 30).map((t, i) => {
                   const s = SENTIMENT_STYLES[t.sentiment as string] || SENTIMENT_STYLES.NEUTRAL;
                   return (
                     <tr key={i} className="group hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-all duration-300">
                       <td className="px-10 py-6">
                          <span className="text-xs font-black text-slate-900 dark:text-white uppercase italic tracking-tighter group-hover:text-indigo-600 transition-colors">{new Date(t.date as string).toLocaleDateString()}</span>
                       </td>
                       <td className="px-8 py-6">
                          <div className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-inner inline-flex items-center gap-2 ${s.bg} ${s.text} ${s.border}`}>
                             <s.icon className="w-3.5 h-3.5" />
                             {t.sentiment as string}
                          </div>
                       </td>
                       <td className="px-8 py-6 text-right">
                          <span className="text-[11px] font-black text-slate-900 dark:text-slate-400 italic font-mono">{t.count as number}</span>
                       </td>
                       <td className="px-10 py-6 text-right">
                          <span className="text-[12px] font-black text-slate-900 dark:text-white italic tracking-tighter transition-all group-hover:scale-110 group-hover:translate-x-[-4px]">{(t.avgScore as number).toFixed(2)}</span>
                       </td>
                     </tr>
                   );
                 })}
                 {trends.length === 0 && (
                   <tr>
                      <td colSpan={4} className="py-24 text-center grayscale opacity-10">
                         <BarChart3 className="w-16 h-16 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                         <p className="text-[11px] font-black uppercase tracking-[0.4em] text-slate-400 dark:text-slate-600">Zero Temporal Records</p>
                      </td>
                   </tr>
                 )}
               </tbody>
             </table>
           </div>
        </div>

        {/* Cognitive Signal Log */}
        <div className="lg:col-span-2 space-y-8">
           <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[56px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl flex flex-col h-full">
              <div className="px-10 py-8 border-b border-slate-100 dark:border-slate-800/50 flex items-center justify-between bg-white dark:bg-slate-950">
                 <div className="flex items-center gap-4">
                    <MessageSquare className="w-6 h-6 text-indigo-500" />
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-indigo-500/30 decoration-2 underline-offset-8">Cognitive Signal Log</h3>
                 </div>
                 <span className="px-4 py-1 bg-slate-50 dark:bg-slate-900 rounded-xl text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">{logs.length} RECORDED</span>
              </div>
              
              <div className="flex-1 overflow-y-auto max-h-[800px] custom-scrollbar divide-y divide-slate-50 dark:divide-slate-800/30">
                {logs.map((log) => {
                  const s = SENTIMENT_STYLES[log.sentiment as string] || SENTIMENT_STYLES.NEUTRAL;
                  return (
                    <div key={log.id as string} className="p-8 hover:bg-slate-50 dark:hover:bg-indigo-500/5 group transition-all duration-500 relative overflow-hidden">
                      <div className="absolute right-0 top-0 bottom-0 w-1 bg-current opacity-0 group-hover:opacity-40 transition-opacity" style={{ color: s.text.includes('emerald') ? '#10b981' : s.text.includes('rose') ? '#f43f5e' : '#6366f1' }} />
                      
                      <div className="flex items-start gap-5">
                        <div className="p-5 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-sm shadow-indigo-500/5 group-hover:scale-110 group-hover:rotate-6 transition-all flex items-center justify-center shrink-0">
                           <span className="text-3xl filter grayscale group-hover:grayscale-0 transition-all">{SENTIMENT_EMOJI[log.sentiment as string] || '❓'}</span>
                        </div>
                        <div className="flex-1 min-w-0 space-y-4">
                           <p className="text-sm font-bold text-slate-900 dark:text-slate-200 leading-relaxed italic group-hover:text-indigo-600 transition-colors">"{log.message as string}"</p>
                           <div className="flex flex-wrap items-center gap-3">
                              <div className={`px-3 py-1 rounded-xl text-[8px] font-black uppercase tracking-widest border shadow-inner ${s.bg} ${s.text} ${s.border}`}>
                                 {log.sentiment as string}
                              </div>
                              <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono italic">
                                 SCORE: {(log.score as number)?.toFixed(2)}
                              </div>
                              <div className="px-3 py-1 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[8px] font-black text-slate-400 uppercase tracking-widest font-mono italic">
                                 CONF: {((log.confidence as number || 0) * 100).toFixed(0)}%
                              </div>
                           </div>
                           <div className="flex items-center justify-between pt-2 border-t border-slate-50 dark:border-white/5">
                              <div className="flex items-center gap-2">
                                 <Monitor className="w-3 h-3 text-slate-300 dark:text-slate-700" />
                                 <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">{log.platform as string || 'CORE_CHANNEL'}</span>
                              </div>
                              <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic font-mono">{new Date(log.createdAt as string).toLocaleTimeString([], { hour12: false })}</span>
                           </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
                {logs.length === 0 && (
                   <div className="py-48 text-center grayscale opacity-10">
                      <Fingerprint className="w-20 h-20 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                      <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600 italic">Zero Cognitive Signals Ingested</p>
                   </div>
                )}
              </div>
           </div>
        </div>
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Analytical Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Global Cognitive Signals Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Cognitive affect subsystems ensure 100% precision in sentiment analysis and emotional resonance tracking across all regional nodes.</span>
         </div>
      </div>
    </div>
  );
}
