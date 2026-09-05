import type {
    LandUseFeature,
    LandUseProperties,
    PolygonGeometry,
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

interface EditTransactionBase {
    id: string;
    label: string;
    timestamp: number;
    featureCount: number;
}

export interface BatchAttributeEditTransaction
    extends EditTransactionBase {
    type: "batch_attribute_edit";
    patches: FeaturePropertyPatch[];
}

export interface GeometryUpdateTransaction
    extends EditTransactionBase {
    type: "geometry_update";
    featureId: string;
    beforeGeometry: PolygonGeometry;
    afterGeometry: PolygonGeometry;
    beforeAreaM2: number;
    afterAreaM2: number;
}

export interface FeatureCreateTransaction
    extends EditTransactionBase {
    type: "feature_create";
    createdFeature: LandUseFeature;
    featureIndex: number;
}

export interface FeatureDeleteTransaction
    extends EditTransactionBase {
    type: "feature_delete";
    deletedFeature: LandUseFeature;
    featureIndex: number;
}

export type EditTransaction =
    | BatchAttributeEditTransaction
    | GeometryUpdateTransaction
    | FeatureCreateTransaction
    | FeatureDeleteTransaction;
