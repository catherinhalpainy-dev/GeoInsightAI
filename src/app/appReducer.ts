import type { AppAction, AppState } from "./appTypes";

export function createInitialAppState(): AppState {
  return {
    dataset: null,
    importStatus: "idle",
    importError: null,
    importWarnings: [],
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

    default:
      return state;
  }
};