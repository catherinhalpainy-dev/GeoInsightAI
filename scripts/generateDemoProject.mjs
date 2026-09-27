import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import {
    area,
    bbox,
    booleanCrosses,
    booleanIntersects,
    booleanValid,
    booleanWithin,
    buffer,
    featureCollection,
    intersect,
    kinks,
    lineString,
    point,
    polygon,
    union,
} from "@turf/turf";

const outputRoot = resolve("public/demo-data/parcel-review");
const sourceRoot = resolve(outputRoot, "source");
const generatedAt = 1_735_689_600_000;

// A deterministic local meter grid makes parcel sizes and offsets intentional while
// keeping the final data in EPSG:4326. The scene is synthetic and not cadastral data.
const origin = [114.3123, 30.5316];
const metersPerDegreeLatitude = 110_540;
const metersPerDegreeLongitude = 111_320 * Math.cos(origin[1] * Math.PI / 180);

function coordinate([x, y]) {
    return [
        Number((origin[0] + x / metersPerDegreeLongitude).toFixed(7)),
        Number((origin[1] + y / metersPerDegreeLatitude).toFixed(7)),
    ];
}

function areaFeature(points, properties = {}) {
    const ring = points.map(coordinate);
    const first = ring[0];
    const last = ring.at(-1);
    if (!last || last[0] !== first[0] || last[1] !== first[1]) ring.push([...first]);
    return polygon([ring], properties);
}

function lineFeature(points, properties = {}) {
    return lineString(points.map(coordinate), properties);
}

function pointFeature(position, properties = {}) {
    return point(coordinate(position), properties);
}

function requireBufferedFeature(feature, distanceM, label) {
    const result = buffer(feature, distanceM, { units: "meters", steps: 16 });
    if (!result) throw new Error(`Unable to buffer ${label}.`);
    return result;
}

function parcel(id, landUseType, districtCode, builtYear, points) {
    const feature = areaFeature(points, { id, landUseType, areaM2: 0, districtCode, builtYear });
    feature.properties.areaM2 = Number(area(feature).toFixed(2));
    return feature;
}

// The road and water corridors are designed first. Parcels below occupy the
// resulting blocks and retain clear gaps along these alignments.
const roads = featureCollection([
    lineFeature([[-980, -5], [-720, 8], [-450, -6], [-180, 12], [90, 0], [380, 16], [690, 5], [1020, 24]], { id: "road-001", name: "滨江大道", roadClass: "primary" }),
    lineFeature([[-520, -820], [-420, -700], [-390, -550], [-385, -330], [-380, -80], [-375, 180], [-365, 430], [-330, 500], [-320, 650], [-240, 700], [0, 930]], { id: "road-002", name: "创新大道", roadClass: "primary" }),
    lineFeature([[-970, -390], [-700, -378], [-430, -402], [-120, -388], [190, -405], [510, -382], [850, -395], [1030, -370]], { id: "road-003", name: "清河路", roadClass: "secondary" }),
    lineFeature([[-920, 465], [-650, 450], [-360, 470], [-70, 448], [230, 468], [550, 450], [880, 475]], { id: "road-004", name: "临湖路", roadClass: "secondary" }),
    lineFeature([[310, -790], [300, -570], [318, -335], [305, -105], [322, 145], [310, 390], [330, 650], [315, 880]], { id: "road-005", name: "文景路", roadClass: "secondary" }),
    lineFeature([[-410, -760], [-395, -540], [-405, -305], [-390, -65], [-405, 205], [-390, 430], [-402, 760]], { id: "road-006", name: "松涛路", roadClass: "secondary" }),
    lineFeature([[-960, -735], [-620, -720], [-270, -742], [90, -725], [460, -750], [830, -730], [1020, -742]], { id: "road-007", name: "南环路", roadClass: "secondary" }),
    lineFeature([[965, -690], [948, -420], [970, -140], [952, 150], [976, 430], [958, 760]], { id: "road-008", name: "东港路", roadClass: "secondary" }),
    lineFeature([[-975, -670], [-955, -390], [-970, -100], [-952, 200], [-968, 510], [-950, 820]], { id: "road-009", name: "西堤路", roadClass: "secondary" }),
    lineFeature([[-815, -655], [-795, -570], [-805, -480]], { id: "road-010", name: "栖霞街", roadClass: "local" }),
    lineFeature([[-335, -690], [-160, -680], [20, -695], [245, -682]], { id: "road-011", name: "景和街", roadClass: "local" }),
    lineFeature([[-305, 48], [-95, 55], [120, 45], [275, 62]], { id: "road-012", name: "望江支路", roadClass: "local" }),
    lineFeature([[360, -305], [505, -298], [650, -310], [845, -300]], { id: "road-013", name: "学府路", roadClass: "local" }),
    lineFeature([[-840, 495], [-660, 505], [-485, 498]], { id: "road-014", name: "榆林街", roadClass: "local" }),
    lineFeature([[510, 500], [512, 560], [510, 630]], { id: "road-015", name: "青禾路", roadClass: "local" }),
    lineFeature([[-890, -305], [-760, -292], [-620, -305]], { id: "road-016", name: "滨水支路", roadClass: "local" }),
    lineFeature([[590, 810], [725, 825], [890, 815]], { id: "road-017", name: "科创北路", roadClass: "local" }),
    lineFeature([[570, -690], [710, -680], [860, -670]], { id: "road-018", name: "港城支路", roadClass: "local" }),
]);

