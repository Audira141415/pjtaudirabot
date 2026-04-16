import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bot, Loader2 } from 'lucide-react';
import { api } from '../lib/api';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { token } = await api.login(username, password);
      localStorage.setItem('admin_token', token);
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-950 relative overflow-hidden selection:bg-indigo-500/30">
      {/* Decorative Gradients */}
      <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-600/10 dark:bg-indigo-600/5 blur-[150px] pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-rose-600/5 dark:bg-rose-600/5 blur-[150px] pointer-events-none" />

      <div className="w-full max-w-md relative z-10 px-6">
        {/* Logo */}
        <div className="text-center mb-10 group">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-[24px] bg-indigo-600 shadow-2xl shadow-indigo-600/30 mb-6 group-hover:scale-110 group-hover:rotate-12 transition-transform duration-500">
            <Bot className="w-9 h-9 text-white group-hover:animate-pulse" />
          </div>
          <h1 className="text-4xl font-black italic tracking-tighter uppercase text-slate-950 dark:text-white leading-none">
             Audira<span className="text-indigo-500 underline decoration-indigo-400 decoration-4 underline-offset-4">OS</span>
          </h1>
          <p className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.4em] mt-4">Administrative Neural Link</p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/80 dark:bg-slate-900/40 backdrop-blur-3xl rounded-[40px] border border-slate-200 dark:border-white/5 p-10 space-y-8 shadow-2xl shadow-slate-950/20 dark:shadow-none">
          {error && (
            <div className="bg-rose-500/10 text-rose-500 text-[11px] font-black uppercase tracking-wider px-4 py-3 rounded-2xl border border-rose-500/20 animate-in fade-in slide-in-from-top-1">
              {error}
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Identity Secret</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/50 px-6 py-4 rounded-[20px] border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
              placeholder="operator_id"
              required
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-widest ml-1">Access Fragment</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-slate-50 dark:bg-slate-950/50 px-6 py-4 rounded-[20px] border border-slate-200 dark:border-white/5 text-slate-950 dark:text-white font-bold text-sm focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/50 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-700"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-5 px-4 rounded-[24px] bg-indigo-600 text-white font-black text-xs uppercase tracking-[0.3em] hover:bg-white hover:text-indigo-600 hover:shadow-2xl hover:shadow-indigo-600/30 border-2 border-transparent hover:border-indigo-600 disabled:opacity-50 transition-all duration-300 flex items-center justify-center gap-3 active:scale-[0.98]"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : null}
            Establish Link
          </button>
        </form>
        
        <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
           Authenticated End-to-End Encryption Active
        </p>
      </div>
    </div>
  );
}
