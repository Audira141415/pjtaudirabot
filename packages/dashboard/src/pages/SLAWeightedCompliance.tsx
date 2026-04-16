import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ShieldCheck, 
  Target, 
  BarChart3, 
  Scale, 
  CheckCircle2, 
  Info,
  Archive,
  Activity,
  Zap,
  TrendingUp,
  Cpu,
  Fingerprint,
  Orbit,
  Layers,
  ChevronRight,
  MoreHorizontal,
  RefreshCw,
  LayoutGrid,
  Monitor
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function SLAWeightedCompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await api.getSLAWeightedReport();
      setData(res.data);
    } catch (err) { 
       toast({ type: 'error', title: 'MATRIX_CALCULATION_FAILURE', message: 'Failed to access contractual weight systems.' });
    }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading && !data) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Calculating Weighted Matrix...</span>
      </div>
    );
  }

  const totalScore = data?.totalScore ?? 0;
  const isHealthy = totalScore >= 95;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Contractual Weight Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Weighted Compliance Matrix</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Official performance aggregation based on contractual weightings (Bobot) for regional operations.</p>
        </div>

        <div className="flex items-center gap-4 bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] shadow-sm backdrop-blur-3xl">
           <div className="text-center px-4">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono">NODE_TARGET</div>
              <div className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter">100%</div>
           </div>
           <div className="w-px h-10 bg-slate-100 dark:bg-slate-800" />
           <div className="text-center px-4">
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono">AGGREGATE_SCORE</div>
              <div className={`text-3xl font-black italic tracking-tighter ${isHealthy ? 'text-emerald-500' : 'text-rose-500'}`}>{totalScore}%</div>
           </div>
           <button 
              onClick={loadData} 
              className="ml-4 p-4 bg-indigo-600 text-white rounded-[24px] hover:scale-110 active:scale-95 transition-all shadow-xl shadow-indigo-600/20"
           >
              <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Main KPI Matrix */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[56px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl relative">
         <div className="px-12 py-10 border-b border-slate-100 dark:border-slate-800/50 flex flex-col md:flex-row md:items-center justify-between gap-6 bg-slate-50/50 dark:bg-slate-900/30">
            <div className="flex items-center gap-5">
               <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-600/20 ring-4 ring-indigo-500/10">
                  <ShieldCheck className="w-7 h-7" />
               </div>
               <div>
                  <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-indigo-500/30 decoration-2 underline-offset-8">Global KPI Table</h2>
                  <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mt-2 italic">Composite performance calculation based on historical node telemetry</p>
               </div>
            </div>
            <div className="flex items-center gap-3 px-6 py-2 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-inner">
               <Scale className="w-4 h-4 text-indigo-500" />
               <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] italic">Dynamic Weighted Attribution</span>
            </div>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50 text-[10px] font-black text-slate-500 dark:text-slate-700 uppercase tracking-[0.2em]">
                 <th className="px-12 py-6">Archetype</th>
                 <th className="px-8 py-6">Key Performance Indicator</th>
                 <th className="px-8 py-6 text-center">Nodal Target</th>
                 <th className="px-8 py-6 text-center">Weight (Bobot)</th>
                 <th className="px-8 py-6 text-center">Attained</th>
                 <th className="px-12 py-6 text-right">Weighted Signal</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30 font-bold">
               {(data?.breakdown ?? []).map((b: any, index: number) => (
                 <tr key={b.category} className="group hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-all duration-300">
                    <td className="px-12 py-8">
                       <div className="w-12 h-12 rounded-[20px] bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 flex items-center justify-center text-[12px] font-black text-indigo-600 dark:text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white group-hover:rotate-6 transition-all shadow-inner">
                          {String.fromCharCode(65 + index % 26)}
                       </div>
                    </td>
                    <td className="px-8 py-8">
                       <div className="text-base font-black text-slate-900 dark:text-slate-300 group-hover:text-indigo-600 transition-colors uppercase italic tracking-tighter">{b.category.replace(/_/g, ' ')}</div>
                       <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] mt-1.5 font-mono">INFRASTRUCTURE_KPI_NODE</div>
                    </td>
                    <td className="px-8 py-8 text-center">
                       <span className="text-[11px] font-black text-slate-400 dark:text-slate-700 italic">100.0%</span>
                    </td>
                    <td className="px-8 py-8 text-center">
                       <div className="px-4 py-2 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 text-indigo-600 dark:text-indigo-400 rounded-xl text-[10px] font-black italic tracking-widest inline-block shadow-inner">
                          {b.weight}%
                       </div>
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex flex-col items-center gap-3">
                          <span className={`text-[13px] font-black italic tracking-tighter ${b.compliance >= 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {b.compliance}%
                          </span>
                          <div className="w-24 h-1.5 bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
                             <div 
                                className={`h-full transition-all duration-1000 ${b.compliance >= 100 ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(b.compliance, 100)}%` }}
                             />
                          </div>
                       </div>
                    </td>
                    <td className="px-12 py-8 text-right">
                       <div className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tighter transition-all group-hover:scale-110 group-hover:translate-x-[-4px]">
                          {b.weightedScore}<span className="text-[10px] text-slate-300 dark:text-slate-700 ml-1 uppercase">UNITS</span>
                       </div>
                    </td>
                  </tr>
               ))}
               
               {/* Summary Ledger Row */}
               <tr className="bg-slate-50 dark:bg-slate-900/40 border-t-2 border-slate-100 dark:border-white/5">
                  <td colSpan={3} className="px-12 py-10">
                     <div className="flex items-center gap-5">
                        <div className="w-14 h-14 bg-emerald-600 text-white rounded-[24px] shadow-2xl shadow-emerald-500/20 flex items-center justify-center animate-pulse">
                           <CheckCircle2 className="w-7 h-7" />
                        </div>
                        <div>
                           <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-1 italic">Aggregate Performance</div>
                           <div className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-emerald-500/30 decoration-2 underline-offset-8">Total Composite Score (100% Scale)</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-10 text-center">
                     <div className="text-[12px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest font-mono">WEIGHT_100</div>
                  </td>
                  <td className="px-8 py-10 text-center">
                     <div className="text-[11px] font-black text-slate-200 dark:text-slate-800 italic uppercase">Attainment_Lock</div>
                  </td>
                  <td className="px-12 py-10 text-right">
                     <div className={`text-6xl font-black italic tracking-tighter ${isHealthy ? 'text-emerald-500' : 'text-rose-500'} scale-y-110`}>
                        {totalScore}<span className="text-2xl text-slate-300 dark:text-slate-700 ml-2 italic">%</span>
                     </div>
                  </td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      {/* Strategic Intelligence Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
         {[
           { icon: Target, title: 'Performance Objective', body: 'Weighted score is hyper-calculated based on the official SLA document. Fulfillment and Incident Management carry the highest cumulative weight (32% total).', color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10' },
           { icon: BarChart3, title: 'Real-time Attribution', body: 'Achieved values are derived from live nodal response/resolution streams. Values revert to 100% if zero incidents are recorded for the temporal fix.', color: 'text-sky-500', bg: 'bg-sky-50 dark:bg-sky-500/10' },
           { icon: Archive, title: 'Historical Ledger', body: 'Monthly snapshots are extracted to the Global Extraction Stream every 1st of the cycle at 00:00 UTC for official contractual audit.', color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10' }
         ].map((card, i) => (
           <div key={i} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-10 rounded-[48px] backdrop-blur-3xl shadow-sm hover:shadow-2xl transition-all duration-500 group relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-current opacity-10" style={{ color: card.color.includes('indigo') ? '#6366f1' : card.color.includes('sky') ? '#0ea5e9' : '#f59e0b' }} />
              <div className={`w-16 h-16 rounded-[24px] ${card.bg} shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all flex items-center justify-center mb-8`}>
                 <card.icon className={`w-8 h-8 ${card.color}`} />
              </div>
              <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight mb-4 group-hover:text-indigo-600 transition-colors uppercase">{card.title}</h3>
              <p className="text-sm font-bold text-slate-500 dark:text-slate-400 leading-relaxed italic opacity-80">{card.body}</p>
              <div className="mt-8 pt-6 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                 <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">Protocol_v4.2</span>
                 <ChevronRight className="w-4 h-4 text-slate-300 dark:text-slate-700" />
              </div>
           </div>
         ))}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Weighting Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Global Nodal Weight Matrices Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Weighted compliance matrix ensures 100% precision in contractual performance aggregation across all nodes.</span>
         </div>
      </div>
    </div>
  );
}
