import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ListTodo, CheckCircle2, Circle, Clock, AlertCircle } from 'lucide-react';

const STATUS_CONF: Record<string, { color: string; icon: JSX.Element }> = {
  PENDING: { color: 'bg-gray-100 text-gray-700', icon: <Circle className="w-4 h-4 text-gray-400" /> },
  IN_PROGRESS: { color: 'bg-blue-100 text-blue-700', icon: <Clock className="w-4 h-4 text-blue-500" /> },
  COMPLETED: { color: 'bg-emerald-100 text-emerald-700', icon: <CheckCircle2 className="w-4 h-4 text-emerald-500" /> },
  OVERDUE: { color: 'bg-red-100 text-red-700', icon: <AlertCircle className="w-4 h-4 text-red-500" /> },
};

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: 'bg-red-100 text-red-700',
  HIGH: 'bg-orange-100 text-orange-700',
  MEDIUM: 'bg-amber-100 text-amber-700',
  LOW: 'bg-gray-100 text-gray-700',
};

export default function TaskManagerPage() {
  const [tasks, setTasks] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');

  const load = async () => {
    try {
      const filters: Record<string, string> = {};
      if (statusFilter) filters.status = statusFilter;
      if (priorityFilter) filters.priority = priorityFilter;
      const res = await api.getTasks(1, Object.keys(filters).length ? filters : undefined);
      setTasks((res.data as any) ?? []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [statusFilter, priorityFilter]);

  const updateStatus = async (id: string, status: string) => {
    try {
      await api.updateTask(id, { status });
      load();
    } catch (err) { console.error(err); }
  };

  const total = tasks.length;
  const completed = tasks.filter(t => t.status === 'COMPLETED').length;
  const inProgress = tasks.filter(t => t.status === 'IN_PROGRESS').length;
  const overdue = tasks.filter(t => t.status === 'OVERDUE').length;

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ListTodo className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Task Manager</h1>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Total</p><p className="text-2xl font-bold">{total}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">In Progress</p><p className="text-2xl font-bold text-blue-600">{inProgress}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Completed</p><p className="text-2xl font-bold text-emerald-600">{completed}</p></div>
        <div className="bg-white rounded-xl border p-4"><p className="text-sm text-gray-500">Overdue</p><p className="text-2xl font-bold text-red-600">{overdue}</p></div>
      </div>

      <div className="flex flex-wrap gap-2 mb-4">
        <select value={statusFilter} onChange={e => setStatusFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Status</option>
          <option value="PENDING">Pending</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="COMPLETED">Completed</option>
          <option value="OVERDUE">Overdue</option>
        </select>
        <select value={priorityFilter} onChange={e => setPriorityFilter(e.target.value)} className="border rounded-lg px-3 py-1.5 text-sm">
          <option value="">All Priority</option>
          <option value="CRITICAL">Critical</option>
          <option value="HIGH">High</option>
          <option value="MEDIUM">Medium</option>
          <option value="LOW">Low</option>
        </select>
      </div>

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">Task</th>
              <th className="text-left p-3 font-medium">Priority</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Assigned To</th>
              <th className="text-left p-3 font-medium">Due Date</th>
              <th className="p-3 font-medium">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((t) => {
              const sc = STATUS_CONF[t.status] ?? STATUS_CONF.PENDING;
              return (
                <tr key={t.id} className="border-t hover:bg-gray-50">
                  <td className="p-3">
                    <div>
                      <p className="font-medium">{t.title}</p>
                      {t.description && <p className="text-xs text-gray-400 truncate max-w-xs">{t.description}</p>}
                    </div>
                  </td>
                  <td className="p-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${PRIORITY_COLORS[t.priority] ?? 'bg-gray-100'}`}>{t.priority}</span>
                  </td>
                  <td className="p-3">
                    <div className="flex items-center gap-1">
                      {sc.icon}
                      <span className={`px-2 py-1 rounded text-xs font-medium ${sc.color}`}>{t.status}</span>
                    </div>
                  </td>
                  <td className="p-3">{t.assignee?.name ?? t.assigneeId ?? '-'}</td>
                  <td className="p-3">{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}</td>
                  <td className="p-3 text-center">
                    <div className="flex gap-1 justify-center">
                      {t.status === 'PENDING' && (
                        <button onClick={() => updateStatus(t.id, 'IN_PROGRESS')} className="px-2 py-1 bg-blue-500 text-white rounded text-xs">Start</button>
                      )}
                      {t.status === 'IN_PROGRESS' && (
                        <button onClick={() => updateStatus(t.id, 'COMPLETED')} className="px-2 py-1 bg-emerald-500 text-white rounded text-xs">Complete</button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {tasks.length === 0 && (
              <tr><td colSpan={6} className="text-center py-12 text-gray-400">No tasks found</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
