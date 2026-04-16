import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { GitBranch, Plus, Loader2, ChevronRight, Trash2, X, Circle } from 'lucide-react';

interface FlowStep {
  id: string;
  prompt: string;
  expectedType: string;
  next?: string | null;
}

interface Flow {
  id: string;
  name: string;
  description: string | null;
  trigger: string;
  isActive: boolean;
  steps: FlowStep[];
  createdAt: string;
}

export default function FlowsPage() {
  const [flows, setFlows] = useState<Flow[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    description: '',
    trigger: '',
    steps: [{ prompt: '', expectedType: 'text' }],
  });

  const refreshFlows = () => {
    api.getFlows()
      .then((res) => setFlows(res.data as unknown as Flow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshFlows();
  }, []);

  const handleToggle = async (flow: Flow) => {
    try {
      await api.updateFlow(flow.id, { isActive: !flow.isActive });
      refreshFlows();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update flow');
    }
  };

  const handleDelete = async (flow: Flow) => {
    if (!confirm(`Delete flow "${flow.name}"?`)) return;
    try {
      await api.deleteFlow(flow.id);
      refreshFlows();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to delete flow');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.trigger.trim()) return;
    setSubmitting(true);
    try {
      const res = await api.createFlow({
        name: form.name,
        description: form.description || undefined,
        trigger: form.trigger,
        steps: form.steps.filter((s) => s.prompt.trim()),
      });
      setFlows((prev) => [res.data as unknown as Flow, ...prev]);
      setShowForm(false);
      setForm({ name: '', description: '', trigger: '', steps: [{ prompt: '', expectedType: 'text' }] });
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to create flow');
    } finally {
      setSubmitting(false);
    }
  };

  const addStep = () => {
    setForm((prev) => ({
      ...prev,
      steps: [...prev.steps, { prompt: '', expectedType: 'text' }],
    }));
  };

  const updateStep = (index: number, field: string, value: string) => {
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.map((s, i) => (i === index ? { ...s, [field]: value } : s)),
    }));
  };

  const removeStep = (index: number) => {
    if (form.steps.length <= 1) return;
    setForm((prev) => ({
      ...prev,
      steps: prev.steps.filter((_, i) => i !== index),
    }));
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-brand-500/10 rounded-2xl border border-brand-500/20 glow-brand">
            <GitBranch className="w-8 h-8 text-brand-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">Logic Architect</h1>
            <p className="text-slate-500 dark:text-slate-400 text-sm">Design and deploy autonomous conversation workflows</p>
          </div>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 bg-gradient-to-r from-indigo-600 to-brand-600 text-white px-6 py-2.5 rounded-xl font-semibold shadow-lg shadow-brand-500/20 hover:scale-105 transition-transform active:scale-95"
        >
          <Plus className="w-5 h-5" /> Initialize Workflow
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="glass-dark p-8 rounded-3xl mb-8 border border-indigo-500/30 animate-slide-in">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-slate-900 dark:text-white uppercase tracking-tight">Workflow Configuration</h2>
            <button type="button" onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors"><X className="w-6 h-6" /></button>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Process Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. NOC Incident Triage"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
                required
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs font-bold text-slate-500 uppercase ml-1">Inauguration Trigger</label>
              <input
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                placeholder="e.g. !triage"
                className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 outline-none text-slate-900 dark:text-white font-mono transition-all placeholder:text-slate-400"
                required
              />
            </div>
          </div>
          
          <div className="mb-8">
            <label className="text-xs font-bold text-slate-500 uppercase ml-1">Scope Description</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/50 rounded-xl px-4 py-3 focus:border-brand-500 outline-none text-slate-900 dark:text-white transition-all placeholder:text-slate-400"
            />
          </div>

          <div className="mb-8 p-6 bg-slate-50 dark:bg-slate-900/60 rounded-3xl border border-slate-200 dark:border-slate-800/50">
            <label className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase mb-4 block">Sequence Definition</label>
            <div className="space-y-4">
              {form.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-4 p-4 bg-white dark:bg-slate-800/40 rounded-2xl border border-slate-200 dark:border-slate-700/30 group">
                  <span className="w-8 h-8 flex items-center justify-center rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-brand-600 dark:text-brand-400 font-mono text-xs">{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="md:col-span-3">
                      <input
                        value={step.prompt}
                        onChange={(e) => updateStep(idx, 'prompt', e.target.value)}
                        placeholder="Interrogation prompt..."
                        className="w-full bg-transparent border-b border-slate-200 dark:border-slate-700 focus:border-brand-500 py-1 text-sm outline-none text-slate-900 dark:text-slate-200 transition-colors"
                      />
                    </div>
                    <select
                      value={step.expectedType}
                      onChange={(e) => updateStep(idx, 'expectedType', e.target.value)}
                      className="bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-600 dark:text-slate-300 outline-none"
                    >
                      <option value="text">Textual</option>
                      <option value="number">Numeric</option>
                      <option value="email">Electronic Mail</option>
                      <option value="choice">Selection</option>
                    </select>
                  </div>
                  {form.steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(idx)} className="text-slate-600 hover:text-rose-500 transition-colors p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="mt-4 text-xs font-bold text-brand-600 dark:text-brand-400 hover:text-brand-500 transition-colors flex items-center gap-1 uppercase tracking-tighter ml-12">
              <Plus className="w-3 h-3" /> Append Protocol Step
            </button>
          </div>

          <div className="flex justify-end gap-4">
            <button type="button" onClick={() => setShowForm(false)} className="px-6 py-2.5 text-sm font-bold text-slate-500 hover:text-slate-300 transition-colors uppercase">Abuse Initialization</button>
            <button type="submit" disabled={submitting} className="px-8 py-2.5 rounded-xl bg-brand-500 text-white text-sm font-bold hover:bg-brand-600 shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Finalize Workflow
            </button>
          </div>
        </form>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
        {loading ? (
          <div className="glass-dark rounded-3xl py-20 flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-12 h-12 animate-spin mb-4 text-brand-500 opacity-50" />
            <p className="text-lg font-bold uppercase tracking-widest animate-pulse">Synchronizing logic matrix...</p>
          </div>
        ) : flows.length === 0 ? (
          <div className="glass-dark rounded-3xl py-20 flex flex-col items-center justify-center text-slate-500">
            <GitBranch className="w-16 h-16 mb-4 opacity-10" />
            <p className="text-xl font-medium">No active logic clusters detected</p>
            <p className="text-sm">Initiate a new workflow to begin autonomous operations</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
            {flows.map((flow) => (
              <div key={flow.id} className="glass-dark rounded-3xl border-slate-200 dark:border-slate-800 overflow-hidden group hover:border-brand-500/30 transition-all flex flex-col">
                <div className="p-8 pb-4">
                  <div className="flex items-start justify-between gap-4 mb-4">
                    <div 
                      className="cursor-pointer group/title"
                      onClick={() => setExpanded(expanded === flow.id ? null : flow.id)}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-xl font-bold text-slate-900 dark:text-white group-hover/title:text-brand-600 dark:group-hover/title:text-brand-400 transition-colors uppercase tracking-tight">{flow.name}</h3>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 font-mono">{flow.trigger}</span>
                      </div>
                      {flow.description && <p className="text-sm text-slate-500 leading-relaxed">{flow.description}</p>}
                    </div>
                    
                    <div className="flex items-center gap-3">
                      <button
                        onClick={() => handleToggle(flow)}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 ${
                          flow.isActive ? 'bg-emerald-500 shadow-lg shadow-emerald-500/20' : 'bg-slate-800'
                        }`}
                        title={flow.isActive ? 'Suspend Cluster' : 'Activate Cluster'}
                      >
                        <span className={`inline-block h-4 w-4 rounded-full bg-white shadow transform transition-all duration-300 ${flow.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                      </button>
                      <button
                        onClick={() => handleDelete(flow)}
                        className="p-2 text-slate-400 hover:text-rose-500 transition-colors"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-6">
                    <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-brand-600 dark:fill-brand-500 text-brand-600 dark:text-brand-500" /> {flow.steps?.length ?? 0} Nodes</span>
                    <span className="flex items-center gap-1"><Circle className="w-2 h-2 fill-slate-300 dark:fill-slate-700 text-slate-400 dark:text-slate-702" /> Deployment: Active</span>
                  </div>
                </div>

                {/* Visual Preview */}
                <div className="px-8 pb-8 pt-4 flex-1">
                   <div className="relative mt-8 min-h-[140px] flex items-center justify-start overflow-x-auto pb-4 custom-scrollbar">
                      {flow.steps && flow.steps.map((step, idx) => (
                        <div key={step.id} className="flex items-center shrink-0">
                          <div className="relative group/node text-center w-28">
                             <div className="w-10 h-10 mx-auto rounded-xl bg-slate-50 dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 group-hover/node:border-brand-500 flex items-center justify-center text-xs font-bold text-slate-500 dark:text-slate-400 group-hover/node:text-brand-600 dark:group-hover/node:text-brand-400 transition-all shadow-lg glow-brand/0 group-hover/node:glow-brand/30">
                                {idx + 1}
                             </div>
                             <div className="mt-3">
                               <p className="text-[10px] text-slate-900 dark:text-white font-bold opacity-0 group-hover/node:opacity-100 transition-opacity whitespace-nowrap overflow-hidden text-ellipsis px-2 uppercase tracking-tighter">Step Output</p>
                               <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-widest">{step.expectedType}</p>
                             </div>
                          </div>
                          {idx < flow.steps.length - 1 && (
                            <div className="w-12 h-px bg-gradient-to-r from-slate-700 to-slate-700 relative">
                               <ChevronRight className="w-3 h-3 text-slate-700 absolute -right-1.5 -top-1.5" />
                            </div>
                          )}
                        </div>
                      ))}
                   </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
