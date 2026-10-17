"use client";

import { Bar, BarChart, CartesianGrid, Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { formatMoney, formatMoneyRound, formatMonth } from "@/lib/money";
import type { ResourceSummary } from "@/lib/types";

const MUTED = "#9a9aa0";
const GRID = "#2d2d30";
const INCOME = "#10b981";
const EXPENSE = "#ef4444";
/** Distinct enough on dark backgrounds, gold first. */
const SLICES = ["#d4af37", "#3b82f6", "#10b981", "#f97316", "#a855f7", "#ec4899", "#14b8a6", "#eab308", "#6366f1", "#9a9aa0"];

const TOOLTIP = {
  contentStyle: { background: "#1a1a1d", border: `1px solid ${GRID}`, borderRadius: 8, fontSize: 12 },
  labelStyle: { color: MUTED },
  itemStyle: { color: "#ededed" },
  cursor: { fill: "rgba(255,255,255,0.04)" },
};

const axis = { stroke: MUTED, fontSize: 11, tickLine: false, axisLine: false } as const;

export function IncomeExpenseChart({ history }: { history: ResourceSummary["history"] }) {
  return (
    <div className="h-64" role="img" aria-label="Income and expenses over the last six months">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={history} margin={{ top: 8, right: 8, bottom: 0, left: 4 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="month" tickFormatter={(month) => formatMonth(String(month), true)} {...axis} />
          <YAxis tickFormatter={(value) => formatMoneyRound(Number(value))} width={64} {...axis} />
          <Tooltip
            {...TOOLTIP}
            labelFormatter={(month) => formatMonth(String(month))}
            formatter={(value, name) => [formatMoney(Number(value)), name === "income" ? "Income" : "Expenses"]}
          />
          <Legend formatter={(name) => (name === "income" ? "Income" : "Expenses")} wrapperStyle={{ fontSize: 12, color: MUTED }} />
          <Bar dataKey="income" fill={INCOME} radius={[4, 4, 0, 0]} maxBarSize={28} />
          <Bar dataKey="expenses" fill={EXPENSE} radius={[4, 4, 0, 0]} maxBarSize={28} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CategoryPie({ categories }: { categories: ResourceSummary["by_category"] }) {
  if (categories.length === 0) {
    return <p className="flex h-64 items-center justify-center text-sm text-muted-foreground">No expenses this month, sir.</p>;
  }

  // Beyond nine slices, the rest share one.
  const top = categories.slice(0, 9);
  const rest = categories.slice(9).reduce((sum, item) => sum + item.amount, 0);
  const data = rest > 0 ? [...top, { category: "Everything else", amount: rest }] : top;

  return (
    <div className="flex h-64 items-center gap-4" role="img" aria-label="Expenses by category this month">
      {/* A sized box: ResponsiveContainer measures its parent, and a grid track can collapse to nothing. */}
      <div className="h-full min-w-0 flex-1">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie data={data} dataKey="amount" nameKey="category" innerRadius="55%" outerRadius="85%" stroke="#1a1a1d" strokeWidth={2}>
            {data.map((item, index) => (
              <Cell key={item.category} fill={SLICES[index % SLICES.length]} />
            ))}
          </Pie>
          <Tooltip {...TOOLTIP} formatter={(value, name) => [formatMoney(Number(value)), name]} />
        </PieChart>
      </ResponsiveContainer>
      </div>
      <ul className="grid max-w-40 gap-1.5 text-xs">
        {data.map((item, index) => (
          <li key={item.category} className="flex items-center gap-2">
            <span className="size-2.5 shrink-0 rounded-sm" style={{ backgroundColor: SLICES[index % SLICES.length] }} aria-hidden />
            <span className="truncate text-muted-foreground">{item.category}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
