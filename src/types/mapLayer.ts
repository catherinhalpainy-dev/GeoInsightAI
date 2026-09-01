import type {
    Feature,
    FeatureCollection,
    GeoJsonProperties,
    LineString,
    MultiLineString,
    MultiPoint,
    MultiPolygon,
    Point,
    Polygon,
} from "geojson";

export type VectorGeometryKind =
    | "point"
    | "line"
    | "polygon"
    | "mixed";

export type OverlayGeometry =
    | Point
    | MultiPoint
    | LineString
    | MultiLineString
    | Polygon
    | MultiPolygon;

export type OverlayFeature = Feature<
    OverlayGeometry,
    GeoJsonProperties
>;

export type OverlayFeatureCollection =
    FeatureCollection<
        OverlayGeometry,
        GeoJsonProperties
    >;

export interface OverlayLayerStyle {
    visible: boolean;
    opacity: number;
    fillColor: string;
    lineColor: string;
    pointColor: string;
    lineWidth: number;
    pointRadius: number;
}

export interface WorkspaceVectorLayer {
    id: string;
    name: string;
    sourceType: "geojson";
    geometryKind: VectorGeometryKind;
    featureCount: number;
    collection: OverlayFeatureCollection;
    style: OverlayLayerStyle;
    createdAt: number;
}
