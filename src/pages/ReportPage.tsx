import { ArrowLeft, FilePenLine, Printer } from "lucide-react";
import { Link } from "react-router-dom";

import { ReportLandUseChart } from "../components/report/ReportLandUseChart";
import { useReportContext } from "../report/ReportProvider";
import { createReportMethodology } from "../services/report/generateDeterministicInsights";
import type { ReportDraft, ReportSectionConfig } from "../types/report";
import "../styles/report.css";

function formatAreaM2(areaM2: number) {
    return `${Math.round(areaM2).toLocaleString("zh-CN")} m²`;
}

function formatAreaKm2(areaM2: number) {
    return `${(areaM2 / 1_000_000).toLocaleString("zh-CN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    })} km²`;
}

function renderSection(
    section: ReportSectionConfig,
    sectionNumber: number,
    draft: ReportDraft,
) {
    const { snapshot } = draft;
    const heading = `${sectionNumber}. ${section.title}`;

    switch (section.type) {
        case "executive-summary":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <p className="report-executive-summary">{draft.executiveSummary}</p>
                    <div className="report-filter-summary">
                        <strong>分析条件</strong>
                        <ul>{snapshot.filterSummary.map((item) => <li key={item}>{item}</li>)}</ul>
                    </div>
                    {draft.insights.length > 0 && (
                        <div className="report-insights">
                            {draft.insights.map((insight) => (
                                <article key={insight.id}>
                                    <span>{insight.category}</span>
                                    <h3>{insight.title}</h3>
                                    <p>{insight.content}</p>
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            );
        case "map":
            return (
                <section className="report-section report-map-section" key={section.id}>
                    <h2>{heading}</h2>
                    {snapshot.map.dataUrl ? (
                        <img src={snapshot.map.dataUrl} alt="报告生成时的地图视图" />
                    ) : (
                        <div className="report-map-placeholder">
                            <strong>地图快照不可用</strong>
                            <span>{snapshot.map.captureError ?? "可返回报告中心重新捕获。"}</span>
                        </div>
                    )}
                    <p className="report-caption">
                        地图视图来自报告快照。中心 {snapshot.map.center[0].toFixed(5)}, {snapshot.map.center[1].toFixed(5)} · Zoom {snapshot.map.zoom.toFixed(1)} · {snapshot.map.basemap}
                    </p>
                </section>
            );
        case "kpi":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <div className="report-kpis">
                        <article><span>地块数量</span><strong>{snapshot.kpi.featureCount.toLocaleString("zh-CN")}</strong></article>
                        <article><span>总面积</span><strong>{formatAreaKm2(snapshot.kpi.totalAreaM2)}</strong></article>
                        <article><span>平均面积</span><strong>{formatAreaM2(snapshot.kpi.averageAreaM2)}</strong></article>
                        <article><span>当前选择</span><strong>{snapshot.kpi.selectedCount.toLocaleString("zh-CN")}</strong></article>
                    </div>
                </section>
            );
        case "land-use-distribution":
            return (
                <section className="report-section report-chart-section" key={section.id}>
                    <h2>{heading}</h2>
                    <ReportLandUseChart categories={snapshot.categories} metric="count" />
                    <div className="report-category-table">
                        {snapshot.categories.map((item) => (
                            <div key={item.key}>
                                <span className="report-category-swatch" style={{ background: item.color }} />
                                <span>{item.label}</span>
                                <strong>{item.count} · {item.percentage.toFixed(1)}%</strong>
                            </div>
                        ))}
                    </div>
                </section>
            );
        case "area-analysis":
            return (
                <section className="report-section report-chart-section" key={section.id}>
                    <h2>{heading}</h2>
                    <p>各用地类型平均地块面积，统计口径与统计分析页保持一致。</p>
                    <ReportLandUseChart categories={snapshot.categories} metric="averageArea" />
                </section>
            );
        case "spatial-analysis": {
            const spatial = snapshot.spatialAnalysis;
            const hasContent = spatial.hasBuffer ||
                spatial.spatialQueryFeatureCount > 0 ||
                spatial.aoiFeatureCount > 0 ||
                spatial.analysisResultLayers.length > 0;

            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    {hasContent ? (
                        <dl className="report-analysis-metrics">
                            {spatial.hasBuffer && <div><dt>Buffer</dt><dd>{spatial.bufferDistanceM?.toLocaleString("zh-CN")} m · {formatAreaKm2(spatial.bufferAreaM2 ?? 0)}</dd></div>}
                            {spatial.spatialQueryFeatureCount > 0 && <div><dt>Buffer 查询</dt><dd>{spatial.spatialQueryFeatureCount} 个地块 · {spatial.spatialQueryRelation}</dd></div>}
                            {spatial.aoiFeatureCount > 0 && <div><dt>AOI 查询</dt><dd>{spatial.aoiFeatureCount} 个地块 · {spatial.aoiRelation}</dd></div>}
                            {spatial.analysisResultLayers.length > 0 && <div><dt>地理处理结果</dt><dd>{spatial.analysisResultLayers.length} 个图层</dd></div>}
                        </dl>
                    ) : <p>快照生成时未包含空间分析结果。</p>}
                </section>
            );
        }
        case "spatial-statistics": {
            const spatial = snapshot.spatialStatistics;

            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    {spatial ? (
                        <>
                            <dl className="report-analysis-metrics">
                                <div>
                                    <dt>分析方法</dt>
                                    <dd>{spatial.method === "hexbin" ? "六边形网格聚合" : "密度热力图"}</dd>
                                </div>
                                <div><dt>输入要素</dt><dd>{spatial.inputFeatureCount.toLocaleString("zh-CN")}</dd></div>
                                <div><dt>代表点</dt><dd>{spatial.analysisPointCount.toLocaleString("zh-CN")}</dd></div>
                                <div><dt>权重</dt><dd>{spatial.weightMode === "area" ? "面积" : "要素数量"}</dd></div>
                                {spatial.method === "hexbin" && (
                                    <>
                                        <div><dt>网格尺寸</dt><dd>{spatial.cellSizeKm} km</dd></div>
                                        <div><dt>有效网格</dt><dd>{spatial.occupiedCellCount ?? 0}</dd></div>
                                        <div><dt>最高网格</dt><dd>{(spatial.maxCellValue ?? 0).toLocaleString("zh-CN")} · {((spatial.maxCellShare ?? 0) * 100).toFixed(1)}%</dd></div>
                                    </>
                                )}
                            </dl>
                            <p>
                                当前分析基于代表点密度或网格聚合，不构成 Getis-Ord Gi* 等统计显著性热点检验。
                            </p>
                        </>
                    ) : <p>快照生成时未包含空间统计结果。</p>}
                </section>
            );
        }
        case "data-quality":
            return snapshot.dataQuality.available ? (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <div className="report-quality-summary">
                        <article><span>通过率</span><strong>{(snapshot.dataQuality.passRate ?? 0).toFixed(1)}%</strong></article>
                        <article><span>错误</span><strong>{snapshot.dataQuality.errorCount ?? 0}</strong></article>
                        <article><span>警告</span><strong>{snapshot.dataQuality.warningCount ?? 0}</strong></article>
                    </div>
                    <p>本报告中的质量结果来源于生成快照时最近一次质量检查。</p>
                </section>
            ) : null;
        case "analysis-layers":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    {snapshot.spatialAnalysis.analysisResultLayers.length > 0 ? (
                        <table className="report-table">
                            <thead><tr><th>结果图层</th><th>操作</th><th>Geometry</th><th>要素数</th></tr></thead>
                            <tbody>{snapshot.spatialAnalysis.analysisResultLayers.map((layer, index) => (
                                <tr key={`${layer.name}-${index}`}>
                                    <td>{layer.name}</td><td>{layer.operation}</td><td>{layer.geometryType}</td><td>{layer.featureCount}</td>
                                </tr>
                            ))}</tbody>
                        </table>
                    ) : <p>快照生成时没有已物化的地理处理结果图层。</p>}
                </section>
            );
        case "methodology":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <ul className="report-methodology">
                        {createReportMethodology(snapshot, draft.aiGenerated).map((item) => <li key={item}>{item}</li>)}
                    </ul>
                </section>
            );
    }
}

