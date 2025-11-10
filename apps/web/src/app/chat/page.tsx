"use client";

import { useEffect, useState } from "react";
import { apiGet, apiPost } from "@/lib/api";

function apiBase() {
  // replicate resolve used in lib/api for EventSource (which needs absolute URL)
  if (typeof window !== 'undefined') {
    if (process.env.NEXT_PUBLIC_API_BASE && process.env.NEXT_PUBLIC_API_BASE.trim()) {
      return process.env.NEXT_PUBLIC_API_BASE.replace(/\/$/, '');
    }
    const { protocol, hostname } = window.location;
    return `${protocol}//${hostname}:4000`;
  }
  return process.env.API_BASE_INTERNAL || 'http://localhost:4000';
}

interface ChatResponse {
  sql: string;
  columns: string[];
  rows: any[][];
}

interface HistoryItem {
  id: number;
  prompt: string;
  sql?: string | null;
  createdAt: string;
}

function readCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const m = document.cookie.match(new RegExp(`(?:^|;\\s*)${name}=([^;]+)`));
  return m ? decodeURIComponent(m[1]) : undefined;
}

export default function ChatPage() {
  const [prompt, setPrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<ChatResponse | null>(null);
  const [partialSql, setPartialSql] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [role, setRole] = useState<string>(() => typeof window !== 'undefined' ? (readCookie('role') || localStorage.getItem('role') || 'analyst') : 'analyst');
  const [hasToken, setHasToken] = useState<boolean>(() => typeof window !== 'undefined' ? !!readCookie('auth_token') : false);

  async function refreshHistory() {
    try {
      const headers = hasToken ? {} : { 'x-role': role } as Record<string, string>;
      const rows = await apiGet<HistoryItem[]>("/chat-history?limit=20", { headers });
      setHistory(rows);
    } catch {}
  }

  useEffect(() => {
    // Sync role/token from cookies on mount
    setHasToken(!!readCookie('auth_token'));
    const r = readCookie('role');
    if (r) setRole(r);
    refreshHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setData(null);
    setPartialSql("");

    try {
      const url = `${apiBase()}/chat-with-data/stream?prompt=${encodeURIComponent(prompt)}`;
      const es = new EventSource(url);
      es.addEventListener('delta', (ev) => {
        const t = (ev as MessageEvent).data || '';
        setPartialSql((prev) => prev + t);
      });
      es.addEventListener('sql', (ev) => {
        const sql = (ev as MessageEvent).data || '';
        setPartialSql(sql);
      });
      es.addEventListener('result', (ev) => {
        try {
          const parsed = JSON.parse((ev as MessageEvent).data);
          setData({ sql: partialSql || '', columns: parsed.columns || [], rows: parsed.rows || [] });
        } catch {}
      });
      es.addEventListener('error', (ev) => {
        setError(String((ev as MessageEvent).data || 'stream error'));
      });
      es.addEventListener('done', async () => {
        es.close();
        setLoading(false);
        setPrompt("");
        await refreshHistory();
      });
    } catch (e: any) {
      setError(e?.message || 'Failed');
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Chat with Data</h1>
      <form onSubmit={onSubmit} className="flex gap-2 items-center">
        {!hasToken && (
          <select
            value={role}
            onChange={(e) => { setRole(e.target.value); if (typeof window !== 'undefined') { localStorage.setItem('role', e.target.value); document.cookie = `role=${e.target.value}; Path=/; Max-Age=2592000`; } refreshHistory(); }}
            className="px-2 py-2 border rounded-md"
            title="Role for protected endpoints"
          >
            <option value="analyst">Analyst</option>
            <option value="admin">Admin</option>
          </select>
        )}
        <input
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="Ask a question about your invoices..."
          className="flex-1 px-3 py-2 border rounded-md"
        />
        <button disabled={loading || !prompt.trim()} className="px-4 py-2 bg-black text-white rounded-md disabled:opacity-50">
          {loading ? "Thinking..." : "Ask"}
        </button>
      </form>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          {error && <div className="text-red-600">{error}</div>}

          {(data || partialSql) && (
            <div className="space-y-4">
              <div className="rounded-lg border p-4">
                <div className="text-sm text-gray-500 mb-2">Generated SQL</div>
                <pre className="text-sm whitespace-pre-wrap">{partialSql || data?.sql}</pre>
              </div>
              <div className="rounded-lg border p-4 overflow-auto">
                <div className="text-sm text-gray-500 mb-2">Results</div>
                <table className="min-w-[600px] w-full text-sm">
                  <thead>
                    <tr>
                      {(data?.columns || []).map((c) => (
                        <th key={c} className="text-left font-medium p-2 border-b">
                          {c}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {(data?.rows || []).map((r, i) => (
                      <tr key={i} className="border-b last:border-0">
                        {r.map((v, j) => (
                          <td key={j} className="p-2">{String(v)}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <div className="text-sm text-gray-500">Recent</div>
          <ul className="space-y-2">
            {history.map((h) => (
              <li key={h.id}>
                <button
                  className="w-full text-left px-3 py-2 border rounded hover:bg-zinc-50"
                  onClick={() => setPrompt(h.prompt)}
                  title={h.sql || ''}
                >
                  <div className="text-sm truncate">{h.prompt}</div>
                  <div className="text-xs text-gray-500">{new Date(h.createdAt).toLocaleString()}</div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
