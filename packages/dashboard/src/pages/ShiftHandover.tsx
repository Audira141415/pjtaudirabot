import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  ArrowRightLeft, 
  Sun, 
  Moon, 
  Sunset, 
  Clock, 
  X, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Timer,
  FileText
} from 'lucide-react';

const SHIFT_ICONS: Record<string, JSX.Element> = {
  PAGI: <Sun className="w-5 h-5 text-amber-500" />,
  SIANG: <Sunset className="w-5 h-5 text-orange-500" />,
  MALAM: <Moon className="w-5 h-5 text-indigo-500" />,
};

const SHIFT_GHOST_ICONS: Record<string, JSX.Element> = {
  PAGI: <Sun className="w-16 h-16 text-amber-500/10" />,
  SIANG: <Sunset className="w-16 h-16 text-orange-500/10" />,
  MALAM: <Moon className="w-16 h-16 text-indigo-500/10" />,
};

const SHIFT_GRADIENTS: Record<string, string> = {
  PAGI: 'from-amber-600/10 to-transparent border-amber-500/20',
  SIANG: 'from-orange-600/10 to-transparent border-orange-500/20',
  MALAM: 'from-indigo-600/10 to-transparent border-indigo-500/20',
};

export default function ShiftHandoverPage() {
  const [handovers, setHandovers] = useState<any[]>([]);
  const [currentShift, setCurrentShift] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<any | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, c] = await Promise.all([api.getShiftHandovers(), api.getCurrentShift()]);
        setHandovers((h.data as any) ?? []);
        setCurrentShift((c as any)?.data ?? c);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Synchronizing Temporal Records...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <ArrowRightLeft className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Operational Relay</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Shift Handover Matrix</h1>
          <p className="text-slate-500 font-medium text-sm mt-4">Continuity tracking, mission-critical highlights, and temporal operator transitions.</p>
        </div>

        <div className="flex items-center gap-4 bg-slate-900/50 border border-slate-800 p-2 rounded-[24px]">
           <button className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-600/20">
              <Zap className="w-4 h-4" /> Live Sync
           </button>
        </div>
      </div>

      {/* Current Operator Context */}
      {currentShift && (
        <div className={`relative bg-slate-950/40 border-[2px] rounded-[56px] p-12 overflow-hidden backdrop-blur-3xl group ${SHIFT_GRADIENTS[currentShift.shiftType] || 'border-slate-800'}`}>
          <div className="absolute top-0 right-0 p-12 pointer-events-none">
             {SHIFT_GHOST_ICONS[currentShift.shiftType] || <Clock className="w-16 h-16 text-slate-800" />}
          </div>
          
          <div className="flex flex-col lg:flex-row gap-12 relative z-10">
             <div className="flex-1 space-y-6">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-slate-900 rounded-[28px] border border-white/5">
                      {SHIFT_ICONS[currentShift.shiftType] || <Clock className="w-6 h-6 text-indigo-500" />}
                   </div>
                   <div>
                      <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter leading-none">ACTIVE CYCLE: {currentShift.shiftType}</h2>
                      <div className="flex items-center gap-2 mt-2">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">
                           Identity: {currentShift.user?.name ?? currentShift.userId} // Start: {new Date(currentShift.shiftStart).toLocaleTimeString()}
                        </p>
                      </div>
                   </div>
                </div>

                <div className="bg-slate-950/60 border border-white/5 p-8 rounded-[40px] relative">
                   <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-[0.2em] mb-4 italic">Mission Highlights</h3>
                   <p className="text-sm font-bold text-slate-300 leading-relaxed italic">"{currentShift.highlights || 'Global telemetry synchronization in progress...'}"</p>
                </div>
             </div>

             <div className="w-full lg:w-[400px] space-y-6">
                <div className="bg-slate-950/60 border border-white/5 p-8 rounded-[40px]">
                   <h3 className="text-[10px] font-black text-emerald-500 uppercase tracking-[0.2em] mb-6 italic">Required Action Strings</h3>
                   {currentShift.actionItems && currentShift.actionItems.length > 0 ? (
                      <ul className="space-y-4">
                        {(currentShift.actionItems as string[]).map((item, i) => (
                          <li key={i} className="flex items-start gap-3 group/item">
                             <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 mt-1.5 group-hover/item:scale-150 transition-all shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                             <span className="text-[11px] font-bold text-slate-400 group-hover/item:text-slate-100 transition-colors">{item}</span>
                          </li>
                        ))}
                      </ul>
                   ) : (
                      <p className="text-[10px] font-black text-slate-700 uppercase italic">All operational vectors cleared.</p>
                   )}
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Historical Ledger */}
      <section className="bg-slate-950/40 border border-slate-800/80 rounded-[48px] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none" />
        <div className="p-10 border-b border-slate-800/50 flex items-center justify-between">
           <div className="flex items-center gap-4">
              <Activity className="w-6 h-6 text-indigo-500" />
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Temporal Handover History</h2>
           </div>
           <div className="flex gap-4">
              <button className="p-3 bg-slate-900 border border-slate-800 text-slate-500 rounded-xl hover:text-white transition-all"><FileText className="w-5 h-5" /></button>
           </div>
        </div>
        
        <div className="overflow-x-auto text-[11px]">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/40 border-b border-slate-800/50">
                <th className="px-10 py-6 font-black text-slate-500 uppercase tracking-[0.2em]">Temporal Point</th>
                <th className="px-8 py-6 font-black text-slate-500 uppercase tracking-[0.2em]">Cycle Archetype</th>
                <th className="px-8 py-6 font-black text-slate-500 uppercase tracking-[0.2em]">Relay Operator</th>
                <th className="px-8 py-6 font-black text-slate-500 uppercase tracking-[0.2em]">Compliance Status</th>
                <th className="px-8 py-6 font-black text-slate-500 uppercase tracking-[0.2em]">Highlights Vector</th>
                <th className="px-8 py-6 font-black text-slate-500 uppercase tracking-[0.2em]">Active Signals</th>
                <th className="px-10 py-6 text-right font-black text-slate-500 uppercase tracking-[0.2em]">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {handovers.map((h) => (
                <tr key={h.id} className="group hover:bg-slate-900/50 transition-colors">
                  <td className="px-10 py-8 text-white font-black italic">{new Date(h.shiftStart).toLocaleDateString()}</td>
                  <td className="px-8 py-8">
                    <div className="flex items-center gap-2">
                       <div className="p-2 bg-slate-900 rounded-xl group-hover:bg-white/5 transition-all">
                          {SHIFT_ICONS[h.shiftType]}
                       </div>
                       <span className="font-black text-slate-300 uppercase italic tracking-widest">{h.shiftType}</span>
                    </div>
                  </td>
                  <td className="px-8 py-8">
                     <div className="flex items-center gap-2">
                        <ShieldCheck className="w-3.5 h-3.5 text-slate-700" />
                        <span className="font-bold text-slate-400 italic">{h.user?.name ?? h.userId}</span>
                     </div>
                  </td>
                  <td className="px-8 py-8">
                    <span className={`px-4 py-1.5 rounded-xl font-black italic tracking-[0.2em] border whitespace-nowrap ${
                       h.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' : 
                       h.status === 'ACTIVE' ? 'bg-sky-500/10 text-sky-500 border-sky-500/20 animate-pulse' : 
                       'bg-slate-900 text-slate-600 border-slate-800'
                    }`}>
                      {h.status}
                    </span>
                  </td>
                  <td className="px-8 py-8 max-w-xs truncate text-slate-500 font-bold italic font-mono opacity-80 group-hover:opacity-100 transition-opacity">"{h.highlights || 'System nominal'}"</td>
                  <td className="px-8 py-8">
                     <div className="flex items-center gap-2">
                        <Timer className="w-3.5 h-3.5 text-rose-500" />
                        <span className="text-white font-black italic">{h.openTickets ?? 0}</span>
                     </div>
                  </td>
                  <td className="px-10 py-8 text-right">
                    <button 
                       onClick={() => setDetail(h)} 
                       className="px-6 py-2.5 bg-slate-900 border border-slate-800 text-indigo-400 rounded-xl font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all shadow-xl group-hover:scale-[1.05]"
                    >
                       INTERROGATE
                    </button>
                  </td>
                </tr>
              ))}
              {handovers.length === 0 && (
                <tr>
                   <td colSpan={7} className="py-24 text-center grayscale opacity-10 font-black uppercase text-[10px] tracking-[0.5em]">Temporal Ledger Void</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Modal Ultimate */}
      {detail && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setDetail(null)}>
          <div 
             className="w-full max-w-2xl bg-slate-950 border border-indigo-500/20 rounded-[64px] shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500" 
             onClick={e => e.stopPropagation()}
          >
             <div className="p-10 border-b border-indigo-500/10 flex items-start justify-between">
                <div>
                   <div className="flex items-center gap-3 mb-2">
                      <Timer className="w-5 h-5 text-indigo-500" />
                      <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.5em]">Temporal Trace</span>
                   </div>
                   <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-none">Record_ID_{detail.id.slice(0, 8)}</h2>
                   <p className="text-slate-500 font-bold text-xs mt-3 opacity-80 uppercase tracking-widest">{detail.shiftType} RELAY // {new Date(detail.shiftStart).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setDetail(null)} className="p-4 bg-slate-900 hover:bg-rose-950/20 text-slate-500 hover:text-rose-500 rounded-[28px] transition-all border border-slate-800 active:scale-90">
                   <X className="w-6 h-6" />
                </button>
             </div>

             <div className="p-10 space-y-8 overflow-y-auto max-h-[70vh] scrollbar-hide">
                <div className="grid grid-cols-2 gap-4">
                   {[
                     { label: 'Relay Host', value: detail.user?.name ?? detail.userId, icon: ShieldCheck },
                     { label: 'Compliance Status', value: detail.status, icon: Zap },
                     { label: 'Temporal Start', value: new Date(detail.shiftStart).toLocaleTimeString(), icon: Clock },
                     { label: 'Temporal End', value: detail.shiftEnd ? new Date(detail.shiftEnd).toLocaleTimeString() : 'In Progress', icon: Timer }
                   ].map((item, i) => (
                     <div key={i} className="bg-slate-900 border border-slate-800 p-6 rounded-[32px] hover:border-indigo-500/20 transition-all">
                        <item.icon className="w-4 h-4 text-indigo-500 mb-3" />
                        <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{item.label}</p>
                        <p className="text-[11px] font-black text-white italic truncate">{item.value}</p>
                     </div>
                   ))}
                </div>

                <div className="space-y-6">
                   <div className="bg-slate-900 border border-slate-800 p-8 rounded-[48px]">
                      <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 italic">Operational Highlights</h3>
                      <p className="text-sm font-bold text-slate-300 italic leading-relaxed">"{detail.highlights || 'System nominal for the duration of the temporal point.'}"</p>
                   </div>

                   {detail.notes && (
                      <div className="bg-slate-900 border border-slate-800 p-8 rounded-[48px]">
                         <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-4 italic">Neural Log Notes</h3>
                         <p className="text-sm font-bold text-slate-500 italic leading-relaxed">{detail.notes}</p>
                      </div>
                   )}

                   {detail.actionItems?.length > 0 && (
                      <div className="bg-indigo-600/5 border border-indigo-500/20 p-8 rounded-[48px]">
                         <h3 className="text-[10px] font-black text-indigo-500 uppercase tracking-widest mb-6 italic">Relay Tasks (Action Items)</h3>
                         <ul className="space-y-4">
                            {(detail.actionItems as string[]).map((a, i) => (
                              <li key={i} className="flex items-start gap-3 group">
                                 <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 mt-1.5" />
                                 <span className="text-[11px] font-bold text-slate-400 group-hover:text-slate-100 transition-colors uppercase italic">{a}</span>
                              </li>
                            ))}
                         </ul>
                      </div>
                   )}
                </div>

                <div className="grid grid-cols-3 gap-4 pt-4">
                   {[
                     { label: 'OPEN_SIGS', val: detail.openTickets || 0, color: 'text-rose-500' },
                     { label: 'RESOLVED', val: detail.resolvedTickets || 0, color: 'text-emerald-500' },
                     { label: 'ESCALATED', val: detail.escalatedTickets || 0, color: 'text-amber-500' }
                   ].map((st, i) => (
                     <div key={i} className="text-center p-6 bg-slate-950/50 border border-slate-800 rounded-[32px]">
                        <p className={`text-2xl font-black italic tracking-tighter ${st.color}`}>{st.val}</p>
                        <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">{st.label}</p>
                     </div>
                   ))}
                </div>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
