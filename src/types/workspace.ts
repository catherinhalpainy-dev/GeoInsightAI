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
    | "agent"
    | null;

export type MapViewCommandType =
    | "fit-all"
    | "fit-current"
    | "fit-selected"
    | "fit-overlay"
    | "layer-up"
    | "layer-down";

export type MapViewCommand =
    | {
        type: Exclude<
            MapViewCommandType,
            "fit-overlay"
        >;
        requestId: number;
    }
    | {
        type: "fit-overlay";
        requestId: number;
        layerId: string;
    };

export type BasemapType =
    | "dark"
    | "light"
    | "blank";
