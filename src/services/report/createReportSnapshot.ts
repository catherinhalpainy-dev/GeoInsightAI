import { LAND_USE_LABELS } from "../../constants/landUse";
import { summarizeAttributeQuery } from "../gis/attributeQuery";
import {
    calculateDashboardSummary,
    calculateTypeStatistics,
} from "../../utils/statisticsDashboard";
import type { LandUseFilters } from "../../app/appTypes";
import type {
    AnalysisResultLayer,
    AoiAnalysisResult,
    BufferAnalysisResult,
    SpatialQueryResult,
} from "../../types/analysis";
import type { DataQualityReport } from "../../types/dataQuality";
import type {
    LandUseDataset,
    LandUseFeature,
} from "../../types/landUse";
import type { LayerStyle } from "../../types/layerStyle";
import type { ProjectMapState } from "../../types/project";
import type { AttributeQuery } from "../../types/query";
import type {
    ReportMapSnapshot,
    ReportSnapshot,
} from "../../types/report";
import type { TemporalConfig } from "../../types/temporal";
import { formatTemporalValue } from "../temporal/formatTemporalValue";

export interface CreateReportSnapshotInput {
    projectName: string;
    workspaceRevision: number;
    dataset: LandUseDataset;
    filteredFeatures: readonly LandUseFeature[];
    filters: LandUseFilters;
    attributeQuery: AttributeQuery | null;
    selectedFeatureIds: readonly string[];
    bufferResult: BufferAnalysisResult | null;
    spatialQueryResult: SpatialQueryResult | null;
    aoiAnalysisResult: AoiAnalysisResult | null;
    analysisResultLayers: readonly AnalysisResultLayer[];
    dataQualityReport: DataQualityReport | null;
    layerStyle: LayerStyle;
    temporalConfig: TemporalConfig;
    mapState: ProjectMapState;
    mapCapture: {
        dataUrl: string | null;
        error: string | null;
    };
    generatedAt?: number;
}

function createFilterSummary(
    filters: LandUseFilters,
    attributeQuery: AttributeQuery | null,
    temporalConfig: TemporalConfig,
) {
    const summary: string[] = [];

    if (filters.landUseTypes.length > 0) {
        summary.push(
            `用地类型 = ${filters.landUseTypes.map(
                (type) => LAND_USE_LABELS[type],
            ).join("、")}`,
        );
    }

    if (filters.minimumBuiltYear !== null) {
        summary.push(`建成年份 ≥ ${filters.minimumBuiltYear}`);
    }

    if (filters.districtCode.trim()) {
        summary.push(`行政区代码 = ${filters.districtCode.trim()}`);
    }

    if (attributeQuery) {
        const querySummary = summarizeAttributeQuery(attributeQuery);

        if (querySummary) {
            summary.push(`高级查询：${querySummary}`);
        }
    }

    if (temporalConfig.enabled) {
        summary.push(
            `时间：${temporalConfig.field} = ${formatTemporalValue(
                temporalConfig.current,
                temporalConfig.type,
            )}`,
        );
    }

    return summary.length > 0
        ? summary
        : ["未应用筛选条件"];
}

export function createReportSnapshot(
    input: CreateReportSnapshotInput,
): ReportSnapshot {
    const generatedAt = input.generatedAt ?? Date.now();
    const summary = calculateDashboardSummary(input.filteredFeatures);
    const typeStatistics = calculateTypeStatistics(input.filteredFeatures);
    const validSelectedIds = new Set(
        input.dataset.collection.features.map(
            (feature) => feature.properties.id,
        ),
    );
    const selectedCount = input.selectedFeatureIds.filter(
        (featureId) => validSelectedIds.has(featureId),
    ).length;
    const map: ReportMapSnapshot = {
        dataUrl: input.mapCapture.dataUrl,
        captureError: input.mapCapture.error,
        capturedAt: generatedAt,
        center: [...input.mapState.center],
        zoom: input.mapState.zoom,
        basemap: input.mapState.basemap,
    };

    return {
        id: crypto.randomUUID(),
        generatedAt,
        workspaceRevisionAtSnapshot: input.workspaceRevision,
        projectName: input.projectName,
        datasetName: input.dataset.name,
        originalFeatureCount: input.dataset.collection.features.length,
        filterSummary: createFilterSummary(
            input.filters,
            input.attributeQuery,
            input.temporalConfig,
        ),
        kpi: {
            featureCount: summary.totalFeatureCount,
            totalAreaM2: summary.totalAreaM2,
            averageAreaM2: summary.averageAreaM2,
            selectedCount,
            districtCount: summary.districtCount,
        },
        categories: typeStatistics
            .filter((item) => item.count > 0)
            .map((item) => ({
                key: item.type,
                label: item.label,
                color: item.color,
                count: item.count,
                areaM2: item.totalAreaM2,
                averageAreaM2: item.averageAreaM2,
                percentage: summary.totalFeatureCount === 0
                    ? 0
                    : item.count / summary.totalFeatureCount * 100,
            })),
        spatialAnalysis: {
            hasBuffer: input.bufferResult !== null,
            bufferDistanceM: input.bufferResult?.distance ?? null,
            bufferAreaM2: input.bufferResult?.areaM2 ?? null,
            spatialQueryFeatureCount:
                input.spatialQueryResult?.featureCount ?? 0,
            spatialQueryRelation:
                input.spatialQueryResult?.relation ?? null,
            aoiFeatureCount: input.aoiAnalysisResult?.featureCount ?? 0,
            aoiRelation: input.aoiAnalysisResult?.relation ?? null,
            analysisResultLayers: input.analysisResultLayers.map((layer) => ({
                name: layer.name,
                operation: layer.operation,
                featureCount: layer.featureCount,
                geometryType: layer.geometryType,
                visible: layer.visible,
            })),
        },
        dataQuality: input.dataQualityReport
            ? {
                available: true,
                targetName: input.dataQualityReport.targetName,
                errorCount: input.dataQualityReport.errorCount,
                warningCount: input.dataQualityReport.warningCount,
                passRate: input.dataQualityReport.passRate,
                scannedAt: input.dataQualityReport.scannedAt,
            }
            : { available: false },
        symbology: input.layerStyle.symbologyMode === "graduated"
            ? {
                mode: input.layerStyle.symbologyMode,
                graduatedField: input.layerStyle.graduatedField,
                classificationMethod: input.layerStyle.classificationMethod,
                classCount: input.layerStyle.classCount,
                colorRamp: input.layerStyle.colorRamp,
            }
            : { mode: input.layerStyle.symbologyMode },
        temporal: input.temporalConfig.enabled
            ? {
                ...input.temporalConfig,
                featureCount: summary.totalFeatureCount,
            }
            : undefined,
        map,
    };
}

export function createAIReportContext(snapshot: ReportSnapshot) {
    return {
        projectName: snapshot.projectName,
        datasetName: snapshot.datasetName,
        generatedAt: snapshot.generatedAt,
        filterSummary: [...snapshot.filterSummary],
        kpi: { ...snapshot.kpi },
        categories: snapshot.categories.map((item) => ({ ...item })),
        spatialAnalysis: {
            ...snapshot.spatialAnalysis,
            analysisResultLayers:
                snapshot.spatialAnalysis.analysisResultLayers.map(
                    (layer) => ({ ...layer }),
                ),
        },
        dataQuality: { ...snapshot.dataQuality },
        symbology: { ...snapshot.symbology },
        temporal: snapshot.temporal ? { ...snapshot.temporal } : undefined,
    };
}
