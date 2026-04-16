import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  Users, 
  Search, 
  Plus, 
  Trash2, 
  X, 
  MoreVertical, 
  Phone, 
  Mail, 
  Building2, 
  Briefcase, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Loader2,
  CheckCircle2,
  MessageSquare,
  Video,
  FileText,
  UserCircle,
  Clock,
  ExternalLink,
  Target,
  LayoutGrid,
  Filter,
  BarChart3,
  Star,
  Globe,
  Fingerprint,
  Radio,
  Workflow,
  ShieldAlert,
  Inbox,
  Smartphone,
  ChevronDown
} from 'lucide-react';
import { toast } from '../components/Toast';

const SEGMENT_COLORS: Record<string, string> = {
  VIP: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 shadow-[inset_0_0_15px_rgba(245,158,11,0.05)]',
  Regular: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/20 shadow-[inset_0_0_15px_rgba(14,165,233,0.05)]',
  New: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20 shadow-[inset_0_0_15px_rgba(16,185,129,0.05)]',
  Churned: 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20 shadow-[inset_0_0_15px_rgba(225,29,72,0.05)]',
};

const INTERACTION_ICONS: Record<string, any> = {
  MESSAGE: MessageSquare,
  CALL: Phone,
  EMAIL: Mail,
  NOTE: FileText,
  MEETING: Video,
  TICKET: ShieldCheck,
};

