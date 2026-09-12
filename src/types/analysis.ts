import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    MultiPolygon,
    Point,
    Polygon,
} from "geojson";

import type {
    LandUseProperties,
    LandUseType,
} from "./landUse";
import type {
    SpatialHexbinProperties,
    SpatialStatisticsInput,
    SpatialWeightMode,
} from "./spatialStatistics";

export interface BufferAnalysisResult {
    distance: number;
    unit: "meter";
    areaM2: number;
    areaKm2: number;
    featureCount?: number;
}

export type SpatialQueryRelation =
    | "intersects"
    | "within";

export interface SpatialQueryResult {
    relation: SpatialQueryRelation;
    featureIds: string[];
    featureCount: number;
    totalAreaM2: number;
    totalAreaKm2: number;
    typeCounts: Record<LandUseType, number>;
}

export type AoiQueryRelation =
    SpatialQueryRelation;

export interface AoiAnalysisResult
    extends SpatialQueryResult {
    relation: AoiQueryRelation;
}

export type AoiSketchMode =
    | "idle"
    | "drawing"
    | "completed";

export type AoiFeature = Feature<
    Polygon,
    GeoJsonProperties
>;

export type GeoprocessingOperation =
    | "intersection"
    | "dissolve"
    | "centroid";

export type AnalysisOperation =
    | GeoprocessingOperation
    | "spatial-hexbin"
    | "workflow";

export type GeoprocessingInputSource =
    | "current-filtered"
    | "aoi-query"
    | "buffer-query";

export type IntersectionOverlaySource =
    | "aoi"
    | "buffer";

export type DissolveField =
    | "all"
    | "landUseType";

export type AnalysisResultGeometryType =
    | "Point"
    | "Polygon"
    | "MultiPolygon";

export interface IntersectionResultProperties
    extends LandUseProperties {
    analysisOperation: "intersection";
    sourceFeatureId: string;
}

export interface CentroidResultProperties
    extends LandUseProperties {
    analysisOperation: "centroid";
    sourceFeatureId: string;
}

export interface DissolveResultProperties {
    analysisOperation: "dissolve";
    landUseType?: LandUseType;
}

export type AnalysisResultProperties =
    | IntersectionResultProperties
    | DissolveResultProperties
    | CentroidResultProperties
    | SpatialHexbinProperties
    | WorkflowResultProperties;

export type WorkflowResultProperties = Record<string, unknown> & {
    analysisOperation: "workflow";
};

export type AnalysisResultGeometry =
    | Point
    | Polygon
    | MultiPolygon;

export type AnalysisResultFeature = Feature<
    AnalysisResultGeometry,
    AnalysisResultProperties
>;

export type AnalysisResultFeatureCollection =
    FeatureCollection<
        AnalysisResultGeometry,
        AnalysisResultProperties
    >;

export interface AnalysisResultLayer {
    id: string;
    name: string;
    operation: AnalysisOperation;
    geometryType: AnalysisResultGeometryType;
    visible: boolean;
    createdAt: number;
    featureCount: number;
    collection: AnalysisResultFeatureCollection;
    metadata?: {
        method: "hexbin";
        inputSource: SpatialStatisticsInput;
        weightMode: SpatialWeightMode;
        cellSizeKm: number;
        temporalValue?: number;
        createdFromFeatureCount: number;
    } | {
        method: "workflow";
        workflowId: string;
        workflowName: string;
        workflowRunId: string;
        createdFromFeatureCount: number;
        stepCount: number;
    };
}

export interface GeoprocessingRunRequest {
    operation: GeoprocessingOperation;
    inputSource: GeoprocessingInputSource;
    overlaySource: IntersectionOverlaySource;
    dissolveField: DissolveField;
}

export interface GeoprocessingRunSummary {
    layerId: string;
    operation: GeoprocessingOperation;
    inputCount: number;
    outputCount: number;
    totalAreaM2?: number;
    elapsedMs: number;
}
