import React, { useEffect, useState } from 'react';
import { ChevronRight, Activity, LayoutList } from 'lucide-react';

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
     <div className="h-96 glass-panel rounded-[40px] flex flex-col items-center justify-center p-8 text-center">
        <Globe className="w-12 h-12 text-indigo-500 animate-pulse mb-4" />
        <p className="text-slate-500 font-black uppercase tracking-[0.4em] text-[10px]">Assembling Tactical Surface...</p>
     </div>
  );

  return (
    <article className="flex flex-col rounded-[40px] glass-panel shadow-2xl overflow-hidden relative min-h-[580px] animate-bespoke">
      <div className="flex items-center justify-between p-8 border-b border-white/5 bg-white/[0.02] backdrop-blur-3xl z-30">
        <div className="flex items-center gap-5">
          <div className="p-3 rounded-2xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 shadow-[0_0_15px_rgba(99,102,241,0.2)]">
            <MapIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-white text-xl font-bold tracking-tight">Tactical Site Matrix</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-[0.3em]">{points.length} Active Nodes</p>
          </div>
        </div>
        
        <button 
           onClick={() => setShowList(!showList)}
           className={`group flex items-center gap-3 px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${
              showList ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/30' : 'bg-white/5 text-slate-400 hover:text-white hover:bg-white/10 border border-white/5'
           }`}
        >
          <LayoutList className="w-4 h-4 transition-transform group-hover:scale-110" /> 
          {showList ? 'Collapse Registry' : 'Reveal Site Registry'}
        </button>
      </div>

      <div className="flex-1 flex relative overflow-hidden bg-[#020305]">
        {/* Collapsible Sidebar Overlay */}
        <aside className={`absolute top-0 left-0 bottom-0 z-20 bg-slate-900/90 backdrop-blur-3xl border-r border-white/5 transition-all duration-700 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          showList ? 'w-80 translate-x-0' : 'w-80 -translate-x-full'
        }`}>
          <div className="p-6 h-full overflow-y-auto">
             <div className="space-y-3">
                {points.map((point) => (
                  <button
                    key={point.id}
                    onClick={() => setActiveId(point.id)}
                    className={`w-full text-left p-4 rounded-[20px] transition-all flex items-center gap-4 border ${
                      activeId === point.id 
                        ? 'border-indigo-500/30 bg-indigo-600/10 text-white shadow-[inset_0_0_20px_rgba(99,102,241,0.05)]' 
                        : 'border-white/5 bg-white/[0.02] text-slate-500 hover:text-slate-300 hover:bg-white/5 hover:border-white/10'
                    }`}
                  >
                    <div className={`w-3 h-3 rounded-full shadow-[0_0_10px_currentColor] ${
                      point.status === 'critical' ? 'bg-rose-500 text-rose-500' : 
                      point.status === 'warning' ? 'bg-amber-500 text-amber-500' : 'bg-emerald-500 text-emerald-500'
                    }`} />
                    <span className="text-sm font-bold truncate flex-1">{point.name}</span>
                    {activeId === point.id && <ChevronRight className="w-4 h-4 text-indigo-400 animate-in slide-in-from-left-2" />}
                  </button>
                ))}
             </div>
          </div>
        </aside>

        {/* Main View: Cyber Schematic Grid */}
        <main className="flex-1 relative p-12 flex items-center justify-center overflow-hidden">
           {/* Futuristic Grid Overlay */}
           <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           
           <div className="relative w-full h-full max-w-2xl aspect-video flex items-center justify-center">
              {/* Central Scan Lines (Minimalist Decoration) */}
              <div className="absolute top-1/2 left-0 w-full h-[1px] bg-indigo-500/10" />
              <div className="absolute left-1/2 top-0 h-full w-[1px] bg-indigo-500/10" />

              {/* Data Node Points (Luminous Beacons) */}
              {points.map((point) => {
                 const x = ((point.lng - 103.9) / 0.3) * 100;
                 const y = (1 - (point.lat - 1.0) / 0.2) * 100;
                 const isActive = activeId === point.id;

                 return (
                   <div 
                     key={point.id}
                     className={`absolute transition-all duration-700 ${isActive ? 'scale-150 z-10' : 'scale-100'}`}
                     style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
                     onClick={() => setActiveId(point.id)}
                   >
                      {/* Glow for status */}
                      <div className={`absolute -inset-6 rounded-full blur-2xl transition-all duration-1000 ${
                         point.status === 'critical' ? 'bg-rose-500/20 opacity-100 animate-pulse' :
                         point.status === 'warning' ? 'bg-amber-500/10 opacity-60' :
                         'bg-emerald-500/5 opacity-30'
                      } ${isActive ? 'scale-150' : 'scale-100'}`} />

                      <div className={`cursor-pointer w-4 h-4 rounded-full border-2 border-black shadow-2xl transition-all hover:scale-150 ${
                         point.status === 'critical' ? 'bg-rose-500 shadow-[0_0_15px_rgba(244,63,94,0.5)]' :
                         point.status === 'warning' ? 'bg-amber-500 shadow-[0_0_15px_rgba(251,191,36,0.5)]' :
                         'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)]'
                      }`} />

                      {/* Site ID Badge */}
                      {(isActive || point.status === 'critical') && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                           <div className="w-px h-6 bg-indigo-500/30 mb-1" />
                           <div className="px-4 py-1.5 rounded-xl bg-slate-900 border border-indigo-500/30 shadow-2xl shadow-indigo-500/20">
                              <p className="text-[11px] font-black text-white whitespace-nowrap uppercase tracking-widest italic">
                                {point.name.split(' ').slice(-1).join(' ')}
                              </p>
                           </div>
                        </div>
                      )}
                   </div>
                 );
              })}
           </div>

           {/* Perspective View Detail */}
           <div className="absolute bottom-10 right-10 text-right pointer-events-none select-none">
              <h2 className="text-5xl font-black text-white/5 tracking-tighter uppercase italic">BATAM TELEMETRY</h2>
              <p className="text-[10px] text-slate-700 font-black uppercase tracking-[0.8em] mt-2">Active Geospatial Node Matrix</p>
           </div>
        </main>
      </div>

      {/* Info Panel Footer */}
      {activeId && (
        <div className="absolute bottom-10 left-10 right-10 z-40 animate-in fade-in slide-in-from-bottom-8 duration-700">
           {(() => {
              const p = points.find(x => x.id === activeId);
              if (!p) return null;
              return (
                <div className="bg-slate-900/40 backdrop-blur-3xl border border-white/5 rounded-[32px] p-8 flex flex-col md:flex-row items-center justify-between shadow-2xl shadow-black/80 gap-6">
                   <div className="flex items-center gap-6">
                      <div className={`p-4 rounded-3xl ${
                        p.status === 'critical' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20' :
                        p.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' :
                        'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      }`}>
                         <Activity className="w-7 h-7" />
                      </div>
                      <div>
                         <h4 className="text-white text-xl font-bold tracking-tight">{p.name}</h4>
                         <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mt-1">Telemetry Status: {p.status}</p>
                      </div>
                   </div>
                   <div className="flex gap-12">
                      <div className="text-center">
                         <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Critical Signals</p>
                         <p className="text-3xl font-black text-rose-500">{p.metrics.critical}</p>
                      </div>
                      <div className="text-center pr-4">
                         <p className="text-[10px] text-slate-600 font-black uppercase tracking-widest mb-1">Overdue Maintenance</p>
                         <p className="text-3xl font-black text-amber-500">{p.metrics.warning}</p>
                      </div>
                   </div>
                </div>
              );
           })()}
        </div>
      )}
    </article>
  );
};

export default NetworkHealthMap;
