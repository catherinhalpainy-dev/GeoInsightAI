import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    Point,
    Polygon,
} from "geojson";

export type SpatialStatisticsMethod =
    | "heatmap"
    | "hexbin";

export type SpatialWeightMode =
    | "count"
    | "area";

export type SpatialStatisticsInput =
    | "filtered-primary"
    | "buffer-query"
    | "aoi-query"
    | {
        type: "overlay";
        layerId: string;
    };

export interface SpatialStatisticsConfig {
    method: SpatialStatisticsMethod;
    weightMode: SpatialWeightMode;
    cellSizeKm: number;
    heatmapRadius: number;
    heatmapIntensity: number;
}

export interface SpatialStatisticsRunRequest {
    input: SpatialStatisticsInput;
    config: SpatialStatisticsConfig;
}

export type SpatialSourceGeometryType =
    | "Point"
    | "MultiPoint"
    | "LineString"
    | "MultiLineString"
    | "Polygon"
    | "MultiPolygon";

export type SpatialRepresentativePointProperties = Record<string, unknown> & {
    sourceFeatureId: string;
    sourceLayerId: string;
    sourceGeometryType: SpatialSourceGeometryType;
    weight: number;
    normalizedWeight: number;
    landUseType?: string;
    areaM2?: number;
};

export type SpatialRepresentativePoint = Feature<
    Point,
    SpatialRepresentativePointProperties
>;

export type SpatialRepresentativePointCollection = FeatureCollection<
    Point,
    SpatialRepresentativePointProperties
>;

export interface SpatialHotspotCell {
    id: string;
    featureCount: number;
    value: number;
    share: number;
    rank: number;
}

export type SpatialHexbinProperties = Record<string, unknown> & {
    analysisOperation: "spatial-hexbin";
    id: string;
    featureCount: number;
    value: number;
    share: number;
    rank: number;
    classIndex: number;
};

export type SpatialHexbinFeatureCollection = FeatureCollection<
    Polygon,
    SpatialHexbinProperties
>;

export interface SpatialStatisticsSummary {
    method: SpatialStatisticsMethod;
    weightMode: SpatialWeightMode;
    inputFeatureCount: number;
    analysisPointCount: number;
    totalWeight: number;
    meanCenter: [number, number] | null;
    occupiedCellCount: number;
    maxCellValue: number;
    maxCellShare: number;
    hotspotCells: SpatialHotspotCell[];
}

export interface SpatialHeatmapAnalysis {
    points: SpatialRepresentativePointCollection;
    summary: SpatialStatisticsSummary;
}

export interface SpatialHexbinAnalysis {
    points: SpatialRepresentativePointCollection;
    collection: SpatialHexbinFeatureCollection;
    summary: SpatialStatisticsSummary;
}

export interface SpatialStatisticsInputOption {
    key: string;
    input: SpatialStatisticsInput;
    label: string;
    featureCount: number;
    supportsAreaWeight: boolean;
}

export const DEFAULT_SPATIAL_STATISTICS_CONFIG: SpatialStatisticsConfig = {
    method: "heatmap",
    weightMode: "count",
    cellSizeKm: 0.5,
    heatmapRadius: 24,
    heatmapIntensity: 1,
};

export type SpatialStatisticsFeatureCollection = FeatureCollection<
    Exclude<GeoJSON.Geometry, GeoJSON.GeometryCollection>,
    GeoJsonProperties
>;
