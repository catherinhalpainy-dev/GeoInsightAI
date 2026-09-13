import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
    area,
    booleanIntersects,
    booleanWithin,
    buffer,
    distance,
    featureCollection,
    intersect,
    kinks,
    lineString,
    nearestPointOnLine,
    pointOnFeature,
    polygon,
} from "@turf/turf";

const outputRoot = resolve("public/demo-data/parcel-review");
const sourceRoot = resolve(outputRoot, "source");
const generatedAt = 1_735_689_600_000;

function rectangle(minX, minY, maxX, maxY, properties = {}) {
    return polygon([[
        [minX, minY],
        [maxX, minY],
        [maxX, maxY],
        [minX, maxY],
        [minX, minY],
    ]], properties);
}

const landUseTypes = [
    "residential",
    "commercial",
    "industrial",
    "green",
    "public",
    "transportation",
    "other",
];

const primaryFeatures = [];
const baseX = 114.306;
const baseY = 30.526;
const cellWidth = 0.0021;
const cellHeight = 0.0017;
const gapX = 0.0003;
const gapY = 0.0003;

for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 5; column += 1) {
        const index = row * 5 + column;
        const minX = baseX + column * (cellWidth + gapX);
        const minY = baseY + row * (cellHeight + gapY);
        const isTarget = row === 2 && column === 2;
        const featureId = isTarget
            ? "parcel-target-001"
            : "parcel-" + String(index + 1).padStart(3, "0");
        const feature = rectangle(
            minX,
            minY,
            minX + cellWidth,
            minY + cellHeight,
            {
                id: featureId,
                landUseType: isTarget
                    ? "commercial"
                    : landUseTypes[index % landUseTypes.length],
                areaM2: 0,
                districtCode: column < 2 ? "420101" : column < 4 ? "420102" : "420103",
                builtYear: isTarget
                    ? 2012
                    : index % 6 === 0 ? null : 2004 + index,
            },
        );
        feature.properties.areaM2 = Number(area(feature).toFixed(2));
        primaryFeatures.push(feature);
    }
}

const landuse = featureCollection(primaryFeatures);
const target = primaryFeatures.find(
    (feature) => feature.properties.id === "parcel-target-001",
);

if (!target) {
    throw new Error("Target parcel was not generated.");
}

const planning = featureCollection([
    rectangle(114.3052, 30.5252, 114.3119, 30.5359, {
        id: "planning-residential",
        name: "滨江居住组团",
        plannedUse: "居住用地",
    }),
    rectangle(114.3119, 30.5252, 114.3150, 30.5359, {
        id: "planning-commercial",
        name: "滨江商业服务区",
        plannedUse: "商业服务业用地",
    }),
    rectangle(114.3150, 30.5252, 114.3185, 30.5359, {
        id: "planning-public",
        name: "公共服务设施片区",
        plannedUse: "公共管理与公共服务用地",
    }),
    rectangle(114.3052, 30.5359, 114.3185, 30.5387, {
        id: "planning-green",
        name: "滨水生态绿廊",
        plannedUse: "公园绿地",
    }),
]);

const restrictions = featureCollection([
    rectangle(114.31245, 30.5295, 114.31355, 30.5335, {
        id: "restriction-river-buffer",
        name: "滨江河道保护带",
        restrictionType: "河道保护带",
        level: "严格控制",
    }),
    rectangle(114.3053, 30.5338, 114.3081, 30.5372, {
        id: "restriction-ecological",
        name: "北侧生态保育区",
        restrictionType: "生态保护区",
        level: "限制建设",
    }),
    rectangle(114.3162, 30.5255, 114.3170, 30.5324, {
        id: "restriction-power-corridor",
        name: "高压走廊控制区",
        restrictionType: "高压走廊",
        level: "控制建设",
    }),
]);

