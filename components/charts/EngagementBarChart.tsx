"use client";

import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend } from "recharts";
import type { WeeklyEngagementPoint } from "@/lib/analytics";

export function EngagementBarChart({ data, height = 240 }: { data: WeeklyEngagementPoint[]; height?: number }): React.ReactElement {
  if (data.length === 0) {
    return <p className="text-xs text-ink-subtle italic">Pas encore de données.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
        <XAxis dataKey="weekLabel" tick={{ fontSize: 10 }} stroke="#9ca3af" />
        <YAxis tick={{ fontSize: 10 }} stroke="#9ca3af" />
        <Tooltip contentStyle={{ fontSize: 11, padding: 6 }} labelFormatter={(label) => `Semaine ${label}`} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="linkedin" stackId="a" fill="#0a66c2" name="LinkedIn (réactions+comm.+partages)" />
        <Bar dataKey="newsletter" stackId="a" fill="#7c3aed" name="Newsletter (ouv.+clics)" />
      </BarChart>
    </ResponsiveContainer>
  );
}
