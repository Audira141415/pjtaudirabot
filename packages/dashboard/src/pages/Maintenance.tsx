import { useEffect, useMemo, useState } from 'react';
import {
  api,
  type MaintenanceEvidenceFile,
  type MaintenanceHistoryEvent,
  type MaintenanceScheduleItem,
} from '../lib/api';
import {
  Wrench,
  Search,
  CalendarDays,
  AlertTriangle,
  CheckCircle2,
  Clock3,
  Edit3,
  Upload,
  X,
  Loader2,
  ExternalLink,
  ShieldCheck,
  PlusCircle,
  Filter,
  History,
  FileImage,
  FileText,
  ChevronDown,
  Trash2,
} from 'lucide-react';

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
  while (cursor <= 12) {
    months.push(cursor);
    cursor += schedule.intervalMonths;
  }
  return months.filter((month) => month >= 1 && month <= 12 && year >= new Date(schedule.createdAt).getFullYear());
}

function intervalLabel(intervalMonths: number) {
  const map: Record<number, string> = {
    1: 'Bulanan',
    2: '2 Bulanan',
    3: 'Triwulan',
    6: 'Semesteran',
    12: 'Tahunan',
  };
  return map[intervalMonths] ?? `${intervalMonths} Bulanan`;
}

function scheduleStatus(schedule: MaintenanceScheduleItem) {
  const now = new Date();
  const dueDate = new Date(schedule.nextDueDate);
  if (dueDate < now) return { label: 'Overdue', className: 'bg-red-100 text-red-700', icon: AlertTriangle };

  const dueSoonBoundary = new Date(now.getTime() + schedule.notifyDaysBefore * 24 * 60 * 60 * 1000);
  if (dueDate <= dueSoonBoundary) return { label: 'Due Soon', className: 'bg-amber-100 text-amber-700', icon: Clock3 };

  return { label: 'On Track', className: 'bg-emerald-100 text-emerald-700', icon: CheckCircle2 };
}

function isCompletedThisYear(schedule: MaintenanceScheduleItem, year: number) {
  if (!schedule.lastMaintainedAt) return false;
  return new Date(schedule.lastMaintainedAt).getFullYear() === year;
}

