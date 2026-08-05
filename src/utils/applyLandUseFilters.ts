import type {
    LandUseFeature,
} from "../types/landUse";

import type {
    LandUseFilters,
} from "../app/appTypes";

export function applyLandUseFilters(
    features: readonly LandUseFeature[],
    filters: LandUseFilters,
): LandUseFeature[] {
    const selectedTypeSet =
        new Set(filters.landUseTypes);

    return features.filter((feature) => {
        const {
            landUseType,
            builtYear,
            districtCode,
        } = feature.properties;

        const matchesType =
            selectedTypeSet.size === 0 ||
            selectedTypeSet.has(landUseType);

        const matchesBuiltYear =
            filters.minimumBuiltYear === null ||
            (
                builtYear !== null &&
                builtYear >=
                filters.minimumBuiltYear
            );

        const matchesDistrict =
            filters.districtCode === "" ||
            districtCode ===
            filters.districtCode;

        return (
            matchesType &&
            matchesBuiltYear &&
            matchesDistrict
        );
    });
}