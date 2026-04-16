import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type MaintenanceEvidenceFile,
  type MaintenanceHistoryEvent,
  type MaintenanceScheduleItem,
} from '../lib/api';
import {
  ChevronDown,
  Trash2,
  Calendar,
  Zap,
  Activity,
  Target,
  LayoutGrid,
  Settings,
  AlertTriangle,
  Clock,
  CheckCircle,
  Wrench,
  Search,
  Filter,
  PlusCircle,
  ShieldCheck,
  FileImage,
  Edit3,
  X,
  ExternalLink,
  FileText,
  History as HistoryIcon,
  Upload,
  Loader2,
  ChevronRight
} from 'lucide-react';
import { toast } from '../components/Toast';

const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const INTERVAL_OPTIONS = [1, 2, 3, 6, 12];

const HISTORY_ACTION_LABELS: Record<string, string> = {
  created: 'Tiket dibuat',
  updated: 'Tiket diperbarui',
  assigned: 'Tiket ditetapkan',
  escalated: 'Tiket dieskalasi',
  resolved: 'Tiket diselesaikan',
  closed: 'Tiket ditutup',
  maintenance_completed: 'Maintenance selesai (manual)',
};

const EMPTY_CREATE_FORM = {
  title: '',
  description: '',
  customer: '',
  location: '',
  ao: '',
  sid: '',
  service: '',
  intervalMonths: 3,
  anchorMonth: 1,
  anchorDay: 1,
  reminderEveryMonths: 3,
  notifyDaysBefore: 7,
};

function dueMonthsForYear(schedule: MaintenanceScheduleItem, year: number) {
  const months: number[] = [];
  let cursor = schedule.anchorMonth;
  const startYear = new Date(schedule.createdAt).getFullYear();
  while (cursor <= 12) {
    months.push(cursor);
    cursor += schedule.intervalMonths;
  }
  return months.filter((month) => month >= 1 && month <= 12 && year >= startYear);
}

function intervalLabel(intervalMonths: number) {
  const map: Record<number, string> = {
    1: 'Monthly Signal',
    2: 'Bi-Monthly',
    3: 'Quarterly Cycle',
    6: 'Semi-Annual',
    12: 'Annual Pulse',
  };
  return map[intervalMonths] ?? `${intervalMonths} Month Cycle`;
}

