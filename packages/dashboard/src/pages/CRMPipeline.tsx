import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Kanban, Plus, Trash2, X, ArrowRight } from 'lucide-react';

const STAGES = ['LEAD','QUALIFIED','PROPOSAL','NEGOTIATION','WON','LOST'];
const STAGE_COLOR: Record<string, string> = { LEAD: 'bg-gray-100 text-gray-700', QUALIFIED: 'bg-blue-100 text-blue-700', PROPOSAL: 'bg-purple-100 text-purple-700', NEGOTIATION: 'bg-amber-100 text-amber-700', WON: 'bg-emerald-100 text-emerald-700', LOST: 'bg-red-100 text-red-700' };

export default function CRMPipeline() {
  const [deals, setDeals] = useState<Array<Record<string, any>>>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ title: '', contactName: '', value: 0, currency: 'IDR', stage: 'LEAD', probability: 10, notes: '' });

  const load = async () => { setLoading(true); try { const r = await api.getDeals(); setDeals(r.data ?? []); } catch {} finally { setLoading(false); } };
  useEffect(() => { load(); }, []);

  const save = async () => { if (!form.title) return; await api.createDeal(form); setShowForm(false); setForm({ title: '', contactName: '', value: 0, currency: 'IDR', stage: 'LEAD', probability: 10, notes: '' }); load(); };
  const moveStage = async (id: string, stage: string) => { await api.updateDeal(id, { stage }); load(); };
  const remove = async (id: string) => { await api.deleteDeal(id); load(); };

  const fmtMoney = (v: number) => new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(v);

  if (loading) return <div className="flex items-center justify-center h-64"><div className="animate-spin w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full" /></div>;

  const totalValue = deals.filter(d => d.stage !== 'LOST').reduce((s, d) => s + (d.value || 0), 0);
  const wonValue = deals.filter(d => d.stage === 'WON').reduce((s, d) => s + (d.value || 0), 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2"><Kanban className="w-6 h-6 text-brand-500" /><h1 className="text-2xl font-bold">CRM Pipeline</h1></div>
        <button onClick={() => setShowForm(true)} className="flex items-center gap-2 bg-brand-500 text-white px-4 py-2 rounded-lg hover:bg-brand-600"><Plus className="w-4 h-4" /> Deal Baru</button>
      </div>

      <div className="grid grid-cols-3 gap-4 mb-6">
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-sm text-gray-500">Total Pipeline</p><p className="text-xl font-bold">{fmtMoney(totalValue)}</p></div>
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-sm text-gray-500">Won</p><p className="text-xl font-bold text-emerald-600">{fmtMoney(wonValue)}</p></div>
        <div className="bg-white border rounded-xl p-4 text-center"><p className="text-sm text-gray-500">Total Deals</p><p className="text-xl font-bold">{deals.length}</p></div>
      </div>

      {showForm && (
        <div className="bg-white border rounded-xl p-5 mb-4">
          <div className="flex justify-between mb-4"><h3 className="font-bold">Deal Baru</h3><button onClick={() => setShowForm(false)}><X className="w-5 h-5" /></button></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
            <input value={form.title} onChange={e => setForm({...form, title: e.target.value})} placeholder="Judul deal" className="border rounded-lg px-3 py-2" />
            <input value={form.contactName} onChange={e => setForm({...form, contactName: e.target.value})} placeholder="Nama kontak" className="border rounded-lg px-3 py-2" />
            <input type="number" value={form.value} onChange={e => setForm({...form, value: parseInt(e.target.value) || 0})} placeholder="Nilai" className="border rounded-lg px-3 py-2" />
            <input type="number" value={form.probability} onChange={e => setForm({...form, probability: parseInt(e.target.value) || 0})} placeholder="Probabilitas %" className="border rounded-lg px-3 py-2" />
          </div>
          <textarea value={form.notes} onChange={e => setForm({...form, notes: e.target.value})} placeholder="Catatan..." rows={2} className="w-full border rounded-lg px-3 py-2 mb-3" />
          <button onClick={save} className="bg-brand-500 text-white px-6 py-2 rounded-lg hover:bg-brand-600">Simpan</button>
        </div>
      )}

      <div className="flex gap-3 overflow-x-auto pb-4">
        {STAGES.map(stage => {
          const stageDeals = deals.filter(d => d.stage === stage);
          const stageVal = stageDeals.reduce((s, d) => s + (d.value || 0), 0);
          return (
            <div key={stage} className="min-w-[280px] flex-1">
              <div className="flex items-center justify-between mb-2">
                <span className={`px-2 py-1 rounded text-xs font-bold ${STAGE_COLOR[stage]}`}>{stage}</span>
                <span className="text-xs text-gray-500">{stageDeals.length} • {fmtMoney(stageVal)}</span>
              </div>
              <div className="space-y-2">
                {stageDeals.map(d => (
                  <div key={d.id} className="bg-white border rounded-xl p-3">
                    <div className="flex justify-between items-start mb-2">
                      <h4 className="font-medium text-sm">{d.title}</h4>
                      <button onClick={() => remove(d.id)} className="p-1 hover:bg-red-50 rounded"><Trash2 className="w-3 h-3 text-red-400" /></button>
                    </div>
                    {d.contactName && <p className="text-xs text-gray-500 mb-1">{d.contactName}</p>}
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm font-bold text-brand-700">{fmtMoney(d.value || 0)}</span>
                      <span className="text-xs text-gray-400">{d.probability}%</span>
                    </div>
                    {stage !== 'WON' && stage !== 'LOST' && (
                      <div className="flex gap-1">
                        {STAGES.filter(s => s !== stage && s !== 'LOST').slice(0, 3).map(s => (
                          <button key={s} onClick={() => moveStage(d.id, s)} className="flex-1 text-xs py-1 bg-gray-50 hover:bg-gray-100 rounded flex items-center justify-center gap-0.5"><ArrowRight className="w-3 h-3" />{s.slice(0, 4)}</button>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