const water = featureCollection([
    lineFeature([[-1050, -320], [-870, -300], [-680, -325], [-480, -307], [-270, -335], [-55, -315], [165, -342], [385, -318], [610, -338], [835, -312], [1070, -330]], { id: "water-001", name: "清河", waterType: "river" }),
    lineFeature([[820, 850], [800, 730], [825, 610], [805, 485], [830, 355], [812, 220], [835, 90], [820, -45], [842, -175]], { id: "water-002", name: "东港排水渠", waterType: "canal" }),
]);

const primaryFeatures = [
    // South-west waterfront block
    parcel("parcel-001", "green", "420101", null, [[-780, -655], [-625, -650], [-610, -555], [-770, -540]]),
    parcel("parcel-002", "public", "420101", 2018, [[-610, -650], [-430, -638], [-438, -545], [-610, -555]]),
    parcel("parcel-003", "green", "420101", null, [[-770, -525], [-590, -540], [-570, -445], [-755, -448]]),
    parcel("parcel-004", "commercial", "420101", 2015, [[-575, -535], [-438, -540], [-425, -448], [-565, -445]]),

    // South-central mixed employment block
    parcel("parcel-005", "industrial", "420102", 2003, [[-345, -650], [-165, -660], [-150, -565], [-332, -550]]),
    parcel("parcel-006", "industrial", "420102", 2008, [[-150, -660], [42, -650], [35, -555], [-150, -565]]),
    parcel("parcel-007", "transportation", "420102", 2016, [[55, -650], [250, -625], [230, -540], [38, -555]]),
    parcel("parcel-008", "industrial", "420102", 2001, [[-330, -535], [-85, -548], [-72, -448], [-315, -452]]),
    parcel("parcel-009", "public", "420102", 2019, [[-68, -540], [230, -525], [218, -445], [-72, -448]]),

    // South-east production block
    parcel("parcel-010", "industrial", "420103", 1998, [[350, -655], [520, -642], [530, -560], [360, -548]]),
    parcel("parcel-011", "industrial", "420103", 2006, [[535, -640], [845, -650], [830, -548], [532, -560]]),
    parcel("parcel-012", "transportation", "420103", 2012, [[360, -535], [575, -550], [590, -445], [375, -438]]),
    parcel("parcel-013", "industrial", "420103", 2009, [[590, -545], [835, -535], [842, -440], [590, -445]]),

    // West riverside block
    parcel("parcel-014", "green", "420101", null, [[-820, -280], [-650, -295], [-625, -165], [-805, -150]]),
    parcel("parcel-015", "commercial", "420101", 2011, [[-635, -292], [-435, -280], [-440, -145], [-625, -165]]),
    parcel("parcel-016", "residential", "420101", 2007, [[-805, -135], [-625, -150], [-610, -42], [-790, -35]]),
    parcel("parcel-017", "public", "420101", 2020, [[-610, -145], [-438, -135], [-430, -40], [-610, -42]]),

    // Central block. The target is a mid-sized irregular commercial parcel.
    parcel("parcel-018", "commercial", "420102", 2010, [[-325, 65], [-105, 70], [-100, 218], [-315, 205]]),
    parcel("parcel-019", "residential", "420102", 2005, [[-315, 220], [-105, 235], [-82, 392], [-300, 385]]),
    parcel("parcel-target-001", "commercial", "420102", 2012, [[-80, 90], [120, 75], [190, 135], [160, 240], [35, 270], [-75, 205]]),
    parcel("parcel-020", "transportation", "420102", 2017, [[220, 80], [275, 82], [270, 155], [218, 150]]),
    parcel("parcel-021", "public", "420102", 2021, [[-65, 300], [42, 285], [175, 258], [272, 260], [268, 390], [-58, 398]]),

    // East neighbourhood block
    parcel("parcel-022", "commercial", "420103", 2014, [[370, -280], [525, -260], [510, -145], [360, -150]]),
    parcel("parcel-023", "transportation", "420103", 2018, [[540, -255], [690, -205], [665, -95], [505, -140]]),
    parcel("parcel-024", "commercial", "420103", 2016, [[700, -198], [850, -155], [842, -42], [675, -90]]),
    parcel("parcel-025", "residential", "420103", 2009, [[365, 55], [520, 48], [530, 205], [372, 215]]),
    parcel("parcel-026", "residential", "420103", 2013, [[535, 50], [705, 62], [690, 220], [530, 205]]),
    parcel("parcel-027", "public", "420103", 2022, [[715, 65], [850, 78], [840, 230], [690, 220]]),
    parcel("parcel-028", "residential", "420103", 2011, [[372, 230], [540, 220], [525, 395], [365, 385]]),
    parcel("parcel-029", "residential", "420103", 2015, [[550, 230], [840, 245], [835, 392], [525, 395]]),

    // Northern residential and civic blocks
    parcel("parcel-030", "residential", "420101", 2004, [[-820, 525], [-650, 510], [-620, 765], [-800, 780]]),
    parcel("parcel-031", "public", "420101", 2018, [[-635, 510], [-435, 525], [-450, 650], [-625, 648]]),
    parcel("parcel-032", "residential", "420101", 2010, [[-625, 662], [-448, 665], [-430, 785], [-620, 775]]),
    parcel("parcel-033", "residential", "420102", 2008, [[-305, 525], [-112, 515], [-105, 635], [-292, 650]]),
    parcel("parcel-034", "residential", "420102", 2012, [[-95, 515], [120, 525], [110, 640], [-105, 635]]),
    parcel("parcel-035", "commercial", "420102", 2020, [[130, 525], [275, 535], [272, 640], [110, 640]]),
    parcel("parcel-036", "public", "420103", 2023, [[365, 525], [452, 522], [450, 618], [370, 625]]),
    parcel("parcel-037", "residential", "420103", 2016, [[530, 525], [785, 535], [770, 640], [525, 620]]),
    parcel("parcel-038", "green", "420103", null, [[365, 645], [500, 630], [785, 655], [775, 790], [370, 780]]),
    parcel("parcel-039", "public", "420103", 2024, [[462, 530], [498, 528], [495, 610], [460, 612]]),
];

