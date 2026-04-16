import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Download, 
  Plus, 
  RefreshCw, 
  FileSpreadsheet, 
  FileText, 
  FileCode, 
  File, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Info, 
  ChevronRight, 
  Loader2, 
  Database, 
  HardDrive, 
  History, 
  Share2, 
  Orbit, 
  CloudDownload, 
  Layers, 
  Fingerprint, 
  LayoutGrid, 
  MoreHorizontal,
  XCircle,
  CheckCircle,
  Clock,
  ArrowDownToLine,
  FileJson
} from 'lucide-react';
import { toast } from '../components/Toast';

const MODULES = ['tickets','users','contacts','deals','campaigns','payments','faq','agents','tags','sentiment','inbox'];
const FORMATS = ['CSV','XLSX','PDF','JSON'];
const FORMAT_ICON: Record<string, React.ElementType> = { 
  CSV: FileSpreadsheet, 
  XLSX: FileSpreadsheet, 
  PDF: FileText, 
  JSON: FileJson 
};

const STATUS_STYLE: Record<string, { bg: string; text: string; border: string; icon: any }> = {
  PENDING: { bg: 'bg-slate-50 dark:bg-slate-800', text: 'text-slate-400 dark:text-slate-500', border: 'border-slate-100 dark:border-slate-700', icon: Clock },
  PROCESSING: { bg: 'bg-amber-50 dark:bg-amber-500/10', text: 'text-amber-600 dark:text-amber-500', border: 'border-amber-100 dark:border-amber-500/20', icon: Loader2 },
  COMPLETED: { bg: 'bg-emerald-50 dark:bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-emerald-100 dark:border-emerald-500/20', icon: CheckCircle },
  FAILED: { bg: 'bg-rose-50 dark:bg-rose-500/10', text: 'text-rose-600 dark:text-rose-400', border: 'border-rose-100 dark:border-rose-500/20', icon: XCircle },
};

