import type { LandUseDataset } from "../types/landUse";

// 联合类型:限制状态取值
// idle：空闲
export type ImportStatus =
    | "idle"
    | "preview"
    | "loaded";

export interface AppState {
    dataset: LandUseDataset | null;
    importStatus: ImportStatus;
}

// 可辨识联合：多个联合类型成员共享一个字面量字段，通过该字段进行类型收窄
// 后续reducer可通过action.type判断执行哪种操作
export type AppAction =
    | {
        type: "PREVIEW_DATASET";
        payload: LandUseDataset;
    }
    | {
        type: "LOAD_DATASET";
    }
    | {
        type: "CLEAR_DATASET";
    };


