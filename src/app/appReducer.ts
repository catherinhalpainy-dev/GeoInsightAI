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
    attributeQuery: null,
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
        },
        attributeQuery: null,
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

    case "SET_ATTRIBUTE_QUERY":
      return {
        ...state,
        attributeQuery: action.payload,
      };

    case "CLEAR_ATTRIBUTE_QUERY":
      return {
        ...state,
        attributeQuery: null,
      };

    case "UPDATE_FEATURE_PROPERTIES_BATCH": {
      if (!state.dataset || action.payload.updates.length === 0) {
        return state;
      }

      const updatesById = new Map(
        action.payload.updates.map((update) => [
          update.featureId,
          update.changes,
        ]),
      );
      let changed = false;
      const features = state.dataset.collection.features.map((feature) => {
        const changes = updatesById.get(feature.properties.id);

        if (!changes) {
          return feature;
        }

        changed = true;
        return {
          ...feature,
          properties: {
            ...feature.properties,
            ...changes,
          },
        };
      });

      if (!changed) {
        return state;
      }

      return {
        ...state,
        dataset: {
          ...state.dataset,
          collection: {
            ...state.dataset.collection,
            features,
          },
        },
      };
    }

    case "ADD_FEATURE": {
      if (!state.dataset) {
        return state;
      }

      const featureId = action.payload.feature.properties.id;

      if (state.dataset.collection.features.some(
        (feature) => feature.properties.id === featureId,
      )) {
        return state;
      }

      const previousFeatures = state.dataset.collection.features;
      const requestedIndex = action.payload.index ?? previousFeatures.length;
      const index = Math.max(
        0,
        Math.min(requestedIndex, previousFeatures.length),
      );
      const features = [
        ...previousFeatures.slice(0, index),
        action.payload.feature,
        ...previousFeatures.slice(index),
      ];

      return {
        ...state,
        dataset: {
          ...state.dataset,
          collection: {
            ...state.dataset.collection,
            features,
          },
        },
      };
    }

    case "UPDATE_FEATURE_GEOMETRY": {
      if (!state.dataset) {
        return state;
      }

      let changed = false;
      const features = state.dataset.collection.features.map((feature) => {
        if (feature.properties.id !== action.payload.featureId) {
          return feature;
        }

        changed = true;
        return {
          ...feature,
          geometry: action.payload.geometry,
          properties: {
            ...feature.properties,
            areaM2: action.payload.areaM2,
          },
        };
      });

      if (!changed) {
        return state;
      }

      return {
        ...state,
        dataset: {
          ...state.dataset,
          collection: {
            ...state.dataset.collection,
            features,
          },
        },
      };
    }

    case "DELETE_FEATURE": {
      if (!state.dataset) {
        return state;
      }

      const features = state.dataset.collection.features.filter(
        (feature) => feature.properties.id !== action.payload.featureId,
      );

      if (features.length === state.dataset.collection.features.length) {
        return state;
      }

      return {
        ...state,
        dataset: {
          ...state.dataset,
          collection: {
            ...state.dataset.collection,
            features,
          },
        },
      };
    }

    default:
      return state;
  }
};
