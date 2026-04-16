import { useState, useEffect } from 'react';
import { api } from '../lib/api';
import { 
  CreditCard, 
  Plus, 
  X, 
  Trash2, 
  Activity, 
  ShieldCheck, 
  Zap, 
  Info, 
  ChevronRight, 
  Loader2, 
  CheckCircle2, 
  Coins, 
  TrendingUp, 
  Clock, 
  Download, 
  Filter, 
  LayoutGrid, 
  Search, 
  Banknote, 
  QrCode, 
  Smartphone, 
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  AlertCircle
} from 'lucide-react';
import { toast } from '../components/Toast';

const STATUS_COLORS: Record<string, string> = {
  PENDING: 'bg-sky-50 dark:bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-100 dark:border-sky-500/20',
  PAID: 'bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border-emerald-100 dark:border-emerald-500/20',
  FAILED: 'bg-rose-50 dark:bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-100 dark:border-rose-500/20',
  REFUNDED: 'bg-amber-50 dark:bg-amber-500/10 text-amber-600 dark:text-amber-500 border-amber-100 dark:border-amber-500/20',
  CANCELLED: 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 border-slate-200 dark:border-slate-700',
};

const METHOD_ICONS: Record<string, any> = {
  bank_transfer: Banknote,
  qris: QrCode,
  ewallet: Wallet,
  cash: Coins,
};

