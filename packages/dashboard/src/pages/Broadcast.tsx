import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Send, 
  Radio, 
  Loader2, 
  Zap, 
  Activity, 
  Users, 
  XCircle, 
  CheckCircle2,
  Signal
} from 'lucide-react';

export default function BroadcastPage() {
  const [broadcasts, setBroadcasts] = useState<any[]>([]);
  const [content, setContent] = useState('');
  const [platform, setPlatform] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      const res = await api.getBroadcasts();
      setBroadcasts(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { loadData(); }, []);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setSending(true);
    try {
      const res = await api.createBroadcast(content, platform || undefined);
      setBroadcasts((prev) => [res.data, ...prev]);
      setContent('');
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create broadcast');
    } finally {
      setSending(false);
    }
  };

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Signal Towers...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Radio className="w-5 h-5 text-rose-500" />
            <span className="text-rose-400 text-[10px] font-black uppercase tracking-[0.3em]">Mass Communiqué</span>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tight uppercase italic mb-1">Signal Broadcast</h1>
          <p className="text-slate-500 font-medium text-sm">Disseminate critical maintenance updates, marketing alerts, or system notifications.</p>
        </div>

        <div className="px-6 py-4 bg-slate-900/40 border border-slate-800 rounded-[24px] backdrop-blur-xl">
           <div className="flex items-center gap-3 text-emerald-500">
              <Signal className="w-4 h-4" />
              <span className="text-[10px] font-black uppercase tracking-widest italic animate-pulse">Omni-Channel Sync Active</span>
           </div>
        </div>
      </div>

      {/* Broadcast Form */}
      <div className="relative group bg-slate-950/40 border border-slate-800/80 rounded-[48px] p-8 md:p-10 backdrop-blur-3xl overflow-hidden shadow-2xl">
         <div className="absolute -left-24 -top-24 w-64 h-64 bg-rose-600/10 blur-[100px] pointer-events-none" />
         
         <form onSubmit={handleSend} className="relative z-10">
            <div className="flex items-center gap-3 mb-6">
               <Zap className="w-5 h-5 text-indigo-500" />
               <h2 className="text-lg font-black text-white uppercase italic tracking-tight underline decoration-indigo-500 decoration-2 underline-offset-8">New Sequence Dispatch</h2>
            </div>

            <div className="space-y-6">
               <div className="relative group/text">
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Enter broadcast message content..."
                    className="w-full bg-slate-900/50 border border-slate-800 text-white p-8 rounded-[32px] outline-none focus:border-indigo-500/50 focus:ring-4 focus:ring-indigo-500/5 transition-all min-h-[180px] font-bold text-sm leading-relaxed placeholder:text-slate-700 placeholder:italic"
                    required
                  />
                  <div className="absolute bottom-6 right-8 text-[9px] font-black text-slate-700 uppercase tracking-widest pointer-events-none">
                     Length: {content.length} characters
                  </div>
               </div>

               <div className="flex flex-col sm:flex-row items-center gap-6 pt-4">
                  <div className="flex items-center gap-4 bg-slate-950/50 p-2 rounded-2xl border border-slate-800">
                     <select
                       value={platform}
                       onChange={(e) => setPlatform(e.target.value)}
                       className="bg-transparent text-slate-300 px-6 py-2 rounded-xl outline-none focus:text-white transition-colors text-[10px] font-black uppercase tracking-widest cursor-pointer"
                     >
                       <option value="">Full Cluster (All)</option>
                       <option value="WHATSAPP">WhatsApp Hub</option>
                       <option value="TELEGRAM">Telegram Bot</option>
                     </select>
                  </div>

                  <button
                    type="submit"
                    disabled={sending || !content.trim()}
                    className="w-full sm:w-auto sm:ml-auto px-12 py-5 bg-gradient-to-r from-rose-600 to-rose-500 text-white font-black text-[10px] uppercase tracking-[0.2em] rounded-[24px] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl shadow-rose-600/30 disabled:opacity-30 disabled:grayscale flex items-center justify-center gap-3"
                  >
                    {sending ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                    Ignite Broadcast
                  </button>
               </div>
            </div>
         </form>
      </div>

      {/* History Stream */}
      <div className="space-y-6 pt-6">
         <div className="flex items-center gap-3 px-2">
            <Activity className="w-5 h-5 text-slate-500" />
            <h2 className="text-xl font-black text-white uppercase italic tracking-tight">Transmission Logs</h2>
         </div>

         <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
            {broadcasts.length === 0 ? (
              <div className="col-span-full py-24 text-center bg-slate-950/20 rounded-[48px] border border-dashed border-slate-800 opacity-50">
                 <Radio className="w-12 h-12 text-slate-700 mx-auto mb-4" />
                 <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Temporal silence — No broadcasts found</p>
              </div>
            ) : (
              broadcasts.slice(0, 10).map((b) => (
                <div key={b.id} className="bg-slate-950/40 border border-slate-800/80 p-8 rounded-[40px] hover:bg-slate-900 transition-all duration-500 backdrop-blur-2xl relative overflow-hidden group">
                   <div className="absolute right-0 top-0 bottom-0 w-1 bg-rose-600 hidden group-hover:block" />
                   
                   <div className="flex justify-between items-start mb-6">
                      <div className="flex items-center gap-2">
                         <span className="bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest italic">{b.targetPlatform || 'CLUSTER'}</span>
                         <span className={`px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest border ${
                           b.status === 'SENT' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-amber-500/10 text-amber-500 border-amber-500/20 active:animate-pulse'
                         }`}>{b.status}</span>
                      </div>
                      <div className="text-[9px] font-black text-slate-600 uppercase tracking-widest">{new Date(b.createdAt).toLocaleString()}</div>
                   </div>

                   <p className="text-slate-300 font-bold text-sm leading-relaxed mb-8 line-clamp-3 italic group-hover:text-white transition-colors">
                      "{b.content}"
                   </p>

                   <div className="grid grid-cols-3 gap-3 border-t border-slate-800/50 pt-6">
                      <div className="flex flex-col items-center text-center">
                         <Users className="w-3.5 h-3.5 text-slate-500 mb-2" />
                         <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Target</span>
                         <span className="text-white text-[10px] font-black">{b.recipientCount}</span>
                      </div>
                      <div className="flex flex-col items-center text-center">
                         <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mb-2" />
                         <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Hits</span>
                         <span className="text-emerald-500 text-[10px] font-black">{b.successCount ?? 0}</span>
                      </div>
                      <div className="flex flex-col items-center text-center">
                         <XCircle className="w-3.5 h-3.5 text-rose-500 mb-2" />
                         <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Miss</span>
                         <span className="text-rose-500 text-[10px] font-black">{b.failureCount ?? 0}</span>
                      </div>
                   </div>
                </div>
              ))
            )}
         </div>
      </div>
    </div>
  );
}
