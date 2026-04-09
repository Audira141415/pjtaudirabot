export interface NotificationItem {
  id: string;
  type: 'error' | 'warning' | 'info' | 'success';
  title: string;
  message: string;
  solution?: string;
  timestamp: string;
  read: boolean;
  component?: string;
}

type Listener = () => void;

let notifications: NotificationItem[] = [];
const listeners = new Set<Listener>();

function emit() {
  listeners.forEach((fn) => fn());
}

export const notificationStore = {
  getAll: () => notifications,
  getUnread: () => notifications.filter((n) => !n.read),
  getUnreadCount: () => notifications.filter((n) => !n.read).length,

  add(item: Omit<NotificationItem, 'id' | 'timestamp' | 'read'>) {
    const newItem: NotificationItem = {
      ...item,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      timestamp: new Date().toISOString(),
      read: false,
    };
    notifications = [newItem, ...notifications].slice(0, 50); // keep last 50
    emit();
    return newItem;
  },

  markRead(id: string) {
    notifications = notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n
    );
    emit();
  },

  markAllRead() {
    notifications = notifications.map((n) => ({ ...n, read: true }));
    emit();
  },

  clear() {
    notifications = [];
    emit();
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => { listeners.delete(listener); };
  },
};

// Solution database per component
const SOLUTION_MAP: Record<string, string> = {
  'PostgreSQL Database': 'Cek apakah Docker PostgreSQL berjalan: docker ps | cek port 5433 | jalankan AUDIRA_START.bat',
  'Redis Cache': 'Cek apakah Docker Redis berjalan: docker ps | cek port 6379 | jalankan AUDIRA_START.bat',
  'API Server': 'Jalankan ulang: pnpm dev:api | cek port 4000 | periksa logs di terminal API',
  'WhatsApp Bot': 'Cek koneksi WhatsApp: scan ulang QR code | restart bot: pnpm dev:whatsapp | cek session di data/whatsapp-sessions/',
  'Telegram Bot': 'Cek token Telegram di .env | restart bot: pnpm dev:telegram | pastikan BOT_TOKEN valid',
};

const DEGRADED_SOLUTION_MAP: Record<string, string> = {
  'PostgreSQL Database': 'Latency tinggi — cek jumlah koneksi aktif, restart PostgreSQL jika perlu',
  'Redis Cache': 'Latency tinggi — cek memory usage Redis, flush cache jika penuh',
  'API Server': 'Response lambat — cek memory usage, restart API server jika >80% RAM',
};

export function getSolution(componentName: string, status: string): string {
  if (status === 'offline' || status === 'error') {
    return SOLUTION_MAP[componentName] ?? `Restart komponen ${componentName} atau cek logs untuk detail error`;
  }
  if (status === 'degraded') {
    return DEGRADED_SOLUTION_MAP[componentName] ?? `Periksa performa ${componentName}, mungkin perlu restart`;
  }
  return '';
}

export function getGeneralSolution(overallStatus: string): string {
  if (overallStatus === 'unhealthy') {
    return 'Jalankan AUDIRA_STOP.bat lalu AUDIRA_START.bat untuk restart semua services';
  }
  if (overallStatus === 'degraded') {
    return 'Beberapa komponen lambat — periksa resource usage (RAM/CPU) di Server Metrics';
  }
  return '';
}
