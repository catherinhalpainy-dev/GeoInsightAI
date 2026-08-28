import {
    booleanIntersects,
    booleanWithin,
} from "@turf/turf";
import {
    area,
} from "@turf/area";
import type {
    Feature,
    GeoJsonProperties,
    MultiPolygon,
    Polygon,
} from "geojson";

import type {
    SpatialQueryRelation,
    SpatialQueryResult,
} from "../../types/analysis";
import type {
    LandUseFeature,
    LandUseFeatureCollection,
    LandUseType,
} from "../../types/landUse";

export type SpatialQueryGeometry = Feature<
    Polygon | MultiPolygon,
    GeoJsonProperties
>;

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" &&
        value !== null;
}

function hasValidCoordinates(
    feature: unknown,
) {
    if (!isRecord(feature)) {
        return false;
    }

    const geometry = feature.geometry;

    if (!isRecord(geometry)) {
        return false;
    }

    if (
        geometry.type !== "Polygon" &&
        geometry.type !== "MultiPolygon"
    ) {
        return false;
    }

    const coordinates = geometry.coordinates;

    return Array.isArray(coordinates) &&
        coordinates.length > 0;
}

export function queryFeaturesByGeometry(
    collection: LandUseFeatureCollection,
    queryGeometry: SpatialQueryGeometry,
    relation: SpatialQueryRelation,
): LandUseFeature[] {
    if (
        (
            relation !== "intersects" &&
            relation !== "within"
        ) ||
        !hasValidCoordinates(queryGeometry)
    ) {
        return [];
    }

    if (!Array.isArray(collection.features)) {
        return [];
    }

    return collection.features.filter(
        (feature) => {
            if (!hasValidCoordinates(feature)) {
                return false;
            }

            try {
                return relation === "within"
                    ? booleanWithin(
                        feature,
                        queryGeometry,
                    )
                    : booleanIntersects(
                        feature,
                        queryGeometry,
                    );
            } catch {
                return false;
            }
        },
    );
}

function createEmptyTypeCounts():
    Record<LandUseType, number> {
    return {
        residential: 0,
        commercial: 0,
        industrial: 0,
        green: 0,
        public: 0,
        transportation: 0,
        other: 0,
    };
}

export function summarizeSpatialQuery(
    features: LandUseFeature[],
    relation: SpatialQueryRelation,
): SpatialQueryResult {
    const typeCounts =
        createEmptyTypeCounts();

    let totalAreaM2 = 0;

    for (const feature of features) {
        const properties = feature.properties;

        typeCounts[properties.landUseType] += 1;

        if (
            Number.isFinite(properties.areaM2) &&
            properties.areaM2 > 0
        ) {
            totalAreaM2 += properties.areaM2;
            continue;
        }

        try {
            const calculatedArea = area(feature);

            if (
                Number.isFinite(calculatedArea) &&
                calculatedArea > 0
            ) {
                totalAreaM2 += calculatedArea;
            }
        } catch {
            // Invalid runtime geometry contributes no area.
        }
    }

    return {
        relation,
        featureIds: features.map(
            (feature) => feature.properties.id,
        ),
        featureCount: features.length,
        totalAreaM2,
        totalAreaKm2: totalAreaM2 / 1_000_000,
        typeCounts,
    };
}
