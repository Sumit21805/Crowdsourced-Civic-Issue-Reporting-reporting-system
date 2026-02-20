'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export function CreateReportForm() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!/^\d{4}$/.test(pin)) {
      setError('PIN must be exactly 4 digits');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, pin }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error?.pin?.[0] || data.error || 'Failed to create report');
        return;
      }
      setTitle('');
      setDescription('');
      setPin('');
      router.refresh();
    } catch {
      setError('Network error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="rounded-xl bg-slate-900/80 border border-slate-700 p-6 mb-8">
      <h2 className="text-lg font-semibold text-white mb-4">New report</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white"
            placeholder="Brief title"
            required
            maxLength={200}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white min-h-[100px]"
            placeholder="Describe the issue..."
            required
            maxLength={2000}
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">4-digit PIN (for verification)</label>
          <input
            type="text"
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            className="w-28 px-4 py-2 rounded-lg bg-slate-800 border border-slate-600 text-white font-mono"
            placeholder="0000"
            maxLength={4}
            required
          />
        </div>
        {error && <p className="text-red-400 text-sm">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-medium"
        >
          {loading ? 'Submitting…' : 'Submit report'}
        </button>
      </div>
    </form>
  );
}