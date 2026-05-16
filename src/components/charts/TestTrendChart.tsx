"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export function TestTrendChart({
  data,
}: {
  data: Array<{ date: string; name: string; pct: number }>;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ left: -16, right: 8, top: 4, bottom: 0 }}>
          <CartesianGrid stroke="#1a1f2c" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            domain={[0, 100]}
            unit="%"
          />
          <Tooltip
            contentStyle={{
              background: "#161a23",
              border: "1px solid #222838",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#9aa3b2" }}
            formatter={(v) => [`${v}%`, "Score"]}
            labelFormatter={(label, payload) =>
              payload?.[0]?.payload?.name ?? label
            }
          />
          <Line
            type="monotone"
            dataKey="pct"
            stroke="#7c8cff"
            strokeWidth={2}
            dot={{ r: 4, fill: "#7c8cff" }}
            activeDot={{ r: 6 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
