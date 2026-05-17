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
  Line,
  ComposedChart,
} from "recharts";

export function WeeklyHoursChart({
  data,
}: {
  data: Array<{
    date: string;
    school: number;
    coaching: number;
    self: number;
    evidence: number;
  }>;
}) {
  return (
    <div className="h-52 sm:h-64">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ left: -16, right: 4, top: 4, bottom: 0 }}
        >
          <CartesianGrid stroke="#1a1f2c" vertical={false} />
          <XAxis
            dataKey="date"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            yAxisId="hours"
            stroke="#6b7280"
            fontSize={11}
            tickLine={false}
            axisLine={false}
            unit="h"
          />
          <YAxis
            yAxisId="photos"
            orientation="right"
            stroke="#6b7280"
            fontSize={10}
            tickLine={false}
            axisLine={false}
            allowDecimals={false}
            width={28}
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
            formatter={(value: number, name: string) =>
              name === "Evidence"
                ? `${value} photo${value === 1 ? "" : "s"}`
                : `${(value as number).toFixed(2)}h`
            }
          />
          <Legend
            verticalAlign="top"
            height={28}
            iconType="circle"
            wrapperStyle={{ fontSize: 11, color: "#9aa3b2" }}
          />
          <Bar
            yAxisId="hours"
            dataKey="school"
            name="School"
            stackId="a"
            fill="#7c8cff"
          />
          <Bar
            yAxisId="hours"
            dataKey="coaching"
            name="Coaching"
            stackId="a"
            fill="#5fd0a3"
          />
          <Bar
            yAxisId="hours"
            dataKey="self"
            name="Self-study"
            stackId="a"
            fill="#ffb86b"
            radius={[6, 6, 0, 0]}
          />
          <Line
            yAxisId="photos"
            type="monotone"
            dataKey="evidence"
            name="Evidence"
            stroke="#52d195"
            strokeWidth={2}
            dot={{ r: 3, fill: "#52d195" }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
