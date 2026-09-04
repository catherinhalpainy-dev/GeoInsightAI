import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    Geometry,
} from "geojson";

export type DataQualitySeverity =
    | "error"
    | "warning"
    | "info";

export type DataQualityCategory =
    | "structure"
    | "geometry"
    | "attributes"
    | "id";

export type DataQualityIssueCode =
    | "invalid_feature_structure"
    | "missing_geometry"
    | "unsupported_geometry"
    | "invalid_coordinate"
    | "invalid_polygon_ring"
    | "self_intersection"
    | "duplicate_feature_id"
    | "missing_feature_id"
    | "missing_required_attribute"
    | "invalid_attribute_value"
    | "invalid_area"
    | "area_mismatch";

export type DataQualityFixType =
    | "close_polygon_ring"
    | "generate_missing_id"
    | "recalculate_missing_area";

export type DataQualityTargetKind =
    | "primary"
    | "overlay";

export interface DataQualityIssue {
    id: string;
    code: DataQualityIssueCode;
    category: DataQualityCategory;
    severity: DataQualitySeverity;
    featureId: string | null;
    featureIndex: number;
    message: string;
    fixable: boolean;
    fixType?: DataQualityFixType;
    locatable: boolean;
}

export interface DataQualityReport {
    targetId: string;
    targetName: string;
    targetKind: DataQualityTargetKind;
    totalFeatures: number;
    passedFeatures: number;
    errorCount: number;
    warningCount: number;
    issueCount: number;
    passRate: number;
    issues: DataQualityIssue[];
    scannedAt: number;
}

export interface DataQualityScanOptions {
    targetId: string;
    targetName: string;
    targetKind: DataQualityTargetKind;
    areaMismatchThreshold?: number;
}

export type DataQualityFeature = Feature<
    Geometry | null,
    GeoJsonProperties
>;

export type DataQualityFeatureCollection = FeatureCollection<
    Geometry | null,
    GeoJsonProperties
>;

export interface CleanedDatasetResult {
    targetId: string;
    targetName: string;
    targetKind: DataQualityTargetKind;
    collection: DataQualityFeatureCollection;
    appliedFixCount: number;
    unresolvedIssueCount: number;
}

export interface DataQualityMapProperties {
    issueId: string;
    severity: DataQualitySeverity;
    featureIndex: number;
    featureId: string | null;
    code: DataQualityIssueCode;
}

export type DataQualityMapFeature = Feature<
    Geometry,
    DataQualityMapProperties
>;

export type DataQualityMapFeatureCollection = FeatureCollection<
    Geometry,
    DataQualityMapProperties
>;
