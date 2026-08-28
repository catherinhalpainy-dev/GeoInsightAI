import type {
    Feature,
    GeoJsonProperties,
    Polygon,
} from "geojson";

import type { LandUseType } from "./landUse";

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
