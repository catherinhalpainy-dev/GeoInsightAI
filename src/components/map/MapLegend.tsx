import {
    useState,
} from "react";
import {
    ChevronDown,
    ChevronUp,
} from "lucide-react";
import {
    LAND_USE_COLORS,
    LAND_USE_LABELS,
    LAND_USE_TYPES,
} from "../../constants/landUse";
import type {
    LayerStyle,
} from "../../types/layerStyle";

interface MapLegendProps {
    style: LayerStyle;
}

export function MapLegend({
    style,
}: MapLegendProps) {
    const [collapsed, setCollapsed] =
        useState(false);

    if (
        !style.layerVisible ||
        !style.fillVisible
    ) {
        return null;
    }

    const graduatedTitle =
        style.graduatedField === "areaM2"
            ? "面积（m²）"
            : "建成年份";

    return (
        <aside className="map-legend">
            <button
                type="button"
                className="map-legend-header"
                aria-expanded={!collapsed}
                aria-label={
                    collapsed
                        ? "展开地图图例"
                        : "折叠地图图例"
                }
                onClick={() => {
                    setCollapsed((previous) => !previous);
                }}
            >
                <span>
                    <small>LEGEND</small>
                    <strong>图例</strong>
                </span>
                {collapsed
                    ? <ChevronUp size={14} />
                    : <ChevronDown size={14} />}
            </button>

            {!collapsed && (
                <div className="map-legend-content">
                    {style.symbologyMode === "single" && (
                        <>
                            <p>单一符号</p>
                            <ul>
                                <li>
                                    <span
                                        className="map-legend-swatch"
                                        style={{
                                            backgroundColor:
                                                style.fillColor,
                                        }}
                                    />
                                    <span>土地利用地块</span>
                                </li>
                            </ul>
                        </>
                    )}

                    {style.symbologyMode === "categorized" && (
                        <>
                            <p>用地类型</p>
                            <ul>
                                {LAND_USE_TYPES.map((type) => (
                                    <li key={type}>
                                        <span
                                            className="map-legend-swatch"
                                            style={{
                                                backgroundColor:
                                                    LAND_USE_COLORS[type],
                                            }}
                                        />
                                        <span>
                                            {LAND_USE_LABELS[type]}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        </>
                    )}

                    {style.symbologyMode === "graduated" && (
                        <>
                            <p>{graduatedTitle}</p>
                            {style.graduatedClasses.length > 0 ? (
                                <ul>
                                    {style.graduatedClasses.map(
                                        (item, index) => (
                                            <li
                                                key={`${item.min}-${item.max}-${index}`}
                                            >
                                                <span
                                                    className="map-legend-swatch"
                                                    style={{
                                                        backgroundColor:
                                                            item.color,
                                                    }}
                                                />
                                                <span>{item.label}</span>
                                            </li>
                                        ),
                                    )}
                                </ul>
                            ) : (
                                <span className="map-legend-empty">
                                    当前筛选结果无有效数值
                                </span>
                            )}
                        </>
                    )}
                </div>
            )}
        </aside>
    );
}
