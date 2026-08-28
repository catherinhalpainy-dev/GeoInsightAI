import {
    CheckCircle2,
    Download,
    MousePointer2,
    Play,
    RotateCcw,
    SquareDashed,
    Trash2,
    X,
} from "lucide-react";

import {
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
    AoiAnalysisResult,
    AoiQueryRelation,
    AoiSketchMode,
} from "../../types/analysis";

interface AoiAnalysisPanelProps {
    mode: AoiSketchMode;
    pointCount: number;
    relation: AoiQueryRelation;
    result: AoiAnalysisResult | null;
    error: string | null;
    onRelationChange: (
        relation: AoiQueryRelation,
    ) => void;
    onStart: () => void;
    onRestart: () => void;
    onCancelDrawing: () => void;
    onRunQuery: () => void;
    onExportGeoJson: () => void;
    onExportCsv: () => void;
    onClear: () => void;
    onClose: () => void;
}

const RELATION_OPTIONS: Array<{
    value: AoiQueryRelation;
    label: string;
    technicalLabel: string;
}> = [
    {
        value: "intersects",
        label: "相交",
        technicalLabel: "Intersects",
    },
    {
        value: "within",
        label: "位于内部",
        technicalLabel: "Within",
    },
];

export function AoiAnalysisPanel({
    mode,
    pointCount,
    relation,
    result,
    error,
    onRelationChange,
    onStart,
    onRestart,
    onCancelDrawing,
    onRunQuery,
    onExportGeoJson,
    onExportCsv,
    onClear,
    onClose,
}: AoiAnalysisPanelProps) {
    const typeEntries = result
        ? LAND_USE_TYPES
            .filter(
                (landUseType) =>
                    result.typeCounts[landUseType] > 0,
            )
            .map((landUseType) => ({
                landUseType,
                count: result.typeCounts[landUseType],
            }))
        : [];

    return (
        <aside
            className="aoi-analysis-panel"
            aria-label="范围分析"
        >
            <header className="aoi-panel-header">
                <div>
                    <span>SPATIAL ANALYSIS</span>
                    <h2>范围分析</h2>
                </div>

                <button
                    type="button"
                    aria-label="关闭范围分析"
                    onClick={onClose}
                >
                    <X size={18} aria-hidden="true" />
                </button>
            </header>

            <div className="aoi-panel-body">
                <section className="aoi-panel-section">
                    <header>
                        <span>DRAW AREA</span>
                        <h3>研究区域 AOI</h3>
                    </header>

                    {mode === "idle" && (
                        <>
                            <p className="aoi-section-description">
                                在地图上绘制 Polygon，定义独立研究范围。
                            </p>
                            <button
                                type="button"
                                className="aoi-primary-button"
                                onClick={onStart}
                            >
                                <SquareDashed size={15} aria-hidden="true" />
                                开始绘制范围
                            </button>
                        </>
                    )}

                    {mode === "drawing" && (
                        <>
                            <div className="aoi-sketch-status is-drawing">
                                <div>
                                    <MousePointer2 size={15} aria-hidden="true" />
                                    <strong>正在绘制</strong>
                                </div>
                                <p>单击添加顶点，双击完成</p>
                                <span>顶点：{pointCount}</span>
                            </div>

                            <button
                                type="button"
                                className="aoi-ghost-button"
                                onClick={onCancelDrawing}
                            >
                                取消绘制
                            </button>
                        </>
                    )}

                    {mode === "completed" && (
                        <>
                            <div className="aoi-sketch-status is-completed">
                                <div>
                                    <CheckCircle2 size={15} aria-hidden="true" />
                                    <strong>AOI 已完成</strong>
                                </div>
                                <span>顶点：{pointCount}</span>
                            </div>

                            <button
                                type="button"
                                className="aoi-secondary-button"
                                onClick={onRestart}
                            >
                                <RotateCcw size={14} aria-hidden="true" />
                                重新绘制
                            </button>
                        </>
                    )}
                </section>

                <section className="aoi-panel-section">
                    <header>
                        <span>RELATION</span>
                        <h3>空间关系</h3>
                    </header>

                    <div
                        className="aoi-relation-control"
                        role="radiogroup"
                        aria-label="空间关系"
                    >
                        {RELATION_OPTIONS.map((option) => (
                            <label
                                key={option.value}
                                className={
                                    relation === option.value
                                        ? "is-active"
                                        : undefined
                                }
                            >
                                <input
                                    type="radio"
                                    name="aoi-relation"
                                    value={option.value}
                                    checked={relation === option.value}
                                    onChange={() => {
                                        onRelationChange(option.value);
                                    }}
                                />
                                <span>{option.label}</span>
                                <small>{option.technicalLabel}</small>
                            </label>
                        ))}
                    </div>

                    <button
                        type="button"
                        className="aoi-run-button"
                        disabled={mode !== "completed"}
                        onClick={onRunQuery}
                    >
                        <Play size={14} fill="currentColor" aria-hidden="true" />
                        执行空间查询
                    </button>

                    {error && (
                        <p className="aoi-panel-error">
                            {error}
                        </p>
                    )}
                </section>

                {result && (
                    <section className="aoi-panel-section aoi-result-section">
                        <header className="aoi-result-header">
                            <div>
                                <span>RESULT</span>
                                <h3>查询结果</h3>
                            </div>
                            <span>
                                {relation === "within" ? "Within" : "Intersects"}
                            </span>
                        </header>

                        <dl className="aoi-result-metrics">
                            <div>
                                <dd>{result.featureCount.toLocaleString("zh-CN")}</dd>
                                <dt>命中地块</dt>
                            </div>
                            <div>
                                <dd>
                                    {result.totalAreaKm2.toLocaleString("zh-CN", {
                                        maximumFractionDigits: 3,
                                    })}
                                    <small> km²</small>
                                </dd>
                                <dt>总面积</dt>
                            </div>
                        </dl>

                        <div className="aoi-type-statistics">
                            <strong>分类统计</strong>

                            {typeEntries.length > 0 ? (
                                <ul>
                                    {typeEntries.map((entry) => (
                                        <li key={entry.landUseType}>
                                            <span>
                                                {LAND_USE_LABELS[entry.landUseType]}
                                            </span>
                                            <strong>{entry.count}</strong>
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p>当前关系下没有命中地块</p>
                            )}
                        </div>
                    </section>
                )}

                <section className="aoi-panel-section aoi-export-section">
                    <header>
                        <span>EXPORT</span>
                        <h3>结果导出</h3>
                    </header>

                    <div className="aoi-export-actions">
                        <button
                            type="button"
                            disabled={!result}
                            onClick={onExportGeoJson}
                        >
                            <Download size={14} aria-hidden="true" />
                            GeoJSON
                        </button>
                        <button
                            type="button"
                            disabled={!result}
                            onClick={onExportCsv}
                        >
                            <Download size={14} aria-hidden="true" />
                            CSV
                        </button>
                    </div>

                    <button
                        type="button"
                        className="aoi-clear-button"
                        disabled={mode === "idle" && !result}
                        onClick={onClear}
                    >
                        <Trash2 size={14} aria-hidden="true" />
                        清除分析
                    </button>
                </section>
            </div>
        </aside>
    );
}
