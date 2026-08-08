import { useMemo } from "react";

import type {
  EChartsOption,
} from "echarts";

import { EChart }
  from "../../components/statistics/Echart";

import type {
  LandUseTypeStatistic,
} from "../../utils/statisticsDashboard";

interface LandUseDonutChartProps {
  statistics:
    LandUseTypeStatistic[];
}

export function LandUseDonutChart({
  statistics,
}: LandUseDonutChartProps) {
  const option =
    useMemo<EChartsOption>(
      () => {
        return {
          tooltip: {
            trigger: "item",

            formatter:
              "{b}<br/>{c} 个 ({d}%)",
          },

          legend: {
            type: "scroll",
            bottom: 0,
          },

          series: [
            {
              name: "用地类型",

              type: "pie",

              radius: [
                "45%",
                "70%",
              ],

              center: [
                "50%",
                "43%",
              ],

              avoidLabelOverlap:
                true,

              itemStyle: {
                borderColor:
                  "#ffffff",

                borderWidth: 2,
              },

              label: {
                formatter:
                  "{b}\n{d}%",
              },

              data:
                statistics
                  .filter(
                    (item) => {
                      return (
                        item.count > 0
                      );
                    },
                  )
                  .map((item) => {
                    return {
                      name:
                        item.label,

                      value:
                        item.count,

                      itemStyle: {
                        color:
                          item.color,
                      },
                    };
                  }),
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
          <h2>用地类型分布</h2>

          <p>
            按当前筛选结果统计
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