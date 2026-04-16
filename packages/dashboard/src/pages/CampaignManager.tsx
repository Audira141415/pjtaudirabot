import { useState, useEffect } from 'react';
import { 
  Trash2, 
  Megaphone, 
  Plus, 
  Search, 
  Filter, 
  Calendar, 
  Globe, 
  Users, 
  CheckCircle2, 
  AlertCircle, 
  Zap, 
  Clock, 
  Activity,
  BarChart3,
  Mail,
  Send,
  X
} from 'lucide-react';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  DRAFT: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-700',
  SCHEDULED: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20',
  RUNNING: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-100 dark:border-amber-500/20',
  COMPLETED: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20',
  CANCELLED: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
};

export default function CampaignManager() {
  const [campaigns, setCampaigns] = useState<Array<Record<string, unknown>>>([]);
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ name: '', description: '', content: '', targetPlatform: '', targetSegment: '', scheduledAt: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCampaigns(1, statusFilter || undefined);
      setCampaigns(res.data);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.name || !form.content) return;
    await api.createCampaign({
      name: form.name,
      description: form.description || null,
      content: form.content,
      targetPlatform: form.targetPlatform || null,
      targetSegment: form.targetSegment || null,
      scheduledAt: form.scheduledAt || null,
    });
    setForm({ name: '', description: '', content: '', targetPlatform: '', targetSegment: '', scheduledAt: '' });
    setShowForm(false);
    load();
  };

  const handleAction = async (id: string, status: string) => {
    await api.updateCampaign(id, { status });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Hapus campaign ini?')) return;
    await api.deleteCampaign(id);
    load();
  };

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Megaphone className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Engagement Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Campaign Architect</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Design, target, and monitor multi-channel communication strategies.</p>
        </div>

        <button 
           onClick={() => setShowForm(!showForm)} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? 'Abort Creation' : 'Initialize Campaign'}
        </button>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        {['DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED'].map(s => (
          <div key={s} className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-6 rounded-[32px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group">
            <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 group-hover:text-indigo-500 transition-colors">{s}</p>
            <p className="text-3xl font-black text-slate-900 dark:text-white italic tracking-tighter">{campaigns.filter(c => c.status === s).length}</p>
          </div>
        ))}
      </div>

      {/* Construction Chamber (Form) */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="relative z-10">
             <div className="flex items-center gap-3 mb-8">
                <Zap className="w-5 h-5 text-amber-500" />
                <h2 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Campaign Manifest</h2>
             </div>

             <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Internal Designation *</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:border-indigo-500 font-bold shadow-inner" placeholder="e.g. Q4_PROMO_BOOST" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
                   </div>
                   <div className="space-y-2">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Strategic Description</label>
                      <input className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm outline-none focus:border-indigo-500 font-bold shadow-inner" placeholder="High-level campaign objective..." value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
                   </div>
                </div>

                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Communiqué Content *</label>
                   <textarea className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold min-h-[160px] outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 shadow-inner" placeholder="Enter message payload..." value={form.content} onChange={e => setForm({ ...form, content: e.target.value })} />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Channel Hub</label>
                     <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 shadow-inner appearance-none cursor-pointer" value={form.targetPlatform} onChange={e => setForm({ ...form, targetPlatform: e.target.value })}>
                        <option value="">Full Cluster (All)</option>
                        <option value="WHATSAPP">WhatsApp Hub</option>
                        <option value="TELEGRAM">Telegram Bot</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Audience Segment</label>
                     <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-[10px] font-black uppercase tracking-widest outline-none focus:border-indigo-500 shadow-inner appearance-none cursor-pointer" value={form.targetSegment} onChange={e => setForm({ ...form, targetSegment: e.target.value })}>
                        <option value="">All Subscribers</option>
                        <option value="VIP">VIP Entities</option>
                        <option value="Regular">Regular Nodes</option>
                        <option value="New">Fresh Ingests</option>
                     </select>
                  </div>
                  <div className="space-y-2">
                     <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Temporal Trigger</label>
                     <input type="datetime-local" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-xs font-bold outline-none focus:border-indigo-500 shadow-inner" value={form.scheduledAt} onChange={e => setForm({ ...form, scheduledAt: e.target.value })} />
                  </div>
                </div>
             </div>

             <div className="flex justify-end gap-4 pt-8 border-t border-slate-100 dark:border-slate-800/50">
                <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Cancel Operation</button>
                <button onClick={handleCreate} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">Manifest Campaign</button>
             </div>
          </div>
        </div>
      )}

      {/* Filtering Hub */}
      <div className="flex flex-wrap gap-3">
        {['', 'DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'CANCELLED'].map(s => (
          <button 
             key={s} 
             onClick={() => setStatusFilter(s)}
             className={`px-6 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border shadow-sm ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-500 shadow-indigo-500/20' : 'bg-white dark:bg-slate-950/50 text-slate-400 dark:text-slate-500 border-slate-200 dark:border-slate-800 hover:border-indigo-500/40'}`}
          >
            {s || 'Omni-Status'}
          </button>
        ))}
      </div>

      {/* Campaign Ledger */}
      <div className="grid grid-cols-1 gap-6">
        {loading ? (
          Array(3).fill(0).map((_, i) => <div key={i} className="h-48 bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 rounded-[48px] animate-pulse" />)
        ) : campaigns.length === 0 ? (
          <div className="py-24 text-center bg-slate-50 dark:bg-slate-950/20 rounded-[48px] border border-dashed border-slate-200 dark:border-slate-800 opacity-50">
             <Megaphone className="w-16 h-16 text-slate-300 dark:text-slate-800 mx-auto mb-4" />
             <h3 className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em]">Zero Strategic Campaigns Found</h3>
          </div>
        ) : campaigns.map(c => (
          <div key={c.id as string} className="group relative bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl">
            <div className={`absolute left-0 top-0 bottom-0 w-1.5 transition-all ${c.status === 'RUNNING' ? 'bg-amber-500 shadow-[2px_0_15px_rgba(245,158,11,0.5)]' : 'bg-transparent group-hover:bg-indigo-600'}`} />
            
            <div className="flex flex-col xl:flex-row xl:items-start justify-between gap-8 relative z-10">
              <div className="flex-1 space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                   <h3 className="text-2xl font-black text-slate-900 dark:text-white italic tracking-tight">{c.name as string}</h3>
                   <span className={`px-4 py-1 rounded-xl text-[9px] font-black uppercase tracking-widest border ${STATUS_COLORS[c.status as string]}`}>{c.status as string}</span>
                   {!!c.targetPlatform && <span className="px-3 py-1 rounded-lg text-[9px] font-black text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-500/10 border border-indigo-100 dark:border-indigo-500/20 uppercase tracking-widest">{c.targetPlatform as string}</span>}
                   {!!c.targetSegment && <span className="px-3 py-1 rounded-lg text-[9px] font-black text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 uppercase tracking-widest">{c.targetSegment as string}</span>}
                </div>
                
                {!!c.description && <p className="text-xs text-slate-400 dark:text-slate-500 font-bold uppercase tracking-widest italic">{c.description as string}</p>}
                
                <div className="bg-slate-50 dark:bg-slate-900/60 p-6 rounded-[24px] border border-slate-100 dark:border-slate-800/50 shadow-inner group-hover:bg-white dark:group-hover:bg-slate-950/40 transition-all">
                   <p className="text-sm font-bold text-slate-600 dark:text-slate-300 leading-relaxed italic line-clamp-3">"{c.content as string}"</p>
                </div>

                <div className="flex flex-wrap items-center gap-6 pt-2">
                   <div className="flex items-center gap-2 text-[9px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">
                      <Clock className="w-3 h-3" /> Created {new Date(c.createdAt as string).toLocaleDateString()}
                   </div>
                   {!!c.scheduledAt && (
                      <div className="flex items-center gap-2 text-[9px] font-black text-amber-600 uppercase tracking-widest animate-pulse">
                         <Calendar className="w-3 h-3" /> Scheduled: {new Date(c.scheduledAt as string).toLocaleString()}
                      </div>
                   )}
                </div>
              </div>

              <div className="w-full xl:w-[480px] space-y-6">
                 {/* Real-time Telemetry */}
                 <div className="bg-slate-50 dark:bg-slate-950/50 p-6 rounded-[32px] border border-slate-100 dark:border-slate-800/50 shadow-inner">
                    <div className="flex items-center gap-2 mb-6">
                       <BarChart3 className="w-4 h-4 text-indigo-500" />
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest">Performance Metrics</span>
                    </div>
                    
                    <div className="grid grid-cols-5 gap-4">
                      {[
                        { label: 'Total', value: c.totalRecipients, icon: Users, color: 'text-slate-400' },
                        { label: 'Sent', value: c.sentCount, icon: Send, color: 'text-sky-500' },
                        { label: 'Delivered', value: c.deliveredCount, icon: CheckCircle2, color: 'text-emerald-500' },
                        { label: 'Read', value: c.readCount, icon: Mail, color: 'text-indigo-500' },
                        { label: 'Failed', value: c.failedCount, icon: AlertCircle, color: 'text-rose-500' },
                      ].map(m => (
                        <div key={m.label} className="text-center group/metric transition-all hover:scale-110">
                          <p className={`text-xl font-black italic tracking-tighter ${m.color}`}>{(m.value as number) || 0}</p>
                          <p className="text-[7px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest mt-1">{m.label}</p>
                        </div>
                      ))}
                    </div>
                 </div>

                 {/* Command Center */}
                 <div className="flex items-center justify-end gap-3">
                    {c.status === 'DRAFT' && <button onClick={() => handleAction(c.id as string, 'SCHEDULED')} className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] bg-sky-600/10 text-sky-600 dark:text-sky-400 border border-sky-600/20 rounded-xl hover:bg-sky-600 hover:text-white transition-all">Engage Scheduler</button>}
                    {c.status === 'SCHEDULED' && <button onClick={() => handleAction(c.id as string, 'RUNNING')} className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] bg-amber-600/10 text-amber-600 dark:text-amber-400 border border-amber-600/20 rounded-xl hover:bg-amber-600 hover:text-white transition-all animate-pulse">Force Dispatch</button>}
                    {c.status === 'RUNNING' && <button onClick={() => handleAction(c.id as string, 'COMPLETED')} className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 border border-emerald-600/20 rounded-xl hover:bg-emerald-600 hover:text-white transition-all">Finalize Logic</button>}
                    {(c.status === 'DRAFT' || c.status === 'SCHEDULED') && (
                      <button onClick={() => handleAction(c.id as string, 'CANCELLED')} className="px-6 py-2.5 text-[9px] font-black uppercase tracking-[0.2em] bg-rose-600/10 text-rose-600 dark:text-rose-400 border border-rose-600/20 rounded-xl hover:bg-rose-600 hover:text-white transition-all">Abort Signal</button>
                    )}
                    <button onClick={() => handleDelete(c.id as string)} className="p-3 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 hover:text-rose-500 hover:border-rose-500/30 rounded-xl transition-all shadow-xl active:scale-95">
                       <Trash2 size={16} />
                    </button>
                 </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
