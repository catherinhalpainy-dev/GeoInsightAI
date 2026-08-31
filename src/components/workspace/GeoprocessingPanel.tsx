import {
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    CircleDot,
    Combine,
    Play,
    ScanLine,
    Workflow,
    X,
} from "lucide-react";

import type {
    DissolveField,
    GeoprocessingInputSource,
    GeoprocessingOperation,
    GeoprocessingRunRequest,
    GeoprocessingRunSummary,
    IntersectionOverlaySource,
} from "../../types/analysis";

interface GeoprocessingPanelProps {
    filteredCount: number;
    aoiQueryCount: number;
    bufferQueryCount: number;
    hasAoi: boolean;
    hasBuffer: boolean;
    summary: GeoprocessingRunSummary | null;
    error: string | null;
    onRun: (
        request: GeoprocessingRunRequest,
    ) => void;
    onClearFeedback: () => void;
    onClose: () => void;
}

const OPERATION_OPTIONS: readonly {
    value: GeoprocessingOperation;
    label: string;
    technicalLabel: string;
    icon: typeof Workflow;
}[] = [
    {
        value: "intersection",
        label: "叠加求交",
        technicalLabel: "Intersection",
        icon: ScanLine,
    },
    {
        value: "dissolve",
        label: "融合",
        technicalLabel: "Dissolve",
        icon: Combine,
    },
    {
        value: "centroid",
        label: "中心点",
        technicalLabel: "Centroid",
        icon: CircleDot,
    },
];

