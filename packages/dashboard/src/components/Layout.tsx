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

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950 text-slate-100 selection:bg-indigo-500/30">
      {/* Sidebar - Ultimate Aesthetic */}
      <aside className="w-80 bg-slate-950 border-r border-white/5 flex flex-col shrink-0 relative z-50 overflow-hidden">
        {/* Decorative Glow */}
        <div className="absolute -left-20 -top-20 w-64 h-64 bg-indigo-600/10 blur-[100px] pointer-events-none" />
        
        {/* Logo Section */}
        <div className="relative px-8 py-10 flex items-center gap-4 border-b border-white/5">
           <div className="p-3 bg-indigo-600 rounded-[20px] shadow-2xl shadow-indigo-600/30 group cursor-pointer hover:scale-110 transition-transform">
              <Brain className="w-6 h-6 text-white group-hover:animate-pulse" />
           </div>
           <div>
              <h1 className="text-xl font-black italic tracking-tighter uppercase text-white leading-none">Audira<span className="text-indigo-500 underline decoration-2 underline-offset-4 decoration-indigo-400">OS</span></h1>
              <p className="text-[9px] font-black text-slate-600 uppercase tracking-[0.4em] mt-2">Core Neural Link</p>
           </div>
        </div>

        {/* Navigation Content */}
        <nav className="flex-1 px-4 py-8 space-y-10 overflow-y-auto scrollbar-hide">
           {sections.map((section) => (
             <div key={section.title} className="space-y-3">
                <div className="flex items-center gap-3 px-4 mb-2">
                   <span className="text-[10px] font-black uppercase text-indigo-500/60 tracking-[0.3em] whitespace-nowrap">{section.title}</span>
                   <div className="h-px w-full bg-gradient-to-r from-indigo-500/20 to-transparent" />
                </div>
                <div className="space-y-1">
                   {section.items.map((item) => (
                     <NavLink
                       key={item.to}
                       to={item.to}
                       end={item.to === '/'}
                       className={({ isActive }) =>
                         `group flex items-center gap-4 px-6 py-4 rounded-[18px] text-[11px] font-black uppercase tracking-widest transition-all duration-300 border ${
                           isActive
                             ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl shadow-indigo-600/20 active:scale-95'
                             : 'text-slate-500 border-transparent hover:text-white hover:bg-white/5 hover:translate-x-1'
                         }`
                       }
                     >
                       <item.icon className={`w-4 h-4 shrink-0 transition-all ${theme === 'dark' ? 'group-hover:text-indigo-400' : ''}`} />
                       <span className="italic">{item.label}</span>
                     </NavLink>
                   ))}
                </div>
             </div>
           ))}
        </nav>

        {/* User Footer Context */}
        <div className="px-6 py-8 border-t border-white/5 relative bg-slate-950/80 backdrop-blur-md">
           <div className="flex items-center justify-between p-4 bg-slate-900/50 rounded-[24px] border border-white/5 group hover:border-indigo-500/30 transition-all">
              <div className="flex items-center gap-3">
                 <div className="w-10 h-10 bg-indigo-500/10 border border-indigo-500/20 rounded-2xl flex items-center justify-center text-indigo-400">
                    <User className="w-5 h-5" />
                 </div>
                 <div>
                    <p className="text-[10px] font-black text-white italic truncate w-24 uppercase">Admin Nucleus</p>
                    <div className="flex items-center gap-1">
                       <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                       <span className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Linked</span>
                    </div>
                 </div>
              </div>
              <button 
                 onClick={handleLogout}
                 className="p-3 bg-slate-950 text-slate-700 hover:text-rose-500 rounded-xl transition-all border border-slate-800 hover:border-rose-500/20 active:scale-90"
              >
                 <Power className="w-4 h-4" />
              </button>
           </div>
        </div>
      </aside>

      {/* Main Framework */}
      <div className="flex-1 flex flex-col overflow-hidden relative">
        {/* Background Decorative */}
        <div className="absolute -right-40 -bottom-40 w-[600px] h-[600px] bg-indigo-600/5 blur-[150px] pointer-events-none" />
        
        {/* Top Intelligence Bar */}
        <header className="h-20 bg-slate-950/20 backdrop-blur-3xl border-b border-white/5 flex items-center justify-between px-10 shrink-0 relative z-40">
           <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 px-4 py-2 bg-slate-900/50 rounded-2xl border border-white/5">
                 <Activity className="w-3.5 h-3.5 text-emerald-500" />
                 <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest italic">Grid Status: Synchronized</span>
              </div>
           </div>

           <div className="flex items-center gap-4">
              {/* Theme Toggle Premium */}
              <button
                onClick={toggleTheme}
                className="p-3 rounded-2xl border border-white/5 bg-slate-900/40 hover:bg-slate-800 hover:border-white/10 transition-all active:scale-90"
              >
                {theme === 'dark' ? (
                  <Sun className="w-5 h-5 text-amber-400 transition-transform hover:rotate-90 duration-500" />
                ) : (
                  <Moon className="w-5 h-5 text-indigo-400" />
                )}
              </button>

              <div ref={bellRef} className="relative">
                <button
                  onClick={() => setBellOpen((p) => !p)}
                  className={`p-3 rounded-2xl border transition-all active:scale-90 ${unreadCount > 0 ? 'bg-indigo-600 border-indigo-500 shadow-lg shadow-indigo-600/20' : 'bg-slate-900/40 border-white/5 hover:bg-slate-800'}`}
                >
                  <Bell className={`w-5 h-5 ${unreadCount > 0 ? 'text-white' : 'text-slate-500'}`} />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-rose-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-slate-950 animate-bounce">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {/* Ultimate Notification Dropdown */}
                {bellOpen && (
                  <div className="absolute right-0 top-16 w-[420px] bg-slate-950 border border-white/10 rounded-[40px] shadow-[0_0_80px_rgba(0,0,0,0.8)] z-[60] overflow-hidden flex flex-col animate-in zoom-in-95 duration-300">
                    <div className="p-8 border-b border-white/5 flex items-center justify-between bg-white/[0.02] backdrop-blur-xl">
                       <div className="flex items-center gap-3">
                          <BellRing className="w-5 h-5 text-indigo-500" />
                          <h3 className="text-sm font-black text-white italic uppercase tracking-widest">Signal Stream</h3>
                       </div>
                       <div className="flex gap-4">
                          {unreadCount > 0 && (
                            <button onClick={() => notificationStore.markAllRead()} className="text-[9px] font-black text-indigo-400 hover:text-white transition-colors uppercase tracking-widest underline decoration-indigo-400/50 underline-offset-4">Sync All</button>
                          )}
                          <button onClick={() => notificationStore.clear()} className="p-2 text-slate-700 hover:text-rose-500 transition-all"><Trash2 className="w-4 h-4" /></button>
                       </div>
                    </div>

                    <div className="max-h-[32rem] overflow-y-auto scrollbar-hide">
                      {notifs.length === 0 ? (
                        <div className="py-24 text-center opacity-20 flex flex-col items-center">
                           <Inbox className="w-12 h-12 mb-4" />
                           <p className="text-[10px] font-black uppercase tracking-[0.3em]">No frequency anomalies</p>
                        </div>
                      ) : (
                        notifs.map((n) => {
                          const NIcon = NOTIF_ICON[n.type] ?? Info;
                          const color = NOTIF_COLOR[n.type] ?? 'text-slate-500';
                          return (
                            <div
                              key={n.id}
                              onClick={() => notificationStore.markRead(n.id)}
                              className={`p-8 border-b border-white/5 hover:bg-white/[0.03] cursor-pointer transition-all relative ${!n.read ? 'bg-indigo-600/5' : ''}`}
                            >
                              {!n.read && <div className="absolute left-0 top-8 bottom-8 w-1 bg-indigo-600 rounded-r-full" />}
                              <div className="flex items-start gap-6">
                                <div className={`p-4 rounded-2xl bg-slate-900 border border-white/5 ${color.replace('text-', 'text-opacity-20 ')}`}>
                                   <NIcon className={`w-5 h-5 ${color}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center justify-between mb-2">
                                    <h4 className="text-[11px] font-black text-white uppercase tracking-tight">{n.title}</h4>
                                    <span className="text-[8px] font-black text-slate-700 uppercase">{new Date(n.timestamp).toLocaleTimeString()}</span>
                                  </div>
                                  <p className="text-xs text-slate-500 font-bold leading-relaxed mb-4 italic group-hover:text-slate-300 transition-colors">"{n.message}"</p>
                                  
                                  {n.solution && (
                                    <div className="bg-amber-600/10 border border-amber-600/20 rounded-2xl p-4 flex items-start gap-3">
                                       <Wrench className="w-3.5 h-3.5 mt-0.5 text-amber-500 shrink-0" />
                                       <p className="text-[10px] text-amber-400 font-black uppercase tracking-tight leading-relaxed">{n.solution}</p>
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
        <main className="flex-1 overflow-y-auto bg-slate-950 relative scrollbar-thin scrollbar-thumb-indigo-600/20 scrollbar-track-transparent">
           <div className="p-10 max-w-[1920px] mx-auto">
              <Outlet />
           </div>
        </main>
      </div>
    </div>
  );
}
