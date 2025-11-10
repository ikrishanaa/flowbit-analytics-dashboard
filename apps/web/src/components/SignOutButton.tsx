"use client";

export default function SignOutButton() {
  function onClick() {
    if (typeof window !== 'undefined') {
      // Clear cookies
      document.cookie = 'auth_token=; Path=/; Max-Age=0';
      document.cookie = 'role=; Path=/; Max-Age=0';
      // Clear storage fallbacks
      try { localStorage.removeItem('auth_token'); } catch {}
      try { localStorage.removeItem('role'); } catch {}
      // Reload to login
      window.location.href = '/login';
    }
  }
  return (
    <button onClick={onClick} className="text-sm underline">Sign out</button>
  );
}
