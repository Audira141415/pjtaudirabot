import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { ArrowRightLeft, Sun, Moon, Sunset, Clock, X } from 'lucide-react';

const SHIFT_ICONS: Record<string, JSX.Element> = {
  PAGI: <Sun className="w-5 h-5 text-amber-500" />,
  SIANG: <Sunset className="w-5 h-5 text-orange-500" />,
  MALAM: <Moon className="w-5 h-5 text-indigo-500" />,
};

const SHIFT_COLORS: Record<string, string> = {
  PAGI: 'bg-amber-50 border-amber-200',
  SIANG: 'bg-orange-50 border-orange-200',
  MALAM: 'bg-indigo-50 border-indigo-200',
};

export default function ShiftHandoverPage() {
  const [handovers, setHandovers] = useState<Array<Record<string, any>>>([]);
  const [currentShift, setCurrentShift] = useState<Record<string, any> | null>(null);
  const [loading, setLoading] = useState(true);
  const [detail, setDetail] = useState<Record<string, any> | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [h, c] = await Promise.all([api.getShiftHandovers(), api.getCurrentShift()]);
        setHandovers((h.data as any) ?? []);
        setCurrentShift((c as any)?.data ?? c);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    load();
  }, []);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  return (
    <div>
      <div className="flex items-center gap-2 mb-6">
        <ArrowRightLeft className="w-6 h-6 text-brand-500" />
        <h1 className="text-2xl font-bold">Shift Handover</h1>
      </div>

      {currentShift && (
        <div className={`rounded-xl border p-5 mb-6 ${SHIFT_COLORS[currentShift.shiftType] ?? 'bg-gray-50 border-gray-200'}`}>
          <div className="flex items-center gap-3 mb-3">
            {SHIFT_ICONS[currentShift.shiftType] ?? <Clock className="w-5 h-5 text-gray-500" />}
            <div>
              <h2 className="font-bold text-lg">Current Shift: {currentShift.shiftType}</h2>
              <p className="text-sm text-gray-600">
                Operator: {currentShift.user?.name ?? currentShift.userId} · Since {new Date(currentShift.shiftStart).toLocaleTimeString()}
              </p>
            </div>
          </div>
          {currentShift.highlights && (
            <div className="bg-white/60 rounded-lg p-3 mb-2">
              <p className="text-sm font-medium mb-1">Highlights</p>
              <p className="text-sm text-gray-600">{currentShift.highlights}</p>
            </div>
          )}
          {currentShift.actionItems && currentShift.actionItems.length > 0 && (
            <div className="bg-white/60 rounded-lg p-3">
              <p className="text-sm font-medium mb-1">Action Items</p>
              <ul className="text-sm text-gray-600 list-disc list-inside">
                {(currentShift.actionItems as string[]).map((item: string, i: number) => <li key={i}>{item}</li>)}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left p-3 font-medium">Date</th>
              <th className="text-left p-3 font-medium">Shift</th>
              <th className="text-left p-3 font-medium">Operator</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Highlights</th>
              <th className="text-left p-3 font-medium">Open Tickets</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {handovers.map((h) => (
              <tr key={h.id} className="border-t hover:bg-gray-50">
                <td className="p-3">{new Date(h.shiftStart).toLocaleDateString()}</td>
                <td className="p-3">
                  <div className="flex items-center gap-1">
                    {SHIFT_ICONS[h.shiftType]}
                    <span>{h.shiftType}</span>
                  </div>
                </td>
                <td className="p-3">{h.user?.name ?? h.userId}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${h.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-700' : h.status === 'ACTIVE' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                    {h.status}
                  </span>
                </td>
                <td className="p-3 max-w-xs truncate">{h.highlights || '-'}</td>
                <td className="p-3">{h.openTickets ?? 0}</td>
                <td className="p-3">
                  <button onClick={() => setDetail(h)} className="text-brand-500 text-xs hover:underline">Detail</button>
                </td>
              </tr>
            ))}
            {handovers.length === 0 && (
              <tr><td colSpan={7} className="text-center py-12 text-gray-400">No handover records</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {detail && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setDetail(null)}>
          <div className="bg-white rounded-xl max-w-lg w-full max-h-[80vh] overflow-auto p-6" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold">Handover Detail</h2>
              <button onClick={() => setDetail(null)}><X className="w-5 h-5" /></button>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex items-center gap-2">{SHIFT_ICONS[detail.shiftType]} <span className="font-bold">{detail.shiftType}</span> — {detail.user?.name ?? detail.userId}</div>
              <div><strong>Period:</strong> {new Date(detail.shiftStart).toLocaleString()} → {detail.shiftEnd ? new Date(detail.shiftEnd).toLocaleString() : 'Active'}</div>
              <div><strong>Status:</strong> {detail.status}</div>
              {detail.openTickets != null && <div><strong>Open Tickets:</strong> {detail.openTickets}</div>}
              {detail.resolvedTickets != null && <div><strong>Resolved Tickets:</strong> {detail.resolvedTickets}</div>}
              {detail.escalatedTickets != null && <div><strong>Escalated Tickets:</strong> {detail.escalatedTickets}</div>}
              {detail.highlights && <div><strong>Highlights:</strong><p className="mt-1 text-gray-600">{detail.highlights}</p></div>}
              {detail.notes && <div><strong>Notes:</strong><p className="mt-1 text-gray-600">{detail.notes}</p></div>}
              {detail.actionItems?.length > 0 && (
                <div>
                  <strong>Action Items:</strong>
                  <ul className="list-disc list-inside mt-1 text-gray-600">
                    {(detail.actionItems as string[]).map((a: string, i: number) => <li key={i}>{a}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
