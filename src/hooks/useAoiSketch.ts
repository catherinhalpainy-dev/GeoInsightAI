import {
    useMemo,
    useState,
} from "react";

import type {
    AoiFeature,
    AoiSketchMode,
} from "../types/analysis";
import type {
    Position,
} from "../types/landUse";

const DUPLICATE_POINT_TOLERANCE = 1e-8;

function isSamePoint(
    first: Position,
    second: Position,
) {
    return Math.abs(first[0] - second[0]) <
        DUPLICATE_POINT_TOLERANCE &&
        Math.abs(first[1] - second[1]) <
        DUPLICATE_POINT_TOLERANCE;
}

export function useAoiSketch() {
    const [mode, setMode] =
        useState<AoiSketchMode>("idle");
    const [points, setPoints] =
        useState<Position[]>([]);

    function start() {
        setMode("drawing");
        setPoints([]);
    }

    function addPoint(point: Position) {
        if (mode !== "drawing") {
            return;
        }

        setPoints((previous) => {
            const lastPoint = previous.at(-1);

            if (
                lastPoint &&
                isSamePoint(lastPoint, point)
            ) {
                return previous;
            }

            return [
                ...previous,
                point,
            ];
        });
    }

    function complete() {
        setPoints((currentPoints) => {
            if (currentPoints.length >= 3) {
                setMode("completed");
            }

            return currentPoints;
        });
    }

    function restart() {
        setMode("drawing");
        setPoints([]);
    }

    function clear() {
        setMode("idle");
        setPoints([]);
    }

    const polygon = useMemo<AoiFeature | null>(
        () => {
            if (
                mode !== "completed" ||
                points.length < 3
            ) {
                return null;
            }

            return {
                type: "Feature",
                properties: {},
                geometry: {
                    type: "Polygon",
                    coordinates: [[
                        ...points,
                        points[0],
                    ]],
                },
            };
        },
        [mode, points],
    );

    return {
        mode,
        points,
        polygon,
        start,
        addPoint,
        complete,
        restart,
        clear,
    };
}
