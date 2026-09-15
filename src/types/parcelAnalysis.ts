import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    LineString,
    MultiLineString,
    MultiPolygon,
    Polygon,
} from "geojson";

import type { DataQualityIssueCode, DataQualitySeverity } from "./dataQuality";
import type { LandUseFeature, LandUseType } from "./landUse";
import type { WorkspaceVectorLayer } from "./mapLayer";
import type { BufferFeature } from "../services/gis/buffer";

export interface ParcelAnalysisLayerBindings {
    planningLayerId: string | null;
    restrictionLayerId: string | null;
    roadLayerId: string | null;
    waterLayerId: string | null;
    administrativeLayerId: string | null;
}

export type ParcelAnalysisStepId =
    | "quality"
    | "planning"
    | "restriction"
    | "surroundings"
    | "summary";

export type ParcelAnalysisStepStatus =
    | "idle"
    | "running"
    | "completed"
    | "warning"
    | "failed";

export interface ParcelAnalysisStepState {
    id: ParcelAnalysisStepId;
    status: ParcelAnalysisStepStatus;
    message?: string;
}

export interface ParcelQualityIssueSummary {
    code: DataQualityIssueCode;
    severity: DataQualitySeverity;
    message: string;
}

export interface ParcelQualitySummary {
    status: "pass" | "warning" | "error";
    issueCount: number;
    errorCount: number;
    warningCount: number;
    issues: ParcelQualityIssueSummary[];
}

export interface ParcelPlanningItem {
    plannedUse: string;
    areaM2: number;
    ratio: number;
}

export interface ParcelPlanningAnalysis {
    dominantUse: string | null;
    coveredAreaM2: number;
    coverageRatio: number;
    uncoveredAreaM2: number;
    hasOverlappingPlanningZones: boolean;
    items: ParcelPlanningItem[];
}

export interface ParcelRestrictionItem {
    restrictionType: string;
    areaM2: number;
    ratio: number;
}

export interface ParcelRestrictionAnalysis {
    hasConflict: boolean;
    overlapAreaM2: number;
    overlapRatio: number;
    conflictFeatureCount: number;
    items: ParcelRestrictionItem[];
}

export interface ParcelSurroundingsAnalysis {
    bufferDistanceM: 500;
    roadFeatureCount: number;
    roadNames: string[];
    roadClassSummary: Record<string, number>;
    waterConfigured: boolean;
    waterIntersectsTarget: boolean | null;
    waterFeatureCount: number | null;
    waterNames: string[];
    administrativeConfigured: boolean;
    administrativeAreaName: string | null;
    administrativeAreaCode: string | null;
}

export interface ParcelAnalysisResult {
    id: string;
    generatedAt: number;
    target: {
        featureId: string;
        landUseType: LandUseType;
        areaM2: number;
        builtYear: number | null;
        districtCode: string;
    };
    quality: ParcelQualitySummary;
    planning: ParcelPlanningAnalysis | null;
    restrictions: ParcelRestrictionAnalysis | null;
    surroundings: ParcelSurroundingsAnalysis | null;
    sources: ParcelAnalysisLayerBindings;
    execution?: {
        source: "manual" | "agent";
        agentPlanId?: string;
    };
}

export interface ParcelPlanningArtifactProperties {
    [name: string]: unknown;
    artifactType: "planning";
    plannedUse: string;
    areaM2: number;
}

export interface ParcelRestrictionArtifactProperties {
    [name: string]: unknown;
    artifactType: "restriction";
    restrictionType: string;
    areaM2: number;
}

export type ParcelPolygonArtifactCollection = FeatureCollection<
    Polygon | MultiPolygon,
    ParcelPlanningArtifactProperties | ParcelRestrictionArtifactProperties
>;

export type ParcelLineArtifactCollection = FeatureCollection<
    LineString | MultiLineString,
    GeoJsonProperties
>;

export interface ParcelAnalysisArtifacts {
    targetFeature: LandUseFeature;
    planningIntersections: ParcelPolygonArtifactCollection;
    restrictionIntersections: ParcelPolygonArtifactCollection;
    buffer500m: BufferFeature | null;
    roadsWithinBuffer: ParcelLineArtifactCollection;
    waterWithinBuffer: FeatureCollection<
        LineString | MultiLineString | Polygon | MultiPolygon,
        GeoJsonProperties
    >;
}

export interface ParcelAnalysisExecutionContext {
    targetFeature: LandUseFeature;
    bindings: ParcelAnalysisLayerBindings;
    planningLayer: WorkspaceVectorLayer;
    restrictionLayer: WorkspaceVectorLayer;
    roadLayer: WorkspaceVectorLayer;
    waterLayer: WorkspaceVectorLayer | null;
    administrativeLayer: WorkspaceVectorLayer | null;
}

export interface ParcelPlanningExecutionResult {
    result: ParcelPlanningAnalysis;
    intersections: ParcelPolygonArtifactCollection;
}

export interface ParcelRestrictionExecutionResult {
    result: ParcelRestrictionAnalysis;
    intersections: ParcelPolygonArtifactCollection;
}

export interface ParcelSurroundingsExecutionResult {
    result: ParcelSurroundingsAnalysis;
    buffer500m: BufferFeature;
    roadsWithinBuffer: ParcelLineArtifactCollection;
    waterWithinBuffer: ParcelAnalysisArtifacts["waterWithinBuffer"];
    warnings: string[];
}

export interface ParcelAnalysisRunOutput {
    result: ParcelAnalysisResult;
    artifacts: ParcelAnalysisArtifacts;
}

export interface ParcelAnalysisPartialResults {
    quality: ParcelQualitySummary;
    planning?: ParcelPlanningExecutionResult;
    restrictions?: ParcelRestrictionExecutionResult;
    surroundings?: ParcelSurroundingsExecutionResult;
}

export interface ParcelAnalysisRunState {
    status: "idle" | "running" | "completed" | "failed";
    steps: ParcelAnalysisStepState[];
    result: ParcelAnalysisResult | null;
    artifacts: ParcelAnalysisArtifacts | null;
    error: string | null;
}

export type ParcelPolygonFeature = Feature<
    Polygon | MultiPolygon,
    GeoJsonProperties
>;
