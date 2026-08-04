import type { LandUseDataset } from "../types/landUse";

// 联合类型:限制状态取值
// idle：空闲
export type ImportStatus =
    | "idle"
    | "reading"
    | "validating"
    | "preview"
    | "loaded"
    | "error";

export interface AppState {
    dataset: LandUseDataset | null;
    importStatus: ImportStatus;
    importError: string | null;
    importWarnings: string[];
}

// 可辨识联合：多个联合类型成员共享一个字面量字段，通过该字段进行类型收窄
// 后续reducer可通过action.type判断执行哪种操作
export type AppAction =
    | {
        type: "START_FILE_IMPORT";
    }
    | {
        type: "VALIDATE_FILE";
    }
    | {
        type: "PREVIEW_DATASET";
        payload: {
            dataset: LandUseDataset;
            warnings: string[];
        };
    }
    | {
        type: "LOAD_DATASET";
    }
    | {
        type: "IMPORT_ERROR";
        payload: string;
    }
    | {
        type: "CLEAR_DATASET";
    };


