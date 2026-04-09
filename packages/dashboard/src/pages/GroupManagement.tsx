import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Users, MessageSquare } from 'lucide-react';

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
      <div className="flex items-center gap-2 mb-6">
        <Users className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Group Management</h1>
        <span className="text-sm text-gray-400">{groups.length} groups</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {groups.map((g) => (
          <div key={g.id} className="bg-white rounded-xl border p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="bg-brand-50 rounded-full p-2">
                <MessageSquare className="w-5 h-5 text-brand-500" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-bold truncate">{g.name ?? g.groupName ?? g.chatId}</h3>
                <p className="text-xs text-gray-400">ID: {g.chatId ?? g.id}</p>
                {g.platform && <p className="text-xs text-gray-500">{g.platform}</p>}
              </div>
            </div>

            <div className="space-y-2 mb-3">
              {g.memberCount != null && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Members</span>
                  <span className="font-medium">{g.memberCount}</span>
                </div>
              )}
              {g.region && (
                <div className="flex justify-between text-sm">
                  <span className="text-gray-500">Region</span>
                  <span className="font-medium">{g.region}</span>
                </div>
              )}
            </div>

            <div className="space-y-2 border-t pt-3">
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Bot Active</span>
                <button onClick={() => toggleFeature(g.id, g, 'botEnabled')} className={`w-10 h-5 rounded-full transition ${g.botEnabled ? 'bg-brand-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${g.botEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Moderation</span>
                <button onClick={() => toggleFeature(g.id, g, 'moderationEnabled')} className={`w-10 h-5 rounded-full transition ${g.moderationEnabled ? 'bg-brand-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${g.moderationEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </button>
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Ticket Creation</span>
                <button onClick={() => toggleFeature(g.id, g, 'ticketEnabled')} className={`w-10 h-5 rounded-full transition ${g.ticketEnabled ? 'bg-brand-500' : 'bg-gray-300'}`}>
                  <div className={`w-4 h-4 bg-white rounded-full shadow transition-transform ${g.ticketEnabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
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
