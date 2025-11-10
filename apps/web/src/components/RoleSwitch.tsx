"use client";

import { useEffect, useState } from "react";

export default function RoleSwitch() {
  // Hide control entirely when an auth token is present (role is enforced by JWT)
  const [hasToken] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return /(?:^|;\s*)auth_token=/.test(document.cookie);
  });

  const [role, setRole] = useState<string>(() => {
    if (typeof window === 'undefined') return 'analyst';
    const cookieMatch = document.cookie.match(/(?:^|; )role=([^;]+)/);
    return (cookieMatch ? decodeURIComponent(cookieMatch[1]) : (localStorage.getItem('role') || 'analyst')) as string;
  });

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const cookieMatch = document.cookie.match(/(?:^|; )role=([^;]+)/);
    const cookieRole = cookieMatch ? decodeURIComponent(cookieMatch[1]) : null;
    if (cookieRole && cookieRole !== role) setRole(cookieRole);
  }, []);

  if (hasToken) return null;

  function onChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const next = e.target.value;
    setRole(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem('role', next);
      document.cookie = `role=${next}; Path=/; Max-Age=2592000`;
      window.location.reload();
    }
  }

  return (
    <label className="block text-xs text-gray-500">
      Role
      <select value={role} onChange={onChange} className="mt-1 w-full px-2 py-1 border rounded-md">
        <option value="analyst">Analyst</option>
        <option value="admin">Admin</option>
      </select>
    </label>
  );
}
