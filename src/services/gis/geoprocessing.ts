import {
    area,
    booleanValid,
    centroid,
    intersect,
    union,
} from "@turf/turf";
import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    MultiPolygon,
    Point,
    Polygon,
} from "geojson";

import type {
    AnalysisResultFeatureCollection,
    AnalysisResultGeometryType,
    CentroidResultProperties,
    DissolveField,
    DissolveResultProperties,
    IntersectionResultProperties,
} from "../../types/analysis";
import type {
    LandUseFeature,
    LandUseFeatureCollection,
    LandUseType,
} from "../../types/landUse";

export type OverlayPolygonFeature = Feature<
    Polygon | MultiPolygon,
    GeoJsonProperties
>;

function isRecord(
    value: unknown,
): value is Record<string, unknown> {
    return typeof value === "object" &&
        value !== null;
}

function hasPolygonGeometry(
    feature: unknown,
): boolean {
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

    return Array.isArray(geometry.coordinates) &&
        geometry.coordinates.length > 0;
}

function toTurfPolygonFeature(
    feature: LandUseFeature,
): Feature<Polygon, GeoJsonProperties> {
    return {
        type: "Feature",
        geometry: {
            type: "Polygon",
            coordinates:
                feature.geometry.coordinates.map(
                    (ring) => ring.map(
                        (position) => [...position],
                    ),
                ),
        },
        properties: {
            ...feature.properties,
        },
    };
}

function createPolygonCollection(
    features: Array<Feature<
        Polygon | MultiPolygon,
        GeoJsonProperties
    >>,
): FeatureCollection<
    Polygon | MultiPolygon,
    GeoJsonProperties
> {
    return {
        type: "FeatureCollection",
        features,
    };
}

function clonePolygonGeometry(
    geometry: Polygon,
): Polygon {
    return {
        type: "Polygon",
        coordinates: geometry.coordinates.map(
            (ring) => ring.map(
                (position) => [...position],
            ),
        ),
    };
}

function isValidLandUsePolygon(
    feature: LandUseFeature,
): boolean {
    if (!hasPolygonGeometry(feature)) {
        return false;
    }

    try {
        return booleanValid(
            toTurfPolygonFeature(feature),
        );
    } catch {
        return false;
    }
}

function isValidOverlayPolygon(
    feature: OverlayPolygonFeature,
): boolean {
    if (!hasPolygonGeometry(feature)) {
        return false;
    }

    try {
        return booleanValid(feature);
    } catch {
        return false;
    }
}

function unionFeatureGroup(
    features: LandUseFeature[],
    properties: DissolveResultProperties,
): Feature<
    Polygon | MultiPolygon,
    DissolveResultProperties
> | null {
    const validFeatures = features.filter(
        isValidLandUsePolygon,
    );

    if (validFeatures.length === 0) {
        return null;
    }

    if (validFeatures.length === 1) {
        return {
            type: "Feature",
            geometry: clonePolygonGeometry(
                validFeatures[0].geometry,
            ),
            properties: {
                ...properties,
            },
        };
    }

    try {
        return union<DissolveResultProperties>(
            createPolygonCollection(
                validFeatures.map(
                    toTurfPolygonFeature,
                ),
            ),
            {
                properties: {
                    ...properties,
                },
            },
        );
    } catch {
        throw new Error(
            "融合过程中发现无法处理的面几何",
        );
    }
}

export function intersectFeaturesWithGeometry(
    collection: LandUseFeatureCollection,
    overlayGeometry: OverlayPolygonFeature,
): AnalysisResultFeatureCollection {
    if (!isValidOverlayPolygon(overlayGeometry)) {
        throw new Error("叠加范围不是有效的 Polygon 或 MultiPolygon");
    }

    if (
        !Array.isArray(collection.features) ||
        collection.features.length === 0
    ) {
        throw new Error("输入图层没有可用于叠加分析的要素");
    }

    const resultFeatures: Array<Feature<
        Polygon | MultiPolygon,
        IntersectionResultProperties
    >> = [];

    for (const feature of collection.features) {
        if (!isValidLandUsePolygon(feature)) {
            continue;
        }

        const sourceFeatureId =
            feature.properties.id;
        const properties: IntersectionResultProperties = {
            ...feature.properties,
            analysisOperation: "intersection",
            sourceFeatureId,
        };

        try {
            const result =
                intersect<IntersectionResultProperties>(
                    createPolygonCollection([
                        toTurfPolygonFeature(feature),
                        overlayGeometry,
                    ]),
                    {
                        properties,
                    },
                );

            if (
                result &&
                (
                    result.geometry.type === "Polygon" ||
                    result.geometry.type === "MultiPolygon"
                )
            ) {
                resultFeatures.push(result);
            }
        } catch {
            // Invalid runtime geometry is skipped without affecting valid rows.
        }
    }

    return {
        type: "FeatureCollection",
        features: resultFeatures,
    };
}

