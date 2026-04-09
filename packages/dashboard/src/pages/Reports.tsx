import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FileBarChart, Plus, Trash2, X } from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'DAILY_SUMMARY', schedule: 'DAILY', format: 'PDF', recipients: '' });

  const load = async () => {
    try { const res = await api.getScheduledReports(); setReports((res.data as any) ?? []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const create = async () => {
    if (!form.name) return;
    try {
      await api.createScheduledReport({ ...form, recipients: form.recipients.split(',').map(r => r.trim()).filter(Boolean) });
      setShowForm(false);
      setForm({ name: '', type: 'DAILY_SUMMARY', schedule: 'DAILY', format: 'PDF', recipients: '' });
      load();
    } catch (err) { console.error(err); }
  };

  const remove = async (id: string) => {
    try { await api.deleteScheduledReport(id); load(); } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <FileBarChart className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Scheduled Reports</h1>
        </div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-1 px-3 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600">
          <Plus className="w-4 h-4" /> New Report
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold">New Scheduled Report</h3>
            <button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-medium block mb-1">Name</label>
              <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="Report name" />
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Type</label>
              <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="DAILY_SUMMARY">Daily Summary</option>
                <option value="WEEKLY_SUMMARY">Weekly Summary</option>
                <option value="MONTHLY_SUMMARY">Monthly Summary</option>
                <option value="SLA_REPORT">SLA Report</option>
                <option value="INCIDENT_REPORT">Incident Report</option>
                <option value="PERFORMANCE_REPORT">Performance Report</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Schedule</label>
              <select value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="DAILY">Daily</option>
                <option value="WEEKLY">Weekly</option>
                <option value="MONTHLY">Monthly</option>
              </select>
            </div>
            <div>
              <label className="text-sm font-medium block mb-1">Format</label>
              <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm">
                <option value="PDF">PDF</option>
                <option value="EXCEL">Excel</option>
                <option value="CSV">CSV</option>
                <option value="JSON">JSON</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="text-sm font-medium block mb-1">Recipients (comma-separated)</label>
              <input value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm" placeholder="admin@company.com, noc@company.com" />
            </div>
          </div>
          <button onClick={create} className="mt-4 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600">Create Report</button>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {reports.map((r) => (
          <div key={r.id} className="bg-white rounded-xl border p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                <h3 className="font-bold">{r.name}</h3>
                <p className="text-xs text-gray-400">{r.type}</p>
              </div>
              <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600"><Trash2 className="w-4 h-4" /></button>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Schedule</span>
                <span className="font-medium">{r.schedule}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Format</span>
                <span className="font-medium">{r.format}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${r.enabled !== false ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-600'}`}>
                  {r.enabled !== false ? 'Active' : 'Disabled'}
                </span>
              </div>
              {r.recipients?.length > 0 && (
                <div>
                  <span className="text-gray-500 text-xs">Recipients:</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {(r.recipients as string[]).map((rec: string, i: number) => (
                      <span key={i} className="bg-gray-100 text-xs px-2 py-0.5 rounded">{rec}</span>
                    ))}
                  </div>
                </div>
              )}
              {r.lastRunAt && <p className="text-xs text-gray-400">Last run: {new Date(r.lastRunAt).toLocaleString()}</p>}
            </div>
          </div>
        ))}
        {reports.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No scheduled reports</div>}
      </div>
    </div>
  );
}
