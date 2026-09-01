import type {
    FeatureCollection,
    GeoJsonProperties,
    Geometry,
    Position,
} from "geojson";

export interface GeoJsonBounds {
    minLongitude: number;
    minLatitude: number;
    maxLongitude: number;
    maxLatitude: number;
}

function visitPosition(
    position: Position,
    bounds: GeoJsonBounds,
) {
    const [longitude, latitude] = position;

    if (
        !Number.isFinite(longitude) ||
        !Number.isFinite(latitude)
    ) {
        return;
    }

    bounds.minLongitude = Math.min(
        bounds.minLongitude,
        longitude,
    );
    bounds.minLatitude = Math.min(
        bounds.minLatitude,
        latitude,
    );
    bounds.maxLongitude = Math.max(
        bounds.maxLongitude,
        longitude,
    );
    bounds.maxLatitude = Math.max(
        bounds.maxLatitude,
        latitude,
    );
}

function visitGeometry(
    geometry: Geometry,
    bounds: GeoJsonBounds,
) {
    switch (geometry.type) {
        case "Point":
            visitPosition(geometry.coordinates, bounds);
            break;

        case "MultiPoint":
        case "LineString":
            geometry.coordinates.forEach(
                (position) =>
                    visitPosition(position, bounds),
            );
            break;

        case "MultiLineString":
        case "Polygon":
            geometry.coordinates.forEach(
                (line) => line.forEach(
                    (position) =>
                        visitPosition(position, bounds),
                ),
            );
            break;

        case "MultiPolygon":
            geometry.coordinates.forEach(
                (polygon) => polygon.forEach(
                    (line) => line.forEach(
                        (position) =>
                            visitPosition(position, bounds),
                    ),
                ),
            );
            break;

        case "GeometryCollection":
            geometry.geometries.forEach(
                (item) =>
                    visitGeometry(item, bounds),
            );
            break;
    }
}

export function calculateGeoJsonBounds(
    collection: FeatureCollection<
        Geometry,
        GeoJsonProperties
    >,
): GeoJsonBounds | null {
    const bounds: GeoJsonBounds = {
        minLongitude: Infinity,
        minLatitude: Infinity,
        maxLongitude: -Infinity,
        maxLatitude: -Infinity,
    };

    for (const feature of collection.features) {
        if (feature.geometry) {
            visitGeometry(feature.geometry, bounds);
        }
    }

    if (
        !Number.isFinite(bounds.minLongitude) ||
        !Number.isFinite(bounds.minLatitude) ||
        !Number.isFinite(bounds.maxLongitude) ||
        !Number.isFinite(bounds.maxLatitude)
    ) {
        return null;
    }

    return bounds;
}
