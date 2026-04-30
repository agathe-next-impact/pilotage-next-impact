"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { fmtPeriodShort } from "@/lib/format";
import type { TimeSeriesPoint } from "@/lib/kpi/aggregate";

export function ProgressionChart({
  data,
  format = "number",
  height = 240,
  label = "Réalisé",
}: {
  data: TimeSeriesPoint[];
  format?: "number" | "percent";
  height?: number;
  label?: string;
}): React.ReactElement {
  const formatValue = (v: number) =>
    format === "percent" ? `${(v * 100).toFixed(0)}%` : v.toLocaleString("fr-FR");

  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer>
        <ComposedChart data={data} margin={{ top: 8, right: 16, bottom: 0, left: 0 }}>
          <defs>
            <linearGradient id="grad-real" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#378ADD" stopOpacity={0.25} />
              <stop offset="100%" stopColor="#378ADD" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#E8E8E5" vertical={false} />
          <XAxis
            dataKey="period"
            tickFormatter={fmtPeriodShort}
            tick={{ fontSize: 11, fill: "#5B6470" }}
            tickLine={false}
            axisLine={{ stroke: "#E8E8E5" }}
          />
          <YAxis
            tickFormatter={formatValue}
            tick={{ fontSize: 11, fill: "#5B6470" }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            formatter={(v: number) => formatValue(v)}
            labelFormatter={fmtPeriodShort}
            contentStyle={{
              borderRadius: 8,
              border: "0.5px solid #E8E8E5",
              fontSize: 12,
            }}
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} iconType="line" />
          <Area
            type="monotone"
            dataKey="value"
            name={label}
            stroke="#378ADD"
            fill="url(#grad-real)"
            strokeWidth={2}
            dot={{ r: 3, fill: "#378ADD" }}
          />
          <Line
            type="monotone"
            dataKey="expected"
            name="Trajectoire cible"
            stroke="#9BA3AD"
            strokeDasharray="4 4"
            strokeWidth={1.5}
            dot={false}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
