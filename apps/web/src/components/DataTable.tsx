import { ReactNode } from "react";

export type Column<T> = {
  header: string;
  cell: (row: T) => ReactNode;
  className?: string; // applies to header and the column cells
};

export function DataTable<T>({ rows, columns, footer }: { rows: T[]; columns: Column<T>[]; footer?: ReactNode }) {
  return (
    <div className="rounded-xl border border-zinc-200 overflow-auto bg-white">
      <table className="min-w-[720px] w-full text-sm text-zinc-800">
        <thead className="bg-zinc-50/80 backdrop-blur sticky top-0 z-10">
          <tr className="border-b">
            {columns.map((col, i) => (
              <th key={i} className={`text-left font-medium p-3 text-zinc-500 ${col.className || ""}`}>{col.header}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-b last:border-0 hover:bg-zinc-50">
              {columns.map((col, j) => (
                <td key={j} className={`p-3 ${col.className || ""}`}>{col.cell(r)}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {footer && <div className="text-xs text-zinc-500 p-3">{footer}</div>}
    </div>
  );
}
