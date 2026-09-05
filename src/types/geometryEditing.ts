import type {
    LandUseProperties,
    Position,
} from "./landUse";

export type GeometryEditorMode =
    | "idle"
    | "drawing"
    | "creating"
    | "editing";

export interface GeometrySnapCandidate {
    featureId: string;
    coordinate: Position;
}

export type NewLandUseProperties = Pick<
    LandUseProperties,
    "landUseType" | "builtYear" | "districtCode"
>;

export interface GeometryValidationResult {
    valid: boolean;
    message: string | null;
}
