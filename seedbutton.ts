'use client';

import { useState } from 'react';

export function SeedButton() {
  const [msg, setMsg] = useState<string | null>(null);

  const handleSeed = async () => {
    setMsg(null);
    try {
      const res = await fetch('/api/seed', { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        setMsg('Demo accounts created. You can log in now.');
      } else {
        setMsg(data.error || 'Seed failed');
      }
    } catch {
      setMsg('Request failed');
    }
  };

  return (
    <div className="text-center">
      <button
        type="button"
        onClick={handleSeed}
        className="text-slate-500 hover:text-slate-400 text-xs underline"
      >
        First time? Create demo accounts
      </button>
      {msg && <p className="mt-2 text-xs text-emerald-400">{msg}</p>}
    </div>
  );
}