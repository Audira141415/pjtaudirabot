import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ShieldCheck, 
  Target, 
  BarChart3, 
  Scale, 
  CheckCircle2, 
  Info
} from 'lucide-react';

export default function SLAWeightedCompliancePage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getSLAWeightedReport();
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <div className="w-12 h-12 border-4 border-indigo-500/20 border-t-indigo-500 rounded-full animate-spin" />
        <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] animate-pulse">Calculating Weighted Matrix...</span>
      </div>
    );
  }

  const totalScore = data?.totalScore ?? 0;
  const isHealthy = totalScore >= 95;

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-6 duration-1000">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isHealthy ? 'bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]' : 'bg-rose-500 animate-ping'}`} />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.2em]">SLA Service neuCentrIX</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1">Weighted Compliance Matrix</h1>
          <p className="text-slate-500 font-medium text-sm">Official performance aggregation based on contractual weightings (Bobot).</p>
        </div>

        <div className="px-6 py-4 bg-slate-900/50 border border-slate-800 rounded-3xl backdrop-blur-md flex items-center gap-6">
           <div className="text-center">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Target</div>
              <div className="text-xl font-black text-white italic">100%</div>
           </div>
           <div className="w-px h-8 bg-slate-800" />
           <div className="text-center">
              <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Total Score</div>
              <div className={`text-2xl font-black italic tracking-tight ${isHealthy ? 'text-emerald-500' : 'text-rose-500'}`}>{totalScore}%</div>
           </div>
        </div>
      </div>

      {/* Main Table Matrix */}
      <div className="relative bg-slate-950/50 border border-slate-800/60 rounded-[48px] overflow-hidden backdrop-blur-2xl transition-all hover:bg-slate-950/60">
         <div className="px-10 py-8 border-b border-slate-800/60 flex items-center justify-between bg-gradient-to-r from-slate-900/40 to-transparent">
            <div className="flex items-center gap-4">
               <ShieldCheck className="w-6 h-6 text-indigo-500" />
               <h2 className="text-xl font-black text-white uppercase italic tracking-tight underline decoration-indigo-500/50 decoration-2 underline-offset-8">neuCentrIX KPI Table</h2>
            </div>
            <div className="flex items-center gap-3">
               <Scale className="w-4 h-4 text-slate-600" />
               <span className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em]">Composite Calculation</span>
            </div>
         </div>

         <div className="overflow-x-auto">
           <table className="w-full text-left">
             <thead>
               <tr className="bg-slate-900/30">
                 <th className="px-10 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Type</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Key Performance Indicator</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Target</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Bobot</th>
                 <th className="px-8 py-5 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Achieved</th>
                 <th className="px-10 py-5 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Weighted Score</th>
               </tr>
             </thead>
             <tbody className="divide-y divide-slate-800/40">
               {(data?.breakdown ?? []).map((b: any, index: number) => (
                 <tr key={b.category} className="group hover:bg-slate-900/40 transition-all">
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-[10px] font-black text-indigo-400 group-hover:scale-110 transition-transform">
                             {String.fromCharCode(65 + index % 9)}
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="text-sm font-bold text-slate-200 group-hover:text-white transition-colors capitalize">{b.category.replace(/_/g, ' ')}</div>
                       <div className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">neuCentrIX Service KPI</div>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className="text-[10px] font-black text-slate-400">100%</span>
                    </td>
                    <td className="px-8 py-6 text-center">
                       <span className="text-[10px] font-black text-indigo-500 italic bg-indigo-500/5 px-3 py-1 rounded-full">{b.weight}%</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col items-center">
                          <span className={`text-sm font-black italic tracking-tight ${b.compliance >= 100 ? 'text-emerald-500' : 'text-rose-500'}`}>
                             {b.compliance}%
                          </span>
                          <div className="w-16 h-1 bg-slate-800 rounded-full mt-1.5 overflow-hidden">
                             <div 
                                className={`h-full transition-all duration-1000 ${b.compliance >= 100 ? 'bg-emerald-500' : 'bg-rose-500'}`}
                                style={{ width: `${Math.min(b.compliance, 100)}%` }}
                             />
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="text-lg font-black text-white italic tracking-tighter transition-all group-hover:scale-105">
                          {b.weightedScore}<span className="text-[10px] text-slate-700 ml-0.5">%</span>
                       </div>
                    </td>
                 </tr>
               ))}
               
               {/* Total Row */}
               <tr className="bg-slate-900/40">
                  <td colSpan={3} className="px-10 py-8">
                     <div className="flex items-center gap-4">
                        <div className="p-2 bg-emerald-500/10 rounded-lg">
                           <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                        </div>
                        <div>
                           <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Aggregate Compliance</div>
                           <div className="text-sm font-bold text-white uppercase italic tracking-tight">Jumlah 100% Achieved</div>
                        </div>
                     </div>
                  </td>
                  <td className="px-8 py-8 text-center">
                     <span className="text-xs font-black text-slate-600">100%</span>
                  </td>
                  <td className="px-8 py-8 text-center">
                     {/* Empty Achieved Total */}
                  </td>
                  <td className="px-10 py-8 text-right">
                     <div className={`text-4xl font-black italic tracking-tighter ${isHealthy ? 'text-emerald-500' : 'text-rose-500'}`}>
                        {totalScore}<span className="text-xl text-slate-700 ml-1">%</span>
                     </div>
                  </td>
               </tr>
             </tbody>
           </table>
         </div>
      </div>

      {/* Info Boxes */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
         <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl">
            <Target className="w-6 h-6 text-indigo-500 mb-6" />
            <h3 className="text-white font-black uppercase text-sm mb-2 italic">Performance Objective</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Weighted score is calculated based on the official SLA document. Fulfillment and Incident Management carry the highest cumulative weight (32% total).</p>
         </div>

         <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl">
            <BarChart3 className="w-6 h-6 text-sky-500 mb-6" />
            <h3 className="text-white font-black uppercase text-sm mb-2 italic">Real-time Attribution</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Achieved values are derived from live ticket response/resolution trackings. Values revert to 100% if no incidents are recorded for the period.</p>
         </div>

         <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[40px] backdrop-blur-xl border-dashed">
            <Info className="w-6 h-6 text-slate-600 mb-6" />
            <h3 className="text-slate-400 font-black uppercase text-sm mb-2 italic">Historical Archive</h3>
            <p className="text-slate-500 text-xs leading-relaxed font-medium">Monthly snapshots are exported to Google Sheets every 1st of the month at 00:00 UTC for official record-keeping.</p>
         </div>
      </div>
    </div>
  );
}
