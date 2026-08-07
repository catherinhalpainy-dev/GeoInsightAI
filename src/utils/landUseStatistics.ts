// 统计函数
// map() 返回一个新数组。

// forEach() 主要用于遍历执行操作，返回值是 undefined
import type { LandUseFeature, LandUseStatistics, LandUseType } from "../types/landUse";

// 返回一个对象，对象的键必须是所有 LandUseType，每个键对应的值必须是 number
function createEmptyTypeCounts(): Record<LandUseType, number> {
    return {
        residential: 0,
        commercial: 0,
        industrial: 0,
        green: 0,
        public: 0,
        transportation: 0,
        other: 0,
    };
}

function createEmptyTypeAreas(): Record<LandUseType, number> {
    return {
        residential: 0,
        commercial: 0,
        industrial: 0,
        green: 0,
        public: 0,
        transportation: 0,
        other: 0
    };
}

// readonly 这里只保证数组不能被修改，并不代表每个 feature 对象内部也完全只读
export function calculateLandUseStatistics(features: readonly LandUseFeature[]): LandUseStatistics {
    const initialValue = {
        totalAreaM2: 0,
        largestFeature: null as LandUseFeature | null,
        countsByType: createEmptyTypeCounts(),
        areaByType: createEmptyTypeAreas(),
    };
    // reduce：将多个要素逐步归为一个统计对象
    const result = features.reduce(
        (accumulator, feature) => {
            const {
                areaM2,
                landUseType,
            } = feature.properties;
            accumulator.totalAreaM2 += areaM2;
            accumulator.countsByType[landUseType] += 1;
            accumulator.areaByType[landUseType] += areaM2;
            if (
                accumulator.largestFeature === null ||
                areaM2 >
                accumulator.largestFeature.properties.areaM2
            ) {
                accumulator.largestFeature = feature;
            }
            return accumulator;
        },
        initialValue,
    );
    const featureCount = features.length;
    // set ：去重
    const typeCount = new Set(
        features.map(
            (feature) => {
                return feature.properties.landUseType;
            }
        ),
    ).size;
    const averageAreaM2 =
        featureCount === 0 ?
            0 : result.totalAreaM2 / featureCount;

    return {
        featureCount,
        typeCount,
        totalAreaM2: result.totalAreaM2,
        averageAreaM2,
        largestFeature: result.largestFeature,
        countsByType: result.countsByType,
        areaByType: result.areaByType,
    }
}

export function sortFeaturesByAreaDescending(
    features:readonly LandUseFeature[]
):LandUseFeature[]{
    // sort 前必须复制数组，因为sort会直接修改数组
    // 浅拷贝
    return [...features].sort((first,second)=>{
        return(
            second.properties.areaM2-
            first.properties.areaM2
        )
    })
}

// map和forEach区别：map() 返回一个新数组。
// forEach() 主要用于遍历执行操作，返回值是 undefined

export function getUniqueDistrictCodes(features:readonly LandUseFeature[]):string[]{
    const districtCodes=features.map((feature)=>{
        return feature.properties.districtCode;
    });

    return [...new Set(districtCodes)].sort(
        (first,second)=>{
            return first.localeCompare(second);
        },
    );
}

export function groupFeaturesByLandUseType(features:readonly LandUseFeature[]):Record<LandUseType,LandUseFeature[]>{
    const initialGroups:Record<LandUseType,LandUseFeature[]>={
        residential: [],
        commercial: [],
        industrial: [],
        green: [],
        public: [],
        transportation: [],
        other: []
    };
    return features.reduce((groups,feature)=>{
        const landUseType=
        feature.properties.landUseType;
        groups[landUseType].push(feature)
        return groups;
    },initialGroups);
}