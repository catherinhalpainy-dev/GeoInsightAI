import { useMemo } from "react";
import type { EChartsOption } from "echarts";

import { EChart } from "../statistics/Echart";
import type { ReportCategoryStat } from "../../types/report";

interface ReportLandUseChartProps {
    categories: readonly ReportCategoryStat[];
    metric: "count" | "averageArea";
}

export function ReportLandUseChart({
    categories,
    metric,
}: ReportLandUseChartProps) {
    const option = useMemo<EChartsOption>(() => {
        const values = categories.map((item) => metric === "count"
            ? item.count
            : Math.round(item.averageAreaM2),
        );

        return {
            animation: false,
            grid: { top: 12, right: 38, bottom: 34, left: 82 },
            tooltip: { show: false },
            xAxis: {
                type: "value",
                name: metric === "count" ? "个" : "m²",
                axisLabel: { color: "#64748b", fontSize: 10 },
                splitLine: { lineStyle: { color: "#e2e8f0" } },
            },
            yAxis: {
                type: "category",
                inverse: true,
                data: categories.map((item) => item.label),
                axisLabel: { color: "#334155", fontSize: 10 },
                axisTick: { show: false },
                axisLine: { show: false },
            },
            series: [{
                type: "bar",
                barMaxWidth: 18,
                label: {
                    show: true,
                    position: "right",
                    color: "#475569",
                    fontSize: 10,
                    formatter: metric === "count" ? "{c}" : "{c} m²",
                },
                data: values.map((value, index) => ({
                    value,
                    itemStyle: {
                        color: categories[index]?.color ?? "#0f766e",
                        opacity: 0.78,
                        borderRadius: [0, 3, 3, 0],
                    },
                })),
            }],
        };
    }, [categories, metric]);

    return (
        <EChart
            option={option}
            className="report-chart"
            renderer="svg"
        />
    );
}
