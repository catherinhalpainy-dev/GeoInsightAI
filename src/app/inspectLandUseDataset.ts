// 数据质量检查函数

import type { LandUseDataset, LandUseProperties } from "../types/landUse";

export interface DatasetInspection {
    featureCount: number;
    fieldCount: number;
    landUseTypeCount: number;
    districtCount: number;
    missingBuiltYearCount: number;
    invalidAreaCount: number;
}

export function inspectLandUseDataset(landUseDataset: LandUseDataset): DatasetInspection {
    const features = landUseDataset.collection.features;
    const featureCount = features.length;
    const fieldCount =
        !features
            ? 0
            : Object.keys(features[0].properties).length
    // 大写的 Object 是 JavaScript 内置的全局对象，提供处理对象的方法
    const landUseType = new Set(
        features.map((feature) => {
            return feature.properties.landUseType;
        }));
    const landUseTypeCount = landUseType.size;

    const districtCount = new Set(
        features.map((feature) => {
            return feature.properties.districtCode;
        })
    ).size;

    const missingBuiltYearCount = features.filter(
        (feature) => {
            return feature.properties.builtYear === null;
        }
    ).length;

    const invalidAreaCount = features.filter(
        (feature) => {
            return feature.properties.areaM2 <= 0;
        }
    ).length;

    return {
        featureCount: featureCount,
        fieldCount: fieldCount,
        landUseTypeCount: landUseTypeCount,
        districtCount: districtCount,
        missingBuiltYearCount: missingBuiltYearCount,
        invalidAreaCount: invalidAreaCount,
    };
}

export const PROPERITY_LABELS: Record<keyof LandUseProperties, string> = {
    id: "要素编号",
    landUseType: "用地类型",
    areaM2: "面积（m²）",
    districtCode: "区划代码",
    builtYear: "建成年份",
};
