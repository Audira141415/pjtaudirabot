import React, { useState } from 'react';
import { ClipboardList, Download, FileText, Share2, LucideIcon, FileType, Activity, Radio, Cpu } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const ShiftHandover: React.FC = () => {
  const [generating, setGenerating] = useState(false);

  const generateReport = async () => {
    setGenerating(true);
    // Simulate generation for now
    setTimeout(() => {
      setGenerating(false);
      alert('Handover report generated and sent to WhatsApp NOC Group.');
    }, 2000);
  };

  return (
    <motion.article 
      whileHover={{ scale: 1.02 }}
      className="flex flex-col h-full rounded-[48px] border-4 border-white/5 bg-gradient-to-br from-[#0a0c10] via-indigo-950 to-indigo-900 p-10 text-white shadow-[0_40px_100px_rgba(0,0,0,0.8)] relative overflow-hidden group/handover"
    >
      <div className="absolute top-0 right-0 p-10 opacity-5 pointer-events-none group-hover/handover:opacity-10 transition-opacity">
         <Radio className="w-56 h-56 rotate-12" />
      </div>

      <div className="absolute bottom-0 left-0 w-full h-[4px] glass-border-beam" />
      
      <div className="relative z-10 flex flex-col h-full">
        <div className="flex items-center gap-6 mb-10">
          <div className="p-5 rounded-[24px] bg-white/10 backdrop-blur-3xl border border-white/20 shadow-xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-[1px] bg-indigo-400 opacity-50" />
            <ClipboardList className="w-8 h-8 text-white" />
          </div>
          <div>
            <h3 className="text-3xl font-black text-white italic tracking-tighter uppercase leading-none mb-2">Tactical Relay</h3>
            <p className="text-[10px] text-indigo-200/50 font-black uppercase tracking-[0.4em] font-mono italic">SYNCING_OPERATIONAL_CHANNELS</p>
          </div>
        </div>

        <div className="space-y-6 mb-10 flex-1">
           <HandoverPoint icon={FileText} label="REPORT_ENGINE_V3" text="Current status of all tickets summarized" />
           <HandoverPoint icon={FileType} label="EXPORT_PROTOCOL" text="PDF/WhatsApp report formatting" />
           <HandoverPoint icon={Share2} label="BROADCAST_RELAY" text="Direct broadcast to telegram/whatsapp" />
        </div>

        <button 
           onClick={generateReport}
           disabled={generating}
           className={`w-full py-6 rounded-[28px] bg-indigo-500 text-white font-black text-[12px] uppercase tracking-[0.5em] italic transition-all active:scale-95 shadow-[0_20px_60px_rgba(79,70,229,0.4)] flex items-center justify-center gap-4 relative overflow-hidden ${
              generating ? 'opacity-70 cursor-wait' : 'hover:bg-indigo-400 hover:shadow-indigo-500/50'
           }`}
        >
          {generating ? (
             <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}>
                <Activity className="w-6 h-6" />
             </motion.div>
          ) : (
             <><Download className="w-6 h-6" /> FIRE_HANDOVER_PROTOCOL</>
          )}
          
          <AnimatePresence>
             {generating && (
                <motion.div 
                  initial={{ x: "-100%" }}
                  animate={{ x: "100%" }}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                  className="absolute inset-0 bg-white/20 pointer-events-none"
                />
             )}
          </AnimatePresence>
        </button>
      </div>
    </motion.article>
  );
};

const HandoverPoint = ({ icon: Icon, label, text }: { icon: LucideIcon, label: string, text: string }) => (
  <div className="flex items-start gap-5 group/point">
     <div className="mt-1 p-3 rounded-2xl bg-white/10 border border-white/10 group-hover/point:bg-indigo-500/20 group-hover/point:border-indigo-500/30 transition-all">
        <Icon className="w-4 h-4 text-white" />
     </div>
     <div>
        <p className="text-[9px] font-black text-indigo-300 uppercase tracking-widest mb-1 italic font-mono">{label}</p>
        <p className="text-sm font-black text-indigo-50 leading-tight uppercase tracking-tighter italic">{text}</p>
     </div>
  </div>
);

export default ShiftHandover;