const landuse = featureCollection(primaryFeatures);
const target = primaryFeatures.find(({ properties }) => properties.id === "parcel-target-001");
if (!target) throw new Error("Target parcel was not generated.");

// Zones span multiple parcels. Two adjacent zones split the target while a small
// northern cap remains uncovered, producing an explainable review result.
const planning = featureCollection([
    areaFeature([[-900, 20], [105, 20], [105, 240], [-350, 260], [-900, 245]], { id: "planning-commercial", name: "滨江商业服务区", plannedUse: "商业服务业用地" }),
    areaFeature([[105, 20], [900, 30], [900, 245], [420, 258], [105, 240]], { id: "planning-public", name: "文景公共服务片区", plannedUse: "公共管理与公共服务用地" }),
    areaFeature([[-900, 485], [-120, 485], [285, 500], [280, 850], [-900, 850]], { id: "planning-residential", name: "北部宜居生活组团", plannedUse: "居住用地" }),
    areaFeature([[345, 485], [900, 500], [900, 850], [345, 850]], { id: "planning-innovation", name: "东部创新居住组团", plannedUse: "居住与研发混合用地" }),
    areaFeature([[-900, -700], [900, -700], [900, -425], [120, -430], [-900, -415]], { id: "planning-industrial", name: "南部产业更新区", plannedUse: "工业用地" }),
    areaFeature([[-930, -410], [-520, -405], [-350, -335], [-470, -275], [-920, -270]], { id: "planning-green", name: "清河生态绿廊", plannedUse: "公园绿地" }),
]);

