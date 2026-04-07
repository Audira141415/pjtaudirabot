import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { GitBranch, Plus, Loader2, ChevronDown, ChevronRight, Trash2 } from 'lucide-react';

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

  useEffect(() => {
    api.getFlows()
      .then((res) => setFlows(res.data as unknown as Flow[]))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

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
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <GitBranch className="w-6 h-6 text-brand-500" />
          <h1 className="text-2xl font-bold">Conversation Flows</h1>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="px-4 py-2 rounded-lg bg-brand-600 text-white font-medium hover:bg-brand-700 flex items-center gap-2 text-sm"
        >
          <Plus className="w-4 h-4" /> New Flow
        </button>
      </div>

      {showForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-6 mb-6">
          <h2 className="font-semibold mb-4">Create Flow</h2>
          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. User Registration"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Trigger Command</label>
              <input
                value={form.trigger}
                onChange={(e) => setForm({ ...form, trigger: e.target.value })}
                placeholder="e.g. /register"
                className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
                required
              />
            </div>
          </div>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1">Description (optional)</label>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full px-3 py-2 rounded-lg border border-gray-300 text-sm"
            />
          </div>

          {/* Steps */}
          <div className="mb-4">
            <label className="block text-sm font-medium mb-2">Steps</label>
            <div className="space-y-3">
              {form.steps.map((step, idx) => (
                <div key={idx} className="flex items-start gap-3 bg-gray-50 rounded-lg p-3">
                  <span className="text-xs text-gray-400 font-mono mt-2">{idx + 1}</span>
                  <div className="flex-1 grid grid-cols-3 gap-2">
                    <input
                      value={step.prompt}
                      onChange={(e) => updateStep(idx, 'prompt', e.target.value)}
                      placeholder="Prompt message..."
                      className="col-span-2 px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    />
                    <select
                      value={step.expectedType}
                      onChange={(e) => updateStep(idx, 'expectedType', e.target.value)}
                      className="px-3 py-2 rounded-lg border border-gray-200 text-sm"
                    >
                      <option value="text">Text</option>
                      <option value="number">Number</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone</option>
                      <option value="choice">Choice</option>
                      <option value="image">Image</option>
                    </select>
                  </div>
                  {form.steps.length > 1 && (
                    <button type="button" onClick={() => removeStep(idx)} className="text-gray-400 hover:text-red-600 mt-2">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
            <button type="button" onClick={addStep} className="mt-2 text-sm text-brand-600 hover:text-brand-700 font-medium">
              + Add Step
            </button>
          </div>

          <div className="flex justify-end gap-2">
            <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900">Cancel</button>
            <button type="submit" disabled={submitting} className="px-5 py-2 rounded-lg bg-brand-600 text-white text-sm font-medium hover:bg-brand-700 disabled:opacity-50 flex items-center gap-2">
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />} Create Flow
            </button>
          </div>
        </form>
      )}

      {/* Flows List */}
      <div className="space-y-3">
        {loading ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-gray-400">Loading...</div>
        ) : flows.length === 0 ? (
          <div className="bg-white rounded-xl border border-gray-200 px-6 py-8 text-center text-gray-400">No conversation flows defined</div>
        ) : (
          flows.map((flow) => (
            <div key={flow.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
              <button
                onClick={() => setExpanded(expanded === flow.id ? null : flow.id)}
                className="w-full px-6 py-4 flex items-center gap-3 text-left hover:bg-gray-50 transition"
              >
                {expanded === flow.id
                  ? <ChevronDown className="w-4 h-4 text-gray-400" />
                  : <ChevronRight className="w-4 h-4 text-gray-400" />
                }
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${flow.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <span className="font-medium">{flow.name}</span>
                    <span className="text-xs font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded">{flow.trigger}</span>
                  </div>
                  {flow.description && <p className="text-sm text-gray-500 mt-0.5">{flow.description}</p>}
                </div>
                <span className="text-xs text-gray-400">{flow.steps?.length ?? 0} steps</span>
              </button>

              {expanded === flow.id && flow.steps && flow.steps.length > 0 && (
                <div className="px-6 pb-4 border-t border-gray-100">
                  <div className="mt-4 space-y-2">
                    {flow.steps.map((step, idx) => (
                      <div key={step.id} className="flex items-center gap-3 text-sm">
                        <div className="w-6 h-6 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-medium shrink-0">
                          {idx + 1}
                        </div>
                        <div className="flex-1 bg-gray-50 rounded-lg px-4 py-2">
                          <p className="text-gray-700">{step.prompt}</p>
                          <span className="text-xs text-gray-400">expects: {step.expectedType}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
