import {
    booleanIntersects,
    booleanPointInPolygon,
    pointOnFeature,
} from "@turf/turf";
import type {
    Feature,
    GeoJsonProperties,
    LineString,
    MultiLineString,
    MultiPolygon,
    Polygon,
} from "geojson";

import type { LandUseFeature } from "../../types/landUse";
import type { WorkspaceVectorLayer } from "../../types/mapLayer";
import type {
    ParcelAnalysisArtifacts,
    ParcelAnalysisExecutionContext,
    ParcelAnalysisLayerBindings,
    ParcelAnalysisPartialResults,
    ParcelAnalysisRunOutput,
    ParcelLineArtifactCollection,
    ParcelPlanningArtifactProperties,
    ParcelPlanningExecutionResult,
    ParcelPolygonArtifactCollection,
    ParcelQualitySummary,
    ParcelRestrictionArtifactProperties,
    ParcelRestrictionExecutionResult,
    ParcelSurroundingsExecutionResult,
} from "../../types/parcelAnalysis";
import { createBuffer } from "./buffer";
import { scanFeatureCollection } from "./dataQuality";
import {
    calculatePolygonFeatureAreaM2,
    intersectPolygonFeatures,
    unionPolygonFeatures,
    type OverlayPolygonFeature,
} from "./geoprocessing";
import { queryCollectionByGeometry } from "./spatialQuery";

export const PARCEL_ANALYSIS_BUFFER_DISTANCE_M = 500 as const;
const PLANNING_OVERLAP_TOLERANCE = 0.005;

export class ParcelAnalysisError extends Error {
    readonly step:
        | "preflight"
        | "quality"
        | "planning"
        | "restriction"
        | "surroundings";

