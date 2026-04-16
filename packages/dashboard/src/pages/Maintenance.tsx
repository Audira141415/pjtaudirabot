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
  ChevronRight,
  Database,
  Cpu,
  Layers,
  Monitor,
  Globe,
  Plus,
  Fingerprint,
  Radio,
  Unplug,
  ShieldX,
  CheckCircle2,
  AlertOctagon,
  Scan,
  HardDrive,
  CpuIcon,
  Inbox,
  Workflow,
  Info
} from 'lucide-react';
import { toast } from '../components/Toast';

const MONTH_LABELS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];
const INTERVAL_OPTIONS = [1, 2, 3, 6, 12];

const HISTORY_ACTION_LABELS: Record<string, string> = {
  created: 'SEQUENCE_INITIATED',
  updated: 'PARAMETERS_SYNCHRONIZED',
  assigned: 'PILOT_ASSIGNED',
  escalated: 'PRIORITY_ESCALATED',
  resolved: 'TASK_RESOLVED',
  closed: 'LIFECYCLE_TERMINATED',
  maintenance_completed: 'MAINTENANCE_VERIFIED',
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
    1: 'MONTHLY_SIGNAL',
    2: 'BI_MONTHLY_CYCLE',
    3: 'QUARTERLY_MATRIX',
    6: 'SEMI_ANNUAL_PROBE',
    12: 'ANNUAL_HYPER_PULSE',
  };
  return map[intervalMonths] ?? `${intervalMonths}_MONTH_SEQUENCE`;
}