const roads = featureCollection([
    lineString([[114.3045, 30.5322], [114.3195, 30.5322]], { id: "road-001", name: "滨江大道", roadClass: "主干路" }),
    lineString([[114.3048, 30.5285], [114.3188, 30.5285]], { id: "road-002", name: "临江路", roadClass: "次干路" }),
    lineString([[114.3090, 30.5248], [114.3090, 30.5375]], { id: "road-003", name: "青石路", roadClass: "次干路" }),
    lineString([[114.3145, 30.5248], [114.3145, 30.5378]], { id: "road-004", name: "规划一路", roadClass: "支路" }),
    lineString([[114.3070, 30.5262], [114.3162, 30.5348]], { id: "road-005", name: "创新大道", roadClass: "主干路" }),
    lineString([[114.3060, 30.5345], [114.3170, 30.5345]], { id: "road-006", name: "北湖街", roadClass: "支路" }),
    lineString([[114.3102, 30.5292], [114.3137, 30.5330]], { id: "road-007", name: "目标地块支路", roadClass: "支路" }),
    lineString([[114.3045, 30.5375], [114.3195, 30.5375]], { id: "road-008", name: "北环路", roadClass: "主干路" }),
    lineString([[114.3192, 30.5248], [114.3192, 30.5388]], { id: "road-009", name: "东环路", roadClass: "主干路" }),
    lineString([[114.3045, 30.5238], [114.3190, 30.5238]], { id: "road-010", name: "南港路", roadClass: "次干路" }),
    lineString([[114.3032, 30.5245], [114.3032, 30.5385]], { id: "road-011", name: "西堤路", roadClass: "次干路" }),
    lineString([[114.3168, 30.5360], [114.3215, 30.5395]], { id: "road-012", name: "科创北路", roadClass: "支路" }),
]);

const water = featureCollection([
    lineString([[114.3038, 30.5260], [114.3080, 30.5263], [114.3120, 30.5264], [114.3160, 30.5261], [114.3200, 30.5258]], {
        id: "water-001",
        name: "滨江河",
        waterType: "河流",
    }),
    lineString([[114.3173, 30.5255], [114.3171, 30.5295], [114.3175, 30.5335], [114.3172, 30.5380]], {
        id: "water-002",
        name: "东排水渠",
        waterType: "人工水渠",
    }),
    lineString([[114.3050, 30.5367], [114.3090, 30.5365], [114.3130, 30.5369]], {
        id: "water-003",
        name: "北湖连通渠",
        waterType: "人工水渠",
    }),
]);

const administrativeBoundary = featureCollection([
    rectangle(114.3030, 30.5230, 114.3097, 30.5400, { id: "admin-001", name: "滨江西区", code: "420101" }),
    rectangle(114.3097, 30.5230, 114.3145, 30.5400, { id: "admin-002", name: "滨江中区", code: "420102" }),
    rectangle(114.3145, 30.5230, 114.3215, 30.5400, { id: "admin-003", name: "滨江东区", code: "420103" }),
]);

function overlayLayer(id, name, geometryKind, collection, style) {
    return {
        id,
        name,
        sourceType: "geojson",
        geometryKind,
        featureCount: collection.features.length,
        collection,
        style: { visible: true, pointRadius: 5, ...style },
        createdAt: generatedAt,
        origin: {
            type: "local-geojson",
            filename: id + ".geojson",
        },
    };
}

const overlayLayers = [
    overlayLayer("restrictions", "限制建设区域", "polygon", restrictions, {
        opacity: 0.16,
        fillColor: "#d97706",
        lineColor: "#dc2626",
        pointColor: "#dc2626",
        lineWidth: 2,
    }),
    overlayLayer("planning", "规划用途", "polygon", planning, {
        opacity: 0.13,
        fillColor: "#6366f1",
        lineColor: "#6366f1",
        pointColor: "#6366f1",
        lineWidth: 1.5,
    }),
    overlayLayer("roads", "道路", "line", roads, {
        opacity: 0.88,
        fillColor: "#78716c",
        lineColor: "#78716c",
        pointColor: "#78716c",
        lineWidth: 2,
    }),
    overlayLayer("water", "水系", "line", water, {
        opacity: 0.9,
        fillColor: "#3b82f6",
        lineColor: "#3b82f6",
        pointColor: "#3b82f6",
        lineWidth: 2.2,
    }),
    overlayLayer("administrative-boundary", "行政区边界", "polygon", administrativeBoundary, {
        opacity: 0.04,
        fillColor: "#94a3b8",
        lineColor: "#64748b",
        pointColor: "#64748b",
        lineWidth: 1.4,
    }),
];

