import type { BasemapType } from "./workspace";
import type {
    DataQualityIssueCode,
    DataQualitySeverity,
} from "./dataQuality";
import type {
    ClassificationMethod,
    ColorRampName,
    GraduatedField,
    SymbologyMode,
} from "./layerStyle";
import type { TemporalFieldType } from "./temporal";
import type {
    SpatialStatisticsMethod,
    SpatialWeightMode,
} from "./spatialStatistics";
import type {
    TemporalCompareSnapshot,
    TemporalCompareSummary,
} from "./mapCompare";

export type ReportSectionType =
    | "executive-summary"
    | "map"
    | "kpi"
    | "land-use-distribution"
    | "area-analysis"
    | "spatial-analysis"
    | "spatial-statistics"
    | "temporal-comparison"
    | "data-quality"
    | "analysis-layers"
    | "parcel-overview"
    | "parcel-map"
    | "parcel-planning"
    | "parcel-restrictions"
    | "parcel-surroundings"
    | "parcel-quality"
    | "parcel-summary"
    | "parcel-evidence"
    | "methodology";

export type ReportTemplateType =
    | "general-analysis"
    | "parcel-analysis";

export interface ReportSectionConfig {
    id: string;
    type: ReportSectionType;
    title: string;
    enabled: boolean;
    order: number;
}

export interface ReportMapSnapshot {
    dataUrl: string | null;
    captureError: string | null;
    capturedAt: number;
    center: [number, number];
    zoom: number;
    basemap: BasemapType;
}

export interface ReportKpiSnapshot {
    featureCount: number;
    totalAreaM2: number;
    averageAreaM2: number;
    selectedCount: number;
    districtCount: number;
}

export interface ReportCategoryStat {
    key: string;
    label: string;
    color: string;
    count: number;
    areaM2: number;
    averageAreaM2: number;
    percentage: number;
}

export interface ReportAnalysisLayerSnapshot {
    name: string;
    operation: string;
    featureCount: number;
    geometryType: string;
    visible: boolean;
}

export interface ReportSpatialAnalysisSnapshot {
    hasBuffer: boolean;
    bufferDistanceM: number | null;
    bufferAreaM2: number | null;
    spatialQueryFeatureCount: number;
    spatialQueryRelation: string | null;
    aoiFeatureCount: number;
    aoiRelation: string | null;
    analysisResultLayers: ReportAnalysisLayerSnapshot[];
}

export interface ReportDataQualitySnapshot {
    available: boolean;
    targetName?: string;
    errorCount?: number;
    warningCount?: number;
    passRate?: number;
    scannedAt?: number;
}

export interface ReportSymbologySnapshot {
    mode: SymbologyMode;
    graduatedField?: GraduatedField;
    classificationMethod?: ClassificationMethod;
    classCount?: number;
    colorRamp?: ColorRampName;
}

export interface ReportTemporalSnapshot {
    enabled: boolean;
    field: string;
    type: TemporalFieldType;
    min: number;
    max: number;
    current: number;
    featureCount: number;
}

export interface ReportSpatialStatisticsSnapshot {
    method: SpatialStatisticsMethod;
    inputFeatureCount: number;
    analysisPointCount: number;
    weightMode: SpatialWeightMode;
    cellSizeKm?: number;
    occupiedCellCount?: number;
    maxCellValue?: number;
    maxCellShare?: number;
    meanCenter: [number, number] | null;
}

