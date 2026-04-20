/**
 * @file AdminHub.tsx
 * @purpose Master Control Hub untuk monitoring kesehatan sistem dan manajemen bot.
 * @caller Dashboard UI (/admin)
 * @dependencies api.ts (Backend Bridge), lucide-react, qrcode.react
 * @functions fetchHealth, handleManualSync, handleModularPurge, handleHardReset, handleFlushSessions
 * @side_effects Telemetry sync, data purging, global Redis cache reset, WhatsApp bot QR binding.
 */

import { useEffect, useState } from 'react';
import { api, SystemHealthData } from '../lib/api';
import { 
  ShieldCheck, RefreshCw, Trash2, Database, Zap, Cpu, 
  Activity, Settings, QrCode, BrainCircuit, AlertTriangle,
  Terminal, TrendingUp, TrendingDown, Info, HardDrive, ShieldAlert,
  CheckCircle2, Orbit, Layers, Fingerprint, Radio, Target, Smartphone,
  Command, PlusCircle, Unplug, ShieldX, XCircle, Search,
  Clock, Users, Link2, Share2, Binary, Network, Map, 
  Eye, Compass, Boxes, ChevronRight, Scale
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import { Link } from 'react-router-dom';
import { toast } from '../components/Toast';

const PURGE_OPTIONS = [
  { id: 'tickets', label: 'WIPE_TICKET_LEDGER', icon: <Trash2 className="w-5 h-5" />, desc: 'Permanently purge all support tickets and resolution logs.', danger: true },
  { id: 'users', label: 'RESET_USER_POOL', icon: <Fingerprint className="w-5 h-5" />, desc: 'Terminate all user identity records and interaction history.', danger: true },
  { id: 'agents', label: 'FLUSH_AI_CONTEXT', icon: <Cpu className="w-5 h-5" />, desc: 'Reset AI agent configurations and short-term context memory.', danger: false },
  { id: 'logs', label: 'CLEAR_SYSTEM_LOGS', icon: <Activity className="w-5 h-5" />, desc: 'Purge historical performance telemetry and error archives.', danger: false },
];

interface Prediction {
  id: string;
  type: string;
  location: string;
  probability: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  reason: string;
  recommendation: string;
}

const NewBadge = ({ className = "" }: { className?: string }) => (
  <div className={`flex items-center gap-1.5 px-3 py-1 bg-amber-500 text-white rounded-full text-[8px] font-black uppercase tracking-widest shadow-xl shadow-amber-500/30 animate-in zoom-in-50 duration-500 ${className}`}>
    <span className="relative flex h-1.5 w-1.5">
      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
      <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-white"></span>
    </span>
    NEW_CORE_SYSTEM
  </div>
);

const AdminHub = () => {
  const [health, setHealth] = useState<SystemHealthData | null>(null);
  const [predictions, setPredictions] = useState<Prediction[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [purging, setPurging] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);
  const [showQr, setShowQr] = useState(false);
  const [showPurgeModal, setShowPurgeModal] = useState(false);
  const [selectedModules, setSelectedModules] = useState<string[]>([]);
  const [showLabs, setShowLabs] = useState(false);
  const [clusterStats, setClusterStats] = useState<any>(null);

  const fetchHealth = async () => {
    try {
      const res = await api.getSystemHealth();
      setHealth(res.data);
      const waBot = res.data.components.find((c: any) => c.name === 'WHATSAPP Bot');
      if (waBot && waBot.status !== 'online' && (waBot.meta as any)?.qr) {
        setQrToken((waBot.meta as any).qr);
      } else {
        setQrToken(null);
      }
    } catch (err) {
       toast({ type: 'warning', title: 'TELEMETRY_SYNC_WARNING', message: 'Unable to synchronize real-time system health.' });
    }
  };

  const fetchInsights = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_BASE_URL || ''}/api/insights/predictive`);
      const result = await res.json();
      setPredictions(result.data || []);
      
      // Fetch Cluster Stats if labs enabled
      const clusterRes = await api.getClusterStats();
      setClusterStats(clusterRes.metrics);
    } catch (err) {
      console.error('Failed to fetch AI insights');
    }
  };

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await Promise.all([fetchHealth(), fetchInsights()]);
      setLoading(false);
    };
    init();
    const interval = setInterval(fetchHealth, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleManualSync = async () => {
    setSyncing(true);
    toast({ type: 'info', title: 'MANUAL_SYNC_INITIALIZED', message: 'Triggering global data synchronization protocol...' });
    try {
      await api.manualSync();
      await fetchHealth();
      toast({ type: 'success', title: 'SYNC_PROTOCOL_SUCCESS', message: 'All core services and ledgers have been synchronized.' });
    } catch (err) {
      toast({ type: 'error', title: 'SYNC_FAILURE', message: 'Remote procedure call was rejected by the master node.' });
    } finally {
      setSyncing(false);
    }
  };

  const handleCleanupSchedules = async () => {
     if (!confirm('Cleanup invalid PM schedules? This will recover database buffer space.')) return;
     try {
        await api.cleanupInvalidSchedules();
        toast({ type: 'success', title: 'LOGIC_BUFFER_REPAIRED', message: 'Invalid scheduling fragments have been purged.' });
     } catch (err) {
        toast({ type: 'error', title: 'CLEANUP_FAILURE', message: 'Could not communicate with the scheduling engine.' });
     }
  };

  const handlePurgeResync = async () => {
    if (!confirm('CAUTION: This will wipe PM Sheets & resync current schedule metadata. Proceed with purge?')) return;
    setPurging(true);
    try {
      await api.syncMaintenanceToSheets();
      toast({ type: 'success', title: 'PM_RESET_EXECUTED', message: 'Maintenance sheets have been reset and resynced with core metadata.' });
      fetchHealth();
    } catch (err) {
      toast({ type: 'error', title: 'PURGE_FAILURE', message: 'An anomaly occurred during the PM resync protocol.' });
    } finally {
      setPurging(false);
    }
  };

  const toggleModule = (id: string) => {
    setSelectedModules(prev => prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]);
  };

  const handleModularPurge = async () => {
    if (!confirm(`CRITICAL: You are about to purge ${selectedModules.length} selected components. This action is immutable. Proceed?`)) return;
    setPurging(true);
    try {
      await api.purgeModularData(selectedModules);
      toast({ type: 'success', title: 'PURGE_PROTOCOL_COMPLETE', message: `${selectedModules.length} functional data streams have been terminated.` });
      setSelectedModules([]);
      setShowPurgeModal(false);
    } catch (err) {
      toast({ type: 'error', title: 'TERMINATION_FAILURE', message: 'Purge operation failed to reach technical completion.' });
    } finally {
      setPurging(false);
      fetchHealth();
    }
  };

  const handleHardReset = async () => {
    if (!confirm('ULTIMATE WARNING: This will flush ALL system cache in Redis including sessions and bot state. This cannot be undone. Execute Hard System Reset?')) return;
    setPurging(true);
    try {
      await api.hardResetSystem();
      toast({ type: 'success', title: 'SYSTEM_CACHE_FLUSHED', message: 'System cache has been terminated. Please re-login if required.' });
    } catch (err) {
      toast({ type: 'error', title: 'RESET_FAILURE', message: 'The hard reset sequence encountered a critical error.' });
    } finally {
      setPurging(false);
      fetchHealth();
    }
  };

  const handleFlushSessions = async () => {
    if (!confirm('Flush all redundant (expired/inactive) user sessions from the database?')) return;
    setPurging(true);
    try {
      await api.flushSessions();
      toast({ type: 'success', title: 'SESSIONS_FLUSHED', message: 'Redundant sessions have been purged from the core database.' });
    } catch (err) {
      toast({ type: 'error', title: 'FLUSH_FAILURE', message: 'Failed to complete session flush protocol.' });
    } finally {
      setPurging(false);
      fetchHealth();
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-6">
      <div className="w-14 h-14 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.5em] animate-pulse italic font-mono">Synchronizing Master Core Services...</span>
    </div>
  );

  return (
    <div className="space-y-12 pb-16 animate-in fade-in slide-in-from-bottom-12 duration-1000">
      {/* Selective Purge Modal */}
      {showPurgeModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/90 backdrop-blur-xl animate-in fade-in duration-500">
          <div className="bg-white dark:bg-slate-900 rounded-[56px] w-full max-w-3xl overflow-hidden shadow-2xl border-2 border-rose-500/20 relative group/modal">
             <div className="absolute -top-32 -right-32 w-80 h-80 bg-rose-600/5 blur-[120px] pointer-events-none" />
             
            <div className="p-12 border-b-2 border-slate-100 dark:border-white/5 flex justify-between items-center bg-slate-50/50 dark:bg-slate-950/50 relative z-10">
              <div>
                <div className="flex items-center gap-3 mb-2">
                   <ShieldX className="w-6 h-6 text-rose-600" />
                   <h2 className="text-4xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic">Selective Purge Center</h2>
                </div>
                <p className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-widest font-mono italic">Pilih kategori data untuk terminasi permanen dari Database & GSheets.</p>
              </div>
              <button 
                 onClick={() => setShowPurgeModal(false)} 
                 className="w-14 h-14 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all active:scale-90"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>

            <div className="p-12 grid grid-cols-1 md:grid-cols-2 gap-6 max-h-[50vh] overflow-y-auto bg-white dark:bg-slate-900 custom-scrollbar relative z-10">
              {PURGE_OPTIONS.map((opt) => (
                <div 
                  key={opt.id}
                  onClick={() => toggleModule(opt.id)}
                  className={`p-8 rounded-[40px] border-2 cursor-pointer transition-all ${
                    selectedModules.includes(opt.id) 
                      ? 'border-rose-600 bg-rose-50/50 dark:bg-rose-600/10 shadow-[inner_0_0_20px_rgba(225,29,72,0.1)] scale-[0.98]' 
                      : 'border-slate-100 dark:border-slate-800/80 hover:border-indigo-500/30 bg-white dark:bg-slate-950/40 hover:bg-slate-50 dark:hover:bg-slate-900 shadow-sm'
                  }`}
                >
                  <div className="flex items-center gap-4 mb-4">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${selectedModules.includes(opt.id) ? 'bg-rose-600 text-white shadow-xl shadow-rose-600/30 rotate-6' : 'bg-slate-50 dark:bg-slate-900 text-slate-400 dark:text-slate-600 border border-slate-100 dark:border-slate-800'}`}>
                      {opt.icon}
                    </div>
                    <span className={`text-sm font-black uppercase tracking-widest italic font-mono ${selectedModules.includes(opt.id) ? 'text-rose-600' : 'text-slate-900 dark:text-white'}`}>{opt.label}</span>
                  </div>
                  <p className={`text-[11px] font-black uppercase tracking-tighter leading-relaxed italic ${selectedModules.includes(opt.id) ? 'text-rose-900/60 dark:text-rose-400/60' : 'text-slate-400 dark:text-slate-600'}`}>{opt.desc}</p>
                </div>
              ))}
            </div>

            <div className="p-12 bg-slate-50 dark:bg-slate-950/80 border-t-2 border-slate-100 dark:border-white/5 flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
              <div className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] italic font-mono flex items-center gap-3">
                <Target className="w-5 h-5 text-rose-600" /> {selectedModules.length} CATEGORIES_QUEUED_FOR_TERMINATION
              </div>
              <div className="flex gap-4 w-full md:w-auto">
                <button 
                  onClick={() => setShowPurgeModal(false)}
                  className="flex-1 md:flex-none px-10 py-5 text-[11px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-widest hover:text-slate-900 dark:hover:text-white transition-colors"
                >
                  ABORT_ACTION
                </button>
                <button 
                  onClick={handleModularPurge}
                  disabled={selectedModules.length === 0 || purging}
                  className="flex-1 md:flex-none px-12 py-5 bg-rose-600 hover:bg-rose-700 disabled:opacity-30 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.3em] transition-all shadow-2xl shadow-rose-600/40 active:scale-95 border-2 border-rose-400/20"
                >
                  {purging ? 'PROTO_EXECUTING...' : 'EXECUTE_PURGE_SEQUENCE'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Primary Control Hub Panel */}
      <div className="bg-white dark:bg-slate-950/40 rounded-[64px] p-12 border-2 border-slate-100 dark:border-slate-800/80 shadow-sm dark:shadow-none relative overflow-hidden transition-all hover:border-indigo-500/20 backdrop-blur-3xl group/hub">
        <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover/hub:opacity-10 pointer-events-none transition-opacity">
          <ShieldCheck className="w-[400px] h-[400px] text-indigo-500" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10">
          <div>
             <div className="flex items-center gap-4 mb-4">
                <div className={`w-4 h-4 rounded-full animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.8)] ${health?.overallStatus === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500 shadow-rose-500/50'}`} />
                <h1 className="text-5xl font-black text-slate-950 dark:text-white tracking-tighter uppercase italic leading-none underline decoration-indigo-600/30 underline-offset-[16px] decoration-8">Super Admin Hub</h1>
             </div>
             <p className="text-slate-500 dark:text-slate-400 text-base max-w-xl font-medium leading-relaxed mt-4 drop-shadow-sm">AudiraBot Central Nervous System. Monitor global core services health and manage bot connectivity protocols from this master terminal.</p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4">
             <div className="relative group/lab-btn">
                <NewBadge className="absolute -top-3 -right-2 z-20 group-hover/lab-btn:scale-110 transition-transform" />
                <button 
                   onClick={() => setShowLabs(!showLabs)}
                   className={`group flex items-center gap-4 px-8 py-5 rounded-[28px] font-black uppercase text-[10px] tracking-[0.3em] transition-all border-2 active:scale-95 shadow-2xl ${
                     showLabs 
                       ? 'bg-emerald-500 border-emerald-400 text-white shadow-emerald-500/20' 
                       : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-indigo-400 dark:text-slate-700 dark:hover:text-indigo-400 shadow-black/20'
                   }`}
                >
                   <Binary className={`w-5 h-5 ${showLabs ? 'animate-pulse' : 'group-hover:rotate-12 transition-transform'}`} />
                   {showLabs ? 'INTELLIGENCE_LAB_ACTIVE' : 'ACTIVATE_LABS_MODE'}
                </button>
             </div>
             <button 
                onClick={handleManualSync}
                disabled={syncing || purging}
                className="flex items-center gap-4 px-10 py-5 bg-indigo-600 hover:scale-[1.05] disabled:opacity-50 text-white rounded-[28px] font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl shadow-indigo-600/40 active:scale-95 border-2 border-indigo-400/20"
             >
                <RefreshCw className={`w-5 h-5 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'SYNC_ACTIVE...' : 'SYNC_ALL_DATA_STREAMS'}
             </button>
             <button 
                onClick={() => setShowPurgeModal(true)}
                disabled={syncing || purging}
                className="flex items-center gap-4 px-10 py-5 bg-rose-600 hover:scale-[1.05] disabled:opacity-50 text-white rounded-[28px] font-black uppercase text-[10px] tracking-[0.2em] transition-all shadow-2xl shadow-rose-600/40 active:scale-95 border-2 border-rose-400/20"
             >
                <Trash2 className={`w-5 h-5 ${purging ? 'animate-bounce' : ''}`} />
                PURGE_TERMINAL
             </button>
             <div className="flex gap-2">
                <button 
                   onClick={handleCleanupSchedules}
                   disabled={syncing || purging}
                   title="Cleanup Invalid PM Schedules"
                   className="p-5 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-700 rounded-2xl hover:text-rose-600 hover:border-rose-500/30 transition-all border border-slate-100 dark:border-slate-800 shadow-sm"
                >
                   <Trash2 className="w-6 h-6" />
                </button>
                <button className="p-5 bg-white dark:bg-slate-900 text-slate-400 dark:text-slate-700 rounded-2xl hover:text-indigo-600 hover:border-indigo-500/30 transition-all border border-slate-100 dark:border-slate-800 shadow-sm">
                   <Settings className="w-6 h-6" />
                </button>
             </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Left Tactic Panel: System Health & AI Insights */}
        <div className="lg:col-span-2 space-y-12">
           <section>
              <div className="flex items-center justify-between mb-8 px-4">
                 <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] flex items-center gap-4 font-mono italic">
                    <Orbit className="w-5 h-5 text-indigo-500" /> Core_Service_Availability_Matrix
                 </h2>
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">SLA_TARGET: 99.99%</div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                 {health?.components.map((c) => (
                    <div key={c.name} className="bg-white dark:bg-slate-950/40 rounded-[40px] p-8 border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-500 group relative overflow-hidden hover:border-indigo-500/30 hover:scale-[1.02] backdrop-blur-3xl">
                       <div className="absolute right-[-10px] top-[-10px] opacity-[0.03] group-hover:opacity-10 transition-opacity">
                          {c.name.includes('DB') ? <Database className="w-20 h-20" /> : <Zap className="w-20 h-20" />}
                       </div>
                       <div className="flex items-center justify-between mb-8 relative z-10">
                          <div className={`p-4 rounded-[20px] transition-all group-hover:rotate-12 border-2 ${
                             c.status === 'online' ? 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-100 dark:border-emerald-500/20' : 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20 shadow-[0_0_20px_rgba(225,29,72,0.2)] animate-pulse'
                          }`}>
                             {c.name.includes('DB') ? <Database className="w-6 h-6" /> : 
                              c.name.includes('Bot') ? <Smartphone className="w-6 h-6" /> : 
                              <Cpu className="w-6 h-6" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-[0.2em] px-5 py-2 rounded-full border-2 shadow-inner ${
                             c.status === 'online' ? 'bg-emerald-100/50 text-emerald-800 dark:bg-emerald-500/10 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-500/20' : 'bg-rose-100 text-rose-800 dark:bg-rose-500/20 dark:text-rose-400 border-rose-200 dark:border-rose-500/20'
                          }`}>{c.status.toUpperCase()}</span>
                       </div>
                       <h3 className="text-lg font-black text-slate-950 dark:text-white mb-2 uppercase italic tracking-tighter relative z-10">{c.name}</h3>
                       <p className="text-[11px] text-slate-500 dark:text-slate-500 font-black uppercase tracking-widest leading-relaxed mb-8 italic relative z-10">{c.details || 'Operational and responding to master requests normally.'}</p>
                       
                       <div className="flex items-center justify-between relative z-10 pt-6 border-t border-slate-100 dark:border-white/5">
                          {c.latency ? (
                             <div className="flex items-center gap-3 text-[10px] font-black text-slate-400 dark:text-slate-700 font-mono tracking-[0.2em] uppercase italic">
                                <Clock className="w-4 h-4 text-indigo-500" /> LATENCY: <span className="text-indigo-600 dark:text-indigo-500">{c.latency}MS</span>
                             </div>
                          ) : <div className="text-[10px] font-black text-slate-300 dark:text-slate-800 uppercase tracking-widest italic font-mono">LATENCY_STABLE</div>}
                          
                          {c.name.includes('WhatsApp') && c.status === 'offline' && (
                             <button 
                                onClick={() => setShowQr(true)}
                                className="px-6 py-2.5 bg-slate-950 dark:bg-white text-white dark:text-slate-950 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-indigo-600 dark:hover:bg-indigo-400 transition-all active:scale-95 shadow-xl shadow-black/20"
                             >
                                <QrCode className="w-4 h-4" /> RE_BIND_QR
                             </button>
                          )}
                       </div>
                    </div>
                 ))}
              </div>
           </section>

           {predictions.length > 0 && (
             <section>
                <div className="flex items-center justify-between mb-8 px-4">
                  <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] flex items-center gap-4 font-mono italic">
                      <BrainCircuit className="w-5 h-5 text-indigo-500" /> Infrastructure_Risk_Forecast
                  </h2>
                  <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">ENGINE: NEURAL_CORE_X1</div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                   {predictions.map((pred) => (
                      <div key={pred.id} className="bg-white dark:bg-slate-950/40 rounded-[48px] p-10 border-2 border-slate-100 dark:border-slate-800 shadow-sm transition-all duration-500 hover:scale-[1.03] group relative overflow-hidden backdrop-blur-3xl">
                         <div className="absolute top-0 right-0 p-12 opacity-[0.03] group-hover:opacity-10 transition-opacity pointer-events-none">
                            {pred.severity === 'critical' || pred.severity === 'high' ? <TrendingUp className="w-32 h-32 text-rose-500" /> : <TrendingDown className="w-32 h-32 text-emerald-500" />}
                         </div>

                         <div className="flex items-center justify-between mb-8 relative z-10">
                            <div className={`px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-[0.3em] font-mono border-2 shadow-inner ${
                                pred.severity === 'critical' ? 'bg-rose-600 text-white border-rose-400 animate-pulse' :
                                pred.severity === 'high' ? 'bg-orange-500/10 text-orange-500 border-orange-500/20' :
                                pred.severity === 'medium' ? 'bg-amber-500/10 text-amber-500 border-amber-500/20' :
                                'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                            }`}>
                               {pred.severity.toUpperCase()}_RISK
                               {pred.severity === 'critical' && <AlertTriangle className="inline-block w-3.5 h-3.5 ml-2" />}
                            </div>
                            <div className="flex flex-col items-end">
                               <span className="text-[9px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest mb-1 italic">PROBABILITY_SCALAR</span>
                               <span className="text-2xl font-black text-slate-950 dark:text-white italic tracking-tighter leading-none">{pred.probability}%</span>
                            </div>
                         </div>

                         <h3 className="text-2xl font-black text-slate-950 dark:text-white mb-2 uppercase italic tracking-tighter relative z-10">{pred.type}</h3>
                         <div className="inline-flex items-center gap-3 px-4 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl text-[10px] font-black text-indigo-600 dark:text-indigo-400 uppercase tracking-widest font-mono italic mb-8 relative z-10">
                            <Activity className="w-4 h-4" /> {pred.location.toUpperCase()}
                         </div>
                         
                         <div className="bg-slate-900 dark:bg-slate-900 rounded-[32px] p-8 mb-8 border border-white/5 shadow-inner group-hover:bg-slate-800/80 transition-all">
                            <p className="text-xs text-slate-400 dark:text-slate-400 leading-relaxed italic font-medium">"{pred.reason}"</p>
                         </div>

                         <div className="flex items-start gap-5 p-6 bg-indigo-600 text-white rounded-[32px] shadow-2xl shadow-indigo-600/30 border-2 border-indigo-400 relative z-10 group-hover:scale-[1.05] transition-transform">
                            <Info className="w-6 h-6 text-indigo-100 shrink-0" />
                            <p className="text-[12px] text-white font-black uppercase tracking-tight italic leading-relaxed">{pred.recommendation}</p>
                         </div>
                      </div>
                   ))}
                </div>
             </section>
            )}

            <section>
              <div className="flex items-center justify-between mb-8 px-4">
                 <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.5em] flex items-center gap-4 font-mono italic">
                    <Terminal className="w-5 h-5 text-indigo-500" /> Logic_Payload_Control
                 </h2>
                 <div className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono italic">REFRESH_RATE: 15S</div>
              </div>
              <div className="bg-white dark:bg-slate-950/40 rounded-[56px] p-2 border-2 border-slate-100 dark:border-slate-800 shadow-sm backdrop-blur-3xl overflow-hidden transition-all hover:border-indigo-500/20">
                  <div className="flex bg-slate-50/50 dark:bg-slate-900/40 rounded-[52px] p-4 gap-4">
                     {[
                       { label: 'ACTIVE_SESSIONS', value: health?.metrics.activeSessions, icon: Users, color: 'text-indigo-500' },
                       { label: 'RECENT_ERRORS', value: health?.metrics.recentErrors, icon: AlertTriangle, color: health?.metrics.recentErrors! > 0 ? 'text-rose-500' : 'text-emerald-500' },
                       { label: 'SYSTEM_UPTIME', value: `${Math.floor(health?.metrics.uptime! / 3600)}h ${Math.floor((health?.metrics.uptime! % 3600) / 60)}m`, icon: Clock, color: 'text-sky-500' }
                     ].map((m, i) => (
                       <div key={i} className={`flex-1 p-10 text-center rounded-[40px] transition-all hover:bg-white dark:hover:bg-slate-950 hover:shadow-2xl group/m ${i !== 2 ? 'border-r-2 border-slate-100/50 dark:border-white/5' : ''}`}>
                          <div className={`p-4 rounded-2xl bg-slate-100 dark:bg-slate-900 mx-auto w-fit mb-6 transition-all group-hover/m:rotate-12 border border-slate-200 dark:border-slate-800 ${m.color}`}>
                             <m.icon className="w-6 h-6" />
                          </div>
                          <p className="text-[11px] text-slate-400 dark:text-slate-600 font-black uppercase tracking-[0.3em] mb-3 font-mono italic">{m.label}</p>
                          <p className={`text-5xl font-black italic tracking-tighter drop-shadow-sm ${m.color === 'text-indigo-500' ? 'text-slate-900 dark:text-white' : m.color}`}>
                             {m.value}
                          </p>
                       </div>
                     ))}
                  </div>
              </div>
            </section>
        </div>

        {/* Right Resource Panel: HW Monitoring & Emergency Control */}
        <div className="space-y-12">
           <section className="bg-white dark:bg-slate-950/40 rounded-[56px] p-10 border-2 border-slate-100 dark:border-slate-800/80 shadow-sm dark:shadow-2xl backdrop-blur-3xl transition-all hover:border-indigo-500/20 group/res">
              <div className="absolute top-0 right-0 p-16 opacity-[0.03] group-hover/res:opacity-10 pointer-events-none transition-opacity">
                 <Cpu className="w-64 h-64 text-indigo-500" />
              </div>
              <h2 className="text-[11px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-[0.4em] mb-10 flex items-center gap-4 font-mono italic relative z-10">
                 <HardDrive className="w-6 h-6 text-indigo-500" /> Nodal_Resource_Utilization
              </h2>
              
              <div className="space-y-10 relative z-10">
                 <div className="group/metric">
                    <div className="flex justify-between items-end mb-4 px-2">
                       <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-3">
                          <MemoryStick className="w-4 h-4 text-indigo-500" /> SYSTEM_MEMORY
                       </span>
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-700 font-mono italic">{health?.metrics.memoryUsedGB} / {health?.metrics.memoryTotalGB} GB</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner group-hover/metric:h-6 transition-all">
                       <div 
                          className={`h-full transition-all duration-1000 shadow-[0_0_20px_rgba(0,0,0,0.5)] ${health?.metrics.memoryUsedPct! > 80 ? 'bg-rose-600' : 'bg-indigo-600'}`} 
                          style={{ width: `${health?.metrics.memoryUsedPct}%` }} 
                       />
                    </div>
                    <div className="mt-3 text-right">
                       <span className={`text-[10px] font-black uppercase tracking-widest font-mono italic ${health?.metrics.memoryUsedPct! > 80 ? 'text-rose-500 animate-pulse' : 'text-slate-400'}`}>USAGE: {health?.metrics.memoryUsedPct}%</span>
                    </div>
                 </div>

                 <div className="group/metric">
                    <div className="flex justify-between items-end mb-4 px-2">
                       <span className="text-xs font-black text-slate-900 dark:text-white uppercase tracking-widest italic flex items-center gap-3">
                          <Activity className="w-4 h-4 text-emerald-500" /> COMPUTE_ENGINE_LOAD
                       </span>
                       <span className="text-[10px] font-black text-slate-400 dark:text-slate-700 font-mono italic">{health?.metrics.loadAvg1m} AVG_1M</span>
                    </div>
                    <div className="h-4 w-full bg-slate-100 dark:bg-slate-900 rounded-full overflow-hidden border border-slate-200 dark:border-slate-800 shadow-inner group-hover/metric:h-6 transition-all">
                       <div 
                          className="h-full bg-emerald-600 transition-all duration-1000 shadow-[0_0_20px_rgba(16,185,129,0.5)]" 
                          style={{ width: `${Math.min(100, health?.metrics.loadAvg1m! * 10)}%` }} 
                       />
                    </div>
                    <div className="mt-3 text-right">
                       <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest font-mono italic">SCALAR: {Math.min(100, health?.metrics.loadAvg1m! * 10).toFixed(1)}%</span>
                    </div>
                 </div>
              </div>

              <div className="mt-12 pt-10 border-t-2 border-slate-100 dark:border-white/5 grid grid-cols-2 gap-8 relative z-10">
                 <div className="text-center group/sub">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase mb-3 font-mono italic">CPU_CORES</p>
                    <p className="font-black text-slate-900 dark:text-white text-3xl italic tracking-tighter group-hover/sub:scale-125 transition-transform">{health?.metrics.cpuCores}</p>
                 </div>
                 <div className="text-center group/sub">
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase mb-3 font-mono italic">OPEN_ALERTS</p>
                    <p className={`font-black text-3xl italic tracking-tighter group-hover/sub:scale-125 transition-transform ${health?.metrics.openAlerts! > 0 ? 'text-amber-500' : 'text-slate-900 dark:text-white'}`}>{health?.metrics.openAlerts}</p>
                 </div>
              </div>
           </section>

           <section className="bg-slate-900 dark:bg-slate-950 rounded-[56px] p-10 border-4 border-rose-600 overflow-hidden relative group/emergency shadow-2xl shadow-rose-900/40">
              <div className="absolute inset-0 bg-gradient-to-br from-rose-900/20 to-transparent pointer-events-none" />
              <div className="absolute right-[-40px] top-[-40px] opacity-10 group-hover/emergency:opacity-30 transition-opacity">
                 <ShieldX className="w-48 h-48 text-rose-500" />
              </div>
              
              <div className="flex items-center gap-5 mb-8 relative z-10">
                 <div className="p-4 rounded-[24px] bg-rose-600 text-white shadow-xl shadow-rose-600/40 group-hover/emergency:rotate-12 transition-all">
                    <ShieldAlert className="w-8 h-8" />
                 </div>
                 <div className="flex flex-col">
                    <h2 className="text-lg font-black text-white uppercase italic tracking-tighter leading-none mb-1">Emergency Protocol</h2>
                    <span className="text-[9px] font-black text-rose-500 uppercase tracking-[0.3em] font-mono italic">AUTHORIZATION_REQUIRED</span>
                 </div>
              </div>
              <p className="text-sm text-slate-400 dark:text-slate-500 font-black uppercase italic tracking-tight mb-10 leading-relaxed relative z-10 underline decoration-rose-500/20 underline-offset-8">Kill switch for external bots and nodal segments. Recommended only during terminal failures.</p>
              <div className="space-y-4 relative z-10">
                 <button 
                   onClick={handleHardReset}
                   disabled={purging}
                   className="w-full py-6 bg-rose-600 hover:bg-rose-700 text-white rounded-[24px] text-[11px] font-black uppercase tracking-[0.3em] transition-all active:scale-95 shadow-2xl border-2 border-rose-400 shadow-rose-600/30 disabled:opacity-50"
                 >
                    HARD_RESET_ALL_NODES
                 </button>
                 <button 
                   onClick={handleFlushSessions}
                   disabled={purging}
                   className="w-full py-5 bg-slate-800 hover:bg-slate-700 text-slate-500 dark:text-slate-600 rounded-[24px] text-[10px] font-black uppercase tracking-[0.3em] transition-all border border-white/5 active:scale-95 disabled:opacity-50"
                 >
                    FLUSH_REDUNDANT_SESSIONS
                 </button>
              </div>
           </section>
        </div>
      </div>

      {/* Connectivity Handshake Modal */}
      {showQr && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-8 backdrop-blur-3xl bg-slate-950/90 animate-in fade-in duration-500">
           <div className="bg-white dark:bg-slate-900 w-full max-w-lg rounded-[48px] p-12 border border-slate-200 dark:border-white/10 shadow-2xl relative overflow-hidden flex flex-col items-center text-center">
             <button onClick={() => setShowQr(false)} className="absolute top-8 right-8 p-3 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors">
                <XCircle className="w-6 h-6 text-slate-400" />
             </button>
             <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-3xl mb-8">
               <QrCode className="w-10 h-10 text-emerald-500" />
             </div>
             <h2 className="text-3xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter mb-4">Device Binding</h2>
             <p className="text-sm font-medium text-slate-500 dark:text-slate-400 mb-8 italic">Scan the QR code from WhatsApp on your mobile device to link the node.</p>
             
             <div className="bg-white p-6 rounded-3xl shadow-inner border border-slate-100 dark:border-slate-800">
                {qrToken ? (
                   <QRCodeSVG value={qrToken} size={256} className="mx-auto" />
                ) : (
                   <div className="w-[256px] h-[256px] flex flex-col items-center justify-center bg-slate-50 dark:bg-slate-950 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-800">
                      <RefreshCw className="w-8 h-8 text-slate-300 animate-spin mb-4" />
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center px-4">Waiting for node<br/>to regenerate payload</span>
                   </div>
                )}
             </div>
           </div>
        </div>
      )}

      {/* ── Strategic Intelligence Lab ────────────────────────────────────────── */}
      {showLabs && (
        <div className="pt-12 mt-12 border-t-4 border-emerald-500/20 animate-in slide-in-from-bottom-12 duration-1000">
          <div className="flex items-center justify-between mb-12">
            <div>
              <div className="flex items-center gap-4 mb-3">
                <div className="p-3 bg-emerald-500 text-white rounded-2xl shadow-xl shadow-emerald-500/20">
                  <Binary className="w-6 h-6" />
                </div>
                <h2 className="text-4xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter">Strategic Intelligence Lab</h2>
              </div>
              <p className="text-slate-500 dark:text-slate-400 text-sm font-black uppercase tracking-[0.2em] italic font-mono px-2">Experimental monitoring & pro-grade nodal oversight systems.</p>
            </div>
            <div className="bg-emerald-500/10 border border-emerald-500/20 px-6 py-3 rounded-2xl">
               <span className="text-[10px] font-black text-emerald-600 dark:text-emerald-400 uppercase tracking-widest animate-pulse flex items-center gap-2">
                 <ShieldCheck className="w-4 h-4" /> AUTH_LEVEL_4_GRANTED
               </span>
            </div>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
            {/* Clustering Intelligence Tile */}
            <div className="xl:col-span-2 bg-slate-900 rounded-[56px] border-4 border-emerald-500/30 p-12 relative overflow-hidden group/lab-tile">
               <div className="absolute top-0 right-0 p-12 opacity-5 group-hover/lab-tile:opacity-20 transition-opacity pointer-events-none">
                 <Boxes className="w-48 h-48 text-emerald-500" />
               </div>
               
               <div className="flex items-start justify-between mb-10 relative z-10">
                  <div>
                    <div className="flex items-center gap-2 mb-2">
                       <h3 className="text-2xl font-black text-white uppercase italic tracking-tighter">Smart Incident Clustering</h3>
                       <div className="px-2 py-0.5 bg-amber-500 text-white text-[7px] font-black rounded uppercase">NEW_PRO</div>
                    </div>
                    <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest font-mono">AUTOMATED_OUTAGE_DETECTION</p>
                  </div>
                  <div className="px-5 py-2 bg-emerald-500 text-white rounded-full text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/30">
                    LIVE_GRID
                  </div>
               </div>

               <div className="grid grid-cols-2 gap-8 relative z-10 mb-10">
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">CLUSTERS_TODAY</span>
                    <span className="text-4xl font-black text-white italic tracking-tighter">{clusterStats?.clustersCreated || 0}</span>
                  </div>
                  <div className="p-6 bg-white/5 rounded-3xl border border-white/5">
                    <span className="block text-[9px] font-black text-slate-500 uppercase tracking-widest mb-2 font-mono">MEMBERS_GROUPED</span>
                    <span className="text-4xl font-black text-white italic tracking-tighter">{clusterStats?.totalMembersGrouped || 0}</span>
                  </div>
               </div>

               <p className="text-sm text-slate-400 font-medium leading-relaxed italic mb-8 relative z-10">Neural core is grouping similar ticket signals to identify regional failures. Efficiency gain: <span className="text-emerald-400">+{clusterStats?.avgMembersPerCluster || 0}X compression</span>.</p>
               
               <Link 
                to="/incidents"
                className="inline-flex items-center gap-4 px-10 py-5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest transition-all shadow-xl shadow-emerald-600/20 active:scale-95 border-2 border-emerald-400 relative z-10"
               >
                 Open Incident Center <ChevronRight className="w-5 h-5" />
               </Link>
            </div>

            {/* Link Tiles */}
            <div className="xl:col-span-2 grid grid-cols-2 gap-8">
               {[
                 { label: 'Signal Bridge', desc: 'Live strategic terminal', icon: <Terminal className="w-7 h-7" />, color: 'bg-indigo-600', link: '/terminal' },
                 { label: 'Neural Peek', desc: 'Visualise AI user memory', icon: <BrainCircuit className="w-7 h-7" />, color: 'bg-sky-600', link: '/memory' },
                 { label: 'Nodal Radar', desc: 'Regional network sentinel', icon: <Network className="w-7 h-7" />, color: 'bg-amber-600', link: '/network' },
                 { label: 'Compliance', desc: 'Weighted SLA matrix', icon: <Scale className="w-7 h-7" />, color: 'bg-rose-600', link: '/sla-matrix' }
               ].map((tile, i) => (
                 <Link 
                  key={i}
                  to={tile.link}
                  className="bg-white dark:bg-slate-900 rounded-[48px] p-8 border-2 border-slate-100 dark:border-slate-800 flex flex-col items-center text-center justify-center hover:scale-[1.05] hover:border-emerald-500/30 transition-all group backdrop-blur-xl relative overflow-hidden"
                 >
                    <div className="absolute top-4 right-4 animate-pulse">
                       <div className="bg-amber-500 text-white text-[6px] font-black px-1.5 py-0.5 rounded-full">NEW</div>
                    </div>
                    <div className={`p-5 rounded-[24px] ${tile.color} text-white shadow-xl mb-6 group-hover:rotate-12 transition-transform`}>
                      {tile.icon}
                    </div>
                    <h4 className="text-xl font-black text-slate-900 dark:text-white uppercase italic tracking-tighter leading-none mb-2">{tile.label}</h4>
                    <p className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity font-mono">{tile.desc}</p>
                 </Link>
               ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const MemoryStick = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7v10m4-10v10m4-10v10m4-10v10m4-10v10M3 7h18a1 1 0 011 1v8a1 1 0 01-1 1H3a1 1 0 01-1-1V8a1 1 0 011-1z" />
  </svg>
);

export default AdminHub;
