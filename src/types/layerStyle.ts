export type SymbologyMode =
    | "single"
    | "categorized"
    | "graduated";

export type CategorizedField =
    "landUseType";

export type GraduatedField =
    | "areaM2"
    | "builtYear";

export type ClassificationMethod =
    | "equalInterval"
    | "quantile";

export type GraduatedClassCount =
    | 3
    | 4
    | 5
    | 6;

export type ColorRampName =
    | "teal"
    | "blue"
    | "green"
    | "orange"
    | "purple";

export interface GraduatedClass {
    min: number;
    max: number;
    color: string;
    label: string;
}

export interface LayerStyle {
    layerVisible: boolean;

    fillVisible: boolean;
    fillColor: string;
    fillOpacity: number;

    outlineVisible: boolean;
    outlineColor: string;
    outlineWidth: number;
    outlineOpacity: number;

    symbologyMode: SymbologyMode;
    categorizedField: CategorizedField;
    graduatedField: GraduatedField;
    classificationMethod: ClassificationMethod;
    classCount: GraduatedClassCount;
    colorRamp: ColorRampName;
    graduatedClasses: GraduatedClass[];
}

export type LayerOrder =
    | "above"
    | "below";

export const DEFAULT_LAYER_STYLE: LayerStyle = {
    layerVisible: true,

    fillVisible: true,
    fillColor: "#0d9488",
    fillOpacity: 0.7,

    outlineVisible: true,
    outlineColor: "#ffffff",
    outlineWidth: 1.5,
    outlineOpacity: 1,

    symbologyMode: "categorized",
    categorizedField: "landUseType",
    graduatedField: "areaM2",
    classificationMethod: "equalInterval",
    classCount: 5,
    colorRamp: "teal",
    graduatedClasses: [],
};

export interface LayerStylePreset {
    id: string;
    name: string;
    style: Partial<LayerStyle>;
}