export function ReportPage() {
    const { reportDraft } = useReportContext();

    if (!reportDraft) {
        return (
            <section className="page-content report-empty-state">
                <h1>分析报告</h1>
                <p>当前会话尚未生成报告快照。</p>
                <Link to="/workspace?panel=report-builder">前往报告中心</Link>
            </section>
        );
    }

    const enabledSections = [...reportDraft.sections]
        .filter((section) => section.enabled)
        .sort((first, second) => first.order - second.order);
    const { snapshot } = reportDraft;

    return (
        <section className="report-page">
            <header className="report-preview-toolbar">
                <div>
                    <strong>报告预览</strong>
                    <span>快照 {new Date(snapshot.generatedAt).toLocaleString("zh-CN")}</span>
                </div>
                <nav>
                    <Link to="/workspace"><ArrowLeft size={14} />返回工作台</Link>
                    <Link to="/workspace?panel=report-builder"><FilePenLine size={14} />编辑报告</Link>
                    <button type="button" onClick={() => window.print()}><Printer size={14} />打印 / 保存 PDF</button>
                </nav>
            </header>

            <article className="report-document">
                <section className="report-title-page">
                    <span className="report-brand">GeoInsight AI</span>
                    <div>
                        <p>INTELLIGENT SPATIAL ANALYSIS REPORT</p>
                        <h1>{reportDraft.title}</h1>
                        <h2>{reportDraft.subtitle}</h2>
                    </div>
                    <dl>
                        <div><dt>项目</dt><dd>{snapshot.projectName}</dd></div>
                        <div><dt>数据集</dt><dd>{snapshot.datasetName}</dd></div>
                        <div><dt>生成时间</dt><dd>{new Date(snapshot.generatedAt).toLocaleString("zh-CN")}</dd></div>
                        {reportDraft.author && <div><dt>作者</dt><dd>{reportDraft.author}</dd></div>}
                    </dl>
                    <footer>Generated by GeoInsight AI</footer>
                </section>

                <div className="report-content-pages">
                    {enabledSections.map((section, index) =>
                        renderSection(section, index + 1, reportDraft),
                    )}
                </div>

                <footer className="report-analysis-metadata">
                    <strong>Analysis Metadata</strong>
                    <span>项目：{snapshot.projectName}</span>
                    <span>数据集：{snapshot.datasetName}</span>
                    <span>快照：{new Date(snapshot.generatedAt).toLocaleString("zh-CN")}</span>
                    <span>Feature count：{snapshot.kpi.featureCount}</span>
                    <span>Filter：{snapshot.filterSummary.join("；")}</span>
                    {snapshot.temporal?.enabled && (
                        <span>
                            Temporal：{snapshot.temporal.field} · {snapshot.temporal.current}
                        </span>
                    )}
                </footer>
            </article>
        </section>
    );
}
