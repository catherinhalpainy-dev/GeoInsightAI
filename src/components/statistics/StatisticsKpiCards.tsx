import type {
  DashboardSummary,
} from "../../utils/statisticsDashboard";

interface StatisticsKpiCardsProps {
  summary: DashboardSummary;
}

export function StatisticsKpiCards({
  summary,
}: StatisticsKpiCardsProps) {
  const totalAreaKm2 =
    summary.totalAreaM2 /
    1_000_000;

  return (
    <div className="statistics-kpi-grid">
      <article className="statistics-kpi-card">
        <span>当前要素</span>

        <strong>
          {
            summary
              .totalFeatureCount
          }
        </strong>

        <small>个 Polygon</small>
      </article>

      <article className="statistics-kpi-card">
        <span>总面积</span>

        <strong>
          {totalAreaKm2.toFixed(2)}
        </strong>

        <small>km²</small>
      </article>

      <article className="statistics-kpi-card">
        <span>平均面积</span>

        <strong>
          {Math.round(
            summary.averageAreaM2,
          ).toLocaleString()}
        </strong>

        <small>m² / 要素</small>
      </article>

      <article className="statistics-kpi-card">
        <span>行政区数量</span>

        <strong>
          {summary.districtCount}
        </strong>

        <small>个区域</small>
      </article>
    </div>
  );
}