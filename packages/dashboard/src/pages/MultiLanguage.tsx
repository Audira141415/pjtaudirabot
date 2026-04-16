import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Globe, 
  Save, 
  MapPin, 
  Clock, 
  Languages, 
  Zap, 
  Activity, 
  ShieldCheck, 
  Info, 
  ChevronRight,
  Loader2,
  Calendar,
  Wallet,
  Hash
} from 'lucide-react';
import { toast } from '../components/Toast';

const LANGUAGES = [
  { code: 'id', label: 'Bahasa Indonesia', native: 'Indonesia' },
  { code: 'en', label: 'English', native: 'United States' },
  { code: 'ms', label: 'Bahasa Melayu', native: 'Malaysia' },
  { code: 'jv', label: 'Basa Jawa', native: 'Jawa' },
];

const TIMEZONES = [
  'Asia/Jakarta','Asia/Makassar','Asia/Jayapura','Asia/Singapore','Asia/Kuala_Lumpur','UTC',
];

export default function MultiLanguage() {
  const [pref, setPref] = useState({ language: 'id', timezone: 'Asia/Jakarta' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const load = async () => { 
    setLoading(true); 
    try { 
      const r = await api.getPreferences(); 
      if (r.data) { 
        setPref({ 
          language: (r.data.language as string) || 'id', 
          timezone: (r.data.timezone as string) || 'Asia/Jakarta' 
        }); 
      } 
    } catch {} 
    finally { setLoading(false); } 
  };

  useEffect(() => { load(); }, []);

  const save = async () => { 
    setSaving(true); 
    try { 
      await api.updatePreferences(pref); 
      toast({ type: 'success', title: 'PREFERENCES_SAVED', message: 'Regional settings synchronized.' });
    } catch {
      toast({ type: 'error', title: 'SYNC_FAILURE', message: 'Failed to update regional parameters.' });
    } finally { setSaving(false); } 
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Synchronizing Regional Nodes...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Globe className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Localization Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Language & Regional</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Calibrate global communication layers, temporal offsets, and regional data formatting protocols.</p>
        </div>

        <button 
           onClick={save} 
           disabled={saving}
           className="flex items-center gap-2 px-10 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all disabled:opacity-50"
        >
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Commmit Preferences
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
        {/* Core Preferences */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 shadow-2xl relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="relative z-10 space-y-8">
             <div className="flex items-center gap-3">
                <Languages className="w-5 h-5 text-indigo-500" />
                <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Preferensi Bahasa</h3>
             </div>
             
             <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Linguistic Hub (Dashboard Language)</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {LANGUAGES.map(l => (
                    <button 
                       key={l.code} 
                       onClick={() => setPref({...pref, language: l.code})} 
                       className={`px-6 py-5 rounded-[24px] border-2 text-left transition-all ${pref.language === l.code ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-500/10 shadow-lg shadow-indigo-500/10' : 'border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 hover:border-slate-300 dark:hover:border-slate-700'}`}
                    >
                      <p className={`font-black uppercase italic tracking-tight ${pref.language === l.code ? 'text-indigo-600 dark:text-white' : 'text-slate-900 dark:text-slate-300'}`}>{l.label}</p>
                      <p className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mt-1">{l.native} :: {l.code.toUpperCase()}</p>
                    </button>
                  ))}
                </div>
             </div>

             <div className="space-y-4 pt-4">
                <div className="flex items-center gap-2">
                   <MapPin className="w-4 h-4 text-slate-300 dark:text-slate-700" />
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest">Temporal Hub (Timezone Offset)</label>
                </div>
                <div className="relative group">
                   <select 
                      value={pref.timezone} 
                      onChange={e => setPref({...pref, timezone: e.target.value})} 
                      className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all appearance-none cursor-pointer"
                   >
                     {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                   </select>
                   <ChevronRight className="absolute right-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none rotate-90" />
                </div>
             </div>
          </div>
        </div>

        {/* Global Formatting Preview */}
        <div className="space-y-8">
           <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] p-10 backdrop-blur-3xl shadow-sm dark:shadow-none hover:shadow-xl transition-all h-full flex flex-col justify-between">
              <div>
                 <div className="flex items-center gap-3 mb-8">
                    <Activity className="w-5 h-5 text-emerald-500" />
                    <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Regional Output Matrix</h3>
                 </div>

                 <div className="space-y-6">
                   {[
                     { label: 'Temporal Date', icon: Calendar, value: new Date().toLocaleDateString(pref.language === 'id' ? 'id-ID' : 'en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }) },
                     { label: 'Neural Time', icon: Clock, value: new Date().toLocaleTimeString(pref.language === 'id' ? 'id-ID' : 'en-US') },
                     { label: 'Financial Scalar', icon: Wallet, value: new Intl.NumberFormat(pref.language === 'id' ? 'id-ID' : 'en-US', { style: 'currency', currency: 'IDR' }).format(1500000) },
                     { label: 'Numeric Density', icon: Hash, value: new Intl.NumberFormat(pref.language === 'id' ? 'id-ID' : 'en-US').format(1234567.89) },
                   ].map((item, i) => (
                     <div key={i} className="flex items-center justify-between p-6 bg-slate-50/50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/50 rounded-[28px] group hover:bg-white dark:group-hover:bg-slate-950/50 transition-all shadow-inner">
                        <div className="flex items-center gap-4">
                           <item.icon className="w-4 h-4 text-slate-200 dark:text-slate-700 group-hover:text-indigo-500 transition-colors" />
                           <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{item.label}</span>
                        </div>
                        <span className="font-mono text-xs font-black text-slate-900 dark:text-white italic uppercase">{item.value}</span>
                     </div>
                   ))}
                 </div>
              </div>

              <div className="pt-8 border-t border-slate-50 dark:border-slate-800/50 mt-10">
                 <div className="flex items-center gap-3 text-emerald-600/60 dark:text-emerald-500/40">
                    <ShieldCheck className="w-4 h-4" />
                    <span className="text-[9px] font-black uppercase tracking-[0.2em] italic">Localization standards enforced via International (i18n) Logic Core.</span>
                 </div>
              </div>
           </div>
        </div>
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <Zap className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Regional Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Globa-Temporal Nodes Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-indigo-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Regional settings affect all analytical charts and communication headers.</span>
         </div>
      </div>
    </div>
  );
}
