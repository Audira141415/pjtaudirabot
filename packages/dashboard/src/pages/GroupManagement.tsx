import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Users, MessageSquare, RefreshCw } from 'lucide-react';

export default function GroupManagementPage() {
  const [groups, setGroups] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    try { const res = await api.getGroups(); setGroups((res.data as any) ?? []); }
    catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => { load(); }, []);

  const toggleFeature = async (id: string, group: Record<string, any>, field: string) => {
    try {
      await api.updateGroup(id, { [field]: !group[field] });
      load();
    } catch (err) { console.error(err); }
  };

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Users className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Group Management</h1>
          <span className="text-sm text-gray-400">{groups.length} groups</span>
        </div>
        <button onClick={load} className="p-2 rounded-lg hover:bg-gray-100"><RefreshCw className="w-4 h-4" /></button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-brand-50 rounded-full p-2">
                <MessageSquare className="w-5 h-5 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{g.groupName ?? g.name ?? g.groupJid}</h3>
                <p className="text-xs text-gray-400">JID: {g.groupJid ?? g.id}</p>
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {g.participantCount != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Participants</span>
                  <span className="font-medium">{g.participantCount}</span>
                </div>
              )}
              {g.description && (
                <div className="text-sm text-gray-500 truncate">{g.description}</div>
              )}
              {g.lastMessageAt && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Last Message</span>
                  <span className="text-xs text-gray-400">{new Date(g.lastMessageAt).toLocaleString('id-ID')}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Monitored</span>
                <button onClick={() => toggleFeature(g.id, g, 'isMonitored')} className={`w-10 h-5 rounded-full transition ${g.isMonitored ? 'bg-brand-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${g.isMonitored ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Report Target</span>
                <button onClick={() => toggleFeature(g.id, g, 'isReportTarget')} className={`w-10 h-5 rounded-full transition ${g.isReportTarget ? 'bg-brand-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${g.isReportTarget ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
            </div>
          </div>
        ))}
        {groups.length === 0 && <div className="col-span-3 text-center py-12 text-gray-400">No groups registered</div>}
      </div>
    </div>
  );
}
