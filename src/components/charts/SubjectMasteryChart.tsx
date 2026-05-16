"use client";

import {
  RadialBarChart,
  RadialBar,
  ResponsiveContainer,
  PolarAngleAxis,
} from "recharts";

export function SubjectMasteryChart({
  data,
}: {
  data: Array<{ name: string; pct: number; color: string }>;
}) {
  const chartData = data.map((d) => ({ ...d, fill: d.color }));
  return (
    <div className="h-44">
      <ResponsiveContainer width="100%" height="100%">
        <RadialBarChart
          innerRadius="35%"
          outerRadius="100%"
          data={chartData}
          startAngle={90}
          endAngle={-270}
          barSize={10}
        >
          <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
          <RadialBar dataKey="pct" cornerRadius={6} background={{ fill: "#1a1f2c" }} />
        </RadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}
