import React, { useEffect, useState } from 'react';
import { BrainCircuit, Sparkles, TrendingUp, Info, CheckCircle2, ChevronRight } from 'lucide-react';

interface Prediction {
  id: string;
  type: string;
  location: string;
  probability: number;
  reason: string;
  recommendation: string;
}

const AIPredictiveInsights: React.FC = () => {
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchInsights = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/insights/predictive`);
        const result = await res.json();
        setPredictions(result.data || []);
      } catch (err) {
        console.error('Failed to fetch AI insights:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchInsights();
  }, []);

  if (loading) return null;

  return (
    <article className="mt-8 rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-violet-50 text-violet-600">
            <BrainCircuit className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
              AI Predictive Insights <div className="px-2 py-0.5 rounded-md bg-violet-100 text-violet-700 text-[10px] font-black uppercase">Alpha Beta</div>
            </h3>
            <p className="text-sm text-slate-500">Forecasting potential failures before they breach SLA</p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs font-bold text-slate-400">
           <Sparkles className="w-4 h-4 text-amber-400" /> Powered by Adaptive Pattern Analytics
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {predictions.map((pred) => (
          <div key={pred.id} className="relative group p-6 rounded-[24px] bg-slate-50 border border-slate-100 transition-all hover:bg-white hover:shadow-xl hover:shadow-violet-500/5 hover:border-violet-200">
             <div className="flex items-start justify-between mb-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-widest text-violet-500 mb-1">{pred.type}</span>
                  <h4 className="font-bold text-slate-800">{pred.location}</h4>
                </div>
                <div className="text-right">
                   <div className="text-2xl font-black text-slate-900">{pred.probability}%</div>
                   <div className="text-[10px] font-bold text-slate-400 uppercase">Risk Level</div>
                </div>
             </div>

             <div className="p-4 rounded-xl bg-white border border-slate-100 mb-4 text-xs leading-relaxed text-slate-600">
                <div className="flex items-center gap-2 text-slate-400 mb-2 font-bold uppercase tracking-tighter text-[10px]">
                   <Info className="w-3.5 h-3.5" /> Pattern Discovery
                </div>
                {pred.reason}
             </div>

             <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                   <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                   <span className="text-xs font-bold text-slate-800">Action Recommended</span>
                </div>
                <button className="flex items-center gap-1 text-xs font-bold text-violet-600 group-hover:translate-x-1 transition-transform">
                   Optimize Schedule <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </div>
        ))}
      </div>
      
      <div className="mt-8 flex items-center justify-center py-4 border-t border-slate-50">
         <button className="text-sm font-bold text-slate-400 hover:text-slate-600 flex items-center gap-2 transition-colors">
             <TrendingUp className="w-4 h-4" /> View Comprehensive Pattern History
         </button>
      </div>
    </article>
  );
};

export default AIPredictiveInsights;
