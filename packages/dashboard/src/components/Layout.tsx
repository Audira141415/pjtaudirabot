import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import { notificationStore, NotificationItem } from '../lib/notification-store';
import {
  LayoutDashboard,
  Users,
  Radio,
  Shield,
  FileText,
  Webhook,
  GitBranch,
  LogOut,
  Bot,
  Ticket,
  Timer,
  Bell,
  Wifi,
  Network,
  Server,
  ArrowRightLeft,
  ListTodo,
  FileBarChart,
  BookOpen,
  BrainCircuit,
  Brain,
  Database,
  Layers,
  ClipboardCheck,
  MessageSquare,
  Settings,
  BellRing,
  CheckCheck,
  Trash2,
  Wrench,
  XCircle,
  AlertTriangle,
  CheckCircle,
  Info,
  Smile,
  CalendarClock,
  Megaphone,
  Contact,
  CreditCard,
  Inbox,
  ShieldAlert,
  HelpCircle,
  FileStack,
  BotMessageSquare,
  Star,
  UserCog,
  Tag,
  Kanban,
  FolderOpen,
  Key,
  Zap,
  BarChart3,
  ScrollText,
  Download,
  Globe,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../lib/ThemeProvider';

const sections = [
  {
    title: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
      { to: '/users', icon: Users, label: 'Users' },
    ],
  },
  {
    title: 'Operations',
    items: [
      { to: '/tickets', icon: Ticket, label: 'Tickets' },
      { to: '/sla', icon: Timer, label: 'SLA Monitor' },
      { to: '/alerts', icon: Bell, label: 'Alerts' },
      { to: '/tasks', icon: ListTodo, label: 'Tasks' },
      { to: '/shift', icon: ArrowRightLeft, label: 'Shift Handover' },
      { to: '/checklist', icon: ClipboardCheck, label: 'Checklists' },
      { to: '/reminders', icon: Bell, label: 'Reminders' },
    ],
  },
  {
    title: 'Infrastructure',
    items: [
      { to: '/uptime', icon: Wifi, label: 'Uptime Monitor' },
      { to: '/network', icon: Network, label: 'Network Health' },
      { to: '/server', icon: Server, label: 'Server Status' },
      { to: '/backups', icon: Database, label: 'Backups' },
    ],
  },
  {
    title: 'Intelligence',
    items: [
      { to: '/incidents', icon: BrainCircuit, label: 'AI Insights' },
      { to: '/sentiment', icon: Smile, label: 'Sentiment Analysis' },
      { to: '/analytics', icon: BarChart3, label: 'Analytics' },
      { to: '/csat', icon: Star, label: 'CSAT Survey' },
      { to: '/knowledge', icon: BookOpen, label: 'Knowledge Base' },
      { to: '/memory', icon: Brain, label: 'Memory Browser' },
      { to: '/reports', icon: FileBarChart, label: 'Reports' },
    ],
  },
  {
    title: 'Communication',
    items: [
      { to: '/broadcast', icon: Radio, label: 'Broadcast' },
      { to: '/campaigns', icon: Megaphone, label: 'Campaigns' },
      { to: '/scheduled-messages', icon: CalendarClock, label: 'Scheduled Messages' },
      { to: '/inbox', icon: Inbox, label: 'Unified Inbox' },
      { to: '/templates', icon: FileStack, label: 'Templates' },
      { to: '/canned-responses', icon: Zap, label: 'Canned Responses' },
      { to: '/chatbot', icon: BotMessageSquare, label: 'Chatbot Builder' },
      { to: '/moderation', icon: Shield, label: 'Moderation' },
      { to: '/groups', icon: MessageSquare, label: 'Groups' },
      { to: '/faq', icon: HelpCircle, label: 'FAQ Manager' },
    ],
  },
  {
    title: 'Business',
    items: [
      { to: '/crm', icon: Contact, label: 'CRM Contacts' },
      { to: '/pipeline', icon: Kanban, label: 'CRM Pipeline' },
      { to: '/payments', icon: CreditCard, label: 'Payments' },
      { to: '/tags', icon: Tag, label: 'Tags & Labels' },
      { to: '/agents', icon: UserCog, label: 'Agents' },
    ],
  },
  {
    title: 'System',
    items: [
      { to: '/flows', icon: GitBranch, label: 'Flows' },
      { to: '/webhooks', icon: Webhook, label: 'Webhooks' },
      { to: '/webhook-logs', icon: ScrollText, label: 'Webhook Logs' },
      { to: '/audit', icon: FileText, label: 'Audit Logs' },
      { to: '/auto-moderation', icon: ShieldAlert, label: 'Auto-Moderation' },
      { to: '/notification-rules', icon: BellRing, label: 'Notification Rules' },
      { to: '/api-keys', icon: Key, label: 'API Keys' },
      { to: '/files', icon: FolderOpen, label: 'File Manager' },
      { to: '/exports', icon: Download, label: 'Export Center' },
      { to: '/bulk', icon: Layers, label: 'Bulk Operations' },
      { to: '/language', icon: Globe, label: 'Language' },
      { to: '/settings', icon: Settings, label: 'Settings' },
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
  error: 'text-red-500',
  warning: 'text-amber-500',
  success: 'text-emerald-500',
  info: 'text-blue-500',
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

  // Close dropdown when clicking outside
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
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-gray-900 text-white flex flex-col shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-gray-800">
          <Bot className="w-8 h-8 text-brand-400" />
          <div>
            <h1 className="text-lg font-bold leading-tight">AudiraBot</h1>
            <p className="text-xs text-gray-400">Admin Dashboard</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-4 overflow-y-auto">
          {sections.map((section) => (
            <div key={section.title}>
              <p className="px-3 mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500">{section.title}</p>
              <div className="space-y-0.5">
                {section.items.map((item) => (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    end={item.to === '/'}
                    className={({ isActive }) =>
                      `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                        isActive
                          ? 'bg-brand-600 text-white'
                          : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }`
                    }
                  >
                    <item.icon className="w-4 h-4 shrink-0" />
                    {item.label}
                  </NavLink>
                ))}
              </div>
            </div>
          ))}
        </nav>

        {/* Footer */}
        <div className="px-3 py-4 border-t border-gray-800">
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-300 hover:bg-gray-800 hover:text-white w-full transition-colors"
          >
            <LogOut className="w-5 h-5" />
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top Bar with Bell */}
        <header className="h-14 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700 flex items-center justify-end px-6 shrink-0">
          {/* Dark mode toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors mr-2"
            title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {theme === 'dark' ? (
              <Sun className="w-5 h-5 text-amber-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-500" />
            )}
          </button>
          <div ref={bellRef} className="relative">
            <button
              onClick={() => setBellOpen((p) => !p)}
              className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              {unreadCount > 0 ? (
                <BellRing className="w-5 h-5 text-red-500 animate-bounce" />
              ) : (
                <Bell className="w-5 h-5 text-gray-500" />
              )}
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center animate-pulse">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </button>

            {/* Notification Dropdown */}
            {bellOpen && (
              <div className="absolute right-0 top-12 w-96 bg-white border border-gray-200 rounded-xl shadow-xl z-50 max-h-[28rem] flex flex-col">
                <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                  <h3 className="font-semibold text-sm">Notifications</h3>
                  <div className="flex gap-2">
                    {unreadCount > 0 && (
                      <button
                        onClick={() => notificationStore.markAllRead()}
                        className="text-xs text-brand-600 hover:text-brand-700 flex items-center gap-1"
                      >
                        <CheckCheck className="w-3 h-3" /> Mark all read
                      </button>
                    )}
                    {notifs.length > 0 && (
                      <button
                        onClick={() => notificationStore.clear()}
                        className="text-xs text-gray-400 hover:text-red-500 flex items-center gap-1"
                      >
                        <Trash2 className="w-3 h-3" /> Clear
                      </button>
                    )}
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto">
                  {notifs.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 text-gray-400">
                      <Bell className="w-8 h-8 mb-2 opacity-40" />
                      <p className="text-sm">Tidak ada notifikasi</p>
                    </div>
                  ) : (
                    notifs.map((n) => {
                      const NIcon = NOTIF_ICON[n.type] ?? Info;
                      const color = NOTIF_COLOR[n.type] ?? 'text-gray-500';
                      return (
                        <div
                          key={n.id}
                          onClick={() => notificationStore.markRead(n.id)}
                          className={`px-4 py-3 border-b border-gray-50 hover:bg-gray-50 cursor-pointer transition-colors ${
                            !n.read ? 'bg-blue-50/40' : ''
                          }`}
                        >
                          <div className="flex items-start gap-2.5">
                            <NIcon className={`w-4 h-4 mt-0.5 flex-shrink-0 ${color}`} />
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <p className="text-sm font-semibold text-gray-800">{n.title}</p>
                                {!n.read && <div className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0" />}
                              </div>
                              <p className="text-xs text-gray-600 mt-0.5">{n.message}</p>
                              {n.solution && (
                                <div className="mt-1.5 flex items-start gap-1.5 bg-amber-50 rounded px-2 py-1 border border-dashed border-amber-200">
                                  <Wrench className="w-3 h-3 mt-0.5 text-amber-600 flex-shrink-0" />
                                  <p className="text-[11px] text-amber-800 font-medium leading-relaxed">{n.solution}</p>
                                </div>
                              )}
                              <p className="text-[10px] text-gray-400 mt-1">
                                {new Date(n.timestamp).toLocaleString('id-ID')}
                              </p>
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
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto bg-gray-50 dark:bg-gray-950">
          <div className="p-8">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
