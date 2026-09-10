import type { TemporalConfig } from "../../types/temporal";
import {
    parseTemporalValue,
    readFeatureProperty,
} from "./detectTemporalField";

interface FeatureLike {
    properties: unknown;
}

export function filterFeaturesByTemporalConfig<Feature extends FeatureLike>(
    features: readonly Feature[],
    config: TemporalConfig,
) {
    if (!config.enabled || !config.field) {
        return [...features];
    }

    return features.filter((feature) =>
        parseTemporalValue(
            readFeatureProperty(feature.properties, config.field),
            config.type,
        ) === config.current,
    );
}

export function getAvailableTemporalValues<Feature extends FeatureLike>(
    features: readonly Feature[],
    config: TemporalConfig,
) {
    if (!config.field) {
        return [];
    }

    return [...new Set(features.flatMap((feature) => {
        const value = parseTemporalValue(
            readFeatureProperty(feature.properties, config.field),
            config.type,
        );
        return value === null ? [] : [value];
    }))].sort((first, second) => first - second);
}