    constructor(
        step:
            | "preflight"
            | "quality"
            | "planning"
            | "restriction"
            | "surroundings",
        message: string,
    ) {
        super(message);
        this.name = "ParcelAnalysisError";
        this.step = step;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readTextProperty(
    properties: GeoJsonProperties,
    keys: readonly string[],
    fallback: string,
) {
    if (!isRecord(properties)) return fallback;

    for (const key of keys) {
        const value = properties[key];
        if (typeof value === "string" && value.trim()) return value.trim();
        if (typeof value === "number" && Number.isFinite(value)) return String(value);
    }
    return fallback;
}

function getPolygonFeatures(layer: WorkspaceVectorLayer) {
    return layer.collection.features.flatMap((feature) =>
        feature.geometry.type === "Polygon" || feature.geometry.type === "MultiPolygon"
            ? [feature as OverlayPolygonFeature]
            : [],
    );
}

function getLineFeatures(layer: WorkspaceVectorLayer) {
    return layer.collection.features.flatMap((feature) =>
        feature.geometry.type === "LineString" || feature.geometry.type === "MultiLineString"
            ? [feature as Feature<LineString | MultiLineString, GeoJsonProperties>]
            : [],
    );
}

function getWaterFeatures(layer: WorkspaceVectorLayer) {
    return layer.collection.features.flatMap((feature) => {
        const type = feature.geometry.type;
        return type === "LineString" || type === "MultiLineString" ||
            type === "Polygon" || type === "MultiPolygon"
            ? [feature as Feature<
                LineString | MultiLineString | Polygon | MultiPolygon,
                GeoJsonProperties
            >]
            : [];
    });
}

function targetAsPolygon(target: LandUseFeature): OverlayPolygonFeature {
    return {
        type: "Feature",
        geometry: structuredClone(target.geometry),
        properties: { ...target.properties },
    };
}

function scoreLayerName(layer: WorkspaceVectorLayer, keywords: readonly string[]) {
    const name = layer.name.trim().toLocaleLowerCase();
    const exactIndex = keywords.findIndex((keyword) => name === keyword);
    if (exactIndex >= 0) return 100 - exactIndex;
    const containsIndex = keywords.findIndex((keyword) => name.includes(keyword));
    return containsIndex >= 0 ? 50 - containsIndex : -1;
}

function suggestLayer(
    layers: WorkspaceVectorLayer[],
    allowedKinds: ReadonlySet<WorkspaceVectorLayer["geometryKind"]>,
    keywords: readonly string[],
) {
    return layers
        .filter((layer) => allowedKinds.has(layer.geometryKind))
        .map((layer) => ({ layer, score: scoreLayerName(layer, keywords) }))
        .filter(({ score }) => score >= 0)
        .sort((left, right) => right.score - left.score)[0]?.layer.id ?? null;
}

export function suggestParcelAnalysisLayerBindings(
    layers: WorkspaceVectorLayer[],
): ParcelAnalysisLayerBindings {
    const polygonKinds = new Set<WorkspaceVectorLayer["geometryKind"]>(["polygon", "mixed"]);
    const lineKinds = new Set<WorkspaceVectorLayer["geometryKind"]>(["line", "mixed"]);
    const waterKinds = new Set<WorkspaceVectorLayer["geometryKind"]>(["line", "polygon", "mixed"]);

    return {
        planningLayerId: suggestLayer(layers, polygonKinds, ["规划用途", "planning", "规划"]),
        restrictionLayerId: suggestLayer(
            layers,
            polygonKinds,
            ["限制建设区域", "restrictions", "限制", "保护区", "控制区"],
        ),
        roadLayerId: suggestLayer(layers, lineKinds, ["道路", "roads", "road", "路网"]),
        waterLayerId: suggestLayer(layers, waterKinds, ["水系", "water", "河流", "河道"]),
        administrativeLayerId: suggestLayer(
            layers,
            polygonKinds,
            ["行政区边界", "administrative boundary", "行政区", "边界"],
        ),
    };
}

function findLayer(layers: WorkspaceVectorLayer[], layerId: string | null) {
    return layerId ? layers.find((layer) => layer.id === layerId) ?? null : null;
}

export function validateParcelAnalysisBindings(
    bindings: ParcelAnalysisLayerBindings,
    layers: WorkspaceVectorLayer[],
) {
    const errors: string[] = [];
    const planning = findLayer(layers, bindings.planningLayerId);
    const restriction = findLayer(layers, bindings.restrictionLayerId);
    const road = findLayer(layers, bindings.roadLayerId);

    if (!planning) errors.push("请配置规划用途图层。");
    else if (getPolygonFeatures(planning).length === 0) {
        errors.push("规划用途图层不包含 Polygon 或 MultiPolygon。");
    }
    if (!restriction) errors.push("请配置限制建设区域图层。");
    else if (getPolygonFeatures(restriction).length === 0) {
        errors.push("限制建设区域图层不包含 Polygon 或 MultiPolygon。");
    }
    if (!road) errors.push("请配置道路图层。");
    else if (getLineFeatures(road).length === 0) {
        errors.push("道路图层不包含 LineString 或 MultiLineString。");
    }
    return errors;
}

export function createParcelAnalysisExecutionContext(
    targetFeature: LandUseFeature,
    bindings: ParcelAnalysisLayerBindings,
    layers: WorkspaceVectorLayer[],
): ParcelAnalysisExecutionContext {
    const errors = validateParcelAnalysisBindings(bindings, layers);
    if (errors.length > 0) throw new ParcelAnalysisError("preflight", errors.join(" "));

    const planningLayer = findLayer(layers, bindings.planningLayerId);
    const restrictionLayer = findLayer(layers, bindings.restrictionLayerId);
    const roadLayer = findLayer(layers, bindings.roadLayerId);
    const waterLayer = findLayer(layers, bindings.waterLayerId);
    const administrativeLayer = findLayer(layers, bindings.administrativeLayerId);
    if (!planningLayer || !restrictionLayer || !roadLayer) {
        throw new ParcelAnalysisError("preflight", "必需分析图层不可用。");
    }

    return {
        targetFeature: structuredClone(targetFeature),
        bindings: { ...bindings },
        planningLayer: structuredClone(planningLayer),
        restrictionLayer: structuredClone(restrictionLayer),
        roadLayer: structuredClone(roadLayer),
        waterLayer: waterLayer ? structuredClone(waterLayer) : null,
        administrativeLayer: administrativeLayer ? structuredClone(administrativeLayer) : null,
    };
}

export function analyzeParcelQuality(targetFeature: LandUseFeature): ParcelQualitySummary {
    const report = scanFeatureCollection(
        { type: "FeatureCollection", features: [targetFeature] },
        {
            targetId: targetFeature.properties.id,
            targetName: targetFeature.properties.id,
            targetKind: "primary",
        },
    );
    return {
        status: report.errorCount > 0 ? "error" : report.warningCount > 0 ? "warning" : "pass",
        issueCount: report.issueCount,
        errorCount: report.errorCount,
        warningCount: report.warningCount,
        issues: report.issues.map(({ code, severity, message }) => ({ code, severity, message })),
    };
}

export function analyzeParcelPlanningUse(
    targetFeature: LandUseFeature,
    planningLayer: WorkspaceVectorLayer,
): ParcelPlanningExecutionResult {
    const target = targetAsPolygon(targetFeature);
    const targetAreaM2 = calculatePolygonFeatureAreaM2(target);
    if (targetAreaM2 <= 0) {
        throw new ParcelAnalysisError("planning", "目标地块面积无效，无法分析规划用途。");
    }

    const intersections: ParcelPolygonArtifactCollection["features"] = [];
    const totals = new Map<string, number>();
    for (const [index, planningFeature] of getPolygonFeatures(planningLayer).entries()) {
        const plannedUse = readTextProperty(
            planningFeature.properties,
            ["plannedUse", "planningUse", "landUseType", "name"],
            `未命名规划用途 ${index + 1}`,
        );
        try {
            const intersection = intersectPolygonFeatures(target, planningFeature, {
                artifactType: "planning" as const,
                plannedUse,
                areaM2: 0,
            });
            if (!intersection) continue;
            const areaM2 = calculatePolygonFeatureAreaM2(intersection);
            if (areaM2 <= 0) continue;
            const properties: ParcelPlanningArtifactProperties = {
                artifactType: "planning",
                plannedUse,
                areaM2,
            };
            intersections.push({ ...intersection, properties });
            totals.set(plannedUse, (totals.get(plannedUse) ?? 0) + areaM2);
        } catch {
            throw new ParcelAnalysisError(
                "planning",
                `规划用途要素“${plannedUse}”无法完成相交分析。`,
            );
        }
    }

    const items = [...totals]
        .map(([plannedUse, areaM2]) => ({ plannedUse, areaM2, ratio: areaM2 / targetAreaM2 }))
        .sort((left, right) => right.areaM2 - left.areaM2);
    const coveredAreaM2 = intersections.reduce((sum, feature) => sum + feature.properties.areaM2, 0);
    const rawCoverageRatio = coveredAreaM2 / targetAreaM2;
    return {
        result: {
            dominantUse: items[0]?.plannedUse ?? null,
            coveredAreaM2,
            coverageRatio: Math.min(1, rawCoverageRatio),
            uncoveredAreaM2: Math.max(0, targetAreaM2 - coveredAreaM2),
            hasOverlappingPlanningZones: rawCoverageRatio > 1 + PLANNING_OVERLAP_TOLERANCE,
            items,
        },
        intersections: { type: "FeatureCollection", features: intersections },
    };
}

export function analyzeParcelRestrictions(
    targetFeature: LandUseFeature,
    restrictionLayer: WorkspaceVectorLayer,
): ParcelRestrictionExecutionResult {
    const target = targetAsPolygon(targetFeature);
    const targetAreaM2 = calculatePolygonFeatureAreaM2(target);
    const intersections: ParcelPolygonArtifactCollection["features"] = [];
    const totals = new Map<string, number>();

    for (const [index, restrictionFeature] of getPolygonFeatures(restrictionLayer).entries()) {
        const restrictionType = readTextProperty(
            restrictionFeature.properties,
            ["restrictionType", "type", "name"],
            `未命名限制类型 ${index + 1}`,
        );
        try {
            const intersection = intersectPolygonFeatures(target, restrictionFeature, {
                artifactType: "restriction" as const,
                restrictionType,
                areaM2: 0,
            });
            if (!intersection) continue;
            const areaM2 = calculatePolygonFeatureAreaM2(intersection);
            if (areaM2 <= 0) continue;
            const properties: ParcelRestrictionArtifactProperties = {
                artifactType: "restriction",
                restrictionType,
                areaM2,
            };
            intersections.push({ ...intersection, properties });
            totals.set(restrictionType, (totals.get(restrictionType) ?? 0) + areaM2);
        } catch {
            throw new ParcelAnalysisError(
                "restriction",
                `限制区域要素“${restrictionType}”无法完成相交分析。`,
            );
        }
    }

    let overlapAreaM2 = 0;
    if (intersections.length > 0) {
        try {
            const dissolved = unionPolygonFeatures(
                intersections.map(({ geometry, properties }) => ({ type: "Feature", geometry, properties })),
                { analysisOperation: "parcel-restriction-union" },
            );
            if (!dissolved) throw new Error("Union returned no geometry.");
            overlapAreaM2 = calculatePolygonFeatureAreaM2(dissolved);
        } catch {
            throw new ParcelAnalysisError(
                "restriction",
                "限制区域重叠范围无法合并，不能可靠计算去重后的冲突面积。",
            );
        }
    }

    const items = [...totals]
        .map(([restrictionType, areaM2]) => ({
            restrictionType,
            areaM2,
            ratio: targetAreaM2 > 0 ? areaM2 / targetAreaM2 : 0,
        }))
        .sort((left, right) => right.areaM2 - left.areaM2);
    return {
        result: {
            hasConflict: overlapAreaM2 > 0,
            overlapAreaM2,
            overlapRatio: targetAreaM2 > 0 ? Math.min(1, overlapAreaM2 / targetAreaM2) : 0,
            conflictFeatureCount: intersections.length,
            items,
        },
        intersections: { type: "FeatureCollection", features: intersections },
    };
}

export function analyzeParcelSurroundings(
    targetFeature: LandUseFeature,
    roadLayer: WorkspaceVectorLayer,
    waterLayer: WorkspaceVectorLayer | null,
    administrativeLayer: WorkspaceVectorLayer | null,
): ParcelSurroundingsExecutionResult {
    let buffer500m;
    try {
        buffer500m = createBuffer(targetFeature, PARCEL_ANALYSIS_BUFFER_DISTANCE_M);
    } catch {
        throw new ParcelAnalysisError("surroundings", "无法生成目标地块 500 米分析范围。");
    }

    const roadCollection: ParcelLineArtifactCollection = {
        type: "FeatureCollection",
        features: getLineFeatures(roadLayer),
    };
    if (roadCollection.features.length === 0) {
        throw new ParcelAnalysisError("surroundings", "道路图层没有可用于查询的线要素。");
    }

    let roadMatches: ParcelLineArtifactCollection["features"];
    try {
        roadMatches = queryCollectionByGeometry(roadCollection, buffer500m, "intersects");
    } catch {
        throw new ParcelAnalysisError("surroundings", "500 米道路空间查询失败。");
    }
    const roadsWithinBuffer: ParcelLineArtifactCollection = {
        type: "FeatureCollection",
        features: roadMatches,
    };
    const roadNames = [...new Set(roadMatches.map((feature, index) =>
        readTextProperty(feature.properties, ["name", "roadName"], `道路要素 ${index + 1}`),
    ))];
    const roadClassSummary: Record<string, number> = {};
    roadMatches.forEach((feature) => {
        const roadClass = readTextProperty(feature.properties, ["roadClass", "class", "type"], "未分类");
        roadClassSummary[roadClass] = (roadClassSummary[roadClass] ?? 0) + 1;
    });

    const warnings: string[] = [];
    let waterIntersectsTarget: boolean | null = null;
    let waterFeatureCount: number | null = null;
    let waterNames: string[] = [];
    let waterWithinBuffer: ParcelAnalysisArtifacts["waterWithinBuffer"] = {
        type: "FeatureCollection",
        features: [],
    };
    if (waterLayer) {
        try {
            const waterFeatures = getWaterFeatures(waterLayer);
            const matches = queryCollectionByGeometry(
                { type: "FeatureCollection", features: waterFeatures },
                buffer500m,
                "intersects",
            );
            waterWithinBuffer = { type: "FeatureCollection", features: matches };
            waterFeatureCount = matches.length;
            waterIntersectsTarget = waterFeatures.some((feature) => {
                try { return booleanIntersects(feature, targetFeature); }
                catch { return false; }
            });
            waterNames = [...new Set(matches.map((feature, index) =>
                readTextProperty(feature.properties, ["name", "waterName"], `水系要素 ${index + 1}`),
            ))];
        } catch {
            warnings.push("水系图层无法完成空间查询。");
        }
    }

    let administrativeAreaName: string | null = null;
    let administrativeAreaCode: string | null = null;
    if (administrativeLayer) {
        try {
            const representativePoint = pointOnFeature(targetFeature);
            const administrativeFeature = getPolygonFeatures(administrativeLayer)
                .find((feature) => booleanPointInPolygon(representativePoint, feature));
            if (administrativeFeature) {
                administrativeAreaName = readTextProperty(
                    administrativeFeature.properties,
                    ["name", "districtName"],
                    "未命名行政区域",
                );
                administrativeAreaCode = readTextProperty(
                    administrativeFeature.properties,
                    ["code", "districtCode"],
                    "",
                ) || null;
            }
        } catch {
            warnings.push("行政区图层无法确定目标地块所在区域。");
        }
    }

    return {
        result: {
            bufferDistanceM: PARCEL_ANALYSIS_BUFFER_DISTANCE_M,
            roadFeatureCount: roadMatches.length,
            roadNames,
            roadClassSummary,
            waterConfigured: waterLayer !== null,
            waterIntersectsTarget,
            waterFeatureCount,
            waterNames,
            administrativeConfigured: administrativeLayer !== null,
            administrativeAreaName,
            administrativeAreaCode,
        },
        buffer500m,
        roadsWithinBuffer,
        waterWithinBuffer,
        warnings,
    };
}

export function runParcelAnalysis(
    context: ParcelAnalysisExecutionContext,
): ParcelAnalysisRunOutput {
    const quality = analyzeParcelQuality(context.targetFeature);
    if (quality.status === "error") {
        throw new ParcelAnalysisError(
            "quality",
            "目标地块几何或必需属性存在错误，无法继续空间分析。",
        );
    }
    const planning = analyzeParcelPlanningUse(context.targetFeature, context.planningLayer);
    const restrictions = analyzeParcelRestrictions(context.targetFeature, context.restrictionLayer);
    const surroundings = analyzeParcelSurroundings(
        context.targetFeature,
        context.roadLayer,
        context.waterLayer,
        context.administrativeLayer,
    );
    return assembleParcelAnalysis(context, quality, planning, restrictions, surroundings);
}

export function assembleParcelAnalysis(
    context: ParcelAnalysisExecutionContext,
    quality: ParcelQualitySummary,
    planning: ParcelPlanningExecutionResult,
    restrictions: ParcelRestrictionExecutionResult,
    surroundings: ParcelSurroundingsExecutionResult,
): ParcelAnalysisRunOutput {
    return assembleParcelAnalysisResult(context.targetFeature, context.bindings, {
        quality,
        planning,
        restrictions,
        surroundings,
    });
}

export function assembleParcelAnalysisResult(
    targetFeature: LandUseFeature,
    bindings: ParcelAnalysisLayerBindings,
    partial: ParcelAnalysisPartialResults,
): ParcelAnalysisRunOutput {
    const targetAreaM2 = calculatePolygonFeatureAreaM2(targetAsPolygon(targetFeature));
    const analysisId = crypto.randomUUID();
    return {
        result: {
            id: analysisId,
            generatedAt: Date.now(),
            target: {
                featureId: targetFeature.properties.id,
                landUseType: targetFeature.properties.landUseType,
                areaM2: targetAreaM2,
                builtYear: targetFeature.properties.builtYear,
                districtCode: targetFeature.properties.districtCode,
            },
            quality: partial.quality,
            planning: partial.planning?.result ?? null,
            restrictions: partial.restrictions?.result ?? null,
            surroundings: partial.surroundings?.result ?? null,
            sources: { ...bindings },
        },
        artifacts: {
            analysisId,
            targetFeature,
            planningIntersections: partial.planning?.intersections ?? {
                type: "FeatureCollection",
                features: [],
            },
            restrictionIntersections: partial.restrictions?.intersections ?? {
                type: "FeatureCollection",
                features: [],
            },
            buffer500m: partial.surroundings?.buffer500m ?? null,
            roadsWithinBuffer: partial.surroundings?.roadsWithinBuffer ?? {
                type: "FeatureCollection",
                features: [],
            },
            waterWithinBuffer: partial.surroundings?.waterWithinBuffer ?? {
                type: "FeatureCollection",
                features: [],
            },
        },
    };
}
