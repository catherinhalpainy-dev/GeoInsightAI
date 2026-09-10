import type { LandUseFeature } from "../../types/landUse";
import type {
    TemporalConfig,
    TemporalStatistics,
} from "../../types/temporal";
import { calculateEditedGeometryAreaM2 } from "../gis/geometryEditing";
import { calculateDashboardSummary } from "../../utils/statisticsDashboard";
import {
    filterFeaturesByTemporalConfig,
    getAvailableTemporalValues,
} from "./filterTemporalFeatures";

export function findPreviousTemporalValue(
    features: readonly LandUseFeature[],
    config: TemporalConfig,
) {
    const values = getAvailableTemporalValues(features, config);
    return [...values].reverse().find((value) => value < config.current) ?? null;
}

export function calculateTemporalStatistics(
    features: readonly LandUseFeature[],
    config: TemporalConfig,
): TemporalStatistics {
    const currentFeatures = filterFeaturesByTemporalConfig(features, config);
    const currentSummary = calculateDashboardSummary(currentFeatures);
    const totalAreaM2 = currentFeatures.reduce((sum, feature) => {
        try {
            return sum + (calculateEditedGeometryAreaM2(feature.geometry) ?? 0);
        } catch {
            return sum;
        }
    }, 0);
    const previousTime = findPreviousTemporalValue(features, config);
    const previousFeatureCount = previousTime === null
        ? 0
        : filterFeaturesByTemporalConfig(features, {
            ...config,
            current: previousTime,
        }).length;

    return {
        currentTime: config.current,
        featureCount: currentSummary.totalFeatureCount,
        totalAreaM2,
        previousFeatureCount,
        changeCount: currentSummary.totalFeatureCount - previousFeatureCount,
    };
}
