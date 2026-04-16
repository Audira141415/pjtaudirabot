import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { 
  Webhook, 
  Trash2, 
  Plus, 
  Loader2, 
  Copy, 
  CheckCircle, 
  Globe, 
  Shield, 
  Activity,
  Orbit,
  Layers,
  Cpu,
  Fingerprint,
  Radio,
  Target,
  Zap,
  RefreshCw,
  Clock,
  ExternalLink,
  ShieldCheck,
  Info,
  Lock,
  Smartphone,
  Server,
  Command,
  PlusCircle,
  Unplug
} from 'lucide-react';
import { toast } from '../components/Toast';

interface WebhookConfig {
  id: string;
  url: string;
  events: string[];
  secret: string | null;
  isActive: boolean;
  createdAt: string;
  lastTriggeredAt: string | null;
}

export default function WebhooksPage() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [form, setForm] = useState({ url: '', events: ['message.received'], secret: '' });

  const allEvents = [
    'message.received',
    'message.sent',
    'command.executed',
    'user.created',
    'user.updated',
    'broadcast.sent',
    'moderation.action',
  ];

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getWebhooks();
      setWebhooks(res.data as unknown as WebhookConfig[]);
    } catch (err) {
       toast({ type: 'error', title: 'REGISTRY_SYNC_FAILURE', message: 'Failed to access global connectivity matrices.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.url.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.createWebhook({
        url: form.url,
        events: form.events,
        secret: form.secret || undefined,
      });
      toast({ type: 'success', title: 'NODE_INITIALIZED', message: 'Outbound connectivity node has been registered successfully.' });
      setWebhooks((prev) => [res.data as unknown as WebhookConfig, ...prev]);
      setShowForm(false);
      setForm({ url: '', events: ['message.received'], secret: '' });
    } catch (err) {
       toast({ type: 'error', title: 'INITIALIZATION_FAILURE', message: err instanceof Error ? err.message : 'The connectivity protocol was rejected.' });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Decommission this connectivity node? This action is immutable.')) return;
    try {
      await api.deleteWebhook(id);
      toast({ type: 'success', title: 'NODE_DECOMMISSIONED', message: 'The relay node has been removed from the registry.' });
      setWebhooks((prev) => prev.filter((w) => w.id !== id));
    } catch (err) {
       toast({ type: 'error', title: 'DECOMMISSION_FAILURE', message: 'Failed to remove connectivity node.' });
    }
  };

  const toggleEvent = (event: string) => {
    setForm((prev) => ({
      ...prev,
      events: prev.events.includes(event)
        ? prev.events.filter((e) => e !== event)
        : [...prev.events, event],
    }));
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopied(id);
    toast({ type: 'info', title: 'IDENTIFIER_EXTRACTED', message: 'Endpoint URL copied to master clipboard.' });
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Orbit className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">External Connectivity Gateway</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Webhook Registry</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Configure outbound signal relays, event-driven architectures, and persistent connectivity nodes.</p>
        </div>

        <div className="flex items-center gap-4">
           <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 p-6 rounded-[40px] min-w-[180px] backdrop-blur-3xl group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all shadow-sm dark:shadow-none relative overflow-hidden">
              <div className="absolute right-0 top-0 bottom-0 w-1 bg-indigo-500/20 group-hover:bg-indigo-500 transition-colors" />
              <div className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1.5 font-mono italic">ACTIVE_NODES</div>
              <div className="text-3xl font-black text-slate-900 dark:text-white leading-none">{webhooks.length}</div>
           </div>
           <button
             onClick={() => setShowForm(!showForm)}
             className={`px-10 py-5 rounded-[28px] ${showForm ? 'bg-rose-600 shadow-rose-600/30' : 'bg-indigo-600 shadow-indigo-600/30'} text-white font-black text-[10px] uppercase tracking-[0.2em] hover:scale-[1.05] active:scale-95 transition-all shadow-2xl flex items-center gap-3 border-2 border-white/10`}
           >
             {showForm ? <Unplug className="w-4 h-4" /> : <PlusCircle className="w-4 h-4" />} {showForm ? 'ABORT_PROTOCOL' : 'INITIALIZE_NODE'}
           </button>
           <button 
              onClick={load} 
              className="p-5 bg-white dark:bg-slate-950 text-indigo-600 border border-slate-100 dark:border-slate-800 rounded-[24px] shadow-sm hover:border-indigo-500/30 active:scale-95 transition-all"
           >
             <RefreshCw className={`w-5 h-5 ${loading ? 'animate-spin' : ''}`} />
           </button>
        </div>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white dark:bg-slate-950/40 rounded-[56px] border border-indigo-500/20 p-12 shadow-sm dark:shadow-2xl backdrop-blur-3xl animate-in slide-in-from-top-8 duration-700 relative overflow-hidden group/form">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 blur-[120px] pointer-events-none" />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 relative z-10">
            <div className="space-y-8">
              <div className="group/field">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-600 group-hover/field:text-indigo-500 transition-colors uppercase tracking-[0.4em] mb-3 px-4 italic font-mono">ENDPOINT_URI_TRAJECTORY</label>
                <div className="relative">
                   <Globe className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-700 group-focus-within/field:text-indigo-500 transition-colors" />
                   <input
                    type="url"
                    value={form.url}
                    onChange={(e) => setForm({ ...form, url: e.target.value })}
                    placeholder="https://external-node.io/webhooks/ingress"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white pl-16 pr-8 py-6 rounded-[32px] outline-none focus:ring-8 focus:ring-indigo-500/5 focus:border-indigo-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold italic shadow-inner"
                    required
                  />
                </div>
              </div>

              <div className="group/field">
                <label className="block text-[11px] font-black text-slate-400 dark:text-slate-600 group-hover/field:text-emerald-500 transition-colors uppercase tracking-[0.4em] mb-3 px-4 italic font-mono">SIGNING_SECRET_KEYTOKEN</label>
                <div className="relative">
                  <ShieldCheck className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-300 dark:text-slate-700 group-focus-within/field:text-emerald-500 transition-colors" />
                  <input
                    type="password"
                    value={form.secret}
                    onChange={(e) => setForm({ ...form, secret: e.target.value })}
                    placeholder="HMAC-SHA256 ENTROPY_STRING"
                    className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-900 dark:text-white pl-16 pr-8 py-6 rounded-[32px] outline-none focus:ring-8 focus:ring-emerald-500/5 focus:border-emerald-500/50 transition-all placeholder:text-slate-200 dark:placeholder:text-slate-800 font-bold shadow-inner"
                  />
                </div>
              </div>
            </div>

            <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-white/5 p-10 rounded-[48px] shadow-inner">
              <label className="block text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-6 px-4 italic font-mono flex items-center gap-3">
                 <Radio className="w-4 h-4 text-indigo-500" /> SUBSCRIBED_EVENT_MATRICES
              </label>
              <div className="flex flex-wrap gap-3">
                {allEvents.map((event) => (
                  <button
                    key={event}
                    type="button"
                    onClick={() => toggleEvent(event)}
                    className={`px-5 py-3 rounded-2xl text-[9px] font-black uppercase tracking-widest border-2 transition-all hover:scale-105 active:scale-95 ${
                      form.events.includes(event)
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-2xl shadow-indigo-600/40'
                        : 'bg-white dark:bg-slate-950 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-700 hover:border-indigo-500/30 hover:text-indigo-600 shadow-sm'
                    }`}
                  >
                    {event}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="flex flex-col md:flex-row justify-between items-center gap-8 mt-12 pt-10 border-t-2 border-dashed border-slate-100 dark:border-white/5">
             <div className="flex items-center gap-4 text-slate-400 dark:text-slate-600">
                <Info className="w-5 h-5 text-indigo-500" />
                <p className="text-[10px] font-black uppercase tracking-widest italic leading-relaxed max-w-sm">Ensure the destination node is prepared to receive HTTPS POST payloads with standard JSON encoding.</p>
             </div>
             <div className="flex gap-4">
                <button type="submit" disabled={submitting || form.events.length === 0} className="px-12 py-5 rounded-[28px] bg-emerald-600 text-white text-[10px] font-black uppercase tracking-[0.3em] hover:scale-[1.05] border-2 border-emerald-400 shadow-2xl shadow-emerald-500/30 disabled:opacity-50 flex items-center gap-4 transition-all active:scale-95">
                  {submitting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Activity className="w-5 h-5" />} AUTHORIZE_RELAY
                </button>
             </div>
          </div>
        </form>
      )}

      {/* Webhook Stream Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {loading ? (
          Array(4).fill(0).map((_, i) => <div key={i} className="h-64 bg-white dark:bg-slate-950/40 border-2 border-slate-100 dark:border-slate-800 rounded-[48px] animate-pulse shadow-sm" />)
        ) : webhooks.length === 0 ? (
          <div className="col-span-full py-48 text-center bg-white dark:bg-slate-950/20 rounded-[64px] border-2 border-dashed border-slate-200 dark:border-slate-800 opacity-20 grayscale shadow-inner">
             <Unplug className="w-24 h-24 text-slate-300 dark:text-slate-700 mx-auto mb-8" />
             <h3 className="text-2xl font-black uppercase tracking-[0.6em] text-slate-400 dark:text-slate-600 italic">No Node Connections Detected</h3>
          </div>
        ) : (
          webhooks.map((wh) => (
            <div key={wh.id} className="group bg-white dark:bg-slate-950/40 rounded-[56px] border-2 border-slate-100 dark:border-slate-800/80 p-10 transition-all duration-700 hover:border-indigo-500/30 hover:shadow-2xl hover:shadow-indigo-600/5 relative overflow-hidden backdrop-blur-3xl">
              <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-40 transition-opacity">
                 <Radio className="w-32 h-32 text-indigo-500" />
              </div>
              
              <div className="flex flex-col relative z-10">
                <div className="flex items-start justify-between mb-8">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-4 mb-4">
                      <div className={`w-3.5 h-3.5 rounded-full ${wh.isActive ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse' : 'bg-slate-400 shadow-inner'}`} />
                      <span className="font-mono text-[11px] font-black text-slate-900 dark:text-white truncate italic tracking-tighter uppercase underline decoration-indigo-500/20 underline-offset-4 decoration-2 max-w-[280px]">{wh.url}</span>
                      <button
                        onClick={() => copyToClipboard(wh.url, wh.id)}
                        className="p-2.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-slate-300 hover:text-indigo-600 hover:border-indigo-500/50 transition-all shadow-inner active:scale-95"
                      >
                        {copied === wh.id ? <CheckCircle className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                    
                    <div className="flex flex-wrap gap-2.5 mb-8">
                      {wh.events.map((ev) => (
                        <span key={ev} className="px-4 py-1.5 rounded-xl bg-slate-50/50 dark:bg-slate-900/50 text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-widest border border-slate-100 dark:border-slate-800/40 shadow-inner group-hover:border-indigo-500/20 group-hover:text-indigo-600 transition-colors"># {ev}</span>
                      ))}
                    </div>
                  </div>
                  
                  <button 
                    onClick={() => handleDelete(wh.id)} 
                    className="w-14 h-14 bg-white dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl text-slate-200 dark:text-slate-800 hover:text-rose-600 hover:border-rose-500/50 transition-all active:scale-95 shadow-sm group-hover:scale-110 flex items-center justify-center"
                  >
                    <Trash2 className="w-6 h-6" />
                  </button>
                </div>

                <div className="grid grid-cols-2 lg:grid-cols-3 gap-6 pt-8 border-t border-slate-100 dark:border-white/5">
                  <div className="flex flex-col">
                    <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">INITIALIZED</span>
                    <div className="flex items-center gap-2">
                       <Clock className="w-4 h-4 text-indigo-500" />
                       <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{new Date(wh.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                  {wh.lastTriggeredAt ? (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">LAST_RELAY</span>
                      <div className="flex items-center gap-2">
                         <Activity className="w-4 h-4 text-emerald-500" />
                         <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-tighter">{new Date(wh.lastTriggeredAt).toLocaleTimeString()}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">LAST_RELAY</span>
                      <span className="text-xs font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest">---</span>
                    </div>
                  )}
                  {wh.secret ? (
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">SECURITY_NODE</span>
                       <div className="px-4 py-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-500 rounded-xl flex items-center gap-2 shadow-inner">
                          <Lock className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">ENCRYPTED</span>
                       </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-end">
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-2 font-mono italic">SECURITY_NODE</span>
                       <div className="px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-slate-300 dark:text-slate-700 rounded-xl flex items-center gap-2 shadow-inner">
                          <Info className="w-3.5 h-3.5" />
                          <span className="text-[9px] font-black uppercase tracking-widest">STANDARD</span>
                       </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-10 rounded-[48px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-8 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-6">
            <div className="p-5 bg-indigo-500/10 rounded-3xl border-2 border-indigo-500/20 text-indigo-600 dark:text-indigo-400">
               <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
               <h4 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] mb-2 italic">Connectivity Strategy</h4>
               <p className="text-base font-black text-slate-900 dark:text-white italic tracking-tighter uppercase">External Relay Subsystems Synchronized</p>
            </div>
         </div>
         <div className="px-8 py-4 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[28px] flex items-center gap-4">
            <Info className="w-5 h-5 text-indigo-500" />
            <span className="text-[10px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic max-w-sm line-clamp-2">Registry management ensures 100% precision in outbound connectivity architectures across all functional nodes.</span>
         </div>
      </div>
    </div>
  );
}