function scheduleStatus(schedule: MaintenanceScheduleItem) {
  const now = new Date();
  const dueDate = new Date(schedule.nextDueDate);
  if (dueDate < now) return { label: 'CRITICAL_OVERDUE', className: 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border-rose-500/20 shadow-inner', icon: AlertOctagon };

  const dueSoonBoundary = new Date(now.getTime() + schedule.notifyDaysBefore * 24 * 60 * 60 * 1000);
  if (dueDate <= dueSoonBoundary) return { label: 'IMMINENT_CYCLE', className: 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-500/20 shadow-inner', icon: Clock };

  return { label: 'SYNCHRONIZED', className: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-500/20 shadow-inner', icon: CheckCircle2 };
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
    } catch (err) { 
       toast({ type: 'error', title: 'MATRIX_GATHER_FAILURE', message: 'Failed to access global maintenance matrices.' });
    }
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
      toast({ type: 'success', title: 'SEQUENCE_ESTABLISHED', message: 'Preventive maintenance bridge has been synchronized.' });
      await load();
    } catch (err) { toast({ type: 'error', title: 'INITIALIZATION_FAILURE', message: 'Failed to establish machine sequence.' }); }
    finally { setCreating(false); }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.updateMaintenanceSchedule(selected.id, editForm);
      setSelected(res.data);
      toast({ type: 'success', title: 'PARAMETERS_RECALIBRATED', message: 'Schedule matrix has been updated across core nodes.' });
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
      toast({ type: 'success', title: 'EVIDENCE_INGEST_COMPLETE', message: 'Visual signal record has been archived.' });
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
      toast({ type: 'success', title: 'TASK_RESOLUTION_ACK', message: 'Maintenance cycle confirmed and resetting temporal triggers.' });
      await load();
    } finally { setSaving(false); }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`CRITICAL: Purge sequence "${selected.title}"? This will terminate all temporal tracking for this node.`)) return;
    setSaving(true);
    try {
      await api.deleteMaintenanceSchedule(selected.id);
      closeDetail();
      toast({ type: 'info', title: 'SEQUENCE_DECOMMISSIONED', message: 'Target has been removed from the preventive registry.' });
      await load();
    } catch (err) {
      toast({ type: 'error', title: 'PURGE_FAILURE', message: 'Failed to decouple sequence from core logic.' });
    } finally { setSaving(false); }
  };

  if (loading && items.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-6">
      <div className="w-14 h-14 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.5em] animate-pulse italic font-mono">Scanning Temporal Grid Matrices...</span>
    </div>
  );

  return (
    <div className="space-y-12 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <Wrench className="w-6 h-6 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[11px] font-black uppercase tracking-[0.4em] font-mono italic">Infrastructural Lifecycle Subsystem</span>
          </div>
          <h1 className="text-6xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[16px] decoration-8">Preventive Monitor</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-base mt-6 max-w-2xl leading-relaxed">Autonomous sequence orchestration, physical evidence interrogation, and multi-tenant temporal scheduling matrices.</p>
        </div>

        <div className="flex flex-wrap items-center gap-4">
           <div className="relative group/search min-w-[340px]">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 transition-colors group-focus-within/search:text-indigo-500" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="PROBE_LOGISTICS_ID..."
                className="w-full bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[32px] pl-16 pr-8 py-5 text-sm font-black text-slate-900 dark:text-white outline-none focus:border-indigo-500/50 focus:ring-8 focus:ring-indigo-500/5 transition-all shadow-sm backdrop-blur-3xl"
              />
           </div>
           
           <button 
              onClick={() => setShowFilters(!showFilters)}
              className={`p-5 rounded-[24px] transition-all flex items-center justify-center border-2 border-slate-100 dark:border-slate-800/80 hover:scale-105 active:scale-95 shadow-sm ${
                showFilters || filterCustomer || filterLocation || filterSid 
                  ? 'bg-indigo-600 text-white border-indigo-400 shadow-2xl shadow-indigo-600/30' 
                  : 'bg-white dark:bg-slate-950 text-slate-400 hover:text-indigo-600'
              }`}
           >
              <Filter className="w-6 h-6" />
           </button>

           <button 
             onClick={() => setShowCreate(true)}
             className="flex items-center gap-4 px-12 py-5 bg-indigo-600 text-white font-black text-[11px] uppercase tracking-[0.2em] rounded-[32px] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-indigo-600/40 border-2 border-indigo-400/20"
           >
             <PlusCircle className="w-6 h-6" /> ESTABLISH_CYCLE
           </button>
        </div>
      </div>

      {/* Filter Matrix Intelligence */}
      {showFilters && (
        <div className="bg-white dark:bg-slate-950/40 border-4 border-dashed border-indigo-500/20 rounded-[64px] p-12 grid grid-cols-1 md:grid-cols-3 gap-10 animate-in slide-in-from-top-12 duration-700 backdrop-blur-3xl relative z-30 shadow-inner">
           {[
             { label: 'STAKEHOLDER_DOMAIN', value: filterCustomer, setter: setFilterCustomer, options: filterOptions.customers, placeholder: 'OMNI_TENANT_VIEW' },
             { label: 'SPATIAL_COORDINATE', value: filterLocation, setter: setFilterLocation, options: filterOptions.locations, placeholder: 'OMNI_LOCATION_GRID' },
             { label: 'NODAL_ID_BIND', value: filterSid, setter: setFilterSid, options: filterOptions.sids, placeholder: 'OMNI_IDENTITY_POOL' }
           ].map((f, i) => (
             <div key={i} className="space-y-4 group/field">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-4 font-mono italic group-focus-within/field:text-indigo-500 transition-colors">{f.label}</label>
                <div className="relative">
                   <select 
                     value={f.value} 
                     onChange={e => f.setter(e.target.value)} 
                     className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-3xl px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none shadow-sm cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-950"
                   >
                     <option value="">{f.placeholder}</option>
                     {f.options.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                   </select>
                   <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                </div>
             </div>
           ))}
        </div>
      )}

      {/* Summary Matrix Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {[
          { label: 'ACTIVE_SEQUENCES', value: stats.total, color: 'text-indigo-600 dark:text-indigo-400', icon: Calendar, bg: 'bg-indigo-500/10', border: 'border-indigo-500/20' },
          { label: 'CRITICAL_OVERDUE', value: stats.overdue, color: 'text-rose-600 dark:text-rose-500', icon: AlertOctagon, status: 'urgent', bg: 'bg-rose-500/10', border: 'border-rose-500/20' },
          { label: 'IMMINENT_CYCLES', value: stats.dueSoon, color: 'text-amber-600 dark:text-amber-500', icon: Clock, bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
          { label: `CERTIFIED_CYCLES_${yearView}`, value: stats.completedThisYear, color: 'text-emerald-600 dark:text-emerald-400', icon: ShieldCheck, bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
        ].map((card, i) => (
          <div key={i} className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 p-10 rounded-[48px] relative overflow-hidden group hover:border-indigo-500/30 transition-all duration-700 shadow-sm dark:shadow-none hover:shadow-2xl backdrop-blur-3xl">
             <div className="absolute right-[-20px] top-[-20px] opacity-[0.03] group-hover:opacity-10 transition-opacity">
                <card.icon className="w-32 h-32" />
             </div>
             <div className="flex items-start justify-between relative z-10 mb-8">
                <div className={`p-6 rounded-[28px] ${card.bg} border-2 ${card.border} shadow-inner group-hover:scale-110 group-hover:rotate-12 transition-all ${card.status === 'urgent' && 'animate-pulse shadow-rose-500/30'}`}>
                   <card.icon className={`w-8 h-8 ${card.color}`} />
                </div>
                <div className="text-right">
                   <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-2 italic font-mono">{card.label}</p>
                   <p className={`text-6xl font-black italic tracking-tighter leading-none ${card.color}`}>{card.value}</p>
                </div>
             </div>
             <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.2em] flex items-center gap-3 italic">
                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                Live Telemetry Matrix Active
             </div>
          </div>
        ))}
      </div>

      {/* Main Temporal Projection (Table & Heatmap) */}
      <section className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] overflow-hidden backdrop-blur-3xl shadow-sm dark:shadow-2xl relative group/table">
        <div className="absolute right-0 top-0 bottom-0 w-80 bg-gradient-to-l from-indigo-600/5 to-transparent pointer-events-none group-hover/table:opacity-100 transition-opacity" />
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-8 border-b-2 border-slate-100 dark:border-white/5 p-14 relative z-10">
          <div className="flex items-center gap-6">
             <div className="p-4 bg-indigo-600 text-white rounded-[24px] shadow-xl shadow-indigo-600/30 group-hover/table:rotate-6 transition-transform">
                <LayoutGrid className="w-8 h-8" />
             </div>
             <div>
                <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter leading-none mb-2 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Temporal Logic Grid</h2>
                <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] italic font-mono">Synchronized annual preventive cycles & signal heatmap</p>
             </div>
          </div>
          
          <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-950 p-4 rounded-[36px] border border-slate-100 dark:border-slate-800 shadow-inner group/year">
            <button onClick={() => setYearView(y => y-1)} className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-900 rounded-2xl transition-all active:scale-90"><ChevronRight className="w-6 h-6 rotate-180" /></button>
            <div className="px-14 py-4 bg-indigo-600 text-white font-black text-2xl italic rounded-[24px] shadow-2xl shadow-indigo-600/40 ring-8 ring-indigo-500/10 tracking-widest relative overflow-hidden">
               <div className="absolute inset-0 bg-white/10 translate-x-[-100%] group-hover/year:translate-x-[100%] transition-transform duration-1000" />
               <span className="relative z-10">{yearView}</span>
            </div>
            <button onClick={() => setYearView(y => y+1)} className="w-14 h-14 flex items-center justify-center text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-900 rounded-2xl transition-all active:scale-90"><ChevronRight className="w-6 h-6" /></button>
          </div>
        </div>

        <div className="overflow-x-auto custom-scrollbar relative z-10">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-white/5">
                <th className="px-14 py-10 text-[11px] font-black text-slate-500 dark:text-slate-700 uppercase tracking-[0.4em] sticky left-0 bg-white dark:bg-slate-950 z-20 border-r border-slate-100 dark:border-slate-800 font-mono italic">Machine_Archetype</th>
                <th className="px-10 py-10 text-[11px] font-black text-slate-500 dark:text-slate-700 uppercase tracking-[0.4em] text-center font-mono italic">Frequency</th>
                {MONTH_LABELS.map(m => (
                  <th key={m} className="px-5 py-10 text-[11px] font-black text-slate-500 dark:text-slate-700 uppercase tracking-[0.4em] text-center font-mono italic">{m}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 dark:divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                   <td colSpan={14} className="py-48 text-center grayscale opacity-10">
                      <div className="w-32 h-32 mx-auto mb-10 border-4 border-dashed border-slate-300 dark:border-slate-800 rounded-[48px] flex items-center justify-center animate-pulse">
                         <Calendar className="w-16 h-16 text-slate-300 dark:text-slate-700" />
                      </div>
                      <p className="text-[18px] font-black uppercase tracking-[0.8em] text-slate-400 dark:text-slate-600 italic">Temporal Void — NO_DATA_STREAMS</p>
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
                    <tr key={item.id} className="group hover:bg-slate-50 dark:hover:bg-indigo-500/5 transition-all duration-700 border-b border-slate-100 dark:border-white/5">
                      <td className="px-14 py-10 sticky left-0 bg-white/95 dark:bg-slate-950/95 backdrop-blur-3xl group-hover:bg-slate-50 dark:group-hover:bg-slate-900 transition-all z-10 border-r-2 border-slate-100 dark:border-slate-800 shadow-xl">
                        <button onClick={() => openDetail(item)} className="text-left group/btn max-w-[320px] block">
                           <h4 className="text-xl font-black text-slate-950 dark:text-white italic group-hover/btn:text-indigo-600 dark:group-hover/btn:text-indigo-400 transition-colors truncate uppercase tracking-tighter leading-none mb-3">{item.title}</h4>
                           <div className="flex items-center gap-3 px-3 py-1 bg-slate-50/50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 rounded-xl w-fit group-hover/btn:scale-105 transition-transform">
                              <Globe className="w-3.5 h-3.5 text-indigo-500" />
                              <p className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest truncate font-mono italic">{item.customer || item.location || 'OMNI_DISTRIBUTED'}</p>
                           </div>
                        </button>
                      </td>
                      <td className="px-10 py-10 text-center border-x border-slate-100 dark:border-white/5">
                        <div className={`px-6 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border-2 shadow-inner inline-flex items-center gap-2 group-hover:scale-110 transition-transform ${status.className}`}>
                           <status.icon className="w-4 h-4" /> {intervalLabel(item.intervalMonths)}
                        </div>
                      </td>
                      {MONTH_LABELS.map((_, idx) => {
                        const m = idx + 1;
                        const isDue = dueMonths.has(m);
                        const isNext = nextDueMonth === m;
                        return (
                          <td key={idx} className="px-4 py-10 text-center">
                            <div className={`mx-auto w-14 h-14 rounded-[24px] flex items-center justify-center text-[12px] font-black transition-all duration-700 shadow-sm relative group/cell ${
                               isNext ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/50 ring-8 ring-indigo-500/10 scale-125 z-20 group-hover:rotate-12 translate-y-[-4px]' :
                               isDue ? 'bg-indigo-50 dark:bg-indigo-500/10 text-indigo-500 dark:text-indigo-400 border-2 border-indigo-100 dark:border-indigo-500/20 group-hover:scale-110' : 'opacity-20 grayscale border-2 border-transparent hover:opacity-50'
                            }`}>
                               {isDue ? (
                                 <div className="relative">
                                    <div className={`absolute inset-0 blur-[8px] opacity-40 ${isNext ? 'bg-white' : 'bg-indigo-500 hover:bg-indigo-400'} rounded-full`} />
                                    <span className="relative z-10">{isNext ? 'NEXT' : 'SYNC'}</span>
                                 </div>
                               ) : '◌'}
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

      {/* Lifecycle Data Matrix */}
      <section className="bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800/80 rounded-[64px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl group/audit">
        <div className="flex items-center gap-8 border-b-2 border-slate-100 dark:border-white/5 p-14 bg-slate-50/50 dark:bg-slate-900/40 relative z-10">
           <div className="p-5 bg-emerald-600 text-white rounded-[28px] shadow-2xl shadow-emerald-500/30 group-hover/audit:scale-110 group-hover/audit:rotate-6 transition-all duration-700 border-4 border-emerald-400/20">
              <Monitor className="w-8 h-8" />
           </div>
           <div>
              <h2 className="text-4xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter leading-none mb-3 underline decoration-emerald-500/30 decoration-8 underline-offset-[16px]">Auditable Intelligence Matrix</h2>
              <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] italic font-mono">Real-time lifecycle analysis and visual evidence signal archive</p>
           </div>
        </div>
        
        <div className="overflow-x-auto relative z-10">
          <table className="w-full text-left">
            <thead>
              <tr className="bg-slate-50 dark:bg-slate-900/60 border-b-2 border-slate-100 dark:border-white/5 text-[11px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.4em] font-mono italic">
                <th className="px-14 py-10">Target_Identity</th>
                <th className="px-10 py-10">Cycle_Status</th>
                <th className="px-10 py-10">Last_Recalibration</th>
                <th className="px-10 py-10">Relay_Node</th>
                <th className="px-14 py-10 text-right">Interrogation</th>
              </tr>
            </thead>
            <tbody className="divide-y-2 divide-slate-100 dark:divide-white/5 font-bold">
              {filteredItems.map((item) => {
                const status = scheduleStatus(item);
                return (
                  <tr key={item.id} className="group/row hover:bg-slate-50 dark:hover:bg-slate-900 transition-all duration-500">
                    <td className="px-14 py-12">
                       <h4 className="text-2xl font-black text-slate-950 dark:text-white italic group-hover/row:text-indigo-600 dark:group-hover/row:text-indigo-400 transition-all uppercase tracking-tighter leading-none mb-3">{item.title}</h4>
                       <div className="flex items-center gap-3 px-3 py-1 bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl w-fit shadow-inner">
                          <Fingerprint className="w-4 h-4 text-indigo-500" />
                          <p className="text-[10px] font-black text-slate-500 dark:text-slate-500 uppercase tracking-[0.4em] font-mono">{item.sid || 'SYS_VOID_ID'}</p>
                       </div>
                    </td>
                    <td className="px-10 py-12">
                       <div className="flex flex-col gap-4">
                          <div className={`px-5 py-2.5 rounded-[20px] text-[10px] font-black uppercase tracking-[0.3em] border-2 shadow-inner flex items-center justify-center gap-3 w-fit group-hover/row:scale-110 transition-transform ${status.className}`}>
                             <status.icon className="w-4 h-4" />
                             {status.label}
                          </div>
                          <div className="flex items-center gap-3 text-slate-400 dark:text-slate-700 px-2">
                             <Calendar className="w-4 h-4" />
                             <span className="text-[12px] font-black text-slate-950 dark:text-white italic tracking-tighter uppercase">{new Date(item.nextDueDate).toLocaleDateString()}</span>
                          </div>
                       </div>
                    </td>
                    <td className="px-10 py-12">
                       <div className="flex flex-col gap-2">
                          <p className="text-[12px] font-black text-slate-950 dark:text-slate-300 italic uppercase leading-none tracking-tight">{item.lastMaintainedAt ? new Date(item.lastMaintainedAt).toLocaleDateString() : 'SIGNAL_LOST_0x0'}</p>
                          <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em] font-mono">{item.lastMaintainedAt ? new Date(item.lastMaintainedAt).toLocaleTimeString([], { hour12: false }) : 'PENDING_INIT'}</p>
                       </div>
                    </td>
                    <td className="px-10 py-12">
                       {item.openTicket ? (
                         <div className="bg-white dark:bg-slate-900 border-2 border-indigo-500/20 px-6 py-5 rounded-[28px] group/ticket hover:scale-[1.12] hover:rotate-2 transition-all cursor-pointer shadow-xl relative overflow-hidden">
                            <div className="absolute top-0 right-0 w-8 h-8 bg-indigo-600/5 blur-[20px]" />
                            <div className="flex items-center gap-3 mb-2 relative z-10">
                               <Zap className="w-4 h-4 text-indigo-500 animate-pulse" />
                               <span className="text-[13px] font-mono font-black text-indigo-600 dark:text-indigo-400 italic tracking-widest">{item.openTicket.ticketNumber}</span>
                            </div>
                            <div className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] font-mono relative z-10">{item.openTicket.status.toUpperCase()}</div>
                         </div>
                       ) : (
                        <div className="flex items-center gap-3 text-slate-200 dark:text-slate-800 opacity-40 group-hover/row:opacity-100 transition-opacity">
                           <Unplug className="w-5 h-5" />
                           <span className="text-[10px] font-black uppercase tracking-[0.5em] italic font-mono">RELAY_VOID</span>
                        </div>
                       )}
                    </td>
                    <td className="px-14 py-12 text-right">
                       <button 
                          onClick={() => openDetail(item)}
                          className="px-12 py-5 bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-700 rounded-[28px] text-[10px] font-black uppercase tracking-[0.4em] hover:border-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-all flex items-center justify-center gap-4 ml-auto shadow-sm active:scale-95 group/edit"
                       >
                          <Edit3 className="w-5 h-5 group-hover/edit:rotate-12 transition-transform" /> INTERROGATE_TARGET
                       </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Persistence Configuration Terminal Modal */}
      {selected && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/95 backdrop-blur-3xl p-6 animate-in fade-in duration-500" onClick={closeDetail}>
          <div className="w-full max-w-7xl max-h-[94vh] bg-white dark:bg-slate-950 border-4 border-slate-100 dark:border-indigo-500/20 rounded-[80px] shadow-2xl dark:shadow-[0_0_200px_rgba(79,70,229,0.25)] overflow-hidden flex flex-col animate-in zoom-in-95 duration-1000 relative group/modal" onClick={e => e.stopPropagation()}>
             <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
             
             {/* Modal Header Command Center */}
             <div className="relative p-16 border-b-2 border-slate-100 dark:border-white/5 flex items-start justify-between bg-white dark:bg-slate-950/80 backdrop-blur-3xl z-30 shadow-sm">
                <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/[0.03] blur-[150px] pointer-events-none" />
                <div className="relative z-10">
                   <div className="flex items-center gap-5 mb-4">
                      <div className="p-3 bg-indigo-600/10 rounded-xl border border-indigo-600/20 text-indigo-600">
                         <Target className="w-8 h-8" />
                      </div>
                      <span className="text-indigo-600 dark:text-indigo-400 text-[12px] font-black uppercase tracking-[0.8em] italic font-mono">Temporal_Binding_Profile: 0x{selected.id.slice(0, 8).toUpperCase()}</span>
                   </div>
                   <h2 className="text-7xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter leading-none drop-shadow-sm">{selected.title}</h2>
                   <div className="flex flex-wrap items-center gap-8 mt-8">
                      <div className="flex items-center gap-4 px-6 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-2xl">
                         <Globe className="w-5 h-5 text-indigo-500" />
                         <p className="text-slate-400 dark:text-slate-600 font-black text-xs uppercase tracking-[0.4em] font-mono italic">{selected.customer ? selected.customer.toUpperCase() : 'DOMAIN_STAKEHOLDER_VOID'} // {selected.location ? selected.location.toUpperCase() : 'COORDINATE_SYSTEM_UNDEF'}</p>
                      </div>
                      <div className="flex items-center gap-4 text-emerald-600 dark:text-emerald-500">
                         <Workflow className="w-5 h-5 animate-pulse" />
                         <span className="text-[11px] font-black uppercase tracking-[0.4em] font-mono">LOGIC_LINK_ESTABLISHED</span>
                      </div>
                   </div>
                </div>
                <button onClick={closeDetail} className="w-20 h-20 bg-slate-50 dark:bg-slate-900 hover:bg-rose-600 text-slate-400 hover:text-white rounded-[32px] transition-all border-2 border-slate-100 dark:border-slate-800 active:scale-90 flex items-center justify-center shadow-inner group/close">
                   <X className="w-10 h-10 group-hover/close:rotate-90 transition-transform duration-500" />
                </button>
             </div>

             <div className="flex-1 overflow-y-auto p-16 custom-scrollbar relative z-20">
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-20">
                   {/* Left Tactical Column: Logic Configuration & Completion */}
                   <div className="space-y-20">
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                         {[
                           { label: 'NEXT_CYCLE_LOCK', value: new Date(selected.nextDueDate).toLocaleDateString(), icon: Clock, color: 'text-indigo-500', bg: 'bg-indigo-500/5' },
                           { label: 'PULSE_FREQUENCY', value: intervalLabel(selected.intervalMonths).split('_')[0], icon: Activity, color: 'text-sky-500', bg: 'bg-sky-500/5' },
                           { label: 'ALERT_DELTA_T', value: `${selected.notifyDaysBefore}D`, icon: Zap, color: 'text-amber-500', bg: 'bg-amber-500/5' },
                           { label: 'MATRIX_NODE_ID', value: selected.sid || '0xVOID', icon: Fingerprint, color: 'text-emerald-500', bg: 'bg-emerald-500/5' }
                         ].map((tag, i) => (
                           <div key={i} className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-900 p-10 rounded-[48px] text-center group/tag hover:bg-white dark:hover:bg-slate-900 hover:scale-[1.05] hover:border-indigo-500/30 transition-all shadow-sm relative overflow-hidden">
                              <div className={`absolute inset-0 ${tag.bg} opacity-0 group-hover/tag:opacity-100 transition-opacity`} />
                              <tag.icon className={`w-8 h-8 ${tag.color} mx-auto mb-6 group-hover/tag:scale-125 group-hover/tag:rotate-12 transition-all relative z-10`} />
                              <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-2 font-mono italic relative z-10">{tag.label}</p>
                              <p className="text-xl font-black text-slate-950 dark:text-white italic truncate tracking-tighter relative z-10 uppercase leading-none">{tag.value}</p>
                           </div>
                         ))}
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/50 border-2 border-slate-100 dark:border-slate-800/80 p-14 rounded-[64px] space-y-14 shadow-inner relative group/settings">
                         <div className="flex items-center gap-5 border-b-2 border-indigo-500/10 pb-8">
                            <Settings className="w-8 h-8 text-indigo-500 group-hover/settings:rotate-180 transition-all duration-1000" />
                            <h3 className="text-3xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter underline decoration-indigo-500/20 decoration-4 underline-offset-[12px]">Logical Parameterization</h3>
                         </div>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                            {[
                               { label: 'MATRIX_SEQUENCE_HANDLE', value: editForm.title, field: 'title', icon: Target },
                               { label: 'TECHNICAL_SPEC_SERVICE', value: editForm.service, field: 'service', icon: Wrench },
                               { label: 'STAKEHOLDER_DOMAIN_ALIAS', value: editForm.customer, field: 'customer', icon: Globe },
                               { label: 'GEOSPATIAL_NODE_COORDINATE', value: editForm.location, field: 'location', icon: Layers }
                            ].map((input, i) => (
                               <div key={i} className="space-y-4 group/input">
                                  <label className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-6 font-mono italic group-focus-within/input:text-indigo-500 transition-colors flex items-center gap-3">
                                     <input.icon className="w-3.5 h-3.5" /> {input.label}
                                  </label>
                                  <input 
                                     value={input.value} 
                                     onChange={e => setEditForm(prev => ({...prev, [input.field]: e.target.value}))}
                                     className="w-full bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] px-10 py-6 text-base font-black text-slate-950 dark:text-white italic focus:ring-12 focus:ring-indigo-500/5 focus:border-indigo-500 transition-all shadow-sm uppercase tracking-tight" 
                                  />
                               </div>
                            ))}
                         </div>
                         <div className="flex flex-col sm:flex-row gap-8 pt-8 border-t-2 border-slate-100 dark:border-white/5">
                            <button onClick={handleDelete} disabled={saving} className="flex-1 px-12 py-7 bg-rose-500/10 border-2 border-rose-500/20 text-rose-600 rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-rose-600 hover:text-white transition-all flex items-center justify-center gap-5 shadow-sm active:scale-95 group/purge">
                               <ShieldX className="w-6 h-6 group-hover/purge:scale-125 transition-transform" /> TERMINATE_SEQUENCE
                            </button>
                            <button onClick={handleSave} disabled={saving} className="flex-[1.4] px-16 py-7 bg-indigo-600 text-white rounded-[32px] text-[12px] font-black uppercase tracking-[0.3em] shadow-2xl shadow-indigo-600/40 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-5 border-2 border-indigo-400/20 group/save">
                               {saving ? <Loader2 className="w-6 h-6 animate-spin" /> : <ShieldCheck className="w-6 h-6 group-hover/save:scale-125 transition-transform" />} COMMIT_RECALIBRATION
                            </button>
                         </div>
                      </div>

                      <div className="bg-white dark:bg-slate-950 border-4 border-emerald-500/30 p-14 rounded-[72px] relative overflow-hidden ring-12 ring-emerald-500/[0.03] shadow-2xl group/inspect">
                         <div className="absolute -left-48 -bottom-48 w-96 h-96 bg-emerald-600/[0.05] blur-[150px] pointer-events-none group-hover/inspect:scale-110 transition-transform duration-1000" />
                         <div className="flex items-center gap-6 mb-12 relative z-10">
                            <div className="p-4 bg-emerald-500 text-white rounded-[24px] shadow-xl shadow-emerald-500/40 group-hover/inspect:rotate-12 transition-all">
                               <CheckCircle2 className="w-10 h-10" />
                            </div>
                            <div>
                               <h3 className="text-4xl font-black text-slate-950 dark:text-white uppercase italic tracking-tighter leading-none mb-2 underline decoration-emerald-500/30 decoration-8 underline-offset-[20px]">Resolution Evidence Ingest</h3>
                               <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] font-mono">Manual lifecycle override & visual signal record decoupling</p>
                            </div>
                         </div>
                         <div className="space-y-10 relative z-10">
                            <div className="relative group/text">
                               <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-0 group-hover/text:opacity-100 transition-opacity pointer-events-none" />
                               <textarea 
                                   placeholder="ENTER_OPERATIONAL_LOGS: Hardware cycles within threshold, nodal integrity verified, evidence signals decoupling..."
                                   value={completionNote}
                                   onChange={e => setCompletionNote(e.target.value)}
                                   className="w-full bg-slate-50 dark:bg-slate-900/80 border-2 border-slate-100 dark:border-slate-800 rounded-[48px] p-12 min-h-[250px] text-slate-950 dark:text-white text-xl font-black italic shadow-inner placeholder:text-slate-200 dark:placeholder:text-slate-800 outline-none focus:border-emerald-500 transition-all leading-[1.6] uppercase tracking-tighter"
                               />
                            </div>
                            <div className="flex flex-col xl:flex-row items-center gap-10">
                               <label className="flex-1 w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[40px] cursor-pointer hover:border-emerald-500/50 transition-all flex items-center gap-8 p-6 group/file border-dashed">
                                  <div className="p-6 bg-white dark:bg-slate-950 rounded-[28px] group-hover/file:bg-emerald-500 text-emerald-500 group-hover/file:text-white transition-all shadow-xl group-hover/file:scale-110">
                                     <Upload className="w-8 h-8" />
                                  </div>
                                  <div className="flex flex-col">
                                     <span className="text-sm font-black text-slate-950 dark:text-white uppercase tracking-[0.2em] italic">{evidenceFile ? evidenceFile.name.toUpperCase() : 'UPLOAD_BINARY_EVIDENCE'}</span>
                                     <span className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mt-2 font-mono italic">{evidenceFile ? `${(evidenceFile.size / 1024 / 1024).toFixed(2)} MB_BLOB` : 'SUPPORTS: JPG, PNG, PDF'}</span>
                                  </div>
                                  <input type="file" onChange={e => setEvidenceFile(e.target.files?.[0] ?? null)} className="hidden" />
                                </label>
                                <button 
                                   onClick={handleComplete}
                                   disabled={saving}
                                   className="w-full xl:w-auto px-20 py-8 bg-gradient-to-br from-emerald-600 to-emerald-500 text-white rounded-[40px] text-[13px] font-black uppercase tracking-[0.4em] shadow-2xl shadow-emerald-600/50 hover:scale-[1.05] active:scale-95 transition-all flex items-center justify-center gap-6 border-4 border-emerald-400/20 group/reset"
                                >
                                   {saving ? <Loader2 className="w-8 h-8 animate-spin" /> : <ChevronRight className="w-8 h-8 group-hover/reset:translate-x-2 transition-transform" />} RESOLUTION_ACK
                                </button>
                            </div>
                         </div>
                      </div>
                   </div>

                   {/* Right Tactical Column: High-Velocity Signal Archive & Timeline */}
                   <div className="space-y-16">
                      <div className="bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 p-14 rounded-[64px] shadow-inner group/archive relative overflow-hidden">
                         <div className="absolute right-0 top-0 p-16 opacity-[0.03] group-hover/archive:opacity-10 transition-opacity">
                            <FileImage className="w-64 h-64" />
                         </div>
                         <h3 className="text-[13px] font-black text-slate-950 dark:text-white uppercase tracking-[0.6em] mb-12 italic flex items-center gap-6 border-b-2 border-indigo-500/10 pb-8 shrink-0 relative z-10 font-mono">
                            <Scan className="w-8 h-8 text-indigo-500 animate-pulse" /> Signal_Extraction_Archive_v4
                         </h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-10 relative z-10">
                            {selected.evidenceFiles.length === 0 ? (
                               <div className="col-span-full py-48 text-center grayscale opacity-10">
                                  <Monitor className="w-24 h-24 mx-auto mb-10 text-slate-200 dark:text-slate-800" />
                                  <span className="text-[14px] font-black uppercase tracking-[1em] text-slate-400 dark:text-slate-600 italic">Static_Channel — ZERO_DATA</span>
                               </div>
                            ) : (
                               selected.evidenceFiles.map(file => (
                                 <div key={file.id} className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 p-10 rounded-[56px] group/item hover:border-indigo-500/40 hover:scale-[1.03] transition-all shadow-xl hover:shadow-indigo-500/10 relative overflow-hidden">
                                    <div className="absolute inset-0 bg-indigo-500/[0.01] pointer-events-none" />
                                    <div className="flex items-start justify-between mb-10 relative z-10">
                                       <div className="flex items-center gap-6">
                                          <div className="w-16 h-16 p-4 bg-slate-50 dark:bg-slate-950 rounded-[28px] shadow-inner flex items-center justify-center border border-slate-100 dark:border-slate-800 group-hover/item:rotate-12 transition-transform">
                                             {file.mimeType?.startsWith('image/') ? <FileImage className="w-8 h-8 text-indigo-500" /> : <FileText className="w-8 h-8 text-rose-500" />}
                                          </div>
                                          <div className="overflow-hidden">
                                             <h5 className="text-[16px] font-black text-slate-950 dark:text-white truncate w-48 italic uppercase tracking-tighter leading-none mb-3">{file.originalName.toUpperCase()}</h5>
                                             <div className="flex items-center gap-3">
                                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-500" />
                                                <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.3em] font-mono italic">{new Date(file.createdAt).toLocaleDateString()} // {new Date(file.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}</p>
                                             </div>
                                          </div>
                                       </div>
                                       <a href={file.url || '#'} target="_blank" rel="noreferrer" className="w-12 h-12 bg-slate-50 dark:bg-slate-950 text-slate-300 hover:text-indigo-600 transition-all rounded-2xl active:scale-90 flex items-center justify-center border border-slate-100 dark:border-slate-800 shadow-sm"><ExternalLink className="w-5 h-5" /></a>
                                    </div>
                                    <button 
                                      onClick={() => setPreviewFile(previewFile?.id === file.id ? null : file)}
                                      className="w-full py-5 bg-slate-50 dark:bg-slate-950 border-2 border-slate-100 dark:border-slate-800 rounded-3xl text-[11px] font-black text-slate-500 hover:text-indigo-600 hover:border-indigo-500/40 transition-all shadow-inner relative z-10 uppercase tracking-[0.4em] font-mono italic"
                                    >
                                       {previewFile?.id === file.id ? 'ABORT_MANIFEST' : 'MANIFEST_SIGNAL_X'}
                                    </button>
                                    {previewFile?.id === file.id && (
                                       <div className="mt-10 rounded-[40px] overflow-hidden border-8 border-slate-50 dark:border-slate-950 animate-in zoom-in-95 duration-700 shadow-2xl ring-4 ring-indigo-500/10 group/img relative">
                                          <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover/img:opacity-100 transition-opacity pointer-events-none" />
                                          <img src={file.url ?? undefined} alt="telemetry" className="w-full object-cover aspect-video hover:scale-110 transition-transform duration-1000" />
                                          <div className="bg-slate-50 dark:bg-black p-5 text-[11px] font-black text-center text-slate-400 dark:text-slate-700 tracking-[0.8em] italic border-t-2 border-black font-mono">OPTICAL_TELEMETRY_RECORD_SYNC</div>
                                       </div>
                                    )}
                                 </div>
                               ))
                            )}
                         </div>
                      </div>

                      <div className="bg-slate-50 dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 p-14 rounded-[64px] shadow-inner relative group/history overflow-hidden">
                         <div className="absolute left-0 top-0 p-16 opacity-[0.03] group-hover/history:opacity-10 transition-opacity">
                            <HistoryIcon className="w-64 h-64" />
                         </div>
                         <h3 className="text-[13px] font-black text-slate-950 dark:text-white uppercase tracking-[0.6em] mb-12 italic flex items-center gap-6 border-b-2 border-indigo-500/10 pb-8 shrink-0 relative z-10 font-mono">
                            <Workflow className="w-8 h-8 text-indigo-500 animate-spin-slow" /> Multithreaded_Chronology_Chain
                         </h3>
                         {loadingHistory ? (
                            <div className="py-24 text-center flex flex-col items-center justify-center gap-8">
                               <Loader2 className="w-16 h-16 animate-spin text-indigo-500 opacity-30" />
                               <span className="text-[13px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.8em] animate-pulse font-mono italic">Accessing_Distributed_Ledger...</span>
                            </div>
                         ) : (
                            <div className="relative pl-16 space-y-14 before:absolute before:left-[19px] before:top-4 before:bottom-4 before:w-[4px] before:bg-gradient-to-b before:from-indigo-600 before:to-transparent before:rounded-full relative z-10">
                               {history.slice(0, 15).map(event => (
                                 <div key={event.id} className="relative group/ev">
                                    <div className="absolute -left-[54px] top-3 w-5 h-5 rounded-full bg-slate-950 ring-[12px] ring-slate-50 dark:ring-slate-950 group-hover/ev:bg-indigo-600 group-hover/ev:ring-indigo-600/30 group-hover/ev:scale-125 transition-all shadow-2xl border-2 border-indigo-400/20" />
                                    <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4 group-hover/ev:translate-x-2 transition-transform">
                                       <span className="text-[12px] font-black text-indigo-600 dark:text-indigo-500 uppercase tracking-[0.4em] italic font-mono">{event.ticketNumber || 'SYS_AUTO_SYNC'}</span>
                                       <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase font-mono italic">
                                          <Clock className="w-4 h-4" />
                                          {new Date(event.createdAt).toLocaleDateString()} // {new Date(event.createdAt).toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit' })}
                                       </div>
                                    </div>
                                    <div className="bg-white dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800/80 p-10 rounded-[40px] shadow-sm group-hover/ev:border-indigo-500/20 group-hover/ev:shadow-2xl transition-all relative overflow-hidden">
                                       <div className="absolute inset-0 bg-indigo-500/[0.01] pointer-events-none" />
                                       <h6 className="text-[18px] font-black text-slate-950 dark:text-white uppercase italic tracking-tighter mb-4 group-hover/ev:text-indigo-400 transition-colors leading-none">{HISTORY_ACTION_LABELS[event.action] || event.action.toUpperCase()}</h6>
                                       {event.note && (
                                         <div className="mt-4 p-6 bg-slate-50 dark:bg-slate-950 border-l-8 border-indigo-600 rounded-2xl relative">
                                            <p className="text-[12px] font-black text-slate-950 dark:text-slate-400 font-mono italic tracking-tight leading-relaxed line-clamp-4 uppercase">"{event.note}"</p>
                                         </div>
                                       )}
                                    </div>
                                 </div>
                               ))}
                               {history.length === 0 && (
                                  <div className="py-20 text-center grayscale opacity-10">
                                     <Inbox className="w-20 h-20 mx-auto mb-8 text-slate-200 dark:text-slate-800" />
                                     <span className="text-[14px] font-black uppercase tracking-[1em] text-slate-400 italic">No_Historical_Streams</span>
                                  </div>
                               )}
                            </div>
                          )}
                      </div>
                   </div>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* Primary Sequence Initialization Modal */}
      {showCreate && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/95 backdrop-blur-3xl p-6 animate-in fade-in duration-500" onClick={() => setShowCreate(false)}>
           <div className="w-full max-w-5xl bg-white dark:bg-slate-950 border-4 border-indigo-500/30 rounded-[80px] shadow-2xl dark:shadow-[0_0_150px_rgba(99,102,241,0.2)] overflow-hidden animate-in zoom-in-95 duration-1000 ring-1 ring-white/10 relative group/create-modal" onClick={e => e.stopPropagation()}>
              <div className="absolute inset-0 bg-indigo-500/[0.02] pointer-events-none" />
              
              <div className="p-16 border-b-2 border-slate-100 dark:border-white/5 flex items-center justify-between relative bg-white dark:bg-slate-950/80 backdrop-blur-3xl">
                 <div className="absolute -left-32 -top-32 w-80 h-80 bg-indigo-500/[0.05] blur-[120px]" />
                 <div className="relative z-10">
                   <div className="flex items-center gap-5 mb-3">
                      <div className="p-3 bg-indigo-600 text-white rounded-xl shadow-xl shadow-indigo-600/20">
                         <Workflow className="w-8 h-8" />
                      </div>
                      <h2 className="text-5xl font-black text-slate-950 dark:text-white italic uppercase tracking-tighter leading-none">Sequence Initialization</h2>
                   </div>
                   <p className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.8em] mt-3 font-mono italic">Establishing autonomous preventive lifecycle matrix</p>
                 </div>
                 <button onClick={() => setShowCreate(false)} className="w-16 h-16 bg-slate-50 dark:bg-slate-900 text-slate-400 hover:text-rose-500 rounded-[24px] transition-all border-2 border-slate-100 dark:border-slate-800 active:scale-90 flex items-center justify-center"><X className="w-10 h-10" /></button>
              </div>
              
              <div className="p-20 space-y-16 relative z-10 max-h-[70vh] overflow-y-auto custom-scrollbar">
                 <div className="grid grid-cols-1 lg:grid-cols-6 gap-12">
                    <div className="lg:col-span-4 space-y-6 group/field">
                       <label className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-10 font-mono italic group-focus-within/field:text-indigo-500 transition-colors">Machine_Sequence_Identifier (Logical Handle)</label>
                       <div className="relative">
                          <input 
                            className="w-full bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[40px] px-12 py-8 text-3xl font-black text-slate-950 dark:text-white italic outline-none focus:ring-16 focus:ring-indigo-500/[0.03] focus:border-indigo-500 transition-all shadow-inner tracking-tighter placeholder:text-slate-200 dark:placeholder:text-slate-800 uppercase" 
                            value={createForm.title}
                            onChange={e => setCreateForm(f => ({...f, title: e.target.value}))}
                            placeholder="e.g. CORE_NEXUS_ALPHA_01"
                          />
                          <Target className="absolute right-10 top-1/2 -translate-y-1/2 w-8 h-8 text-indigo-500/20 group-focus-within/field:text-indigo-500 transition-colors" />
                       </div>
                       <p className="text-[11px] font-black text-slate-300 dark:text-slate-700 uppercase tracking-[0.3em] ml-10 italic font-mono flex items-center gap-3">
                          <Info className="w-4 h-4" /> Global unique handle for synchronization and ledger tracking.
                       </p>
                    </div>

                    <div className="lg:col-span-2 space-y-6">
                       <label className="text-[12px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-8 font-mono italic">Functional_Protocol</label>
                       <div className="relative">
                          <select 
                            value={createForm.service}
                            onChange={e => setCreateForm(f => ({...f, service: e.target.value}))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-4 border-slate-100 dark:border-slate-800 rounded-[40px] px-12 py-8 text-xl font-black text-slate-950 dark:text-white italic outline-none focus:border-indigo-500 appearance-none cursor-pointer transition-all hover:bg-white dark:hover:bg-slate-900 uppercase tracking-tighter"
                          >
                             <option value="">SELECT_SIGNAL</option>
                             {['Network Infrastructure', 'Compute Engine', 'Security Systems', 'Cooling Subsystem', 'Power Distro'].map(s => <option key={s} value={s}>{s.toUpperCase()}</option>)}
                          </select>
                          <ChevronDown className="absolute right-10 top-1/2 -translate-y-1/2 w-6 h-6 text-indigo-500 pointer-events-none" />
                       </div>
                    </div>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
                    {[
                      { label: 'STAKEHOLDER_DOMAIN', key: 'customer', placeholder: 'ENTER_TENANT_ID', icon: Globe },
                      { label: 'GEOSPATIAL_NODAL_COORD', key: 'location', placeholder: 'ENTER_LOCATION_CODE', icon: Layers },
                      { label: 'NODAL_ID_BIND (SID)', key: 'sid', placeholder: '0xIDENTITY_VAL', icon: Fingerprint }
                    ].map((f, i) => (
                      <div key={i} className="space-y-6 group/inp">
                        <label className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-8 font-mono italic group-focus-within/inp:text-indigo-500 transition-colors flex items-center gap-3">
                           <f.icon className="w-4 h-4" /> {f.label}
                        </label>
                        <input 
                           value={(createForm as any)[f.key]}
                           onChange={e => setCreateForm(prev => ({...prev, [f.key]: e.target.value}))}
                           placeholder={f.placeholder}
                           className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[32px] px-10 py-6 text-base font-black text-slate-950 dark:text-white italic focus:ring-12 focus:ring-indigo-500/[0.03] focus:border-indigo-500 transition-all shadow-sm uppercase tracking-tight"
                        />
                      </div>
                    ))}
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-4 gap-12 pt-8 border-t-2 border-slate-100 dark:border-white/5">
                    <div className="space-y-6">
                       <label className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-6 font-mono italic">PULSE_FREQUENCY</label>
                       <div className="relative">
                          <select 
                            value={createForm.intervalMonths}
                            onChange={e => setCreateForm(f => ({...f, intervalMonths: Number(e.target.value)}))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
                          >
                             {INTERVAL_OPTIONS.map(opt => <option key={opt} value={opt}>{intervalLabel(opt)}</option>)}
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-6">
                       <label className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-6 font-mono italic">ANCHOR_MONTH</label>
                       <div className="relative">
                          <select 
                            value={createForm.anchorMonth}
                            onChange={e => setCreateForm(f => ({...f, anchorMonth: Number(e.target.value)}))}
                            className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] px-8 py-5 text-[11px] font-black uppercase tracking-[0.2em] text-slate-950 dark:text-white outline-none focus:border-indigo-500 appearance-none shadow-sm cursor-pointer"
                          >
                             {MONTH_LABELS.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                          </select>
                          <ChevronDown className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-indigo-500 pointer-events-none" />
                       </div>
                    </div>
                    <div className="space-y-6">
                       <label className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] ml-8 font-mono italic">NOTIFY_OFFSET (D)</label>
                       <input 
                          type="number"
                          value={createForm.notifyDaysBefore}
                          onChange={e => setCreateForm(prev => ({...prev, notifyDaysBefore: Number(e.target.value)}))}
                          className="w-full bg-slate-50 dark:bg-slate-900 border-2 border-slate-100 dark:border-slate-800 rounded-[28px] px-8 py-5 text-sm font-black text-slate-950 dark:text-white italic focus:ring-12 focus:ring-indigo-500/[0.03] focus:border-indigo-500 transition-all shadow-sm"
                       />
                    </div>
                    <div className="flex items-end">
                       <button 
                          onClick={handleCreate}
                          disabled={creating || !createForm.title}
                          className="w-full px-12 py-5 bg-indigo-600 hover:scale-[1.05] disabled:opacity-30 text-white rounded-[28px] text-[11px] font-black uppercase tracking-[0.3em] transition-all shadow-2xl shadow-indigo-600/40 active:scale-95 border-2 border-indigo-400/20 group/submit"
                       >
                          {creating ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <ShieldCheck className="w-5 h-5 inline-block mr-3 group-submit:rotate-12 transition-transform" />} {creating ? 'INIT_SEQUENCE...' : 'INITIALIZE_LEDOER'}
                       </button>
                    </div>
                 </div>
              </div>

              <div className="p-10 bg-slate-50 dark:bg-slate-950/80 border-t-2 border-slate-100 dark:border-white/5 flex items-center justify-center gap-10">
                 <div className="flex items-center gap-4 text-slate-400 dark:text-slate-700">
                    <ShieldCheck className="w-6 h-6 text-emerald-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic font-mono">AUTOMATED_CHRONOLOGY_CHART_ENFORCED</span>
                 </div>
                 <div className="flex items-center gap-4 text-slate-400 dark:text-slate-700">
                    <Database className="w-6 h-6 text-indigo-500" />
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-[0.5em] italic font-mono">GSHEETS_REALTIME_SYNC_ENABLED</span>
                 </div>
              </div>
           </div>
        </div>
      )}
    </div>
  );
}
