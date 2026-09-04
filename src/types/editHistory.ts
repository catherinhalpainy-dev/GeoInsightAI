import type {
    LandUseProperties,
} from "./landUse";

export type EditableLandUseProperties = Pick<
    LandUseProperties,
    "landUseType" | "builtYear" | "districtCode"
>;

export type LandUsePropertyChanges = Partial<
    EditableLandUseProperties
>;

export interface FeaturePropertyPatch {
    featureId: string;
    before: LandUsePropertyChanges;
    after: LandUsePropertyChanges;
}

export interface EditTransaction {
    id: string;
    type: "batch_attribute_edit";
    label: string;
    timestamp: number;
    featureCount: number;
    patches: FeaturePropertyPatch[];
}
