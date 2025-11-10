"use client";

import { useState } from "react";
import { apiPost } from "@/lib/api";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "signup">("login");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
const [role, setRole] = useState<"analyst" | "admin">("admin");
  const [createIfNotExists, setCreateIfNotExists] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const nameOk = name.trim().length >= 2;
  const passOk = password.length >= 2;

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      let resp: { token: string; role: "admin" | "analyst" };
      if (mode === "signup") {
        resp = await apiPost("/auth/signup", { name, password, role });
      } else {
        resp = await apiPost("/auth/login", { name, password, createIfNotExists, role });
      }
      // Persist token and role for API calls (client + SSR-friendly)
      if (typeof window !== "undefined") {
        localStorage.setItem("auth_token", resp.token);
        document.cookie = `auth_token=${resp.token}; Path=/; Max-Age=2592000`;
        document.cookie = `role=${resp.role}; Path=/; Max-Age=2592000`;
      }
      if (typeof window !== "undefined") {
        window.location.href = "/dashboard";
      }
    } catch (e: any) {
      setError(e?.message || "Authentication failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto space-y-6">
      <h1 className="text-2xl font-semibold">{mode === "signup" ? "Create account" : "Sign in"}</h1>
      <form onSubmit={onSubmit} className="space-y-4">
        <label className="block">
          <div className="text-sm text-gray-600">Name</div>
          <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
        </label>
        <label className="block">
          <div className="text-sm text-gray-600">Password</div>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="mt-1 w-full px-3 py-2 border rounded-md" />
        </label>

        {(mode === "signup" || createIfNotExists) && (
          <label className="block text-sm text-gray-600">
            Role
            <select value={role} onChange={(e) => setRole(e.target.value as any)} className="mt-1 w-full px-2 py-2 border rounded-md">
              <option value="analyst">Analyst</option>
              <option value="admin">Admin</option>
            </select>
          </label>
        )}

        {mode === "login" && (
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={createIfNotExists} onChange={(e) => setCreateIfNotExists(e.target.checked)} />
            Create account if not found
          </label>
        )}

        {(!nameOk || !passOk) && (
          <div className="text-amber-600 text-sm">Name and password must be at least 2 characters.</div>
        )}
        {error && <div className="text-red-600 text-sm">{error}</div>}

        <button disabled={loading || !nameOk || !passOk} className="w-full px-4 py-2 bg-black text-white rounded-md disabled:opacity-50">
          {loading ? "Please wait..." : mode === "signup" ? "Create account" : "Sign in"}
        </button>
      </form>

      <div className="text-sm text-gray-600">
        {mode === "signup" ? (
          <button className="underline" onClick={() => setMode("login")}>Have an account? Sign in</button>
        ) : (
          <button className="underline" onClick={() => setMode("signup")}>New here? Create account</button>
        )}
      </div>
    </div>
  );
}
