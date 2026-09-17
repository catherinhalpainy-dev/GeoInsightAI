import { PARCEL_ANALYSIS_STYLE } from "../../constants/parcelAnalysisStyle";
import type {
    ParcelAnalysisReportSnapshot,
    ReportDraft,
    ReportSectionConfig,
} from "../../types/report";
import { formatArea } from "../../utils/formatArea";

interface ParcelReportSectionProps {
    section: ReportSectionConfig;
    heading: string;
    draft: ReportDraft;
}

function formatRatio(value: number | null) {
    return value === null ? "未分析" : `${(value * 100).toFixed(1)}%`;
}

function Unavailable({ children }: { children: string }) {
    return <p className="report-unavailable">{children}</p>;
}

function parcelSummaryRows(parcel: ParcelAnalysisReportSnapshot) {
    return [
        ["地块面积", formatArea(parcel.target.areaM2, { includeSquareMeters: true })],
        ["现状用途", parcel.target.currentUse],
        ["主要规划用途", parcel.planning.available ? parcel.planning.dominantUse ?? "未识别" : "本次分析未包含"],
        ["限制区域重叠面积", parcel.restrictions.available ? formatArea(parcel.restrictions.overlapAreaM2 ?? 0) : "本次分析未包含"],
        ["限制区域占比", parcel.restrictions.available ? formatRatio(parcel.restrictions.overlapRatio) : "本次分析未包含"],
        ["500m 道路要素", parcel.surroundings.available ? String(parcel.surroundings.roadFeatureCount ?? 0) : "本次分析未包含"],
        ["附近水系", !parcel.surroundings.available ? "本次分析未包含" : parcel.surroundings.waterConfigured ? String(parcel.surroundings.waterFeatureCount ?? 0) : "未配置数据源"],
        ["数据质量", parcel.quality.status === "pass" ? "正常" : `${parcel.quality.errorCount} 错误 · ${parcel.quality.warningCount} 警告`],
    ] as const;
}

