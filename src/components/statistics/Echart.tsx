import {
    BarChart,
    PieChart,
} from "echarts/charts";
import {
    GridComponent,
    LegendComponent,
    TooltipComponent,
} from "echarts/components";
import * as echarts from "echarts/core";
import type { EChartsOption } from "echarts";
import { CanvasRenderer } from "echarts/renderers";
import { useEffect, useRef } from "react";

echarts.use([
    BarChart,
    PieChart,
    GridComponent,
    LegendComponent,
    TooltipComponent,
    CanvasRenderer,
]);

interface EChartProps {
    option: EChartsOption;
    className?: string;
    renderer?: "canvas" | "svg";
}

export function EChart({
    option,
    className,
    renderer = "canvas",
}: EChartProps) {
    const containerRef =
        useRef<HTMLDivElement | null>(
            null,
        );

    const chartRef =
        useRef<echarts.ECharts | null>(
            null,
        );

    useEffect(() => {
        const container = containerRef.current;

        if (!container) {
            return;
        }

        const chart = echarts.init(
            container,
            undefined,
            { renderer },
        );
        chartRef.current = chart;
        const resizeObserver =
            new ResizeObserver(() => {
                chart.resize();
            });

        resizeObserver.observe(
            container,
        );
        return () => {
            resizeObserver.disconnect();

            chart.dispose();

            chartRef.current = null;
        };
    }, [renderer]);
    useEffect(() => {
        const chart =
            chartRef.current;

        if (!chart) {
            return;
        }

        chart.setOption(
            option,
            {
                notMerge: true,
            },
        );
    }, [option]);

    return (
        <div
            ref={containerRef}
            className={className}
        />
    );


}
