import { LAND_USE_LABELS } from "../../constants/landUse";
import type { WorkspaceVectorLayer } from "../../types/mapLayer";
import type { ParcelAnalysisResult } from "../../types/parcelAnalysis";
import type {
    ParcelAnalysisReportSnapshot,
    ReportSnapshot,
} from "../../types/report";

export interface CreateParcelAnalysisReportSnapshotInput {
    baseSnapshot: ReportSnapshot;
    result: ParcelAnalysisResult;
    primaryLayerName: string;
    overlayLayers: WorkspaceVectorLayer[];
}

function resolveLayerName(
    layers: WorkspaceVectorLayer[],
    layerId: string | null,
) {
    if (!layerId) return null;
    return layers.find((layer) => layer.id === layerId)?.name ?? null;
}

function copyParcelFacts(
    input: CreateParcelAnalysisReportSnapshotInput,
): ParcelAnalysisReportSnapshot {
    const { result, overlayLayers } = input;
    const planning = result.planning;
    const restrictions = result.restrictions;
    const surroundings = result.surroundings;

    if (result.quality.status === "error") {
        throw new Error("目标地块存在阻断性几何质量错误，无法生成一致的空间分析报告。");
    }

    return {
        analysisId: result.id,
        generatedAt: result.generatedAt,
        target: {
            featureId: result.target.featureId,
            currentUse: LAND_USE_LABELS[result.target.landUseType],
            areaM2: result.target.areaM2,
            builtYear: result.target.builtYear,
            districtCode: result.target.districtCode,
            administrativeAreaName:
                surroundings?.administrativeAreaName ?? null,
        },
        quality: {
            status: result.quality.status,
            errorCount: result.quality.errorCount,
            warningCount: result.quality.warningCount,
            issues: result.quality.issues.map((issue) => ({ ...issue })),
        },
        planning: {
            available: planning !== null,
            dominantUse: planning?.dominantUse ?? null,
            coverageAreaM2: planning?.coveredAreaM2 ?? null,
            coverageRatio: planning?.coverageRatio ?? null,
            uncoveredAreaM2: planning?.uncoveredAreaM2 ?? null,
            hasOverlappingPlanningZones:
                planning?.hasOverlappingPlanningZones ?? false,
            items: planning?.items.map((item) => ({
                use: item.plannedUse,
                areaM2: item.areaM2,
                ratio: item.ratio,
            })) ?? [],
        },
        restrictions: {
            available: restrictions !== null,
            hasConflict: restrictions?.hasConflict ?? false,
            overlapAreaM2: restrictions?.overlapAreaM2 ?? null,
            overlapRatio: restrictions?.overlapRatio ?? null,
            conflictFeatureCount: restrictions?.conflictFeatureCount ?? null,
            items: restrictions?.items.map((item) => ({
                type: item.restrictionType,
                areaM2: item.areaM2,
                ratio: item.ratio,
            })) ?? [],
        },
        surroundings: {
            available: surroundings !== null,
            bufferDistanceM: surroundings?.bufferDistanceM ?? null,
            roadFeatureCount: surroundings?.roadFeatureCount ?? null,
            roadClassSummary: surroundings
                ? { ...surroundings.roadClassSummary }
                : {},
            waterConfigured: surroundings?.waterConfigured ?? false,
            waterFeatureCount: surroundings?.waterFeatureCount ?? null,
            waterIntersectsTarget:
                surroundings?.waterIntersectsTarget ?? null,
            administrativeConfigured:
                surroundings?.administrativeConfigured ?? false,
            administrativeAreaName:
                surroundings?.administrativeAreaName ?? null,
        },
        sources: {
            primaryLayerName: input.primaryLayerName,
            planningLayerName: resolveLayerName(
                overlayLayers,
                result.sources.planningLayerId,
            ),
            restrictionLayerName: resolveLayerName(
                overlayLayers,
                result.sources.restrictionLayerId,
            ),
            roadLayerName: resolveLayerName(
                overlayLayers,
                result.sources.roadLayerId,
            ),
            waterLayerName: resolveLayerName(
                overlayLayers,
                result.sources.waterLayerId,
            ),
            administrativeLayerName: resolveLayerName(
                overlayLayers,
                result.sources.administrativeLayerId,
            ),
        },
        execution: {
            source: result.execution?.source ?? "manual",
            ...(result.execution?.agentPlanId
                ? { agentPlanId: result.execution.agentPlanId }
                : {}),
        },
    };
}

export function createParcelAnalysisReportSnapshot(
    input: CreateParcelAnalysisReportSnapshotInput,
): ReportSnapshot {
    return {
        ...input.baseSnapshot,
        parcelAnalysis: copyParcelFacts(input),
    };
}
