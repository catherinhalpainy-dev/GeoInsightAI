import {
  useMemo,
} from "react";

import {
  Link,
} from "react-router-dom";

import {
  useAppContext,
} from "../app/AppProvider";

import {
  LAND_USE_LABELS,
} from "../constants/landUse";

import {
  calculateDashboardSummary,
  calculateTypeStatistics,
} from "../utils/statisticsDashboard";

import {
  createReportSummary,
} from "../utils/reportSummary";

import "../styles/report.css";


export function ReportPage() {
  const {
    state,
    filteredFeatures,
  } = useAppContext();


  const dataset =
    state.dataset;


  const summary =
    useMemo(() => {
      return (
        calculateDashboardSummary(
          filteredFeatures,
        )
      );
    }, [
      filteredFeatures,
    ]);


  const typeStatistics =
    useMemo(() => {
      return (
        calculateTypeStatistics(
          filteredFeatures,
        )
      );
    }, [
      filteredFeatures,
    ]);


  if (
    !dataset ||
    state.importStatus !==
      "loaded"
  ) {
    return (
      <section className="page-content">
        <h1>
          分析报告
        </h1>

        <p>
          尚未加载可以生成报告的数据。
        </p>

        <Link to="/import">
          前往数据导入
        </Link>
      </section>
    );
  }


  const report =
    createReportSummary({
      datasetName:
        dataset.name,

      originalFeatureCount:
        dataset.collection
          .features.length,

      filteredFeatureCount:
        filteredFeatures.length,

      filters:
        state.filters,

      summary,

      typeStatistics,
    });


  const activeTypeStatistics =
    typeStatistics.filter(
      (item) => {
        return item.count > 0;
      },
    );


  function handlePrint() {
    window.print();
  }


  return (
    <section className="report-page">
      <header className="report-page-header">
        <div>
          <span>
            GeoInsight AI
          </span>

          <h1>
            {report.title}
          </h1>

          <p>
            基于当前数据集与筛选结果自动生成
          </p>
        </div>

        <button
          type="button"
          onClick={
            handlePrint
          }
        >
          打印 / 导出 PDF
        </button>
      </header>


      <article className="report-document">
        <section className="report-section">
          <h2>
            1. 分析摘要
          </h2>

          <p>
            {report.overview}
          </p>

          <p>
            {
              report.landUseSummary
            }
          </p>
        </section>


        <section className="report-section">
          <h2>
            2. 当前筛选条件
          </h2>

          <p>
            {
              report.filterText
            }
          </p>

          <dl className="report-filter-list">
            <div>
              <dt>
                用地类型
              </dt>

              <dd>
                {state.filters
                  .landUseTypes
                  .length >
                0
                  ? state.filters
                      .landUseTypes
                      .map(
                        (
                          type,
                        ) => {
                          return (
                            LAND_USE_LABELS[
                              type
                            ]
                          );
                        },
                      )
                      .join("、")
                  : "全部"}
              </dd>
            </div>

            <div>
              <dt>
                最小建成年份
              </dt>

              <dd>
                {
                  state.filters
                    .minimumBuiltYear ??
                  "不限"
                }
              </dd>
            </div>

            <div>
              <dt>
                行政区代码
              </dt>

              <dd>
                {state.filters
                  .districtCode ||
                  "不限"}
              </dd>
            </div>
          </dl>
        </section>


        <section className="report-section">
          <h2>
            3. 核心指标
          </h2>

          <div className="report-kpis">
            <article>
              <span>
                当前要素
              </span>

              <strong>
                {
                  summary
                    .totalFeatureCount
                }
              </strong>
            </article>

            <article>
              <span>
                总面积
              </span>

              <strong>
                {(
                  summary
                    .totalAreaM2 /
                  1_000_000
                ).toFixed(2)}
                {" km²"}
              </strong>
            </article>

            <article>
              <span>
                平均面积
              </span>

              <strong>
                {Math.round(
                  summary
                    .averageAreaM2,
                ).toLocaleString()}
                {" m²"}
              </strong>
            </article>

            <article>
              <span>
                行政区
              </span>

              <strong>
                {
                  summary
                    .districtCount
                }
              </strong>
            </article>
          </div>
        </section>


        <section className="report-section">
          <h2>
            4. 用地类型统计
          </h2>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>
                    用地类型
                  </th>

                  <th>
                    要素数量
                  </th>

                  <th>
                    总面积
                  </th>

                  <th>
                    平均面积
                  </th>
                </tr>
              </thead>

              <tbody>
                {activeTypeStatistics.map(
                  (item) => (
                    <tr
                      key={
                        item.type
                      }
                    >
                      <td>
                        {
                          item.label
                        }
                      </td>

                      <td>
                        {
                          item.count
                        }
                      </td>

                      <td>
                        {Math.round(
                          item.totalAreaM2,
                        ).toLocaleString()}
                        {" m²"}
                      </td>

                      <td>
                        {Math.round(
                          item.averageAreaM2,
                        ).toLocaleString()}
                        {" m²"}
                      </td>
                    </tr>
                  ),
                )}
              </tbody>
            </table>
          </div>
        </section>


        <section className="report-section">
          <h2>
            5. 要素明细
          </h2>

          <div className="report-table-wrapper">
            <table className="report-table">
              <thead>
                <tr>
                  <th>
                    ID
                  </th>

                  <th>
                    类型
                  </th>

                  <th>
                    面积
                  </th>

                  <th>
                    行政区
                  </th>

                  <th>
                    建成年份
                  </th>
                </tr>
              </thead>

              <tbody>
                {filteredFeatures.map(
                  (
                    feature,
                  ) => {
                    const {
                      id,
                      landUseType,
                      areaM2,
                      districtCode,
                      builtYear,
                    } =
                      feature.properties;

                    return (
                      <tr
                        key={id}
                      >
                        <td>
                          {id}
                        </td>

                        <td>
                          {
                            LAND_USE_LABELS[
                              landUseType
                            ]
                          }
                        </td>

                        <td>
                          {areaM2.toLocaleString()}
                          {" m²"}
                        </td>

                        <td>
                          {
                            districtCode
                          }
                        </td>

                        <td>
                          {builtYear ??
                            "—"}
                        </td>
                      </tr>
                    );
                  },
                )}
              </tbody>
            </table>
          </div>
        </section>


        <footer className="report-document-footer">
          GeoInsight AI ·
          Generated from current analysis state
        </footer>
      </article>
    </section>
  );
}