import { useMemo } from "react";

import type {
  EChartsOption,
} from "echarts";

import { EChart }
  from "../../components/statistics/Echart";

import type {
  LandUseTypeStatistic,
} from "../../utils/statisticsDashboard";

interface AverageAreaChartProps {
  statistics:
    LandUseTypeStatistic[];
}

export function AverageAreaChart({
  statistics,
}: AverageAreaChartProps) {
  const option =
    useMemo<EChartsOption>(
      () => {
        const availableStatistics =
          statistics.filter(
            (item) => {
              return item.count > 0;
            },
          );

        return {
          tooltip: {
            trigger: "axis",

            valueFormatter:
              (value) => {
                return `${Number(
                  value,
                ).toLocaleString()} m²`;
              },
          },

          grid: {
            top: 20,
            right: 20,
            bottom: 65,
            left: 70,
          },

          xAxis: {
            type: "category",

            data:
              availableStatistics.map(
                (item) => {
                  return item.label;
                },
              ),

            axisLabel: {
              interval: 0,
              rotate: 25,
            },
          },

          yAxis: {
            type: "value",

            name: "m²",
          },

          series: [
            {
              type: "bar",

              barMaxWidth: 42,

              data:
                availableStatistics.map(
                  (item) => {
                    return {
                      value:
                        Math.round(
                          item
                            .averageAreaM2,
                        ),

                      itemStyle: {
                        color:
                          item.color,
                      },
                    };
                  },
                ),
            },
          ],
        };
      },
      [statistics],
    );

  return (
    <article className="statistics-chart-card">
      <header>
        <div>
          <h2>
            各类型平均面积
          </h2>

          <p>
            单位：平方米
          </p>
        </div>
      </header>

      <EChart
        option={option}
        className="statistics-chart"
      />
    </article>
  );
}