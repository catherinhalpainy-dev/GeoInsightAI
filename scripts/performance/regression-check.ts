import { AgentPlanRequestSchema } from "../../server/agent/schemas";
import { applyLandUseFilters } from "../../src/utils/applyLandUseFilters";
import { parseLandUseGeoJson } from "../../src/utils/parseLandUseGeoJson";
import { createBuffer } from "../../src/services/gis/buffer";
import {
    dissolveFeatures,
    intersectFeaturesWithGeometry,
} from "../../src/services/gis/geoprocessing";
import { queryFeaturesByGeometry } from "../../src/services/gis/spatialQuery";
import { scanFeatureCollection } from "../../src/services/gis/dataQuality";
import {
    createProjectSnapshot,
    deserializeProject,
    serializeProject,
} from "../../src/services/project/projectSerializer";
import {
    deserializeWorkflow,
    serializeWorkflow,
} from "../../src/services/workflow/workflowSerializer";
import { DEFAULT_LAYER_STYLE } from "../../src/types/layerStyle";
import type { AnalysisWorkflow } from "../../src/types/workflow";
import type {
    LandUseFeatureCollection,
    Position,
} from "../../src/types/landUse";

function assert(condition: unknown, message: string): asserts condition {
    if (!condition) throw new Error(message);
}

function ring(west: number, south: number, size: number): Position[] {
    return [
        [west, south],
        [west + size, south],
        [west + size, south + size],
        [west, south + size],
        [west, south],
    ];
}

const collection: LandUseFeatureCollection = {
    type: "FeatureCollection",
    features: [
        {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring(116.2, 39.7, 0.01)] },
            properties: {
                id: "parcel-1",
                landUseType: "residential",
                areaM2: 10000,
                districtCode: "A",
                builtYear: 2020,
            },
        },
        {
            type: "Feature",
            geometry: { type: "Polygon", coordinates: [ring(116.22, 39.7, 0.01)] },
            properties: {
                id: "parcel-2",
                landUseType: "green",
                areaM2: 12000,
                districtCode: "B",
                builtYear: 2010,
            },
        },
    ],
};

const parsed = parseLandUseGeoJson(collection, "regression.geojson");
assert(parsed.ok, "GeoJSON import validation failed");
assert(parsed.dataset.collection.features.length === 2, "GeoJSON feature count changed");

const filtered = applyLandUseFilters(collection.features, {
    landUseTypes: ["residential"],
    minimumBuiltYear: 2015,
    districtCode: "A",
});
assert(filtered.length === 1 && filtered[0].properties.id === "parcel-1", "Filter result changed");

const mask = {
    type: "Feature" as const,
    properties: {},
    geometry: {
        type: "Polygon" as const,
        coordinates: [ring(116.195, 39.695, 0.02)],
    },
};
const query = queryFeaturesByGeometry(collection, mask, "intersects");
assert(query.length === 1, "AOI query result changed");

const buffer = createBuffer(collection.features[0], 250);
assert(buffer.geometry.type === "Polygon", "Buffer output geometry changed");

const intersection = intersectFeaturesWithGeometry(collection, mask);
assert(intersection.features.length === 1, "Intersection result changed");

const dissolved = dissolveFeatures(collection, "landUseType");
assert(dissolved.features.length === 2, "Dissolve result changed");

const quality = scanFeatureCollection(collection, {
    targetId: "regression",
    targetName: "Regression",
    targetKind: "primary",
});
assert(quality.totalFeatures === 2, "Data quality scan result changed");

const workflow: AnalysisWorkflow = {
    id: "workflow-1",
    name: "Regression workflow",
    description: "Round-trip check",
    createdAt: 1,
    updatedAt: 1,
    input: { type: "primary" },
    steps: [{ id: "centroid-1", type: "centroid", enabled: true }],
    output: { mode: "preview", name: "Centroids" },
};
const workflowRoundTrip = deserializeWorkflow(serializeWorkflow(workflow));
assert(workflowRoundTrip.steps[0]?.type === "centroid", "Workflow round trip changed");

const project = createProjectSnapshot({
    project: { id: "project-1", name: "Regression project", createdAt: 1, updatedAt: 1 },
    data: {
        primaryDataset: {
            id: "dataset-1",
            name: "Regression dataset",
            sourceCrs: "EPSG:4326",
            collection,
        },
        overlayLayers: [],
        analysisResultLayers: [],
        rasterLayers: [],
    },
    map: { basemap: "light", center: [116.2, 39.7], zoom: 10, bearing: 0, pitch: 0 },
    workspace: {
        filters: { landUseTypes: [], minimumBuiltYear: null, districtCode: "" },
        attributeQuery: null,
        layerStyle: DEFAULT_LAYER_STYLE,
        selectedFeatureIds: [],
        selectedFeatureId: null,
        aoiFeature: null,
        aoiRelation: "intersects",
        aoiQueryResult: null,
        bufferFeature: null,
        bufferResult: null,
        bufferSpatialQueryResult: null,
        workflows: [workflow],
    },
});
const projectRoundTrip = deserializeProject(serializeProject(project));
assert(projectRoundTrip.data.primaryDataset.collection.features.length === 2, "Project round trip changed");

const agentRequest = AgentPlanRequestSchema.safeParse({
    message: "筛选住宅用地",
    context: {
        datasetName: "Regression dataset",
        featureCount: 2,
        filteredFeatureCount: 1,
        currentFilters: { landUseTypes: ["residential"], minimumBuiltYear: 2015, districtCode: "A" },
        currentLayerStyle: {
            layerVisible: true,
            fillVisible: true,
            fillColor: "#22c55e",
            fillOpacity: 0.6,
            outlineVisible: true,
            outlineColor: "#14532d",
            outlineWidth: 1,
            outlineOpacity: 1,
            symbologyMode: "single",
        },
        selectedFeature: null,
        hasBuffer: false,
        bufferDistanceM: null,
        hasAoi: false,
        aoiCompleted: false,
        bufferQueryFeatureCount: 0,
        aoiQueryFeatureCount: 0,
        analysisLayers: [],
        overlayLayers: [],
        symbology: { mode: "single", field: null, method: null, classCount: null, colorRamp: null },
    },
});
assert(agentRequest.success, "Agent request schema changed");

process.stdout.write(JSON.stringify({
    status: "passed",
    checks: [
        "geojson-import",
        "filter",
        "aoi-query",
        "buffer",
        "intersection",
        "dissolve",
        "data-quality",
        "workflow-round-trip",
        "project-round-trip",
        "agent-request-schema",
    ],
}, null, 2));
