"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, PieChart, Pie, Cell, Legend, AreaChart, Area } from "recharts";

export type TrendPoint = { month: string; invoice_count: number; total_spend: number };
export type VendorPoint = { vendor: string; spend: number };
export type CategoryDatum = { category: string; amount: number };
export type CashOutflowPoint = { date: string; outflow: number } | { label: string; amount: number };

// Helpers
const currencyFmt = new Intl.NumberFormat(undefined, { style: 'currency', currency: 'EUR', currencyDisplay: 'narrowSymbol', maximumFractionDigits: 0 });

export function InvoiceTrendsChart({ data }: { data: TrendPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <defs>
            <linearGradient id="spendGradient" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7c3aed" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#7c3aed" stopOpacity={0.05} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="month" tickMargin={8} />
          <YAxis yAxisId="left" tickMargin={6} />
          <YAxis yAxisId="right" orientation="right" tickFormatter={(v) => currencyFmt.format(Number(v))} width={70} />
          <Tooltip
            formatter={(value: any, name) => {
              return name === 'Spend' ? [currencyFmt.format(Number(value)), name] : [String(value), name];
            }}
          />
          <Area yAxisId="right" type="monotone" dataKey="total_spend" name="Spend" stroke="#7c3aed" fill="url(#spendGradient)" strokeWidth={2} />
          <Line yAxisId="left" type="monotone" dataKey="invoice_count" stroke="#0f172a" name="Invoices" strokeWidth={2} dot={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function TopVendorsChart({ data }: { data: VendorPoint[] }) {
  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data.slice().reverse()} layout="vertical" margin={{ left: 12, right: 12, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis type="number" tickFormatter={(v) => currencyFmt.format(Number(v))} />
          <YAxis type="category" dataKey="vendor" width={140} />
          <Tooltip formatter={(v: any) => currencyFmt.format(Number(v))} />
          <Bar dataKey="spend" radius={[4, 4, 4, 4]} fill="#6366f1" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

const CATEGORY_COLORS = [
  "#6366f1",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
  "#06b6d4",
  "#f97316",
  "#84cc16",
  "#d946ef",
  "#0ea5e9",
];

// Optional mapping from category codes -> human names
const CATEGORY_NAME_MAP: Record<string, string> = {
  '4400': 'Operations',
  '3450': 'Marketing',
  '4200': 'Facilities',
};

function prettyCategoryName(code: string) {
  return CATEGORY_NAME_MAP[code] || code || 'Uncategorized';
}

function CategoryLegendContent({ payload, limit = 'all' }: any) {
  let items = (Array.isArray(payload) ? payload : [])
    .filter((p: any) => String(p?.payload?.category) !== 'Other')
    .sort((a: any, b: any) => Number(b?.payload?.amount || 0) - Number(a?.payload?.amount || 0));
  if (limit !== 'all') items = items.slice(0, Number(limit));
  return (
    <div className="mt-2 space-y-2 text-sm max-h-40 overflow-auto pr-1">
      {items.map((p: any) => (
        <div key={String(p?.payload?.category)} className="flex items-center justify-between">
          <span className="inline-flex items-center gap-2 text-zinc-700">
            <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: p.color }} />
            {prettyCategoryName(String(p?.payload?.category))}
          </span>
          <span className="tabular-nums font-medium text-zinc-900">
            {currencyFmt.format(Number(p?.payload?.amount || 0))}
          </span>
        </div>
      ))}
    </div>
  );
}

export function CategorySpendPie({ data, maxSlices = Infinity }: { data: CategoryDatum[]; maxSlices?: number }) {
  // 1) remove zeros, 2) sort desc, 3) if limited, keep top N and group the rest as "Other"; otherwise keep all
  const filtered = (data || []).filter((d) => Number(d.amount) > 0);
  const sorted = filtered.sort((a, b) => Number(b.amount) - Number(a.amount));
  let simplified: CategoryDatum[];
  if (Number.isFinite(maxSlices)) {
    const top = sorted.slice(0, Math.max(1, Number(maxSlices)));
    const rest = sorted.slice(Math.max(1, Number(maxSlices)));
    const otherTotal = rest.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    simplified = otherTotal > 0 ? [...top, { category: 'Other', amount: otherTotal }] : top;
  } else {
    simplified = sorted;
  }

  // attach display data + color for each slice
  const items = simplified.map((d, idx) => ({
    category: d.category,
    amount: Number(d.amount || 0),
    displayName: prettyCategoryName(String(d.category)),
    color: CATEGORY_COLORS[idx % CATEGORY_COLORS.length],
  }));
  const mid = Math.ceil(items.length / 2);
  const left = items.slice(0, mid);
  const right = items.slice(mid);

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-center">
        <ul className="order-2 md:order-1 space-y-2 text-sm">
          {left.map((it) => (
            <li key={String(it.category)} className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-zinc-700">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: it.color }} />
                {it.displayName}
              </span>
              <span className="tabular-nums font-medium text-zinc-900">{currencyFmt.format(it.amount)}</span>
            </li>
          ))}
        </ul>
        <div className="order-1 md:order-2 h-64">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Tooltip formatter={(v: any, _n: any, entry: any) => [currencyFmt.format(Number(v)), prettyCategoryName(String(entry?.payload?.category))]} />
              <Pie
                data={items}
                dataKey="amount"
                nameKey="displayName"
                cx="50%"
                cy="50%"
                outerRadius={95}
                innerRadius={60}
                isAnimationActive={false}
                paddingAngle={2}
                stroke="#fff"
                strokeWidth={1}
              >
                {items.map((row, idx) => (
                  <Cell key={String(row.category)} fill={row.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="order-3 space-y-2 text-sm">
          {right.map((it) => (
            <li key={String(it.category)} className="flex items-center justify-between">
              <span className="inline-flex items-center gap-2 text-zinc-700">
                <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ backgroundColor: it.color }} />
                {it.displayName}
              </span>
              <span className="tabular-nums font-medium text-zinc-900">{currencyFmt.format(it.amount)}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function CashOutflowChart({ data, showDebug = false }: { data: CashOutflowPoint[]; showDebug?: boolean }) {
  // Accept either pre-bucketed data from the API or raw per-day data
  let buckets: Array<{ label: string; amount: number }> = [];
  const first: any = (data || [])[0];
  if (first && 'label' in first && 'amount' in first) {
    buckets = (data as any).map((d: any) => ({ label: String(d.label), amount: Number(d.amount || 0) }));
  } else {
    const now = new Date();
    const nowMs = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate());
    buckets = [
      { label: '0 - 7 days', amount: 0 },
      { label: '8 - 30 days', amount: 0 },
      { label: '31 - 60 days', amount: 0 },
      { label: '60+ days', amount: 0 },
    ];
    for (const row of data as any[]) {
      const dayMs = Date.parse(`${row.date}T00:00:00Z`);
      const diffDays = Math.floor((dayMs - nowMs) / (1000 * 60 * 60 * 24));
      const v = Math.max(0, Number((row as any).outflow || 0));
      if (diffDays <= 7) buckets[0].amount += v;
      else if (diffDays <= 30) buckets[1].amount += v;
      else if (diffDays <= 60) buckets[2].amount += v;
      else buckets[3].amount += v;
    }
  }

  const allZero = buckets.every(b => b.amount === 0);

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="80%">
        <BarChart data={buckets} margin={{ left: 8, right: 8, top: 10, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
          <XAxis dataKey="label" />
          <YAxis tickFormatter={(v) => currencyFmt.format(Number(v))} domain={[0, (dataMax: number) => (allZero ? 1 : Math.max(1, Number(dataMax) * 1.1))]} />
          <Tooltip formatter={(v: any) => currencyFmt.format(Number(v))} />
          <Bar dataKey="amount" fill="#0ea5e9" radius={[6, 6, 0, 0]} minPointSize={6} />
        </BarChart>
      </ResponsiveContainer>
      {showDebug && (
        <div className="mt-2 grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-1 text-xs text-zinc-600">
          {buckets.map((b) => (
            <div key={b.label} className="flex items-center justify-between">
              <span>{b.label}</span>
              <span className="tabular-nums font-medium text-zinc-900">{currencyFmt.format(b.amount)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
