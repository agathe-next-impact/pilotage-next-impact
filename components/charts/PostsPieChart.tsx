"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from "recharts";
import type { PostDistributionSlice } from "@/lib/analytics";

const COLORS = ["#0a66c2", "#7c3aed", "#16a34a"];

export function PostsPieChart({ data, height = 240 }: { data: PostDistributionSlice[]; height?: number }): React.ReactElement {
  if (data.length === 0) {
    return <p className="text-xs text-ink-subtle italic">Pas encore de contenu publié.</p>;
  }
  return (
    <ResponsiveContainer width="100%" height={height}>
      <PieChart>
        <Pie
          data={data}
          dataKey="count"
          nameKey="label"
          cx="50%"
          cy="50%"
          outerRadius={80}
          label={({ label, count }) => `${label} (${count})`}
          labelLine={false}
        >
          {data.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
        </Pie>
        <Tooltip contentStyle={{ fontSize: 11, padding: 6 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
