// 统计数据展示

// 问题1：
// React Hook 只能在以下位置调用：
// React 函数组件内部
// 自定义 Hook 内部
// 不能在普通文件顶层、条件语句、循环或嵌套普通函数中调用
// 依赖state的计算也要一起移入（Context更新后，React会重新执行组件函数）
// 若把计算放在组件外部，它们只会在模块首次加载时运行，无法正常跟随 React 状态更新
import { useMemo } from "react";
import { Link } from "react-router-dom";

import {
  useAppContext,
} from "../app/AppProvider";

import {
  StatisticsKpiCards,
} from "../components/statistics/StatisticsKpiCards";

import {
  LandUseDonutChart,
} from "../components/statistics/LandUseDonutChart";

import {
  AverageAreaChart,
} from "../components/statistics/AverageAreaChart";

import {
  FeatureTable,
} from "../components/statistics/FeatureTable";

import {
  calculateDashboardSummary,
  calculateTypeStatistics,
} from "../utils/statisticsDashboard";

import "../styles/statistics.css";

export function StatisticsPage() {
  const {
    state,
    filteredFeatures,
  } = useAppContext();

  const dataset =
    state.dataset;

  const summary =
    useMemo(() => {
      return calculateDashboardSummary(
        filteredFeatures,
      );
    }, [filteredFeatures]);

  const typeStatistics =
    useMemo(() => {
      return calculateTypeStatistics(
        filteredFeatures,
      );
    }, [filteredFeatures]);

  if (
    !dataset ||
    state.importStatus !== "loaded"
  ) {
    return (
      <section className="page-content">
        <h1>统计分析</h1>

        <p>
          尚未加载可统计的数据。
        </p>

        <Link to="/import">
          前往数据导入
        </Link>
      </section>
    );
  }

  const originalFeatureCount =
    dataset.collection.features
      .length;

  return (
    <section className="statistics-page">
      <header className="statistics-page-header">
        <div>
          <h1>统计分析</h1>

          <p>
            {dataset.name}
            {" · "}
            当前 {
              filteredFeatures.length
            }
            {" / "}
            {originalFeatureCount}
            {" 条要素"}
          </p>
        </div>
      </header>

      <StatisticsKpiCards
        summary={summary}
      />

      <div className="statistics-chart-grid">
        <LandUseDonutChart
          statistics={
            typeStatistics
          }
        />

        <AverageAreaChart
          statistics={
            typeStatistics
          }
        />
      </div>

      <FeatureTable
        features={
          filteredFeatures
        }
      />
    </section>
  );
}