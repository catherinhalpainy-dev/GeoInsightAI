import type {
    LandUseFilters,
} from "../app/appTypes";
import type {
    BufferFeature,
} from "../services/gis/buffer";
import type {
    AnalysisResultLayer,
    AoiAnalysisResult,
    AoiFeature,
    AoiQueryRelation,
    BufferAnalysisResult,
    SpatialQueryResult,
} from "./analysis";
import type {
    LandUseDataset,
    Position,
} from "./landUse";
import type {
    LayerStyle,
} from "./layerStyle";
import type {
    WorkspaceVectorLayer,
} from "./mapLayer";
import type {
    AttributeQuery,
} from "./query";
import type {
    BasemapType,
} from "./workspace";

export const GEOINSIGHT_PROJECT_VERSION = 1;
export const GEOINSIGHT_PROJECT_FORMAT = "geoinsight-project" as const;

export interface ProjectMetadata {
    id: string;
    name: string;
    createdAt: number;
    updatedAt: number;
}

export interface ProjectDataState {
    primaryDataset: LandUseDataset;
    overlayLayers: WorkspaceVectorLayer[];
    analysisResultLayers: AnalysisResultLayer[];
}

export type ProjectLayerStyle = Omit<
    LayerStyle,
    "graduatedClasses"
>;

export interface ProjectWorkspaceState {
    filters: LandUseFilters;
    attributeQuery: AttributeQuery | null;
    layerStyle: ProjectLayerStyle;
    selectedFeatureIds: string[];
    selectedFeatureId: string | null;
    aoiFeature: AoiFeature | null;
    aoiRelation: AoiQueryRelation;
    aoiQueryResult: AoiAnalysisResult | null;
    bufferFeature: BufferFeature | null;
    bufferResult: BufferAnalysisResult | null;
    bufferSpatialQueryResult: SpatialQueryResult | null;
}

export interface ProjectMapState {
    basemap: BasemapType;
    center: Position;
    zoom: number;
    bearing: number;
    pitch: number;
}

export interface GeoInsightProject {
    format: typeof GEOINSIGHT_PROJECT_FORMAT;
    version: typeof GEOINSIGHT_PROJECT_VERSION;
    project: ProjectMetadata;
    data: ProjectDataState;
    map: ProjectMapState;
    workspace: ProjectWorkspaceState;
}

export interface ProjectSnapshotInput {
    project: ProjectMetadata;
    data: ProjectDataState;
    map: ProjectMapState;
    workspace: ProjectWorkspaceState;
}

export interface RecentProjectMetadata extends ProjectMetadata {
    primaryFeatureCount: number;
    overlayLayerCount: number;
    analysisLayerCount: number;
}

export type ProjectSaveStatus =
    | "idle"
    | "unsaved"
    | "saving"
    | "saved"
    | "error";
