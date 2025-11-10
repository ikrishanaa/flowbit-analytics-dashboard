"use client";

import { useEffect, useState } from "react";
import { apiGet } from "@/lib/api";
import { InvoiceTrendsChart, TopVendorsChart, CategorySpendPie, CashOutflowChart } from "@/components/charts";
import { ChartCard } from "@/components/ChartCard";
import InvoicesTable from "@/components/InvoicesTable";

type CategoryDatum = { category: string; amount: number };

type Stats = { totalSpendYTD: number; totalInvoicesProcessed: number; documentsUploaded: number; averageInvoiceValue: number };

type Trend = { month: string; invoice_count: number; total_spend: number };

type Vendor = { vendor: string; spend: number };

type Outflow = { date: string; outflow: number };

export default function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [trends, setTrends] = useState<Trend[]>([]);
  const [topVendors, setTopVendors] = useState<Vendor[]>([]);
  const [categorySpend, setCategorySpend] = useState<CategoryDatum[]>([]);
  const [cashOutflow, setCashOutflow] = useState<Outflow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        setLoading(true);
        setError(null);
        const adminHeader = { headers: { 'x-role': 'admin' } } as const;
        const [s, t, v, c, o] = await Promise.all([
          apiGet<Stats>("/stats", adminHeader),
          apiGet<Trend[]>("/invoice-trends", adminHeader),
          apiGet<Vendor[]>("/vendors/top10", adminHeader),
          apiGet<CategoryDatum[]>("/category-spend", adminHeader),
          apiGet<Outflow[]>("/cash-outflow?bucket=1", adminHeader),
        ]);
        if (!cancelled) {
          setStats(s);
          setTrends(t);
          setTopVendors(v);
          setCategorySpend(c);
          setCashOutflow(o);
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message || "Failed to load dashboard");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs uppercase text-zinc-500">General</div>
          <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        </div>
        <div>
          <a className="text-sm underline mr-3" href="/login">Switch account</a>
        </div>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard eyebrow="YTD" title="Total Spend" value={formatCurrency(stats?.totalSpendYTD || 0)} />
        <MetricCard title="Total Invoices Processed" value={(stats?.totalInvoicesProcessed ?? 0).toLocaleString()} />
        <MetricCard eyebrow="This Month" title="Documents Uploaded" value={(stats?.documentsUploaded ?? 0).toLocaleString()} />
        <MetricCard title="Average Invoice Value" value={formatCurrency(stats?.averageInvoiceValue || 0)} />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Invoice Volume + Value Trend" subtitle="Invoice count and total spend over time">
          <InvoiceTrendsChart data={trends} />
        </ChartCard>
        <ChartCard title="Spend by Vendor (Top 10)" subtitle="Vendor spend with cumulative distribution">
          <TopVendorsChart data={topVendors} />
        </ChartCard>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <ChartCard title="Spend by Category" subtitle="Distribution across categories">
          <CategorySpendPie data={categorySpend} />
        </ChartCard>
        <ChartCard title="Cash Outflow Forecast" subtitle="Expected payment obligations grouped by due date">
          <CashOutflowChart data={cashOutflow} showDebug />
        </ChartCard>
      </div>

      <ChartCard title="Invoices">
        <InvoicesTable pageSize={10} />
      </ChartCard>
    </div>
  );
}

function MetricCard({ eyebrow, title, value }: { eyebrow?: string; title: string; value: string }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
      <div className="text-[10px] uppercase tracking-wide text-zinc-500">{eyebrow || '\u00A0'}</div>
      <div className="mt-1 text-sm text-zinc-500">{title}</div>
      <div className="mt-1.5 text-2xl font-semibold text-zinc-900">{value}</div>
    </div>
  );
}

function formatCurrency(n: number) {
  return new Intl.NumberFormat(undefined, { style: "currency", currency: "EUR", currencyDisplay: "narrowSymbol" }).format(n || 0);
}