export function GeoprocessingPanel({
    filteredCount,
    aoiQueryCount,
    bufferQueryCount,
    hasAoi,
    hasBuffer,
    summary,
    error,
    onRun,
    onClearFeedback,
    onClose,
}: GeoprocessingPanelProps) {
    const [operation, setOperation] =
        useState<GeoprocessingOperation>(
            "intersection",
        );
    const [inputSource, setInputSource] =
        useState<GeoprocessingInputSource>(
            "current-filtered",
        );
    const [overlaySource, setOverlaySource] =
        useState<IntersectionOverlaySource>(
            "aoi",
        );
    const [dissolveField, setDissolveField] =
        useState<DissolveField>(
            "all",
        );

    const inputOptions = useMemo<readonly {
        value: GeoprocessingInputSource;
        label: string;
        count: number;
    }[]>(
        () => [
            {
                value: "current-filtered",
                label: "当前筛选结果",
                count: filteredCount,
            },
            {
                value: "aoi-query",
                label: "AOI 查询结果",
                count: aoiQueryCount,
            },
            {
                value: "buffer-query",
                label: "Buffer 查询结果",
                count: bufferQueryCount,
            },
        ],
        [
            aoiQueryCount,
            bufferQueryCount,
            filteredCount,
        ],
    );
    const selectedInput = inputOptions.find(
        (option) => option.value === inputSource,
    ) ?? inputOptions[0];
    const selectedInputCount =
        selectedInput.count;

    useEffect(() => {
        if (selectedInputCount > 0) {
            return;
        }

        const firstAvailable = inputOptions.find(
            (option) => option.count > 0,
        );

        if (
            firstAvailable &&
            firstAvailable.value !== inputSource
        ) {
            setInputSource(firstAvailable.value);
        }
    }, [
        aoiQueryCount,
        bufferQueryCount,
        filteredCount,
        inputOptions,
        inputSource,
        selectedInputCount,
    ]);

    useEffect(() => {
        if (
            overlaySource === "aoi" &&
            !hasAoi &&
            hasBuffer
        ) {
            setOverlaySource("buffer");
            return;
        }

        if (
            overlaySource === "buffer" &&
            !hasBuffer &&
            hasAoi
        ) {
            setOverlaySource("aoi");
        }
    }, [
        hasAoi,
        hasBuffer,
        overlaySource,
    ]);

    const hasSelectedOverlay =
        overlaySource === "aoi"
            ? hasAoi
            : hasBuffer;
    const canRun =
        selectedInputCount > 0 &&
        (
            operation !== "intersection" ||
            hasSelectedOverlay
        );
    const visibleSummary =
        summary?.operation === operation
            ? summary
            : null;

    function handleRun() {
        onRun({
            operation,
            inputSource,
            overlaySource,
            dissolveField,
        });
    }

    return (
        <aside
            className="geoprocessing-panel"
            aria-label="地理处理"
        >
            <header className="geoprocessing-header">
                <div>
                    <span>GEOPROCESSING</span>
                    <h2>地理处理</h2>
                    <p>生成可管理的新 GeoJSON 结果图层</p>
                </div>
                <button
                    type="button"
                    aria-label="关闭地理处理"
                    onClick={onClose}
                >
                    <X size={18} aria-hidden="true" />
                </button>
            </header>

            <div className="geoprocessing-body">
                <section className="geoprocessing-section">
                    <header>
                        <span>INPUT LAYER</span>
                        <h3>输入图层</h3>
                    </header>

                    <label
                        className="geoprocessing-select-field"
                        htmlFor="geoprocessing-input"
                    >
                        <span>数据来源</span>
                        <select
                            id="geoprocessing-input"
                            value={inputSource}
                            onChange={(event) => {
                                const value = event.currentTarget.value;

                                if (
                                    value === "current-filtered" ||
                                    value === "aoi-query" ||
                                    value === "buffer-query"
                                ) {
                                    setInputSource(value);
                                    onClearFeedback();
                                }
                            }}
                        >
                            {inputOptions.map((option) => (
                                <option
                                    key={option.value}
                                    value={option.value}
                                    disabled={option.count === 0}
                                >
                                    {option.label}
                                    {" · "}
                                    {option.count} 个要素
                                </option>
                            ))}
                        </select>
                    </label>

                    <div className="geoprocessing-input-summary">
                        <Workflow size={15} aria-hidden="true" />
                        <span>{selectedInput.label}</span>
                        <strong>
                            {selectedInputCount.toLocaleString("zh-CN")}
                        </strong>
                    </div>
                </section>

                <section className="geoprocessing-section">
                    <header>
                        <span>TOOL</span>
                        <h3>处理工具</h3>
                    </header>

                    <div
                        className="geoprocessing-tool-options"
                        role="group"
                        aria-label="地理处理工具"
                    >
                        {OPERATION_OPTIONS.map((option) => {
                            const Icon = option.icon;

                            return (
                                <button
                                    key={option.value}
                                    type="button"
                                    className={
                                        operation === option.value
                                            ? "is-active"
                                            : undefined
                                    }
                                    aria-pressed={
                                        operation === option.value
                                    }
                                    onClick={() => {
                                        setOperation(option.value);
                                        onClearFeedback();
                                    }}
                                >
                                    <Icon size={16} aria-hidden="true" />
                                    <span>{option.label}</span>
                                    <small>{option.technicalLabel}</small>
                                </button>
                            );
                        })}
                    </div>
                </section>

                <section className="geoprocessing-section geoprocessing-parameters">
                    <header>
                        <span>PARAMETERS</span>
                        <h3>参数</h3>
                    </header>

                    {operation === "intersection" && (
                        <>
                            <span className="geoprocessing-field-label">
                                叠加范围
                            </span>
                            <div className="geoprocessing-choice-list">
                                <label className={
                                    overlaySource === "aoi"
                                        ? "is-active"
                                        : undefined
                                }>
                                    <input
                                        type="radio"
                                        name="intersection-overlay"
                                        value="aoi"
                                        checked={overlaySource === "aoi"}
                                        disabled={!hasAoi}
                                        onChange={() => {
                                            setOverlaySource("aoi");
                                            onClearFeedback();
                                        }}
                                    />
                                    <span>
                                        <strong>当前 AOI</strong>
                                        <small>
                                            {hasAoi
                                                ? "已完成绘制"
                                                : "请先绘制 AOI"}
                                        </small>
                                    </span>
                                </label>

                                <label className={
                                    overlaySource === "buffer"
                                        ? "is-active"
                                        : undefined
                                }>
                                    <input
                                        type="radio"
                                        name="intersection-overlay"
                                        value="buffer"
                                        checked={overlaySource === "buffer"}
                                        disabled={!hasBuffer}
                                        onChange={() => {
                                            setOverlaySource("buffer");
                                            onClearFeedback();
                                        }}
                                    />
                                    <span>
                                        <strong>当前 Buffer</strong>
                                        <small>
                                            {hasBuffer
                                                ? "缓冲区可用"
                                                : "请先创建 Buffer"}
                                        </small>
                                    </span>
                                </label>
                            </div>

                            {!hasAoi && !hasBuffer && (
                                <p className="geoprocessing-hint">
                                    请先绘制 AOI 或为选中地块创建 Buffer。
                                </p>
                            )}
                        </>
                    )}

                    {operation === "dissolve" && (
                        <>
                            <span className="geoprocessing-field-label">
                                融合方式
                            </span>
                            <div className="geoprocessing-choice-list">
                                <label className={
                                    dissolveField === "all"
                                        ? "is-active"
                                        : undefined
                                }>
                                    <input
                                        type="radio"
                                        name="dissolve-field"
                                        value="all"
                                        checked={dissolveField === "all"}
                                        onChange={() => {
                                            setDissolveField("all");
                                            onClearFeedback();
                                        }}
                                    />
                                    <span>
                                        <strong>全部融合</strong>
                                        <small>Dissolve all</small>
                                    </span>
                                </label>

                                <label className={
                                    dissolveField === "landUseType"
                                        ? "is-active"
                                        : undefined
                                }>
                                    <input
                                        type="radio"
                                        name="dissolve-field"
                                        value="landUseType"
                                        checked={dissolveField === "landUseType"}
                                        onChange={() => {
                                            setDissolveField("landUseType");
                                            onClearFeedback();
                                        }}
                                    />
                                    <span>
                                        <strong>按用地类型融合</strong>
                                        <small>landUseType</small>
                                    </span>
                                </label>
                            </div>
                        </>
                    )}

                    {operation === "centroid" && (
                        <div className="geoprocessing-estimate">
                            <div>
                                <span>输入要素</span>
                                <strong>{selectedInputCount}</strong>
                            </div>
                            <div>
                                <span>预计生成</span>
                                <strong>{selectedInputCount} points</strong>
                            </div>
                        </div>
                    )}

                    <button
                        type="button"
                        className="geoprocessing-run-button"
                        disabled={!canRun}
                        onClick={handleRun}
                    >
                        <Play
                            size={14}
                            fill="currentColor"
                            aria-hidden="true"
                        />
                        {operation === "intersection"
                            ? "运行叠加分析"
                            : operation === "dissolve"
                                ? "运行融合"
                                : "生成中心点"}
                    </button>

                    {error && (
                        <p className="geoprocessing-error">
                            {error}
                        </p>
                    )}
                </section>

                {visibleSummary && (
                    <section className="geoprocessing-section geoprocessing-result">
                        <header>
                            <span>RESULT</span>
                            <h3>处理结果</h3>
                        </header>

                        <dl>
                            <div>
                                <dd>{visibleSummary.inputCount}</dd>
                                <dt>输入要素</dt>
                            </div>
                            <div>
                                <dd>{visibleSummary.outputCount}</dd>
                                <dt>生成要素</dt>
                            </div>
                            {visibleSummary.operation === "intersection" && (
                                <div>
                                    <dd>
                                        {(
                                            (visibleSummary.totalAreaM2 ?? 0) /
                                            1_000_000
                                        ).toLocaleString("zh-CN", {
                                            maximumFractionDigits: 3,
                                        })}
                                        <small> km²</small>
                                    </dd>
                                    <dt>覆盖面积</dt>
                                </div>
                            )}
                            {visibleSummary.operation === "dissolve" && (
                                <div>
                                    <dd>
                                        {Math.max(
                                            0,
                                            visibleSummary.inputCount -
                                            visibleSummary.outputCount,
                                        )}
                                    </dd>
                                    <dt>减少要素</dt>
                                </div>
                            )}
                        </dl>

                        <p>
                            已加入分析结果图层
                            {" · "}
                            {visibleSummary.elapsedMs.toFixed(0)} ms
                        </p>
                    </section>
                )}
            </div>
        </aside>
    );
}
