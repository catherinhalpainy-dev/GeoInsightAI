import * as echarts
    from "echarts";
import type { EChartsOption } from "echarts";
import { useEffect, useRef } from "react";

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
