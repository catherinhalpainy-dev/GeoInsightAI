import type { LandUseFeatureCollection } from "../../types/landUse";
import type {
    TemporalCompareCategoryDelta,
    TemporalCompareSummary,
} from "../../types/mapCompare";
import {
    calculateDashboardSummary,
    calculateTypeStatistics,
} from "../../utils/statisticsDashboard";

export function calculateTemporalComparison(
    beforeCollection: LandUseFeatureCollection,
    afterCollection: LandUseFeatureCollection,
    beforeTime: number,
    afterTime: number,
): TemporalCompareSummary {
    const before = calculateDashboardSummary(beforeCollection.features);
    const after = calculateDashboardSummary(afterCollection.features);
    const beforeCategories = new Map(
        calculateTypeStatistics(beforeCollection.features).map(
            (item) => [item.type, item],
        ),
    );
    const categories: TemporalCompareCategoryDelta[] =
        calculateTypeStatistics(afterCollection.features).map((afterItem) => {
            const beforeItem = beforeCategories.get(afterItem.type);
            const beforeCount = beforeItem?.count ?? 0;
            const beforeAreaM2 = beforeItem?.totalAreaM2 ?? 0;
            const beforeShare = before.totalFeatureCount === 0
                ? 0
                : beforeCount / before.totalFeatureCount;
            const afterShare = after.totalFeatureCount === 0
                ? 0
                : afterItem.count / after.totalFeatureCount;

            return {
                key: afterItem.type,
                label: afterItem.label,
                beforeCount,
                afterCount: afterItem.count,
                countDelta: afterItem.count - beforeCount,
                beforeAreaM2,
                afterAreaM2: afterItem.totalAreaM2,
                areaDeltaM2: afterItem.totalAreaM2 - beforeAreaM2,
                beforeShare,
                afterShare,
                shareDelta: afterShare - beforeShare,
            };
        });

    return {
        beforeTime,
        afterTime,
        beforeFeatureCount: before.totalFeatureCount,
        afterFeatureCount: after.totalFeatureCount,
        featureCountDelta: after.totalFeatureCount - before.totalFeatureCount,
        beforeTotalAreaM2: before.totalAreaM2,
        afterTotalAreaM2: after.totalAreaM2,
        totalAreaDeltaM2: after.totalAreaM2 - before.totalAreaM2,
        categories,
    };
}
