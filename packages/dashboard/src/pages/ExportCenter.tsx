import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Download, Plus, RefreshCw, FileSpreadsheet, FileText, FileCode, File } from 'lucide-react';

const MODULES = ['tickets','users','contacts','deals','campaigns','payments','faq','agents','tags','sentiment','inbox'];
const FORMATS = ['CSV','XLSX','PDF','JSON'];
const FORMAT_ICON: Record<string, React.ElementType> = { CSV: FileSpreadsheet, XLSX: FileSpreadsheet, PDF: FileText, JSON: FileCode };
const STATUS_COLOR: Record<string, string> = { PENDING: 'bg-gray-100 text-gray-600', PROCESSING: 'bg-amber-100 text-amber-700', COMPLETED: 'bg-emerald-100 text-emerald-700', FAILED: 'bg-red-100 text-red-700' };

export default function ExportCenter() {
  const [exports, setExports] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ module: 'tickets', format: 'CSV' });

  const load = async () => { setLoading(true); try { const r = await api.getExports(); setExports(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const create = async () => { await api.createExport(form); setShowForm(false); load(); setTimeout(load, 3000); };
  const fmtSize = (b: number) => { if (!b) return '-'; if (b < 1024) return b + ' B'; if (b < 1048576) return (b / 1024).toFixed(1) + ' KB'; return (b / 1048576).toFixed(1) + ' MB'; };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Download className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Export Center</h1></div>
        <div className="flex gap-2">
          <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Export Baru</button>
          <button onClick={load} className="p-2 hover:bg-gray-100 rounded-lg border"><RefreshCw className="w-4 h-4" /></button>
        </div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <h3 className="font-bold mb-3">Export Baru</h3>
          <div className="grid grid-cols-3 gap-3 mb-3">
            <select value={form.module} onChange={e => setForm({...form, module: e.target.value})} className="border rounded-lg px-3 py-2"><option value="" disabled>Pilih modul</option>{MODULES.map(m => <option key={m} value={m}>{m}</option>)}</select>
            <select value={form.format} onChange={e => setForm({...form, format: e.target.value})} className="border rounded-lg px-3 py-2">{FORMATS.map(f => <option key={f} value={f}>{f}</option>)}</select>
            <button onClick={create} className="bg-brand-500 text-white rounded-lg hover:bg-brand-600">Mulai Export</button>
          </div>
        </div>
      )}

      <div className="space-y-3">
        {exports.map(e => {
          const Icon = FORMAT_ICON[e.format] || File;
          return (
            <div key={e.id} className="bg-white border rounded-xl p-4 flex items-center gap-4">
              <div className="p-3 bg-gray-50 rounded-lg"><Icon className="w-5 h-5 text-gray-500" /></div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h3 className="font-bold">{e.module}</h3>
                  <span className="text-xs font-mono text-gray-400">.{e.format?.toLowerCase()}</span>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLOR[e.status] || 'bg-gray-100'}`}>{e.status}</span>
                </div>
                <div className="flex gap-4 text-xs text-gray-500">
                  {e.fileName && <span>{e.fileName}</span>}
                  {e.totalRows != null && <span>{e.totalRows} baris</span>}
                  <span>{fmtSize(e.fileSize || 0)}</span>
                  <span>{new Date(e.createdAt).toLocaleString('id-ID')}</span>
                  {e.completedAt && <span>Selesai: {new Date(e.completedAt).toLocaleString('id-ID')}</span>}
                </div>
                {e.error && <p className="text-xs text-red-500 mt-1">{e.error}</p>}
              </div>
              {e.fileUrl && <a href={e.fileUrl} className="p-2 hover:bg-gray-100 rounded-lg"><Download className="w-5 h-5" /></a>}
            </div>
          );
        })}
        {exports.length === 0 && <div className="text-center py-12 text-gray-400">Belum ada riwayat export</div>}
      </div>
    </div>
  );
}
