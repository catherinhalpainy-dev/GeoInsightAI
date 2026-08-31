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
    | CentroidResultProperties;

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
    operation: GeoprocessingOperation;
    geometryType: AnalysisResultGeometryType;
    visible: boolean;
    createdAt: number;
    featureCount: number;
    collection: AnalysisResultFeatureCollection;
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
