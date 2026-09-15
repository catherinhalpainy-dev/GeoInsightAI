import type { LandUseType } from "./landUse";
import type {
    ClassificationMethod,
    ColorRampName,
    GraduatedClassCount,
    GraduatedField,
    LayerStyle,
    SymbologyMode,
} from "./layerStyle";
import type {
    GeoprocessingOperation,
} from "./analysis";
import type {
    VectorGeometryKind,
} from "./mapLayer";

export interface AgentContext {
    datasetName: string;
    featureCount: number;
    filteredFeatureCount: number;
    currentFilters: {
        landUseTypes: LandUseType[];
        minimumBuiltYear: number | null;
        districtCode: string;
    };
    currentLayerStyle: Pick<
        LayerStyle,
        | "layerVisible"
        | "fillVisible"
        | "fillColor"
        | "fillOpacity"
        | "outlineVisible"
        | "outlineColor"
        | "outlineWidth"
        | "outlineOpacity"
        | "symbologyMode"
    >;
    selectedFeature: {
        id: string;
        landUseType?: LandUseType;
        areaM2: number;
    } | null;
    workspaceRevision: number;
    parcelAnalysis: {
        planningLayer: AgentParcelLayerSummary;
        restrictionLayer: AgentParcelLayerSummary;
        roadLayer: AgentParcelLayerSummary;
        waterLayer: AgentParcelLayerSummary;
        administrativeLayer: AgentParcelLayerSummary;
        standardSurroundingDistanceM: 500;
        hasResult: boolean;
    };
    hasBuffer: boolean;
    bufferDistanceM: number | null;
    hasAoi: boolean;
    aoiCompleted: boolean;
    bufferQueryFeatureCount: number;
    aoiQueryFeatureCount: number;
    analysisLayers: Array<{
        id: string;
        name: string;
        operation: GeoprocessingOperation;
        featureCount: number;
        visible: boolean;
    }>;
    overlayLayers: Array<{
        id: string;
        name: string;
        geometryKind: VectorGeometryKind;
        featureCount: number;
        visible: boolean;
    }>;
    symbology: {
        mode: SymbologyMode;
        field: GraduatedField | null;
        method: ClassificationMethod | null;
        classCount: GraduatedClassCount | null;
        colorRamp: ColorRampName | null;
    };
}

export interface AgentParcelLayerSummary {
    id: string | null;
    name: string | null;
    geometryKind: VectorGeometryKind | null;
    featureCount: number;
    available: boolean;
}

export type AgentGeoprocessingInputSource =
    | "filtered"
    | "aoi-query"
    | "buffer-query";

export type AgentCommand =
    | {
        type: "apply_filter";
        payload: {
            landUseTypes?: LandUseType[];
            minimumBuiltYear?: number | null;
            districtCode?: string;
        };
    }
    | { type: "clear_filters" }
    | {
        type: "update_layer_style";
        payload: {
            layerVisible?: boolean;
            fillVisible?: boolean;
            fillColor?: string;
            fillOpacity?: number;
            outlineVisible?: boolean;
            outlineColor?: string;
            outlineWidth?: number;
            outlineOpacity?: number;
            colorMode?: "single" | "classified";
        };
    }
    | { type: "fit_map_bounds" }
    | { type: "navigate_statistics" }
    | {
        type: "create_buffer";
        distanceM: number;
    }
    | {
        type: "query_buffer";
        relation: "intersects";
    }
    | {
        type: "query_aoi";
        relation: "intersects" | "within";
    }
    | {
        type: "run_geoprocessing";
        payload:
            | {
                operation: "intersection";
                inputSource: AgentGeoprocessingInputSource;
                overlaySource: "aoi" | "buffer";
            }
            | {
                operation: "dissolve";
                inputSource: AgentGeoprocessingInputSource;
                dissolveField: "all" | "landUseType";
            }
            | {
                operation: "centroid";
                inputSource: AgentGeoprocessingInputSource;
            };
    }
    | {
        type: "update_symbology";
        payload:
            | { mode: "single" }
            | { mode: "categorized" }
            | {
                mode: "graduated";
                field: GraduatedField;
                method: ClassificationMethod;
                classCount: GraduatedClassCount;
                colorRamp: ColorRampName;
            };
    }
    | {
        type: "set_analysis_layer_visibility";
        layerId: string;
        visible: boolean;
    }
    | { type: "parcel_quality_check" }
    | { type: "parcel_planning_analysis" }
    | { type: "parcel_restriction_analysis" }
    | {
        type: "parcel_surroundings_analysis";
        distanceM: 500;
    }
    | { type: "parcel_finalize_analysis" };

export interface AgentPlan {
    summary: string;
    requiresConfirmation: boolean;
    commands: AgentCommand[];
    domain?: "general-gis" | "parcel-analysis";
}

export type AgentExecutionStatus = "success" | "error";

export interface AgentExecutionEvent {
    commandType: AgentCommand["type"];
    status: AgentExecutionStatus;
    message: string;
    timestamp: number;
    stepIndex: number;
    title: string;
    startedAt: number;
    finishedAt: number;
    durationMs: number;
    facts?: string[];
}

export interface AgentPlanWorkspaceSnapshot {
    targetFeatureId: string | null;
    planningLayerId: string | null;
    restrictionLayerId: string | null;
    roadLayerId: string | null;
    waterLayerId: string | null;
    administrativeLayerId: string | null;
    workspaceRevision: number;
}

export interface AgentPlanExecutionResult {
    events: AgentExecutionEvent[];
    completed: boolean;
    stoppedAtStep: number | null;
}

export type AgentWorkflowStatus =
    | "planning"
    | "waiting_approval"
    | "approved"
    | "rejected";

export interface AgentStartResponse {
    ok: true;
    threadId: string;
    status: AgentWorkflowStatus;
    plan: AgentPlan;
    interrupt: unknown | null;
}

export interface AgentResumeResponse {
    ok: true;
    threadId: string;
    status: AgentWorkflowStatus;
    plan: AgentPlan;
    interrupt: unknown | null;
}