export default function MaintenancePage() {
  const [items, setItems] = useState<MaintenanceScheduleItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [search, setSearch] = useState('');
  const [showInactive, setShowInactive] = useState(false);
  const [selected, setSelected] = useState<MaintenanceScheduleItem | null>(null);
  const [yearView, setYearView] = useState(new Date().getFullYear());

  // ── Create form ──
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState(EMPTY_CREATE_FORM);

  // ── Dropdown filters ──
  const [filterCustomer, setFilterCustomer] = useState('');
  const [filterLocation, setFilterLocation] = useState('');
  const [filterSid, setFilterSid] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  // ── Edit form ──
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

  // ── History timeline ──
  const [history, setHistory] = useState<MaintenanceHistoryEvent[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // ── Evidence preview ──
  const [previewFile, setPreviewFile] = useState<MaintenanceEvidenceFile | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getMaintenanceSchedules({
        active: showInactive ? undefined : true,
        search: search.trim() || undefined,
      });
      setItems(res.data);
      if (selected) {
        const fresh = res.data.find((item) => item.id === selected.id) ?? null;
        setSelected(fresh);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [showInactive]);

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
    // load history async
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
    setCompletionNote('');
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
      await load();
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      const res = await api.updateMaintenanceSchedule(selected.id, editForm);
      setSelected(res.data);
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleUploadEvidence = async () => {
    if (!selected || !evidenceFile) return null;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', evidenceFile);
      formData.append('notes', completionNote);
      formData.append('size', String(evidenceFile.size));
      const res = await api.uploadMaintenanceEvidence(selected.id, formData);
      setLatestUploadedEvidence(res.data);
      const refreshed = await api.getMaintenanceSchedule(selected.id);
      setSelected(refreshed.data);
      await load();
      return res.data;
    } finally {
      setUploading(false);
    }
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
      await load();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!selected) return;
    if (!confirm(`Hapus jadwal "${selected.title}"? Aksi ini tidak dapat dibatalkan dan akan menghapus sinkronisasi di Google Sheets.`)) return;
    setSaving(true);
    try {
      await api.deleteMaintenanceSchedule(selected.id);
      closeDetail();
      await load();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Gagal menghapus jadwal.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <Wrench className="h-6 w-6 text-brand-500" />
            <h1 className="text-2xl font-bold text-gray-900">Preventive Maintenance</h1>
          </div>
          <p className="mt-1 text-sm text-gray-500">
            Kalender PM per item, edit cadence tanpa script, dan tutup maintenance dengan bukti langsung dari dashboard.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari item / customer / lokasi / SID"
              className="w-full rounded-xl border border-gray-300 bg-white py-2 pl-10 pr-3 text-sm shadow-sm focus:border-brand-500 focus:outline-none"
            />
          </div>
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2 text-sm font-medium ${
              showFilters || filterCustomer || filterLocation || filterSid
                ? 'border-brand-500 bg-brand-50 text-brand-700'
                : 'border-gray-300 bg-white text-gray-700'
            }`}
          >
            <Filter className="h-4 w-4" />
            Filter
            {(filterCustomer || filterLocation || filterSid) && (
              <span className="rounded-full bg-brand-500 px-1.5 py-0.5 text-xs font-semibold text-white">
                {[filterCustomer, filterLocation, filterSid].filter(Boolean).length}
              </span>
            )}
            <ChevronDown className={`h-3.5 w-3.5 transition-transform ${showFilters ? 'rotate-180' : ''}`} />
          </button>
          <button
            onClick={() => load()}
            className="rounded-xl bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200"
          >
            Refresh
          </button>
          <button
            onClick={() => setShowInactive((value) => !value)}
            className={`rounded-xl border px-4 py-2 text-sm font-medium ${showInactive ? 'border-brand-500 bg-brand-50 text-brand-700' : 'border-gray-300 bg-white text-gray-700'}`}
          >
            {showInactive ? 'Hanya Aktif' : '+Nonaktif'}
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600"
          >
            <PlusCircle className="h-4 w-4" />
            Tambah Jadwal
          </button>
        </div>
      </div>

      {/* ── Filter dropdowns ── */}
      {showFilters && (
        <div className="rounded-2xl border border-brand-100 bg-brand-50/60 p-4">
          <div className="flex flex-wrap items-end gap-4">
            <label className="space-y-1 text-sm">
              <span className="text-gray-600 font-medium">Customer</span>
              <select
                value={filterCustomer}
                onChange={(e) => setFilterCustomer(e.target.value)}
                className="block rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Semua Customer</option>
                {filterOptions.customers.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-600 font-medium">Lokasi</span>
              <select
                value={filterLocation}
                onChange={(e) => setFilterLocation(e.target.value)}
                className="block rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Semua Lokasi</option>
                {filterOptions.locations.map((l) => <option key={l} value={l}>{l}</option>)}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-gray-600 font-medium">SID</span>
              <select
                value={filterSid}
                onChange={(e) => setFilterSid(e.target.value)}
                className="block rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
              >
                <option value="">Semua SID</option>
                {filterOptions.sids.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </label>
            {(filterCustomer || filterLocation || filterSid) && (
              <button
                onClick={() => { setFilterCustomer(''); setFilterLocation(''); setFilterSid(''); }}
                className="rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm text-gray-600 hover:bg-gray-50"
              >
                Reset Filter
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-4">
        {[
          { label: 'Total Item', value: stats.total, tone: 'text-gray-900', icon: CalendarDays },
          { label: 'Overdue', value: stats.overdue, tone: 'text-red-600', icon: AlertTriangle },
          { label: 'Due 14 Hari', value: stats.dueSoon, tone: 'text-amber-600', icon: Clock3 },
          { label: `Completed ${yearView}`, value: stats.completedThisYear, tone: 'text-emerald-600', icon: ShieldCheck },
        ].map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
              <div className="flex items-center justify-between">
                <p className="text-sm text-gray-500">{card.label}</p>
                <Icon className="h-5 w-5 text-gray-400" />
              </div>
              <p className={`mt-3 text-3xl font-bold ${card.tone}`}>{card.value}</p>
            </div>
          );
        })}
      </div>

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-gray-100 px-5 py-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">Kalender PM Tahunan</h2>
            <p className="text-sm text-gray-500">Setiap baris menunjukkan bulan-bulan maintenance aktif untuk item tersebut.</p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setYearView((year) => year - 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {yearView - 1}
            </button>
            <div className="rounded-lg bg-gray-900 px-4 py-1.5 text-sm font-semibold text-white">{yearView}</div>
            <button
              onClick={() => setYearView((year) => year + 1)}
              className="rounded-lg border border-gray-200 px-3 py-1.5 text-sm text-gray-600 hover:bg-gray-50"
            >
              {yearView + 1}
            </button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="sticky left-0 z-10 bg-gray-50 px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Interval</th>
                {MONTH_LABELS.map((month) => (
                  <th key={month} className="px-3 py-3 text-center font-medium">{month}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-gray-400">Loading maintenance calendar...</td>
                </tr>
              ) : filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={14} className="px-4 py-10 text-center text-gray-400">Belum ada item maintenance</td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const dueMonths = new Set(dueMonthsForYear(item, yearView));
                  const nextDueMonth = new Date(item.nextDueDate).getFullYear() === yearView
                    ? new Date(item.nextDueDate).getMonth() + 1
                    : null;
                  const status = scheduleStatus(item);
                  return (
                    <tr key={item.id} className="hover:bg-gray-50/70">
                      <td className="sticky left-0 z-10 bg-white px-4 py-3">
                        <button onClick={() => openDetail(item)} className="text-left">
                          <div className="font-semibold text-gray-900">{item.title}</div>
                          <div className="text-xs text-gray-500">{item.customer || item.location || 'General schedule'}</div>
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                          <status.icon className="h-3.5 w-3.5" />
                          {intervalLabel(item.intervalMonths)}
                        </span>
                      </td>
                      {MONTH_LABELS.map((month, index) => {
                        const monthNumber = index + 1;
                        const isDueMonth = dueMonths.has(monthNumber);
                        const isNextDue = nextDueMonth === monthNumber;
                        return (
                          <td key={`${item.id}-${month}`} className="px-2 py-3 text-center">
                            <div className={`mx-auto flex h-9 w-9 items-center justify-center rounded-full text-xs font-semibold ${
                              isNextDue
                                ? 'bg-brand-500 text-white shadow'
                                : isDueMonth
                                  ? 'bg-sky-100 text-sky-700'
                                  : 'bg-gray-100 text-gray-400'
                            }`}>
                              {isDueMonth ? 'PM' : '-'}
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

      <section className="rounded-2xl border border-gray-200 bg-white shadow-sm">
        <div className="border-b border-gray-100 px-5 py-4">
          <h2 className="text-lg font-semibold text-gray-900">Daftar Operasional PM</h2>
          <p className="text-sm text-gray-500">Pantau next due, ticket aktif, evidence terbaru, dan lakukan update manual saat teknisi selesai.</p>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-gray-500">
              <tr>
                <th className="px-4 py-3 text-left font-medium">Item</th>
                <th className="px-4 py-3 text-left font-medium">Next Due</th>
                <th className="px-4 py-3 text-left font-medium">Last Maintained</th>
                <th className="px-4 py-3 text-left font-medium">Reminder</th>
                <th className="px-4 py-3 text-left font-medium">Ticket Aktif</th>
                <th className="px-4 py-3 text-left font-medium">Evidence</th>
                <th className="px-4 py-3 text-left font-medium"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredItems.map((item) => {
                const status = scheduleStatus(item);
                const StatusIcon = status.icon;
                return (
                  <tr key={item.id} className="hover:bg-gray-50/70">
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{item.title}</div>
                      <div className="text-xs text-gray-500">{item.customer || item.location || '-'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium text-gray-800">{new Date(item.nextDueDate).toLocaleDateString('id-ID')}</div>
                      <span className={`mt-1 inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium ${status.className}`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600">{item.lastMaintainedAt ? new Date(item.lastMaintainedAt).toLocaleString('id-ID') : '-'}</td>
                    <td className="px-4 py-3 text-gray-600">
                      <div>{item.notifyDaysBefore} hari sebelum due</div>
                      <div className="text-xs text-gray-400">Follow-up tiap {item.reminderEveryMonths} bulan</div>
                    </td>
                    <td className="px-4 py-3">
                      {item.openTicket ? (
                        <div>
                          <div className="font-mono text-xs text-brand-700">{item.openTicket.ticketNumber}</div>
                          <div className="text-xs text-gray-500">{item.openTicket.status}</div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">Tidak ada</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.evidenceFiles[0] ? (
                        <a
                          href={item.evidenceFiles[0].url || '#'}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-1 text-sm font-medium text-brand-600 hover:text-brand-700"
                        >
                          {item.evidenceFiles[0].originalName}
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      ) : (
                        <span className="text-xs text-gray-400">Belum ada</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => openDetail(item)}
                        className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 hover:bg-gray-50"
                      >
                        <Edit3 className="h-3.5 w-3.5" />
                        Kelola
                      </button>
                    </td>
                  </tr>
                );
              })}
              {!loading && filteredItems.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-gray-400">Tidak ada item untuk filter saat ini</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeDetail}>
          <div className="max-h-[90vh] w-full max-w-5xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selected.title}</h2>
                <p className="mt-1 text-sm text-gray-500">Edit cadence, upload bukti maintenance, lalu mark completed untuk update jadwal berikutnya.</p>
              </div>
              <button onClick={closeDetail} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-6 px-6 py-6 lg:grid-cols-[1.3fr_1fr]">
              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Edit3 className="h-5 w-5 text-brand-500" />
                    <h3 className="font-semibold text-gray-900">Konfigurasi Jadwal</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Nama Item</span>
                      <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.title} onChange={(e) => setEditForm((prev) => ({ ...prev, title: e.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Customer</span>
                      <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.customer} onChange={(e) => setEditForm((prev) => ({ ...prev, customer: e.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Lokasi</span>
                      <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.location} onChange={(e) => setEditForm((prev) => ({ ...prev, location: e.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">SID</span>
                      <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.sid} onChange={(e) => setEditForm((prev) => ({ ...prev, sid: e.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Service</span>
                      <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.service} onChange={(e) => setEditForm((prev) => ({ ...prev, service: e.target.value }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Interval</span>
                      <select className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.intervalMonths} onChange={(e) => setEditForm((prev) => ({ ...prev, intervalMonths: Number(e.target.value) }))}>
                        {INTERVAL_OPTIONS.map((option) => <option key={option} value={option}>{intervalLabel(option)}</option>)}
                      </select>
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Anchor Day</span>
                      <input type="number" min={1} max={31} className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.anchorDay} onChange={(e) => setEditForm((prev) => ({ ...prev, anchorDay: Number(e.target.value) }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Reminder Cadence (bulan)</span>
                      <input type="number" min={1} max={12} className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.reminderEveryMonths} onChange={(e) => setEditForm((prev) => ({ ...prev, reminderEveryMonths: Number(e.target.value) }))} />
                    </label>
                    <label className="space-y-1 text-sm">
                      <span className="text-gray-500">Notify H-</span>
                      <input type="number" min={1} max={60} className="w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.notifyDaysBefore} onChange={(e) => setEditForm((prev) => ({ ...prev, notifyDaysBefore: Number(e.target.value) }))} />
                    </label>
                    <label className="flex items-center gap-3 rounded-xl border border-gray-200 px-4 py-3 text-sm text-gray-700">
                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm((prev) => ({ ...prev, isActive: e.target.checked }))} />
                      Jadwal aktif
                    </label>
                  </div>
                  <label className="mt-4 block space-y-1 text-sm">
                    <span className="text-gray-500">Deskripsi</span>
                    <textarea className="min-h-[100px] w-full rounded-xl border border-gray-300 px-3 py-2" value={editForm.description} onChange={(e) => setEditForm((prev) => ({ ...prev, description: e.target.value }))} />
                  </label>
                  <div className="mt-4 flex items-center justify-between">
                    <button onClick={handleDelete} disabled={saving} className="inline-flex items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-100 disabled:opacity-50">
                      <Trash2 className="h-4 w-4" />
                      Hapus Jadwal
                    </button>
                    <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60">
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Edit3 className="h-4 w-4" />}
                      Simpan Perubahan
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <Upload className="h-5 w-5 text-brand-500" />
                    <h3 className="font-semibold text-gray-900">Mark Completed & Bukti Maintenance</h3>
                  </div>
                  <div className="grid gap-4 md:grid-cols-2">
                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="text-gray-500">Catatan penyelesaian</span>
                      <textarea className="min-h-[110px] w-full rounded-xl border border-gray-300 px-3 py-2" value={completionNote} onChange={(e) => setCompletionNote(e.target.value)} placeholder="Contoh: PM selesai, cleaning indoor/outdoor, cek tekanan freon, dokumentasi terlampir." />
                    </label>
                    <label className="space-y-1 text-sm md:col-span-2">
                      <span className="text-gray-500">Upload bukti (foto/PDF/video kecil)</span>
                      <input type="file" onChange={(e) => setEvidenceFile(e.target.files?.[0] ?? null)} className="block w-full rounded-xl border border-gray-300 bg-white px-3 py-2 text-sm" />
                    </label>
                    {evidenceFile && (
                      <div className="rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-700 md:col-span-2">
                        File siap upload: <span className="font-semibold">{evidenceFile.name}</span> ({(evidenceFile.size / 1024 / 1024).toFixed(2)} MB)
                      </div>
                    )}
                    {latestUploadedEvidence && (
                      <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700 md:col-span-2">
                        Bukti terbaru tersimpan:{' '}
                        <a className="font-semibold underline" href={latestUploadedEvidence.url || '#'} target="_blank" rel="noreferrer">
                          {latestUploadedEvidence.originalName}
                        </a>
                      </div>
                    )}
                  </div>
                  <div className="mt-4 flex flex-wrap justify-end gap-2">
                    <button
                      onClick={handleUploadEvidence}
                      disabled={!selected || !evidenceFile || uploading}
                      className="inline-flex items-center gap-2 rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                    >
                      {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
                      Upload Bukti
                    </button>
                    <button
                      onClick={handleComplete}
                      disabled={saving}
                      className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-700 disabled:opacity-60"
                    >
                      {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Mark Completed
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-6">
                <div className="rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900">Ringkasan Saat Ini</h3>
                  <dl className="mt-4 space-y-3 text-sm">
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Next Due</dt>
                      <dd className="font-semibold text-gray-800">{new Date(selected.nextDueDate).toLocaleString('id-ID')}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Last Maintained</dt>
                      <dd className="font-semibold text-gray-800">{selected.lastMaintainedAt ? new Date(selected.lastMaintainedAt).toLocaleString('id-ID') : '-'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Open Ticket</dt>
                      <dd className="font-semibold text-gray-800">{selected.openTicket?.ticketNumber || '-'}</dd>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <dt className="text-gray-500">Last Note</dt>
                      <dd className="max-w-[220px] text-right text-gray-700">{selected.lastCompletionNote || '-'}</dd>
                    </div>
                  </dl>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <h3 className="font-semibold text-gray-900">Evidence Terbaru</h3>
                  <div className="mt-4 space-y-3">
                    {selected.evidenceFiles.length === 0 ? (
                      <p className="text-sm text-gray-400">Belum ada bukti maintenance.</p>
                    ) : (
                      selected.evidenceFiles.map((file) => {
                        const isImage = file.mimeType?.startsWith('image/');
                        const isPdf = file.mimeType === 'application/pdf';
                        return (
                          <div key={file.id} className="rounded-xl border border-gray-200 p-3">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-2">
                                  {isImage ? (
                                    <FileImage className="h-4 w-4 shrink-0 text-sky-500" />
                                  ) : isPdf ? (
                                    <FileText className="h-4 w-4 shrink-0 text-red-500" />
                                  ) : (
                                    <FileText className="h-4 w-4 shrink-0 text-gray-400" />
                                  )}
                                  <a href={file.url || '#'} target="_blank" rel="noreferrer" className="truncate font-medium text-brand-600 hover:text-brand-700">
                                    {file.originalName}
                                  </a>
                                </div>
                                <p className="mt-1 text-xs text-gray-500">{new Date(file.createdAt).toLocaleString('id-ID')} · {file.mimeType}</p>
                                {file.metadata?.notes && <p className="mt-2 text-sm text-gray-700">{file.metadata.notes}</p>}
                                {isImage && file.url && (
                                  <button onClick={() => setPreviewFile(previewFile?.id === file.id ? null : file)} className="mt-2 text-xs font-medium text-brand-500 hover:text-brand-700 underline">
                                    {previewFile?.id === file.id ? 'Sembunyikan Preview' : 'Preview Gambar'}
                                  </button>
                                )}
                              </div>
                              <a href={file.url || '#'} target="_blank" rel="noreferrer" className="rounded-lg border border-gray-200 p-2 text-gray-600 hover:bg-gray-50 shrink-0">
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            </div>
                            {previewFile?.id === file.id && isImage && file.url && (
                              <div className="mt-3 overflow-hidden rounded-xl border border-gray-200 bg-gray-50">
                                <img
                                  src={file.url}
                                  alt={file.originalName}
                                  className="max-h-64 w-full object-contain"
                                />
                              </div>
                            )}
                            {isPdf && file.url && (
                              <div className="mt-3">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-50 border border-red-200 px-3 py-1.5 text-sm font-medium text-red-700 hover:bg-red-100"
                                >
                                  <FileText className="h-4 w-4" />
                                  Buka PDF di Tab Baru
                                </a>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="rounded-2xl border border-gray-200 p-5">
                  <div className="mb-4 flex items-center gap-2">
                    <History className="h-5 w-5 text-brand-500" />
                    <h3 className="font-semibold text-gray-900">Timeline Histori</h3>
                  </div>
                  {loadingHistory ? (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Loader2 className="h-4 w-4 animate-spin" /> Memuat histori...
                    </div>
                  ) : history.length === 0 ? (
                    <p className="text-sm text-gray-400">Belum ada histori ticket untuk jadwal ini.</p>
                  ) : (
                    <ol className="relative border-l border-gray-200 pl-5 space-y-4">
                      {history.map((event) => (
                        <li key={event.id} className="relative">
                          <div className="absolute -left-[21px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-white bg-brand-400" />
                          <div className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-semibold text-brand-700">{event.ticketNumber}</span>
                                <span className="rounded-full bg-gray-200 px-2 py-0.5 text-xs text-gray-600">{event.ticketStatus}</span>
                              </div>
                              <span className="text-xs text-gray-400">{new Date(event.createdAt).toLocaleString('id-ID')}</span>
                            </div>
                            <p className="mt-1 text-sm font-medium text-gray-800">
                              {HISTORY_ACTION_LABELS[event.action] ?? event.action}
                            </p>
                            {event.note && <p className="mt-1 text-sm text-gray-600">{event.note}</p>}
                          </div>
                        </li>
                      ))}
                    </ol>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* ── Create Schedule Modal ── */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-gray-100 px-6 py-5">
              <div>
                <h2 className="text-xl font-bold text-gray-900">Tambah Jadwal PM Baru</h2>
                <p className="mt-1 text-sm text-gray-500">Isi detail item maintenance berikut. Tiket akan dibuat otomatis saat due.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="rounded-full p-2 text-gray-500 hover:bg-gray-100">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-6 py-6 space-y-5">
              <div className="grid gap-4 md:grid-cols-2">
                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="font-medium text-gray-700">Nama Item <span className="text-red-500">*</span></span>
                  <input
                    className="w-full rounded-xl border border-gray-300 px-3 py-2"
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                    placeholder="Contoh: AC Server Room Lt. 2"
                  />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Customer</span>
                  <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.customer} onChange={(e) => setCreateForm((f) => ({ ...f, customer: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Lokasi</span>
                  <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.location} onChange={(e) => setCreateForm((f) => ({ ...f, location: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">SID</span>
                  <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.sid} onChange={(e) => setCreateForm((f) => ({ ...f, sid: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Service / Tipe Perangkat</span>
                  <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.service} onChange={(e) => setCreateForm((f) => ({ ...f, service: e.target.value }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Interval PM</span>
                  <select className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.intervalMonths} onChange={(e) => setCreateForm((f) => ({ ...f, intervalMonths: Number(e.target.value) }))}>
                    {INTERVAL_OPTIONS.map((opt) => <option key={opt} value={opt}>{intervalLabel(opt)}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Anchor Month (bulan mulai siklus)</span>
                  <select className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.anchorMonth} onChange={(e) => setCreateForm((f) => ({ ...f, anchorMonth: Number(e.target.value) }))}>
                    {MONTH_LABELS.map((label, idx) => <option key={idx + 1} value={idx + 1}>{label}</option>)}
                  </select>
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Anchor Day (tanggal)</span>
                  <input type="number" min={1} max={31} className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.anchorDay} onChange={(e) => setCreateForm((f) => ({ ...f, anchorDay: Number(e.target.value) }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Follow-up reminder (bulan)</span>
                  <input type="number" min={1} max={12} className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.reminderEveryMonths} onChange={(e) => setCreateForm((f) => ({ ...f, reminderEveryMonths: Number(e.target.value) }))} />
                </label>
                <label className="space-y-1 text-sm">
                  <span className="text-gray-500">Notify H-</span>
                  <input type="number" min={1} max={60} className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.notifyDaysBefore} onChange={(e) => setCreateForm((f) => ({ ...f, notifyDaysBefore: Number(e.target.value) }))} />
                </label>
                <label className="space-y-1 text-sm md:col-span-2">
                  <span className="text-gray-500">AO (Area of Operation)</span>
                  <input className="w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.ao} onChange={(e) => setCreateForm((f) => ({ ...f, ao: e.target.value }))} />
                </label>
              </div>
              <label className="block space-y-1 text-sm">
                <span className="text-gray-500">Deskripsi</span>
                <textarea className="min-h-[80px] w-full rounded-xl border border-gray-300 px-3 py-2" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} />
              </label>
              <div className="flex justify-end gap-3 pt-2">
                <button onClick={() => setShowCreate(false)} className="rounded-xl border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50">
                  Batal
                </button>
                <button
                  onClick={handleCreate}
                  disabled={creating || !createForm.title.trim()}
                  className="inline-flex items-center gap-2 rounded-xl bg-brand-500 px-5 py-2 text-sm font-medium text-white hover:bg-brand-600 disabled:opacity-60"
                >
                  {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <PlusCircle className="h-4 w-4" />}
                  Buat Jadwal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
