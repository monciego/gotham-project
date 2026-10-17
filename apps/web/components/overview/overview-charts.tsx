"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Overview } from "@/lib/types";
import { BLUE, ChartTooltip, EmptyChart, GOLD, GRID, PURPLE, TEXT, axis, cursor, shortDate } from "./chart-theme";

const MOODS = ["", "Terrible", "Bad", "Okay", "Good", "Great"];

/** Hours of completed focus each day. */
export function FocusChart({ days }: { days: Overview["focus_by_day"] }) {
  if (days.every((day) => day.minutes === 0)) {
    return <EmptyChart>No focus sessions in this period, sir.</EmptyChart>;
  }

  const data = days.map((day) => ({ date: day.date, hours: Math.round((day.minutes / 60) * 10) / 10 }));

  return (
    <div className="h-56" role="img" aria-label="Focus hours per day">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
          <YAxis allowDecimals={false} tickFormatter={(value) => `${value}h`} {...axis} />
          <Tooltip
            cursor={cursor}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return (
                <ChartTooltip
                  active={active}
                  lines={point ? [`${shortDate(point.date)} — ${point.hours} ${point.hours === 1 ? "hour" : "hours"}`] : null}
                />
              );
            }}
          />
          <Line
            type="monotone"
            dataKey="hours"
            stroke={GOLD}
            strokeWidth={2}
            dot={data.length <= 31 ? { r: 2, fill: GOLD, strokeWidth: 0 } : false}
            activeDot={{ r: 4 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Missions completed per week (weeks start on Monday). */
export function MissionsChart({ weeks }: { weeks: Overview["missions_by_week"] }) {
  if (weeks.every((week) => week.count === 0)) {
    return <EmptyChart>No missions completed in this period yet, sir.</EmptyChart>;
  }

  return (
    <div className="h-56" role="img" aria-label="Missions completed per week">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={weeks} margin={{ top: 8, right: 8, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="week" tickFormatter={shortDate} minTickGap={16} {...axis} />
          <YAxis allowDecimals={false} {...axis} />
          <Tooltip
            cursor={cursor}
            content={({ active, payload }) => {
              const week = payload?.[0]?.payload as Overview["missions_by_week"][number] | undefined;
              return (
                <ChartTooltip
                  active={active}
                  lines={week ? [`Week of ${shortDate(week.week)} — ${week.count} ${week.count === 1 ? "mission" : "missions"}`] : null}
                />
              );
            }}
          />
          <Bar dataKey="count" fill={GOLD} radius={[4, 4, 0, 0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

/** Mood (1–5, left axis) and energy (1–10, right axis) from the journal. */
export function MoodEnergyChart({ mood, energy }: { mood: Overview["mood_trend"]; energy: Overview["energy_trend"] }) {
  if (mood.length === 0) {
    return <EmptyChart>No Intel entries in this period, sir. Write one tonight and I&apos;ll chart it.</EmptyChart>;
  }

  const energyByDate = new Map(energy.map((day) => [day.date, day.avg_energy]));
  const data = mood.map((day) => ({ date: day.date, mood: day.mood_score, energy: energyByDate.get(day.date) ?? null }));

  return (
    <div className="h-64" role="img" aria-label="Mood and energy from your journal">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 8, right: -12, bottom: 0, left: -20 }}>
          <CartesianGrid stroke={GRID} vertical={false} />
          <XAxis dataKey="date" tickFormatter={shortDate} minTickGap={24} {...axis} />
          <YAxis yAxisId="mood" domain={[1, 5]} ticks={[1, 2, 3, 4, 5]} {...axis} />
          <YAxis yAxisId="energy" orientation="right" domain={[1, 10]} ticks={[1, 4, 7, 10]} {...axis} />
          <Tooltip
            cursor={cursor}
            content={({ active, payload }) => {
              const point = payload?.[0]?.payload as (typeof data)[number] | undefined;
              return (
                <ChartTooltip
                  active={active}
                  lines={
                    point
                      ? [
                          shortDate(point.date),
                          `Mood: ${MOODS[point.mood]}`,
                          ...(point.energy !== null ? [`Energy: ${point.energy}/10`] : []),
                        ]
                      : null
                  }
                />
              );
            }}
          />
          <Legend
            verticalAlign="top"
            align="right"
            height={24}
            iconType="plainline"
            wrapperStyle={{ fontSize: 11, color: TEXT }}
            formatter={(value) => (value === "mood" ? "Mood (1–5)" : "Energy (1–10)")}
          />
          <Line yAxisId="mood" type="monotone" dataKey="mood" stroke={PURPLE} strokeWidth={2} dot={{ r: 2, fill: PURPLE, strokeWidth: 0 }} />
          <Line
            yAxisId="energy"
            type="monotone"
            dataKey="energy"
            stroke={BLUE}
            strokeWidth={2}
            dot={{ r: 2, fill: BLUE, strokeWidth: 0 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
