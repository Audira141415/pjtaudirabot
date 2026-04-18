import React, { useEffect, useState } from 'react';
import { ChevronRight, Activity, LayoutList, Map as MapIcon, Globe, Target, Zap, Radio } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lng: number;
  status: 'healthy' | 'warning' | 'critical';
  metrics: {
    critical: number;
    warning: number;
  };
}

const NetworkHealthMap: React.FC = () => {
  const [points, setPoints] = useState<MapPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [showList, setShowList] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);

  useEffect(() => {
    const fetchMap = async () => {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/network/map-status`);
        const result = await res.json();
        setPoints(result.data || []);
      } catch (err) {
        console.error('Failed to fetch map status:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchMap();
    const interval = setInterval(fetchMap, 60000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
     <div className="h-96 glass-ultimate rounded-[48px] border-4 border-white/5 flex flex-col items-center justify-center p-12 text-center shadow-2xl relative overflow-hidden">
        <div className="absolute inset-0 bg-indigo-500/5 animate-pulse" />
        <Globe className="w-16 h-16 text-indigo-500 animate-spin-slow mb-8" />
        <p className="text-indigo-400 font-black uppercase tracking-[0.5em] text-[12px] animate-pulse italic font-mono">Assembling Tactical Surface Matrix...</p>
     </div>
  );

  return (
    <article className="flex flex-col rounded-[56px] glass-ultimate border-2 border-white/5 shadow-[0_40px_100px_rgba(0,0,0,0.6)] overflow-hidden relative min-h-[600px] group/map">
      {/* Scanning Line Overlay */}
      <div className="absolute inset-0 pointer-events-none z-10 opacity-20 overflow-hidden">
         <div className="w-full h-[2px] bg-indigo-500 animate-scanline shadow-[0_0_15px_rgba(99,102,241,1)]" />
      </div>

      <div className="flex items-center justify-between p-10 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl z-30">
        <div className="flex items-center gap-8">
          <div className="p-5 rounded-[24px] bg-indigo-600/10 text-indigo-500 border-2 border-indigo-500/20 shadow-[0_0_30px_rgba(99,102,241,0.2)] group-hover/map:scale-110 transition-transform">
            <Target className="w-8 h-8" />
          </div>
          <div>
            <h3 className="text-slate-900 dark:text-white text-4xl font-black italic tracking-tighter uppercase leading-none">Tactical Site Matrix</h3>
            <div className="flex items-center gap-3 mt-3">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
               <p className="text-[10px] text-slate-500 dark:text-slate-600 font-black uppercase tracking-[0.4em] font-mono italic">{points.length} ACTIVE_NODAL_POINTS</p>
            </div>
          </div>
        </div>
        
        <button 
           onClick={() => setShowList(!showList)}
           className={`group flex items-center gap-5 px-10 py-5 rounded-[24px] text-[11px] font-black uppercase tracking-[0.4em] transition-all font-mono italic border-2 ${
              showList ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/40 border-indigo-500' : 'glass border-white/10 text-slate-500 dark:text-slate-700 hover:text-white hover:bg-white/5 active:scale-95'
           }`}
        >
          <LayoutList className="w-5 h-5 transition-transform group-hover:rotate-12" /> 
          {showList ? 'FOLD_REGISTRY' : 'REVEAL_REGISTRY'}
        </button>
      </div>

      <div className="flex-1 flex relative overflow-hidden bg-black/40">
        {/* Collapsible Sidebar Overlay */}
        <AnimatePresence>
          {showList && (
            <motion.aside 
              initial={{ x: -320 }}
              animate={{ x: 0 }}
              exit={{ x: -320 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="absolute top-0 left-0 bottom-0 z-20 w-80 glass-ultimate border-r border-white/5 shadow-2xl"
            >
              <div className="p-8 h-full overflow-y-auto custom-scrollbar">
                 <div className="space-y-4">
                    {points.map((point) => (
                      <motion.button
                        key={point.id}
                        whileHover={{ x: 10 }}
                        onClick={() => setActiveId(point.id)}
                        className={`w-full text-left p-6 rounded-[28px] transition-all flex items-center gap-4 border-2 ${
                          activeId === point.id 
                            ? 'border-indigo-500/50 bg-indigo-600/20 text-white shadow-inner' 
                            : 'border-white/5 glass text-slate-500 hover:text-white hover:border-white/10'
                        }`}
                      >
                        <div className={`w-3 h-3 rounded-full shadow-[0_0_15px_currentColor] ${
                          point.status === 'critical' ? 'bg-rose-500 text-rose-500 animate-pulse' : 
                          point.status === 'warning' ? 'bg-amber-500 text-amber-500' : 'bg-emerald-500 text-emerald-500'
                        }`} />
                        <span className="text-sm font-black italic tracking-tighter truncate flex-1 uppercase">{point.name}</span>
                        {activeId === point.id && <ChevronRight className="w-5 h-5 text-indigo-400" />}
                      </motion.button>
                    ))}
                 </div>
              </div>
            </motion.aside>
          )}
        </AnimatePresence>

        {/* Main View: Cyber Schematic Grid */}
        <main className="flex-1 relative p-16 flex items-center justify-center overflow-hidden">
           {/* Futuristic Grid Overlay */}
           <div className="absolute inset-0 opacity-[0.08] pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
           
           <div className="relative w-full h-full max-w-3xl aspect-video flex items-center justify-center">
              {/* Central Radar Sweep Decor */}
              <div className="absolute inset-x-0 top-1/2 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/20 to-transparent" />
              <div className="absolute inset-y-0 left-1/2 w-[2px] bg-gradient-to-b from-transparent via-indigo-500/20 to-transparent" />

              {/* Data Node Points (Luminous Beacons) */}
              {points.map((point) => {
                 const x = ((point.lng - 103.9) / 0.3) * 100;
                 const y = (1 - (point.lat - 1.0) / 0.2) * 100;
                 const isActive = activeId === point.id;

                 return (
                   <motion.div 
                     key={point.id}
                     initial={{ scale: 0 }}
                     animate={{ scale: isActive ? 1.5 : 1 }}
                     className={`absolute transition-all duration-700 cursor-pointer ${isActive ? 'z-50' : 'z-10'}`}
                     style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                     onClick={() => setActiveId(point.id)}
                   >
                      {/* Glow Core */}
                      <AnimatePresence>
                         {point.status === 'critical' && (
                            <motion.div 
                              animate={{ scale: [1, 1.5, 1], opacity: [0.3, 0.6, 0.3] }}
                              transition={{ duration: 2, repeat: Infinity }}
                              className="absolute -inset-10 rounded-full bg-rose-500 blur-3xl"
                            />
                         )}
                      </AnimatePresence>

                      <div className={`w-5 h-5 rounded-full border-2 border-black shadow-2xl transition-all hover:scale-150 ${
                         point.status === 'critical' ? 'bg-rose-500 shadow-[0_0_20px_rgba(244,63,94,0.8)]' :
                         point.status === 'warning' ? 'bg-amber-500 shadow-[0_0_20px_rgba(251,191,36,0.6)]' :
                         'bg-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.4)]'
                      }`} />

                      {/* Site ID Badge */}
                      {(isActive || point.status === 'critical') && (
                        <motion.div 
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="absolute top-8 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center"
                        >
                           <div className="w-px h-10 bg-gradient-to-b from-indigo-500/60 to-transparent mb-2" />
                           <div className="px-5 py-2 rounded-2xl glass border-2 border-indigo-500/30 shadow-2xl backdrop-blur-3xl">
                              <p className="text-[12px] font-black text-white whitespace-nowrap uppercase tracking-widest italic font-mono">
                                {point.name.toUpperCase()}
                              </p>
                           </div>
                        </motion.div>
                      )}
                   </motion.div>
                 );
              })}
           </div>

           {/* Perspective View Detail */}
           <div className="absolute bottom-12 right-12 text-right pointer-events-none select-none">
              <h2 className="text-7xl font-black text-white/5 tracking-tighter uppercase italic leading-none">NODE_MATRIX_X1</h2>
              <div className="flex items-center justify-end gap-3 mt-4 text-[11px] text-slate-700 font-black uppercase tracking-[0.8em] italic font-mono">
                 <Radio className="w-4 h-4" /> GEOSPATIAL_TAKEOVER
              </div>
           </div>
        </main>
      </div>

      {/* Info Panel Footer */}
      <AnimatePresence>
        {activeId && (
          <motion.div 
            initial={{ y: 100, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 100, opacity: 0 }}
            className="absolute bottom-12 left-12 right-12 z-40"
          >
             {(() => {
                const p = points.find(x => x.id === activeId);
                if (!p) return null;
                return (
                  <div className="glass-ultimate border-4 border-white/5 rounded-[48px] p-10 flex flex-col md:flex-row items-center justify-between shadow-[0_40px_100px_rgba(0,0,0,0.8)] gap-10">
                     <div className="flex items-center gap-8">
                        <div className={`p-6 rounded-[32px] shadow-2xl border-2 ${
                          p.status === 'critical' ? 'bg-rose-500/20 text-rose-500 border-rose-500/40' :
                          p.status === 'warning' ? 'bg-amber-500/20 text-amber-500 border-amber-500/40' :
                          'bg-emerald-500/20 text-emerald-500 border-emerald-500/40'
                        }`}>
                           <Activity className="w-10 h-10" />
                        </div>
                        <div>
                           <h4 className="text-white text-4xl font-black italic tracking-tighter uppercase leading-none">{p.name}</h4>
                           <div className="flex items-center gap-4 mt-3">
                              <Zap className="w-4 h-4 text-indigo-500 animate-pulse" />
                              <p className="text-[11px] text-slate-500 dark:text-slate-700 font-black uppercase tracking-[0.4em] font-mono italic">SIGNAL_QUALITY: {p.status.toUpperCase()}</p>
                           </div>
                        </div>
                     </div>
                     <div className="flex gap-16 pr-6">
                        <div className="text-center group/stat">
                           <p className="text-[10px] text-slate-500 dark:text-slate-600 font-black uppercase tracking-[0.4em] mb-3 font-mono italic">CRIT_SIGNALS</p>
                           <p className="text-5xl font-black text-rose-500 italic tracking-tighter leading-none group-hover/stat:scale-110 transition-transform">{p.metrics.critical}</p>
                        </div>
                        <div className="h-16 w-[2px] bg-white/5" />
                        <div className="text-center group/stat">
                           <p className="text-[10px] text-slate-500 dark:text-slate-600 font-black uppercase tracking-[0.4em] mb-3 font-mono italic">MAINT_OVERDUE</p>
                           <p className="text-5xl font-black text-amber-500 italic tracking-tighter leading-none group-hover/stat:scale-110 transition-transform">{p.metrics.warning}</p>
                        </div>
                     </div>
                  </div>
                );
             })()}
          </motion.div>
        )}
      </AnimatePresence>
    </article>
  );
};

export default NetworkHealthMap;
