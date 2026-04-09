import { useState, useEffect } from 'react';
import { api } from '../lib/api';

interface FAQItem {
  id: string;
  question: string;
  answer: string;
  category: string;
  keywords: string[];
  aliases: string[];
  priority: number;
  matchCount: number;
  isActive: boolean;
  createdAt: string;
}

export default function FAQManager() {
  const [items, setItems] = useState<FAQItem[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [category, setCategory] = useState('');
  const [search, setSearch] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FAQItem | null>(null);
  const [loading, setLoading] = useState(true);

  // Form fields
  const [fQuestion, setFQuestion] = useState('');
  const [fAnswer, setFAnswer] = useState('');
  const [fCategory, setFCategory] = useState('');
  const [fKeywords, setFKeywords] = useState('');
  const [fAliases, setFAliases] = useState('');
  const [fPriority, setFPriority] = useState(0);

  const load = async () => {
    setLoading(true);
    try {
      const filters: Record<string, string> = {};
      if (category) filters.category = category;
      if (search) filters.search = search;
      const res = await api.getFAQ(1, filters);
      setItems(res.data as unknown as FAQItem[]);
      setCategories(res.categories || []);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [category, search]);

  const resetForm = () => {
    setFQuestion(''); setFAnswer(''); setFCategory(''); setFKeywords(''); setFAliases(''); setFPriority(0);
    setEditing(null); setShowForm(false);
  };

  const handleEdit = (item: FAQItem) => {
    setEditing(item);
    setFQuestion(item.question);
    setFAnswer(item.answer);
    setFCategory(item.category || '');
    setFKeywords((item.keywords || []).join(', '));
    setFAliases((item.aliases || []).join(', '));
    setFPriority(item.priority);
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!fQuestion.trim() || !fAnswer.trim()) return;
    const payload = {
      question: fQuestion.trim(),
      answer: fAnswer.trim(),
      category: fCategory.trim() || undefined,
      keywords: fKeywords.split(',').map(k => k.trim()).filter(Boolean),
      aliases: fAliases.split(',').map(a => a.trim()).filter(Boolean),
      priority: fPriority,
    };
    if (editing) {
      await api.updateFAQ(editing.id, payload);
    } else {
      await api.createFAQ(payload);
    }
    resetForm();
    load();
  };

  const handleDelete = async (id: string) => {
    await api.deleteFAQ(id);
    load();
  };

  const totalMatches = items.reduce((s, i) => s + (i.matchCount || 0), 0);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">FAQ & Knowledge Base</h1>
          <p className="text-sm text-gray-500 mt-1">Kelola pertanyaan yang sering ditanyakan</p>
        </div>
        <button onClick={() => { resetForm(); setShowForm(true); }} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">+ Tambah FAQ</button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-indigo-600">{items.length}</p>
          <p className="text-xs text-gray-500">Total FAQ</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-emerald-600">{items.filter(i => i.isActive).length}</p>
          <p className="text-xs text-gray-500">Aktif</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-amber-600">{categories.length}</p>
          <p className="text-xs text-gray-500">Kategori</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4 text-center">
          <p className="text-2xl font-bold text-blue-600">{totalMatches}</p>
          <p className="text-xs text-gray-500">Total Match</p>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-3">
        <select className="px-3 py-2 border rounded-lg text-sm" value={category} onChange={e => setCategory(e.target.value)}>
          <option value="">Semua Kategori</option>
          {categories.map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <input className="flex-1 px-3 py-2 border rounded-lg text-sm" placeholder="Cari pertanyaan atau jawaban..." value={search} onChange={e => setSearch(e.target.value)} />
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-5 border-2 border-indigo-200">
          <h3 className="font-semibold mb-3">{editing ? 'Edit FAQ' : 'Tambah FAQ Baru'}</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Pertanyaan *</label>
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="Contoh: Bagaimana cara reset password?" value={fQuestion} onChange={e => setFQuestion(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Jawaban *</label>
              <textarea className="w-full px-3 py-2 border rounded-lg text-sm" rows={3} placeholder="Jawaban lengkap untuk pertanyaan di atas..." value={fAnswer} onChange={e => setFAnswer(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Kategori</label>
                <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="General" value={fCategory} onChange={e => setFCategory(e.target.value)} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioritas (0=tinggi)</label>
                <input type="number" className="w-full px-3 py-2 border rounded-lg text-sm" value={fPriority} onChange={e => setFPriority(Number(e.target.value))} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Keywords (pisah koma)</label>
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="reset, password, lupa" value={fKeywords} onChange={e => setFKeywords(e.target.value)} />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Alias Pertanyaan (pisah koma)</label>
              <input className="w-full px-3 py-2 border rounded-lg text-sm" placeholder="gimana reset pw, cara ganti password" value={fAliases} onChange={e => setFAliases(e.target.value)} />
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={resetForm} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-700">Batal</button>
              <button onClick={handleSubmit} className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700">
                {editing ? 'Update' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FAQ List */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-gray-400">Loading...</div>
      ) : items.length === 0 ? (
        <div className="bg-white rounded-xl shadow p-10 text-center text-gray-400">
          <p className="text-4xl mb-2">📚</p>
          <p>Belum ada FAQ. Tambahkan pertanyaan pertama!</p>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div key={item.id} className="bg-white rounded-xl shadow p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${item.isActive ? 'bg-emerald-500' : 'bg-gray-300'}`} />
                    <h3 className="font-semibold text-gray-800">{item.question}</h3>
                    {item.category && (
                      <span className="px-2 py-0.5 bg-gray-100 rounded-full text-xs text-gray-600">{item.category}</span>
                    )}
                    <span className="text-xs text-gray-400">Match: {item.matchCount || 0}x</span>
                  </div>
                  <p className="text-sm text-gray-600 mt-2 whitespace-pre-wrap">{item.answer}</p>
                  {item.keywords && item.keywords.length > 0 && (
                    <div className="flex gap-1 mt-2 flex-wrap">
                      {item.keywords.map((kw, i) => (
                        <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-600 rounded text-xs">#{kw}</span>
                      ))}
                    </div>
                  )}
                  {item.aliases && item.aliases.length > 0 && (
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {item.aliases.map((a, i) => (
                        <span key={i} className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded text-xs italic">"{a}"</span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-1 ml-3">
                  <button onClick={() => handleEdit(item)} className="px-2 py-1 text-sm bg-gray-100 hover:bg-gray-200 rounded">✏️</button>
                  <button onClick={() => handleDelete(item.id)} className="px-2 py-1 text-sm bg-red-50 hover:bg-red-100 text-red-600 rounded">🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
