import { useEffect, useRef } from "react";
import {
    LAND_USE_LABELS,
} from "../../constants/landUse";

import type {
    LandUseFeature,
} from "../../types/landUse";


interface FeatureTablePanelProps {
    features:
    LandUseFeature[];

    selectedFeatureId?:
    string | null;

    onFeatureSelect: (
        feature:
            LandUseFeature,
    ) => void;

    onClose:
    () => void;

    onExport:
    () => void;
}


export function FeatureTablePanel({
    features,
    selectedFeatureId = null,
    onFeatureSelect,
    onClose,
    onExport,
}: FeatureTablePanelProps) {
    const selectedRowRef =
        useRef<HTMLTableRowElement | null>(
            null,
        );
    useEffect(() => {
        selectedRowRef.current
            ?.scrollIntoView({
                block:
                    "nearest",

                behavior:
                    "smooth",
            });
    }, [
        selectedFeatureId,
    ]);
    return (
        <aside className="feature-table-panel">
            <header className="feature-table-header">
                <div>
                    <span>
                        ATTRIBUTE TABLE
                    </span>

                    <h2>
                        属性表
                    </h2>
                </div>


                <button
                    type="button"
                    aria-label="关闭属性表"
                    onClick={
                        onClose
                    }
                >
                    ×
                </button>
            </header>


            <div className="feature-table-toolbar">
                <span>
                    当前结果：
                    {features.length}
                    {" "}
                    条
                </span>


                <button
                    type="button"
                    disabled={
                        features.length === 0
                    }
                    onClick={
                        onExport
                    }
                >
                    导出 GeoJSON
                </button>
            </div>


            <div className="feature-table-scroll">
                <div className="feature-table-container">

                    <table className="feature-table">
                        <thead>
                            <tr>
                                <th>
                                    ID
                                </th>

                                <th>
                                    用地类型
                                </th>

                                <th>
                                    面积
                                </th>

                                <th>
                                    行政区
                                </th>

                                <th>
                                    建成年份
                                </th>
                            </tr>
                        </thead>


                        <tbody>
                            {features.map(
                                (feature) => {
                                    const properties =
                                        feature.properties;

                                    const selected =
                                        properties.id ===
                                        selectedFeatureId;


                                    return (
                                        <tr
                                            key={
                                                properties.id
                                            }

                                            ref={
                                                selected
                                                    ? selectedRowRef
                                                    : undefined
                                            }

                                            className={
                                                selected
                                                    ? "is-selected"
                                                    : ""
                                            }

                                            onClick={() => {
                                                onFeatureSelect(
                                                    feature,
                                                );
                                            }}
                                        >
                                            <td>
                                                {
                                                    properties.id
                                                }
                                            </td>

                                            <td>
                                                {
                                                    LAND_USE_LABELS[
                                                    properties
                                                        .landUseType
                                                    ]
                                                }
                                            </td>

                                            <td>
                                                {
                                                    properties.areaM2
                                                        .toLocaleString()
                                                }
                                                {" m²"}
                                            </td>

                                            <td>
                                                {
                                                    properties
                                                        .districtCode
                                                }
                                            </td>

                                            <td>
                                                {
                                                    properties
                                                        .builtYear ??
                                                    "未知"
                                                }
                                            </td>
                                        </tr>
                                    );
                                },
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </aside>
    );
}