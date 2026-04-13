import React, { useState } from 'react';
import { ClipboardCheck, Download, Share2, Users, FileText, CheckCircle2, LayoutTemplate } from 'lucide-react';
import { toast } from './Toast';

const ShiftHandover: React.FC = () => {
  const [loading, setLoading] = useState(false);

  const handleGenerate = async () => {
    setLoading(true);
    try {
      // Simulate API call for report generation
      await new Promise(resolve => setTimeout(resolve, 1500));
      toast({ type: 'success', title: 'Operational Report Ready', message: 'The morning shift summary has been compiled successfully.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <article className="glass-panel rounded-[40px] p-10 h-full flex flex-col relative overflow-hidden animate-bespoke">
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-emerald-500/5 blur-[80px] pointer-events-none" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-5 mb-10">
          <div className="p-4 rounded-3xl bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 shadow-[0_0_20px_rgba(16,185,129,0.2)]">
            <ClipboardCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-2xl font-black text-white tracking-tighter">Shift Handover</h3>
            <p className="text-sm text-slate-500 font-medium">Automated tactical summary generation.</p>
          </div>
        </div>

        <div className="flex-1 space-y-6">
           <div className="p-6 rounded-[32px] bg-white/[0.02] border border-white/5 space-y-4">
              <div className="flex items-center justify-between mb-2">
                 <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-600">Morning Sync Status</h4>
                 <span className="text-[9px] font-black px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-400">SYNC READY</span>
              </div>
              
              <div className="space-y-4">
                 <HandoverMetric icon={FileText} label="Open Incidents" value={5} />
                 <HandoverMetric icon={Users} label="Auth Requests" value={12} />
                 <HandoverMetric icon={LayoutTemplate} label="Tickets Resolved" value={84} />
              </div>
           </div>

           <div className="p-8 rounded-[32px] bg-indigo-600/5 border border-indigo-500/10 text-center">
              <p className="text-xs font-bold text-slate-400 leading-relaxed mb-6">
                 Compress operational telemetry into a standardized handover protocol for the following shift.
              </p>
              <button 
                onClick={handleGenerate}
                disabled={loading}
                className={`w-full py-5 rounded-[24px] bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.2em] shadow-xl shadow-indigo-600/30 transition-all hover:bg-indigo-500 active:scale-95 flex items-center justify-center gap-3 overflow-hidden ${loading ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {loading ? (
                   <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                   <>
                      <Download className="w-4 h-4" />
                      Generate Tactical Report
                   </>
                )}
              </button>
           </div>
        </div>

        <div className="mt-8 flex items-center justify-center gap-6">
           <button className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
              <Share2 className="w-3.5 h-3.5" /> Share Logic
           </button>
           <div className="w-1 h-1 rounded-full bg-slate-800" />
           <button className="text-[10px] font-black text-slate-600 hover:text-white uppercase tracking-widest flex items-center gap-2 transition-colors">
              <CheckCircle2 className="w-3.5 h-3.5" /> View Archive
           </button>
        </div>
      </div>
    </article>
  );
};

const HandoverMetric = ({ icon: Icon, label, value }: any) => (
   <div className="flex items-center justify-between group">
      <div className="flex items-center gap-3">
         <Icon className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 transition-colors" />
         <span className="text-xs font-bold text-slate-400 group-hover:text-slate-200 transition-colors">{label}</span>
      </div>
      <span className="text-sm font-black text-white">{value}</span>
   </div>
);

export default ShiftHandover;
