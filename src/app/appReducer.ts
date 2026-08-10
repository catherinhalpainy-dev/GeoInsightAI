// import { act } from "react";
import type { AppAction, AppState, LandUseFilters } from "./appTypes";

export const initialFilters: LandUseFilters = {
  landUseTypes: [],
  minimumBuiltYear: null,
  districtCode: "",
};

export function createInitialAppState(): AppState {
  return {
    dataset: null,
    importStatus: "idle",
    importError: null,
    importWarnings: [],
    // 保证react不改变状态更新
    filters: { ...initialFilters },
  };
};

export const initialAppState = createInitialAppState();

// reducer函数接收当前状态和action对象，返回新的状态  纯函数
// 纯函数：
// 1.相同输入返回相同输出
// 2.不改变函数外部东西，不产生外部副作用，不依赖外部变量
export function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case "START_FILE_IMPORT":
      // 创建新对象，返回新对象，符合纯函数要求
      return {
        ...state,
        dataset: null,
        importStatus: "reading",
        importError: null,
        importWarnings: [],
      };

    case "VALIDATE_FILE":
      return {
        ...state,
        importStatus: "validating",
        importError: null,
      };

    case "PREVIEW_DATASET":
      return {
        ...state,
        dataset: action.payload.dataset,
        importStatus: "preview",
        importError: null,
        importWarnings: action.payload.warnings,
        filters: {
          ...initialFilters,
        }
      };

    case "LOAD_DATASET":
      return {
        ...state,
        importStatus: state.dataset
          ? "loaded"
          : "idle",
      };

    case "IMPORT_ERROR":
      return {
        ...state,
        dataset: null,
        importStatus: "error",
        importError: action.payload,
        importWarnings: [],
      };

    case "CLEAR_DATASET":
      return createInitialAppState();

    case "TOGGLE_LAND_USE_TYPE":
      const selectedTypes =
        state.filters.landUseTypes;
      const alreadySelected =
        selectedTypes.includes(action.payload);

      const nextTypes = alreadySelected
        ? selectedTypes.filter((type) => {
          return type !== action.payload;
        })
        : [
          ...selectedTypes,
          action.payload,
        ];

      return {
        ...state,
        filters: {
          ...state.filters,
          landUseTypes: nextTypes,
        },
      };

    case "SET_MINIMUM_BUILT_YEAR":
      return {
        ...state,
        filters: {
          ...state.filters,
          minimumBuiltYear: action.payload,
        },
      };

    case "SET_DISTRICT_CODE":
      return {
        ...state,
        filters: {
          ...state.filters,
          districtCode: action.payload,
        },
      };

    case "CLEAR_FILTERS":
      return {
        ...state,
        filters: { ...initialFilters },
      };

    case "PATCH_FILTERS":
      return {
        ...state,
        filters: {
          ...state.filters,
          ...action.payload,
        },
      };

    case "REPLACE_FILTERS":
      return{
        ...state,
        filters:{
          ...action.payload,
          landUseTypes:[
            ...action.payload.landUseTypes,
          ],
        },
      };

    default:
      return state;
  }
};