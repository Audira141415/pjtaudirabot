import { useEffect, useState, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { 
  ShieldCheck, 
  Cpu, 
  Database, 
  RefreshCw, 
  Clock, 
  Settings, 
  QrCode, 
  Zap,
  HardDrive,
  Activity,
  Terminal,
  ShieldAlert
} from 'lucide-react';
import { api } from '../lib/api';

interface SystemComponent {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'error';
  latency?: number;
  details?: string;
  lastCheck: string;
  meta?: any;
}

interface SystemMetrics {
  memoryUsedPct: number;
  memoryUsedGB: number;
  memoryTotalGB: number;
  cpuCores: number;
  loadAvg1m: number;
  uptime: number;
  activeSessions: number;
  recentErrors: number;
  openAlerts: number;
}

const AdminHub = () => {
  const [health, setHealth] = useState<{ components: SystemComponent[], metrics: SystemMetrics, overallStatus: string } | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [showQr, setShowQr] = useState(false);
  const [qrToken, setQrToken] = useState<string | null>(null);

  const fetchHealth = useCallback(async () => {
    try {
      const res = await api.getSystemHealth();
      setHealth(res.data);
      
      // Extract QR from WhatsApp component if available
      const waBot = res.data.components.find((c: any) => c.name.includes('WhatsApp'));
      if (waBot?.meta?.qr) {
        setQrToken(waBot.meta.qr);
      } else {
        setQrToken(null);
      }
    } catch (err) {
      console.error('Failed to fetch system health:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
    // Faster poll when QR is shown to catch the sequence
    const intervalTime = showQr ? 5000 : 30000;
    const interval = setInterval(fetchHealth, intervalTime);
    return () => clearInterval(interval);
  }, [fetchHealth, showQr]);

  const handleManualSync = async () => {
    setSyncing(true);
    try {
      await api.syncMaintenanceToSheets();
      alert('Synchronization started successfully!');
    } catch (err) {
      console.error('Sync failed:', err);
      alert('Failed to start sync');
    } finally {
      setSyncing(false);
      fetchHealth();
    }
  };

  if (loading) return (
    <div className="h-[60vh] flex flex-col items-center justify-center gap-4">
      <div className="animate-spin p-2 bg-indigo-500/10 rounded-full border-t-2 border-indigo-500 w-12 h-12" />
      <p className="text-slate-500 font-bold uppercase tracking-widest text-xs">Synchronizing Core Services...</p>
    </div>
  );

  return (
    <div className="space-y-8 pb-12">
      {/* Header Panel */}
      <div className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 p-12 opacity-10 pointer-events-none">
          <ShieldCheck className="w-64 h-64 text-indigo-400" />
        </div>
        
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6 font-primary">
          <div>
             <div className="flex items-center gap-3 mb-2">
                <span className={`w-2.5 h-2.5 rounded-full animate-pulse ${health?.overallStatus === 'healthy' ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                <h1 className="text-3xl font-black text-white tracking-tight">Super Admin Hub</h1>
             </div>
             <p className="text-slate-400 text-sm max-w-md font-medium">AudiraBot Central Nervous System. Monitor core services and manage bot connectivity from here.</p>
          </div>
          
          <div className="flex items-center gap-3">
             <button 
                onClick={handleManualSync}
                disabled={syncing}
                className="flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-slate-700 text-white rounded-2xl font-bold transition-all shadow-lg shadow-indigo-600/20 active:scale-95 text-sm"
             >
                <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? 'Syncing...' : 'Sync All Data'}
             </button>
             <button className="p-3 bg-slate-800 text-slate-300 rounded-2xl hover:bg-slate-700 hover:text-white transition-all border border-slate-700">
                <Settings className="w-5 h-5" />
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: System Status */}
        <div className="lg:col-span-2 space-y-8">
           <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                 <Activity className="w-4 h-4" /> Core Services Status
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                 {health?.components.map((c) => (
                    <div key={c.name} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm hover:border-indigo-100 transition-all group">
                       <div className="flex items-center justify-between mb-4">
                          <div className={`p-3 rounded-2xl ${
                             c.status === 'online' ? 'bg-emerald-50 text-emerald-600' : 'bg-rose-50 text-rose-600'
                          }`}>
                             {c.name.includes('DB') ? <Database className="w-5 h-5" /> : 
                              c.name.includes('Bot') ? <Zap className="w-5 h-5" /> : 
                              <Cpu className="w-5 h-5" />}
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                             c.status === 'online' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                          }`}>{c.status}</span>
                       </div>
                       <h3 className="font-bold text-slate-800 mb-1">{c.name}</h3>
                       <p className="text-xs text-slate-500 font-medium truncate mb-4">{c.details || 'Operational and responding normally.'}</p>
                       
                       {c.latency && (
                          <div className="flex items-center gap-2 text-[10px] font-bold text-slate-400 grayscale group-hover:grayscale-0 transition-all">
                             <Clock className="w-3 h-3 text-indigo-500" />
                             <span>LATENCY:</span>
                             <span className="text-indigo-600 font-black">{c.latency}ms</span>
                          </div>
                       )}

                       {c.name.includes('WhatsApp') && c.status === 'offline' && (
                          <button 
                             onClick={() => setShowQr(true)}
                             className="mt-4 w-full py-2.5 bg-slate-900 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 hover:bg-indigo-600 transition-colors"
                          >
                             <QrCode className="w-3 h-3" /> Get QR Code
                          </button>
                       )}
                    </div>
                 ))}
              </div>
           </section>

           <section>
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em] mb-4 flex items-center gap-2">
                 <Terminal className="w-4 h-4" /> Logic Control Center
              </h2>
              <div className="bg-slate-900 rounded-[32px] p-1 border border-slate-800">
                 <div className="flex bg-slate-800/50 rounded-[30px] p-2">
                    <div className="flex-1 p-8 text-center border-r border-slate-700/50">
                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Active Sessions</p>
                       <p className="text-4xl font-black text-white">{health?.metrics.activeSessions}</p>
                    </div>
                    <div className="flex-1 p-8 text-center border-r border-slate-700/50">
                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">Recent Errors</p>
                       <p className={`text-4xl font-black ${health?.metrics.recentErrors! > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                          {health?.metrics.recentErrors}
                       </p>
                    </div>
                    <div className="flex-1 p-8 text-center">
                       <p className="text-[10px] text-slate-500 font-black uppercase tracking-widest mb-1">System Uptime</p>
                       <p className="text-2xl font-black text-white py-1.5">{Math.floor(health?.metrics.uptime! / 3600)}h {Math.floor((health?.metrics.uptime! % 3600) / 60)}m</p>
                    </div>
                 </div>
              </div>
           </section>
        </div>

        {/* Right Column: Resource Usage */}
        <div className="space-y-8">
           <section className="bg-white rounded-[32px] p-8 border border-slate-100 shadow-xl">
              <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                 <HardDrive className="w-4 h-4" /> Resource Utilization
              </h2>
              
              <div className="space-y-6">
                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-bold text-slate-700">Memory (RAM)</span>
                       <span className="text-[10px] font-black text-slate-400">{health?.metrics.memoryUsedGB} / {health?.metrics.memoryTotalGB} GB</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                          className={`h-full transition-all duration-1000 ${health?.metrics.memoryUsedPct! > 80 ? 'bg-rose-500' : 'bg-indigo-500'}`} 
                          style={{ width: `${health?.metrics.memoryUsedPct}%` }} 
                       />
                    </div>
                 </div>

                 <div>
                    <div className="flex justify-between items-end mb-2">
                       <span className="text-sm font-bold text-slate-700">CPU Load (1m)</span>
                       <span className="text-[10px] font-black text-slate-400">{health?.metrics.loadAvg1m} Avg</span>
                    </div>
                    <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
                       <div 
                          className="h-full bg-emerald-500 transition-all duration-1000" 
                          style={{ width: `${Math.min(100, health?.metrics.loadAvg1m! * 10)}%` }} 
                       />
                    </div>
                 </div>
              </div>

              <div className="mt-8 pt-6 border-t border-slate-100 grid grid-cols-2 gap-4">
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">CPU Cores</p>
                    <p className="font-black text-slate-800 text-lg">{health?.metrics.cpuCores}</p>
                 </div>
                 <div className="text-center">
                    <p className="text-[10px] font-black text-slate-400 uppercase mb-1">Open Alerts</p>
                    <p className="font-black text-amber-600 text-lg">{health?.metrics.openAlerts}</p>
                 </div>
              </div>
           </section>

           <section className="bg-slate-900 rounded-[32px] p-8 border border-slate-800 shadow-xl">
              <div className="flex items-center gap-3 mb-6">
                 <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400">
                    <ShieldAlert className="w-5 h-5" />
                 </div>
                 <h2 className="text-sm font-bold text-white">Emergency Control</h2>
              </div>
              <p className="text-xs text-slate-500 font-medium mb-6 leading-relaxed">Kill switch for external bots. Recommended only during critical failures.</p>
              <div className="space-y-3">
                 <button className="w-full py-3 bg-rose-600 hover:bg-rose-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all active:scale-95">
                    Hard Reset All Bots
                 </button>
                 <button className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-400 rounded-2xl text-xs font-black uppercase tracking-widest transition-all">
                    Wipe Temp Sessions
                 </button>
              </div>
           </section>
        </div>
      </div>

      {/* QR Code Modal (Placeholder) */}
      {showQr && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 backdrop-blur-md bg-slate-900/60">
           <div className="bg-white rounded-[40px] p-12 max-w-sm w-full text-center shadow-2xl relative">
              <button onClick={() => setShowQr(false)} className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-800">
                 <XCircleIcon className="w-6 h-6" />
              </button>
              <h3 className="text-2xl font-black text-slate-900 mb-2">Snap to Connect</h3>
              <p className="text-sm text-slate-500 font-medium mb-8">Scan this QR code with your WhatsApp to link AudiraBot.</p>
              
              <div className="aspect-square bg-slate-50 flex items-center justify-center rounded-3xl border-2 border-dashed border-slate-200 mb-8 p-8">
                 {qrToken ? (
                    <QRCodeSVG 
                      value={qrToken} 
                      size={256} 
                      level="H"
                      includeMargin={true}
                      className="w-full h-full"
                    />
                 ) : (
                    <div className="text-center space-y-4">
                       <QrCode className="w-16 h-16 text-slate-300 mx-auto animate-pulse" />
                       <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Generating Token...</p>
                    </div>
                 )}
              </div>
              
              <button 
                onClick={() => fetchHealth()}
                className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl font-black uppercase tracking-widest text-xs transition-colors"
              >
                 Refresh QR Status
              </button>
           </div>
        </div>
      )}
    </div>
  );
};

// Helper for X icon since I missed it in imports
const XCircleIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
  </svg>
);

export default AdminHub;
