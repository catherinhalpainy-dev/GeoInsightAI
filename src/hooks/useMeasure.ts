import { useState } from "react";

import type { MeasureMode } from "../types/measure";
import {
    calculateArea,
    calculateDistance,
} from "../utils/measure";

const DUPLICATE_POINT_TOLERANCE = 1e-8;

function isSamePoint(
    first: [number, number],
    second: [number, number],
) {
    return Math.abs(first[0] - second[0]) < DUPLICATE_POINT_TOLERANCE &&
        Math.abs(first[1] - second[1]) < DUPLICATE_POINT_TOLERANCE;
}

export function useMeasure() {
    const [mode, setMode] = useState<MeasureMode>("none");
    const [points, setPoints] = useState<[number, number][]>([]);
    const [isComplete, setIsComplete] = useState(false);

    function start(nextMode: MeasureMode) {
        setMode(nextMode);
        setPoints([]);
        setIsComplete(false);
    }

    function addPoint(point: [number, number]) {
        if (isComplete || mode === "none") {
            return;
        }

        setPoints((previous) => {
            const lastPoint = previous.at(-1);

            if (lastPoint && isSamePoint(lastPoint, point)) {
                return previous;
            }

            return [...previous, point];
        });
    }

    function complete() {
        const minimumPoints = mode === "area" ? 3 : 2;

        if (mode === "none") {
            return;
        }

        setPoints((currentPoints) => {
            if (currentPoints.length >= minimumPoints) {
                setIsComplete(true);
            }

            return currentPoints;
        });
    }

    function restart() {
        setPoints([]);
        setIsComplete(false);
    }

    function clear() {
        setMode("none");
        setPoints([]);
        setIsComplete(false);
    }

    const result =
        mode === "distance" && points.length >= 2
            ? calculateDistance(points)
            : mode === "area" && points.length >= 3
                ? calculateArea(points)
                : null;

    return {
        mode,
        points,
        isComplete,
        result,
        start,
        addPoint,
        complete,
        restart,
        clear,
    };
}
