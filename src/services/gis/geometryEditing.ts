import {
    area,
} from "@turf/turf";

import type {
    GeometrySnapCandidate,
} from "../../types/geometryEditing";
import type {
    LandUseFeatureCollection,
    PolygonGeometry,
    Position,
} from "../../types/landUse";

const COORDINATE_TOLERANCE = 1e-10;

function positionsEqual(
    first: Position,
    second: Position,
) {
    return Math.abs(first[0] - second[0]) <= COORDINATE_TOLERANCE &&
        Math.abs(first[1] - second[1]) <= COORDINATE_TOLERANCE;
}

export function getOpenOuterRing(
    geometry: PolygonGeometry,
): Position[] {
    const outerRing = geometry.coordinates[0] ?? [];
    const endIndex = outerRing.length > 1 &&
        positionsEqual(outerRing[0], outerRing[outerRing.length - 1])
        ? outerRing.length - 1
        : outerRing.length;

    return outerRing.slice(0, endIndex).map(
        (coordinate) => [...coordinate],
    );
}

export function createClosedPolygonGeometry(
    coordinates: Position[],
): PolygonGeometry | null {
    const openCoordinates = coordinates.length > 1 &&
        positionsEqual(coordinates[0], coordinates[coordinates.length - 1])
        ? coordinates.slice(0, -1)
        : coordinates;
    const distinctCoordinates = openCoordinates.filter(
        (coordinate, index) =>
            openCoordinates.findIndex(
                (candidate) => positionsEqual(candidate, coordinate),
            ) === index,
    );

    if (distinctCoordinates.length < 3 || openCoordinates.length < 3) {
        return null;
    }

    const ring = openCoordinates.map(
        (coordinate) => [...coordinate] as Position,
    );
    ring.push([...ring[0]]);

    return {
        type: "Polygon",
        coordinates: [ring],
    };
}

export function calculateEditedGeometryAreaM2(
    geometry: PolygonGeometry,
) {
    const areaM2 = area({
        type: "Feature",
        properties: {},
        geometry,
    });

    return Number.isFinite(areaM2) && areaM2 > 0
        ? areaM2
        : null;
}

export function extractPolygonVertices(
    collection: LandUseFeatureCollection,
    options: {
        excludeFeatureId?: string | null;
    } = {},
): GeometrySnapCandidate[] {
    return collection.features.flatMap((feature) => {
        if (feature.properties.id === options.excludeFeatureId) {
            return [];
        }

        return getOpenOuterRing(feature.geometry).map((coordinate) => ({
            featureId: feature.properties.id,
            coordinate,
        }));
    });
}