function formatCurrency(amount: number, currency = 'IDR') {
  return new Intl.NumberFormat('id-ID', { style: 'currency', currency, maximumFractionDigits: 0 }).format(amount);
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
    try {
      await api.createPayment(form);
      setForm({ transactionId: '', amount: '', currency: 'IDR', method: '', description: '', invoiceNumber: '', contactId: '' });
      setShowForm(false);
      toast({ type: 'success', title: 'TRANSACTION_LOGGED', message: 'Revenue node synchronized.' });
      load();
    } catch {
       toast({ type: 'error', title: 'LOG_FAILURE', message: 'Failed to record fiscal node.' });
    }
  };

  const handleStatusChange = async (id: string, status: string) => {
    try {
      await api.updatePayment(id, { status });
      toast({ type: 'info', title: 'STATUS_RECALIBRATED', message: `Transaction ${id.slice(0, 8)} updated to ${status}.` });
      load();
    } catch {}
  };

  const totalPaid = (summary.totalPaid as number) || 0;

  if (loading && payments.length === 0) return (
    <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
      <div className="w-10 h-10 border-4 border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin" />
      <span className="text-[10px] font-black text-slate-400 dark:text-indigo-400 uppercase tracking-[0.4em] animate-pulse italic">Connecting to Fiscal Ledger...</span>
    </div>
  );

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700">
      {/* Header Intelligence */}
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Coins className="w-5 h-5 text-indigo-500 dark:text-indigo-400" />
            <span className="text-indigo-600 dark:text-indigo-400 text-[10px] font-black uppercase tracking-[0.3em]">Fiscal Revenue Engine</span>
          </div>
          <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight uppercase italic mb-1 underline decoration-indigo-600/30 underline-offset-[12px] decoration-4">Payment Manager</h1>
          <p className="text-slate-500 dark:text-slate-400 font-medium text-sm mt-4">Monitor global transaction flow, manage invoice status, and trace revenue trajectories.</p>
        </div>

        <button 
           onClick={() => setShowForm(!showForm)} 
           className="flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-[24px] font-black text-[10px] uppercase tracking-widest shadow-2xl shadow-indigo-600/20 hover:scale-[1.05] active:scale-95 transition-all"
        >
          {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />} {showForm ? 'Abort Transaction' : 'Log Transaction'}
        </button>
      </div>

      {/* Stats Cluster */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative col-span-1 md:col-span-2">
           <div className="absolute right-0 top-0 bottom-0 w-1.5 bg-emerald-500" />
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
             <TrendingUp className="w-3.5 h-3.5" /> Total Realized Revenue (Paid)
           </p>
           <p className="text-4xl font-black italic tracking-tighter text-emerald-600 dark:text-emerald-500 group-hover:scale-[1.02] transition-transform origin-left">{formatCurrency(totalPaid)}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
           <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-50 dark:bg-slate-800 group-hover:bg-indigo-600 transition-all" />
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Activity className="w-3.5 h-3.5" /> Node Count
           </p>
           <p className="text-3xl font-black italic tracking-tighter text-slate-900 dark:text-white">{(summary.totalTransactions as number) || 0}</p>
        </div>
        <div className="bg-white dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all hover:shadow-xl group overflow-hidden relative">
           <div className="absolute right-0 top-0 bottom-0 w-1 bg-slate-50 dark:bg-slate-800 group-hover:bg-sky-500 transition-all" />
           <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-2">
              <Clock className="w-3.5 h-3.5" /> Pending Node
           </p>
           <p className="text-3xl font-black italic tracking-tighter text-sky-500">{payments.filter(p => p.status === 'PENDING').length}</p>
        </div>
      </div>

      {/* Log Form */}
      {showForm && (
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-indigo-500/20 rounded-[48px] p-10 space-y-10 animate-in zoom-in-95 duration-500 relative overflow-hidden ring-1 ring-black/5 dark:ring-indigo-500/30 shadow-2xl">
          <div className="absolute -top-32 -right-32 w-64 h-64 bg-indigo-600/5 dark:bg-indigo-600/10 blur-[100px]" />
          
          <div className="flex items-center justify-between relative z-10">
            <div className="flex items-center gap-3">
               <Zap className="w-5 h-5 text-amber-500" />
               <h3 className="text-xl font-black text-slate-900 dark:text-white italic uppercase tracking-tight">Fiscal Asset Log</h3>
            </div>
            <button onClick={() => setShowForm(false)} className="p-3 text-slate-400 hover:text-rose-600 transition-colors">
               <X className="w-6 h-6" />
            </button>
          </div>

          <div className="space-y-6 relative z-10">
             <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Transaction Nodal ID *</label>
                   <input value={form.transactionId} onChange={e => setForm({ ...form, transactionId: e.target.value })} placeholder="e.g. TX_88921_ALPHA" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Fiscal Nominal *</label>
                   <input type="number" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="0.00" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all" />
                </div>
             </div>
             
             <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Invoice Label</label>
                   <input value={form.invoiceNumber} onChange={e => setForm({ ...form, invoiceNumber: e.target.value })} placeholder="e.g. INV-2024-001" className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800" />
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Settlement Node</label>
                   <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-indigo-500 appearance-none cursor-pointer" value={form.method} onChange={e => setForm({ ...form, method: e.target.value })}>
                      <option value="">Omni-Method</option>
                      <option value="bank_transfer">BANK_WIRE</option>
                      <option value="qris">DYNAMIC_QR</option>
                      <option value="ewallet">DIGITAL_WALLET</option>
                      <option value="cash">PHYSICAL_TENDER</option>
                   </select>
                </div>
                <div className="space-y-2">
                   <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Currency Hub</label>
                   <select className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl px-6 py-4 text-[10px] font-black uppercase tracking-widest text-slate-500 outline-none focus:border-indigo-500 appearance-none cursor-pointer" value={form.currency} onChange={e => setForm({ ...form, currency: e.target.value })}>
                      <option value="IDR">IDR (Rupiah)</option>
                      <option value="USD">USD (Scalar)</option>
                   </select>
                </div>
             </div>

             <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-2">Transactional Meta</label>
                <textarea className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-[32px] p-8 text-slate-900 dark:text-white text-sm font-bold shadow-inner outline-none focus:border-indigo-500 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-800 italic" placeholder="Quantify transaction context..." rows={2} value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
             </div>
          </div>

          <div className="flex justify-end gap-4 pt-4 border-t border-slate-100 dark:border-slate-800/50 relative z-10">
             <button onClick={() => setShowForm(false)} className="px-8 py-4 text-slate-400 dark:text-slate-500 font-black uppercase text-[10px] tracking-widest hover:text-slate-600 dark:hover:text-white transition-all">Abort</button>
             <button onClick={handleCreate} className="px-12 py-4 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-[10px] tracking-widest shadow-xl shadow-indigo-600/20 hover:scale-[1.05] transition-all">Commit Asset</button>
          </div>
        </div>
      )}

      {/* Filter Array */}
      <div className="flex flex-wrap gap-3 pb-2 overflow-x-auto scrollbar-hide">
        {['', 'PENDING', 'PAID', 'FAILED', 'REFUNDED', 'CANCELLED'].map(s => (
          <button 
             key={s} 
             onClick={() => setStatusFilter(s)}
             className={`px-8 py-3 rounded-[24px] text-[10px] font-black uppercase tracking-widest transition-all border ${statusFilter === s ? 'bg-indigo-600 text-white border-indigo-500 shadow-xl shadow-indigo-600/20' : 'bg-white dark:bg-slate-950/40 border-slate-100 dark:border-slate-800 text-slate-400 dark:text-slate-600 hover:border-indigo-500/30'}`}
          >
            {s || 'OMNI_STATUS'}
          </button>
        ))}
      </div>

      {/* Payment Ledger (Table) */}
      <div className="bg-white dark:bg-slate-950/40 border border-slate-100 dark:border-slate-800/80 rounded-[48px] overflow-hidden shadow-sm dark:shadow-2xl backdrop-blur-3xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead className="bg-slate-50 dark:bg-slate-900/40 border-b border-slate-100 dark:border-slate-800/50">
              <tr>
                <th className="px-10 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Asset ID</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Invoice Hub</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Settlement Logic</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em] text-right">Fiscal Nominal</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Integrity Status</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 dark:text-slate-700 uppercase tracking-[0.2em]">Temporal Fix</th>
                <th className="px-10 py-6 text-right"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 dark:divide-slate-800/30">
              {payments.map(p => {
                const MethodIcon = METHOD_ICONS[p.method as string] || CreditCard;
                return (
                  <tr key={p.id as string} className="group hover:bg-slate-50 dark:hover:bg-slate-900 transition-all">
                    <td className="px-10 py-6">
                       <code className="text-[10px] font-black text-slate-300 dark:text-slate-700 group-hover:text-indigo-500 transition-colors uppercase">{(p.transactionId as string).slice(0, 16)}</code>
                    </td>
                    <td className="px-8 py-6">
                       <p className="text-[11px] font-black text-slate-900 dark:text-white uppercase italic tracking-tight underline decoration-slate-100 dark:decoration-slate-800 decoration-2">{(p.invoiceNumber as string) || 'NON_INVOICED'}</p>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex items-center gap-2">
                          <MethodIcon className="w-3.5 h-3.5 text-slate-300 dark:text-slate-700" />
                          <span className="text-[10px] font-black text-slate-400 dark:text-slate-600 uppercase tracking-widest">{(p.method as string) || '-'}</span>
                       </div>
                    </td>
                    <td className="px-8 py-6 text-right">
                       <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight">{formatCurrency(p.amount as number, p.currency as string)}</p>
                    </td>
                    <td className="px-8 py-6">
                       <span className={`px-4 py-1.5 rounded-xl text-[9px] font-black uppercase tracking-widest border shadow-sm ${STATUS_COLORS[p.status as string]}`}>{p.status as string}</span>
                    </td>
                    <td className="px-8 py-6">
                       <div className="flex flex-col">
                          <span className="text-[10px] font-black text-slate-900 dark:text-white italic uppercase tracking-tight leading-none">{new Date(p.createdAt as string).toLocaleDateString()}</span>
                          <span className="text-[9px] font-black text-slate-300 dark:text-slate-700 mt-1 uppercase tracking-widest">{new Date(p.createdAt as string).toLocaleTimeString()}</span>
                       </div>
                    </td>
                    <td className="px-10 py-6 text-right">
                       <div className="flex gap-2 justify-end">
                          {p.status === 'PENDING' && (
                            <>
                               <button onClick={() => handleStatusChange(p.id as string, 'PAID')} className="px-4 py-2 bg-emerald-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-emerald-500/20 hover:scale-[1.05] transition-all">Settle</button>
                               <button onClick={() => handleStatusChange(p.id as string, 'FAILED')} className="px-4 py-2 bg-rose-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-rose-500/20 hover:scale-[1.05] transition-all">Reject</button>
                            </>
                          )}
                          {p.status === 'PAID' && (
                             <button onClick={() => handleStatusChange(p.id as string, 'REFUNDED')} className="px-4 py-2 bg-amber-500 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-[1.05] transition-all">Refund</button>
                          )}
                       </div>
                    </td>
                  </tr>
                );
              })}
              {payments.length === 0 && (
                 <tr>
                    <td colSpan={7} className="px-10 py-24 text-center grayscale opacity-10">
                       <Coins className="w-20 h-20 text-slate-200 dark:text-slate-800 mx-auto mb-4" />
                       <p className="text-[12px] font-black uppercase tracking-[0.5em] text-slate-400 dark:text-slate-600">Zero Fiscal Nodes Detected</p>
                    </td>
                 </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Logic Insight Footer */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 rounded-[40px] shadow-sm dark:shadow-none transition-all flex flex-col md:flex-row items-center justify-between gap-6 opacity-80 hover:opacity-100">
         <div className="flex items-center gap-4">
            <div className="p-4 bg-indigo-500/10 rounded-2xl border border-indigo-500/20 text-indigo-500">
               <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
               <h4 className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-1">Fiscal Strategy</h4>
               <p className="text-sm font-black text-slate-900 dark:text-white italic tracking-tight uppercase">Revenue Settlement Protocols Synchronized</p>
            </div>
         </div>
         <div className="px-6 py-3 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl flex items-center gap-3">
            <Info className="w-4 h-4 text-emerald-500" />
            <span className="text-[9px] font-black text-slate-500 dark:text-slate-600 uppercase tracking-[0.2em] italic">Transaction logs are Immutable and cryptographically verified by the core node.</span>
         </div>
      </div>
    </div>
  );
}
