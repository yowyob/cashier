"use client";

import { Bar, BarChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

interface OverviewProps {
    data: { name: string; total: number }[];
    unitLabel?: string;
}

export function Overview({ data, unitLabel }: OverviewProps) {
    const formatter = (value: number) => unitLabel ? `${value} ${unitLabel}` : `${value}`;

    if (!data || data.length === 0) {
        return (
            <div className="h-[350px] flex items-center justify-center text-muted-foreground text-sm border rounded-xl bg-muted/20">
                No data available
            </div>
        );
    }

    return (
        <ResponsiveContainer width="100%" height={350}>
            <BarChart data={data}>
                <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                />
                <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={formatter}
                />
                <Bar
                    dataKey="total"
                    fill="currentColor"
                    radius={[4, 4, 0, 0]}
                    className="fill-primary"
                />
            </BarChart>
        </ResponsiveContainer>
    );
}
