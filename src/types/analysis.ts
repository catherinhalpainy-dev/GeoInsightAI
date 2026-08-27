import type { LandUseType } from "./landUse";

export interface BufferAnalysisResult {
    distance: number;
    unit: "meter";
    areaM2: number;
    areaKm2: number;
    featureCount?: number;
}

export type SpatialQueryRelation =
    "intersects";

export interface SpatialQueryResult {
    relation: SpatialQueryRelation;
    featureIds: string[];
    featureCount: number;
    totalAreaM2: number;
    typeCounts: Record<LandUseType, number>;
}