export interface ParcelAnalysisReportSnapshot {
    analysisId: string;
    generatedAt: number;
    target: {
        featureId: string;
        currentUse: string;
        areaM2: number;
        builtYear: number | null;
        districtCode: string;
        administrativeAreaName: string | null;
    };
    quality: {
        status: "pass" | "warning" | "error";
        errorCount: number;
        warningCount: number;
        issues: Array<{
            code: DataQualityIssueCode;
            severity: DataQualitySeverity;
            message: string;
        }>;
    };
    planning: {
        available: boolean;
        dominantUse: string | null;
        coverageAreaM2: number | null;
        coverageRatio: number | null;
        uncoveredAreaM2: number | null;
        hasOverlappingPlanningZones: boolean;
        items: Array<{
            use: string;
            areaM2: number;
            ratio: number;
        }>;
    };
    restrictions: {
        available: boolean;
        hasConflict: boolean;
        overlapAreaM2: number | null;
        overlapRatio: number | null;
        conflictFeatureCount: number | null;
        items: Array<{
            type: string;
            areaM2: number;
            ratio: number;
        }>;
    };
    surroundings: {
        available: boolean;
        bufferDistanceM: number | null;
        roadFeatureCount: number | null;
        roadClassSummary: Record<string, number>;
        waterConfigured: boolean;
        waterFeatureCount: number | null;
        waterIntersectsTarget: boolean | null;
        administrativeConfigured: boolean;
        administrativeAreaName: string | null;
    };
    sources: {
        primaryLayerName: string;
        planningLayerName: string | null;
        restrictionLayerName: string | null;
        roadLayerName: string | null;
        waterLayerName: string | null;
        administrativeLayerName: string | null;
    };
    execution: {
        source: "manual" | "agent";
        agentPlanId?: string;
    };
}

export interface ReportSnapshot {
    id: string;
    generatedAt: number;
    workspaceRevisionAtSnapshot: number;
    projectName: string;
    datasetName: string;
    originalFeatureCount: number;
    filterSummary: string[];
    kpi: ReportKpiSnapshot;
    categories: ReportCategoryStat[];
    spatialAnalysis: ReportSpatialAnalysisSnapshot;
    dataQuality: ReportDataQualitySnapshot;
    symbology: ReportSymbologySnapshot;
    temporal?: ReportTemporalSnapshot;
    spatialStatistics?: ReportSpatialStatisticsSnapshot;
    temporalComparison?: TemporalCompareSnapshot;
    parcelAnalysis?: ParcelAnalysisReportSnapshot;
    map: ReportMapSnapshot;
}

export type ReportInsightCategory =
    | "overview"
    | "distribution"
    | "spatial"
    | "quality"
    | "recommendation";

export interface ReportInsight {
    id: string;
    category: ReportInsightCategory;
    title: string;
    content: string;
}

export interface ReportDraft {
    id: string;
    template: ReportTemplateType;
    title: string;
    subtitle: string;
    author?: string;
    snapshot: ReportSnapshot;
    sections: ReportSectionConfig[];
    executiveSummary: string;
    insights: ReportInsight[];
    aiGenerated: boolean;
}

export interface ReportInsightResponseItem {
    category: ReportInsightCategory;
    title: string;
    content: string;
}

export interface ReportInsightResponse {
    executiveSummary: string;
    insights: ReportInsightResponseItem[];
}

export interface AIReportContext {
    projectName: string;
    datasetName: string;
    generatedAt: number;
    filterSummary: string[];
    kpi: ReportKpiSnapshot;
    categories: ReportCategoryStat[];
    spatialAnalysis: ReportSpatialAnalysisSnapshot;
    dataQuality: ReportDataQualitySnapshot;
    symbology: ReportSymbologySnapshot;
    temporal?: ReportTemporalSnapshot;
    spatialStatistics?: ReportSpatialStatisticsSnapshot;
    temporalComparison?: TemporalCompareSummary;
    parcelAnalysis?: ParcelAnalysisReportSnapshot;
}

export interface MapCaptureResult {
    requestId: number;
    dataUrl: string | null;
    error: string | null;
}

export type MapCaptureMode = "current" | "parcel-analysis";

export type ReportSnapshotStatus =
    | "idle"
    | "capturing"
    | "ready"
    | "error";

export type ReportAiStatus =
    | "idle"
    | "generating"
    | "ready"
    | "error";
