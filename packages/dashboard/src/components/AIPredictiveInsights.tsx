import React, { useEffect, useState } from 'react';
import { Sparkles, TrendingUp, AlertCircle, ShieldCheck, Zap, ArrowRight, BrainCircuit } from 'lucide-react';

interface Prediction {
  id: string;
  type: string;
  location: string;
  probability: number;
  expectedDate: string;
  recommendation: string;
  sentiment: 'critical' | 'warning' | 'info';
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

  if (loading) return (
     <div className="glass-panel p-8 rounded-[40px] flex items-center justify-center gap-4 border-white/5 bg-white/[0.02]">
        <BrainCircuit className="w-8 h-8 text-indigo-500 animate-pulse" />
        <span className="text-slate-500 font-bold uppercase tracking-widest text-xs">AI Core Initializing...</span>
     </div>
  );

  return (
    <article className="glass-panel rounded-[40px] p-10 relative overflow-hidden group animate-bespoke">
      <div className="absolute top-[-20%] right-[-10%] w-[400px] h-[400px] bg-indigo-600/5 blur-[100px] pointer-events-none" />
      
      <div className="relative z-10">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
          <div className="flex items-center gap-5">
            <div className="p-4 rounded-3xl bg-indigo-500/10 text-indigo-500 border border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.2)]">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <h3 className="text-2xl font-black text-white tracking-tighter">AI Predictive Analysis</h3>
              <p className="text-sm text-slate-500 font-medium">Algorithmic risk forecasting and preemptive protocols.</p>
            </div>
          </div>
          <div className="flex items-center gap-4 bg-white/5 px-6 py-2.5 rounded-2xl border border-white/10">
             <div className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
             <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Neural Logic Active</span>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {predictions.map((item) => (
            <div key={item.id} className={`group/card p-8 rounded-[32px] border glass-panel transition-all duration-500 hover:scale-[1.02] hover:-translate-y-1 ${
               item.sentiment === 'critical' ? 'border-rose-500/20 bg-rose-500/[0.02]' : 
               item.sentiment === 'warning' ? 'border-amber-500/20 bg-amber-500/[0.02]' : 
               'border-indigo-500/20 bg-indigo-500/[0.02]'
            }`}>
              <div className="flex items-center justify-between mb-8">
                <div className={`text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-xl border ${
                  item.sentiment === 'critical' ? 'bg-rose-500/20 text-rose-500 border-rose-500/30' : 
                  item.sentiment === 'warning' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 
                  'bg-indigo-500/20 text-indigo-500 border-indigo-500/30'
                }`}>
                  Risk Level: {item.probability}%
                </div>
                {item.sentiment === 'critical' ? <AlertCircle className="w-5 h-5 text-rose-500" /> : <Zap className="w-5 h-5 text-indigo-500" />}
              </div>

              <h4 className="text-lg font-black text-white mb-2 leading-tight">{item.type}</h4>
              <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-6 flex items-center gap-2">
                 <TrendingUp className="w-3 h-3" /> {item.location}
              </p>

              <div className="space-y-4 pt-6 border-t border-white/5">
                <div className="flex items-start gap-3">
                  <div className="mt-1 p-1 rounded bg-white/5">
                    <ArrowRight className="w-3 h-3 text-indigo-400" />
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-600 font-black uppercase mb-1">Recommended Action</p>
                    <p className="text-sm font-bold text-slate-300 leading-relaxed">{item.recommendation}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </article>
  );
};

export default AIPredictiveInsights;
