import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { notificationStore, NotificationItem } from '../lib/notification-store';
import {
  LayoutDashboard,
  Users,
  Radio,
  FileText,
  Webhook,
  GitBranch,
  Ticket,
  Timer,
  Bell,
  Network,
  Server,
  ArrowRightLeft,
  ListTodo,
  FileBarChart,
  BrainCircuit,
  Brain,
  Settings,
  BellRing,
  Trash2,
  Wrench,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Megaphone,
  Inbox,
  ShieldCheck,
  BotMessageSquare,
  Key,
  BarChart3,
  Moon,
  Sun,
  Activity,
  User,
  Power,
  Terminal,
  Scale
} from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';

const sections = [
  {
    title: 'Core System',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Control Deck' },
      { to: '/terminal', icon: Terminal, label: 'Live Terminal' },
      { to: '/users', icon: Users, label: 'Identity Pulse' },
      { to: '/admin', icon: ShieldCheck, label: 'Admin Terminal' },
    ],
  },
  {
    title: 'Mission Operations',
    items: [
      { to: '/tickets', icon: Ticket, label: 'Signal Overrides' },
      { to: '/sla', icon: Timer, label: 'Compliance Grid' },
      { to: '/sla-matrix', icon: Scale, label: 'SLA Performance Matrix' },
      { to: '/alerts', icon: Bell, label: 'Active Signals' },
      { to: '/maintenance', icon: Wrench, label: 'Temporal Cycles' },
      { to: '/tasks', icon: ListTodo, label: 'Operation Logs' },
      { to: '/shift', icon: ArrowRightLeft, label: 'Handover Matrix' },
    ],
  },
  {
    title: 'Communication Hub',
    items: [
      { to: '/broadcast', icon: Radio, label: 'Mass Communiqué' },
      { to: '/chatbot', icon: BotMessageSquare, label: 'Neural Architect' },
      { to: '/inbox', icon: Inbox, label: 'Unified Stream' },
      { to: '/campaigns', icon: Megaphone, label: 'Strategic Ops' },
    ],
  },
  {
    title: 'Telemetry & Intel',
    items: [
      { to: '/server', icon: Server, label: 'Compute Power' },
      { to: '/network', icon: Network, label: 'Network Fabric' },
      { to: '/incidents', icon: BrainCircuit, label: 'AI Predictor' },
      { to: '/analytics', icon: BarChart3, label: 'Data Visualizer' },
      { to: '/reports', icon: FileBarChart, label: 'Audit Genesis' },
    ],
  },
  {
    title: 'Advanced Control',
    items: [
      { to: '/flows', icon: GitBranch, label: 'Logic Streams' },
      { to: '/webhooks', icon: Webhook, label: 'Link Protocols' },
      { to: '/audit', icon: FileText, label: 'System Ledger' },
      { to: '/api-keys', icon: Key, label: 'Encryption Keys' },
      { to: '/settings', icon: Settings, label: 'Core Config' },
    ],
  },
];

const NOTIF_ICON: Record<string, React.ElementType> = {
  error: XCircle,
  warning: AlertTriangle,
  success: CheckCircle,
  info: Info,
};

const NOTIF_COLOR: Record<string, string> = {
  error: 'text-rose-500',
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  info: 'text-indigo-500',
};

