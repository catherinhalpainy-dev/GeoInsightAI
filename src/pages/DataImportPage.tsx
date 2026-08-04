// 数据导入界面

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { inspectLandUseDataset } from "../app/inspectLandUseDataset";
import { MockLandUseDataset } from "../data/mockLandUse";
import { LAND_USE_LABELS } from "../constants/landUse";
import type { ChangeEvent } from "react";
import { parseLandUseGeoJson } from "../utils/parseLandUseGeoJson";


const MAX_FILE_SIZE_BYTES =
    10 * 1024 * 1024;

export function DataImportPage() {

    const navigate = useNavigate();
    const { state, dispatch } = useAppContext();

    const dataset = state.dataset;

    const inspection = dataset
        ? inspectLandUseDataset(dataset)
        : null;

    const isImporting =
        state.importStatus === "reading" ||
        state.importStatus === "validating";
    async function handleFileChange(
        event: ChangeEvent<HTMLInputElement>,
    ) {
        const inputElement = event.currentTarget;
        const file = inputElement.files?.[0];

        if (!file) {
            return;
        }
        if (file.size > MAX_FILE_SIZE_BYTES) {
            dispatch({
                type: "IMPORT_ERROR",
                payload:
                    "当前版本仅支持 10 MB 以内的 GeoJSON 文件",
            });

            inputElement.value = "";
            return;
        }
        const lowerCaseFileName =
            file.name.toLowerCase();

        const isSupportedExtension =
            lowerCaseFileName.endsWith(".geojson") ||
            lowerCaseFileName.endsWith(".json");

        if (!isSupportedExtension) {
            dispatch({
                type: "IMPORT_ERROR",
                payload:
                    "文件扩展名必须是 .geojson 或 .json",
            });

            inputElement.value = "";
            return;
        }

        dispatch({
            type: "START_FILE_IMPORT",
        });

        try {

            const text = await file.text();

            if (text.trim() === "") {
                dispatch({
                    type: "IMPORT_ERROR",
                    payload: "文件内容为空",
                });

                return;
            }

            dispatch({
                type: "VALIDATE_FILE",
            });

            let parsedValue: unknown;

            try {
                parsedValue = JSON.parse(text);
            } catch {
                dispatch({
                    type: "IMPORT_ERROR",
                    payload:
                        "文件不是合法 JSON，请检查括号、逗号和引号",
                });

                return;
            }

            const result = parseLandUseGeoJson(
                parsedValue,
                file.name,
            );

            if (!result.ok) {
                dispatch({
                    type: "IMPORT_ERROR",
                    payload: result.errors.join("；"),
                });

                return;
            }

            dispatch({
                type: "PREVIEW_DATASET",
                payload: {
                    dataset: result.dataset,
                    warnings: result.warnings,
                },
            });
        } catch (error: unknown) {
            const errorMessage =
                error instanceof Error
                    ? error.message
                    : "读取文件时发生未知错误";

            dispatch({
                type: "IMPORT_ERROR",
                payload: errorMessage,
            });
        } finally {
            // 允许用户再次选择同一个文件
            inputElement.value = "";
        }
    }
    function handleLoadExample() {
        dispatch({
            type: "PREVIEW_DATASET",
            payload: {
                dataset: MockLandUseDataset,
                warnings: [],
            },
        });
    }

    const canLoadToMap = dataset !== null && state.importStatus === "preview";
    function handleLoadToMap() {
        if (!canLoadToMap) {
            return;
        }

        dispatch({
            type: "LOAD_DATASET",
        });

        navigate("/workspace");
    }

    function handleClearDataset() {
        dispatch({
            type: "CLEAR_DATASET",
        });
    }

    // value ?? []  只有左侧为null或undefined时才使用右侧默认值
    const previewFeatures =
        dataset?.collection.features.slice(0, 5) ?? [];

    return (
        <section className="page-content">
            <header className="page-header">
                <h1>数据导入</h1>
                <p>
    导入城市用地 Polygon GeoJSON，
    系统将检查数据结构、属性字段和基础数据质量，
    通过后可预览并加载到地图工作台。
</p>
            </header>
            <section className="file-import-section">
                <div>
                    <h2>选择本地 GeoJSON</h2>
                    <p>
                        当前仅支持 EPSG:4326、
                        Polygon FeatureCollection。
                    </p>
                </div>

                <label
                    className="file-select-button"
                    htmlFor="land-use-file"
                >
                    {isImporting
                        ? "正在处理..."
                        : "选择 GeoJSON 文件"}
                </label>

                <input
                    id="land-use-file"
                    className="file-input"
                    type="file"
                    accept=".geojson,.json,application/geo+json,application/json"
                    onChange={handleFileChange}
                    disabled={isImporting}
                />
            </section>
            {state.importStatus === "reading" && (
                <p role="status">
                    正在读取文件内容……
                </p>
            )}

            {state.importStatus === "validating" && (
                <p role="status">
                    正在校验 GeoJSON 结构和属性……
                </p>
            )}



            {state.importWarnings.length > 0 && (
                <section className="import-warning">
                    <h2>数据警告</h2>

                    <p>
                        有效要素已经保留，以下无效要素已跳过：
                    </p>

                    <ul>
                        {state.importWarnings.map(
                            (warning, index) => (
                                <li key={`${index}-${warning}`}>
                                    {warning}
                                </li>
                            ),
                        )}
                    </ul>
                </section>
            )}
            <section className="import-actions">
                <button type="button" onClick={handleLoadExample}>加载示例数据</button>
                <button type="button" onClick={handleLoadToMap} disabled={!canLoadToMap}>加载到地图</button>
            </section>
            {state.importStatus === "idle" && !dataset && (
                <section className="import-empty-state">
                    <h2>尚未选择数据</h2>
                    <p>
                        请选择本地 GeoJSON，
                        或加载内置城市用地示例数据。
                    </p>
                </section>
            )}
            {dataset && inspection && (
                <>
                    <section className="dataset-summary">
                        <div>
                            <span>数据集名称</span>
                            <strong>{dataset.name}</strong>
                        </div>

                        <div>
                            <span>源数据坐标系</span>
                            <strong>{dataset.sourceCrs}</strong>
                        </div>
                    </section>

                    <section className="inspection-section">
                        <h2>数据质量摘要</h2>

                        <div className="inspection-grid">
                            <article className="inspection-card">
                                <span>要素数量</span>
                                <strong>{inspection.featureCount}</strong>
                            </article>

                            <article className="inspection-card">
                                <span>字段数量</span>
                                <strong>{inspection.fieldCount}</strong>
                            </article>

                            <article className="inspection-card">
                                <span>用地类型</span>
                                <strong>{inspection.landUseTypeCount}</strong>
                            </article>

                            <article className="inspection-card">
                                <span>行政区划</span>
                                <strong>{inspection.districtCount}</strong>
                            </article>

                            <article className="inspection-card">
                                <span>缺失建成年份</span>
                                <strong>
                                    {inspection.missingBuiltYearCount}
                                </strong>
                            </article>

                            <article className="inspection-card">
                                <span>无效面积</span>
                                <strong>{inspection.invalidAreaCount}</strong>
                            </article>
                        </div>
                    </section>

                    <section className="preview-section">
                        <div className="preview-heading">
                            <div>
                                <h2>属性预览</h2>
                                <p>最多显示前 5 条记录。</p>
                            </div>

                            <span>
                                共 {dataset.collection.features.length} 条
                            </span>
                        </div>

                        <div className="table-wrapper">
                            <table className="preview-table">
                                <thead>
                                    <tr>
                                        <th>要素编号</th>
                                        <th>用地类型</th>
                                        <th>面积（m²）</th>
                                        <th>区划代码</th>
                                        <th>建成年份</th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {previewFeatures.map((feature) => (
                                        <tr key={feature.properties.id}>
                                            <td>{feature.properties.id}</td>

                                            <td>
                                                {
                                                    LAND_USE_LABELS[
                                                    feature.properties.landUseType
                                                    ]
                                                }
                                            </td>

                                            <td>
                                                {feature.properties.areaM2.toLocaleString()}
                                            </td>

                                            <td>
                                                {feature.properties.districtCode}
                                            </td>

                                            <td>
                                                {feature.properties.builtYear ??
                                                    "缺失"}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        <footer className="preview-footer">
    <span>
        当前有效要素：
        {dataset.collection.features.length} 条
    </span>

    <div className="preview-actions">
        <button
            type="button"
            onClick={handleClearDataset}
        >
            清除数据
        </button>

        <button
            type="button"
            onClick={handleLoadToMap}
            disabled={!canLoadToMap}
        >
            加载到地图
        </button>
    </div>
</footer>
                    </section>
                </>
            )}


        </section>
    );
}
