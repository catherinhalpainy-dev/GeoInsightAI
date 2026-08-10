import type { LandUseDataset, LandUseType } from "../types/landUse";

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

    filters: LandUseFilters;
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
    }
    | {
        type: "TOGGLE_LAND_USE_TYPE";
        payload: LandUseType;
    }
    | {
        type: "SET_MINIMUM_BUILT_YEAR";
        payload: number | null;
    }
    | {
        type: "SET_DISTRICT_CODE";
        payload: string;
    }
    | {
        type: "CLEAR_FILTERS";
    }
    | {
        type:
        "PATCH_FILTERS";
        payload:
        Partial<LandUseFilters>;
    }
    |{
        type:"REPLACE_FILTERS";
        payload:LandUseFilters;
    };



export interface LandUseFilters {
    landUseTypes: LandUseType[];
    minimumBuiltYear: number | null;
    districtCode: string;
}