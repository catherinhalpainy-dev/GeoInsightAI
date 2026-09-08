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

export type VectorLayerOrigin =
    | {
        type: "local-geojson";
        filename: string;
    }
    | {
        type: "csv";
        filename: string;
    }
    | {
        type: "geojson-url";
        url: string;
    };

export interface WorkspaceVectorLayer {
    id: string;
    name: string;
    sourceType: "geojson";
    geometryKind: VectorGeometryKind;
    featureCount: number;
    collection: OverlayFeatureCollection;
    style: OverlayLayerStyle;
    createdAt: number;
    origin?: VectorLayerOrigin;
}

export type RasterSourceType = "xyz" | "wms";

export interface XYZRasterSource {
    type: "xyz";
    tiles: string[];
    tileSize: 256 | 512;
}

export interface WmsRasterSource {
    type: "wms";
    baseUrl: string;
    layerName: string;
    version: "1.1.1" | "1.3.0";
    format: "image/png" | "image/jpeg";
    transparent: boolean;
    styleName: string;
}

export interface WorkspaceRasterLayer {
    id: string;
    name: string;
    sourceType: RasterSourceType;
    visible: boolean;
    opacity: number;
    createdAt: number;
    attribution?: string;
    minZoom?: number;
    maxZoom?: number;
    source: XYZRasterSource | WmsRasterSource;
}
