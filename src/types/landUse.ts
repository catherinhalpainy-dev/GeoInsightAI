// 建立城市用地类型

export type LandUseType =
    | "residential"
    | "commercial"
    | "industrial"
    | "green"
    | "public"
    | "transportation"
    | "other";

export type Position = [
    longitude: number,
    latitude: number,
];

export interface LandUseProperties {
    id: string;
    landUseType: LandUseType;
    areaM2: number;
    districtCode: string;
    builtYear: number | null;
}

export interface PolygonGeometry {
    type: "Polygon";
    coordinates: Position[][];
}

export interface LandUseFeature {
    type: "Feature";
    geometry: PolygonGeometry;
    properties: LandUseProperties;
}

export interface LandUseFeatureCollection {
    type: "FeatureCollection";
    features: LandUseFeature[];
}

export interface LandUseDataset {
    id: string;
    name: string;
    sourceCrs: "EPSG:4326";
    collection: LandUseFeatureCollection;
}

export interface LandUseStatistics {
    featureCount: number;
    typeCount: number;
    totalAreaM2: number;
    averageAreaM2: number;
    largestFeature: LandUseFeature | null;
    countsByType: Record<LandUseType, number>;
    areaByType: Record<LandUseType, number>;
}