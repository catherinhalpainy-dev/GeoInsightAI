import type {
    GeoJsonProperties,
    Position,
} from "geojson";

import {
    createDefaultOverlayLayerStyle,
} from "../../constants/overlayLayerStyles";
import type {
    OverlayFeature,
    OverlayGeometry,
    VectorGeometryKind,
    WorkspaceVectorLayer,
} from "../../types/mapLayer";

const SUPPORTED_GEOMETRY_TYPES = new Set([
    "Point",
    "MultiPoint",
    "LineString",
    "MultiLineString",
    "Polygon",
    "MultiPolygon",
]);

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" &&
        value !== null &&
        !Array.isArray(value);
}

function isPosition(
    value: unknown,
): value is Position {
    if (
        !Array.isArray(value) ||
        value.length < 2 ||
        !value.every(
            (coordinate) =>
                typeof coordinate === "number" &&
                Number.isFinite(coordinate),
        )
    ) {
        return false;
    }

    const [longitude, latitude] = value;

    return longitude >= -180 &&
        longitude <= 180 &&
        latitude >= -90 &&
        latitude <= 90;
}

function isLineCoordinates(
    value: unknown,
): value is Position[] {
    return Array.isArray(value) &&
        value.length >= 2 &&
        value.every(isPosition);
}

function isLinearRing(
    value: unknown,
): value is Position[] {
    if (
        !Array.isArray(value) ||
        value.length < 4 ||
        !value.every(isPosition)
    ) {
        return false;
    }

    const first = value[0];
    const last = value[value.length - 1];

    return first[0] === last[0] &&
        first[1] === last[1];
}

function isPolygonCoordinates(
    value: unknown,
): value is Position[][] {
    return Array.isArray(value) &&
        value.length > 0 &&
        value.every(isLinearRing);
}

function isSupportedGeometry(
    value: unknown,
): value is OverlayGeometry {
    if (
        !isRecord(value) ||
        typeof value.type !== "string" ||
        !SUPPORTED_GEOMETRY_TYPES.has(value.type)
    ) {
        return false;
    }

    switch (value.type) {
        case "Point":
            return isPosition(value.coordinates);

        case "MultiPoint":
            return Array.isArray(value.coordinates) &&
                value.coordinates.length > 0 &&
                value.coordinates.every(isPosition);

        case "LineString":
            return isLineCoordinates(value.coordinates);

        case "MultiLineString":
            return Array.isArray(value.coordinates) &&
                value.coordinates.length > 0 &&
                value.coordinates.every(isLineCoordinates);

        case "Polygon":
            return isPolygonCoordinates(value.coordinates);

        case "MultiPolygon":
            return Array.isArray(value.coordinates) &&
                value.coordinates.length > 0 &&
                value.coordinates.every(isPolygonCoordinates);

        default:
            return false;
    }
}

function hasValidProperties(
    value: unknown,
): value is GeoJsonProperties {
    return value === null || isRecord(value);
}

function isOverlayFeature(
    value: unknown,
): value is OverlayFeature {
    if (
        !isRecord(value) ||
        value.type !== "Feature" ||
        !isSupportedGeometry(value.geometry) ||
        !hasValidProperties(value.properties)
    ) {
        return false;
    }

    return value.id === undefined ||
        typeof value.id === "string" ||
        typeof value.id === "number";
}

function getGeometryKind(
    geometry: OverlayGeometry,
): Exclude<VectorGeometryKind, "mixed"> {
    switch (geometry.type) {
        case "Point":
        case "MultiPoint":
            return "point";

        case "LineString":
        case "MultiLineString":
            return "line";

        case "Polygon":
        case "MultiPolygon":
            return "polygon";
    }
}

function inferGeometryKind(
    features: readonly OverlayFeature[],
): VectorGeometryKind {
    const kinds = new Set(
        features.map(
            (feature) =>
                getGeometryKind(feature.geometry),
        ),
    );

    return kinds.size === 1
        ? [...kinds][0]
        : "mixed";
}

function createLayerName(
    filename: string,
) {
    const name = filename
        .replace(/\.(geojson|json)$/i, "")
        .trim();

    return name || "untitled-layer";
}

export function parseOverlayGeoJson(
    raw: unknown,
    filename: string,
): WorkspaceVectorLayer {
    if (
        !isRecord(raw) ||
        raw.type !== "FeatureCollection"
    ) {
        throw new Error(
            "当前仅支持 GeoJSON FeatureCollection",
        );
    }

    if (!Array.isArray(raw.features)) {
        throw new Error(
            "FeatureCollection 缺少 features 数组",
        );
    }

    if (raw.features.length === 0) {
        throw new Error(
            "该图层不包含有效 Feature",
        );
    }

    const features = raw.features.filter(
        isOverlayFeature,
    );

    if (features.length === 0) {
        throw new Error(
            "GeoJSON 中没有可显示的矢量要素",
        );
    }

    const geometryKind = inferGeometryKind(features);

    return {
        id: crypto.randomUUID(),
        name: createLayerName(filename),
        sourceType: "geojson",
        geometryKind,
        featureCount: features.length,
        collection: {
            type: "FeatureCollection",
            features,
        },
        style: createDefaultOverlayLayerStyle(
            0,
            geometryKind,
        ),
        createdAt: Date.now(),
    };
}
