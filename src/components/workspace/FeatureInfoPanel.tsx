// 要素信息板
import {
    LAND_USE_LABELS,
} from "../../constants/landUse";

import type {
    LandUseFeature,
} from "../../types/landUse";


interface FeatureInfoPanelProps {
    feature: LandUseFeature;

    onClose: () => void;
}


export function FeatureInfoPanel({
    feature,
    onClose,
}: FeatureInfoPanelProps) {
    const properties =
        feature.properties;

    const areaHa =
        properties.areaM2 / 10_000;

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
        </aside>
    );
}