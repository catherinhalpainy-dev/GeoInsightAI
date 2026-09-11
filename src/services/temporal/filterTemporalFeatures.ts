import type { TemporalConfig } from "../../types/temporal";
import type { LandUseFeatureCollection } from "../../types/landUse";
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

export function filterFeaturesAtTemporalValue<Feature extends FeatureLike>(
    features: readonly Feature[],
    config: TemporalConfig,
    temporalValue: number,
) {
    return filterFeaturesByTemporalConfig(features, {
        ...config,
        enabled: true,
        current: temporalValue,
    });
}

export function filterCollectionAtTemporalValue(
    collection: LandUseFeatureCollection,
    config: TemporalConfig,
    temporalValue: number,
): LandUseFeatureCollection {
    return {
        type: "FeatureCollection",
        features: filterFeaturesAtTemporalValue(
            collection.features,
            config,
            temporalValue,
        ),
    };
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
