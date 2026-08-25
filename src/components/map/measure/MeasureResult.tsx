import { useState } from "react";
import {
    CheckCircle2,
    MapPinned,
    MousePointer2,
    Ruler,
    SquareDashed,
} from "lucide-react";

import type { MeasureMode } from "../../../types/measure";
import { calculateDistance } from "../../../utils/measure";
import { MeasureStatItem } from "./MeasureStatItem";
import { MeasureToolbar } from "./MeasureToolbar";
import "./measure.css";

type AreaUnit = "m²" | "ha" | "km²";

interface MeasureResultProps {
    mode: MeasureMode;
    points: [number, number][];
    value: number | null;
    isComplete: boolean;
    onRestart: () => void;
    onClear: () => void;
}

function formatNumber(value: number, maximumFractionDigits = 2) {
    return value.toLocaleString("zh-CN", {
        maximumFractionDigits,
        minimumFractionDigits: value < 10 ? 2 : 0,
    });
}

function formatCoordinate(point: [number, number] | undefined) {
    return point
        ? `${point[0].toFixed(6)}, ${point[1].toFixed(6)}`
        : "—";
}

function convertArea(valueKm2: number, unit: AreaUnit) {
    if (unit === "m²") {
        return valueKm2 * 1_000_000;
    }

    if (unit === "ha") {
        return valueKm2 * 100;
    }

    return valueKm2;
}

export function MeasureResult({
    mode,
    points,
    value,
    isComplete,
    onRestart,
    onClear,
}: MeasureResultProps) {
    const [areaUnit, setAreaUnit] = useState<AreaUnit>("km²");

    if (mode === "none") {
        return null;
    }

    const isArea = mode === "area";
    const Icon = isArea ? SquareDashed : Ruler;
    const perimeter = isArea && points.length >= 3
        ? calculateDistance([...points, points[0]])
        : null;
    const mainValue = value === null
        ? "—"
        : isArea
            ? formatNumber(convertArea(value, areaUnit))
            : formatNumber(value, 3);

    return (
        <aside className="measure-panel" aria-label={isArea ? "面积测量结果" : "距离测量结果"}>
            <header className="measure-panel-header">
                <div className="measure-title-icon">
                    <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
                </div>
                <div className="measure-title-group">
                    <h2>{isArea ? "面积测量" : "距离测量"}</h2>
                    <span>{isArea ? "Polygon" : "LineString"} · EPSG:4326</span>
                </div>
                <div className={isComplete ? "measure-status is-complete" : "measure-status"}>
                    {isComplete
                        ? <CheckCircle2 size={14} aria-hidden="true" />
                        : <span className="measure-status-dot" />}
                    {isComplete ? "测量完成" : "正在测量"}
                </div>
            </header>

            {!isComplete && (
                <div className="measure-guidance">
                    <MousePointer2 size={16} aria-hidden="true" />
                    <span>点击地图添加节点，双击完成测量</span>
                </div>
            )}

            <section className="measure-main-value">
                <div className="measure-main-label">
                    {isArea ? "面积" : "距离"}
                    {isArea && (
                        <div className="measure-unit-switch" aria-label="面积单位">
                            {(["m²", "ha", "km²"] as AreaUnit[]).map((unit) => (
                                <button
                                    key={unit}
                                    type="button"
                                    className={areaUnit === unit ? "is-active" : ""}
                                    onClick={() => setAreaUnit(unit)}
                                >
                                    {unit}
                                </button>
                            ))}
                        </div>
                    )}
                </div>
                <div className="measure-main-number">
                    <strong>{mainValue}</strong>
                    <span>{isArea ? areaUnit : "km"}</span>
                </div>
            </section>

            <section className="measure-stat-grid">
                <MeasureStatItem
                    label="测量类型"
                    value={isArea ? "Polygon" : "Polyline"}
                />
                <MeasureStatItem label="节点" value={`${points.length}`} />
                {isArea ? (
                    <MeasureStatItem
                        label="周长"
                        value={perimeter === null ? "—" : `${formatNumber(perimeter, 3)} km`}
                    />
                ) : (
                    <>
                        <MeasureStatItem
                            label="起点"
                            value={formatCoordinate(points[0])}
                            wide
                        />
                        <MeasureStatItem
                            label="终点"
                            value={formatCoordinate(points.at(-1))}
                            wide
                        />
                    </>
                )}
                <MeasureStatItem
                    icon={<MapPinned size={13} aria-hidden="true" />}
                    label="坐标系"
                    value="EPSG:4326"
                />
            </section>

            <MeasureToolbar onRestart={onRestart} onClear={onClear} />
        </aside>
    );
}
