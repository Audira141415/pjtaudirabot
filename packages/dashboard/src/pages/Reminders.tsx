import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Bell, Trash2, Clock, AlertCircle, Plus, Loader2 } from 'lucide-react';

const TYPE_COLORS: Record<string, string> = {
  SLA_WARNING: 'bg-amber-100 text-amber-700',
  ESCALATION: 'bg-red-100 text-red-700',
  TASK_DUE: 'bg-blue-100 text-blue-700',
  SHIFT_CHANGE: 'bg-purple-100 text-purple-700',
  MAINTENANCE: 'bg-gray-100 text-gray-700',
};

export default function RemindersPage() {
  const [reminders, setReminders] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ message: '', remindAt: '', platform: 'WHATSAPP', recurring: '' });

  const load = async () => {
    try { const res = await api.getReminders(); setReminders((res.data as any) ?? []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    try { await api.deleteReminder(id); load(); } catch (err) { console.error(err); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.createReminder({
        message: form.message,
        remindAt: form.remindAt,
        platform: form.platform,
        recurring: form.recurring || undefined,
      });
      setForm({ message: '', remindAt: '', platform: 'WHATSAPP', recurring: '' });
      setShowForm(false);
      load();
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const now = new Date();
  const upcoming = reminders.filter(r => new Date(r.dueAt ?? r.scheduledAt) > now);
  const overdue = reminders.filter(r => new Date(r.dueAt ?? r.scheduledAt) <= now && !r.completed);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Bell className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Reminders</h1>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg hover:bg-brand-600 transition-colors"
        >
          <Plus className="w-4 h-4" />
          New Reminder
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border p-5 mb-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Message *</label>
            <textarea
              required
              rows={3}
              value={form.message}
              onChange={e => setForm({ ...form, message: e.target.value })}
              className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              placeholder="Reminder message…"
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Remind At *</label>
              <input
                required
                type="datetime-local"
                value={form.remindAt}
                onChange={e => setForm({ ...form, remindAt: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Platform</label>
              <select
                value={form.platform}
                onChange={e => setForm({ ...form, platform: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="WHATSAPP">WhatsApp</option>
                <option value="TELEGRAM">Telegram</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Recurring</label>
              <select
                value={form.recurring}
                onChange={e => setForm({ ...form, recurring: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                <option value="">None</option>
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
              </select>
            </div>
          </div>
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={() => { setShowForm(false); setForm({ message: '', remindAt: '', platform: 'WHATSAPP', recurring: '' }); }}
              className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex items-center gap-1.5 px-4 py-2 bg-brand-500 text-white rounded-lg text-sm hover:bg-brand-600 disabled:opacity-50 transition-colors"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Reminder
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{reminders.length}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Upcoming</p><p className="text-2xl font-bold text-blue-600">{upcoming.length}</p></div>
        <div className="bg-white rounded-xl border p-4">
          <div className="flex items-center gap-1"><AlertCircle className="w-4 h-4 text-red-500" /><p className="text-sm text-gray-500">Overdue</p></div>
          <p className="text-2xl font-bold text-red-600">{overdue.length}</p>
        </div>
      </div>

      <div className="space-y-3">
        {reminders.map((r) => {
          const due = new Date(r.dueAt ?? r.scheduledAt);
          const isOverdue = due <= now && !r.completed;
          return (
            <div key={r.id} className={`bg-white rounded-xl border p-4 flex items-center gap-4 ${isOverdue ? 'border-red-200 bg-red-50' : ''}`}>
              <div className={`rounded-full p-2 ${isOverdue ? 'bg-red-100' : 'bg-gray-100'}`}>
                {isOverdue ? <AlertCircle className="w-5 h-5 text-red-500" /> : <Clock className="w-5 h-5 text-gray-500" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h3 className="font-medium">{r.title ?? r.message ?? 'Reminder'}</h3>
                  {r.type && <span className={`px-2 py-0.5 rounded text-xs font-medium ${TYPE_COLORS[r.type] ?? 'bg-gray-100'}`}>{r.type}</span>}
                </div>
                {r.description && <p className="text-sm text-gray-500 truncate">{r.description}</p>}
                <p className="text-xs text-gray-400 mt-1">
                  Due: {due.toLocaleString()}
                  {r.user && ` · For: ${r.user.name ?? r.userId}`}
                </p>
              </div>
              <button onClick={() => remove(r.id)} className="text-red-400 hover:text-red-600 shrink-0"><Trash2 className="w-4 h-4" /></button>
            </div>
          );
        })}
        {reminders.length === 0 && <div className="text-center py-12 text-gray-400">No reminders</div>}
      </div>
    </div>
  );
}