const waterProtection = requireBufferedFeature(water.features[0], 48, "water protection corridor");
waterProtection.properties = { id: "restriction-river-buffer", name: "清河保护带", restrictionType: "河道保护带", level: "严格控制" };
const infrastructureAxis = lineFeature([[172, -80], [178, 70], [174, 230], [185, 390]], { id: "infrastructure-axis" });
const infrastructureCorridor = requireBufferedFeature(infrastructureAxis, 12, "infrastructure corridor");
infrastructureCorridor.properties = { id: "restriction-infrastructure-corridor", name: "市政设施控制走廊", restrictionType: "基础设施控制带", level: "控制建设" };
const restrictions = featureCollection([
    waterProtection,
    areaFeature([[-125, 188], [-15, 182], [24, 262], [-68, 304], [-155, 245]], { id: "restriction-ecological", name: "古树与生态保育斑块", restrictionType: "生态保护区", level: "限制建设" }),
    infrastructureCorridor,
    areaFeature([[560, -610], [820, -585], [850, -455], [690, -420], [540, -500]], { id: "restriction-flood-storage", name: "东南调蓄控制区", restrictionType: "防洪调蓄区", level: "限制建设" }),
]);

// Bent shared boundaries replace the old rectangular administrative strips.
const administrativeBoundary = featureCollection([
    areaFeature([[-1080, -880], [-260, -860], [-270, -420], [-245, 10], [-270, 450], [-230, 950], [-1080, 930]], { id: "admin-001", name: "滨江西区", code: "420101" }),
    areaFeature([[-260, -860], [520, -870], [500, -430], [535, 20], [510, 460], [540, 940], [-230, 950], [-270, 450], [-245, 10], [-270, -420]], { id: "admin-002", name: "滨江中区", code: "420102" }),
    areaFeature([[520, -870], [1100, -850], [1100, 940], [540, 940], [510, 460], [535, 20], [500, -430]], { id: "admin-003", name: "滨江东区", code: "420103" }),
]);

const facilities = featureCollection([
    pointFeature([-540, 140], { id: "poi-001", name: "滨江实验学校", category: "教育" }),
    pointFeature([48, 350], { id: "poi-002", name: "文景社区卫生服务中心", category: "医疗" }),
    pointFeature([342, -35], { id: "poi-003", name: "滨江公交首末站", category: "交通" }),
    pointFeature([-520, 505], { id: "poi-004", name: "松涛邻里中心", category: "公共服务" }),
    pointFeature([690, 465], { id: "poi-005", name: "青禾公园", category: "公园" }),
    pointFeature([-165, 465], { id: "poi-006", name: "滨江文化活动中心", category: "文化" }),
    pointFeature([540, 20], { id: "poi-007", name: "文景体育场", category: "体育" }),
    pointFeature([-730, -390], { id: "poi-008", name: "清河驿站", category: "公共服务" }),
    pointFeature([820, -390], { id: "poi-009", name: "东港消防站", category: "应急" }),
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
        origin: { type: "local-geojson", filename: `${id}.geojson` },
    };
}

