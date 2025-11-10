"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Chat with Data", href: "/chat" },
];

export default function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="p-2">
      <div className="px-2 py-1 text-[10px] uppercase tracking-wide text-zinc-500">General</div>
      <ul className="space-y-1">
        {NAV.map((n) => {
          const active = pathname?.startsWith(n.href);
          return (
            <li key={n.href}>
              <Link
                href={n.href}
                className={`block mx-2 px-3 py-2 rounded-md text-sm ${
                  active ? "bg-indigo-50 text-indigo-700 font-medium" : "text-zinc-700 hover:bg-zinc-100"
                }`}
              >
                {n.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
