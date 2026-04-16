import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageSquare, 
  Ticket, 
  DollarSign, 
  Star, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Info, 
  ChevronRight, 
  Loader2, 
  Globe, 
  Monitor, 
  Cpu, 
  Layers, 
  Clock, 
  Target, 
  LayoutGrid, 
  Binary, 
  Fingerprint, 
  LineChart, 
  PieChart, 
  ArrowUpRight, 
  ArrowDownRight, 
  Percent,
  Wallet,
  ZapOff,
  Crosshair,
  BarChart,
  Stethoscope
} from 'lucide-react';
import { toast } from '../components/Toast';

export default function AnalyticsCharts() {
  const [data, setData] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getAnalyticsOverview(); 
      setData(r.data ?? {}); 
    } catch {
       toast({ type: 'error', title: 'TELEMETRY_FAILURE', message: 'Failed to access global trend matrices.' });
    } finally { 
      setLoading(false); 
    } 
  };
  
  useEffect(() => { load(); }, []);

  if (loading && Object.keys(data).length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Aggregating Global Trends...</span>
    </div>
  );

  const metrics = [
    { label: 'Total Tickets', value: data.tickets ?? 0, icon: Ticket, color: 'text-blue-500', bg: 'bg-blue-50 dark:bg-blue-500/10', border: 'border-blue-100 dark:border-blue-500/20' },
    { label: 'CRM Contacts', value: data.contacts ?? 0, icon: Users, color: 'text-purple-500', bg: 'bg-purple-50 dark:bg-purple-500/10', border: 'border-purple-100 dark:border-purple-500/20' },
    { label: 'Deals Active', value: data.deals ?? 0, icon: DollarSign, color: 'text-emerald-500', bg: 'bg-emerald-50 dark:bg-emerald-500/10', border: 'border-emerald-100 dark:border-emerald-500/20' },
    { label: 'Signal Units', value: data.messages ?? 0, icon: MessageSquare, color: 'text-amber-500', bg: 'bg-amber-50 dark:bg-amber-500/10', border: 'border-amber-100 dark:border-amber-500/20' },
    { label: 'Active Agents', value: data.agents ?? 0, icon: ShieldCheck, color: 'text-indigo-500', bg: 'bg-indigo-50 dark:bg-indigo-500/10', border: 'border-indigo-100 dark:border-indigo-500/20' },
    { label: 'CSAT Average', value: typeof data.csatAvg === 'number' ? data.csatAvg.toFixed(1) : '0', icon: Star, color: 'text-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-500/10', border: 'border-yellow-100 dark:border-yellow-500/20' },
  ];

  const dealsByStage = Array.isArray(data.dealsByStage) ? data.dealsByStage : [];
  const maxDeal = Math.max(...dealsByStage.map((d: any) => d._count ?? 0), 1);
  const STAGE_COLOR: Record<string, string> = { 
    LEAD: '#94a3b8', 
    QUALIFIED: '#3b82f6', 
    PROPOSAL: '#8b5cf6', 
    NEGOTIATION: '#f59e0b', 
    WON: '#10b981', 
    LOST: '#ef4444' 
  };

  const fmt = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <LineChart className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Statistical Analysis Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Analytics Overview</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Inspect global operational health, revenue velocity, and cognitive performance markers.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
              <Activity className="w-4 h-4 text-indigo-500 animate-pulse" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Real-time Telemetry Active</span>
           </div>
           <button 
              onClick={load} 
              className="p-4 bg-indigo-600 text-white rounded-[20px] transition-all shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 border-2 border-indigo-400/20"
           >
             <RefreshCw className="w-5 h-5" />
           </button>
        </div>
      </div>

      {/* Scalar Metrics Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
        {metrics.map(m => (
          <div key={m.label} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] text-center shadow-sm dark:shadow-none hover:shadow-xl group transition-all duration-500 relative overflow-hidden backdrop-blur-3xl">
            <div className={`absolute bottom-0 left-0 h-1 w-full opacity-20 bg-current transition-all group-hover:opacity-100`} style={{ color: m.color.includes('emerald') ? '#10b981' : m.color.includes('rose') ? '#f43f5e' : '#6366f1' }} />
            <div className={`w-14 h-14 ${m.bg} rounded-[20px] flex items-center justify-center mx-auto mb-6 border ${m.border} shadow-inner group-hover:scale-110 transition-transform`}>
               <m.icon className={`w-7 h-7 ${m.color}`} />
            </div>
            <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter mb-1">{m.value}</p>
            <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em]">{m.label}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
        {/* Pipeline Distribution Map */}
        <div className="lg:col-span-3 bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-12 rounded-[48px] shadow-sm dark:shadow-2xl backdrop-blur-3xl space-y-12">
           <div className="flex items-center justify-between">
              <div className="flex items-center gap-3 text-indigo-500">
                 <Target className="w-6 h-6" />
                 <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Pipeline Distribution Map</h3>
              </div>
              <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest italic">Fiscal Nodal Weights</p>
           </div>

           <div className="space-y-8">
            {dealsByStage.map((d: any) => (
              <div key={d.stage} className="space-y-3 group">
                <div className="flex items-center justify-between px-2">
                   <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: STAGE_COLOR[d.stage] || '#6366f1' }} />
                      <span className="text-[11px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-widest italic group-hover:text-indigo-500 transition-colors">{d.stage}</span>
                   </div>
                   <div className="flex items-center gap-4">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{d._count} NODES</span>
                      <span className="text-sm font-black text-slate-900 dark:text-white italic tracking-tighter">{fmt(d._sum?.value || 0)}</span>
                   </div>
                </div>
                <div className="w-full bg-slate-50 dark:bg-slate-900/50 rounded-full h-4 overflow-hidden shadow-inner border border-slate-100 dark:border-slate-800">
                  <div 
                     className="h-full rounded-full transition-all duration-1000 flex items-center justify-end px-3 shadow-lg" 
                     style={{ width: `${(d._count / maxDeal) * 100}%`, backgroundColor: STAGE_COLOR[d.stage] || '#6366f1' }}
                  >
                     <div className="w-1 h-2 bg-white/40 rounded-full" />
                  </div>
                </div>
              </div>
            ))}
            {dealsByStage.length === 0 && (
               <div className="py-24 text-center grayscale opacity-10">
                  <BarChart3 className="w-20 h-20 mx-auto mb-4 text-slate-200 dark:text-slate-800" />
                  <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">No Pipeline Data Ingested</p>
               </div>
            )}
          </div>
        </div>

        {/* Global Strategy Matrix */}
        <div className="lg:col-span-2 space-y-10">
           <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-10 rounded-[48px] shadow-sm dark:shadow-2xl backdrop-blur-3xl h-full flex flex-col justify-between">
              <div>
                 <div className="flex items-center gap-3 mb-10 text-emerald-500">
                    <Activity className="w-6 h-6" />
                    <h3 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Global Strategy Matrix</h3>
                 </div>

                 <div className="grid grid-cols-1 gap-6">
                    {[
                      { label: 'Satisfaction Quotient', icon: Star, value: `${data.csatTotal ?? 0} LOGS`, sub: 'Total CSAT Responses', color: 'from-blue-50 to-blue-100 dark:from-blue-500/10 dark:to-blue-600/5', text: 'text-blue-600 dark:text-blue-400' },
                      { label: 'Realized Revenue', icon: Wallet, value: fmt(dealsByStage.filter((d: any) => d.stage === 'WON').reduce((s: number, d: any) => s + (d._sum?.value || 0), 0)), sub: 'Won Deal Aggregate', color: 'from-emerald-50 to-emerald-100 dark:from-emerald-500/10 dark:to-emerald-600/5', text: 'text-emerald-600 dark:text-emerald-400' },
                      { label: 'Stakeholder Density', icon: Users, value: data.contacts ?? 0, sub: 'Global CRM Directory', color: 'from-purple-50 to-purple-100 dark:from-purple-500/10 dark:to-purple-600/5', text: 'text-purple-600 dark:text-purple-400' },
                      { label: 'Trouble Ticket Mass', icon: Ticket, value: data.tickets ?? 0, sub: 'Global Support Queue', color: 'from-amber-50 to-amber-100 dark:from-amber-500/10 dark:to-amber-600/5', text: 'text-amber-600 dark:text-amber-400' },
                    ].map((card, i) => (
                      <div key={i} className={`bg-gradient-to-br ${card.color} border border-slate-100 dark:border-white/5 rounded-[32px] p-6 group hover:translate-x-2 transition-all duration-500 shadow-sm hover:shadow-xl`}>
                         <div className="flex items-start justify-between">
                            <div className="space-y-4 flex-1">
                               <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">{card.label}</p>
                               <div className="space-y-1">
                                  <p className={`text-2xl font-black italic tracking-tighter ${card.text}`}>{card.value}</p>
                                  <p className="text-[9px] font-bold text-slate-400 dark:text-slate-600 uppercase tracking-widest italic">{card.sub}</p>
                               </div>
                            </div>
                            <div className={`p-4 rounded-2xl bg-white dark:bg-slate-950/40 shadow-inner ${card.text}`}>
                               <card.icon className="w-5 h-5" />
                            </div>
                         </div>
                      </div>
                    ))}
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Analytical Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Global Telemetry Subsystems Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Telemetry data is indexed and normalized from all regional cloud nodes in real-time.</span>
         </div>
      </div>
    </div>
  );
}

const RefreshCw = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 2v6h6"/><path d="M21 12A9 9 0 0 0 6 5.3L3 8"/><path d="M21 22v-6h-6"/><path d="M3 12a9 9 0 0 0 15 6.7l3-6.7"/>
  </svg>
)
