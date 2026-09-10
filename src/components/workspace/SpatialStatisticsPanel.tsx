import {
    Flame,
    Grid3X3,
    LocateFixed,
    Play,
    Trash2,
    X,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

import type {
    SpatialStatisticsConfig,
    SpatialStatisticsInputOption,
    SpatialStatisticsRunRequest,
    SpatialStatisticsSummary,
} from "../../types/spatialStatistics";
import "../../styles/spatialStatistics.css";

interface SpatialStatisticsPanelProps {
    inputs: readonly SpatialStatisticsInputOption[];
    config: SpatialStatisticsConfig;
    summary: SpatialStatisticsSummary | null;
    analyzing: boolean;
    error: string | null;
    heatmapVisible: boolean;
    onRun: (request: SpatialStatisticsRunRequest) => void;
    onClearHeatmap: () => void;
    onFitHotspot: (cellId: string) => void;
    onClose: () => void;
}

const CELL_SIZE_OPTIONS = [0.25, 0.5, 1, 2, 5] as const;

function formatValue(value: number, areaWeighted: boolean) {
    return areaWeighted
        ? `${Math.round(value).toLocaleString("zh-CN")} m²`
        : `${value.toLocaleString("zh-CN")} features`;
}

export function SpatialStatisticsPanel({
    inputs,
    config,
    summary,
    analyzing,
    error,
    heatmapVisible,
    onRun,
    onClearHeatmap,
    onFitHotspot,
    onClose,
}: SpatialStatisticsPanelProps) {
    const [selectedInputKey, setSelectedInputKey] = useState(
        inputs[0]?.key ?? "filtered-primary",
    );
    const [draftConfig, setDraftConfig] = useState(config);
    const selectedInput = useMemo(
        () => inputs.find((input) => input.key === selectedInputKey) ?? inputs[0],
        [inputs, selectedInputKey],
    );

    useEffect(() => {
        if (!inputs.some((input) => input.key === selectedInputKey)) {
            setSelectedInputKey(inputs[0]?.key ?? "filtered-primary");
        }
    }, [inputs, selectedInputKey]);

    useEffect(() => {
        if (!selectedInput?.supportsAreaWeight && draftConfig.weightMode === "area") {
            setDraftConfig((previous) => ({ ...previous, weightMode: "count" }));
        }
    }, [draftConfig.weightMode, selectedInput?.supportsAreaWeight]);

    function runAnalysis() {
        if (!selectedInput) {
            return;
        }

        onRun({
            input: selectedInput.input,
            config: draftConfig,
        });
    }

    const areaWeighted = summary?.weightMode === "area";

    return (
        <aside className="spatial-statistics-panel">
            <header className="spatial-statistics-header">
                <div>
                    <span>SPATIAL STATISTICS</span>
                    <h2>空间统计</h2>
                </div>
                <button type="button" aria-label="关闭空间统计" onClick={onClose}>
                    <X size={16} aria-hidden="true" />
                </button>
            </header>

            <div className="spatial-statistics-body">
                <section>
                    <span className="spatial-statistics-eyebrow">ANALYSIS INPUT</span>
                    <label>
                        <span>数据输入</span>
                        <select
                            value={selectedInput?.key ?? ""}
                            onChange={(event) => setSelectedInputKey(event.currentTarget.value)}
                        >
                            {inputs.map((input) => (
                                <option key={input.key} value={input.key}>
                                    {input.label} · {input.featureCount} features
                                </option>
                            ))}
                        </select>
                    </label>
                </section>

                <section>
                    <span className="spatial-statistics-eyebrow">METHOD</span>
                    <div className="spatial-method-switch" role="group" aria-label="分析方式">
                        <button
                            type="button"
                            className={draftConfig.method === "heatmap" ? "active" : undefined}
                            onClick={() => setDraftConfig((previous) => ({
                                ...previous,
                                method: "heatmap",
                            }))}
                        >
                            <Flame size={15} aria-hidden="true" />
                            密度热力图
                        </button>
                        <button
                            type="button"
                            className={draftConfig.method === "hexbin" ? "active" : undefined}
                            onClick={() => setDraftConfig((previous) => ({
                                ...previous,
                                method: "hexbin",
                            }))}
                        >
                            <Grid3X3 size={15} aria-hidden="true" />
                            六边形聚合
                        </button>
                    </div>
                    <p className="spatial-method-description">
                        {draftConfig.method === "heatmap"
                            ? "连续表达代表点密度，不生成可查询网格。"
                            : "生成可量化、可导出的代表点聚合网格。"}
                    </p>
                </section>

                <section>
                    <span className="spatial-statistics-eyebrow">WEIGHT</span>
                    <div className="spatial-weight-options">
                        <label>
                            <input
                                type="radio"
                                name="spatial-weight"
                                checked={draftConfig.weightMode === "count"}
                                onChange={() => setDraftConfig((previous) => ({
                                    ...previous,
                                    weightMode: "count",
                                }))}
                            />
                            要素数量
                        </label>
                        <label className={!selectedInput?.supportsAreaWeight ? "disabled" : undefined}>
                            <input
                                type="radio"
                                name="spatial-weight"
                                checked={draftConfig.weightMode === "area"}
                                disabled={!selectedInput?.supportsAreaWeight}
                                onChange={() => setDraftConfig((previous) => ({
                                    ...previous,
                                    weightMode: "area",
                                }))}
                            />
                            面积权重
                        </label>
                    </div>
                    {!selectedInput?.supportsAreaWeight && (
                        <p className="spatial-field-note">当前数据不包含完整可用的 areaM2 面积字段。</p>
                    )}
                </section>

                {draftConfig.method === "heatmap" ? (
                    <section className="spatial-parameter-section">
                        <label>
                            <span>半径</span>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                step="1"
                                value={draftConfig.heatmapRadius}
                                onChange={(event) => setDraftConfig((previous) => ({
                                    ...previous,
                                    heatmapRadius: Number(event.currentTarget.value),
                                }))}
                            />
                            <strong>{draftConfig.heatmapRadius}px</strong>
                        </label>
                        <label>
                            <span>强度</span>
                            <input
                                type="range"
                                min="0.5"
                                max="2"
                                step="0.1"
                                value={draftConfig.heatmapIntensity}
                                onChange={(event) => setDraftConfig((previous) => ({
                                    ...previous,
                                    heatmapIntensity: Number(event.currentTarget.value),
                                }))}
                            />
                            <strong>{draftConfig.heatmapIntensity.toFixed(1)}</strong>
                        </label>
                    </section>
                ) : (
                    <section className="spatial-parameter-section">
                        <label>
                            <span>网格尺寸</span>
                            <select
                                value={draftConfig.cellSizeKm}
                                onChange={(event) => setDraftConfig((previous) => ({
                                    ...previous,
                                    cellSizeKm: Number(event.currentTarget.value),
                                }))}
                            >
                                {CELL_SIZE_OPTIONS.map((size) => (
                                    <option key={size} value={size}>{size} km</option>
                                ))}
                            </select>
                        </label>
                    </section>
                )}

                {error && <p className="spatial-statistics-error" role="alert">{error}</p>}

                <div className="spatial-run-actions">
                    <button
                        type="button"
                        className="spatial-run-primary"
                        disabled={analyzing || !selectedInput || selectedInput.featureCount === 0}
                        onClick={runAnalysis}
                    >
                        <Play size={14} aria-hidden="true" />
                        {analyzing
                            ? "正在分析..."
                            : draftConfig.method === "heatmap"
                                ? "生成热力图"
                                : "运行聚合分析"}
                    </button>
                    {heatmapVisible && (
                        <button type="button" onClick={onClearHeatmap}>
                            <Trash2 size={14} aria-hidden="true" />
                            清除热力图
                        </button>
                    )}
                </div>

                {summary && (
                    <section className="spatial-statistics-result">
                        <span className="spatial-statistics-eyebrow">RESULT SUMMARY</span>
                        <div className="spatial-summary-grid">
                            <div><span>分析要素</span><strong>{summary.inputFeatureCount}</strong></div>
                            <div><span>分析点</span><strong>{summary.analysisPointCount}</strong></div>
                            <div><span>总权重</span><strong>{formatValue(summary.totalWeight, areaWeighted)}</strong></div>
                            {summary.method === "hexbin" && (
                                <>
                                    <div><span>有效网格</span><strong>{summary.occupiedCellCount}</strong></div>
                                    <div><span>最高网格</span><strong>{formatValue(summary.maxCellValue, areaWeighted)}</strong></div>
                                    <div><span>最高占比</span><strong>{(summary.maxCellShare * 100).toFixed(1)}%</strong></div>
                                </>
                            )}
                        </div>
                        {summary.meanCenter && (
                            <p className="spatial-mean-center">
                                平均中心：{summary.meanCenter[0].toFixed(5)}, {summary.meanCenter[1].toFixed(5)}
                            </p>
                        )}

                        {summary.method === "hexbin" && summary.hotspotCells.length > 0 && (
                            <div className="spatial-hotspot-ranking">
                                <h3>高值网格 TOP 5</h3>
                                <ol>
                                    {summary.hotspotCells.map((cell) => (
                                        <li key={cell.id}>
                                            <strong>{cell.rank}</strong>
                                            <span>
                                                {areaWeighted
                                                    ? `${cell.featureCount} features · ${formatValue(cell.value, true)}`
                                                    : formatValue(cell.value, false)}
                                                <small>{(cell.share * 100).toFixed(1)}%</small>
                                            </span>
                                            <button type="button" onClick={() => onFitHotspot(cell.id)}>
                                                <LocateFixed size={13} aria-hidden="true" />
                                                定位
                                            </button>
                                        </li>
                                    ))}
                                </ol>
                            </div>
                        )}
                    </section>
                )}

                <p className="spatial-statistics-disclaimer">
                    当前热点基于代表点密度或六边形网格聚合，不代表 Getis-Ord Gi* 等统计显著性检验。Polygon 面积权重仍按代表点归属网格，不执行 Polygon 与网格的真实相交面积计算。
                </p>
            </div>
        </aside>
    );
}
