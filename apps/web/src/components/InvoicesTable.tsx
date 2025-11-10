"use client";

import { useEffect, useMemo, useState } from "react";
import { apiGet } from "@/lib/api";
import { DataTable, Column } from "@/components/DataTable";

type InvoiceRow = {
  id: number;
  vendor: string | null;
  invoiceDate: string | null;
  invoiceNumber: string | null;
  amount: number | null;
  status: string | null;
};

type ApiResponse = { page: number; pageSize: number; total: number; items: InvoiceRow[] };

const SORT_OPTIONS = [
  { label: "Date ↓", value: "invoiceDate:desc" },
  { label: "Date ↑", value: "invoiceDate:asc" },
  { label: "Amount ↓", value: "totalAmount:desc" },
  { label: "Amount ↑", value: "totalAmount:asc" },
  { label: "Vendor A→Z", value: "vendor.name:asc" },
  { label: "Vendor Z→A", value: "vendor.name:desc" },
];

export default function InvoicesTable({ pageSize = 10 }: { pageSize?: number }) {
  const [q, setQ] = useState("");
  const [sort, setSort] = useState("invoiceDate:desc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [role, setRole] = useState<string>(() => (typeof window !== 'undefined' ? (localStorage.getItem('role') || 'admin') : 'admin'));

  async function load() {
    setLoading(true);
    setErr(null);
    try {
      const res = await apiGet<ApiResponse>(`/invoices?q=${encodeURIComponent(q)}&page=${page}&pageSize=${pageSize}&sort=${encodeURIComponent(sort)}`, { headers: { 'x-role': role } });
      setData(res);
    } catch (e: any) {
      setErr(e?.message || "Failed");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // pick up role changes written by Chat page dropdown
    const saved = typeof window !== 'undefined' ? (localStorage.getItem('role') || role) : role;
    if (saved !== role) setRole(saved);
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, sort, page, pageSize, role]);

  const cols: Column<InvoiceRow>[] = useMemo(
    () => [
      { header: "Date", className: "whitespace-nowrap", cell: (i) => (i.invoiceDate ? new Date(i.invoiceDate).toLocaleDateString() : "-") },
      { header: "Vendor", cell: (i) => i.vendor ?? "-" },
      { header: "Invoice #", className: "tabular-nums", cell: (i) => i.invoiceNumber ?? "-" },
      { header: "Amount", className: "text-right tabular-nums font-medium text-zinc-900", cell: (i) => new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol" }).format(Number(i.amount ?? 0)) },
      { header: "Status", className: "capitalize", cell: (i) => i.status ?? "-" },
    ],
    []
  );

  return (
    <div className="space-y-3">
      <div className="flex gap-2 items-center">
        <button
          onClick={async () => {
            try {
              setLoading(true);
              // fetch all up to a cap
              let all: InvoiceRow[] = [];
              let p = 1;
              let total = Infinity;
              const cap = 5000;
              while (all.length < Math.min(total, cap)) {
                const res = await apiGet<ApiResponse>(`/invoices?q=${encodeURIComponent(q)}&page=${p}&pageSize=${pageSize}&sort=${encodeURIComponent(sort)}`, { headers: { 'x-role': role } });
                total = res.total;
                all = all.concat(res.items);
                if (res.items.length === 0) break;
                p += 1;
              }
              const headers = ["Date","Vendor","Invoice #","Amount","Status"];
              const rows = all.map(i => [
                i.invoiceDate ? new Date(i.invoiceDate).toISOString().slice(0,10) : "",
                i.vendor ?? "",
                i.invoiceNumber ?? "",
                String(i.amount ?? ""),
                i.status ?? "",
              ]);
              const csv = [headers, ...rows].map(r => r.map(v => JSON.stringify(v)).join(',')).join('\n');
              const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'invoices.csv';
              a.click();
              URL.revokeObjectURL(url);
            } catch (e) {
              console.error(e);
            } finally {
              setLoading(false);
            }
          }}
          className="px-3 h-9 border rounded-md bg-white"
        >
          Export CSV
        </button>
        <input
          value={q}
          onChange={(e) => {
            setPage(1);
            setQ(e.target.value);
          }}
          placeholder="Search vendor, invoice # ..."
          className="px-3 h-9 border rounded-md flex-1 bg-white placeholder:text-zinc-400"
        />
        <select value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }} className="px-2 h-9 border rounded-md bg-white">
          {SORT_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      {err && <div className="text-red-600 text-sm">{err}</div>}

      <DataTable
        rows={data?.items || []}
        columns={cols}
        footer={
          <div className="flex items-center gap-3">
            <button disabled={loading || page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="px-2 py-1 border rounded disabled:opacity-50">Prev</button>
            <span>Page {data?.page || page}</span>
            <button disabled={loading || (data ? data.page * data.pageSize >= data.total : true)} onClick={() => setPage((p) => p + 1)} className="px-2 py-1 border rounded disabled:opacity-50">Next</button>
            <span className="text-gray-500">{data ? `Showing ${data.items.length} of ${data.total.toLocaleString()}` : ""}</span>
          </div>
        }
      />
    </div>
  );
}