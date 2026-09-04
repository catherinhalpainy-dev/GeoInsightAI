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
    | "agent"
    | null;

export type MapViewCommandType =
    | "fit-all"
    | "fit-current"
    | "fit-selected"
    | "fit-overlay"
    | "fit-quality-issue"
    | "fit-selection"
    | "layer-up"
    | "layer-down";

export type MapViewCommand =
    | {
        type: Exclude<
            MapViewCommandType,
            "fit-overlay" | "fit-quality-issue"
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
    };

export type BasemapType =
    | "dark"
    | "light"
    | "blank";
