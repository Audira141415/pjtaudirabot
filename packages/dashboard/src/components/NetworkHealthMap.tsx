import React, { useEffect, useState } from 'react';
import { Activity, MapPin } from 'lucide-react';

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
  const [hoveredPoint, setHoveredPoint] = useState<MapPoint | null>(null);

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
    const interval = setInterval(fetchMap, 60000); // Refresh every minute
    return () => clearInterval(interval);
  }, []);

  if (loading) return <div className="h-96 flex items-center justify-center bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 text-slate-400 font-medium">Initializing Tactical Map...</div>;

  return (
    <article className="flex flex-col rounded-[32px] border border-slate-200 bg-white p-7 shadow-sm overflow-hidden relative">
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-900">Network Topology Health</h3>
            <p className="text-sm text-slate-500">Live geospatial status of neuCentrIX nodes</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-xs font-bold uppercase tracking-widest">
           <span className="flex items-center gap-1.5 text-emerald-600"><div className="w-2 h-2 rounded-full bg-emerald-500" /> Operational</span>
           <span className="flex items-center gap-1.5 text-rose-600"><div className="w-2 h-2 rounded-full bg-rose-500 animate-ping" /> Critical</span>
        </div>
      </div>

      <div className="relative aspect-video bg-slate-900 rounded-[24px] border border-slate-800 overflow-hidden group shadow-inner">
        {/* Futuristic Map Grid/Mesh Background */}
        <div className="absolute inset-0 opacity-20 pointer-events-none" 
             style={{ backgroundImage: 'radial-gradient(circle, #334155 1px, transparent 1px)', backgroundSize: '30px 30px' }} />
        
        {/* Placeholder "Batam" Shape (Simulated) */}
        <svg viewBox="0 0 800 450" className="absolute inset-0 w-full h-full opacity-10 pointer-events-none scale-110">
           <path d="M150,200 Q200,100 350,150 T600,200 T400,350 T150,200" fill="none" stroke="white" strokeWidth="2" strokeDasharray="5,5" />
        </svg>

        {/* Node Points */}
        {points.map((point) => {
          // Simplistic coordinate mapping: Normalize Lat/Lng to % (Roughly Batam area)
          // Batam lat range: ~1.0 - 1.2, lng range: ~103.8 - 104.2
          const x = ((point.lng - 103.9) / 0.3) * 100;
          const y = (1 - (point.lat - 1.0) / 0.2) * 100;

          const isCritical = point.status === 'critical';
          const isWarning = point.status === 'warning';

          return (
            <div 
              key={point.id}
              className="absolute group/node cursor-pointer"
              style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }}
              onMouseEnter={() => setHoveredPoint(point)}
              onMouseLeave={() => setHoveredPoint(null)}
            >
              {/* Pulse Effect for Critical */}
              {isCritical && (
                <div className="absolute -inset-4 bg-rose-500/20 rounded-full animate-ping" />
              )}
              
              {/* Point Core */}
              <div className={`w-4 h-4 rounded-full border-2 border-slate-900 shadow-lg transition-transform hover:scale-150 ${
                isCritical ? 'bg-rose-500 shadow-rose-500/50' : 
                isWarning ? 'bg-amber-500 shadow-amber-500/50' : 
                'bg-emerald-500 shadow-emerald-500/50'
              }`} />

              {/* Label (Visible on hover or if critical) */}
              <div className={`absolute left-6 top-0 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-lg bg-slate-800/90 backdrop-blur-md border border-slate-700 text-white text-[10px] font-bold shadow-xl transition-all ${
                hoveredPoint?.id === point.id || isCritical ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-2 pointer-events-none'
              }`}>
                {point.name}
              </div>
            </div>
          );
        })}

        {/* Hover Info Panel */}
        {hoveredPoint && (
          <div className="absolute bottom-6 left-6 right-6 p-4 rounded-2xl bg-slate-800/80 backdrop-blur-xl border border-white/10 text-white flex items-center justify-between animate-in fade-in slide-in-from-bottom-2">
            <div className="flex items-center gap-4">
               <div className={`p-2 rounded-xl ${
                  hoveredPoint.status === 'critical' ? 'bg-rose-500/20 text-rose-400' :
                  hoveredPoint.status === 'warning' ? 'bg-amber-500/20 text-amber-400' :
                  'bg-emerald-500/20 text-emerald-400'
               }`}>
                  <MapPin className="w-5 h-5" />
               </div>
               <div>
                  <p className="text-sm font-bold">{hoveredPoint.name}</p>
                  <p className="text-[10px] text-slate-400 uppercase tracking-tighter">Status: {hoveredPoint.status}</p>
               </div>
            </div>
            <div className="flex gap-6">
               <div className="text-center">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Critical</p>
                  <p className="text-lg font-bold text-rose-400">{hoveredPoint.metrics.critical}</p>
               </div>
               <div className="text-center border-l border-white/10 pl-6">
                  <p className="text-[10px] text-slate-400 uppercase font-black">Pending PM</p>
                  <p className="text-lg font-bold text-amber-400">{hoveredPoint.metrics.warning}</p>
               </div>
            </div>
          </div>
        )}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
           <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Total Impact Score</p>
           <p className="text-xl font-bold text-slate-900">14.2 <span className="text-xs font-medium text-emerald-600 ml-1">↓ 2.1</span></p>
        </div>
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
           <p className="text-[10px] font-bold uppercase text-slate-400 mb-1">Vulnerability Level</p>
           <p className="text-xl font-bold text-slate-900">LOW</p>
        </div>
      </div>
    </article>
  );
};

export default NetworkHealthMap;
