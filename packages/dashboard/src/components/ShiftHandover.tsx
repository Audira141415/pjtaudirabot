import React, { useState } from 'react';
import { ClipboardList, Download, FileText, Share2, LucideIcon, FileType } from 'lucide-react';

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
    <article className="flex flex-col h-full rounded-[32px] border border-slate-200 dark:border-white/5 bg-gradient-to-br from-indigo-500 via-indigo-600 to-violet-700 dark:from-indigo-600 dark:to-violet-800 p-7 text-white shadow-xl shadow-indigo-500/20 relative overflow-hidden">
      <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
         <ClipboardList className="w-48 h-48 rotate-12" />
      </div>
      
      <div className="relative z-10">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-white/20 backdrop-blur-md">
            <ClipboardList className="w-5 h-5 text-white" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Smart Shift Handover</h3>
            <p className="text-sm text-indigo-100/90 dark:text-indigo-100/80">Automated ops summary for the next team</p>
          </div>
        </div>

        <div className="space-y-4 mb-8">
           <HandoverPoint icon={FileText} text="Current status of all tickets summarized" />
           <HandoverPoint icon={FileType} text="PDF/WhatsApp report formatting" />
           <HandoverPoint icon={Share2} text="Direct broadcast to telegram/whatsapp" />
        </div>

        <button 
           onClick={generateReport}
           disabled={generating}
           className={`w-full py-4 rounded-2xl bg-white text-indigo-600 dark:text-indigo-500 font-bold tracking-wide transition-all active:scale-95 shadow-lg shadow-black/10 flex items-center justify-center gap-2 ${
              generating ? 'opacity-70 cursor-wait' : 'hover:bg-indigo-50 dark:hover:bg-slate-100'
           }`}
        >
          {generating ? 'Processing Data...' : <><Download className="w-5 h-5" /> Generate NOC Report</>}
        </button>
      </div>
    </article>
  );
};

const HandoverPoint = ({ icon: Icon, text }: { icon: LucideIcon, text: string }) => (
  <div className="flex items-start gap-3">
     <div className="mt-1 p-1 rounded-full bg-white/10">
        <Icon className="w-3.5 h-3.5" />
     </div>
     <p className="text-sm font-medium text-indigo-50 leading-relaxed">{text}</p>
  </div>
);

export default ShiftHandover;