export function dissolveFeatures(
    collection: LandUseFeatureCollection,
    field: DissolveField,
): AnalysisResultFeatureCollection {
    if (
        !Array.isArray(collection.features) ||
        collection.features.length === 0
    ) {
        throw new Error("输入图层没有可用于融合的要素");
    }

    const validFeatures = collection.features.filter(
        isValidLandUsePolygon,
    );

    if (validFeatures.length === 0) {
        throw new Error("输入图层中没有有效的 Polygon 要素");
    }

    const resultFeatures: Array<Feature<
        Polygon | MultiPolygon,
        DissolveResultProperties
    >> = [];

    if (field === "all") {
        const dissolved = unionFeatureGroup(
            validFeatures,
            {
                analysisOperation: "dissolve",
            },
        );

        if (dissolved) {
            resultFeatures.push(dissolved);
        }
    } else {
        const groups = new Map<
            LandUseType,
            LandUseFeature[]
        >();

        for (const feature of validFeatures) {
            const landUseType =
                feature.properties.landUseType;
            const group = groups.get(landUseType) ?? [];

            groups.set(
                landUseType,
                [
                    ...group,
                    feature,
                ],
            );
        }

        for (const [landUseType, features] of groups) {
            const dissolved = unionFeatureGroup(
                features,
                {
                    analysisOperation: "dissolve",
                    landUseType,
                },
            );

            if (dissolved) {
                resultFeatures.push(dissolved);
            }
        }
    }

    if (resultFeatures.length === 0) {
        throw new Error("融合未生成有效结果");
    }

    return {
        type: "FeatureCollection",
        features: resultFeatures,
    };
}

export function createCentroids(
    collection: LandUseFeatureCollection,
): AnalysisResultFeatureCollection {
    if (
        !Array.isArray(collection.features) ||
        collection.features.length === 0
    ) {
        throw new Error("输入图层没有可用于生成中心点的要素");
    }

    const resultFeatures: Array<Feature<
        Point,
        CentroidResultProperties
    >> = [];

    for (const feature of collection.features) {
        if (!isValidLandUsePolygon(feature)) {
            continue;
        }

        const sourceFeatureId =
            feature.properties.id;
        const properties: CentroidResultProperties = {
            ...feature.properties,
            analysisOperation: "centroid",
            sourceFeatureId,
        };

        try {
            resultFeatures.push(
                centroid<CentroidResultProperties>(
                    toTurfPolygonFeature(feature),
                    {
                        properties,
                    },
                ),
            );
        } catch {
            // Invalid runtime geometry is skipped without affecting valid rows.
        }
    }

    if (resultFeatures.length === 0) {
        throw new Error("中心点工具未找到有效的 Polygon 要素");
    }

    return {
        type: "FeatureCollection",
        features: resultFeatures,
    };
}

export function calculateAnalysisAreaM2(
    collection: AnalysisResultFeatureCollection,
): number {
    try {
        const calculatedArea = area(collection);

        return Number.isFinite(calculatedArea)
            ? calculatedArea
            : 0;
    } catch {
        return 0;
    }
}

export function getAnalysisGeometryType(
    collection: AnalysisResultFeatureCollection,
): AnalysisResultGeometryType {
    if (collection.features.length === 0) {
        throw new Error("分析结果不包含可显示的要素");
    }

    if (
        collection.features.every(
            (feature) =>
                feature.geometry.type === "Point",
        )
    ) {
        return "Point";
    }

    if (
        collection.features.some(
            (feature) =>
                feature.geometry.type === "MultiPolygon",
        )
    ) {
        return "MultiPolygon";
    }

    return "Polygon";
}
