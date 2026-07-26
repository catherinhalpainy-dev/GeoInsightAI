// 数据导入界面

import { useNavigate } from "react-router-dom";
import { useAppContext } from "../app/AppProvider";
import { inspectLandUseDataset } from "../app/inspectLandUseDataset";
import { MockLandUseDataset } from "../data/mockLandUse";
import { LAND_USE_LABELS } from "../constants/landUse";

export function DataImportPage() {
    const navigate = useNavigate();
    const { state, dispatch } = useAppContext();

    const dataset = state.dataset;

    const inspection = dataset
        ? inspectLandUseDataset(dataset)
        : null;

    function handleLoadExample() {
        dispatch({
            type: "PREVIEW_DATASET",
            payload: MockLandUseDataset,
        });
    }
    function handleLoadToMap() {
        if (!dataset) {
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
                    当前阶段先加载内置城市用地 GeoJSON，
                    完成数据检查、属性预览和跨页面共享。
                </p>
            </header>
            <section className="import-actions">
                <button type="button" onClick={handleLoadExample}>加载示例数据</button>
                <button type="button" onClick={handleLoadToMap} disabled={!dataset}>加载到地图</button>
            </section>
            {!dataset && (
                <section className="import-empty-state">
                    <h2>尚未选择数据</h2>
                    <p>
                        点击“加载示例数据”，预览城市用地 Polygon
                        GeoJSON。
                    </p>
                </section>
            )
            }
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
                                {inspection.invalidAreaCount === 0
                                    ? "已通过基础面积校验"
                                    : `发现 ${inspection.invalidAreaCount} 条无效面积`}
                            </span>

                            <button
                                type="button"
                                onClick={handleLoadToMap}
                            >
                                加载到地图
                            </button>
                            <button
                                type="button"
                                onClick={handleClearDataset}
                            >
                                清除数据
                            </button>
                        </footer>
                    </section>
                </>
            )}


        </section>
    );
}
