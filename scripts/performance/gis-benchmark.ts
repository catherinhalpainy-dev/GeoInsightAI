import { performance } from "node:perf_hooks";

import { applyLandUseFilters } from "../../src/utils/applyLandUseFilters";
import { parseLandUseGeoJson } from "../../src/utils/parseLandUseGeoJson";
import { createBuffer } from "../../src/services/gis/buffer";
import {
    dissolveFeatures,
    intersectFeaturesWithGeometry,
} from "../../src/services/gis/geoprocessing";
import {
    queryFeaturesByGeometry,
} from "../../src/services/gis/spatialQuery";
import { scanFeatureCollection } from "../../src/services/gis/dataQuality";
import type {
    LandUseFeature,
    LandUseFeatureCollection,
    LandUseType,
    Position,
} from "../../src/types/landUse";
import type { OverlayPolygonFeature } from "../../src/services/gis/geoprocessing";

const RUNS = 5;
const SIZES = [1_000, 5_000, 10_000] as const;
const LAND_USE_TYPES: LandUseType[] = [
    "residential",
    "commercial",
    "industrial",
    "green",
    "public",
    "transportation",
    "other",
];

function rectangle(
    west: number,
    south: number,
    width: number,
    height: number,
): Position[] {
    return [
        [west, south],
        [west + width, south],
        [west + width, south + height],
        [west, south + height],
        [west, south],
    ];
}

function createDataset(size: number): LandUseFeatureCollection {
    const columns = 100;
    const step = 0.0018;
    const polygonSize = 0.0012;
    const features: LandUseFeature[] = Array.from({ length: size }, (_, index) => {
        const column = index % columns;
        const row = Math.floor(index / columns);

        return {
            type: "Feature",
            geometry: {
                type: "Polygon",
                coordinates: [rectangle(
                    116.2 + column * step,
                    39.7 + row * step,
                    polygonSize,
                    polygonSize,
                )],
            },
            properties: {
                id: `feature-${index + 1}`,
                landUseType: LAND_USE_TYPES[index % LAND_USE_TYPES.length],
                areaM2: 12_000 + index % 5_000,
                districtCode: `district-${index % 12}`,
                builtYear: 1990 + index % 35,
            },
        };
    });

    return { type: "FeatureCollection", features };
}

function createMask(collection: LandUseFeatureCollection): OverlayPolygonFeature {
    const rows = Math.ceil(collection.features.length / 100);

    return {
        type: "Feature",
        properties: {},
        geometry: {
            type: "Polygon",
            coordinates: [rectangle(
                116.19,
                39.69,
                0.092,
                Math.max(0.01, rows * 0.0018 + 0.02),
            )],
        },
    };
}

function median(values: number[]) {
    const sorted = [...values].sort((left, right) => left - right);
    return sorted[Math.floor(sorted.length / 2)];
}

function measure(operation: () => void) {
    const durations: number[] = [];

    for (let index = 0; index < RUNS; index += 1) {
        const startedAt = performance.now();
        operation();
        durations.push(performance.now() - startedAt);
    }

    return {
        runs: durations.map((duration) => Number(duration.toFixed(3))),
        medianMs: Number(median(durations).toFixed(3)),
    };
}

const results = SIZES.map((size) => {
    const collection = createDataset(size);
    const document = {
        type: "FeatureCollection",
        features: collection.features,
    };
    const json = JSON.stringify(document);
    const mask = createMask(collection);
    const filtered = applyLandUseFilters(collection.features, {
        landUseTypes: ["residential", "green"],
        minimumBuiltYear: 2005,
        districtCode: "",
    });
    const queryInput: LandUseFeatureCollection = {
        type: "FeatureCollection",
        features: filtered,
    };

    return {
        size,
        jsonBytes: Buffer.byteLength(json),
        filteredFeatureCount: filtered.length,
        jsonParse: measure(() => {
            JSON.parse(json) as unknown;
        }),
        validation: measure(() => {
            const result = parseLandUseGeoJson(document, `generated-${size}.geojson`);
            if (!result.ok || result.dataset.collection.features.length !== size) {
                throw new Error(`Validation failed for ${size} features.`);
            }
        }),
        filter: measure(() => {
            applyLandUseFilters(collection.features, {
                landUseTypes: ["residential", "green"],
                minimumBuiltYear: 2005,
                districtCode: "",
            });
        }),
        aoiIntersects: measure(() => {
            queryFeaturesByGeometry(collection, mask, "intersects");
        }),
        bufferSingleFeature: measure(() => {
            createBuffer(collection.features[0], 500);
        }),
        intersection: measure(() => {
            intersectFeaturesWithGeometry(queryInput, mask);
        }),
        dissolveByLandUseType: measure(() => {
            dissolveFeatures(queryInput, "landUseType");
        }),
        dataQuality: measure(() => {
            scanFeatureCollection(collection, {
                targetId: `generated-${size}`,
                targetName: `Generated ${size}`,
                targetKind: "primary",
            });
        }),
    };
});

process.stdout.write(JSON.stringify({
    environment: {
        runtime: process.version,
        platform: `${process.platform}-${process.arch}`,
        runsPerScenario: RUNS,
        clock: "node:perf_hooks performance.now",
    },
    results,
}, null, 2));
