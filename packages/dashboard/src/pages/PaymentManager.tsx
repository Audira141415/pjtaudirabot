import { useState, useEffect } from 'react';
import { api } from '../lib/api';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-blue-100 text-blue-800',
  PAID: 'bg-emerald-100 text-emerald-800',
  FAILED: 'bg-red-100 text-red-800',
  REFUNDED: 'bg-amber-100 text-amber-800',
  CANCELLED: 'bg-gray-100 text-gray-700',
};

const METHOD_ICONS: Record<string, string> = {
  bank_transfer: '🏦', qris: '📱', ewallet: '💳', cash: '💵',
};

function formatCurrency(amount: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency }).format(amount);
}

export default function PaymentManager() {
  const [payments, setPayments] = useState<Array<Record<string, unknown>>>([]);
  const [summary, setSummary] = useState<Record<string, unknown>>({});
  const [statusFilter, setStatusFilter] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({ transactionId: '', amount: '', currency: 'IDR', method: '', description: '', invoiceNumber: '', contactId: '' });

  const load = async () => {
    setLoading(true);
    try {
      const res = await api.getPayments(1, statusFilter || undefined);
      setPayments(res.data);
      setSummary(res.summary);
    } catch { /* empty */ }
    setLoading(false);
  };

  useEffect(() => { load(); }, [statusFilter]);

  const handleCreate = async () => {
    if (!form.transactionId || !form.amount) return;
    await api.createPayment(form);
    setForm({ transactionId: '', amount: '', currency: 'IDR', method: '', description: '', invoiceNumber: '', contactId: '' });
    setShowForm(false);
    load();
  };

  const handleStatusChange = async (id: string, status: string) => {
    await api.updatePayment(id, { status });
    load();
  };

  const totalPaid = (summary.totalPaid as number) || 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Payment Manager</h1>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm">
          + Catat Pembayaran
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl shadow p-4 col-span-2">
          <p className="text-sm text-gray-500">Total Pendapatan (Paid)</p>
          <p className="text-3xl font-bold text-emerald-600">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Total Transaksi</p>
          <p className="text-2xl font-bold">{(summary.totalTransactions as number) || 0}</p>
        </div>
        <div className="bg-white rounded-xl shadow p-4">
          <p className="text-sm text-gray-500">Pending</p>
          <p className="text-2xl font-bold text-blue-600">{payments.filter(p => p.status === 'PENDING').length}</p>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-white rounded-xl shadow p-6 space-y-4">
          <h2 className="font-semibold text-gray-700">Pembayaran Baru</h2>
          <div className="grid grid-cols-2 gap-4">
            <input className="px-3 py-2 border rounded-lg" placeholder="Transaction ID *" value={form.transactionId} onChange={e => setForm({ ...form, transactionId: e.target.value })} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Jumlah *" type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
            <input className="px-3 py-2 border rounded-lg" placeholder="Nomor Invoice" value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} />
            <select className="px-3 py-2 border rounded-lg" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
              <option value="">Metode Pembayaran</option>
              <option value="bank_transfer">Bank Transfer</option>
              <option value="qris">QRIS</option>
              <option value="ewallet">E-Wallet</option>
              <option value="cash">Cash</option>
            </select>
            <select className="px-3 py-2 border rounded-lg" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
              <option value="IDR">IDR</option>
              <option value="USD">USD</option>
            </select>
          </div>
          <input className="w-full px-3 py-2 border rounded-lg" placeholder="Deskripsi" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={handleCreate} className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm">Simpan</button>
            <button onClick={() => setShowForm(false)} className="px-4 py-2 bg-gray-200 rounded-lg text-sm">Batal</button>
          </div>
        </div>
      )}

      {/* Filter */}
      <div className="flex gap-2">
        {['', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].map(s => (
          <button key={s} onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-sm ${statusFilter === s ? 'bg-indigo-600 text-white' : 'bg-white border text-gray-600 hover:bg-gray-50'}`}>
            {s || 'Semua'}
          </button>
        ))}
      </div>

      {/* Payment List */}
      <div className="bg-white rounded-xl shadow">
        {loading ? (
          <div className="p-8 text-center text-gray-400">Loading...</div>
        ) : payments.length === 0 ? (
          <div className="p-8 text-center text-gray-400">Belum ada transaksi</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="text-left text-gray-500 border-b bg-gray-50">
                <th className="p-3">ID</th><th className="p-3">Invoice</th><th className="p-3">Metode</th><th className="p-3 text-right">Jumlah</th><th className="p-3">Status</th><th className="p-3">Deskripsi</th><th className="p-3">Tanggal</th><th className="p-3">Aksi</th>
              </tr></thead>
              <tbody className="divide-y">
                {payments.map(p => (
                  <tr key={p.id as string} className="hover:bg-gray-50">
                    <td className="p-3 font-mono text-xs">{(p.transactionId as string).slice(0, 16)}</td>
                    <td className="p-3">{(p.invoiceNumber as string) || '-'}</td>
                    <td className="p-3">{METHOD_ICONS[p.method as string] || '💳'} {(p.method as string) || '-'}</td>
                    <td className="p-3 text-right font-medium">{formatCurrency(p.amount as number, p.currency as string)}</td>
                    <td className="p-3"><span className={`px-2 py-0.5 rounded-full text-xs ${STATUS_COLORS[p.status as string]}`}>{p.status as string}</span></td>
                    <td className="p-3 text-gray-600 max-w-[200px] truncate">{(p.description as string) || '-'}</td>
                    <td className="p-3 text-gray-400 whitespace-nowrap">{new Date(p.createdAt as string).toLocaleDateString('id-ID')}</td>
                    <td className="p-3">
                      {p.status === 'PENDING' && (
                        <div className="flex gap-1">
                          <button onClick={() => handleStatusChange(p.id as string, 'PAID')} className="px-2 py-0.5 text-xs bg-emerald-100 text-emerald-700 rounded">Lunas</button>
                          <button onClick={() => handleStatusChange(p.id as string, 'FAILED')} className="px-2 py-0.5 text-xs bg-red-100 text-red-700 rounded">Gagal</button>
                        </div>
                      )}
                      {p.status === 'PAID' && (
                        <button onClick={() => handleStatusChange(p.id as string, 'REFUNDED')} className="px-2 py-0.5 text-xs bg-amber-100 text-amber-700 rounded">Refund</button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
