import { LAND_USE_COLORS, LAND_USE_LABELS, LAND_USE_TYPES } from "../constants/landUse";
import type { LandUseFeature, LandUseType } from "../types/landUse";

export interface DashboardSummary {
    totalFeatureCount: number;
    totalAreaM2: number;
    averageAreaM2: number;
    districtCount: number;
}

export interface LandUseTypeStatistic {
    type: LandUseType;
    label: string;
    color: string;

    count: number;
    totalAreaM2: number;
    averageAreaM2: number;
}

export function calculateDashboardSummary(features: readonly LandUseFeature[],): DashboardSummary {
    const totalFeatureCount =
        features.length;
    const totalAreaM2 =
        features.reduce(
            (sum, feature) => {
                return (
                    sum +
                    feature.properties.areaM2
                );
            },
            0,
        );

    const averageAreaM2 =
        totalFeatureCount === 0
            ? 0
            : totalAreaM2 / totalFeatureCount;

    const districtCodes =
        new Set(
            features.map((feature) => {
                return feature.properties.districtCode;
            }),
        );

    return {
        totalFeatureCount: totalFeatureCount,
        totalAreaM2: totalAreaM2,
        averageAreaM2: averageAreaM2,
        districtCount: districtCodes.size,
    };

}

export function calculateTypeStatistics(features: readonly LandUseFeature[],): LandUseTypeStatistic[] {
    return LAND_USE_TYPES.map(
        (type) => {
            const matchedFeatures =
                features.filter(
                    (feature) => {
                        return (
                            feature.properties.landUseType === type
                        );
                    },
                );
            const totalAreaM2 =
                matchedFeatures.reduce(

                    (sum, feature) => {
                        return (
                            sum +=
                            feature.properties.areaM2
                        );
                    },
                    0,
                );
            return {
                type,
                label:
                    LAND_USE_LABELS[type],

                color:
                    LAND_USE_COLORS[type],

                count:
                    matchedFeatures.length,

                totalAreaM2,

                averageAreaM2:
                    matchedFeatures.length === 0
                        ? 0
                        : totalAreaM2 /
                        matchedFeatures.length,
            };
        }
    )
}