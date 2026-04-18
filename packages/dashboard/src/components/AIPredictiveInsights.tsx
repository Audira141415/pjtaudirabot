import React, { useEffect, useState } from 'react';
import { BrainCircuit, Sparkles, TrendingUp, Info, CheckCircle2, ChevronRight, Zap, Cpu, Activity } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

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
    <motion.article 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      className="mt-12 glass-card p-10 relative overflow-hidden group/ai"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5 group-hover/ai:opacity-10 transition-opacity">
         <Cpu className="w-48 h-48 text-violet-500 rotate-12" />
      </div>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between mb-12 gap-6 relative z-10">
        <div className="flex items-center gap-8">
          <div className="p-6 rounded-[24px] bg-violet-600/10 text-violet-500 border border-violet-500/20 shadow-[0_0_30px_rgba(139,92,246,0.2)] animate-pulse">
            <BrainCircuit className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter flex items-center gap-4 leading-none">
              Neural Forecasting 
              <div className="px-4 py-2 rounded-xl bg-violet-600/20 text-violet-400 text-[10px] font-black uppercase tracking-widest border border-violet-500/30">ALPHA_V5</div>
            </h3>
            <p className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.4em] mt-3 font-mono italic flex items-center gap-3">
              <Activity className="w-4 h-4" /> PREDICTIVE_BREACH_MITIGATION_ACTIVE
            </p>
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-4 text-[10px] font-black text-slate-500 uppercase tracking-widest font-mono italic">
           <Sparkles className="w-5 h-5 text-amber-500 animate-pulse" /> ADAPTIVE_PATTERN_ENGINE
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
        {predictions.map((pred, idx) => (
          <motion.div 
            key={pred.id} 
            initial={{ opacity: 0, x: idx % 2 === 0 ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            whileHover={{ y: -10 }}
            className="glass-ultimate p-8 rounded-[40px] border-2 border-white/5 transition-all hover:border-violet-500/30 hover:shadow-2xl hover:shadow-violet-600/10 group/card"
          >
             <div className="flex items-start justify-between mb-8">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-violet-500 mb-2 font-mono italic">{pred.type}_DETECTION</span>
                  <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none">{pred.location}</h4>
                </div>
                <div className="text-right">
                   <div className="text-4xl font-black text-slate-900 dark:text-white italic tracking-tighter leading-none group-hover/card:scale-110 transition-transform">{pred.probability}%</div>
                   <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest mt-2 font-mono">RISK_ENTITY_VULN</div>
                </div>
             </div>

             <div className="p-6 rounded-[28px] bg-black/40 border-2 border-white/5 mb-8">
                <div className="flex items-center gap-3 text-violet-400 mb-4 font-black uppercase tracking-widest text-[10px] font-mono">
                   <Zap className="w-4 h-4" /> PATTERN_INT_SIG
                </div>
                <p className="text-xs font-black uppercase tracking-widest leading-relaxed text-slate-500 dark:text-slate-600 italic font-mono">
                   {pred.reason}
                </p>
             </div>

             <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                   <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]" />
                   <span className="text-[10px] font-black text-slate-900 dark:text-slate-500 uppercase tracking-widest italic font-mono">MITIGATION_STRAT_READY</span>
                </div>
                <button className="flex items-center gap-3 px-6 py-3 rounded-2xl glass text-[10px] font-black uppercase tracking-widest italic text-violet-500 hover:bg-violet-600 hover:text-white transition-all transform hover:translate-x-2">
                   DEPLOY_PATCH <ChevronRight className="w-4 h-4" />
                </button>
             </div>
          </motion.div>
        ))}
      </div>
      
      <div className="mt-12 flex items-center justify-center pt-10 border-t-2 border-dotted border-white/10">
         <button className="text-[11px] font-black text-slate-500 uppercase tracking-[0.4em] hover:text-indigo-500 flex items-center gap-4 transition-all italic font-mono active:scale-95">
             <TrendingUp className="w-5 h-5" /> RECALL_COMPREHENSIVE_PATTERN_LOGS_V3
         </button>
      </div>
    </motion.article>
  );
};

export default AIPredictiveInsights;
  );
};

export default AIPredictiveInsights;