const overlayLayers = [
    overlayLayer("restrictions", "限制建设区域", "polygon", restrictions, { opacity: 0.16, fillColor: "#d97706", lineColor: "#dc2626", pointColor: "#dc2626", lineWidth: 2 }),
    overlayLayer("planning", "规划用途", "polygon", planning, { opacity: 0.13, fillColor: "#6366f1", lineColor: "#6366f1", pointColor: "#6366f1", lineWidth: 1.5 }),
    overlayLayer("roads", "道路", "line", roads, { opacity: 0.88, fillColor: "#78716c", lineColor: "#78716c", pointColor: "#78716c", lineWidth: 2 }),
    overlayLayer("water", "水系", "line", water, { opacity: 0.9, fillColor: "#3b82f6", lineColor: "#3b82f6", pointColor: "#3b82f6", lineWidth: 2.2 }),
    overlayLayer("administrative-boundary", "行政区边界", "polygon", administrativeBoundary, { opacity: 0.04, fillColor: "#94a3b8", lineColor: "#64748b", pointColor: "#64748b", lineWidth: 1.4 }),
    overlayLayer("public-facilities", "公共服务设施", "point", facilities, { opacity: 0.92, fillColor: "#0f766e", lineColor: "#ffffff", pointColor: "#0f766e", pointRadius: 5.5, lineWidth: 1.2 }),
];

function validatePolygonCollection(collection, label) {
    for (const feature of collection.features) {
        const featureId = feature.properties?.id ?? "unknown";
        if (!booleanValid(feature) || kinks(feature).features.length > 0) {
            throw new Error(`${label} contains invalid geometry: ${featureId}`);
        }
    }
}

validatePolygonCollection(landuse, "Primary dataset");
validatePolygonCollection(planning, "Planning layer");
validatePolygonCollection(restrictions, "Restriction layer");
validatePolygonCollection(administrativeBoundary, "Administrative layer");

for (const feature of landuse.features) {
    const calculatedAreaM2 = area(feature);
    if (!Number.isFinite(calculatedAreaM2) || calculatedAreaM2 <= 0) throw new Error(`Primary feature has invalid area: ${feature.properties.id}`);
    if (Math.abs(calculatedAreaM2 - feature.properties.areaM2) > 1) throw new Error(`areaM2 is inconsistent for ${feature.properties.id}`);
}

const targetAreaM2 = area(target);
const planningIntersections = planning.features.flatMap((zone) => {
    const result = intersect(featureCollection([target, zone]));
    return result && area(result) > 0 ? [{ plannedUse: zone.properties.plannedUse, areaM2: area(result) }] : [];
});
const planningItems = planningIntersections
    .map((item) => ({ ...item, ratio: item.areaM2 / targetAreaM2 }))
    .sort((left, right) => right.areaM2 - left.areaM2);
const planningCoverageRatio = planningItems.reduce((sum, item) => sum + item.ratio, 0);

const restrictionIntersections = restrictions.features.flatMap((restriction) => {
    const result = intersect(featureCollection([target, restriction]));
    return result && area(result) > 0 ? [result] : [];
});
const restrictionUnion = restrictionIntersections.length === 0
    ? null
    : restrictionIntersections.length === 1
        ? restrictionIntersections[0]
        : union(featureCollection(restrictionIntersections));
const restrictionOverlapAreaM2 = restrictionUnion ? area(restrictionUnion) : 0;
const restrictionOverlapRatio = restrictionOverlapAreaM2 / targetAreaM2;

const targetBuffer = requireBufferedFeature(target, 500, "target parcel");
const roadsWithinBuffer = roads.features.filter((road) => booleanIntersects(road, targetBuffer));
const waterWithinBuffer = water.features.filter((waterFeature) => booleanIntersects(waterFeature, targetBuffer));
const waterIntersectsTarget = water.features.some((waterFeature) => booleanIntersects(waterFeature, target));
const containingAdministrativeAreas = administrativeBoundary.features.filter((boundary) => booleanWithin(target, boundary));
const parcelAreas = landuse.features.map((feature) => feature.properties.areaM2);
const roadParcelCrossings = roads.features.flatMap((road) =>
    landuse.features
        .filter((landParcel) => booleanCrosses(road, landParcel))
        .map((landParcel) => `${road.properties.id}:${landParcel.properties.id}`),
);

