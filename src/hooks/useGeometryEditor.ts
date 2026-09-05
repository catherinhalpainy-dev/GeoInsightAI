import {
    useState,
} from "react";

import {
    getOpenOuterRing,
} from "../services/gis/geometryEditing";
import type {
    GeometryEditorMode,
} from "../types/geometryEditing";
import type {
    LandUseFeature,
    Position,
} from "../types/landUse";

const DUPLICATE_POINT_TOLERANCE = 1e-10;

function positionsEqual(first: Position, second: Position) {
    return Math.abs(first[0] - second[0]) <= DUPLICATE_POINT_TOLERANCE &&
        Math.abs(first[1] - second[1]) <= DUPLICATE_POINT_TOLERANCE;
}

export function useGeometryEditor() {
    const [mode, setMode] = useState<GeometryEditorMode>("idle");
    const [draftCoordinates, setDraftCoordinates] = useState<Position[]>([]);
    const [editingFeatureId, setEditingFeatureId] = useState<string | null>(null);
    const [activeVertexIndex, setActiveVertexIndex] = useState<number | null>(null);
    const [snappingEnabled, setSnappingEnabled] = useState(true);

    function startCreate() {
        setMode("drawing");
        setDraftCoordinates([]);
        setEditingFeatureId(null);
        setActiveVertexIndex(null);
    }

    function startEdit(feature: LandUseFeature) {
        setMode("editing");
        setDraftCoordinates(getOpenOuterRing(feature.geometry));
        setEditingFeatureId(feature.properties.id);
        setActiveVertexIndex(null);
    }

    function addVertex(coordinate: Position) {
        setDraftCoordinates((previous) => {
            if (mode !== "drawing") {
                return previous;
            }

            const last = previous.at(-1);

            return last && positionsEqual(last, coordinate)
                ? previous
                : [...previous, [...coordinate]];
        });
    }

    function moveVertex(index: number, coordinate: Position) {
        setDraftCoordinates((previous) => previous.map(
            (current, currentIndex) => currentIndex === index
                ? [...coordinate]
                : current,
        ));
    }

    function completeDrawing() {
        const distinctCount = draftCoordinates.filter(
            (coordinate, index) => draftCoordinates.findIndex(
                (candidate) => positionsEqual(candidate, coordinate),
            ) === index,
        ).length;

        if (mode !== "drawing" || distinctCount < 3) {
            return false;
        }

        setMode("creating");
        setActiveVertexIndex(null);
        return true;
    }

    function deleteActiveVertex() {
        if (
            activeVertexIndex === null ||
            draftCoordinates.length <= 3
        ) {
            return;
        }

        setDraftCoordinates((previous) => previous.filter(
            (_, index) => index !== activeVertexIndex,
        ));
        setActiveVertexIndex(null);
    }

    function reset() {
        setMode("idle");
        setDraftCoordinates([]);
        setEditingFeatureId(null);
        setActiveVertexIndex(null);
    }

    return {
        mode,
        draftCoordinates,
        editingFeatureId,
        activeVertexIndex,
        snappingEnabled,
        startCreate,
        startEdit,
        addVertex,
        moveVertex,
        completeDrawing,
        setActiveVertex: setActiveVertexIndex,
        deleteActiveVertex,
        cancel: reset,
        reset,
        toggleSnapping: () => setSnappingEnabled((previous) => !previous),
    };
}
