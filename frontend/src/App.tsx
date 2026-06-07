import { useEffect, useState } from 'react'

interface ApiResponse {
  status: string;
  message: string;
  engine: string;
}

export default function App() {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Fetch data from our FastAPI server
    fetch('http://localhost:8000/api/health')
    .then((res) => {
      if (!res.ok) throw new Error('Failed to reach backend server.');
      return res.json();
    })
    .then((data: ApiResponse) => {
      setData(data);
      setLoading(false);
    })
    .catch((err) => {
      setError(err.message);
      setLoading(false);
    });
  }, []);

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col items-center justify-center p-6 font-sans">
    <div className="max-w-md w-full bg-neutral-900 border border-neutral-800 rounded-xl p-6 shadow-2xl space-y-4">
    <h1 className="text-2xl font-bold tracking-tight text-emerald-400">
    Artificialis Ludos
    </h1>
    <p className="text-neutral-400 text-sm">
    Project environment initialization test.
    </p>

    <div className="border-t border-neutral-800 pt-4">
    {loading && (
      <p className="text-amber-400 animate-pulse text-sm font-mono">
      [SYSTEM] Pinging core server...
      </p>
    )}

    {error && (
      <div className="bg-red-950/40 border border-red-900 text-red-400 p-3 rounded-lg text-sm font-mono">
      [ERROR] {error}
      </div>
    )}

    {data && (
      <div className="space-y-2">
      <div className="bg-emerald-950/20 border border-emerald-900/50 p-3 rounded-lg font-mono text-xs text-emerald-300">
      <span className="font-bold">Message:</span> {data.message}
      </div>
      <div className="flex justify-between text-xs text-neutral-500 font-mono px-1">
      <span>Status: {data.status}</span>
      <span>{data.engine}</span>
      </div>
      </div>
    )}
    </div>
    </div>
    </div>
  )
}
