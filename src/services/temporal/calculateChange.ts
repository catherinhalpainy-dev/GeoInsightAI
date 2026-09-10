import type { LandUseFeature } from "../../types/landUse";
import type {
    TemporalChangeSummary,
    TemporalConfig,
} from "../../types/temporal";
import { findPreviousTemporalValue } from "./calculateTemporalStatistics";
import { filterFeaturesByTemporalConfig } from "./filterTemporalFeatures";

function hasBusinessChange(
    previous: LandUseFeature,
    current: LandUseFeature,
    temporalField: string,
) {
    const keys = new Set([
        ...Object.keys(previous.properties),
        ...Object.keys(current.properties),
    ]);

    for (const key of keys) {
        if (key === temporalField) {
            continue;
        }

        const previousValue = Reflect.get(previous.properties, key) as unknown;
        const currentValue = Reflect.get(current.properties, key) as unknown;
        if (previousValue !== currentValue) {
            return true;
        }
    }

    return false;
}

export function calculateTemporalChange(
    features: readonly LandUseFeature[],
    config: TemporalConfig,
): TemporalChangeSummary {
    const previousTime = findPreviousTemporalValue(features, config);
    const currentFeatures = filterFeaturesByTemporalConfig(features, config);
    const previousFeatures = previousTime === null
        ? []
        : filterFeaturesByTemporalConfig(features, {
            ...config,
            current: previousTime,
        });
    const currentById = new Map(
        currentFeatures.map((feature) => [feature.properties.id, feature]),
    );
    const previousById = new Map(
        previousFeatures.map((feature) => [feature.properties.id, feature]),
    );
    const added = [...currentById.keys()].filter((id) => !previousById.has(id));
    const removed = [...previousById.keys()].filter((id) => !currentById.has(id));
    const changed = [...currentById.entries()].flatMap(([id, feature]) => {
        const previous = previousById.get(id);
        return previous && hasBusinessChange(previous, feature, config.field)
            ? [id]
            : [];
    });

    return {
        currentTime: config.current,
        previousTime,
        added,
        removed,
        changed,
    };
}