const project = {
    format: "geoinsight-project",
    version: 1,
    project: {
        id: "demo-parcel-review-template",
        name: "滨江地块开发条件分析",
        createdAt: generatedAt,
        updatedAt: generatedAt,
    },
    data: {
        primaryDataset: {
            id: "demo-landuse-current",
            name: "土地利用现状",
            sourceCrs: "EPSG:4326",
            collection: landuse,
        },
        overlayLayers,
        rasterLayers: [],
        analysisResultLayers: [],
    },
    map: {
        basemap: "light",
        center: [114.3123, 30.5316],
        zoom: 14.1,
        bearing: 0,
        pitch: 0,
    },
    workspace: {
        filters: {
            landUseTypes,
            minimumBuiltYear: null,
            districtCode: "",
        },
        attributeQuery: null,
        layerStyle: {
            layerVisible: true,
            fillVisible: true,
            fillColor: "#0d9488",
            fillOpacity: 0.7,
            outlineVisible: true,
            outlineColor: "#ffffff",
            outlineWidth: 1.5,
            outlineOpacity: 1,
            symbologyMode: "categorized",
            categorizedField: "landUseType",
            graduatedField: "areaM2",
            classificationMethod: "equalInterval",
            classCount: 5,
            colorRamp: "teal",
        },
        selectedFeatureIds: ["parcel-target-001"],
        selectedFeatureId: "parcel-target-001",
        aoiFeature: null,
        aoiRelation: "intersects",
        aoiQueryResult: null,
        bufferFeature: null,
        bufferResult: null,
        bufferSpatialQueryResult: null,
        workflows: [],
    },
};

for (const feature of [
    ...landuse.features,
    ...planning.features,
    ...restrictions.features,
    ...administrativeBoundary.features,
]) {
    if (kinks(feature).features.length > 0) {
        throw new Error("Self intersection detected: " + feature.properties.id);
    }
}

const targetRestriction = intersect(featureCollection([
    target,
    restrictions.features[0],
]));
const targetBuffer = buffer(target, 500, { units: "meters" });

if (!targetRestriction || !targetBuffer) {
    throw new Error("Demo relationship validation failed.");
}

const restrictionOverlapAreaM2 = area(targetRestriction);
const restrictionOverlapRatio = restrictionOverlapAreaM2 / area(target);
const roadsWithinBuffer = roads.features.filter((road) =>
    booleanIntersects(road, targetBuffer),
);
const containingAdministrativeArea = administrativeBoundary.features.find((boundary) =>
    booleanWithin(target, boundary),
);
const targetPoint = pointOnFeature(target);
const nearestWaterPoint = nearestPointOnLine(water.features[0], targetPoint);
const waterDistanceM = distance(targetPoint, nearestWaterPoint, { units: "meters" });

const validationSummary = {
    restrictionOverlapRatio,
    roadsWithin500m: roadsWithinBuffer.length,
    roadsOutside500m: roads.features.length - roadsWithinBuffer.length,
    administrativeArea: containingAdministrativeArea?.properties.name ?? null,
    nearestWaterDistanceM: waterDistanceM,
};

if (
    restrictionOverlapRatio < 0.1 ||
    restrictionOverlapRatio > 0.3 ||
    roadsWithinBuffer.length < 3 ||
    roadsWithinBuffer.length === roads.features.length ||
    !containingAdministrativeArea ||
    waterDistanceM > 800
) {
    console.error(validationSummary);
    throw new Error("Demo data does not meet the parcel review scenario constraints.");
}

await mkdir(sourceRoot, { recursive: true });

const files = new Map([
    ["landuse.geojson", landuse],
    ["planning.geojson", planning],
    ["restrictions.geojson", restrictions],
    ["roads.geojson", roads],
    ["water.geojson", water],
    ["administrative-boundary.geojson", administrativeBoundary],
]);

await Promise.all([
    ...[...files].map(([name, collection]) =>
        writeFile(resolve(sourceRoot, name), JSON.stringify(collection, null, 2) + "\n", "utf8"),
    ),
    writeFile(resolve(outputRoot, "demo.geoinsight"), JSON.stringify(project, null, 2) + "\n", "utf8"),
]);

console.log(JSON.stringify({
    primaryFeatureCount: landuse.features.length,
    overlayFeatureCounts: Object.fromEntries(
        overlayLayers.map((layer) => [layer.name, layer.featureCount]),
    ),
    targetFeatureId: target.properties.id,
    targetAreaM2: Number(area(target).toFixed(2)),
    restrictionOverlapAreaM2: Number(restrictionOverlapAreaM2.toFixed(2)),
    restrictionOverlapRatio: Number((restrictionOverlapRatio * 100).toFixed(2)),
    roadsWithin500m: roadsWithinBuffer.length,
    roadsOutside500m: roads.features.length - roadsWithinBuffer.length,
    administrativeArea: containingAdministrativeArea.properties.name,
    nearestWaterDistanceM: Number(waterDistanceM.toFixed(1)),
}, null, 2));
