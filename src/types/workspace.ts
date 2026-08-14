// 联合类型
export type WorkspaceTool =
    | "select"
    | "pan";

export type WorkspacePanel =
    | "layers"
    | "filter"
    | "style"
    | "feature"
    | "agent"
    | null;

export type MapViewCommandType=
    |"fit-all"
    |"fit-current"
    |"fit-selected";

export interface MapViewCommand{
    type:MapViewCommandType;
    requestId:number;
}