export default function CRMContacts() {
  const [contacts, setContacts] = useState<Array<Record<string, unknown>>>([]);
  const [search, setSearch] = useState('');
  const [segment, setSegment] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [selected, setSelected] = useState<Record<string, unknown> | null>(null);
  const [interactions, setInteractions] = useState<Array<Record<string, unknown>>>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);
  const [form, setForm] = useState({ name: '', phone: '', email: '', company: '', position: '', segment: '', source: '', notes: '' });
  const [interForm, setInterForm] = useState({ type: 'NOTE', channel: '', subject: '', content: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getCRMContacts(1, { search, segment });
      setContacts(res.data);
      setTotal(res.pagination.total);
    } catch { 
       toast({ type: 'error', title: 'DIRECTORY_ACCESS_DENIED', message: 'Unable to synchronize with the stakeholder ledger.' });
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [search, segment]);

  const handleCreate = async () => {
    if (!form.name) return;
    try {
      await api.createCRMContact(form);
      setForm({ name: '', phone: '', email: '', company: '', position: '', segment: '', source: '', notes: '' });
      setShowForm(false);
      toast({ type: 'success', title: 'STAKEHOLDER_MANIFESTED', message: 'Identity node established in global directory.' });
      load();
    } catch {
       toast({ type: 'error', title: 'INITIALIZATION_FAILURE', message: 'Failed to establish identity node in directory.' });
    }
  };

  const handleSelect = async (contact: Record<string, unknown>) => {
    setSelected(contact);
    try {
      const res = await api.getCRMInteractions(contact.id as string);
      setInteractions(res.data);
    } catch {
       setInteractions([]);
    }
  };

  const handleAddInteraction = async () => {
    if (!selected || !interForm.content) return;
    try {
      await api.createCRMInteraction(selected.id as string, interForm);
      setInterForm({ type: 'NOTE', channel: '', subject: '', content: '' });
      toast({ type: 'info', title: 'COMMUNICATION_LOGGED', message: 'Engagement record committed to history chain.' });
      handleSelect(selected);
      load();
    } catch {
       toast({ type: 'error', title: 'TRAJECTORY_FAILURE', message: 'Failed to record interaction trajectory.' });
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('CRITICAL: Purge stakeholder node? This action terminates all historical links.')) return;
    try {
      await api.deleteCRMContact(id);
      if (selected && selected.id === id) setSelected(null);
      toast({ type: 'info', title: 'IDENTITY_PURGED', message: 'Node successfully removed from global matrix.' });
      load();
    } catch {
       toast({ type: 'error', title: 'PURGE_FAILURE', message: 'Failed to decouple identity from directory.' });
    }
  };

  if (loading && contacts.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="w-14 h-14 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.5em] animate-pulse italic font-mono">Syncing Global Stakeholder Matrix...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000 pb-12">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Users className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] font-mono italic">Client Relationship Infrastructure</span>
          </div>
          <h1 className="text-6xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[16px] decoration-8">Stakeholder Index</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-base mt-6 max-w-2xl leading-relaxed">Manage global stakeholder entities, monitor loyalty trajectories, and interrogate multi-channel communication histories.</p>
        </div>

        <button 
           onClick={() => setShowForm(!showForm)} 
           className="flex items-center gap-4 px-12 py-5 bg-indigo-600 text-white rounded-[32px] font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/40 hover:scale-[1.05] active:scale-95 transition-all border-2 border-indigo-400/20"
        >
          {showForm ? <X className="w-6 h-6" /> : <Plus className="w-6 h-6" />} {showForm ? 'ABORT_OPERATION' : 'MANIFEST_IDENTITY'}
        </button>
      </div>

      {/* Stats Matrix Cluster */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] shadow-sm transition-all hover:shadow-2xl group overflow-hidden relative backdrop-blur-3xl">
           <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:opacity-10 transition-opacity">
              <Globe className="w-24 h-24 text-indigo-500" />
           </div>
           <div className="absolute right-0 top-0 bottom-0 w-2 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.5)]" />
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-3 flex items-center gap-3 font-mono italic">
              <Globe className="w-4 h-4 text-indigo-500" /> Global Nodes
           </p>
           <p className="text-4xl font-black italic tracking-tighter text-slate-950 dark:text-white drop-shadow-sm">{total}</p>
        </div>
        {['VIP', 'Regular', 'New', 'Churned'].map((s, idx) => (
          <div key={s} className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-8 rounded-[40px] shadow-sm transition-all hover:shadow-2xl group overflow-hidden relative backdrop-blur-3xl">
             <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <Target className="w-24 h-24 text-slate-500" />
             </div>
             <div className={`absolute right-0 top-0 bottom-0 w-2 bg-slate-50 dark:bg-slate-900 group-hover:bg-emerald-500 transition-all duration-700 shadow-[0_0_15px_rgba(16,185,129,0.3)]`} />
             <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-3 flex items-center gap-3 font-mono italic">
                <Target className="w-4 h-4" /> {s}
             </p>
             <p className={`text-4xl font-black italic tracking-tighter drop-shadow-sm ${
                s === 'VIP' ? 'text-amber-500' : 
                s === 'Churned' ? 'text-rose-500' : 
                s === 'New' ? 'text-emerald-500' :
                'text-slate-950 dark:text-white'
             }`}>
                {contacts.filter(c => c.segment === s).length}
             </p>
          </div>
        ))}
      </div>

      {/* Identity Manifestation Form Terminal */}
      {showForm && (
        <div className="bg-white dark:bg-slate-950 border-4 border-slate-100 dark:border-indigo-500/30 rounded-[64px] p-12 space-y-12 animate-in zoom-in-95 duration-700 relative overflow-hidden ring-12 ring-indigo-500/[0.03] shadow-2xl backdrop-blur-3xl">
          <div className="absolute -top-32 -right-32 w-96 h-96 bg-indigo-600/[0.05] blur-[150px] pointer-events-none" />
          
          <div className="flex items-center justify-between relative z-10 px-4">
            <div className="flex items-center gap-5">
               <div className="p-4 bg-amber-500 text-white rounded-2xl shadow-xl shadow-amber-500/30 rotate-3">
                  <Zap className="w-8 h-8" />
               </div>
               <div>
                  <h3 className="text-3xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter leading-none mb-2">Identity Manifestation Matrix</h3>
                  <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic">Establishing unique stakeholder node in global directory v4.0</p>
               </div>
            </div>
            <button onClick={() => setShowForm(false)} className="w-14 h-14 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-600 rounded-2xl transition-all border border-slate-100 dark:border-slate-800 active:scale-90 flex items-center justify-center">
               <X className="w-8 h-8" />
            </button>
          </div>

          <div className="space-y-10 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10">
                {[
                  { placeholder: 'Stakeholder Name *', value: form.name, key: 'name', icon: UserCircle },
                  { placeholder: 'Communication Node (Phone)', value: form.phone, key: 'phone', icon: Smartphone },
                  { placeholder: 'Digital Liaison (Email)', value: form.email, key: 'email', icon: Mail },
                  { placeholder: 'Corporate Entity (Company)', value: form.company, key: 'company', icon: Building2 },
                  { placeholder: 'Functional Role (Position)', value: form.position, key: 'position', icon: Briefcase },
                ].map((f, i) => (
                  <div key={i} className="space-y-4 group/inp">
                    <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-6 font-mono italic group-focus-within/inp:text-indigo-500 transition-colors flex items-center gap-3">
                       <f.icon className="w-3.5 h-3.5" /> ENTRY_{f.key.toUpperCase()}
                    </label>
                    <input 
                       className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] px-8 py-6 text-slate-950 dark:text-white text-base font-black italic shadow-inner outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 uppercase tracking-tight" 
                       placeholder={f.placeholder} 
                       value={f.value} 
                       onChange={e => setForm({ ...form, [f.key]: e.target.value })} 
                    />
                  </div>
                ))}
                
                <div className="space-y-4 group/sel">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-6 font-mono italic group-focus-within/sel:text-indigo-500 transition-colors flex items-center gap-3">
                      <Target className="w-3.5 h-3.5" /> LOYALTY_SEGMENT_BIND
                   </label>
                   <div className="relative">
                      <select 
                        className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] px-8 py-6 text-[11px] font-black uppercase tracking-[0.4em] text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer hover:bg-white dark:hover:bg-slate-950 transition-all font-mono" 
                        value={form.segment} 
                        onChange={e => setForm({ ...form, segment: e.target.value })}
                      >
                        <option value="">SELECT_SEGMENT</option>
                        <option value="VIP">VIP_NODE</option>
                        <option value="Regular">REGULAR_SYNC</option>
                        <option value="New">NEW_ENTRY</option>
                        <option value="Churned">DECOUPLED_CHURN</option>
                      </select>
                      <ChevronDown className="absolute right-8 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
                   </div>
                </div>
             </div>
             
             <div className="space-y-4 group/note">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-8 font-mono italic group-focus-within/note:text-indigo-500 transition-colors flex items-center gap-3">
                   <FileText className="w-3.5 h-3.5" /> QUANTIFY_NODAL_NOTES
                </label>
                <textarea 
                  className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[48px] p-10 text-slate-950 dark:text-white text-lg font-black italic shadow-inner outline-none focus:ring-12 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 leading-relaxed uppercase tracking-tighter min-h-[160px]" 
                  placeholder="Enter strategic context and behavioral patterns..." 
                  value={form.notes} 
                  onChange={e => setForm({ ...form, notes: e.target.value })} 
                />
             </div>
          </div>

          <div className="flex flex-col md:flex-row justify-end gap-6 pt-10 border-t-2 border-slate-100 dark:border-white/5 relative z-10 px-4">
             <button onClick={() => setShowForm(false)} className="px-12 py-6 text-slate-400 dark:text-slate-600 font-black uppercase text-[11px] tracking-[0.4em] hover:text-rose-600 transition-all font-mono italic">ABORT_MANIFESTATION</button>
             <button onClick={handleCreate} className="px-16 py-6 bg-indigo-600 text-white rounded-[32px] font-black uppercase text-[11px] tracking-[0.3em] shadow-2xl shadow-indigo-600/40 hover:scale-[1.05] active:scale-95 transition-all border-2 border-indigo-400/20">MANIFREST_IDENTITY_RECORD</button>
          </div>
        </div>
      )}

      {/* Query & Filter Infrastructure Cluster */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-8 pt-6">
        <div className="lg:col-span-3 relative group/search">
           <Search className="absolute left-8 top-1/2 -translate-y-1/2 w-6 h-6 text-slate-400 group-focus-within/search:text-indigo-500 transition-colors" />
           <input 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              placeholder="QUERY_IDENTITY_DIRECTORY..." 
              className="w-full bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 rounded-[36px] pl-20 pr-10 py-6 text-base font-black text-slate-950 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-12 focus:ring-indigo-500/5 transition-all shadow-sm backdrop-blur-3xl uppercase tracking-tight placeholder:italic"
           />
        </div>
        <div className="relative group/filter-sel">
           <select 
              value={segment} 
              onChange={e => setSegment(e.target.value)} 
              className="w-full bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 rounded-[36px] px-10 py-6 text-[12px] font-black uppercase tracking-[0.4em] text-slate-500 dark:text-slate-400 outline-none focus:border-indigo-500/50 transition-all appearance-none cursor-pointer shadow-sm backdrop-blur-3xl font-mono"
           >
              <option value="">OMNI_SEGMENT_HUB</option>
              {['VIP', 'Regular', 'New', 'Churned'].map(s => <option key={s} value={s}>{s}</option>)}
           </select>
           <Filter className="absolute right-10 top-1/2 -translate-y-1/2 w-5 h-5 text-indigo-500 pointer-events-none" />
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        {/* Contact Intelligence Matrix */}
        <div className="xl:col-span-2 bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl flex flex-col group/matrix">
          <div className="p-12 border-b-2 border-slate-50 dark:border-white/5 flex items-center justify-between bg-slate-50/30 dark:bg-slate-900/40">
             <div className="flex items-center gap-5">
                <div className="p-4 bg-indigo-600 text-white rounded-[20px] shadow-xl shadow-indigo-600/30 group-hover/matrix:rotate-6 transition-transform">
                   <LayoutGrid className="w-8 h-8" />
                </div>
                <div>
                   <h3 className="text-3xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter leading-none mb-2">Identity Matrix</h3>
                   <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono italic">Interrogating {total} active stakeholder nodes</p>
                </div>
             </div>
             <div className="flex items-center gap-4">
                <BarChart3 className="w-8 h-8 text-slate-200 dark:text-slate-800" />
             </div>
          </div>
          
          <div className="divide-y-2 divide-slate-100 dark:divide-white/5 max-h-[850px] overflow-y-auto custom-scrollbar">
             {contacts.length === 0 ? (
               <div className="p-48 text-center grayscale opacity-10">
                  <div className="w-24 h-24 mx-auto mb-10 border-4 border-dashed border-slate-300 dark:border-slate-800 rounded-[40px] flex items-center justify-center animate-pulse">
                     <UserCircle className="w-12 h-12 text-slate-300" />
                  </div>
                  <p className="text-[16px] font-black uppercase tracking-[1em] text-slate-400 italic">No_Identities_Detected</p>
               </div>
             ) : (
               contacts.map(c => (
                 <div key={c.id as string} onClick={() => handleSelect(c)}
                   className={`p-14 group hover:bg-slate-50 dark:hover:bg-indigo-500/5 cursor-pointer transition-all duration-700 relative border-b border-slate-100 dark:border-white/5 ${selected?.id === c.id ? 'bg-indigo-50/80 dark:bg-indigo-500/5 ring-8 ring-indigo-500/5 z-10' : ''}`}>
                   
                   {selected?.id === c.id && <div className="absolute left-0 top-0 bottom-0 w-2.5 bg-indigo-600 shadow-[0_0_20px_rgba(79,70,229,0.8)]" />}
                   
                   <div className="flex items-center justify-between relative z-10">
                     <div className="space-y-6 flex-1">
                       <div className="flex flex-wrap items-center gap-6">
                         <span className="text-3xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-all leading-none">{c.name as string}</span>
                         {!!c.segment && <span className={`px-5 py-2 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border-2 shadow-inner group-hover:scale-110 transition-transform ${SEGMENT_COLORS[c.segment as string]}`}>{c.segment as string}</span>}
                         {!!c.score && (
                            <div className="flex items-center gap-2.5 px-4 py-2 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-2xl shadow-xl group-hover:bg-amber-500/10 transition-colors">
                               <Star className="w-4 h-4 text-amber-500 fill-amber-500" />
                               <span className="text-[12px] font-black text-slate-950 dark:text-white uppercase tracking-widest font-mono">{c.score as number}</span>
                            </div>
                         )}
                       </div>
                       
                       <div className="flex flex-wrap items-center gap-x-12 gap-y-4">
                          {!!c.company && (
                            <div className="flex items-center gap-3 group-hover:translate-x-2 transition-transform">
                               <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg">
                                  <Building2 className="w-5 h-5 text-indigo-500" />
                               </div>
                               <span className="text-[13px] font-black text-slate-900 dark:text-slate-300 uppercase tracking-[0.2em] italic">{c.company as string}</span>
                            </div>
                          )}
                          {!!c.position && (
                            <div className="flex items-center gap-3 group-hover:translate-x-2 transition-transform delay-75">
                               <div className="p-2 bg-slate-100 dark:bg-slate-950 rounded-lg">
                                  <Briefcase className="w-5 h-5 text-sky-500" />
                               </div>
                               <span className="text-[13px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] italic font-mono">{c.position as string}</span>
                            </div>
                          )}
                       </div>

                       <div className="flex flex-wrap items-center gap-x-12 gap-y-4 pt-4 border-t border-slate-100 dark:border-white/5">
                          {!!c.phone && (
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                   <Phone className="w-4 h-4 text-emerald-500" />
                                </div>
                                <span className="text-[11px] font-black text-slate-950 dark:text-slate-400 font-mono tracking-[0.3em] italic">{c.phone as string}</span>
                             </div>
                          )}
                          {!!c.email && (
                             <div className="flex items-center gap-4">
                                <div className="p-2 bg-slate-50 dark:bg-slate-950 rounded-lg border border-slate-100 dark:border-slate-800">
                                   <Mail className="w-4 h-4 text-rose-500" />
                                </div>
                                <span className="text-[11px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-[0.3em] italic underline decoration-indigo-500/20 underline-offset-4">{c.email as string}</span>
                             </div>
                          )}
                          <div className="flex items-center gap-3 ml-auto px-6 py-2 bg-slate-100 dark:bg-slate-950 border-2 border-slate-50 dark:border-white/5 rounded-2xl shadow-inner group-hover:scale-110 transition-transform">
                             <Activity className="w-5 h-5 text-indigo-600" />
                             <span className="text-[11px] font-black text-slate-950 dark:text-white uppercase tracking-[0.4em] italic font-mono">{c.totalInteractions as number || 0} TRAJECTORIES</span>
                          </div>
                       </div>
                     </div>
                     <button onClick={e => { e.stopPropagation(); handleDelete(c.id as string); }} className="w-16 h-16 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-200 dark:text-slate-800 hover:text-rose-600 hover:border-rose-500/30 rounded-[28px] opacity-0 group-hover:opacity-100 transition-all shadow-2xl active:scale-90 flex items-center justify-center ml-10">
                        <Trash2 className="w-8 h-8" />
                     </button>
                   </div>
                 </div>
               ))
             )}
          </div>
        </div>

        {/* Tactical Engagement Subsystem Panel */}
        <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl flex flex-col h-fit sticky top-12 animate-in slide-in-from-right-12 duration-1000 group/tactical pb-10">
          <div className="absolute inset-0 bg-indigo-500/[0.01] pointer-events-none" />
          
          {selected ? (
            <div className="flex flex-col h-full relative z-10">
              <div className="p-12 border-b-2 border-slate-100 dark:border-white/5 space-y-8 bg-slate-50/50 dark:bg-slate-900/40 relative overflow-hidden group/sel-header">
                 <div className="absolute right-[-40px] top-[-40px] opacity-[0.03] group-hover/sel-header:opacity-10 transition-opacity">
                    <UserCircle className="w-48 h-48" />
                 </div>
                 <div className="flex items-start justify-between relative z-10">
                    <div className="p-5 bg-indigo-600 text-white rounded-[24px] shadow-2xl shadow-indigo-500/30 group-hover/tactical:rotate-6 transition-transform">
                       <UserCircle className="w-10 h-10" />
                    </div>
                    <button className="w-12 h-12 bg-white dark:bg-slate-950 rounded-2xl border border-slate-100 dark:border-slate-800 flex items-center justify-center text-slate-400 hover:text-indigo-600 transition-all active:scale-90 shadow-sm"><ExternalLink className="w-5 h-5" /></button>
                 </div>
                 <div className="relative z-10">
                    <h3 className="text-4xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter leading-none mb-4 group-hover/tactical:translate-x-2 transition-transform duration-500">{selected.name as string}</h3>
                    <div className="flex flex-col gap-2">
                       <p className="text-[12px] font-black text-slate-950 dark:text-slate-400 uppercase tracking-[0.4em] font-mono italic">
                          {selected.company as string || 'ROOT_ENTITY'} // {selected.position as string || 'UNCLASS_NODE'}
                       </p>
                    </div>
                    {!!selected.segment && <span className={`inline-block mt-8 px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border-2 shadow-inner group-hover/tactical:scale-110 transition-transform ${SEGMENT_COLORS[selected.segment as string]}`}>{selected.segment as string}</span>}
                 </div>
              </div>

              {/* Add Interaction Engagement Matrix */}
              <div className="p-12 border-b-2 border-slate-100 dark:border-white/5 space-y-8">
                <div className="flex items-center gap-4">
                   <div className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
                   <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.6em] font-mono italic">New_Strategic_Log</p>
                </div>
                <div className="space-y-6">
                   <div className="flex gap-4">
                      <div className="relative flex-1">
                         <select 
                           className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-8 py-5 text-[11px] font-black uppercase tracking-[0.3em] text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none cursor-pointer hover:bg-white dark:hover:bg-slate-950 font-mono italic" 
                           value={interForm.type} 
                           onChange={e => setInterForm({ ...interForm, type: e.target.value })}
                         >
                           <option value="NOTE">FILE_NOTE</option>
                           <option value="MESSAGE">SIGNAL_COMM</option>
                           <option value="CALL">VOICE_PROBE</option>
                           <option value="EMAIL">DIGITAL_MAIL</option>
                           <option value="MEETING">PHYSICAL_LINK</option>
                         </select>
                         <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                      </div>
                      <button onClick={handleAddInteraction} className="px-10 py-5 bg-indigo-600 text-white rounded-[24px] font-black text-[12px] shadow-2xl shadow-indigo-600/30 active:scale-[1.1] transition-all uppercase tracking-[0.3em] border-2 border-indigo-400/20">COMMIT</button>
                   </div>
                   <textarea 
                     className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-sm font-black text-slate-950 dark:text-white shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 italic uppercase tracking-tighter leading-relaxed min-h-[120px]" 
                     rows={3} 
                     placeholder="Quantify interaction content..." 
                     value={interForm.content} 
                     onChange={e => setInterForm({ ...interForm, content: e.target.value })} 
                   />
                </div>
              </div>

              {/* Interaction Ledger Timeline */}
              <div className="p-10 flex-1">
                 <div className="flex items-center justify-between mb-8 px-2">
                    <p className="text-[12px] font-black text-slate-950 dark:text-slate-700 uppercase tracking-[0.6em] font-mono italic">Nodal_History</p>
                    <Workflow className="w-5 h-5 text-indigo-500 animate-spin-slow" />
                 </div>
                 <div className="divide-y-2 divide-slate-50 dark:divide-white/5 max-h-[500px] overflow-y-auto custom-scrollbar pr-4 relative">
                    <div className="absolute left-[31px] top-6 bottom-6 w-1 bg-gradient-to-b from-indigo-500 to-transparent rounded-full opacity-20" />
                    {interactions.length === 0 ? (
                       <div className="p-20 text-center grayscale opacity-10 flex flex-col items-center">
                          <Inbox className="w-16 h-16 mb-6" />
                          <p className="text-[12px] font-black uppercase tracking-[0.6em] italic font-mono">History_Lost_0x0</p>
                       </div>
                    ) : interactions.map(i => {
                      const Icon = INTERACTION_ICONS[i.type as string] || FileText;
                      return (
                        <div key={i.id as string} className="p-8 group/item hover:bg-slate-50 dark:hover:bg-slate-900/60 transition-all relative">
                          <div className="absolute left-[26px] top-10 w-4 h-4 rounded-full bg-white dark:bg-slate-950 border-4 border-indigo-500 group-hover/item:scale-125 transition-transform shadow-xl z-10" />
                          <div className="flex items-center gap-5 mb-4 pl-12">
                            <div className="p-3 bg-white dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-xl group-hover/item:text-indigo-500 group-hover/item:scale-110 transition-all shadow-sm">
                               <Icon className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                               <span className="text-[12px] font-black text-slate-950 dark:text-white uppercase tracking-[0.2em] font-mono italic">{i.type as string}</span>
                               {!!i.channel && <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] italic font-mono">@LINK_{i.channel as string}</span>}
                            </div>
                          </div>
                          <div className="pl-12">
                             <div className="p-5 bg-slate-50 dark:bg-slate-950/80 border-2 border-slate-100 dark:border-white/5 rounded-2xl shadow-inner group-hover/item:border-indigo-500/10 transition-all">
                                <p className="text-[13px] font-black text-slate-950 dark:text-slate-400 italic leading-relaxed uppercase tracking-tight line-clamp-4">"{i.content as string}"</p>
                             </div>
                             <p className="text-[10px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.2em] mt-5 flex items-center gap-3 italic underline decoration-slate-200 dark:decoration-slate-800 decoration-2 underline-offset-8 font-mono">
                                <Clock className="w-3.5 h-3.5" /> PULSE_TS: {new Date(i.createdAt as string).toLocaleString('id-ID', { hour12: false })}
                             </p>
                          </div>
                        </div>
                      );
                    })}
                 </div>
              </div>
            </div>
          ) : (
            <div className="p-32 text-center space-y-10 group/empty relative overflow-hidden">
              <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
              <div className="w-32 h-32 bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[48px] flex items-center justify-center mx-auto shadow-inner relative group-hover/empty:scale-110 group-hover/empty:rotate-6 transition-transform duration-1000">
                 <div className="absolute inset-0 bg-indigo-600/10 blur-xl rounded-full opacity-0 group-hover/empty:opacity-100 transition-opacity" />
                 <Target className="w-12 h-12 text-slate-300 dark:text-slate-700 animate-pulse relative z-10" />
              </div>
              <div className="relative z-10">
                 <h4 className="text-[13px] font-black text-slate-950 dark:text-white uppercase tracking-[0.8em] mb-4 font-mono italic">Tactical Isolation</h4>
                 <p className="text-base font-black text-slate-400 dark:text-slate-600 italic leading-relaxed uppercase tracking-widest max-w-[240px] mx-auto">" Select an identity node to engage strategic analysis matrix. "</p>
              </div>
              <div className="pt-8 relative z-10">
                 <div className="px-10 py-3 bg-indigo-500/10 rounded-[20px] border-2 border-indigo-500/20 inline-flex items-center gap-4 group/ready">
                    <Activity className="w-5 h-5 text-indigo-500 group-hover/ready:scale-125 transition-transform" />
                    <span className="text-[11px] font-black text-indigo-600/60 dark:text-indigo-400/40 uppercase tracking-[0.5em] font-mono italic">SCANNER_READY</span>
                 </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Strategy Intelligence Insight Terminal */}
      <div className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 p-12 rounded-[56px] shadow-sm dark:shadow-2xl transition-all flex flex-col lg:flex-row items-center justify-between gap-10 opacity-90 hover:opacity-100 backdrop-blur-3xl group/footer">
         <div className="flex items-center gap-8">
            <div className="p-6 bg-indigo-600 text-white rounded-[28px] shadow-2xl shadow-indigo-500/30 group-hover/footer:rotate-12 transition-all border-4 border-indigo-400/20">
               <ShieldCheck className="w-10 h-10" />
            </div>
            <div>
               <h4 className="text-[12px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.6em] mb-2 font-mono italic">Strategic_Inference_Engine</h4>
               <p className="text-2xl font-black text-slate-950 dark:text-white italic tracking-tighter uppercase leading-none">Global Stakeholder Node Subsystems Operational</p>
            </div>
         </div>
         <div className="px-10 py-6 bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] flex items-center gap-6 shadow-inner group/hint hover:border-indigo-500/30 transition-all">
            <Info className="w-6 h-6 text-indigo-500 group-hover/hint:scale-125 transition-transform" />
            <span className="text-[11px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.3em] italic leading-relaxed max-w-sm">Identity nodes are used for CRM pipelines, automated communication logs, and neural loyalty forecasting.</span>
         </div>
      </div>
    </div>
  );
}
