import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  FileBarChart, 
  Plus, 
  Trash2, 
  X, 
  Settings, 
  Calendar, 
  Clock, 
  Mail, 
  Zap, 
  FileText, 
  ChevronRight,
  Monitor
} from 'lucide-react';

export default function ReportsPage() {
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', type: 'DAILY_SUMMARY', schedule: 'DAILY', format: 'PDF', recipients: '' });

  const load = async () => {
    try { const res = await api.getScheduledReports(); setReports(res.data ?? []); }
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
    if (!confirm('Purge this report configuration from the registry?')) return;
    try { await api.deleteScheduledReport(id); load(); } catch (err) { console.error(err); }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Assembling Data Structures...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <FileBarChart className="w-5 h-5 text-indigo-400" />
            <span className="text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Analytical Engineering</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1">Autonomous Reporting</h1>
          <p className="text-slate-500 font-medium text-sm">Scheduled data extraction, performance summaries, and incident auditing.</p>
        </div>

        <button 
           onClick={() => setShowForm(true)} 
           className="flex items-center gap-2 px-10 py-5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-[24px] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-indigo-600/30"
        >
          <Plus className="w-4 h-4" /> Initialize New Flow
        </button>
      </div>

      {showForm && (
        <div className="bg-slate-900 border border-indigo-500/20 rounded-[48px] p-10 space-y-8 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-indigo-500/30">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Settings className="w-5 h-5 text-indigo-400" />
               <h3 className="text-xl font-black text-white italic uppercase tracking-tight">Report Configuration Interface</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-500 hover:text-rose-500 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
            <div className="space-y-4">
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 px-2">Flow Identity</label>
                  <input value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-indigo-500 transition-colors font-bold" placeholder="e.g. CORE_SLA_WEEKLY" />
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 px-2">Dataset Archetype</label>
                  <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-indigo-500 transition-colors cursor-pointer font-bold">
                    <option value="DAILY_SUMMARY">Daily Operational Summary</option>
                    <option value="WEEKLY_SUMMARY">Weekly Performance Analysis</option>
                    <option value="MONTHLY_SUMMARY">Monthly Technical Audit</option>
                    <option value="SLA_REPORT">SLA Compliance Telemetry</option>
                    <option value="INCIDENT_REPORT">Incident Criticality Matrix</option>
                    <option value="PERFORMANCE_REPORT">Compute Performance Metrics</option>
                  </select>
               </div>
            </div>
            
            <div className="space-y-4">
               <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 px-2">Dispatch Cycle</label>
                    <select value={form.schedule} onChange={e => setForm({ ...form, schedule: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-indigo-500 font-bold">
                      <option value="DAILY">Daily Grid</option>
                      <option value="WEEKLY">Weekly Sync</option>
                      <option value="MONTHLY">Monthly Sweep</option>
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 px-2">Export Protocol</label>
                    <select value={form.format} onChange={e => setForm({ ...form, format: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-indigo-500 font-bold">
                      <option value="PDF">Encrypted PDF</option>
                      <option value="EXCEL">MS Excel Ledger</option>
                      <option value="CSV">Raw Data String (CSV)</option>
                      <option value="JSON">Structured JSON Object</option>
                    </select>
                  </div>
               </div>
               <div>
                  <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block mb-1 px-2">Recipient Nexus (Commas)</label>
                  <input value={form.recipients} onChange={e => setForm({ ...form, recipients: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-6 py-4 text-white text-sm outline-none focus:border-indigo-500 transition-colors font-mono" placeholder="noc-core@company.com, tech-lead@company.com" />
               </div>
            </div>
          </div>

          <div className="flex justify-end pt-4 border-t border-slate-800/50">
             <button onClick={create} className="px-12 py-5 bg-gradient-to-r from-indigo-600 to-indigo-500 text-white rounded-[24px] font-black uppercase text-[10px] tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.02] active:scale-95 transition-all">
                Authorize and Initialize Flow
             </button>
          </div>
        </div>
      )}

      {/* Reports Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-8">
        {reports.map((r) => (
          <div key={r.id} className="relative group bg-slate-950/40 border border-slate-800/80 p-8 rounded-[48px] hover:bg-slate-900 transition-all duration-500 overflow-hidden backdrop-blur-2xl">
             <div className="absolute right-0 top-0 bottom-0 w-2 bg-indigo-600/20 group-hover:bg-indigo-600 transition-all duration-500" />
             
             <div className="flex items-start justify-between mb-8">
                <div className="flex items-center gap-4">
                   <div className="p-4 bg-slate-900 rounded-[24px] border border-slate-800 group-hover:border-indigo-500/20 transition-all">
                      <Monitor className="w-6 h-6 text-indigo-400" />
                   </div>
                   <div>
                      <h3 className="text-xl font-black text-white italic group-hover:text-white transition-colors uppercase tracking-tight leading-tight">{r.name}</h3>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest mt-1 italic">{r.type.replace('_', ' ')}</p>
                   </div>
                </div>
                <button 
                   onClick={() => remove(r.id)} 
                   className="p-3 text-slate-700 hover:text-rose-500 active:scale-90 transition-all opacity-20 group-hover:opacity-100"
                >
                   <Trash2 className="w-5 h-5" />
                </button>
             </div>

             <div className="space-y-4 mb-10">
                {[
                  { icon: Calendar, label: 'Frequency', value: r.schedule },
                  { icon: FileText, label: 'Protocol', value: r.format },
                  { icon: Zap, label: 'Status', value: r.enabled !== false ? 'OPERATIONAL' : 'DORMANT' }
                ].map((item, i) => (
                  <div key={i} className="flex items-center justify-between border-b border-indigo-500/5 pb-2 group/val hover:border-indigo-500/20 transition-colors">
                     <div className="flex items-center gap-2">
                        <item.icon className="w-3.5 h-3.5 text-slate-700 group-hover/val:text-indigo-400 transition-colors" />
                        <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{item.label}</span>
                     </div>
                     <span className={`text-[10px] font-black italic tracking-widest ${item.value === 'OPERATIONAL' ? 'text-emerald-500' : 'text-white'}`}>{item.value}</span>
                  </div>
                ))}
             </div>

             {r.recipients?.length > 0 && (
               <div className="mb-10">
                  <div className="flex items-center gap-2 mb-3">
                     <Mail className="w-3.5 h-3.5 text-slate-500" />
                     <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest italic">Nexus Recipients</span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                     {(r.recipients as string[]).map((rec, i) => (
                       <span key={i} className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[9px] font-bold text-slate-400 font-mono">{rec}</span>
                     ))}
                  </div>
               </div>
             )}

             <div className="flex items-center justify-between pt-6 border-t border-slate-800/50">
                <div className="flex items-center gap-2">
                   <Clock className="w-3.5 h-3.5 text-slate-700" />
                   <span className="text-[9px] font-black text-slate-700 uppercase tracking-widest italic">Last Run: {r.lastRunAt ? new Date(r.lastRunAt).toLocaleDateString() : 'N/A'}</span>
                </div>
                <button className="flex items-center gap-1 text-[9px] font-black text-indigo-500 uppercase tracking-widest group-hover:translate-x-1 transition-transform">
                   Access Flow <ChevronRight className="w-3 h-3" />
                </button>
             </div>
          </div>
        ))}

        {reports.length === 0 && (
          <div className="col-span-full py-24 text-center bg-slate-950/20 rounded-[48px] border border-dashed border-slate-800 opacity-50 grayscale">
             <FileBarChart className="w-16 h-16 text-slate-700 mx-auto mb-4" />
             <h3 className="text-xl font-black text-slate-500 uppercase tracking-[0.4em] italic leading-tight">Flow Repository Empty</h3>
          </div>
        )}
      </div>
    </div>
  );
}
