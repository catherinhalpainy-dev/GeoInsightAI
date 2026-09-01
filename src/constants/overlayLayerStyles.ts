import type {
    OverlayLayerStyle,
    VectorGeometryKind,
} from "../types/mapLayer";

export const OVERLAY_LAYER_PALETTE = [
    "#2563eb",
    "#7c3aed",
    "#0f766e",
    "#c2410c",
    "#be123c",
] as const;

function getDefaultOpacity(
    geometryKind: VectorGeometryKind,
) {
    switch (geometryKind) {
        case "polygon":
            return 0.22;

        case "mixed":
            return 0.55;

        case "line":
        case "point":
            return 0.85;
    }
}

export function createDefaultOverlayLayerStyle(
    paletteIndex: number,
    geometryKind: VectorGeometryKind,
): OverlayLayerStyle {
    const normalizedIndex = Math.max(
        0,
        Math.floor(paletteIndex),
    );
    const color = OVERLAY_LAYER_PALETTE[
        normalizedIndex % OVERLAY_LAYER_PALETTE.length
    ];

    return {
        visible: true,
        opacity: getDefaultOpacity(geometryKind),
        fillColor: color,
        lineColor: color,
        pointColor: color,
        lineWidth: 2,
        pointRadius: 5,
    };
}
