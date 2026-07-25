// 筛选函数
// find与filter区别：返回（第一个符合条件的元素或undefined / 所有符合条件的元素组成的新数组或空数组）
// some与every区别：只要有一个元素满足就返回true / 所有元素都满足才返回true

import type { LandUseFeature, LandUseType } from "../types/landUse";

export type LandUseTypeFilter =
    | LandUseType
    | "all";


export function filterByLandUseType(
    features: readonly LandUseFeature[], selectedType: LandUseTypeFilter
): LandUseFeature[] {
    if (selectedType === "all") {
        // 浅拷贝：将features中的每一项都复制进来
        return [...features];
    }
    return features.filter((feature) => {
        return (
            feature.properties.landUseType ===
            selectedType
        );
    });
}

export function filterByMinimumBuiltYear(
    features: readonly LandUseFeature[],
    minimumBuiltYear: number,
): LandUseFeature[] {
    return features.filter((feature) => {

        const builtYear =
            feature.properties.builtYear;
        return (
            builtYear !== null &&
            builtYear >= minimumBuiltYear
        );

    });
}

export function filterByDistrictCode(features:readonly LandUseFeature[],districtCode:string):LandUseFeature[]{
    return features.filter((feature)=>{
        const code=feature.properties.districtCode;
        return(
            code===districtCode
        )
    }
    );
}

export function findById(features:readonly LandUseFeature[],featureId:string):LandUseFeature|undefined{
    return features.find((feature)=>{
        return(feature.properties.id===featureId);
    }
    );
}

export function hasMissingBuiltYear(features:readonly LandUseFeature[]):boolean{
    return features.some((feature)=>{
        feature.properties.builtYear===null;
    });
}

export function areAllAreaPositive(features:readonly LandUseFeature[]):boolean{
    return features.some((feature)=>{
        feature.properties.areaM2 >0
    })
}