export default function Layout() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const [bellOpen, setBellOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifs, setNotifs] = useState<NotificationItem[]>([]);
  const bellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const sync = () => {
      setUnreadCount(notificationStore.getUnreadCount());
      setNotifs(notificationStore.getAll());
    };
    sync();
    return notificationStore.subscribe(sync);
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('admin_token');
    navigate('/login');
  };

  return (    <div className={`flex h-screen overflow-hidden ${theme === 'dark' ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'} selection:bg-indigo-500/30 font-mono`}>
      {/* Ultimate Scanline Overlay (Global) */}
      <div className="scanline-overlay" />

      {/* Sidebar - Ultimate Aesthetic */}
      <aside className="w-80 bg-white dark:bg-slate-950 border-r-2 border-slate-200 dark:border-white/5 flex flex-col shrink-0 relative z-50 overflow-hidden shadow-2xl">
        {/* Decorative Glow */}
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-indigo-600/10 blur-[100px] pointer-events-none" />
        
        {/* Logo Section */}
        <div className="relative px-8 py-10 flex items-center gap-4 border-b-2 border-slate-200 dark:border-white/5 bg-white/40 dark:bg-slate-950/40 backdrop-blur-xl">
           <div className="p-3 bg-indigo-600 rounded-[20px] shadow-2xl shadow-indigo-600/40 group cursor-pointer hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-white group-hover:animate-pulse" />
           </div>
           <div>
              <h1 className="text-2xl font-black italic tracking-tighter uppercase text-slate-950 dark:text-white leading-none">Audira<span className="text-indigo-500 underline decoration-4 underline-offset-8 decoration-indigo-400">OS</span></h1>
              <p className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.5em] mt-3 italic">Core Neural Link</p>
           </div>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 px-4 py-8 space-y-12 overflow-y-auto scrollbar-hide">
           {sections.map((section) => (
             <div key={section.title} className="space-y-4">
                <div className="flex items-center gap-4 px-4 mb-2">
                   <div className="w-1.5 h-1.5 rounded-full bg-indigo-500/40" />
                   <span className="text-[10px] font-black uppercase text-indigo-500/60 tracking-[0.4em] whitespace-nowrap italic">{section.title}</span>
                   <div className="h-[2px] w-full bg-gradient-to-r from-indigo-500/20 to-transparent" />
                </div>
                <div className="space-y-1.5">
                   {section.items.map((item) => (
                     <NavLink
                       key={item.to}
                       to={item.to}
                       end={item.to === '/'}
                       className={({ isActive }) =>
                         `group flex items-center gap-4 px-6 py-4 rounded-[22px] text-[11px] font-black uppercase tracking-[0.2em] transition-all duration-300 border-2 ${
                           isActive
                             ? 'bg-indigo-600 border-indigo-400 text-white shadow-2xl shadow-indigo-600/30 scale-105 z-10'
                             : 'text-slate-500 border-transparent hover:text-slate-950 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 hover:translate-x-2'
                         }`
                       }
                     >
                       <item.icon className={`w-4 h-4 shrink-0 transition-all ${isActive ? 'rotate-12 scale-110' : 'group-hover:rotate-6'}`} />
                       <span className="italic">{item.label}</span>
                     </NavLink>
                   ))}
                </div>
             </div>
           ))}
        </nav>

        {/* User Footer Context */}
        <div className="px-6 py-8 border-t-2 border-slate-200 dark:border-white/5 relative bg-white/80 dark:bg-slate-950/80 backdrop-blur-3xl">
           <div className="flex items-center justify-between p-5 bg-slate-100 dark:bg-slate-900/40 rounded-[28px] border-2 border-slate-200 dark:border-white/5 group hover:border-indigo-500/40 transition-all shadow-inner">
              <div className="flex items-center gap-4">
                 <div className="w-11 h-11 bg-indigo-500/10 border-2 border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400 group-hover:scale-110 transition-transform">
                    <User className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-slate-950 dark:text-white italic truncate w-24 uppercase tracking-tighter">Admin Nucleus</p>
                    <div className="flex items-center gap-1.5 mt-0.5">
                       <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                       <span className="text-[8px] font-black text-slate-600 dark:text-slate-500 uppercase tracking-widest italic">LINKED_OK</span>
                    </div>
                 </div>
              </div>
              <button 
                 onClick={handleLogout}
                 className="p-3.5 bg-white dark:bg-slate-950 text-slate-400 dark:text-slate-700 hover:text-rose-500 rounded-xl transition-all border-2 border-slate-200 dark:border-slate-800 hover:border-rose-500/30 active:scale-90"
              >
                 <Power className="w-4 h-4" />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Framework */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decorative */}
        <div className="absolute -right-40 -bottom-40 w-[800px] h-[800px] bg-indigo-600/5 blur-[180px] pointer-events-none" />
        
        {/* Top Intelligence Bar */}
        <header className="h-24 bg-white/20 dark:bg-slate-950/20 backdrop-blur-3xl border-b-2 border-slate-200 dark:border-white/5 flex items-center justify-between px-12 shrink-0 relative z-40">
           <div className="flex items-center gap-8">
              <div className="flex items-center gap-4 px-6 py-3 bg-slate-100 dark:bg-slate-900/50 rounded-2xl border-2 border-slate-200 dark:border-white/5 shadow-inner">
                 <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
                 <span className="text-[10px] font-black uppercase text-slate-500 dark:text-slate-400 tracking-[0.4em] italic">SIGNAL_GRID_SYNC: OPERATIONAL</span>
              </div>
           </div>

           <div className="flex items-center gap-6">
              {/* Theme Toggle Premium */}
              <button
                onClick={toggleTheme}
                className="p-4 rounded-2xl border-2 border-slate-200 dark:border-white/5 bg-white/50 dark:bg-slate-900/40 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all active:scale-90 hover:scale-105 shadow-sm"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-180 duration-1000" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-500" />
                )}
              </button>

              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setBellOpen((p) => !p)}
                  className={`p-4 rounded-2xl border-2 transition-all active:scale-90 hover:scale-105 ${unreadCount > 0 ? 'bg-indigo-600 border-indigo-400 shadow-2xl shadow-indigo-600/40' : 'bg-slate-900/40 border-white/5 hover:bg-slate-800'}`}
                >
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-white' : 'text-slate-500 group-hover:text-indigo-400'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-2 -right-2 w-6 h-6 bg-rose-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce shadow-xl">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Ultimate Notification Dropdown */}
                {bellOpen && (
                  <div className="absolute right-0 top-20 w-[480px] bg-slate-950 border-2 border-white/10 rounded-[48px] shadow-[0_40px_100px_rgba(0,0,0,0.9)] z-[60] overflow-hidden flex flex-col animate-in zoom-in-95 duration-500 perspective-1000">
                    <div className="p-10 border-b-2 border-white/5 flex items-center justify-between bg-white/[0.03] backdrop-blur-3xl">
                       <div className="flex items-center gap-4">
                          <div className="p-3 bg-indigo-600 rounded-xl">
                            <BellRing className="w-5 h-5 text-white animate-pulse" />
                          </div>
                          <h3 className="text-base font-black text-white italic uppercase tracking-[0.3em] font-mono">Telemetry Signals</h3>
                       </div>
                       <div className="flex gap-6">
                          {unreadCount > 0 && (
                            <button onClick={() => notificationStore.markAllRead()} className="text-[10px] font-black text-indigo-400 hover:text-white transition-colors uppercase tracking-[0.3em] underline decoration-indigo-400/50 underline-offset-8 italic">SYNCHRONIZE_ALL</button>
                          )}
                          <button onClick={() => notificationStore.clear()} className="p-3 bg-white/5 hover:bg-rose-500/20 text-slate-400 hover:text-rose-500 transition-all rounded-xl border border-white/5"><Trash2 className="w-5 h-5" /></button>
                       </div>
                    </div>

                    <div className="max-h-[36rem] overflow-y-auto scrollbar-hide">
                      {notifs.length === 0 ? (
                        <div className="py-32 text-center opacity-10 flex flex-col items-center grayscale">
                           <Inbox className="w-20 h-20 mb-6" />
                           <p className="text-[11px] font-black uppercase tracking-[0.5em] italic">Vacuum state: No signal anomalies</p>
                        </div>
                      ) : (
                        notifs.map((n) => {
                          const NIcon = NOTIF_ICON[n.type] ?? Info;
                          const color = NOTIF_COLOR[n.type] ?? 'text-slate-500';
                          return (
                            <div
                              key={n.id}
                              onClick={() => notificationStore.markRead(n.id)}
                              className={`p-10 border-b-2 border-white/5 hover:bg-white/[0.04] cursor-pointer transition-all relative group ${!n.read ? 'bg-indigo-600/[0.03]' : ''}`}
                            >
                              {!n.read && <div className="absolute left-0 top-10 bottom-10 w-1.5 bg-indigo-600 rounded-r-full shadow-[0_0_15px_rgba(79,70,229,0.8)]" />}
                              <div className="flex items-start gap-8">
                                <div className={`p-5 rounded-2xl bg-slate-900 border-2 border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all ${color.replace('text-', 'bg-opacity-10 ')}`}>
                                   <NIcon className={`w-6 h-6 ${color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-3">
                                    <h4 className="text-[12px] font-black text-white uppercase tracking-tighter group-hover:text-indigo-400 transition-colors">{n.title}</h4>
                                    <span className="text-[9px] font-black text-slate-600 uppercase tracking-widest font-mono italic">{new Date(n.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-sm text-slate-400 font-medium leading-relaxed mb-6 italic group-hover:text-slate-200 transition-colors">"{n.message}"</p>
                                  
                                  {n.solution && (
                                    <div className="bg-amber-600/5 border-2 border-amber-600/10 rounded-2xl p-5 flex items-start gap-4 shadow-inner">
                                       <Wrench className="w-4 h-4 mt-0.5 text-amber-500 shrink-0" />
                                       <div className="space-y-1">
                                          <p className="text-[9px] font-black text-amber-600 uppercase tracking-widest italic opacity-60">Master Solution Protocol</p>
                                          <p className="text-[11px] text-amber-400 font-bold uppercase tracking-tight leading-relaxed">{n.solution}</p>
                                       </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>
                )}
              </div>
           </div>
        </header>

        {/* Neural Outlet - Content Terminal */}
        <main className={`flex-1 overflow-y-auto ${theme === 'dark' ? 'bg-slate-950' : 'bg-white'} relative perspective-2000`}>
           {/* Terminal Vignette Effect */}
           <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_200px_rgba(0,0,0,0.1)] dark:shadow-[inset_0_0_300px_rgba(0,0,0,0.4)] z-30" />
           
           <div className="p-12 max-w-[2100px] mx-auto relative z-20">
              <Outlet />
           </div>
        </main>
      </div>
    </div>

  );
}
