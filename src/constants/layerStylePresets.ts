import {
    DEFAULT_LAYER_STYLE,
    type LayerStylePreset,
} from "../types/layerStyle";

export const LAYER_STYLE_PRESETS: LayerStylePreset[] = [
    {
        id: "default",
        name: "默认",
        style: {
            ...DEFAULT_LAYER_STYLE,
        },
    },
    {
        id: "soft",
        name: "柔和",
        style: {
            fillOpacity: 0.45,
            outlineOpacity: 0.6,
            outlineWidth: 1,
        },
    },
    {
        id: "high-contrast",
        name: "高对比",
        style: {
            fillOpacity: 0.85,
            outlineColor: "#111827",
            outlineOpacity: 1,
            outlineWidth: 2,
        },
    },
    {
        id: "area-graduated",
        name: "面积分级",
        style: {
            symbologyMode: "graduated",
            graduatedField: "areaM2",
            classificationMethod: "equalInterval",
            classCount: 5,
            colorRamp: "teal",
        },
    },
    {
        id: "year-graduated",
        name: "年代分级",
        style: {
            symbologyMode: "graduated",
            graduatedField: "builtYear",
            classificationMethod: "quantile",
            classCount: 5,
            colorRamp: "orange",
        },
    },
];
