import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    Geometry,
    GeometryCollection,
    MultiPolygon,
    Polygon,
} from "geojson";

import type { BufferFeature } from "../services/gis/buffer";
import type { AnalysisResultLayer, DissolveField, SpatialQueryRelation } from "./analysis";
import type { LandUseFeature } from "./landUse";
import type { AttributeQuery } from "./query";
import type { SpatialStatisticsSummary, SpatialWeightMode } from "./spatialStatistics";
import type { TemporalConfig } from "./temporal";

export type WorkflowInputSource =
    | { type: "primary" }
    | { type: "current-filtered-primary" }
    | { type: "overlay"; layerId: string }
    | { type: "analysis-result"; layerId: string };

interface WorkflowStepBase {
    id: string;
    enabled: boolean;
}

export interface AttributeQueryWorkflowStep extends WorkflowStepBase {
    type: "attribute-query";
    query: AttributeQuery;
}

export interface TemporalFilterWorkflowStep extends WorkflowStepBase {
    type: "temporal-filter";
    temporalValue: number;
}

export interface BufferWorkflowStep extends WorkflowStepBase {
    type: "create-buffer";
    distanceM: number;
}

export interface SpatialQueryWorkflowStep extends WorkflowStepBase {
    type: "spatial-query";
    relation: SpatialQueryRelation;
    mask: "buffer" | "aoi";
}

export interface CentroidWorkflowStep extends WorkflowStepBase {
    type: "centroid";
}

export interface DissolveWorkflowStep extends WorkflowStepBase {
    type: "dissolve";
    field: DissolveField;
}

export interface IntersectionWorkflowStep extends WorkflowStepBase {
    type: "intersection";
    overlay: "buffer" | "aoi";
}

export interface HexbinWorkflowStep extends WorkflowStepBase {
    type: "hexbin";
    weightMode: SpatialWeightMode;
    cellSizeKm: number;
}

export type WorkflowStep =
    | AttributeQueryWorkflowStep
    | TemporalFilterWorkflowStep
    | BufferWorkflowStep
    | SpatialQueryWorkflowStep
    | CentroidWorkflowStep
    | DissolveWorkflowStep
    | IntersectionWorkflowStep
    | HexbinWorkflowStep;

export interface WorkflowOutputConfig {
    mode: "preview" | "analysis-layer";
    name: string;
}

export interface AnalysisWorkflow {
    id: string;
    name: string;
    description: string;
    createdAt: number;
    updatedAt: number;
    input: WorkflowInputSource;
    steps: WorkflowStep[];
    output: WorkflowOutputConfig;
}

export type WorkflowValidationSeverity = "error" | "warning";

export type WorkflowValidationCode =
    | "invalid-name"
    | "invalid-output-name"
    | "duplicate-step-id"
    | "invalid-parameter"
    | "missing-buffer-dependency"
    | "missing-input"
    | "missing-selected-feature"
    | "missing-aoi"
    | "invalid-temporal-value"
    | "empty-input"
    | "incompatible-geometry"
    | "missing-area-weight";

export interface WorkflowValidationIssue {
    stepId: string | null;
    severity: WorkflowValidationSeverity;
    code: WorkflowValidationCode;
    message: string;
}

export type WorkflowRunStatus = "idle" | "running" | "completed" | "failed";
export type WorkflowStepRunStatus = "success" | "failed" | "skipped";

export interface WorkflowStepRunResult {
    stepId: string;
    stepType: WorkflowStep["type"];
    status: WorkflowStepRunStatus;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    inputFeatureCount: number;
    outputFeatureCount: number;
    message: string;
}

export interface WorkflowRunRecord {
    id: string;
    workflowId: string;
    workflowName: string;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    status: Exclude<WorkflowRunStatus, "idle" | "running">;
    steps: WorkflowStepRunResult[];
    inputFeatureCount: number;
    outputFeatureCount: number;
    outputLayerId?: string;
    errorMessage?: string;
}

export type WorkflowGeometry = Exclude<Geometry, GeometryCollection>;
export type WorkflowFeatureCollection = FeatureCollection<WorkflowGeometry, GeoJsonProperties>;

export interface WorkflowExecutionContext {
    workingCollection: WorkflowFeatureCollection;
    originalCollection: WorkflowFeatureCollection;
    sourceLayerId: string;
    selectedFeature: LandUseFeature | null;
    aoi: Feature<Polygon | MultiPolygon, GeoJsonProperties> | null;
    bufferGeometry: BufferFeature | null;
    temporalConfig: TemporalConfig;
    intermediateOutputs: Partial<Record<WorkflowStep["type"], WorkflowFeatureCollection>>;
}

export interface WorkflowExecutionResult {
    success: boolean;
    context: WorkflowExecutionContext;
    run: WorkflowRunRecord;
    output: WorkflowFeatureCollection | null;
    outputLayer: AnalysisResultLayer | null;
    spatialStatisticsSummary: SpatialStatisticsSummary | null;
}

export interface WorkflowTemplateDefinition {
    id: string;
    name: string;
    description: string;
    input: WorkflowInputSource;
    steps: WorkflowStep[];
    output: WorkflowOutputConfig;
}
