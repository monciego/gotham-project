"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { HabitAnalytics } from "@/lib/types";
import { WEEKDAYS } from "./habit-meta";

const GOLD = "#d4af37";
const MUTED = "#9a9aa0";
const GRID = "#2d2d30";

const TOOLTIP = {
  contentStyle: { background: "#1a1a1d", border: `1px solid ${GRID}`, borderRadius: 8, fontSize: 12 },
  labelStyle: { color: MUTED },
  itemStyle: { color: "#ededed" },
  cursor: { fill: "rgba(255,255,255,0.04)", stroke: GRID },
};

const SHORT_DATE = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "UTC" });

function shortDate(date: string): string {
  return SHORT_DATE.format(new Date(`${date}T00:00:00Z`));
}

const axis = { stroke: MUTED, fontSize: 11, tickLine: false, axisLine: false } as const;

/** Completion over the last 30 days, each point the rate across the 7 days ending then. */
export function CompletionTrend({ points }: { points: HabitAnalytics["last_30_days"] }) {
  return (
    <div className="h-56" role="img" aria-label="Completion rate over the last 30 days">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} interval={6} {...axis} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(value) => `${value}%`} {...axis} />
          <Tooltip
            {...TOOLTIP}
            labelFormatter={(date) => shortDate(String(date))}
            formatter={(value) => [value === null ? "–" : `${value}%`, "7-day rate"]}
          />
          <Line type="monotone" dataKey="rate" stroke={GOLD} strokeWidth={2} dot={false} connectNulls={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Success rate for each day of the week, Sunday first. */
export function WeekdayBars({ days }: { days: HabitAnalytics["by_weekday"] }) {
  const data = WEEKDAYS.map(({ iso, short }) => ({
    day: short,
    rate: days.find((day) => day.weekday === iso)?.rate ?? null,
  }));

  return (
    <div className="h-56" role="img" aria-label="Success rate by day of the week">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="day" {...axis} />
          <YAxis domain={[0, 100]} ticks={[0, 50, 100]} tickFormatter={(value) => `${value}%`} {...axis} />
          <Tooltip {...TOOLTIP} formatter={(value) => [value === null ? "Not scheduled" : `${value}%`, "Success rate"]} />
          <Bar dataKey="rate" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={36} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
