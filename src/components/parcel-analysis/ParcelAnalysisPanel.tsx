import {
    CheckCircle2,
    Circle,
    LoaderCircle,
    Play,
    RotateCcw,
    TriangleAlert,
    X,
    XCircle,
} from "lucide-react";

import { LAND_USE_LABELS } from "../../constants/landUse";
import type { LandUseFeature } from "../../types/landUse";
import type { WorkspaceVectorLayer } from "../../types/mapLayer";
import type {
    ParcelAnalysisLayerBindings,
    ParcelAnalysisRunState,
    ParcelAnalysisStepId,
    ParcelAnalysisStepState,
} from "../../types/parcelAnalysis";
import "../../styles/parcelAnalysis.css";

interface ParcelAnalysisPanelProps {
    selectedFeature: LandUseFeature | null;
    overlayLayers: WorkspaceVectorLayer[];
    bindings: ParcelAnalysisLayerBindings;
    validationErrors: string[];
    runState: ParcelAnalysisRunState;
    onBindingChange: (
        key: keyof ParcelAnalysisLayerBindings,
        layerId: string | null,
    ) => void;
    onRun: () => void;
    onClear: () => void;
    onClose: () => void;
}

const STEP_LABELS: Record<ParcelAnalysisStepId, string> = {
    quality: "地块数据质量",
    planning: "规划用途匹配",
    restriction: "限制区域核查",
    surroundings: "周边条件查询",
    summary: "汇总业务结果",
};

function formatArea(areaM2: number) {
    if (areaM2 >= 10_000) return `${(areaM2 / 10_000).toFixed(2)} ha`;
    return `${Math.round(areaM2).toLocaleString("zh-CN")} m²`;
}

function formatRatio(value: number) {
    return `${(value * 100).toFixed(1)}%`;
}

function StepIcon({ status }: { status: ParcelAnalysisStepState["status"] }) {
    if (status === "running") return <LoaderCircle className="parcel-step-spinner" size={15} />;
    if (status === "completed") return <CheckCircle2 size={15} />;
    if (status === "warning") return <TriangleAlert size={15} />;
    if (status === "failed") return <XCircle size={15} />;
    return <Circle size={15} />;
}

function LayerSelect({
    label,
    required,
    value,
    layers,
    onChange,
}: {
    label: string;
    required?: boolean;
    value: string | null;
    layers: WorkspaceVectorLayer[];
    onChange: (layerId: string | null) => void;
}) {
    return (
        <label className="parcel-source-field">
            <span>{label}{required && <em>必需</em>}</span>
            <select
                value={value ?? ""}
                onChange={(event) => onChange(event.currentTarget.value || null)}
            >
                <option value="">{required ? "请选择图层" : "不配置"}</option>
                {layers.map((layer) => (
                    <option key={layer.id} value={layer.id}>
                        {layer.name} · {layer.featureCount}
                    </option>
                ))}
            </select>
        </label>
    );
}

