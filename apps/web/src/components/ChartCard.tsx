import { ReactNode } from "react";

export function ChartCard({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h2 className="font-semibold text-zinc-900">{title}</h2>
        {subtitle ? <p className="text-xs text-zinc-500 mt-0.5">{subtitle}</p> : null}
      </div>
      {children}
    </div>
  );
}
