import type {
    LandUseType,
} from "./landUse";

import type {
    LayerStyle,
} from "./layerStyle";


export interface AgentContext {
    datasetName: string;

    featureCount: number;

    currentFilters: {
        landUseTypes:
        LandUseType[];

        minimumBuiltYear:
        number | null;

        districtCode:
        string;
    };

    currentLayerStyle:
    LayerStyle;
}


export type AgentCommand =
    | {
        type: "apply_filter";

        payload: {
            landUseTypes?:
            LandUseType[];

            minimumBuiltYear?:
            number | null;

            districtCode?:
            string;
        };
    }

    | {
        type:
        "clear_filters";
    }

    | {
        type:
        "update_layer_style";

        payload: {
            fillVisible?:
            boolean;

            fillColor?:
            string;

            fillOpacity?:
            number;

            outlineVisible?:
            boolean;

            outlineColor?:
            string;

            outlineWidth?:
            number;

            outlineOpacity?:
            number;

            colorMode?:
            | "single"
            | "classified";
        };
    }

    | {
        type:
        "fit_map_bounds";
    }

    | {
        type:
        "navigate_statistics";
    };


export interface AgentPlan {
    summary: string;

    requiresConfirmation:
    boolean;

    commands:
    AgentCommand[];
}


export type AgentWorkflowStatus =
    | "planning"
    | "waiting_approval"
    | "approved"
    | "rejected";


export interface AgentStartResponse {
    ok: true;

    threadId:
    string;

    status:
    AgentWorkflowStatus;

    plan:
    AgentPlan;

    interrupt:
    unknown | null;
}


export interface AgentResumeResponse {
    ok: true;

    threadId:
    string;

    status:
    AgentWorkflowStatus;

    plan:
    AgentPlan;

    interrupt:
    unknown | null;
}