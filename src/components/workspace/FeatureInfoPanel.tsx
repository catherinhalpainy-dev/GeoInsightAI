// 要素信息板
import { useState } from "react";

import {
    LAND_USE_LABELS,
} from "../../constants/landUse";

import type {
    LandUseFeature,
} from "../../types/landUse";
import type {
    BufferAnalysisResult,
} from "../../types/analysis";


interface FeatureInfoPanelProps {
    feature: LandUseFeature;

    onClose: () => void;

    onCreateBuffer: (
        feature: LandUseFeature,
        distance: number,
    ) => void;

    bufferResult: BufferAnalysisResult | null;

    bufferError: string | null;
}


export function FeatureInfoPanel({
    feature,
    onClose,
    onCreateBuffer,
    bufferResult,
    bufferError,
}: FeatureInfoPanelProps) {
    const [bufferDistance, setBufferDistance] =
        useState("500");
    const [distanceError, setDistanceError] =
        useState<string | null>(null);

    const properties =
        feature.properties;

    const areaHa =
        properties.areaM2 / 10_000;

    function handleCreateBuffer() {
        const distance = Number(bufferDistance);

        if (!Number.isFinite(distance) || distance <= 0) {
            setDistanceError("请输入大于 0 的缓冲距离");
            return;
        }

        setDistanceError(null);
        onCreateBuffer(feature, distance);
    }

    return (
        <aside className="feature-info-panel">
            <header className="feature-info-header">
                <div>
                    <span>
                        SELECTED FEATURE
                    </span>

                    <h2>
                        要素信息
                    </h2>
                </div>

                <button
                    type="button"
                    aria-label="关闭要素信息"
                    onClick={onClose}
                >
                    ×
                </button>
            </header>


            <section className="feature-info-summary">
                <strong>
                    {
                        LAND_USE_LABELS[
                        properties.landUseType
                        ]
                    }
                </strong>

                <span>
                    {properties.id}
                </span>
            </section>


            <dl className="feature-info-list">
                <div>
                    <dt>
                        要素 ID
                    </dt>

                    <dd>
                        {properties.id}
                    </dd>
                </div>


                <div>
                    <dt>
                        用地类型
                    </dt>

                    <dd>
                        {
                            LAND_USE_LABELS[
                            properties.landUseType
                            ]
                        }
                    </dd>
                </div>


                <div>
                    <dt>
                        面积
                    </dt>

                    <dd>
                        {properties.areaM2.toLocaleString()}
                        {" m²"}
                    </dd>
                </div>


                <div>
                    <dt>
                        面积
                    </dt>

                    <dd>
                        {areaHa.toFixed(2)}
                        公顷
                    </dd>
                </div>


                <div>
                    <dt>
                        行政区代码
                    </dt>

                    <dd>
                        {properties.districtCode}
                    </dd>
                </div>


                <div>
                    <dt>
                        建成年份
                    </dt>

                    <dd>
                        {properties.builtYear ?? "未知"}
                    </dd>
                </div>


                <div>
                    <dt>
                        几何类型
                    </dt>

                    <dd>
                        {feature.geometry.type}
                    </dd>
                </div>
            </dl>

            <section className="feature-spatial-analysis">
                <header>
                    <span>SPATIAL ANALYSIS</span>
                    <h3>空间分析</h3>
                </header>

                <div className="feature-buffer-tool">
                    <strong>缓冲区分析</strong>

                    <label htmlFor="feature-buffer-distance">
                        距离
                    </label>

                    <div className="feature-buffer-input-row">
                        <input
                            id="feature-buffer-distance"
                            type="number"
                            min="1"
                            step="1"
                            value={bufferDistance}
                            onChange={(event) => {
                                setBufferDistance(event.target.value);
                                setDistanceError(null);
                            }}
                        />
                        <span>m</span>
                    </div>

                    {(distanceError || bufferError) && (
                        <p className="feature-buffer-error">
                            {distanceError ?? bufferError}
                        </p>
                    )}

                    <button
                        type="button"
                        className="feature-buffer-submit"
                        onClick={handleCreateBuffer}
                    >
                        生成缓冲区
                    </button>

                    {bufferResult && (
                        <dl className="feature-buffer-result">
                            <div>
                                <dt>缓冲距离</dt>
                                <dd>
                                    {bufferResult.distance.toLocaleString("zh-CN")} m
                                </dd>
                            </div>
                            <div>
                                <dt>缓冲面积</dt>
                                <dd>
                                    {bufferResult.areaM2.toLocaleString("zh-CN", {
                                        maximumFractionDigits: 0,
                                    })} m²
                                </dd>
                            </div>
                            <div>
                                <dt>面积（km²）</dt>
                                <dd>{bufferResult.areaKm2.toFixed(3)} km²</dd>
                            </div>
                        </dl>
                    )}
                </div>
            </section>
        </aside>
    );
}
