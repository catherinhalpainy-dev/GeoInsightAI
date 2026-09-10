// 联合类型
export type WorkspaceTool =
    | "select"
    | "pan";

export type WorkspacePanel =
    | "layers"
    | "filter"
    | "style"
    | "feature"
    |"table"
    | "basemap"
    | "aoi-analysis"
    | "geoprocessing"
    | "data-quality"
    | "batch-edit"
    | "geometry-edit"
    | "report-builder"
    | "data-sources"
    | "temporal"
    | "agent"
    | null;

export type MapViewCommandType =
    | "fit-all"
    | "fit-current"
    | "fit-selected"
    | "fit-overlay"
    | "fit-quality-issue"
    | "fit-search-result"
    | "fit-search-layer"
    | "jump-to-coordinate"
    | "fit-selection"
    | "layer-up"
    | "layer-down";

export type MapViewCommand =
    | {
        type: Exclude<
            MapViewCommandType,
            | "fit-overlay"
            | "fit-quality-issue"
            | "fit-search-layer"
            | "jump-to-coordinate"
        >;
        requestId: number;
    }
    | {
        type: "fit-overlay";
        requestId: number;
        layerId: string;
    }
    | {
        type: "fit-quality-issue";
        requestId: number;
        issueId: string;
    }
    | {
        type: "fit-search-layer";
        requestId: number;
        layerType: "overlay" | "analysis";
        layerId: string;
    }
    | {
        type: "jump-to-coordinate";
        requestId: number;
        longitude: number;
        latitude: number;
        zoom: number;
    };

export type BasemapType =
    | "dark"
    | "light"
    | "blank";
