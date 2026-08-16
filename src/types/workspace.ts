// 联合类型
export type WorkspaceTool =
    | "select"
    | "pan";

export type WorkspacePanel =
    | "layers"
    | "filter"
    | "style"
    | "feature"
    | "basemap"
    | "agent"
    | null;

export type MapViewCommandType =
    | "fit-all"
    | "fit-current"
    | "fit-selected"
    | "layer-up"
    | "layer-down";

export interface MapViewCommand {
    type: MapViewCommandType;
    requestId: number;
}

export type BasemapType =
    | "dark"
    | "light"
    | "blank";