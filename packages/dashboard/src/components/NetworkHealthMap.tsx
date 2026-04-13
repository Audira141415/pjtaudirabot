import React, { useEffect, useState } from 'react';
import { Activity, LayoutList, Map as MapIcon, ChevronRight } from 'lucide-react';

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

  if (loading) return <div className="h-96 flex items-center justify-center bg-slate-900 rounded-[32px] text-slate-500 font-bold uppercase tracking-widest animate-pulse">Initializing Tactical Grid...</div>;

  return (
    <article className="flex flex-col rounded-[32px] border border-slate-800 bg-slate-950 shadow-2xl overflow-hidden relative min-h-[520px]">
      {/* Header Bar */}
      <div className="flex items-center justify-between p-6 border-b border-slate-800/50 bg-slate-900/50 backdrop-blur-md z-30">
        <div className="flex items-center gap-4">
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-white font-bold tracking-tight">neuCentrIX Tactical Health</h3>
            <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest">{points.length} Nodes Online</p>
          </div>
        </div>
        
        <button 
           onClick={() => setShowList(!showList)}
           className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              showList ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-600/20' : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
           }`}
        >
          <LayoutList className="w-4 h-4" /> {showList ? 'Hide Site List' : 'Show 26 Sites'}
        </button>
      </div>

      <div className="flex-1 flex relative overflow-hidden">
        {/* Collapsible Sidebar Overlay */}
        <aside className={`absolute top-0 left-0 bottom-0 z-20 bg-slate-900/95 backdrop-blur-xl border-r border-slate-800 transition-all duration-500 ease-[cubic-bezier(0.23,1,0.32,1)] ${
          showList ? 'w-80 translate-x-0 opacity-100' : 'w-80 -translate-x-full opacity-0'
        }`}>
          <div className="p-6 h-full overflow-y-auto custom-scrollbar">
             <div className="space-y-2">
                {points.map((point) => (
                  <button
                    key={point.id}
                    onClick={() => setActiveId(point.id)}
                    className={`w-full text-left p-3 rounded-xl border transition-all flex items-center gap-3 ${
                      activeId === point.id 
                        ? 'border-indigo-500 bg-indigo-500/10 text-white' 
                        : 'border-slate-800 bg-slate-900/50 text-slate-400 hover:bg-slate-800'
                    }`}
                  >
                    <div className={`w-2 h-2 rounded-full ${
                      point.status === 'critical' ? 'bg-rose-500 animate-pulse' : 
                      point.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                    }`} />
                    <span className="text-xs font-bold truncate flex-1">{point.name}</span>
                    {activeId === point.id && <ChevronRight className="w-4 h-4 text-indigo-400" />}
                  </button>
                ))}
             </div>
          </div>
        </aside>

        {/* Main View: Elegant Blueprint Style Grid */}
        <main className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black p-10 flex items-center justify-center overflow-hidden">
           {/* Futuristic Grid Overlay */}
           <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                style={{ backgroundImage: 'linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
           
           <div className="relative w-full h-full max-w-2xl aspect-video flex items-center justify-center">
              {/* Central Radar Circle (Minimalist) */}
              <div className="absolute inset-0 border border-slate-800/50 rounded-full scale-110 opacity-20" />
              <div className="absolute inset-0 border border-slate-800/30 rounded-full scale-75 opacity-20" />

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
                      <div className={`absolute -inset-4 rounded-full blur-xl transition-all duration-1000 ${
                         point.status === 'critical' ? 'bg-rose-500/20 opacity-100' :
                         point.status === 'warning' ? 'bg-amber-500/10 opacity-60' :
                         'bg-emerald-500/5 opacity-30'
                      } ${isActive ? 'scale-150' : 'scale-100'}`} />

                      <div className={`cursor-pointer w-4 h-4 rounded-full border-2 border-slate-950 shadow-2xl transition-all hover:scale-150 ${
                         point.status === 'critical' ? 'bg-rose-500 shadow-rose-500/50' :
                         point.status === 'warning' ? 'bg-amber-500 shadow-amber-500/50' :
                         'bg-emerald-500 shadow-emerald-500/20'
                      }`} />

                      {/* Site ID Badge (Pro look) */}
                      {(isActive || point.status === 'critical') && (
                        <div className="absolute top-6 left-1/2 -translate-x-1/2 whitespace-nowrap flex flex-col items-center">
                           <div className="w-px h-4 bg-slate-700 mb-1" />
                           <div className="px-3 py-1 rounded bg-slate-900 border border-slate-700 shadow-2xl">
                              <p className="text-[10px] font-black text-white whitespace-nowrap uppercase italic tracking-tighter">
                                {point.name.split(' ').slice(-2).join(' ')}
                              </p>
                           </div>
                        </div>
                      )}
                   </div>
                 );
              })}
           </div>

           {/* Perspective View Detail (Bottom Overlay) */}
           <div className="absolute bottom-8 right-8 text-right pointer-events-none">
              <h2 className="text-4xl font-black text-slate-800/50 tracking-tighter uppercase italic select-none">Batam Grid v2</h2>
              <p className="text-[10px] text-slate-600 font-bold uppercase tracking-[0.5em]">Tactical Network Overview</p>
           </div>
        </main>
      </div>

      {/* Info Panel Footer (Show only for active site) */}
      {activeId && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-6 z-40 animate-in fade-in slide-in-from-bottom-4 duration-500">
           {(() => {
              const p = points.find(x => x.id === activeId);
              if (!p) return null;
              return (
                <div className="bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-3xl p-5 flex items-center justify-between shadow-2xl shadow-black/50">
                   <div className="flex items-center gap-4">
                      <div className={`p-3 rounded-2xl ${
                        p.status === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                        p.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-emerald-500/20 text-emerald-400'
                      }`}>
                         <Activity className="w-5 h-5" />
                      </div>
                      <div>
                         <h4 className="text-white font-bold">{p.name}</h4>
                         <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">{p.status} Mode ENABLED</p>
                      </div>
                   </div>
                   <div className="flex gap-8 pr-4">
                      <div className="text-center">
                         <p className="text-[10px] text-slate-500 font-bold uppercase">Critical</p>
                         <p className="text-xl font-black text-rose-400">{p.metrics.critical}</p>
                      </div>
                      <div className="text-center">
                         <p className="text-[10px] text-slate-500 font-bold uppercase">Pending PM</p>
                         <p className="text-xl font-black text-amber-400">{p.metrics.warning}</p>
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
