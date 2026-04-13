import React, { useEffect, useState } from 'react';
import { MapPin, ShieldCheck, ShieldAlert, AlertTriangle, ChevronRight, Activity } from 'lucide-react';

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

  if (loading) return <div className="h-96 flex items-center justify-center bg-slate-50 rounded-[32px] border border-slate-100 text-slate-400">Loading Site Status...</div>;

  return (
    <article className="flex flex-col lg:flex-row rounded-[32px] border border-slate-200 bg-white p-2 shadow-sm min-h-[480px]">
      {/* Left: Site List (Clear Info) */}
      <div className="w-full lg:w-80 p-6 flex flex-col border-b lg:border-b-0 lg:border-r border-slate-100">
        <div className="mb-6">
          <h3 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-5 h-5 text-indigo-600" /> Site Status Hub
          </h3>
          <p className="text-sm text-slate-500 mt-1">Operational health by DC area</p>
        </div>

        <div className="space-y-3 overflow-y-auto pr-1">
          {points.map((point) => (
            <button
              key={point.id}
              onClick={() => setActiveId(point.id)}
              className={`w-full text-left p-4 rounded-2xl border transition-all ${
                activeId === point.id 
                  ? 'border-indigo-600 bg-indigo-50/50 shadow-sm' 
                  : 'border-slate-100 bg-white hover:border-slate-200 hover:bg-slate-50'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-tighter">DC Node</span>
                <StatusIcon status={point.status} />
              </div>
              <p className="font-bold text-slate-800 text-sm truncate">{point.name}</p>
              <div className="mt-3 flex items-center gap-3">
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Critical</span>
                    <span className={`text-sm font-black ${point.metrics.critical > 0 ? 'text-rose-600' : 'text-slate-300'}`}>{point.metrics.critical}</span>
                 </div>
                 <div className="w-px h-6 bg-slate-200" />
                 <div className="flex flex-col">
                    <span className="text-[10px] text-slate-400 font-bold uppercase">Warn</span>
                    <span className={`text-sm font-black ${point.metrics.warning > 0 ? 'text-amber-600' : 'text-slate-300'}`}>{point.metrics.warning}</span>
                 </div>
                 <ChevronRight className={`ml-auto w-4 h-4 text-slate-300 transition-transform ${activeId === point.id ? 'translate-x-1 text-indigo-500' : ''}`} />
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right: Geographical Context (Accurate Batam Silhouette) */}
      <div className="flex-1 bg-slate-50/50 relative overflow-hidden flex items-center justify-center p-8">
        {/* Simple Batam Map (Simplified Shape) */}
        <div className="relative w-full h-full max-w-lg aspect-[4/3]">
           <svg viewBox="0 0 500 400" className="w-full h-full fill-slate-200/50 stroke-slate-300 stroke-2 drop-shadow-sm">
             {/* Realistic-ish Batam Silhouette */}
             <path d="M120,80 L280,30 L450,120 L480,250 L380,350 L150,380 L30,280 L50,120 Z" />
             {/* Secondary Islands */}
             <circle cx="430" cy="320" r="20" />
             <path d="M410,240 L440,220 L460,240 Z" />
           </svg>

           {/* Points Layer */}
           {points.map((point) => {
              // Normalize based on Batam lat/lng
              const x = ((point.lng - 103.9) / 0.3) * 500;
              const y = (1 - (point.lat - 1.0) / 0.2) * 400;

              return (
                <div 
                  key={point.id}
                  className="absolute"
                  style={{ left: x, top: y, transform: 'translate(-50%, -50%)' }}
                >
                  <div 
                    className={`relative flex flex-col items-center group ${activeId === point.id ? 'z-20 scale-110' : 'z-10'}`}
                    onClick={() => setActiveId(point.id)}
                  >
                     <div className={`w-5 h-5 rounded-full border-2 border-white shadow-lg flex items-center justify-center transition-all ${
                       point.status === 'critical' ? 'bg-rose-500 scale-125' : 
                       point.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-500'
                     }`}>
                        <div className="w-1.5 h-1.5 rounded-full bg-white/40" />
                     </div>
                     
                     <div className={`mt-2 px-3 py-1 rounded-lg bg-white border border-slate-200 shadow-xl transition-all ${
                       activeId === point.id ? 'opacity-100 scale-100' : 'opacity-0 scale-90 translate-y-1'
                     }`}>
                        <p className="text-[10px] font-black text-slate-800 whitespace-nowrap">{point.name}</p>
                     </div>

                     {/* Permanent Label for Active Site */}
                     {!activeId && (
                        <div className="mt-1 opacity-40 group-hover:opacity-100 transition-opacity">
                           <p className="text-[8px] font-bold text-slate-500 uppercase">{point.name.split(' ')[2] || 'NODE'}</p>
                        </div>
                     )}
                  </div>
                </div>
              );
           })}
        </div>

        {/* Legend */}
        <div className="absolute bottom-6 left-6 flex items-center gap-4 bg-white/80 backdrop-blur-md px-4 py-2 rounded-xl border border-slate-200/60 shadow-sm text-[10px] font-bold uppercase tracking-wider text-slate-500">
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Healthy</div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-amber-500" /> Warning</div>
           <div className="flex items-center gap-1.5"><div className="w-2 h-2 rounded-full bg-rose-500" /> Critical</div>
        </div>
      </div>
    </article>
  );
};

const StatusIcon = ({ status }: { status: string }) => {
  switch (status) {
    case 'critical': return <ShieldAlert className="w-4 h-4 text-rose-500" />;
    case 'warning': return <AlertTriangle className="w-4 h-4 text-amber-500" />;
    default: return <ShieldCheck className="w-4 h-4 text-emerald-500" />;
  }
};

export default NetworkHealthMap;
