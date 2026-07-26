import type { AppAction, AppState } from "./appTypes";

export const initialAppState: AppState = {
    dataset: null,
    importStatus: "idle"
};

export function appReducer(state: AppState, action: AppAction): AppState {
    switch (action.type) {
        case "PREVIEW_DATASET":
            // 先拷贝旧状态
            // 再覆盖需要变化的字段
            return {
                ...state,
                dataset: action.payload,
                importStatus: "preview",
            };
        case "LOAD_DATASET":
            return {
                ...state,
                importStatus: state.dataset
                    ? "loaded"
                    : "idle",
            };
        case "CLEAR_DATASET":
            return initialAppState;
        default:
            return state;
    }
};