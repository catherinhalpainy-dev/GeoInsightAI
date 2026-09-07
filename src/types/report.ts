import type { BasemapType } from "./workspace";
import type {
    ClassificationMethod,
    ColorRampName,
    GraduatedField,
    SymbologyMode,
} from "./layerStyle";

export type ReportSectionType =
    | "executive-summary"
    | "map"
    | "kpi"
    | "land-use-distribution"
    | "area-analysis"
    | "spatial-analysis"
    | "data-quality"
    | "analysis-layers"
    | "methodology";

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
}

export interface MapCaptureResult {
    requestId: number;
    dataUrl: string | null;
    error: string | null;
}

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
