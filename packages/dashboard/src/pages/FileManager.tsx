import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  FolderOpen, 
  Trash2, 
  Image, 
  FileText, 
  Film, 
  Music, 
  Download, 
  Search, 
  Plus, 
  Upload, 
  Loader2, 
  X, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  HardDrive,
  Globe,
  FileType,
  Clock,
  ExternalLink,
  Target,
  LayoutGrid,
  Filter,
  BarChart3,
  Calendar,
  Layers,
  FileBox,
  Monitor
} from 'lucide-react';
import { toast } from '../components/Toast';

const MIME_ICON: Record<string, any> = { image: Image, video: Film, audio: Music };
const CATEGORIES = ['','images','documents','videos','audio','other'];

export default function FileManager() {
  const [files, setFiles] = useState<Array<Record<string, any>>>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [form, setForm] = useState({ originalName: '', mimeType: '', size: '', url: '', platform: 'WHATSAPP', category: 'other' });

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getFiles(category || undefined, page); 
      setFiles(r.data ?? []); 
      setTotal(r.total ?? 0); 
    } catch {} 
    finally { setLoading(false); } 
  };

  useEffect(() => { load(); }, [category, page]);

  const remove = async (id: string) => { 
    if (!confirm('Purge this binary asset?')) return;
    try {
      await api.deleteFile(id); 
      toast({ type: 'info', title: 'ASSET_PURGED', message: 'Binary removed from repository.' });
      load(); 
    } catch {}
  };

  const handleUpload = async () => {
    if (!form.originalName.trim() || !form.mimeType.trim()) return;
    setUploading(true);
    try {
      await api.uploadFile({ originalName: form.originalName, mimeType: form.mimeType, size: form.size ? Number(form.size) : 0, url: form.url, platform: form.platform, category: form.category });
      setForm({ originalName: '', mimeType: '', size: '', url: '', platform: 'WHATSAPP', category: 'other' });
      setShowUpload(false);
      toast({ type: 'success', title: 'ASSET_UPLOADED', message: 'Binary ingested successfully.' });
      load();
    } catch {
       toast({ type: 'error', title: 'INGEST_FAILURE', message: 'Failed to upload binary.' });
    } finally { setUploading(false); }
  };

  const fmtSize = (b: number) => { if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };

  const getIcon = (mime: string) => { const type = mime.split('/')[0]; return MIME_ICON[type] || FileText; };

  const filtered = files.filter(f => !search || f.originalName?.toLowerCase().includes(search.toLowerCase()));

  if (loading && files.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Scanning Binary Repository...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <HardDrive className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Nodal Storage Matrix</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">File Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Manage binray assets, cross-platform media repositories, and automated storage quotas.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="px-6 py-3 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
              <FileBox className="w-4 h-4 text-slate-300 dark:text-slate-700" />
              <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{total} binary nodes</span>
           </div>
           <button 
              onClick={() => setShowUpload(true)} 
              className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
           >
             <Upload className="w-4 h-4" /> Ingest Binary
           </button>
        </div>
      </div>

      {/* Global Filter & Query Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
        <div className="md:col-span-2 relative group">
           <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-indigo-500 transition-colors" />
           <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="SEARCH_BINARY_ENTRIES..." 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] pl-14 pr-8 py-5 text-sm font-bold text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all shadow-sm dark:shadow-none"
           />
        </div>
        <div className="relative group">
           <select 
              value={category} 
              onChange={e => { setCategory(e.target.value); setPage(1); }} 
              className="w-full bg-white dark:bg-slate-950/40 border border-slate-200 dark:border-slate-800 rounded-[28px] px-8 py-5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer shadow-sm dark:shadow-none"
           >
              <option value="">Omni-Category Hub</option>
              {CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c.toUpperCase()}</option>)}
           </select>
           <Layers className="absolute right-8 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
        </div>
      </div>

      {/* Binary Asset Grid (Table) */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
        <table className="w-full text-left">
          <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50">
            <tr>
              <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Binary Node</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">MIME Hierarchy</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Scalar Size</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Platform Sync</th>
              <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Temporal Fix</th>
              <th className="px-10 py-6 text-right"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
            {filtered.map(f => {
               const Icon = getIcon(f.mimeType || ''); 
               return (
                  <tr key={f.id} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                    <td className="px-10 py-6">
                       <div className="flex items-center gap-6">
                          <div className="p-4 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl group-hover:text-indigo-500 transition-all shadow-inner">
                             <Icon className="w-6 h-6 text-slate-300 dark:text-slate-700 group-hover:text-indigo-500" />
                          </div>
                          <div>
                             <p className="text-sm font-black text-slate-900 dark:text-white italic uppercase tracking-tight line-clamp-1 group-hover:text-indigo-600 transition-colors uppercase">{f.originalName}</p>
                             <span className="text-[11px] font-black text-slate-300 dark:text-slate-700 flex items-center gap-1.5 mt-1 uppercase tracking-widest leading-none underline decoration-slate-100 dark:decoration-slate-800 underline-offset-4 decoration-2">{f.category || 'misc'}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <code className="text-[10px] font-black text-slate-400 dark:text-slate-600 bg-slate-50 dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-slate-100 dark:border-slate-800 uppercase tracking-widest">{f.mimeType}</code>
                    </td>
                    <td className="px-8 py-6 text-[11px] font-black text-slate-900 dark:text-white italic uppercase tracking-tight">{fmtSize(f.size || 0)}</td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <Monitor className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                          <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${f.platform === 'WHATSAPP' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20' : 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-500 border-sky-100 dark:border-sky-500/20'}`}>
                             {f.platform || '-'}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 dark:text-white italic uppercase tracking-tight leading-none">{new Date(f.createdAt).toLocaleDateString()}</span>
                          <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 mt-1 uppercase tracking-widest">{new Date(f.createdAt).toLocaleTimeString()}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex gap-2 justify-end opacity-0 group-hover:opacity-100 transition-all scale-95 group-hover:scale-100">
                          {f.url && (
                             <a 
                                href={f.url} 
                                target="_blank" 
                                rel="noopener noreferrer" 
                                className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-indigo-500 hover:border-indigo-500/20 rounded-2xl transition-all shadow-xl active:scale-95"
                             >
                                <Download className="w-5 h-5" />
                             </a>
                          )}
                          <button onClick={() => remove(f.id)} className="p-4 bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/20 rounded-2xl transition-all shadow-xl active:scale-95">
                             <Trash2 className="w-5 h-5" />
                          </button>
                       </div>
                    </td>
                  </tr>
               );
            })}
            {filtered.length === 0 && (
               <tr>
                  <td colSpan={7} className="px-10 py-24 text-center grayscale opacity-10">
                     <FileBox className="w-20 h-20 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                     <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">No Binary Content Detected</p>
                  </td>
               </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Hub */}
      {total > 50 && (
        <div className="flex justify-center gap-3 mt-10">
           {Array.from({length: Math.ceil(total / 50)}, (_, i) => (
              <button 
                 key={i} 
                 onClick={() => setPage(i + 1)} 
                 className={`w-12 h-12 flex items-center justify-center rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${page === i + 1 ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20 ring-4 ring-indigo-500/10' : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-indigo-500/30'}`}
              >
                 {i + 1}
              </button>
           ))}
        </div>
      )}

      {/* Ingestion Overlay */}
      {showUpload && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-in fade-in duration-300 p-4">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800/50 rounded-[48px] shadow-2xl w-full max-w-xl p-12 space-y-10 relative overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
            
            <div className="flex items-center justify-between relative z-10">
              <div className="flex items-center gap-4">
                 <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
                    <Upload className="w-6 h-6" />
                 </div>
                 <div>
                    <h2 className="text-2xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Binary Ingestion</h2>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1 italic">Populate repository node</p>
                 </div>
              </div>
              <button onClick={() => setShowUpload(false)} className="p-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-400 hover:text-rose-600 transition-all"><X className="w-6 h-6" /></button>
            </div>

            <div className="space-y-6 relative z-10">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Original Identity *</label>
                    <input value={form.originalName} onChange={e => setForm({ ...form, originalName: e.target.value })} placeholder="e.g. manifest.png" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">MIME Hierarchy *</label>
                    <input value={form.mimeType} onChange={e => setForm({ ...form, mimeType: e.target.value })} placeholder="e.g. image/png" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                 </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Scalar Size (Bytes)</label>
                    <input type="number" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="0" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                 </div>
                 <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Binary Source (URL)</label>
                    <input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                 </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Target Platform</label>
                   <select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-indigo-500 appearance-none cursor-pointer"><option value="WHATSAPP">WHATSAPP</option><option value="TELEGRAM">TELEGRAM</option></select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Classification Hub</label>
                   <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-indigo-500 appearance-none cursor-pointer"><option value="images">IMAGES</option><option value="documents">DOCUMENTS</option><option value="videos">VIDEOS</option><option value="audio">AUDIO</option><option value="other">OTHER</option></select>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-4 pt-10 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
              <button onClick={() => setShowUpload(false)} className="px-10 py-4 text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort Ingestion</button>
              <button 
                 onClick={handleUpload} 
                 disabled={uploading || !form.originalName.trim() || !form.mimeType.trim()} 
                 className="flex items-center gap-3 px-14 py-4 bg-indigo-600 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] disabled:opacity-50 transition-all font-black shadow-xl"
              >
                 {uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                 {uploading ? 'INGESTING...' : 'COMMIT BINARY'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Storage Integrity</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Binary Asset Repository Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Activity className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Binary nodes are propagated across global CDN clusters in real-time.</span>
         </div>
      </div>
    </div>
  );
}
