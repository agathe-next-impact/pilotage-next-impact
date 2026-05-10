"use client";

import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { KpiPoint } from "@/lib/analytics";

const KPI_CONFIG: Array<{
  key: keyof Omit<KpiPoint, "weekStart" | "weekLabel">;
  label: string;
  color: string;
}> = [
  { key: "linkedinFollowers", label: "LinkedIn followers", color: "#0a66c2" },
  { key: "newsletterSubscribers", label: "Newsletter abonnés", color: "#7c3aed" },
  { key: "seoClicks", label: "SEO clics", color: "#16a34a" },
];

export function KpiLineChart({ data, height = 240 }: { data: KpiPoint[]; height?: number }): React.ReactElement {
  if (data.length === 0) {
    return <p className="text-xs text-ink-subtle italic">Pas encore de données.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
        <Tooltip
          contentStyle={{ fontSize: 11, padding: 6 }}
          labelFormatter={(label) => `Semaine ${label}`}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {KPI_CONFIG.map((c) => (
          <Line
            key={c.key}
            type="monotone"
            dataKey={c.key}
            stroke={c.color}
            strokeWidth={2}
            dot={{ r: 3 }}
            connectNulls
            name={c.label}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