export default function ExportCenter() {
  const [exports, setExports] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: 'tickets', format: 'CSV' });

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getExports(); 
      setExports(r.data ?? []); 
    } catch {
       toast({ type: 'error', title: 'EGRESS_PROTOCOL_FAILURE', message: 'Failed to access orbital extraction logs.' });
    } finally { 
      setLoading(false); 
    } 
  };
  
  useEffect(() => { load(); }, []);

  const create = async () => { 
    try {
      await api.createExport(form); 
      setShowForm(false); 
      toast({ type: 'success', title: 'EXTRACTION_INITIALIZED', message: `Data orbital mechanics active for ${form.module.toUpperCase()}.` });
      load(); 
      setTimeout(load, 3000); 
    } catch {
       toast({ type: 'error', title: 'INITIALIZATION_ERROR', message: 'Failed to engage data egress flow.' });
    }
  };

  const fmtSize = (b: number) => { 
    if (!b) return '0 B'; 
    if (b < 1024) return b + ' B'; 
    if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; 
    return (b / 1048576).toFixed(1) + ' MB'; 
  };

  if (loading && exports.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Orbital Extraction Stream...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Orbital Egress Subsystem</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Export Center</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Execute high-velocity data extractions, orchestrate batch ingestion ledgers, and manage repository egress flows.</p>
        </div>

        <div className="flex items-center gap-4">
           <button 
              onClick={() => setShowForm(v => !v)} 
              className="px-8 py-5 rounded-[32px] bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest hover:bg-indigo-500 flex items-center gap-3 transition-all hover:scale-[1.05] active:scale-95 shadow-2xl shadow-indigo-600/20 border-2 border-indigo-400/20"
           >
             <Plus className="w-4 h-4" /> Initialize Extraction
           </button>
           <button 
              onClick={load} 
              className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 dark:text-slate-600 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {/* Deployment Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-950/40 border-2 border-dashed border-indigo-500/30 rounded-[48px] p-12 shadow-inner animate-in slide-in-from-top-4 duration-500 backdrop-blur-3xl">
          <div className="flex items-center gap-3 mb-10">
             <ArrowDownToLine className="w-6 h-6 text-indigo-500" />
             <h2 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">Extraction Parameters</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <div className="space-y-4">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Source Domain</label>
               <select 
                  value={form.module} 
                  onChange={e => setForm({...form, module: e.target.value})} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[28px] text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all cursor-pointer shadow-inner"
               >
                 {MODULES.map(m => <option key={m} value={m}>{m.toUpperCase()}</option>)}
               </select>
            </div>
            <div className="space-y-4">
               <label className="block text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Protocol Format</label>
               <select 
                  value={form.format} 
                  onChange={e => setForm({...form, format: e.target.value})} 
                  className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white px-8 py-5 rounded-[28px] text-xs font-black uppercase tracking-widest outline-none focus:border-indigo-500/50 appearance-none transition-all cursor-pointer shadow-inner"
               >
                 {FORMATS.map(f => <option key={f} value={f}>{f}</option>)}
               </select>
            </div>
            <div className="flex items-end">
               <button 
                  onClick={create} 
                  className="w-full py-5 bg-emerald-600 text-white rounded-[28px] text-[10px] font-black tracking-widest uppercase flex items-center justify-center gap-3 transition-all hover:bg-emerald-500 hover:scale-[1.02] active:scale-95 shadow-2xl shadow-emerald-500/20 border-2 border-emerald-400/20"
               >
                  <CloudDownload className="w-5 h-5" /> Execute Egress Protocol
               </button>
            </div>
          </div>
        </div>
      )}

      {/* Extraction Ledger */}
      <div className="space-y-6">
        <div className="flex items-center gap-3 px-2">
           <History className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em]">Orbital Egress History</p>
        </div>
        
        {exports.map(e => {
          const Icon = FORMAT_ICON[e.format] || File;
          const s = STATUS_STYLE[e.status] || STATUS_STYLE.PENDING;
          const StatusIcon = s.icon;
          return (
            <div key={e.id} className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] p-8 flex flex-col lg:flex-row items-center gap-10 group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 shadow-sm dark:shadow-2xl backdrop-blur-3xl relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-gradient-to-b from-transparent via-current opacity-20" style={{ color: s.text.includes('emerald') ? '#10b981' : s.text.includes('rose') ? '#f43f5e' : '#6366f1' }} />
              
              <div className="flex items-center gap-6">
                 <div className={`w-16 h-16 rounded-[24px] bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 shadow-inner group-hover:scale-110 group-hover:rotate-6 transition-all flex items-center justify-center`}>
                    <Icon className="w-7 h-7 text-indigo-500" />
                 </div>
                 <div className="space-y-1">
                    <div className="flex items-center gap-2">
                       <h3 className="text-2xl font-black text-slate-900 dark:text-white uppercase italic tracking-tight">{e.module}</h3>
                       <span className="text-[11px] font-black text-slate-300 dark:text-slate-700 tracking-[0.3em]">.{e.format?.toLowerCase()}</span>
                    </div>
                    <div className="flex items-center gap-3">
                       <div className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${s.bg} ${s.text} ${s.border}`}>
                          <StatusIcon className={`w-3 h-3 ${e.status === 'PROCESSING' ? 'animate-spin' : ''}`} />
                          {e.status}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-6 w-full lg:border-l lg:border-white/5 lg:pl-10">
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Descriptor</p>
                    <p className="text-[11px] font-black text-slate-900 dark:text-slate-300 truncate max-w-[120px] font-mono italic">"{e.fileName || 'SYS_GEN'}"</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Quantum Size</p>
                    <p className="text-[11px] font-black text-slate-900 dark:text-slate-300 italic">{e.totalRows != null ? `${e.totalRows} NODES` : '0 NODES'}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Entropy Mass</p>
                    <p className="text-[11px] font-black text-slate-900 dark:text-slate-300 italic">{fmtSize(e.fileSize || 0)}</p>
                 </div>
                 <div className="space-y-1">
                    <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">Temporal Fix</p>
                    <p className="text-[11px] font-black text-slate-900 dark:text-white leading-none whitespace-nowrap">{new Date(e.createdAt).toLocaleDateString()}</p>
                    <p className="text-[9px] font-black text-slate-300 dark:text-slate-700 leading-none">{new Date(e.createdAt).toLocaleTimeString()}</p>
                 </div>
              </div>

              <div className="flex gap-4">
                 {e.fileUrl && (
                    <a 
                       href={e.fileUrl} 
                       className="p-5 bg-indigo-600 text-white rounded-[24px] transition-all hover:bg-white hover:text-indigo-600 border border-transparent hover:border-indigo-600 shadow-xl shadow-indigo-600/20 active:scale-90"
                       title="Download Extract"
                    >
                       <Download className="w-5 h-5" />
                    </a>
                 )}
                 <button className="p-5 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 rounded-[24px] hover:text-rose-500 transition-all active:scale-90">
                    <MoreHorizontal className="w-5 h-5" />
                 </button>
              </div>

              {e.error && (
                <div className="absolute bottom-4 left-10 flex items-center gap-2 text-[9px] font-black text-rose-500 uppercase tracking-widest">
                   <XCircle className="w-3 h-3" />
                   {e.error}
                </div>
              )}
            </div>
          );
        })}
        {exports.length === 0 && (
           <div className="py-32 text-center grayscale opacity-10">
              <Layers className="w-20 h-20 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
              <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Ingestion Records</p>
           </div>
        )}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Egress Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">High-Velocity Data Extractions Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Orbital egress protocols guarantee 100% data integrity across all exported archival formats.</span>
         </div>
      </div>
    </div>
  );
}
