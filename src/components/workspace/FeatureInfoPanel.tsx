// 要素信息板
import {
    Pencil,
    Trash2,
} from "lucide-react";
import { useState } from "react";

import {
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";

import type {
    LandUseFeature,
} from "../../types/landUse";
import type {
    BufferAnalysisResult,
    SpatialQueryResult,
} from "../../types/analysis";


interface FeatureInfoPanelProps {
    feature: LandUseFeature;

    onClose: () => void;

    onCreateBuffer: (
        feature: LandUseFeature,
        distance: number,
    ) => void;

    onClearBuffer: () => void;

    bufferResult: BufferAnalysisResult | null;

    bufferError: string | null;

    spatialQueryResult: SpatialQueryResult | null;

    spatialQueryError: string | null;

    onRunSpatialQuery: () => void;

    onClearSpatialQuery: () => void;

    onEditGeometry: (feature: LandUseFeature) => void;

    onDeleteFeature: (feature: LandUseFeature) => void;
}


export function FeatureInfoPanel({
    feature,
    onClose,
    onCreateBuffer,
    onClearBuffer,
    bufferResult,
    bufferError,
    spatialQueryResult,
    spatialQueryError,
    onRunSpatialQuery,
    onClearSpatialQuery,
    onEditGeometry,
    onDeleteFeature,
}: FeatureInfoPanelProps) {
    const [bufferDistance, setBufferDistance] =
        useState("500");
    const [distanceError, setDistanceError] =
        useState<string | null>(null);

    const properties =
        feature.properties;

    const areaHa =
        properties.areaM2 / 10_000;

    const spatialQueryTypeEntries =
        spatialQueryResult
            ? LAND_USE_TYPES
                .filter(
                    (landUseType) =>
                        spatialQueryResult.typeCounts[landUseType] > 0,
                )
                .map((landUseType) => ({
                    landUseType,
                    count: spatialQueryResult.typeCounts[landUseType],
                }))
            : [];

    const maximumSpatialQueryTypeCount =
        Math.max(
            1,
            ...spatialQueryTypeEntries.map(
                (entry) => entry.count,
            ),
        );

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

            <section className="feature-geometry-actions">
                <span>GEOMETRY</span>
                <div>
                    <button type="button" onClick={() => onEditGeometry(feature)}>
                        <Pencil size={13} />编辑几何
                    </button>
                    <button
                        type="button"
                        className="feature-geometry-delete"
                        onClick={() => onDeleteFeature(feature)}
                    >
                        <Trash2 size={13} />删除
                    </button>
                </div>
            </section>

            <section className="feature-spatial-analysis">
                <header>
                    <span>SPATIAL ANALYSIS</span>
                    <h3>空间分析</h3>
                </header>

                <div className="feature-buffer-tool">
                    <header className="feature-analysis-section-header">
                        <div>
                            <span>BUFFER</span>
                            <h4>缓冲区分析</h4>
                        </div>
                    </header>

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
                        <>
                            <dl className="feature-buffer-result">
                                <div>
                                    <dt>缓冲距离</dt>
                                    <dd>
                                        <strong>
                                            {bufferResult.distance.toLocaleString("zh-CN")} m
                                        </strong>
                                    </dd>
                                </div>
                                <div>
                                    <dt>缓冲面积</dt>
                                    <dd>
                                        <strong>{bufferResult.areaKm2.toFixed(3)} km²</strong>
                                        <span>
                                            {bufferResult.areaM2.toLocaleString("zh-CN", {
                                                maximumFractionDigits: 0,
                                            })} m²
                                        </span>
                                    </dd>
                                </div>
                            </dl>

                            <section className="feature-location-query">
                                <header className="feature-analysis-section-header">
                                    <div>
                                        <span>SELECT BY LOCATION</span>
                                        <h4>范围查询</h4>
                                    </div>

                                    <span className="feature-relation-badge">
                                        Intersects
                                    </span>
                                </header>

                                {!spatialQueryResult && (
                                    <button
                                        type="button"
                                        className="feature-spatial-query-submit"
                                        onClick={onRunSpatialQuery}
                                    >
                                        查询范围内地块
                                    </button>
                                )}

                                {spatialQueryError && (
                                    <p className="feature-buffer-error">
                                        {spatialQueryError}
                                    </p>
                                )}

                                {spatialQueryResult && (
                                    <section className="feature-spatial-query-result">
                                        <header>
                                            <strong>查询结果</strong>
                                            <span>
                                                {spatialQueryResult.featureCount.toLocaleString("zh-CN")}
                                                {" 个要素"}
                                            </span>
                                        </header>

                                        <dl className="feature-spatial-query-metrics">
                                            <div>
                                                <dd>
                                                    {spatialQueryResult.featureCount.toLocaleString("zh-CN")}
                                                </dd>
                                                <dt>命中地块</dt>
                                            </div>
                                            <div>
                                                <dd>
                                                    {spatialQueryResult.totalAreaM2.toLocaleString("zh-CN", {
                                                        maximumFractionDigits: 0,
                                                    })}
                                                    <span> m²</span>
                                                </dd>
                                                <dt>总面积</dt>
                                            </div>
                                        </dl>

                                        <div className="feature-spatial-query-types">
                                            <strong>分类分布</strong>

                                            {spatialQueryTypeEntries.length > 0 ? (
                                                <ul>
                                                    {spatialQueryTypeEntries.map((entry) => (
                                                        <li key={entry.landUseType}>
                                                            <div>
                                                                <span>
                                                                    {LAND_USE_LABELS[entry.landUseType]}
                                                                </span>
                                                                <strong>{entry.count}</strong>
                                                            </div>
                                                            <span className="feature-distribution-track">
                                                                <span
                                                                    style={{
                                                                        width: `${entry.count / maximumSpatialQueryTypeCount * 100}%`,
                                                                    }}
                                                                />
                                                            </span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            ) : (
                                                <p>暂无命中分类</p>
                                            )}
                                        </div>

                                        <div className="feature-spatial-query-actions">
                                            <button
                                                type="button"
                                                onClick={onRunSpatialQuery}
                                            >
                                                重新查询
                                            </button>
                                            <button
                                                type="button"
                                                onClick={onClearSpatialQuery}
                                            >
                                                清除查询结果
                                            </button>
                                        </div>
                                    </section>
                                )}

                                <button
                                    type="button"
                                    className="feature-analysis-secondary"
                                    onClick={onClearBuffer}
                                >
                                    清除缓冲区
                                </button>
                            </section>
                        </>
                    )}
                </div>
            </section>
        </aside>
    );
}
