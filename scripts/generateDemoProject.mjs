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
    point,
    pointOnFeature,
    polygon,
} from "@turf/turf";

const outputRoot = resolve("public/demo-data/parcel-review");
const sourceRoot = resolve(outputRoot, "source");
const generatedAt = 1_735_689_600_000;

function areaFeature(coordinates, properties = {}) {
    const ring = coordinates.map((coordinate) => [...coordinate]);
    const first = ring[0];
    const last = ring[ring.length - 1];
    if (!last || last[0] !== first[0] || last[1] !== first[1]) {
        ring.push([...first]);
    }
    return polygon([ring], properties);
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
const rowLatitudes = [30.5260, 30.5282, 30.5307, 30.5330, 30.5355];
const rowBoundaries = [
    [114.3054, 114.3077, 114.3100, 114.3125, 114.3152, 114.3180],
    [114.3052, 114.3075, 114.3098, 114.3123, 114.3150, 114.3179],
    [114.3053, 114.3078, 114.3099, 114.3124, 114.3150, 114.3178],
    [114.3050, 114.3075, 114.3101, 114.3128, 114.3152, 114.3180],
    [114.3052, 114.3078, 114.3103, 114.3129, 114.3155, 114.3182],
];

for (let row = 0; row < 4; row += 1) {
    for (let column = 0; column < 5; column += 1) {
        const index = row * 5 + column;
        const isTarget = row === 2 && column === 2;
        const featureId = isTarget
            ? "parcel-target-001"
            : "parcel-" + String(index + 1).padStart(3, "0");
        const south = rowLatitudes[row];
        const north = rowLatitudes[row + 1];
        const southWest = rowBoundaries[row][column];
        const southEast = rowBoundaries[row][column + 1];
        const northWest = rowBoundaries[row + 1][column];
        const northEast = rowBoundaries[row + 1][column + 1];
        const sideInset = 0.00010 + (index % 3) * 0.000015;
        const verticalInset = 0.00011;
        const feature = areaFeature(
            [
                [southWest + sideInset, south + verticalInset + (column % 2) * 0.00002],
                [southEast - sideInset, south + verticalInset],
                [northEast - sideInset, north - verticalInset - (index % 2) * 0.00002],
                [northWest + sideInset, north - verticalInset],
            ],
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
    areaFeature([[114.3048, 30.5257], [114.3112, 30.5256], [114.3115, 30.5312], [114.3111, 30.5360], [114.3049, 30.5356]], {
        id: "planning-residential",
        name: "滨江居住组团",
        plannedUse: "居住用地",
    }),
    areaFeature([[114.3110, 30.5256], [114.3147, 30.5258], [114.3150, 30.5314], [114.3145, 30.5359], [114.3111, 30.5360]], {
        id: "planning-commercial",
        name: "滨江商业服务区",
        plannedUse: "商业服务业用地",
    }),
    areaFeature([[114.3147, 30.5258], [114.3186, 30.5262], [114.3185, 30.5362], [114.3145, 30.5359], [114.3150, 30.5314]], {
        id: "planning-public",
        name: "公共服务设施片区",
        plannedUse: "公共管理与公共服务用地",
    }),
    areaFeature([[114.3048, 30.5354], [114.3090, 30.5358], [114.3131, 30.5355], [114.3185, 30.5360], [114.3188, 30.5384], [114.3049, 30.5380]], {
        id: "planning-green",
        name: "滨水生态绿廊",
        plannedUse: "公园绿地",
    }),
]);

const restrictions = featureCollection([
    areaFeature([[114.31218, 30.5288], [114.31273, 30.5292], [114.31270, 30.5311], [114.31298, 30.5333], [114.31228, 30.5340], [114.31192, 30.5317]], {
        id: "restriction-river-buffer",
        name: "滨江河道保护带",
        restrictionType: "河道保护带",
        level: "严格控制",
    }),
    areaFeature([[114.3049, 30.5337], [114.3061, 30.5333], [114.3084, 30.5344], [114.3078, 30.5374], [114.3052, 30.5370]], {
        id: "restriction-ecological",
        name: "北侧生态保育区",
        restrictionType: "生态保护区",
        level: "限制建设",
    }),
    areaFeature([[114.3160, 30.5252], [114.3165, 30.5252], [114.3175, 30.5328], [114.3168, 30.5330]], {
        id: "restriction-power-corridor",
        name: "高压走廊控制区",
        restrictionType: "高压走廊",
        level: "控制建设",
    }),
]);

const roads = featureCollection([
    lineString([[114.3046, 30.5304], [114.3081, 30.5303], [114.3114, 30.5305], [114.3150, 30.5302], [114.3191, 30.5304]], { id: "road-001", name: "滨江大道", roadClass: "主干路" }),
    lineString([[114.3049, 30.5331], [114.3085, 30.5333], [114.3120, 30.5330], [114.3154, 30.5333], [114.3188, 30.5331]], { id: "road-002", name: "临江路", roadClass: "次干路" }),
    lineString([[114.3092, 30.5251], [114.3094, 30.5284], [114.3093, 30.5316], [114.3096, 30.5350], [114.3094, 30.5382]], { id: "road-003", name: "青石路", roadClass: "次干路" }),
    lineString([[114.3132, 30.5250], [114.3130, 30.5286], [114.3133, 30.5320], [114.3131, 30.5353], [114.3134, 30.5380]], { id: "road-004", name: "规划一路", roadClass: "支路" }),
    lineString([[114.3061, 30.5262], [114.3087, 30.5288], [114.3110, 30.5311], [114.3141, 30.5338], [114.3170, 30.5358]], { id: "road-005", name: "创新大道", roadClass: "主干路" }),
    lineString([[114.3057, 30.5358], [114.3090, 30.5355], [114.3122, 30.5358], [114.3168, 30.5356]], { id: "road-006", name: "北湖街", roadClass: "支路" }),
    lineString([[114.3103, 30.5291], [114.3108, 30.5307], [114.3111, 30.5320], [114.3121, 30.5334]], { id: "road-007", name: "望江支路", roadClass: "支路" }),
    lineString([[114.3045, 30.5380], [114.3090, 30.5378], [114.3140, 30.5381], [114.3195, 30.5377]], { id: "road-008", name: "北环路", roadClass: "主干路" }),
    lineString([[114.3194, 30.5247], [114.3192, 30.5290], [114.3196, 30.5333], [114.3193, 30.5388]], { id: "road-009", name: "东环路", roadClass: "主干路" }),
    lineString([[114.3043, 30.5236], [114.3090, 30.5239], [114.3140, 30.5236], [114.3191, 30.5239]], { id: "road-010", name: "南港路", roadClass: "次干路" }),
    lineString([[114.3030, 30.5245], [114.3034, 30.5290], [114.3031, 30.5338], [114.3035, 30.5385]], { id: "road-011", name: "西堤路", roadClass: "次干路" }),
    lineString([[114.3165, 30.5357], [114.3182, 30.5366], [114.3197, 30.5380], [114.3216, 30.5393]], { id: "road-012", name: "科创北路", roadClass: "支路" }),
]);

const water = featureCollection([
    lineString([[114.3036, 30.5251], [114.3068, 30.5255], [114.3095, 30.5252], [114.3123, 30.5256], [114.3153, 30.5251], [114.3182, 30.5254], [114.3204, 30.5250]], {
        id: "water-001",
        name: "滨江河",
        waterType: "河流",
    }),
    lineString([[114.3178, 30.5252], [114.3174, 30.5280], [114.3177, 30.5308], [114.3173, 30.5335], [114.3176, 30.5365], [114.3172, 30.5383]], {
        id: "water-002",
        name: "东排水渠",
        waterType: "人工水渠",
    }),
    lineString([[114.3048, 30.5365], [114.3070, 30.5369], [114.3092, 30.5365], [114.3112, 30.5368], [114.3134, 30.5364]], {
        id: "water-003",
        name: "北湖连通渠",
        waterType: "人工水渠",
    }),
]);

const administrativeBoundary = featureCollection([
    areaFeature([[114.3027, 30.5227], [114.3093, 30.5229], [114.3095, 30.5285], [114.3092, 30.5340], [114.3097, 30.5402], [114.3028, 30.5398]], { id: "admin-001", name: "滨江西区", code: "420101" }),
    areaFeature([[114.3093, 30.5229], [114.3147, 30.5226], [114.3145, 30.5286], [114.3148, 30.5340], [114.3144, 30.5401], [114.3097, 30.5402], [114.3092, 30.5340], [114.3095, 30.5285]], { id: "admin-002", name: "滨江中区", code: "420102" }),
    areaFeature([[114.3147, 30.5226], [114.3218, 30.5231], [114.3214, 30.5400], [114.3144, 30.5401], [114.3148, 30.5340], [114.3145, 30.5286]], { id: "admin-003", name: "滨江东区", code: "420103" }),
]);

const facilities = featureCollection([
    point([114.3086, 30.5290], { id: "poi-001", name: "滨江实验学校", category: "教育" }),
    point([114.3115, 30.5296], { id: "poi-002", name: "社区卫生服务中心", category: "医疗" }),
    point([114.3141, 30.5311], { id: "poi-003", name: "滨江公交首末站", category: "交通" }),
    point([114.3067, 30.5322], { id: "poi-004", name: "邻里服务中心", category: "公共服务" }),
    point([114.3158, 30.5344], { id: "poi-005", name: "科创公园", category: "公园" }),
    point([114.3100, 30.5350], { id: "poi-006", name: "文化活动中心", category: "文化" }),
    point([114.3166, 30.5277], { id: "poi-007", name: "滨江体育场", category: "体育" }),
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
    overlayLayer("public-facilities", "公共服务设施", "point", facilities, {
        opacity: 0.92,
        fillColor: "#0f766e",
        lineColor: "#ffffff",
        pointColor: "#0f766e",
        pointRadius: 5.5,
        lineWidth: 1.2,
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
    ["public-facilities.geojson", facilities],
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
