import type {
    Feature,
    GeoJsonProperties,
    Geometry,
} from "geojson";

export type SearchSourceType =
    | "primary"
    | "overlay"
    | "analysis";

export type SearchLayerType = SearchSourceType | "raster";

export type WorkspaceCommandId =
    | "open-filter"
    | "open-layers"
    | "open-feature-table"
    | "open-layer-style"
    | "open-aoi-analysis"
    | "open-geoprocessing"
    | "open-data-quality"
    | "open-geometry-editor"
    | "open-report-builder"
    | "open-data-sources"
    | "open-temporal"
    | "open-agent"
    | "open-basemap"
    | "navigate-statistics"
    | "navigate-report"
    | "fit-all"
    | "fit-selection"
    | "clear-selection";

export interface FeatureSearchResult {
    type: "feature";
    id: string;
    title: string;
    subtitle: string;
    sourceType: SearchSourceType;
    layerId: string;
    featureId?: string;
    featureIndex: number;
}

export interface LayerSearchResult {
    type: "layer";
    id: string;
    layerType: SearchLayerType;
    layerId: string;
    title: string;
    subtitle: string;
}

export interface CoordinateSearchResult {
    type: "coordinate";
    id: string;
    longitude: number;
    latitude: number;
    title: string;
    subtitle: string;
}

export interface CommandSearchResult {
    type: "command";
    id: string;
    commandId: WorkspaceCommandId;
    title: string;
    subtitle: string;
}

export type WorkspaceSearchResult =
    | FeatureSearchResult
    | LayerSearchResult
    | CoordinateSearchResult
    | CommandSearchResult;

export type IndexedWorkspaceSearchResult = Exclude<
    WorkspaceSearchResult,
    CoordinateSearchResult
>;

export interface WorkspaceSearchDocument {
    result: IndexedWorkspaceSearchResult;
    normalizedTitle: string;
    searchText: string;
    priority: number;
    order: number;
}

export interface RecentSearchEntry {
    query: string;
    resultType: WorkspaceSearchResult["type"];
    resultId: string;
    label: string;
    timestamp: number;
}

export type SearchHighlightFeature = Feature<
    Geometry,
    GeoJsonProperties
>;

export interface CoordinateParseResult {
    result: CoordinateSearchResult | null;
    error: string | null;
}
