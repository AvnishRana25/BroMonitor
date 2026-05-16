"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

export function WeeklyHoursChart({
  data,
}: {
  data: Array<{ date: string; school: number; coaching: number; self: number }>;
}) {
  return (
    <div className="h-64">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ left: -16, right: 0, top: 4, bottom: 0 }}>
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
            unit="h"
          />
          <Tooltip
            cursor={{ fill: "rgba(124,140,255,0.05)" }}
            contentStyle={{
              background: "#161a23",
              border: "1px solid #222838",
              borderRadius: 8,
              fontSize: 12,
            }}
            labelStyle={{ color: "#9aa3b2" }}
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: "#9aa3b2" }}
          />
          <Bar dataKey="school" name="School" stackId="a" fill="#7c8cff" radius={[0, 0, 0, 0]} />
          <Bar dataKey="coaching" name="Coaching" stackId="a" fill="#5fd0a3" />
          <Bar dataKey="self" name="Self-study" stackId="a" fill="#ffb86b" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