export function ParcelReportSection({
    section,
    heading,
    draft,
}: ParcelReportSectionProps) {
    const parcel = draft.snapshot.parcelAnalysis;
    if (!parcel) return null;

    switch (section.type) {
        case "parcel-overview":
            return (
                <section className="report-section report-parcel-overview" key={section.id}>
                    <h2>{heading}</h2>
                    <dl className="report-parcel-facts">
                        <div><dt>地块编号</dt><dd>{parcel.target.featureId}</dd></div>
                        <div><dt>现状用途</dt><dd>{parcel.target.currentUse}</dd></div>
                        <div><dt>地块面积</dt><dd>{formatArea(parcel.target.areaM2, { includeSquareMeters: true })}</dd></div>
                        <div><dt>建成年份</dt><dd>{parcel.target.builtYear ?? "未填写"}</dd></div>
                        <div><dt>行政区代码</dt><dd>{parcel.target.districtCode || "未填写"}</dd></div>
                        <div><dt>所在行政区</dt><dd>{parcel.target.administrativeAreaName ?? "未识别 / 未配置"}</dd></div>
                    </dl>
                </section>
            );
        case "parcel-map":
            return (
                <section className="report-section report-map-section report-parcel-map" key={section.id}>
                    <h2>{heading}</h2>
                    {draft.snapshot.map.dataUrl ? (
                        <img src={draft.snapshot.map.dataUrl} alt="目标地块空间分析结果地图" />
                    ) : (
                        <div className="report-map-placeholder">
                            <strong>地图快照不可用</strong>
                            <span>{draft.snapshot.map.captureError ?? "可返回报告中心重新捕获。"}</span>
                        </div>
                    )}
                    <div className="report-parcel-legend" aria-label="地块分析图例">
                        <span><i style={{ background: PARCEL_ANALYSIS_STYLE.target.color }} />目标地块</span>
                        {parcel.planning.available && <span><i style={{ background: PARCEL_ANALYSIS_STYLE.planning.fillColor }} />规划用途交叉</span>}
                        {parcel.restrictions.available && <span><i style={{ background: PARCEL_ANALYSIS_STYLE.restriction.fillColor }} />限制区域重叠</span>}
                        {parcel.surroundings.available && <span><i style={{ background: PARCEL_ANALYSIS_STYLE.buffer.lineColor }} />500m 分析范围</span>}
                        {parcel.surroundings.available && <span><i style={{ background: PARCEL_ANALYSIS_STYLE.roads.lineColor }} />范围内道路</span>}
                    </div>
                    <p className="report-caption">图 1 目标地块空间分析结果。地图来自同一次分析运行的 MapLibre 画布快照。</p>
                </section>
            );
        case "parcel-planning":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    {!parcel.planning.available ? (
                        <Unavailable>本次分析未包含规划用途分析，未重新执行规划计算。</Unavailable>
                    ) : (
                        <>
                            <dl className="report-analysis-metrics">
                                <div><dt>主要规划用途</dt><dd>{parcel.planning.dominantUse ?? "未识别"}</dd></div>
                                <div><dt>规划覆盖面积</dt><dd>{formatArea(parcel.planning.coverageAreaM2 ?? 0)}</dd></div>
                                <div><dt>覆盖比例</dt><dd>{formatRatio(parcel.planning.coverageRatio)}</dd></div>
                                <div><dt>未覆盖面积</dt><dd>{formatArea(parcel.planning.uncoveredAreaM2 ?? 0)}</dd></div>
                            </dl>
                            {parcel.planning.hasOverlappingPlanningZones && (
                                <p className="report-business-warning">规划用途数据存在空间重叠，部分分类面积可能重复覆盖。</p>
                            )}
                            <table className="report-table">
                                <thead><tr><th>规划用途</th><th>面积</th><th>占地块比例</th></tr></thead>
                                <tbody>
                                    {parcel.planning.items.map((item) => (
                                        <tr key={item.use}><td>{item.use}</td><td>{formatArea(item.areaM2)}</td><td>{formatRatio(item.ratio)}</td></tr>
                                    ))}
                                    {(parcel.planning.uncoveredAreaM2 ?? 0) > 0 && (
                                        <tr><td>未覆盖</td><td>{formatArea(parcel.planning.uncoveredAreaM2 ?? 0)}</td><td>{formatRatio(1 - (parcel.planning.coverageRatio ?? 0))}</td></tr>
                                    )}
                                </tbody>
                            </table>
                        </>
                    )}
                </section>
            );
        case "parcel-restrictions":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    {!parcel.restrictions.available ? (
                        <Unavailable>本次分析未包含限制区域冲突分析。</Unavailable>
                    ) : (
                        <>
                            <p className={parcel.restrictions.hasConflict ? "report-restriction-status conflict" : "report-restriction-status clear"}>
                                {parcel.restrictions.hasConflict ? "检测到空间重叠" : "未检测到限制区域空间重叠"}
                            </p>
                            <dl className="report-analysis-metrics">
                                <div><dt>去重重叠面积</dt><dd>{formatArea(parcel.restrictions.overlapAreaM2 ?? 0)}</dd></div>
                                <div><dt>占地块比例</dt><dd>{formatRatio(parcel.restrictions.overlapRatio)}</dd></div>
                                <div><dt>涉及限制区域要素</dt><dd>{parcel.restrictions.conflictFeatureCount ?? 0}</dd></div>
                            </dl>
                            {parcel.restrictions.items.length > 0 && (
                                <table className="report-table">
                                    <thead><tr><th>限制类型</th><th>交叉面积</th><th>占比</th></tr></thead>
                                    <tbody>{parcel.restrictions.items.map((item) => (
                                        <tr key={item.type}><td>{item.type}</td><td>{formatArea(item.areaM2)}</td><td>{formatRatio(item.ratio)}</td></tr>
                                    ))}</tbody>
                                </table>
                            )}
                        </>
                    )}
                    <p className="report-legal-note">本结果仅表示目标地块与当前加载的限制建设区域数据之间的空间关系，不构成行政审批或法律合规结论。</p>
                </section>
            );
        case "parcel-surroundings":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    {!parcel.surroundings.available ? (
                        <Unavailable>本次分析未包含周边条件查询。</Unavailable>
                    ) : (
                        <dl className="report-analysis-metrics">
                            <div><dt>分析半径</dt><dd>{parcel.surroundings.bufferDistanceM ?? 500} m</dd></div>
                            <div><dt>范围内道路要素</dt><dd>{parcel.surroundings.roadFeatureCount ?? 0}</dd></div>
                            {Object.entries(parcel.surroundings.roadClassSummary).map(([roadClass, count]) => (
                                <div key={roadClass}><dt>{roadClass}</dt><dd>{count} 个要素</dd></div>
                            ))}
                            <div><dt>附近水系要素</dt><dd>{parcel.surroundings.waterConfigured ? parcel.surroundings.waterFeatureCount ?? 0 : "未配置数据源"}</dd></div>
                            <div><dt>地块与水系直接相交</dt><dd>{!parcel.surroundings.waterConfigured ? "未配置数据源" : parcel.surroundings.waterIntersectsTarget ? "是" : "否"}</dd></div>
                            <div><dt>所在行政区</dt><dd>{parcel.surroundings.administrativeConfigured ? parcel.surroundings.administrativeAreaName ?? "未识别" : "未配置数据源"}</dd></div>
                        </dl>
                    )}
                </section>
            );
        case "parcel-quality":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <div className="report-quality-summary">
                        <article><span>状态</span><strong>{parcel.quality.status === "pass" ? "正常" : "需检查"}</strong></article>
                        <article><span>错误</span><strong>{parcel.quality.errorCount}</strong></article>
                        <article><span>警告</span><strong>{parcel.quality.warningCount}</strong></article>
                    </div>
                    {parcel.quality.issues.length > 0 && (
                        <ul className="report-quality-issues">
                            {parcel.quality.issues.slice(0, 5).map((issue, index) => (
                                <li key={`${issue.code}-${index}`}><strong>{issue.severity.toUpperCase()}</strong>{issue.message}</li>
                            ))}
                        </ul>
                    )}
                </section>
            );
        case "parcel-summary":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <table className="report-table report-parcel-summary-table">
                        <thead><tr><th>分析项</th><th>结果</th></tr></thead>
                        <tbody>{parcelSummaryRows(parcel).map(([label, value]) => (
                            <tr key={label}><td>{label}</td><td>{value}</td></tr>
                        ))}</tbody>
                    </table>
                </section>
            );
        case "parcel-evidence":
            return (
                <section className="report-section" key={section.id}>
                    <h2>{heading}</h2>
                    <Unavailable>分析依据中心将在后续版本中提供；本报告当前仅列出数据来源与确定性计算方法。</Unavailable>
                </section>
            );
        default:
            return null;
    }
}
