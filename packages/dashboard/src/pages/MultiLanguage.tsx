import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Globe, Save } from 'lucide-react';

const LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia' },
  { code: 'en', label: 'English' },
  { code: 'ms', label: 'Bahasa Melayu' },
  { code: 'jv', label: 'Basa Jawa' },
];

const TIMEZONES = [
  'Asia/Jakarta','Asia/Makassar','Asia/Jayapura','Asia/Singapore','Asia/Kuala_Lumpur','UTC',
];

export default function MultiLanguage() {
  const [pref, setPref] = useState({ language: 'id', timezone: 'Asia/Jakarta' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => { setLoading(true); try { const r = await api.getPreferences(); if (r.data) { setPref({ language: (r.data.language as string) || 'id', timezone: (r.data.timezone as string) || 'Asia/Jakarta' }); } } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => { setSaving(true); try { await api.updatePreferences(pref); } catch {} finally { setSaving(false); } };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6"><Globe className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">Language & Regional</h1></div>

      <div className="max-w-xl">
        <div className="bg-white border rounded-xl p-6">
          <h3 className="font-bold mb-4">Preferensi Bahasa</h3>
          
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Bahasa Dashboard</label>
              <div className="grid grid-cols-2 gap-2">
                {LANGUAGES.map(l => (
                  <button key={l.code} onClick={() => setPref({...pref, language: l.code})} className={`p-3 rounded-xl border-2 text-left transition-all ${pref.language === l.code ? 'border-brand-500 bg-brand-50' : 'border-gray-200 hover:border-gray-300'}`}>
                    <p className="font-medium">{l.label}</p>
                    <p className="text-xs text-gray-500">{l.code.toUpperCase()}</p>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Timezone</label>
              <select value={pref.timezone} onChange={e => setPref({...pref, timezone: e.target.value})} className="w-full border rounded-lg px-3 py-2">
                {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
              </select>
            </div>

            <button onClick={save} disabled={saving} className="flex items-center gap-2 bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600 disabled:opacity-50">
              <Save className="w-4 h-4" />
              {saving ? 'Menyimpan...' : 'Simpan Preferensi'}
            </button>
          </div>
        </div>

        <div className="bg-white border rounded-xl p-6 mt-4">
          <h3 className="font-bold mb-4">Format Regional</h3>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Tanggal</span><span className="font-mono">{new Date().toLocaleDateString(pref.language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Waktu</span><span className="font-mono">{new Date().toLocaleTimeString(pref.language === 'id' ? 'id-ID' : 'en-US')}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Mata Uang</span><span className="font-mono">{new Intl.NumberFormat(pref.language === 'id' ? 'id-ID' : 'en-US', { style: 'currency', currency: 'IDR' }).format(1500000)}</span></div>
            <div className="flex justify-between"><span className="text-gray-500">Angka</span><span className="font-mono">{new Intl.NumberFormat(pref.language === 'id' ? 'id-ID' : 'en-US').format(1234567.89)}</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
