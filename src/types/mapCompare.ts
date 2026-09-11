export type MapCompareLayout =
    | "split"
    | "swipe";

export interface TemporalMapCompareConfig {
    enabled: boolean;
    layout: MapCompareLayout;
    beforeTime: number;
    afterTime: number;
    syncCamera: boolean;
}

export type TemporalMapCompareProjectConfig = Omit<
    TemporalMapCompareConfig,
    "enabled"
>;

export interface TemporalCompareCategoryDelta {
    key: string;
    label: string;
    beforeCount: number;
    afterCount: number;
    countDelta: number;
    beforeAreaM2: number;
    afterAreaM2: number;
    areaDeltaM2: number;
    beforeShare: number;
    afterShare: number;
    shareDelta: number;
}

export interface TemporalCompareSummary {
    beforeTime: number;
    afterTime: number;
    beforeFeatureCount: number;
    afterFeatureCount: number;
    featureCountDelta: number;
    beforeTotalAreaM2: number;
    afterTotalAreaM2: number;
    totalAreaDeltaM2: number;
    categories: TemporalCompareCategoryDelta[];
}

export interface TemporalCompareMapImage {
    dataUrl: string | null;
    error: string | null;
}

export interface TemporalCompareCaptureResult {
    requestId: number;
    before: TemporalCompareMapImage;
    after: TemporalCompareMapImage;
}

export interface TemporalCompareSnapshot {
    beforeTime: number;
    afterTime: number;
    layout: MapCompareLayout;
    summary: TemporalCompareSummary;
    beforeMap: TemporalCompareMapImage;
    afterMap: TemporalCompareMapImage;
    capturedAt: number;
}

export const DEFAULT_TEMPORAL_MAP_COMPARE_CONFIG: TemporalMapCompareConfig = {
    enabled: false,
    layout: "split",
    beforeTime: 0,
    afterTime: 0,
    syncCamera: true,
};