function scheduleStatus(schedule: MaintenanceScheduleItem) {
  const now = new Date();
  const dueDate = new Date(schedule.nextDueDate);
  if (dueDate < now) return { label: 'CRITICAL OVERDUE', className: 'bg-rose-500/10 text-rose-500 border-rose-500/20 shadow-[0_0_15px_rgba(244,63,94,0.2)]', icon: AlertTriangle };

  const dueSoonBoundary = new Date(now.getTime() + schedule.notifyDaysBefore * 24 * 60 * 60 * 1000);
  if (dueDate <= dueSoonBoundary) return { label: 'IMMINENT CYCLE', className: 'bg-amber-500/10 text-amber-500 border-amber-500/20 shadow-[0_0_15px_rgba(245,158,11,0.2)]', icon: Clock };

  return { label: 'SYNCHRONIZED', className: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', icon: CheckCircle };
}

function isCompletedThisYear(schedule: MaintenanceScheduleItem, year: number) {
  if (!schedule.lastMaintainedAt) return false;
  return new Date(schedule.lastMaintainedAt).getFullYear() === year;
}

export default function MaintenancePage() {
  const [items, setItems] = useState<MaintenanceScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [apiSearch] = useState('');
  const [selected, setSelected] = useState<MaintenanceScheduleItem | null>(null);
  const [yearView, setYearView] = useState(new Date().getFullYear());
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);
  const [search, setSearch] = useState('');
  const [showInactive] = useState(false);
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSid, setFilterSid] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [editForm, setEditForm] = useState({
    title: '',
    description: '',
    customer: '',
    location: '',
    sid: '',
    service: '',
    intervalMonths: 3,
    anchorDay: 1,
    reminderEveryMonths: 3,
    notifyDaysBefore: 7,
    isActive: true,
  });
  const [completionNote, setCompletionNote] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [latestUploadedEvidence, setLatestUploadedEvidence] = useState<MaintenanceEvidenceFile | null>(null);

  const [history, setHistory] = useState<MaintenanceHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [previewFile, setPreviewFile] = useState<MaintenanceEvidenceFile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getMaintenanceSchedules({
        active: showInactive ? undefined : true,
        search: apiSearch.trim() || undefined,
      });
      setItems(res.data);
      if (selected) {
        const fresh = res.data.find((item) => item.id === selected.id) ?? null;
        setSelected(fresh);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [showInactive, apiSearch]);

  const filterOptions = useMemo(() => ({
    customers: [...new Set(items.map((item) => item.customer).filter(Boolean) as string[])].sort(),
    locations: [...new Set(items.map((item) => item.location).filter(Boolean) as string[])].sort(),
    sids: [...new Set(items.map((item) => item.sid).filter(Boolean) as string[])].sort(),
  }), [items]);

  const filteredItems = useMemo(() => {
    let result = items;
    const q = search.trim().toLowerCase();
    if (q) {
      result = result.filter((item) =>
        [item.title, item.customer, item.location, item.sid]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(q))
      );
    }
    if (filterCustomer) result = result.filter((item) => item.customer === filterCustomer);
    if (filterLocation) result = result.filter((item) => item.location === filterLocation);
    if (filterSid) result = result.filter((item) => item.sid === filterSid);
    return result;
  }, [items, search, filterCustomer, filterLocation, filterSid]);

  const stats = useMemo(() => {
    const now = new Date();
    const dueSoonBoundary = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
    return {
      total: filteredItems.length,
      overdue: filteredItems.filter((item) => new Date(item.nextDueDate) < now).length,
      dueSoon: filteredItems.filter((item) => {
        const dueDate = new Date(item.nextDueDate);
        return dueDate >= now && dueDate <= dueSoonBoundary;
      }).length,
      completedThisYear: filteredItems.filter((item) => isCompletedThisYear(item, yearView)).length,
    };
  }, [filteredItems, yearView]);

  const openDetail = (item: MaintenanceScheduleItem) => {
    setSelected(item);
    setLatestUploadedEvidence(null);
    setEvidenceFile(null);
    setHistory([]);
    setPreviewFile(null);
    setCompletionNote(item.lastCompletionNote ?? '');
    setEditForm({
      title: item.title,
      description: item.description ?? '',
      customer: item.customer ?? '',
      location: item.location ?? '',
      sid: item.sid ?? '',
      service: item.service ?? '',
      intervalMonths: item.intervalMonths,
      anchorDay: item.anchorDay,
      reminderEveryMonths: item.reminderEveryMonths,
      notifyDaysBefore: item.notifyDaysBefore,
      isActive: item.isActive,
    });
    setLoadingHistory(true);
    api.getMaintenanceHistory(item.id)
      .then((res) => setHistory(res.data))
      .catch(() => setHistory([]))
      .finally(() => setLoadingHistory(false));
  };

  const closeDetail = () => {
    setSelected(null);
    setLatestUploadedEvidence(null);
    setEvidenceFile(null);
    setHistory([]);
    setPreviewFile(null);
  };

  const handleCreate = async () => {
    if (!createForm.title.trim()) return;
    setCreating(true);
    try {
      await api.createMaintenanceSchedule(createForm);
      setShowCreate(false);
      setCreateForm(EMPTY_CREATE_FORM);
      toast({ type: 'success', title: 'MATRIX_INIT_SUCCESS', message: 'Maintenance sequence established.' });
      await load();
    } catch (err) { toast({ type: 'error', title: 'INIT_FAILURE', message: 'Failed to establish sequence.' }); }
    finally { setCreating(false); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.updateMaintenanceSchedule(selected.id, editForm);
      setSelected(res.data);
      toast({ type: 'success', title: 'SYNCRONIZATION_SUCCESS', message: 'Schedule parameters updated in core.' });
      await load();
    } finally { setSaving(false); }
  };

  const handleUploadEvidence = async () => {
    if (!selected || !evidenceFile) return null;
    setSaving(true);
    try {
      const formData = new FormData();
      formData.append('file', evidenceFile);
      formData.append('notes', completionNote);
      formData.append('size', String(evidenceFile.size));
      const res = await api.uploadMaintenanceEvidence(selected.id, formData);
      setLatestUploadedEvidence(res.data);
      const refreshed = await api.getMaintenanceSchedule(selected.id);
      setSelected(refreshed.data);
      toast({ type: 'success', title: 'DATA_INGEST_SUCCESS', message: 'Evidence signal captured.' });
      await load();
      return res.data;
    } finally { setSaving(false); }
  };

  const handleComplete = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      let evidenceId = latestUploadedEvidence?.id;
      if (evidenceFile && !evidenceId) {
        const uploaded = await handleUploadEvidence();
        evidenceId = uploaded?.id;
      }
      const res = await api.completeMaintenanceSchedule(selected.id, {
        note: completionNote,
        evidenceFileId: evidenceId,
      });
      setSelected(res.data);
      setEvidenceFile(null);
      toast({ type: 'success', title: 'TASK_RESOLUTION_ACK', message: 'Maintenance cycle confirmed and reset.' });
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Purge sequence "${selected.title}"? This will terminate GSheet sync and historical tracking for this ID.`)) return;
    setSaving(true);
    try {
      await api.deleteMaintenanceSchedule(selected.id);
      closeDetail();
      toast({ type: 'info', title: 'PURGE_EXECUTED', message: 'Maintenance item removed from registry.' });
      await load();
    } catch (err) {
      toast({ type: 'error', title: 'PURGE_FAILURE', message: String(err) });
    } finally { setSaving(false); }
  };

  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] animate-pulse italic">Scanning Temporal Grid...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Wrench className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Temporal Logistics</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-500/30 underline-offset-[12px] decoration-4">Preventive Maintenance</h1>
          <p className="text-slate-500 font-medium text-sm mt-4">Autonomous cycle management, evidence tracking, and multi-tenant scheduling hub.</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="relative group">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-600 transition-colors group-hover:text-indigo-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Query sequence or SID..."
              className="bg-slate-950/50 border border-slate-800 rounded-[20px] pl-12 pr-6 py-4 text-sm text-white placeholder:text-slate-700 outline-none focus:border-indigo-500 group-hover:border-slate-700 transition-all w-64 lg:w-80"
            />
          </div>
          
          <button 
             onClick={() => setShowFilters(!showFilters)}
             className={`p-4 rounded-[20px] transition-all flex items-center gap-2 border ${showFilters || filterCustomer || filterLocation || filterSid ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20' : 'bg-slate-900 border-slate-800 text-slate-600 hover:text-white'}`}
          >
             <Filter className="w-5 h-5" />
             {(filterCustomer || filterLocation || filterSid) && <span className="text-[10px] font-black">X{ [filterCustomer, filterLocation, filterSid].filter(Boolean).length }</span>}
          </button>

          <button 
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-[20px] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-indigo-600/30"
          >
            <PlusCircle className="w-4 h-4" /> Establish Matrix
          </button>
        </div>
      </div>

      {/* Filter Dropdown */}
      {showFilters && (
        <div className="bg-slate-900 border border-indigo-500/20 rounded-[32px] p-8 grid grid-cols-1 md:grid-cols-3 gap-6 animate-in slide-in-from-top-4 duration-300">
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block ml-2">Customer Axis</label>
              <select value={filterCustomer} onChange={e => setFilterCustomer(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500">
                <option value="">Full Customer Spectrum</option>
                {filterOptions.customers.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block ml-2">Location Node</label>
              <select value={filterLocation} onChange={e => setFilterLocation(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500">
                <option value="">Full Geographic Grid</option>
                {filterOptions.locations.map(l => <option key={l} value={l}>{l}</option>)}
              </select>
           </div>
           <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest block ml-2">Identity (SID)</label>
              <select value={filterSid} onChange={e => setFilterSid(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-sm text-white outline-none focus:border-indigo-500">
                <option value="">Full Identification Pool</option>
                {filterOptions.sids.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
           </div>
        </div>
      )}

      {/* Stats Dash */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { label: 'ACTIVE SEQUENCES', value: stats.total, color: 'text-indigo-400', icon: Calendar },
          { label: 'CRITICAL OVERDUE', value: stats.overdue, color: 'text-rose-500', icon: AlertTriangle, status: 'urgent' },
          { label: 'IMMINENT (H-14)', value: stats.dueSoon, color: 'text-amber-500', icon: Clock },
          { label: `SUCCESS CYCLES [${yearView}]`, value: stats.completedThisYear, color: 'text-emerald-500', icon: ShieldCheck },
        ].map((card, i) => (
          <div key={i} className="bg-slate-950/40 border border-slate-800/80 p-8 rounded-[40px] relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-500">
             <div className={`absolute -right-8 -top-8 w-24 h-24 blur-[40px] opacity-10 ${card.color.replace('text-', 'bg-')}`} />
             <div className="flex items-start justify-between relative z-10 mb-6">
                <div className={`p-4 rounded-2xl bg-white/5 border border-white/10 group-hover:scale-110 group-hover:rotate-12 transition-all ${card.status === 'urgent' && 'animate-pulse'}`}>
                   <card.icon className={`w-6 h-6 ${card.color}`} />
                </div>
                <div className="text-right">
                   <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{card.label}</p>
                   <p className={`text-4xl font-black italic tracking-tighter ${card.color}`}>{card.value}</p>
                </div>
             </div>
             <div className="text-[9px] font-black text-slate-700 uppercase tracking-widest flex items-center gap-1">
                <Zap className="w-3 h-3 text-indigo-500" /> Real-time telemetry sync
             </div>
          </div>
        ))}
      </div>

      {/* Yearly Strategy Board */}
      <section className="bg-slate-950/40 border border-slate-800/80 rounded-[48px] overflow-hidden backdrop-blur-3xl shadow-2xl relative">
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 border-b border-slate-800/50 p-10">
          <div className="flex items-center gap-4">
             <LayoutGrid className="w-6 h-6 text-indigo-500" />
             <div>
                <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Temporal Grid Map</h2>
                <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Global maintenance synchronization overview</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-950/50 p-3 rounded-3xl border border-slate-800">
            <button onClick={() => setYearView(y => y-1)} className="p-3 text-slate-600 hover:text-white transition-colors"><ChevronDown className="w-5 h-5 rotate-90" /></button>
            <div className="px-8 py-3 bg-indigo-600 text-white font-black text-sm italic rounded-2xl shadow-xl shadow-indigo-600/30">{yearView}</div>
            <button onClick={() => setYearView(y => y+1)} className="p-3 text-slate-600 hover:text-white transition-colors"><ChevronDown className="w-5 h-5 -rotate-90" /></button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/30 border-b border-slate-800/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] sticky left-0 bg-slate-950 z-20">Sequence Archetype</th>
                <th className="px-6 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">Protocol</th>
                {MONTH_LABELS.map(m => (
                  <th key={m} className="px-4 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] text-center">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredItems.length === 0 ? (
                <tr>
                   <td colSpan={14} className="py-24 text-center grayscale opacity-20">
                      <Calendar className="w-16 h-16 mx-auto mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-[0.4em]">Grid Empty — Establish Sequences Above</p>
                   </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const dueMonths = new Set(dueMonthsForYear(item, yearView));
                  const nextDueMonth = new Date(item.nextDueDate).getFullYear() === yearView
                    ? new Date(item.nextDueDate).getMonth() + 1
                    : null;
                  const status = scheduleStatus(item);
                  return (
                    <tr key={item.id} className="group hover:bg-white/5 transition-colors">
                      <td className="px-10 py-6 sticky left-0 bg-slate-950/90 backdrop-blur group-hover:bg-slate-900 transition-colors z-10 border-r border-slate-900/50">
                        <button onClick={() => openDetail(item)} className="text-left group/btn">
                           <h4 className="text-sm font-black text-white italic group-hover/btn:text-indigo-400 transition-colors truncate w-64">{item.title}</h4>
                           <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 truncate w-64">{item.customer || item.location || 'GLOBAL CLUSTER'}</p>
                        </button>
                      </td>
                      <td className="px-6 py-6 text-center">
                        <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border border-white/5 bg-white/5 ${status.className.includes('rose') ? 'text-rose-500' : 'text-slate-400'}`}>
                           {intervalLabel(item.intervalMonths).split(' ')[0]}
                        </span>
                      </td>
                      {MONTH_LABELS.map((_, idx) => {
                        const m = idx + 1;
                        const isDue = dueMonths.has(m);
                        const isNext = nextDueMonth === m;
                        return (
                          <td key={idx} className="px-2 py-6 text-center">
                            <div className={`mx-auto w-10 h-10 rounded-2xl flex items-center justify-center text-[10px] font-black transition-all duration-500 ${
                               isNext ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/40 ring-4 ring-indigo-600/10 scale-110' :
                               isDue ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' : 'bg-slate-900/50 text-slate-800'
                            }`}>
                               {isDue ? 'PM' : '•'}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Operations Table */}
      <section className="bg-slate-950/40 border border-slate-800/80 rounded-[48px] overflow-hidden shadow-2xl relative">
        <div className="flex items-center gap-4 border-b border-slate-800/50 p-10">
           <Activity className="w-6 h-6 text-emerald-500" />
           <div>
              <h2 className="text-2xl font-black text-white uppercase italic tracking-tight">Deployment & Evidence Nexus</h2>
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mt-1">Operational lifecycle and historical telemetry</p>
           </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-900/40 border-b border-slate-800/50">
                <th className="px-10 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Target Sequence</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Temporal Delta</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Last Ingest</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Active Link</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Object Link</th>
                <th className="px-10 py-6 text-right text-[10px] font-black text-slate-500 uppercase tracking-[0.2em]">Control</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/30">
              {filteredItems.map((item) => {
                const status = scheduleStatus(item);
                return (
                  <tr key={item.id} className="group hover:bg-slate-900/50 transition-colors">
                    <td className="px-10 py-8">
                       <h4 className="text-sm font-black text-white italic group-hover:text-indigo-400 transition-colors">{item.title}</h4>
                       <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 font-mono">{item.sid || 'NO_SID'}</p>
                    </td>
                    <td className="px-8 py-8">
                       <div className="flex flex-col gap-2">
                          <span className="text-[11px] font-bold text-white italic tracking-tighter">{new Date(item.nextDueDate).toLocaleDateString()}</span>
                          <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border whitespace-nowrap inline-flex items-center gap-1.5 ${status.className}`}>
                             <status.icon className="w-3 h-3" />
                             {status.label}
                          </span>
                       </div>
                    </td>
                    <td className="px-8 py-8">
                       <span className="text-xs font-black text-slate-400 italic">{item.lastMaintainedAt ? new Date(item.lastMaintainedAt).toLocaleString() : 'VOID'}</span>
                    </td>
                    <td className="px-8 py-8">
                       {item.openTicket ? (
                         <div className="bg-slate-900 border border-slate-800 px-4 py-3 rounded-2xl group/ticket hover:border-indigo-500/50 transition-all cursor-crosshair">
                            <div className="text-[10px] font-mono font-black text-indigo-400 italic mb-1">{item.openTicket.ticketNumber}</div>
                            <div className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{item.openTicket.status}</div>
                         </div>
                       ) : <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest font-mono">NO_ACTIVE_LINK</span>}
                    </td>
                    <td className="px-8 py-8">
                       {item.evidenceFiles[0] ? (
                         <a href={item.evidenceFiles[0].url || '#'} target="_blank" rel="noreferrer" className="flex items-center gap-2 group/evidence">
                            <div className="p-3 bg-indigo-500/10 rounded-xl border border-indigo-500/20 text-indigo-400 group-hover/evidence:bg-indigo-600 group-hover/evidence:text-white transition-all">
                               <FileImage className="w-4 h-4" />
                            </div>
                            <span className="text-[10px] font-black text-slate-500 group-hover/evidence:text-white transition-colors underline decoration-slate-800 underline-offset-4">VIEW_OBJ_01</span>
                         </a>
                       ) : <span className="text-[10px] font-black text-slate-800 uppercase tracking-widest font-mono">VOID_OBJ</span>}
                    </td>
                    <td className="px-10 py-8 text-right">
                       <button 
                          onClick={() => openDetail(item)}
                          className="px-6 py-3 bg-slate-900 border border-slate-800 text-slate-400 rounded-2xl text-[10px] font-black uppercase tracking-widest hover:border-indigo-500/50 hover:text-indigo-400 transition-all flex items-center justify-center gap-2 ml-auto shadow-xl group-hover:scale-[1.05]"
                       >
                          <Edit3 className="w-3.5 h-3.5" /> INTERROGATE
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Detail Modal Ultimate */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-300" onClick={closeDetail}>
          <div className="w-full max-w-6xl max-h-[90vh] bg-slate-950 border border-indigo-500/30 rounded-[64px] shadow-[0_0_100px_rgba(99,102,241,0.15)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
             {/* Modal Header */}
             <div className="relative p-10 border-b border-indigo-500/10 flex items-start justify-between">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 blur-[80px] pointer-events-none" />
                <div className="relative z-10">
                   <div className="flex items-center gap-4 mb-2">
                      <Target className="w-6 h-6 text-indigo-500" />
                      <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.5em]">Identity Profile</span>
                   </div>
                   <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter">{selected.title}</h2>
                   <p className="text-slate-500 font-bold text-sm mt-2 opacity-80">{selected.customer || 'Core'} // {selected.location || 'Distributed'}</p>
                </div>
                <button onClick={closeDetail} className="p-4 bg-slate-900 hover:bg-rose-950/20 text-slate-500 hover:text-rose-500 rounded-[28px] transition-all border border-slate-800 active:scale-90">
                   <X className="w-8 h-8" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-10">
                <div className="grid grid-cols-1 xl:grid-cols-[1.5fr_1fr] gap-12">
                   {/* Left Col: Config & Control */}
                   <div className="space-y-12">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                         {[
                           { label: 'Next Event', value: new Date(selected.nextDueDate).toLocaleDateString(), icon: Clock, sub: 'Temporal Lock' },
                           { label: 'Sequence', value: intervalLabel(selected.intervalMonths), icon: Activity, sub: 'Cycle Purity' },
                           { label: 'Notify H-', value: `${selected.notifyDaysBefore} Days`, icon: Zap, sub: 'Warning Delta' },
                           { label: 'Ref ID', value: selected.sid || 'N/A', icon: Target, sub: 'Matrix UID' }
                         ].map((tag, i) => (
                           <div key={i} className="bg-slate-900/50 border border-slate-800/50 p-6 rounded-[32px] text-center hover:bg-slate-900 transition-colors">
                              <tag.icon className="w-4 h-4 text-indigo-500 mx-auto mb-3" />
                              <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mb-1">{tag.label}</p>
                              <p className="text-xs font-black text-white italic truncate">{tag.value}</p>
                              <p className="text-[8px] font-bold text-slate-700 uppercase mt-1">{tag.sub}</p>
                           </div>
                         ))}
                      </div>

                      <div className="bg-slate-900/30 border border-slate-800 p-8 rounded-[48px] space-y-8">
                         <div className="flex items-center gap-3">
                            <Settings className="w-5 h-5 text-indigo-500" />
                            <h3 className="text-lg font-black text-white uppercase italic tracking-widest underline decoration-indigo-500/30 decoration-2 underline-offset-8">Neural Parameters</h3>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {[
                              { label: 'Identity Handle', value: editForm.title, field: 'title' },
                              { label: 'Service Archetype', value: editForm.service, field: 'service' },
                              { label: 'Customer Alias', value: editForm.customer, field: 'customer' },
                              { label: 'Location Node', value: editForm.location, field: 'location' }
                            ].map((input, i) => (
                              <div key={i} className="space-y-2">
                                 <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-2">{input.label}</label>
                                 <input 
                                    value={input.value} 
                                    onChange={e => setEditForm(prev => ({...prev, [input.field]: e.target.value}))}
                                    className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-sm text-white focus:border-indigo-500 transition-all font-bold" 
                                 />
                              </div>
                            ))}
                         </div>
                         <div className="flex flex-col sm:flex-row gap-4 pt-4">
                            <button onClick={handleDelete} disabled={saving} className="flex-1 px-8 py-5 bg-rose-600/10 border border-rose-500/20 text-rose-500 rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-3">
                               <Trash2 className="w-4 h-4" /> Purge Sequence
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-[1.5] px-12 py-5 bg-indigo-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-3">
                               {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />} Commit Parameters
                            </button>
                         </div>
                      </div>

                      <div className="bg-slate-900 border border-emerald-500/20 p-10 rounded-[56px] relative overflow-hidden ring-1 ring-emerald-500/30">
                         <div className="absolute -left-24 -bottom-24 w-64 h-64 bg-emerald-600/10 blur-[100px] pointer-events-none" />
                         <div className="flex items-center gap-3 mb-8">
                            <CheckCircle className="w-6 h-6 text-emerald-500" />
                            <h3 className="text-xl font-black text-white uppercase italic tracking-tight underline decoration-emerald-500/30 decoration-2 underline-offset-8">Task Resolution Entry</h3>
                         </div>
                         <div className="space-y-6">
                            <textarea 
                               placeholder="Enter resolution telemetry data, maintenance notes, and diagnostic results..."
                               value={completionNote}
                               onChange={e => setCompletionNote(e.target.value)}
                               className="w-full bg-slate-950/80 border border-slate-800 rounded-[32px] p-8 min-h-[160px] text-white text-sm font-bold placeholder:text-slate-700 outline-none focus:border-emerald-500 transition-all"
                            />
                            <div className="flex flex-col md:flex-row items-center gap-6">
                               <label className="flex-1 w-full p-2 bg-slate-950 border border-slate-800 rounded-2xl cursor-pointer hover:border-emerald-500/40 transition-all flex items-center gap-4 group">
                                  <div className="p-3 bg-slate-900 rounded-xl group-hover:bg-emerald-500/10 transition-all">
                                     <Upload className="w-4 h-4 text-emerald-500" />
                                  </div>
                                  <span className="text-xs font-black text-slate-500 uppercase tracking-widest truncate">{evidenceFile ? evidenceFile.name : 'Ingest Evidence File'}</span>
                                  <input type="file" onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)} className="hidden" />
                               </label>
                               <button 
                                  onClick={handleComplete}
                                  disabled={saving}
                                  className="w-full md:w-auto px-12 py-5 bg-gradient-to-r from-emerald-600 to-emerald-500 text-white rounded-[24px] text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-emerald-600/30 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-3"
                               >
                                  {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight className="w-5 h-5" />} Sequence End & Cycle Reset
                               </button>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Right Col: Timeline & Visuals */}
                   <div className="space-y-8">
                      {/* Evidence Gallery */}
                      <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[48px]">
                         <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 italic flex items-center gap-3">
                            <FileImage className="w-4 h-4 text-indigo-400" /> Visual Telemetry Log
                         </h3>
                         <div className="space-y-4">
                            {selected.evidenceFiles.length === 0 ? (
                               <div className="py-20 text-center grayscale opacity-10">
                                  <FileImage className="w-12 h-12 mx-auto mb-4" />
                                  <span className="text-[9px] font-black uppercase tracking-widest">No Captured Media</span>
                               </div>
                            ) : (
                               selected.evidenceFiles.map(file => (
                                 <div key={file.id} className="bg-slate-950 border border-slate-800 p-5 rounded-[32px] group/item hover:border-indigo-500/30 transition-all">
                                    <div className="flex items-start justify-between mb-4">
                                       <div className="flex items-center gap-3">
                                          <div className="p-2 bg-slate-900 rounded-xl">
                                             {file.mimeType?.startsWith('image/') ? <FileImage className="w-4 h-4 text-sky-400" /> : <FileText className="w-4 h-4 text-rose-400" />}
                                          </div>
                                          <div>
                                             <h5 className="text-[11px] font-black text-white truncate w-40 italic">{file.originalName}</h5>
                                             <p className="text-[8px] font-bold text-slate-600 uppercase tracking-widest">{new Date(file.createdAt).toLocaleDateString()}</p>
                                          </div>
                                       </div>
                                       <a href={file.url || '#'} target="_blank" rel="noreferrer" className="p-2 text-slate-700 hover:text-white transition-colors"><ExternalLink className="w-4 h-4" /></a>
                                    </div>
                                    <button 
                                      onClick={() => setPreviewFile(previewFile?.id === file.id ? null : file)}
                                      className="w-full h-10 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-slate-500 uppercase tracking-widest hover:text-indigo-400 hover:border-indigo-500/30 transition-all"
                                    >
                                       {previewFile?.id === file.id ? 'Hide Visual' : 'Manifest Visual'}
                                    </button>
                                    {previewFile?.id === file.id && (
                                       <div className="mt-4 rounded-2xl overflow-hidden border border-slate-800 animate-in slide-in-from-top-4">
                                          <img src={file.url ?? undefined} alt="telemetry" className="w-full max-h-64 object-cover" />
                                       </div>
                                    )}
                                 </div>
                               ))
                            )}
                         </div>
                      </div>

                      {/* History Timeline */}
                      <div className="bg-slate-900/40 border border-slate-800 p-8 rounded-[48px]">
                         <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 italic flex items-center gap-3">
                            <HistoryIcon className="w-4 h-4 text-indigo-400" /> Temporal Signal Log
                         </h3>
                         {loadingHistory ? (
                            <div className="py-10 text-center flex items-center justify-center gap-3">
                               <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
                               <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Querying chain...</span>
                            </div>
                         ) : (
                            <div className="relative pl-8 space-y-8 before:absolute before:left-[11px] before:top-2 before:bottom-2 before:w-[2px] before:bg-slate-800">
                               {history.slice(0, 10).map(event => (
                                 <div key={event.id} className="relative group/ev">
                                    <div className="absolute -left-[27px] top-1 w-2 h-2 rounded-full bg-slate-800 ring-4 ring-slate-950 group-hover/ev:bg-indigo-500 group-hover/ev:ring-indigo-500/10 transition-all" />
                                    <div className="flex justify-between items-start mb-2">
                                       <span className="text-[9px] font-black text-indigo-500 uppercase tracking-widest italic">{event.ticketNumber || 'SYS_EVENT'}</span>
                                       <span className="text-[8px] font-bold text-slate-700">{new Date(event.createdAt).toLocaleTimeString()}</span>
                                    </div>
                                    <h6 className="text-xs font-black text-white uppercase tracking-tight mb-1">{HISTORY_ACTION_LABELS[event.action] || event.action}</h6>
                                    {event.note && <p className="text-[10px] text-slate-500 leading-relaxed font-bold italic line-clamp-2">"{event.note}"</p>}
                                 </div>
                               ))}
                            </div>
                         )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Create Modal Ultimate */}
      {showCreate && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 animate-in fade-in duration-300" onClick={() => setShowCreate(false)}>
           <div className="w-full max-w-4xl bg-slate-950 border border-indigo-500/20 rounded-[64px] shadow-2xl overflow-hidden animate-in zoom-in-95 duration-500" onClick={e => e.stopPropagation()}>
              <div className="p-10 border-b border-indigo-500/10 flex items-center justify-between">
                 <div>
                   <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter">Establish Sequence</h2>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.4em] mt-1">Autonomous maintenance matrix initialization</p>
                 </div>
                 <button onClick={() => setShowCreate(false)} className="p-4 bg-slate-900 text-slate-500 rounded-3xl hover:text-white transition-all"><X className="w-6 h-6" /></button>
              </div>
              
              <div className="p-12 space-y-10">
                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="md:col-span-2 space-y-2">
                       <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-4">Descriptor (Primary Handle)</label>
                       <input 
                         className="w-full bg-slate-900 border border-slate-800 rounded-3xl px-8 py-5 text-lg font-black text-white italic outline-none focus:border-indigo-500 transition-all" 
                         value={createForm.title}
                         onChange={e => setCreateForm(f => ({...f, title: e.target.value}))}
                         placeholder="e.g. CORE_NEXUS_ALPHA_01"
                       />
                    </div>
                    <div className="space-y-4">
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Customer Domain</label>
                          <input className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500" value={createForm.customer} onChange={e => setCreateForm(f => ({...f, customer: e.target.value}))} />
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Spatial Node (Location)</label>
                          <input className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500" value={createForm.location} onChange={e => setCreateForm(f => ({...f, location: e.target.value}))} />
                       </div>
                    </div>
                    <div className="space-y-4">
                       <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Cycle Interval</label>
                             <select className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500 cursor-pointer" value={createForm.intervalMonths} onChange={e => setCreateForm(f => ({...f, intervalMonths: Number(e.target.value)}))}>
                               {INTERVAL_OPTIONS.map(opt => <option key={opt} value={opt}>{intervalLabel(opt)}</option>)}
                             </select>
                          </div>
                          <div className="space-y-2">
                             <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Anchor Month</label>
                             <select className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500 cursor-pointer" value={createForm.anchorMonth} onChange={e => setCreateForm(f => ({...f, anchorMonth: Number(e.target.value)}))}>
                               {MONTH_LABELS.map((l, i) => <option key={i+1} value={i+1}>{l}</option>)}
                             </select>
                          </div>
                       </div>
                       <div className="space-y-2">
                          <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-4">Identify (SID / GUID)</label>
                          <input className="w-full bg-slate-900/50 border border-slate-800 rounded-2xl px-6 py-4 text-sm font-bold text-white outline-none focus:border-indigo-500" value={createForm.sid} onChange={e => setCreateForm(f => ({...f, sid: e.target.value}))} />
                       </div>
                    </div>
                 </div>

                 <div className="flex justify-end gap-6 pt-10 border-t border-slate-800/50">
                    <button onClick={() => setShowCreate(false)} className="px-10 py-5 bg-slate-900 border border-slate-800 text-slate-500 rounded-[28px] text-[10px] font-black uppercase tracking-widest hover:text-white transition-all">Abort Init</button>
                    <button 
                       onClick={handleCreate} 
                       disabled={creating || !createForm.title.trim()}
                       className="px-16 py-5 bg-indigo-600 text-white rounded-[28px] text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/30 hover:scale-[1.05] active:scale-95 transition-all flex items-center gap-3"
                    >
                       {creating ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />} Establish Sequence
                    </button>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
