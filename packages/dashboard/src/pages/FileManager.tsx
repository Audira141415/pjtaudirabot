import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { FolderOpen, Trash2, Image, FileText, Film, Music, Download, Search, Plus, Upload, Loader2, X } from 'lucide-react';

const MIME_ICON: Record<string, React.ElementType> = { image: Image, video: Film, audio: Music };
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

  const load = async () => { setLoading(true); try { const r = await api.getFiles(category || undefined, page); setFiles(r.data ?? []); setTotal(r.total ?? 0); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, [category, page]);

  const remove = async (id: string) => { await api.deleteFile(id); load(); };

  const handleUpload = async () => {
    if (!form.originalName.trim() || !form.mimeType.trim()) return;
    setUploading(true);
    try {
      await api.uploadFile({ originalName: form.originalName, mimeType: form.mimeType, size: form.size ? Number(form.size) : 0, url: form.url, platform: form.platform, category: form.category });
      setForm({ originalName: '', mimeType: '', size: '', url: '', platform: 'WHATSAPP', category: 'other' });
      setShowUpload(false);
      load();
    } catch {} finally { setUploading(false); }
  };

  const fmtSize = (b: number) => { if (b < 1024) return b + ' B'; if (b < 1048576) return (b/1024).toFixed(1) + ' KB'; return (b/1048576).toFixed(1) + ' MB'; };

  const getIcon = (mime: string) => { const type = mime.split('/')[0]; return MIME_ICON[type] || FileText; };

  const filtered = files.filter(f => !search || f.originalName?.toLowerCase().includes(search.toLowerCase()));

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><FolderOpen className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">File Manager</h1></div>
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-500">{total} file total</span>
          <button onClick={() => setShowUpload(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-brand-500 text-white rounded-lg hover:bg-brand-600 text-sm"><Plus className="w-4 h-4" />Upload File</button>
        </div>
      </div>

      <div className="flex gap-3 mb-4">
        <div className="relative flex-1"><Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" /><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Cari file..." className="w-full pl-10 pr-3 py-2 border rounded-lg" /></div>
        <select value={category} onChange={e => { setCategory(e.target.value); setPage(1); }} className="border rounded-lg px-3 py-2">
          <option value="">Semua</option>{CATEGORIES.filter(Boolean).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
      </div>

      <div className="bg-white border rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50"><tr><th className="text-left p-3">File</th><th className="text-left p-3">Tipe</th><th className="text-left p-3">Ukuran</th><th className="text-left p-3">Platform</th><th className="text-left p-3">Upload</th><th className="text-left p-3">Download</th><th className="p-3"></th></tr></thead>
          <tbody>
            {filtered.map(f => {const Icon = getIcon(f.mimeType || ''); return (
              <tr key={f.id} className="border-t hover:bg-gray-50">
                <td className="p-3 flex items-center gap-2"><Icon className="w-5 h-5 text-gray-400 shrink-0" /><span className="truncate max-w-xs">{f.originalName}</span></td>
                <td className="p-3 text-gray-500">{f.mimeType}</td>
                <td className="p-3 text-gray-500">{fmtSize(f.size || 0)}</td>
                <td className="p-3"><span className="px-2 py-0.5 rounded text-xs bg-brand-50 text-brand-700">{f.platform || '-'}</span></td>
                <td className="p-3 text-xs text-gray-500">{new Date(f.createdAt).toLocaleDateString('id-ID')}</td>
                <td className="p-3 text-gray-500">{f.downloads || 0}</td>
                <td className="p-3 flex gap-1">
                  {f.url && <a href={f.url} target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-gray-100 rounded"><Download className="w-4 h-4" /></a>}
                  <button onClick={() => remove(f.id)} className="p-1.5 hover:bg-red-50 rounded"><Trash2 className="w-4 h-4 text-red-500" /></button>
                </td>
              </tr>
            );})}
            {filtered.length === 0 && <tr><td colSpan={7} className="text-center py-12 text-gray-400">Tidak ada file</td></tr>}
          </tbody>
        </table>
      </div>

      {total > 50 && <div className="flex justify-center gap-2 mt-4">{Array.from({length: Math.ceil(total / 50)}, (_, i) => <button key={i} onClick={() => setPage(i + 1)} className={`px-3 py-1 rounded ${page === i + 1 ? 'bg-brand-500 text-white' : 'bg-gray-100'}`}>{i + 1}</button>)}</div>}

      {showUpload && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Upload className="w-5 h-5 text-brand-500" />Upload File</h2>
              <button onClick={() => setShowUpload(false)} className="p-1 hover:bg-gray-100 rounded"><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="block text-sm font-medium mb-1">Original Name <span className="text-red-500">*</span></label><input value={form.originalName} onChange={e => setForm({ ...form, originalName: e.target.value })} placeholder="example.png" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">MIME Type <span className="text-red-500">*</span></label><input value={form.mimeType} onChange={e => setForm({ ...form, mimeType: e.target.value })} placeholder="image/png" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">Size (bytes)</label><input type="number" value={form.size} onChange={e => setForm({ ...form, size: e.target.value })} placeholder="0" className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div><label className="block text-sm font-medium mb-1">URL</label><input value={form.url} onChange={e => setForm({ ...form, url: e.target.value })} placeholder="https://..." className="w-full border rounded-lg px-3 py-2 text-sm" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-sm font-medium mb-1">Platform</label><select value={form.platform} onChange={e => setForm({ ...form, platform: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="WHATSAPP">WHATSAPP</option><option value="TELEGRAM">TELEGRAM</option></select></div>
                <div><label className="block text-sm font-medium mb-1">Category</label><select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full border rounded-lg px-3 py-2 text-sm"><option value="images">images</option><option value="documents">documents</option><option value="videos">videos</option><option value="audio">audio</option><option value="other">other</option></select></div>
              </div>
            </div>
            <div className="flex justify-end gap-2 mt-5">
              <button onClick={() => setShowUpload(false)} className="px-4 py-2 text-sm border rounded-lg hover:bg-gray-50">Cancel</button>
              <button onClick={handleUpload} disabled={uploading || !form.originalName.trim() || !form.mimeType.trim()} className="flex items-center gap-1.5 px-4 py-2 text-sm bg-brand-500 text-white rounded-lg hover:bg-brand-600 disabled:opacity-50">{uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}{uploading ? 'Uploading...' : 'Upload'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