export function ParcelAnalysisPanel({
    selectedFeature,
    overlayLayers,
    bindings,
    validationErrors,
    runState,
    onBindingChange,
    onRun,
    onClear,
    onClose,
}: ParcelAnalysisPanelProps) {
    const polygonLayers = overlayLayers.filter(({ geometryKind }) =>
        geometryKind === "polygon" || geometryKind === "mixed",
    );
    const lineLayers = overlayLayers.filter(({ geometryKind }) =>
        geometryKind === "line" || geometryKind === "mixed",
    );
    const waterLayers = overlayLayers.filter(({ geometryKind }) =>
        geometryKind === "line" || geometryKind === "polygon" || geometryKind === "mixed",
    );
    const result = runState.result;
    const canRun = Boolean(selectedFeature) && validationErrors.length === 0 && runState.status !== "running";

    return (
        <aside className="parcel-analysis-panel">
            <header className="parcel-analysis-header">
                <div>
                    <span>PARCEL REVIEW</span>
                    <h2>地块分析</h2>
                    <p>固定流程的地块辅助审查</p>
                </div>
                <button type="button" aria-label="关闭地块分析" onClick={onClose}>
                    <X size={16} aria-hidden="true" />
                </button>
            </header>

            <div className="parcel-analysis-body">
                <section className="parcel-target-section">
                    <span className="parcel-eyebrow">TARGET PARCEL</span>
                    {selectedFeature ? (
                        <div className="parcel-target-summary">
                            <strong>{selectedFeature.properties.id}</strong>
                            <span>{LAND_USE_LABELS[selectedFeature.properties.landUseType]}</span>
                            <span>{formatArea(selectedFeature.properties.areaM2)}</span>
                            <span>建成年份</span>
                            <span>{selectedFeature.properties.builtYear ?? "未填写"}</span>
                        </div>
                    ) : (
                        <p className="parcel-empty-target">
                            请先从地图、属性表或全局搜索中选择一个主数据地块。
                        </p>
                    )}
                </section>

                <section>
                    <span className="parcel-eyebrow">SOURCE BINDINGS</span>
                    <p className="parcel-section-note">已根据图层名称和几何类型自动匹配，也可手动调整。</p>
                    <div className="parcel-source-grid">
                        <LayerSelect
                            label="规划用途"
                            required
                            value={bindings.planningLayerId}
                            layers={polygonLayers}
                            onChange={(id) => onBindingChange("planningLayerId", id)}
                        />
                        <LayerSelect
                            label="限制建设区域"
                            required
                            value={bindings.restrictionLayerId}
                            layers={polygonLayers}
                            onChange={(id) => onBindingChange("restrictionLayerId", id)}
                        />
                        <LayerSelect
                            label="道路"
                            required
                            value={bindings.roadLayerId}
                            layers={lineLayers}
                            onChange={(id) => onBindingChange("roadLayerId", id)}
                        />
                        <LayerSelect
                            label="水系"
                            value={bindings.waterLayerId}
                            layers={waterLayers}
                            onChange={(id) => onBindingChange("waterLayerId", id)}
                        />
                        <LayerSelect
                            label="行政区"
                            value={bindings.administrativeLayerId}
                            layers={polygonLayers}
                            onChange={(id) => onBindingChange("administrativeLayerId", id)}
                        />
                    </div>
                    {validationErrors.length > 0 && (
                        <div className="parcel-validation-errors" role="alert">
                            {validationErrors.map((message) => <p key={message}>{message}</p>)}
                        </div>
                    )}
                    <div className="parcel-run-actions">
                        <button
                            type="button"
                            className="parcel-primary-action"
                            disabled={!canRun}
                            onClick={onRun}
                        >
                            {runState.status === "running"
                                ? <LoaderCircle className="parcel-step-spinner" size={15} />
                                : <Play size={15} />}
                            {runState.status === "running" ? "正在分析..." : "运行地块分析"}
                        </button>
                        {(result || runState.error) && (
                            <button type="button" onClick={onClear}>
                                <RotateCcw size={14} /> 清除结果
                            </button>
                        )}
                    </div>
                </section>

                {(runState.status !== "idle" || result) && (
                    <section>
                        <span className="parcel-eyebrow">RUN PROGRESS</span>
                        <ol className="parcel-progress-list">
                            {runState.steps.map((step) => (
                                <li key={step.id} className={`is-${step.status}`}>
                                    <StepIcon status={step.status} />
                                    <span>{STEP_LABELS[step.id]}</span>
                                    <small>{step.message}</small>
                                </li>
                            ))}
                        </ol>
                        {runState.error && <p className="parcel-run-error" role="alert">{runState.error}</p>}
                    </section>
                )}

                {result && (
                    <section className="parcel-result-section">
                        <div className="parcel-result-heading">
                            <span className="parcel-eyebrow">ANALYSIS RESULT</span>
                            <time>{new Date(result.generatedAt).toLocaleString("zh-CN")}</time>
                        </div>

                        <div className="parcel-result-group">
                            <h3>规划用途</h3>
                            <dl>
                                <div><dt>主要规划用途</dt><dd>{result.planning.dominantUse ?? "未识别"}</dd></div>
                                <div><dt>规划覆盖比例</dt><dd>{formatRatio(result.planning.coverageRatio)}</dd></div>
                                <div><dt>未覆盖面积</dt><dd>{formatArea(result.planning.uncoveredAreaM2)}</dd></div>
                            </dl>
                            {result.planning.items.map((item) => (
                                <div className="parcel-detail-row" key={item.plannedUse}>
                                    <span>{item.plannedUse}</span>
                                    <strong>{formatArea(item.areaM2)} · {formatRatio(item.ratio)}</strong>
                                </div>
                            ))}
                            {result.planning.hasOverlappingPlanningZones && (
                                <p className="parcel-status-warning">规划分区存在重叠，分类面积可能重复累计。</p>
                            )}
                        </div>

                        <div className="parcel-result-group">
                            <h3>限制区域</h3>
                            <p className={result.restrictions.hasConflict ? "parcel-status-conflict" : "parcel-status-ok"}>
                                {result.restrictions.hasConflict
                                    ? "检测到限制区域空间重叠，需要进一步业务审查"
                                    : "未检测到限制区域空间重叠"}
                            </p>
                            <dl>
                                <div><dt>去重重叠面积</dt><dd>{formatArea(result.restrictions.overlapAreaM2)}</dd></div>
                                <div><dt>地块占比</dt><dd>{formatRatio(result.restrictions.overlapRatio)}</dd></div>
                            </dl>
                            {result.restrictions.items.map((item) => (
                                <div className="parcel-detail-row" key={item.restrictionType}>
                                    <span>{item.restrictionType}</span>
                                    <strong>{formatArea(item.areaM2)}</strong>
                                </div>
                            ))}
                        </div>

                        <div className="parcel-result-group">
                            <h3>周边条件</h3>
                            <dl>
                                <div><dt>500m 道路</dt><dd>{result.surroundings.roadFeatureCount} 个</dd></div>
                                {Object.entries(result.surroundings.roadClassSummary).map(([roadClass, count]) => (
                                    <div key={roadClass}><dt>{roadClass}</dt><dd>{count} 个要素</dd></div>
                                ))}
                                <div>
                                    <dt>附近水系</dt>
                                    <dd>{result.surroundings.waterConfigured
                                        ? `${result.surroundings.waterFeatureCount ?? 0} 个`
                                        : "未配置"}</dd>
                                </div>
                                <div>
                                    <dt>水系直接相交</dt>
                                    <dd>{result.surroundings.waterIntersectsTarget === null
                                        ? "未配置"
                                        : result.surroundings.waterIntersectsTarget ? "是" : "否"}</dd>
                                </div>
                                <div>
                                    <dt>所在行政区</dt>
                                    <dd>{result.surroundings.administrativeConfigured
                                        ? result.surroundings.administrativeAreaName ?? "未识别"
                                        : "未配置"}</dd>
                                </div>
                            </dl>
                        </div>

                        <div className="parcel-result-group">
                            <h3>数据质量</h3>
                            <p className={result.quality.status === "pass" ? "parcel-status-ok" : "parcel-status-warning"}>
                                {result.quality.status === "pass"
                                    ? "目标地块检查正常"
                                    : `${result.quality.errorCount} 个错误 · ${result.quality.warningCount} 个警告`}
                            </p>
                        </div>

                        <div className="parcel-summary-table" role="table" aria-label="地块分析汇总">
                            <div><span>地块面积</span><strong>{formatArea(result.target.areaM2)}</strong></div>
                            <div><span>现状用途</span><strong>{LAND_USE_LABELS[result.target.landUseType]}</strong></div>
                            <div><span>主要规划用途</span><strong>{result.planning.dominantUse ?? "未识别"}</strong></div>
                            <div><span>限制区域重叠</span><strong>{formatArea(result.restrictions.overlapAreaM2)}</strong></div>
                            <div><span>限制区域占比</span><strong>{formatRatio(result.restrictions.overlapRatio)}</strong></div>
                            <div><span>500m 道路要素</span><strong>{result.surroundings.roadFeatureCount}</strong></div>
                            <div><span>附近水系</span><strong>{result.surroundings.waterFeatureCount ?? "未配置"}</strong></div>
                            <div><span>数据质量</span><strong>{result.quality.status === "pass" ? "正常" : "需检查"}</strong></div>
                        </div>
                        <p className="parcel-disclaimer">
                            本结果是空间数据辅助审查事实，不构成规划许可、法律合规或开发审批结论。
                        </p>
                    </section>
                )}
            </div>
        </aside>
    );
}