const validationSummary = {
    primaryFeatureCount: landuse.features.length,
    parcelAreaRangeM2: [Math.min(...parcelAreas), Math.max(...parcelAreas)],
    targetFeatureId: target.properties.id,
    targetAreaM2,
    planningFeatureCount: planning.features.length,
    targetPlanningIntersectionCount: planningItems.length,
    dominantPlanningUse: planningItems[0]?.plannedUse ?? null,
    dominantPlanningRatio: planningItems[0]?.ratio ?? 0,
    secondaryPlanningRatio: planningItems[1]?.ratio ?? 0,
    planningCoverageRatio,
    restrictionFeatureCount: restrictions.features.length,
    restrictionOverlapAreaM2,
    restrictionOverlapRatio,
    roadFeatureCount: roads.features.length,
    roadsWithin500m: roadsWithinBuffer.length,
    roadsOutside500m: roads.features.length - roadsWithinBuffer.length,
    roadParcelCrossingCount: roadParcelCrossings.length,
    roadParcelCrossings,
    waterIntersectsTarget,
    waterWithin500m: waterWithinBuffer.length,
    administrativeMatchCount: containingAdministrativeAreas.length,
    administrativeArea: containingAdministrativeAreas[0]?.properties.name ?? null,
};

if (
    targetAreaM2 < 30_000 || targetAreaM2 > 50_000 ||
    planningItems.length < 2 || planningItems[0].ratio < 0.65 || planningItems[0].ratio > 0.8 ||
    planningItems[1].ratio < 0.15 || planningItems[1].ratio > 0.3 ||
    planningCoverageRatio < 0.85 || planningCoverageRatio > 0.98 ||
    restrictionIntersections.length < 1 || restrictionOverlapRatio < 0.1 || restrictionOverlapRatio > 0.25 ||
    roadsWithinBuffer.length < 5 || roadsWithinBuffer.length > 10 || roadsWithinBuffer.length === roads.features.length ||
    roadParcelCrossings.length > 2 ||
    waterIntersectsTarget || waterWithinBuffer.length < 1 || containingAdministrativeAreas.length !== 1 ||
    Math.max(...parcelAreas) / Math.min(...parcelAreas) < 4
) {
    console.error(JSON.stringify(validationSummary, null, 2));
    throw new Error("Demo data does not meet the parcel-review realism constraints.");
}

const targetBounds = bbox(targetBuffer);
const project = {
    format: "geoinsight-project",
    version: 1,
    project: { id: "demo-parcel-review-template", name: "滨江地块开发条件分析", createdAt: generatedAt, updatedAt: generatedAt },
    data: {
        primaryDataset: { id: "demo-landuse-current", name: "土地利用现状", sourceCrs: "EPSG:4326", collection: landuse },
        overlayLayers,
        rasterLayers: [],
        analysisResultLayers: [],
    },
    map: {
        basemap: "light",
        center: [Number(((targetBounds[0] + targetBounds[2]) / 2).toFixed(7)), Number(((targetBounds[1] + targetBounds[3]) / 2).toFixed(7))],
        zoom: 14.35,
        bearing: 0,
        pitch: 0,
    },
    workspace: {
        filters: { landUseTypes: ["residential", "commercial", "industrial", "green", "public", "transportation", "other"], minimumBuiltYear: null, districtCode: "" },
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
    ...[...files].map(([name, collection]) => writeFile(resolve(sourceRoot, name), `${JSON.stringify(collection, null, 2)}\n`, "utf8")),
    writeFile(resolve(outputRoot, "demo.geoinsight"), `${JSON.stringify(project, null, 2)}\n`, "utf8"),
]);

console.log(JSON.stringify({
    ...validationSummary,
    parcelAreaRangeM2: validationSummary.parcelAreaRangeM2.map((value) => Number(value.toFixed(2))),
    targetAreaM2: Number(targetAreaM2.toFixed(2)),
    dominantPlanningRatio: Number((validationSummary.dominantPlanningRatio * 100).toFixed(2)),
    secondaryPlanningRatio: Number((validationSummary.secondaryPlanningRatio * 100).toFixed(2)),
    planningCoverageRatio: Number((planningCoverageRatio * 100).toFixed(2)),
    restrictionOverlapAreaM2: Number(restrictionOverlapAreaM2.toFixed(2)),
    restrictionOverlapRatio: Number((restrictionOverlapRatio * 100).toFixed(2)),
}, null, 2));
